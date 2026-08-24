import html2pdf from 'html2pdf.js';
import { AlertCircle, Calculator, Camera, CheckCircle, Eye, History, Loader2, Mail, Printer, RefreshCw, Upload, User, Zap } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getBodyPartLabel, sortPaintMeasurements } from '../../constants/bodyParts';
import { ESTIMATE_REPAIR_CODE_IDS, ESTIMATE_REPAIR_CODE_LABELS } from '../../constants/estimateRepairCodes';
import { useReportStore } from '../../store/reportStore';
import { useUIStore } from '../../store/uiStore';
import type { EstimateRepairCodeId, ReportData, Signatures } from '../../types/report.types';
import api from '../../utils/api';
import { getAutomaticDevaluations } from '../../utils/automaticDevaluationService';
import { formatCurrency } from '../../utils/currency';
import { compressImage } from '../../utils/imageCompression';
import { validateImageAspectRatio } from '../../utils/imageValidation';
import { scrollToElement } from '../../utils/scroll';
import { generatePDFHTML } from '../../utils/pdfGenerator';
import { calcBrutto, calcNetto } from '../../utils/vatCalculator';
import Card from '../ui/Card';
import ModalWrapper from '../ui/ModalWrapper';
import PhotoThumbnail from '../ui/PhotoThumbnail';
import SectionTitle from '../ui/SectionTitle';
import SignaturePad from '../ui/SignaturePad';
import ActivityLogTab from './ActivityLogTab';

interface Step5Props {
    onSave?: () => Promise<void> | void;
    adminMode?: boolean;
    onToggleRequired?: (fieldName: string) => Promise<void>;
}

/** Check if a signature value is a backend-persisted URL (not a fresh base64 drawing) */
const isBackendSignature = (sig: string) => !!sig && sig.startsWith('/api/');

const Step5_Summary: React.FC<Step5Props> = ({ onSave, adminMode, onToggleRequired }) => {
    const { t, i18n } = useTranslation();
    const store = useReportStore();
    const { showValidationErrors, setShowValidationErrors, setCurrentStep } = useUIStore();
    const validationErrors = store.getStepValidationErrors(5);

    const validateAllSteps = (): boolean => {
        for (let s = 1; s <= 5; s++) {
            const errors = store.getStepValidationErrors(s);
            if (Object.keys(errors).length > 0) {
                // Navigate to the first invalid step
                setCurrentStep(s);
                setShowValidationErrors(true);
                toast.error(t('common.validationError'));

                // Scroll and focus first invalid field after a short delay
                setTimeout(() => {
                    const firstErrorKey = Object.keys(errors)[0];
                    const element = document.querySelector(`[data-fieldname="${firstErrorKey}"]`);
                    if (element) {
                        scrollToElement(element as HTMLElement);
                        const focusable = element.querySelector('input, select, textarea, [tabindex]');
                        if (focusable) {
                            (focusable as HTMLElement).focus();
                        }
                    }
                }, 200);
                return false;
            }
        }
        return true;
    };
    const isVehicleEvaluation = store.claimType === 'Fahrzeugbewertung';
    const isRequired = (fieldName: string) => store.fieldConfigs?.find(c => c.fieldName === fieldName)?.required;
    const lang = (i18n.language || 'de') as 'de' | 'en';
    const [generating, setGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewing, setPreviewing] = useState(false);

    // Ensure driver signature name defaults to contactPersonName if available and not yet set
    React.useEffect(() => {
        if (!store.signatureNames.driver && store.contactPersonName) {
            store.updateSignatureName('driver', store.contactPersonName);
        }
    }, [store.signatureNames.driver, store.contactPersonName]);

    const [emailing, setEmailing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailInput, setEmailInput] = useState(store.customerEmail || '');
    const [showActivityLog, setShowActivityLog] = useState(false);
    const [signingRole, setSigningRole] = useState<keyof Signatures | null>(null);
    const [tempSignature, setTempSignature] = useState('');

    const totalMinderwertBr = store.totalMinderwertBrutto();

    const translateAnrechnung = (a: string) => {
        if (a === 'voll') return lang === 'de' ? 'voll' : 'full';
        if (a === 'anteilig' || a === 'pro-rata') return lang === 'de' ? 'anteilig' : 'partial';
        if (a === 'kein') return lang === 'de' ? 'kein' : 'none';
        if (a === 'keine') return lang === 'de' ? 'Keine Kosten' : 'No costs';
        return a;
    };

    const buildConsolidatedRows = (): any[] => {
        const rows: any[] = [];

        // 1. Pre-filled Body Parts (minderwertRows) - only if active
        const activeMinderwertRows = (store.minderwertRows || []).filter(
            row => row.repairCost > 0 || (row.minderwertBrutto && row.minderwertBrutto > 0)
        );

        activeMinderwertRows.forEach(row => {
            const translatedPart = t(`bodyParts.${row.bodyPart}`, row.bodyPart);
            const isEstimateCode = ESTIMATE_REPAIR_CODE_IDS.includes(row.repairMethod as any);
            const translatedMethod = isEstimateCode
                ? ESTIMATE_REPAIR_CODE_LABELS[row.repairMethod as EstimateRepairCodeId][lang]
                : (row.repairMethod ? (t(`repairMethods.${row.repairMethod}`, row.repairMethod)) : '');
            const label = [translatedPart, row.damage, translatedMethod].filter(Boolean).join(' - ');

            const rcBrutto = (
                row.repairCostBrutto != null ? row.repairCostBrutto : Math.round(calcBrutto(row.repairCost) * 100) / 100
            ) + (
                row.sparePartsBrutto != null ? row.sparePartsBrutto : Math.round(calcBrutto(row.spareParts || 0) * 100) / 100
            );

            rows.push({
                id: row.id,
                type: 'minderwertRow',
                label,
                minderwertBrutto: row.minderwertBrutto || 0,
                minderwertNetto: row.minderwertNetto || calcNetto(row.minderwertBrutto || 0),
                repairCostBrutto: rcBrutto,
                anrechnung: row.anrechnung || 'kein',
                repairCostNetto: calcNetto(rcBrutto),
                isInfo: row.anrechnung === 'informational',
            });
        });

        // 2. Damages (store.damages)
        store.damages.forEach(d => {
            const translatedPart = t(`bodyParts.${d.bodyPart}`, d.bodyPart);
            const isEstimateCode = ESTIMATE_REPAIR_CODE_IDS.includes(d.repairMethod as any);
            const translatedMethod = isEstimateCode
                ? ESTIMATE_REPAIR_CODE_LABELS[d.repairMethod as EstimateRepairCodeId][lang]
                : (d.repairMethod ? (t(`repairMethods.${d.repairMethod}`, d.repairMethod)) : '');
            const label = [translatedPart, d.description, translatedMethod].filter(Boolean).join(' - ');

            const rcBrutto = (d.repairCostBrutto || 0) + (
                d.sparePartsBrutto != null ? d.sparePartsBrutto : (d.spareParts ? Math.round(calcBrutto(d.spareParts) * 100) / 100 : 0)
            );

            rows.push({
                id: d.id,
                type: 'damage',
                label,
                minderwertBrutto: d.minderwertBrutto || 0,
                minderwertNetto: d.minderwertNetto || calcNetto(d.minderwertBrutto || 0),
                repairCostBrutto: rcBrutto,
                anrechnung: d.anrechnung || 'voll',
                repairCostNetto: calcNetto(rcBrutto),
                isInfo: d.anrechnung === 'informational',
            });
        });

        if (!isVehicleEvaluation) {
            // 3. Automatic Devaluations
            getAutomaticDevaluations(store).forEach(d => {
                const label = [d.bodyPart, d.damage, d.repairMethod].filter(Boolean).join(' - ');
                const rcBrutto = d.repairCostBrutto != null ? d.repairCostBrutto : Math.round(calcBrutto(d.repairCost || 0) * 100) / 100;
                rows.push({
                    id: d.id,
                    type: 'auto',
                    label,
                    minderwertBrutto: d.minderwertBrutto || 0,
                    minderwertNetto: d.minderwertNetto || calcNetto(d.minderwertBrutto || 0),
                    repairCostBrutto: rcBrutto,
                    anrechnung: d.anrechnung || 'voll',
                    repairCostNetto: calcNetto(rcBrutto),
                    isInfo: d.anrechnung === 'informational',
                });
            });

            // 4. System Devaluations (Backend calculated)
            (store.systemMinderwertRows || [])
                .filter(d => !d.id?.startsWith('sys-equip-'))
                .forEach(d => {
                const label = [d.bodyPart, d.damage, d.repairMethod || 'erneuern'].filter(Boolean).join(' - ');
                const rcBrutto = (
                    d.repairCostBrutto != null ? d.repairCostBrutto : (d.repairCost ? Math.round(d.repairCost * 1.19 * 100) / 100 : 0)
                ) + (
                    d.sparePartsBrutto != null ? d.sparePartsBrutto : (d.spareParts ? Math.round(d.spareParts * 1.19 * 100) / 100 : 0)
                );
                const finalRepairCostBrutto = rcBrutto > 0 ? rcBrutto : (d.minderwertBrutto || 0);
                rows.push({
                    id: d.id,
                    type: 'system',
                    label,
                    minderwertBrutto: d.minderwertBrutto || 0,
                    minderwertNetto: calcNetto(d.minderwertBrutto || 0),
                    repairCostBrutto: finalRepairCostBrutto,
                    anrechnung: d.anrechnung || 'voll',
                    repairCostNetto: calcNetto(finalRepairCostBrutto),
                    isInfo: d.anrechnung === 'informational',
                });
            });

            // 5. Equipment
            const isNotAvailable = (status: string | undefined) => status?.toLowerCase() === 'not available';
            const isAvailable = (status: string | undefined) => status?.toLowerCase() === 'available';
            const ep = store.globalConfig?.equipmentPrices || {};

            // Breakdown Kit (Pannenset)
            const isBreakdownKitMissing = isNotAvailable(store.breakdownKit?.status);
            const isBreakdownKitExpired = isAvailable(store.breakdownKit?.status) && store.breakdownKit?.expirationDate && new Date(store.breakdownKit.expirationDate) < new Date();
            if (isBreakdownKitMissing || isBreakdownKitExpired) {
                const cost = store.breakdownKit.price || (isBreakdownKitMissing ? (ep['breakdown_kit_missing'] ?? ep['breakdownKit_missing'] ?? 50) : (ep['breakdown_kit_expired'] ?? ep['breakdownKit_expired'] ?? 30));
                rows.push({
                    id: 'equipment-breakdown',
                    type: 'equipment',
                    label: isBreakdownKitMissing
                        ? `${t('step3.breakdownKit')} - ${t('common.notAvailable')}`
                        : `${t('step3.breakdownKit')} - ${t('step3.expired')} (${store.breakdownKit.expirationDate})`,
                    minderwertBrutto: cost,
                    minderwertNetto: calcNetto(cost),
                    repairCostBrutto: cost,
                    anrechnung: 'voll',
                    repairCostNetto: calcNetto(cost),
                    isInfo: false,
                });
            }

            // First Aid Kit (Verbandskasten)
            const isFirstAidKitMissing = isNotAvailable(store.firstAidKit?.status);
            const isFirstAidKitExpired = isAvailable(store.firstAidKit?.status) && store.firstAidKit?.expirationDate && new Date(store.firstAidKit.expirationDate) < new Date();
            if (isFirstAidKitMissing || isFirstAidKitExpired) {
                const cost = store.firstAidKit.price || (isFirstAidKitMissing ? (ep['first_aid_kit_missing'] ?? ep['firstAidKit_missing'] ?? 25) : (ep['first_aid_kit_expired'] ?? ep['firstAidKit_expired'] ?? 20));
                rows.push({
                    id: 'equipment-firstaid',
                    type: 'equipment',
                    label: isFirstAidKitMissing
                        ? `${t('step3.firstAidKit')} - ${t('common.notAvailable')}`
                        : `${t('step3.firstAidKit')} - ${t('step3.expired')} (${store.firstAidKit.expirationDate})`,
                    minderwertBrutto: cost,
                    minderwertNetto: calcNetto(cost),
                    repairCostBrutto: cost,
                    anrechnung: 'voll',
                    repairCostNetto: calcNetto(cost),
                    isInfo: false,
                });
            }

            // Safety Vest (Warnweste)
            const isSafetyVestMissing = isNotAvailable(store.safetyVest?.status);
            if (isSafetyVestMissing) {
                const cost = store.safetyVest.price || (ep['safety_vest_missing'] ?? ep['safetyVest_missing'] ?? 10);
                rows.push({
                    id: 'equipment-safetyvest',
                    type: 'equipment',
                    label: `${t('step3.safetyVest')} - ${t('common.notAvailable')}`,
                    minderwertBrutto: cost,
                    minderwertNetto: calcNetto(cost),
                    repairCostBrutto: cost,
                    anrechnung: 'voll',
                    repairCostNetto: calcNetto(cost),
                    isInfo: false,
                });
            }

            // Warning Triangle (Warndreieck)
            const isWarningTriangleMissing = isNotAvailable(store.warningTriangle?.status);
            if (isWarningTriangleMissing) {
                const cost = store.warningTriangle.price || (ep['warning_triangle_missing'] ?? ep['warningTriangle_missing'] ?? 15);
                rows.push({
                    id: 'equipment-warningtriangle',
                    type: 'equipment',
                    label: `${t('step3.warningTriangle')} - ${t('common.notAvailable')}`,
                    minderwertBrutto: cost,
                    minderwertNetto: calcNetto(cost),
                    repairCostBrutto: cost,
                    anrechnung: 'voll',
                    repairCostNetto: calcNetto(cost),
                    isInfo: false,
                });
            }

            // 6. Maintenance
            if (store.maintenancePrice > 0) {
                let maintenanceDesc = t('step3.maintenanceRecord');
                const mType = store.nextMaintenanceType;
                const mVal = store.nextMaintenanceIntervalValue;
                if (mType === 'days' && mVal != null) {
                    const dLabel = lang === 'de' ? 'Tage' : 'days';
                    maintenanceDesc = `${t('step3.maintenanceRecord')} (${Math.abs(mVal)} ${dLabel})`;
                } else if (mType === 'months' && mVal != null) {
                    const mLabel = lang === 'de' ? 'Monate' : 'months';
                    maintenanceDesc = `${t('step3.maintenanceRecord')} (${Math.abs(mVal)} ${mLabel})`;
                } else if (mType === 'mileage' && mVal != null) {
                    maintenanceDesc = `${t('step3.maintenanceRecord')} (${Math.abs(mVal)} km)`;
                }

                rows.push({
                    id: 'maintenance-price',
                    type: 'maintenance',
                    label: maintenanceDesc,
                    minderwertBrutto: store.maintenancePrice,
                    minderwertNetto: calcNetto(store.maintenancePrice),
                    repairCostBrutto: store.maintenancePrice,
                    anrechnung: 'keine',
                    repairCostNetto: calcNetto(store.maintenancePrice),
                    isInfo: false,
                });
            } else {
                // Fallback to legacy fields if type is 'date' or not set
                if (store.nextMaintenanceMileage && store.mileage && store.nextMaintenanceMileage < store.mileage) {
                    const cost = (store.mileage - store.nextMaintenanceMileage) * 0.05;
                    rows.push({
                        id: 'maintenance-mileage-legacy',
                        type: 'maintenance',
                        label: `${t('step3.maintenanceRecord')} - ${t('step5.mileageOverdue')} (${store.mileage - store.nextMaintenanceMileage} km)`,
                        minderwertBrutto: cost,
                        minderwertNetto: calcNetto(cost),
                        repairCostBrutto: cost,
                        anrechnung: 'keine',
                        repairCostNetto: calcNetto(cost),
                        isInfo: false,
                    });
                }
                if (store.nextMaintenanceDate && new Date(store.nextMaintenanceDate) < new Date()) {
                    const cost = Math.floor((new Date().getTime() - new Date(store.nextMaintenanceDate).getTime()) / (1000 * 3600 * 24)) * 1;
                    rows.push({
                        id: 'maintenance-date-legacy',
                        type: 'maintenance',
                        label: `${t('step3.maintenanceRecord')} - ${t('step5.dateOverdue')} (${store.nextMaintenanceDate})`,
                        minderwertBrutto: cost,
                        minderwertNetto: calcNetto(cost),
                        repairCostBrutto: cost,
                        anrechnung: 'keine',
                        repairCostNetto: calcNetto(cost),
                        isInfo: false,
                    });
                }
            }

            // 7. Paint Measurements
            sortPaintMeasurements(store.paintMeasurements).forEach(pm => {
                if (pm.damageKnown || pm.damageUnknown) {
                    const detailSuffix = pm.repairDamage ? ` (${pm.repairDamage})` : '';
                    rows.push({
                        id: pm.id,
                        type: 'paint',
                        label: `${t('step3.paintPart')}: ${getBodyPartLabel(pm.bodyPart, lang)}${detailSuffix} - ${pm.damageKnown ? `${t('step3.damageKnown')} (Info)` : t('step3.damageUnknown')}`,
                        minderwertBrutto: pm.depreciationValue || 0,
                        minderwertNetto: calcNetto(pm.depreciationValue || 0),
                        repairCostBrutto: pm.depreciationValue || 0,
                        anrechnung: pm.damageKnown ? 'informational' : 'voll',
                        repairCostNetto: calcNetto(pm.depreciationValue || 0),
                        isInfo: pm.damageKnown,
                    });
                }
            });

            // 8. Tires (Manual Depreciation)
            store.tires.forEach((tire, i) => {
                if (tire.depreciationValue && tire.depreciationValue > 0) {
                    rows.push({
                        id: `tire-mw-${i}`,
                        type: 'tire',
                        label: `${t('step5.tireAxle', { axle: tire.axle, side: tire.side === 'links' ? 'L' : 'R' })} - ${t('step3.depreciation', 'Wertminderung')}`,
                        minderwertBrutto: tire.depreciationValue,
                        minderwertNetto: calcNetto(tire.depreciationValue),
                        repairCostBrutto: tire.depreciationValue,
                        anrechnung: 'voll',
                        repairCostNetto: calcNetto(tire.depreciationValue),
                        isInfo: false,
                    });
                }
            });

            // 9. Second Tire Set (Manual Depreciation)
            if (store.hasSecondTireSet) {
                store.secondTires.forEach((tire, i) => {
                    if (tire.depreciationValue && tire.depreciationValue > 0) {
                        rows.push({
                            id: `second-tire-mw-${i}`,
                            type: 'tire',
                            label: `${t('step5.secondTireSetAxle', { axle: tire.axle, side: tire.side === 'links' ? 'L' : 'R' })} - ${t('step3.depreciation', 'Wertminderung')}`,
                            minderwertBrutto: tire.depreciationValue,
                            minderwertNetto: calcNetto(tire.depreciationValue),
                            repairCostBrutto: tire.depreciationValue,
                            anrechnung: 'voll',
                            repairCostNetto: calcNetto(tire.depreciationValue),
                            isInfo: false,
                        });
                    }
                });
            }

            // 10. Spare Tire (Manual Depreciation)
            if (store.spareTire.present && store.spareTire.depreciationValue && store.spareTire.depreciationValue > 0) {
                rows.push({
                    id: 'spare-tire-mw',
                    type: 'tire',
                    label: `${t('step3.spareTire')} - ${t('step3.depreciation', 'Wertminderung')}`,
                    minderwertBrutto: store.spareTire.depreciationValue,
                    minderwertNetto: calcNetto(store.spareTire.depreciationValue),
                    repairCostBrutto: store.spareTire.depreciationValue,
                    anrechnung: 'voll',
                    repairCostNetto: calcNetto(store.spareTire.depreciationValue),
                    isInfo: false,
                });
            }
        }

        return rows;
    };


    // ── Build report data with all images converted to base64 ──
    const buildReportData = async () => {
        const BODY_TO_OVERLAY: Record<string, string> = {
            bumper_front: 'front_bumper', hood: 'bonnet', windshield: 'windshield',
            fender_front_left: 'Front_left_fender', door_front_left: 'Front_left_door',
            door_rear_left: 'Rear_left_door', quarter_panel_left: 'Left_side_wall',
            sill_left: 'left_sill', roof_frame_left: 'Dachrahmen_links',
            fender_front_right: 'front_right_fender', door_front_right: 'Front_right_door',
            door_rear_right: 'Rear_right_door', quarter_panel_right: 'Right_side_wall',
            sill_right: 'Right_sill', roof_frame_right: 'Roof_frame_right',
            mirror_left: 'Left_wing_mirror', mirror_right: 'Right_hand_exterior_mirror',
            roof: 'Roof', tailgate: 'Tailgate', bumper_rear: 'rear_bumper',
            headlight_left: 'Headlight_on_the_left', headlight_right: 'Headlight_on_the_right',
            rear_light_left: 'Left_rear_light', rear_light_right: 'Taillights_right',
        };
        const selectedPartsMinderwert = store.minderwertRows
            .filter(row => !!row.damage || !!row.repairMethod || (row.images && row.images.length > 0))
            .map(row => BODY_TO_OVERLAY[row.bodyPart] || row.bodyPart);

        const selectedPartsDamages = store.damages
            .filter(d => !!d.bodyPart)
            .map(d => BODY_TO_OVERLAY[d.bodyPart] || d.bodyPart);

        const selectedParts = Array.from(new Set([...selectedPartsMinderwert, ...selectedPartsDamages]));

        const reportData: ReportData = {
            ...store,
            selectedParts,
            claimType: store.claimType as any,
            systemMinderwertRows: store.systemMinderwertRows || []
        };

        const fetchAsBase64 = async (url: string): Promise<string> => {
            if (!url || url.startsWith('data:')) return url;
            // Accept any URL that looks like an /api/ path or a relative /api/ path
            const apiIndex = url.indexOf('/api/');
            if (apiIndex === -1) return url;
            try {
                let path = url.substring(apiIndex + 4); // gives /reports/photos/... or /screenshots/...
                if (path.includes('screenshots/') || path.includes('reports/photos/')) {
                    const separator = path.includes('?') ? '&' : '?';
                    path = `${path}${separator}follow=false`;
                }
                const response = await api.get(path, { responseType: 'blob' });
                return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = () => resolve(url);
                    reader.readAsDataURL(response.data);
                });
            } catch { return url; }
        };
        const convertImages = async (images?: string[]): Promise<string[]> => {
            if (!images || images.length === 0) return [];
            return Promise.all(images.map(fetchAsBase64));
        };

        if (reportData.photos?.length > 0)
            reportData.photos = await Promise.all(reportData.photos.map(async (p: any) => {
                // Backend clears `data` and stores the URL in `filePath` — use filePath as fallback
                const rawUrl = p.data || p.filePath || '';
                return { ...p, data: await fetchAsBase64(rawUrl) };
            }));
        if (reportData.paintMeasurements?.length > 0)
            reportData.paintMeasurements = await Promise.all(reportData.paintMeasurements.map(async (p: any) => ({ ...p, images: await convertImages(p.images) })));
        if (reportData.tires?.length > 0)
            reportData.tires = await Promise.all(reportData.tires.map(async (t: any) => ({ ...t, images: await convertImages(t.images) })));
        if (reportData.damages?.length > 0)
            reportData.damages = await Promise.all(reportData.damages.map(async (d: any) => ({ ...d, images: await convertImages(d.images) })));
        if (reportData.minderwertRows?.length > 0)
            reportData.minderwertRows = await Promise.all(reportData.minderwertRows.map(async (r: any) => ({ ...r, images: await convertImages(r.images) })));
        if ((reportData as any).spareTire?.images?.length > 0)
            (reportData as any).spareTire = { ...(reportData as any).spareTire, images: await convertImages((reportData as any).spareTire.images) };
        for (const key of ['breakdownKit', 'firstAidKit', 'safetyVest', 'warningTriangle'] as const)
            if ((reportData as any)[key]?.images?.length > 0)
                (reportData as any)[key] = { ...(reportData as any)[key], images: await convertImages((reportData as any)[key].images) };
        const extraImageFields = [
            'chargingCableImages', 'serviceheftImages', 'bordliteraturImages', 'keysImages', 'maintenanceImages',
            'lastRegistrationImages', 'mileageImages', 'nextHUImages', 'identificationImages',
            'inspectedOnLiftImages', 'errorMemoryReadImages', 'hybridBatteryCheckedImages', 'fzScheinImages',
            'noLiftingPlatformAvailableImages', 'inspectionFromAboveNotPossibleImages', 'inspectionFromBelowNotPossibleImages',
            'vehicleWetImages', 'vehicleDirtyImages', 'testRunCarriedOutImages',
            'equipmentListAvailableImages', 'deliveryConfirmationAvailableImages', 'environmentalBadgeImages',
            'vehicleConditionImages', 'engineRunPerformedImages', 'inspectionFromAboveImages', 'inspectionFromBelowImages',
        ] as const;
        for (const field of extraImageFields)
            if ((reportData as any)[field]?.length > 0)
                (reportData as any)[field] = await convertImages((reportData as any)[field] as string[]);
        if (reportData.signatures) {
            const sigs = { ...reportData.signatures } as any;
            for (const role of ['driver', 'receiver', 'inspector'] as const)
                if (sigs[role]) sigs[role] = await fetchAsBase64(sigs[role]);
            reportData.signatures = sigs;
        }
        if (reportData.authorizedPersonPhoto) {
            reportData.authorizedPersonPhoto = await fetchAsBase64(reportData.authorizedPersonPhoto);
        }
        return reportData;
    };

    const generatePdfBlob = async (): Promise<{ pdfBlob: Blob; fileName: string }> => {
        const reportData = await buildReportData();
        const htmlContent = generatePDFHTML(reportData as any, lang);
        console.log("🚀 ~ generatePdfBlob ~ htmlContent:", htmlContent)

        // Determine safe scale based on page count estimate to prevent exceeding browser canvas height limits
        const estimatedPages = 5 + Math.ceil((reportData.photos?.length || 0) / 2);
        const pdfScale = estimatedPages > 16 ? 1.5 : 2;
        const displayOrderNumber = store.auftragsnummer || store.caseNumber;
        const fileName = `Gutachten_${displayOrderNumber}.pdf`;

        const opt = {
            margin: 0,
            filename: fileName,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: pdfScale,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                letterRendering: true,
                imageTimeout: 15000,
                dpi: 300,
                allowTaint: true,
                windowWidth: 1200,
            },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const, compress: true },
            pagebreak: { mode: ['css', 'legacy'] as const },
        };

        const pdfInstance = await html2pdf().set(opt).from(htmlContent).toPdf().get('pdf' as any);
        const pdfBlob = new Blob([pdfInstance.output('arraybuffer')], { type: 'application/pdf' });
        return { pdfBlob, fileName };
    };

    // ── Generate PDF ──
    const handleGeneratePdf = async () => {
        if (!validateAllSteps()) return;
        setGenerating(true);
        try {
            if (onSave) await onSave();

            const { pdfBlob, fileName } = await generatePdfBlob();

            // Open PDF
            const pdfUrl = URL.createObjectURL(pdfBlob);
            console.log("🚀 ~ handleGeneratePdf ~ pdfUrl:", pdfUrl)
            window.open(pdfUrl, '_blank');

            // Save to backend
            try {
                const formData = new FormData();
                formData.append('pdf', pdfBlob, fileName);
                formData.append('caseNumber', store.caseNumber);
                await api.post('/reports/save-pdf', formData);
            } catch (saveErr) {
                console.warn('Backend PDF save failed:', saveErr);
            }

            toast.success(t('step5.pdfOpened') || 'PDF wurde geöffnet.');

            // Refresh store
            const updated = await api.get(`/reports/my-report?caseNumber=${store.caseNumber}`).catch(() => ({ data: null }));
            if (updated.data) store.setAllData(updated.data);
        } catch (err) {
            console.error('PDF generation failed:', err);
            toast.error(t('step5.pdfError') || 'PDF konnte nicht erstellt werden.');
        } finally {
            setGenerating(false);
        }
    };

    const handleClosePreview = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const handleShowPreview = async () => {
        setPreviewing(true);
        try {
            if (onSave) await onSave();
            const { pdfBlob } = await generatePdfBlob();
            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPreviewUrl(pdfUrl);
        } catch (err) {
            console.error('PDF preview generation failed:', err);
            toast.error(t('step5.pdfError') || 'PDF konnte nicht erstellt werden.');
        } finally {
            setPreviewing(false);
        }
    };


    const handleSendEmail = async () => {
        if (!emailInput) {
            toast.error(t('step5.noCustomerEmail'));
            return;
        }

        if (!validateAllSteps()) return;

        store.updateField('customerEmail', emailInput);
        setEmailing(true);
        try {
            if (onSave) await onSave();

            const { pdfBlob, fileName } = await generatePdfBlob();

            const formData = new FormData();
            formData.append('pdf', pdfBlob, fileName);
            formData.append('email', emailInput);
            formData.append('caseNumber', store.caseNumber);
            formData.append('claimType', store.claimType || '');
            formData.append('licensePlate', store.licensePlate || '');
            await api.post('/reports/send-pdf', formData);

            try {
                const updated = await api.get(`/reports/my-report?caseNumber=${store.caseNumber}`);
                if (updated.data) store.setAllData(updated.data);
            } catch (e) {
                console.error('Failed to fetch updated report:', e);
            }

            setShowEmailModal(false);
            toast.success(t('step5.emailSentSuccess'));
        } catch (err) {
            console.error('Email send failed:', err);
            toast.error(t('step5.emailError'));
            setEmailing(false);
        }
    };

    const handleRetrySync = async () => {
        setSyncing(true);
        try {
            await api.post(`/reports/sync-omt?caseNumber=${store.caseNumber}`);
            toast.success(t('step5.syncSuccess') || 'Successfully synced with OMT');
            // Refresh
            const updated = await api.get(`/reports/my-report?caseNumber=${store.caseNumber}`);
            if (updated.data) {
                store.setAllData(updated.data);
            }
        } catch (err: any) {
            console.error('OMT sync retry failed:', err);
            toast.error(err.response?.data?.error || t('step5.syncError') || 'OMT sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleOpenHistoryPdf = async (pdfPath: string) => {
        try {
            console.log('Opening history PDF:', pdfPath);
            // pdfPath is usually /api/reports/photos/user_email/filename.pdf
            // Remove /api and ensuring leading slash is gone for baseURL append
            let relativePath = pdfPath;
            if (relativePath.startsWith('/api/')) {
                relativePath = relativePath.substring(5);
            } else if (relativePath.startsWith('api/')) {
                relativePath = relativePath.substring(4);
            } else if (relativePath.startsWith('/')) {
                relativePath = relativePath.substring(1);
            }

            const response = await api.get(relativePath, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Failed to open history PDF', err);
            toast.error(t('step5.openError') || 'Das Dokument konnte nicht geöffnet werden');
        }
    };


    // ── Build mandatory photo list dynamically from fieldConfigs (mirrors store validation) ──
    const DEFAULT_PHOTO_SLOTS = [
        { id: 'diag_fl', label: t('step4.diag_fl') },
        { id: 'diag_rl', label: t('step4.diag_rl') },
        { id: 'diag_rr', label: t('step4.diag_rr') },
        { id: 'diag_fr', label: t('step4.diag_fr') },
        { id: 'mileage_photo', label: t('step4.mileage_photo') },
        { id: 'vin_photo', label: t('step4.vin_photo') },
        { id: 'interior_door', label: t('step4.interior_door') },
        { id: 'sill_left', label: t('step4.sill_left') },
        { id: 'sill_right', label: t('step4.sill_right') },
    ];

    // When admin has configured photo slots use them (sorted by sortOrder), otherwise fall back to defaults
    const configuredPhotoSlots = (store.fieldConfigs ?? [])
        .filter((c: any) => c.isPhotoSlot === true)
        .sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

    const MANDATORY_PHOTOS = configuredPhotoSlots.length > 0
        ? configuredPhotoSlots.map((c: any) => ({ id: c.fieldName, label: c.label || c.fieldName }))
        : DEFAULT_PHOTO_SLOTS;

    const hasPhoto = (id: string, label: string) => {
        if (id === 'mileage_photo')
            return (store.mileageImages && store.mileageImages.length > 0) ||
                store.photos.some(p => p.mandatoryPhotoId === 'mileage_photo');
        if (id === 'vin_photo')
            return (store.identificationImages && store.identificationImages.length > 0) ||
                store.photos.some(p => p.mandatoryPhotoId === 'vin_photo');
        return store.photos.some(p => p.mandatoryPhotoId === id || p.label === label);
    };

    const missingPhotos = MANDATORY_PHOTOS.filter(photo => isRequired(photo.id) && !hasPhoto(photo.id, photo.label));

    const handleOpenSignatureModal = (role: keyof Signatures) => {
        setSigningRole(role);
        setTempSignature(store.signatures[role] || '');
    };

    const handleConfirmSignature = () => {
        if (signingRole) {
            store.updateSignature(signingRole, tempSignature);
            setSigningRole(null);
            setTempSignature('');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const validation = await validateImageAspectRatio(file);
            if (!validation.valid) {
                toast(t(validation.error || 'common.imageValidation.orientationWarning'), {
                    icon: '⚠️',
                    duration: 3000
                });
            }
            const compressedData = await compressImage(file, 1200, 1200, 0.7);
            store.updateField('authorizedPersonPhoto', compressedData);
        } catch (err) {
            console.error('Failed to compress image:', file.name, err);
            toast.error(t('step4.compressionError') || `Failed to compress image: ${file.name}`);
        } finally {
            e.target.value = '';
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => setShowActivityLog(true)}
                    className="btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                >
                    <History className="w-4 h-4" />
                    {t('activityLog.title')}
                </button>
            </div>

            <ModalWrapper
                isOpen={showActivityLog}
                onClose={() => setShowActivityLog(false)}
                title={t('activityLog.title')}
                fullScreen
            >
                <ActivityLogTab />
            </ModalWrapper>

            {(store.vehicleBaseValue || 0) > 0 && !isVehicleEvaluation && (
                <div className="mb-8 relative overflow-hidden bg-white rounded-3xl border border-primary/10 shadow-xl shadow-primary/5">
                    {/* Top Accent Bar */}
                    <div className="h-1.5 bg-primary" />

                    <div className="p-8">
                        <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary-light rounded-2xl text-primary shadow-sm">
                                    <Calculator className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-dark-gray uppercase tracking-tight">{t('step2.valuation')}</h3>
                                    <p className="text-xs text-gray-500 font-medium">{t('step2.vehicleData')} & Matrix Breakdown</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-primary-light/50 rounded-xl border border-primary/10">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">System Verified Matrix</span>
                            </div>
                        </div>

                        {/* ── Type 3: Text Only ── */}
                        {store.globalConfig?.calculationType === 'text_only' ? (
                            <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                <div className="w-12 h-12 flex items-center justify-center bg-slate-200 rounded-full mb-4 text-slate-600 text-lg font-black">3</div>
                                <p className="text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Text-Only Mode</p>
                                <p className="text-base font-bold text-slate-500">
                                    {store.globalConfig?.calculationTypeText || 'Depreciation not applicable'}
                                </p>
                            </div>
                        ) : store.globalConfig?.calculationType === 'hundred_percent' ? (
                            /* ── Type 2: 100% ── */
                            <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-6 mb-8">
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t('step2.vehicleBaseValue')}</span>
                                    <span className="text-2xl font-black text-dark-gray">{formatCurrency(store.vehicleBaseValue || 0)}</span>
                                </div>
                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 flex flex-col justify-center">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-2">Calculation Mode</span>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-500 text-white rounded-full text-[10px] font-black">2</span>
                                        <span className="text-sm font-black text-emerald-700">100% — No Depreciation</span>
                                    </div>
                                    <p className="text-xs text-emerald-600/60 font-medium mt-2">Factor always = 1.0. Full replacement value applied.</p>
                                </div>
                            </div>
                        ) : (
                            /* ── Type 1: Proportional (default) ── */
                            <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-6 mb-8">
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">{t('step2.vehicleBaseValue')}</span>
                                    <span className="text-2xl font-black text-dark-gray">{formatCurrency(store.vehicleBaseValue || 0)}</span>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Matrix Factor</span>
                                        <span className="text-[10px] font-bold text-primary italic">Age & Mileage</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-2xl font-black text-dark-gray">x {store.depreciationMatrixFactor?.toFixed(3)}</span>
                                        {store.mileageBucket && (
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{store.mileageBucket}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('step2.priceCategory')}</span>
                                        <span className="text-[10px] font-bold text-primary italic">{store.priceCategory || '—'}</span>
                                    </div>
                                    <span className="text-2xl font-black text-dark-gray">x {(() => {
                                        const entries = store.globalConfig?.priceCategoryEntries;
                                        if (entries?.length && store.priceCategory) {
                                            const found = entries.find(e => e.key === store.priceCategory || e.label === store.priceCategory);
                                            return (found?.factor ?? 1.0).toFixed(2);
                                        }
                                        return (store.globalConfig?.priceCategoryFactors?.[store.priceCategory || ''] ?? 1.0).toFixed(2);
                                    })()}</span>
                                </div>
                            </div>
                        )}

                        {/* Final value — shown for Types 1 & 2 only */}
                        {store.globalConfig?.calculationType !== 'text_only' && (
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-400 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000" />
                                <div className="relative flex flex-col @3xl:flex-row items-center justify-between p-8 bg-white border-2 border-primary rounded-2xl shadow-xl overflow-hidden">
                                    <div className="relative z-10 text-center @3xl:text-left mb-6 @3xl:mb-0">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">{t('step2.calculatedValue')}</p>
                                        <p className="text-4xl font-black text-dark-gray">{formatCurrency(store.finalVehicleValue || 0)}</p>
                                    </div>
                                    <div className="relative z-10 text-center @3xl:text-right">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light rounded-xl border border-primary/20 mb-2">
                                            <Zap className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Audit-Ready Formula</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-medium">Replacement Value Calculation</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <SectionTitle>{t('step5.reviewTabular')}</SectionTitle>
            <Card className="overflow-hidden no-padding">
                <div className="hidden @3xl:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="p-3 text-left font-bold text-gray-700">{t('step5.schadenHeader', 'Schaden')}</th>
                                {!isVehicleEvaluation ? (
                                    <>
                                        <th className="p-3 text-right font-bold text-gray-700">{t('step5.reparaturBruttoHeader', 'Reparatur (brutto)')}</th>
                                        <th className="p-3 text-right font-bold text-gray-700">{t('step5.minderwertBruttoHeader', 'Minderwert Schaden (brutto)')}</th>
                                    </>
                                ) : (
                                    <th className="p-3 text-left font-bold text-gray-700">{t('step5.status')}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {buildConsolidatedRows().map((row, idx) => (
                                <tr key={row.id || idx} className={`${row.type === 'auto' || row.type === 'system' || row.type === 'equipment' ? 'bg-orange-50/20' : 'hover:bg-gray-50'} ${row.isInfo ? 'italic text-gray-400' : ''}`}>
                                    <td className="p-3 font-medium">
                                        {idx + 1}. {row.label}
                                    </td>
                                    {!isVehicleEvaluation ? (
                                        <>
                                            <td className="p-3 text-right font-mono">{formatCurrency(row.repairCostBrutto)}</td>
                                            <td className={`p-3 text-right font-mono ${row.isInfo ? 'line-through decoration-orange-300' : ''}`}>{formatCurrency(row.minderwertBrutto)}</td>
                                        </>
                                    ) : (
                                        <td className="p-3 text-gray-600">—</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        {!isVehicleEvaluation && (
                            <tfoot>
                                <tr className="bg-primary/5 font-bold text-base border-t-2 border-primary/20">
                                    <td className="p-4">{t('step5.totalRowHeader', 'Gesamtbetrag / Minderwert')}</td>
                                    <td className="p-4 text-right font-mono text-primary">{formatCurrency(store.totalRepairCostBrutto())}</td>
                                    <td className="p-4 text-right font-mono text-primary">{formatCurrency(totalMinderwertBr)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Mobile View */}
                <div className="@3xl:hidden divide-y divide-gray-100">
                    {buildConsolidatedRows().map((item, idx) => (
                        <div key={item.id || idx} className={`p-4 flex items-center justify-between gap-4 ${item.type === 'auto' || item.type === 'system' || item.type === 'equipment' ? 'bg-orange-50/20' : 'bg-white'}`}>
                            <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${item.type === 'auto' || item.type === 'system' ? 'text-orange-800' : 'text-gray-800'} ${item.isInfo ? 'italic text-gray-400' : ''}`}>{idx + 1}. {item.label}</p>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">{translateAnrechnung(item.anrechnung)}</p>
                            </div>
                            {!isVehicleEvaluation && (
                                <div className="flex-shrink-0 text-right">
                                    <div className="text-sm font-black font-mono text-gray-700">
                                        Rep: {formatCurrency(item.repairCostBrutto)}
                                    </div>
                                    <div className={`text-[10px] font-mono ${item.type === 'auto' || item.type === 'system' ? 'text-orange-600' : 'text-primary'} ${item.isInfo ? 'text-gray-400 line-through' : ''}`}>
                                        MW: {formatCurrency(item.minderwertBrutto)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {!isVehicleEvaluation && (
                        <div className="p-4 bg-primary text-white flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs opacity-90">
                                <span>{t('step5.totalRepairCosts')} (Brutto)</span>
                                <span className="font-mono">{formatCurrency(store.totalRepairCostBrutto())}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider">{t('step5.totalMinderwert')} (Brutto)</span>
                                <span className="text-lg font-black font-mono">{formatCurrency(totalMinderwertBr)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <SectionTitle>{t('step5.signatures')}</SectionTitle>
            <Card>
                <div
                    className={`mb-6 p-4 rounded-lg border-2 transition-all ${
                        showValidationErrors && validationErrors['expertAssessmentStatus']
                            ? 'border-red-500 bg-red-50/10 ring-2 ring-red-500/10'
                            : 'bg-gray-50 border-gray-200'
                    }`}
                    data-fieldname="expertAssessmentStatus"
                >
                    <div className="flex items-center justify-between mb-3 ">
                        <h4 className="text-sm font-semibold text-gray-700">{t('step5.expertAssessment')}</h4>
                        {adminMode && (
                            <button
                                onClick={() => onToggleRequired?.('expertAssessmentStatus')}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all text-[10px] font-bold uppercase tracking-wider
                                    ${isRequired('expertAssessmentStatus')
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-white text-gray-400 border border-gray-200 hover:border-primary/30 hover:text-primary'
                                    }`}
                            >
                                <CheckCircle className="w-3 h-3" />
                                {t('admin.mandatory')}
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="expertAssessment"
                                className="w-4 h-4 text-primary-blue border-gray-300 focus:ring-primary-blue"
                                checked={store.expertAssessmentStatus === 'accepted'}
                                onChange={() => store.updateField('expertAssessmentStatus', 'accepted')}
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-blue transition-colors">
                                {t('step5.expertAccepted')}
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="expertAssessment"
                                className="w-4 h-4 text-primary-blue border-gray-300 focus:ring-primary-blue"
                                checked={store.expertAssessmentStatus === 'not_accepted'}
                                onChange={() => store.updateField('expertAssessmentStatus', 'not_accepted')}
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-blue transition-colors">
                                {t('step5.expertNotAccepted')}
                            </span>
                        </label>
                    </div>
                    {showValidationErrors && validationErrors['expertAssessmentStatus'] && (
                        <p className="text-red-500 text-xs mt-2 font-bold">{t('validation.required', 'Einschätzung ist erforderlich')}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
                    <div className="space-y-2 text-left" data-fieldname={showValidationErrors && validationErrors['signatureDriver'] ? "signatureDriver" : undefined}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{t('step5.sigDriver')}</span>
                            {adminMode && (
                                <button
                                    onClick={() => onToggleRequired?.('signatureDriver')}
                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all text-[9px] font-bold uppercase tracking-wider
                                        ${isRequired('signatureDriver')
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-white text-gray-400 border border-gray-200 hover:border-primary/30 hover:text-primary'
                                        }`}
                                >
                                    <CheckCircle className="w-2.5 h-2.5" />
                                    {t('admin.mandatory')}
                                </button>
                            )}
                        </div>
                        <input
                            className={`form-input py-2 text-sm w-full ${
                                showValidationErrors && validationErrors['signatureDriver'] && !store.signatureNames.driver
                                    ? 'border-2 border-red-500 bg-red-50/10 focus:border-red-600'
                                    : ''
                            }`}
                            value={store.signatureNames.driver}
                            onChange={e => store.updateSignatureName('driver', e.target.value)}
                            placeholder={t('step5.sigDriverNamePlaceholder')}
                        />
                        <SignaturePad
                            name="signatureDriver"
                            error={!!(showValidationErrors && validationErrors['signatureDriver'] && !store.signatures.driver)}
                            label={t('step5.sigDriver')}
                            value={store.signatures.driver}
                            onChange={v => store.updateSignature('driver', v)}
                            hideLabel
                            readOnly
                            onClick={() => handleOpenSignatureModal('driver')}
                        />
                        {store.signatures.driver && (
                            <div className="flex gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={() => handleOpenSignatureModal('driver')}
                                    className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/5 border border-primary/20 rounded hover:bg-primary/10 transition-colors"
                                >
                                    {t('common.edit')}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 text-left" data-fieldname={showValidationErrors && validationErrors['signatureReceiver'] ? "signatureReceiver" : undefined}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{t('step5.sigReceiver')}</span>
                            {adminMode && (
                                <button
                                    onClick={() => onToggleRequired?.('signatureReceiver')}
                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all text-[9px] font-bold uppercase tracking-wider
                                        ${isRequired('signatureReceiver')
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-white text-gray-400 border border-gray-200 hover:border-primary/30 hover:text-primary'
                                        }`}
                                >
                                    <CheckCircle className="w-2.5 h-2.5" />
                                    {t('admin.mandatory')}
                                </button>
                            )}
                        </div>
                        <input
                            className={`form-input py-2 text-sm w-full ${
                                showValidationErrors && validationErrors['signatureReceiver'] && !store.signatureNames.receiver
                                    ? 'border-2 border-red-500 bg-red-50/10 focus:border-red-600'
                                    : ''
                            }`}
                            value={store.signatureNames.receiver}
                            onChange={e => store.updateSignatureName('receiver', e.target.value)}
                            placeholder={t('step5.sigReceiverNamePlaceholder')}
                        />
                        <SignaturePad
                            name="signatureReceiver"
                            error={!!(showValidationErrors && validationErrors['signatureReceiver'] && !store.signatures.receiver)}
                            label={t('step5.sigReceiver')}
                            value={store.signatures.receiver}
                            onChange={v => store.updateSignature('receiver', v)}
                            hideLabel
                            readOnly
                            onClick={() => handleOpenSignatureModal('receiver')}
                        />
                        {store.signatures.receiver && (
                            <div className="flex gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={() => handleOpenSignatureModal('receiver')}
                                    className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/5 border border-primary/20 rounded hover:bg-primary/10 transition-colors"
                                >
                                    {t('common.edit')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 space-y-6">
                    <div className="flex flex-wrap items-center gap-8">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${store.isAuthorizedPerson ? 'bg-primary' : 'bg-gray-300'}`}>
                                <div className={`bg-white w-3 h-3 rounded-full transition-transform ${store.isAuthorizedPerson ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={store.isAuthorizedPerson}
                                onChange={(e) => store.updateField('isAuthorizedPerson', e.target.checked)}
                            />
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-primary transition-colors">
                                {t('step5.authorizedPerson')}
                            </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary transition-all cursor-pointer"
                                checked={store.customerPresent}
                                onChange={(e) => store.updateField('customerPresent', e.target.checked)}
                            />
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-primary transition-colors">
                                {t('step5.customerPresent')}
                            </span>
                        </label>
                    </div>

                    {store.isAuthorizedPerson && (
                        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-6 p-4 bg-primary/5 rounded-xl border border-primary/10 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-primary uppercase tracking-tight">{t('step5.authorizedPersonName')}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                                    <input
                                        className="form-input pl-10 bg-white"
                                        value={store.authorizedPersonName}
                                        onChange={e => store.updateField('authorizedPersonName', e.target.value)}
                                        placeholder={t('step5.sigDriverNamePlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-primary uppercase tracking-tight">{t('step5.authorizedPersonPhoto')}</label>
                                <div className="flex items-center gap-4">
                                    {store.authorizedPersonPhoto ? (
                                        <PhotoThumbnail
                                            src={store.authorizedPersonPhoto}
                                            onRemove={() => store.updateField('authorizedPersonPhoto', '')}
                                            onUpdate={(newSrc) => store.updateField('authorizedPersonPhoto', newSrc)}
                                            className="w-32 h-24"
                                        />
                                    ) : (
                                        <div className="flex gap-2">
                                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-primary/30 rounded-lg text-primary hover:bg-primary/5 transition-all text-sm font-medium">
                                                <Upload className="w-4 h-4" />
                                                {t('step4.upload')}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                            </label>
                                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-primary/30 rounded-lg text-primary hover:bg-primary/5 transition-all text-sm font-medium">
                                                <Camera className="w-4 h-4" />
                                                {t('step4.takePhoto')}
                                                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <ModalWrapper
                isOpen={!!signingRole}
                onClose={() => setSigningRole(null)}
                title={signingRole ? t(`step5.sig${signingRole.charAt(0).toUpperCase() + signingRole.slice(1)}`) : ''}
            >
                <div className="p-4 space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                        <SignaturePad
                            label={signingRole ? t(`step5.sig${signingRole.charAt(0).toUpperCase() + signingRole.slice(1)}`) : ''}
                            value={tempSignature}
                            onChange={setTempSignature}
                            hideLabel
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setSigningRole(null)}
                            className="btn-outline flex-1 py-3"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmSignature}
                            disabled={!tempSignature}
                            className="btn-primary flex-1 py-3 shadow-lg shadow-primary/20"
                        >
                            {t('common.confirm')}
                        </button>
                    </div>
                </div>
            </ModalWrapper>

            {/* Actions */}
            <Card className="flex justify-end ">
                <div className="flex flex-col @3xl:flex-row gap-3">
                    {previewing ? (
                        <button disabled className="btn-outline flex items-center justify-center gap-2 px-5 py-2 text-sm opacity-70">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            {t('step5.generatingPdf')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleShowPreview}
                            className="btn-outline flex items-center justify-center gap-2 px-5 py-2 text-sm hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Eye className="w-4 h-4" />
                            {t('step5.pdfPreview')}
                        </button>
                    )}
                    {generating ? (
                        <button disabled className="btn-primary flex items-center gap-2 px-5 py-2 text-sm opacity-70">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('common.generatingPDF')}
                        </button>
                    ) : (
                        <button
                            onClick={handleGeneratePdf}
                            disabled={missingPhotos.length > 0}
                            className={`btn-primary flex items-center justify-center gap-2 px-5 py-2 text-sm shadow-sm transition-all ${missingPhotos.length > 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
                        >
                            <Printer className="w-4 h-4" />
                            {t('common.downloadPDF')}
                        </button>
                    )}
                    <button type="button" onClick={() => setShowEmailModal(true)} disabled={emailing} className="btn-primary flex items-center justify-center gap-2 px-5 py-2 text-sm">
                        <Mail className="w-4 h-4" />
                        {t('step5.sendEmail')}
                    </button>
                </div>
            </Card>

            {/* OMT Sync Status */}
            {store.status === 'COMPLETED' && (
                <div className="mt-6">
                    <SectionTitle>{t('step5.omtSyncTitle') || 'OMT Integration Status'}</SectionTitle>
                    <Card className={`p-4 border-l-4 ${store.omtSyncStatus === 'SUCCESS' ? 'border-green-500 bg-green-50/30' : store.omtSyncStatus === 'FAILED' ? 'border-red-500 bg-red-50/30' : 'border-blue-500 bg-blue-50/30'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {store.omtSyncStatus === 'SUCCESS' ? (
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                ) : store.omtSyncStatus === 'FAILED' ? (
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                ) : (
                                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                                )}
                                <div>
                                    <p className="font-bold text-gray-800">
                                        {store.omtSyncStatus === 'SUCCESS' ? (t('step5.syncSuccess') || 'Case Synced Successfully') :
                                            store.omtSyncStatus === 'FAILED' ? (t('step5.syncFailed') || 'Sync Failed') :
                                                (t('step5.syncPending') || 'Sync Pending')}
                                    </p>
                                    {store.omtSyncError && (
                                        <p className="text-sm text-red-600 mt-1">{store.omtSyncError}</p>
                                    )}
                                </div>
                            </div>
                            {store.omtSyncStatus === 'FAILED' && (
                                <button
                                    type="button"
                                    onClick={handleRetrySync}
                                    disabled={syncing}
                                    className="btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                                >
                                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    {t('step5.retrySync') || 'Retry Sync'}
                                </button>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-scale-up">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('step5.sendEmail')}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('step1.customerEmail')}</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder={t('step1.customerEmailPlaceholder')}
                                        disabled={emailing}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailModal(false)}
                                        disabled={emailing}
                                        className="btn-outline flex-1"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendEmail}
                                        disabled={emailing}
                                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                                    >
                                        {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        {emailing ? t('step5.sendingEmail') : t('common.confirm')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Protocol / Log */}
            {store.sendLogs && store.sendLogs.length > 0 ? (
                <div className="mt-8 space-y-4">
                    <SectionTitle>{t('step5.sendLogTitle')}</SectionTitle>
                    <Card>
                        <ul className="divide-y divide-gray-100">
                            {[...store.sendLogs].reverse().map((log, index) => (
                                <li key={index} className="py-3 text-sm text-gray-600 leading-relaxed">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-primary/20 flex-shrink-0" />
                                        <span>
                                            {t('step5.sendLogEntry', {
                                                recipient: log.recipient,
                                                date: log.sentAt,
                                                sender: log.sender
                                            })}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            ) : null}

            {/* Document History / Previous Versions */}
            <div className="mt-8 space-y-4">
                <SectionTitle>{t('step5.documentHistory') || 'Dokumentenhistorie'}</SectionTitle>
                <Card className="no-padding overflow-hidden">
                    {store.versions && store.versions.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden @3xl:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="p-3 text-left font-bold text-gray-700">{t('step5.version') || 'Version'}</th>
                                            <th className="p-3 text-left font-bold text-gray-700">{t('step5.createdAt') || 'Erstellt am'}</th>
                                            <th className="p-3 text-left font-bold text-gray-700">{t('step5.createdBy') || 'Erstellt von'}</th>
                                            <th className="p-3 text-right font-bold text-gray-700">{t('common.actions') || 'Aktionen'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {[...store.versions].reverse().map((v) => (
                                            <tr key={v.version} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3 font-semibold text-gray-700 underline text-primary">v{v.version}</td>
                                                <td className="p-3 text-gray-600">{v.createdAt}</td>
                                                <td className="p-3 text-gray-600">{v.createdBy}</td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenHistoryPdf(v.pdfPath)}
                                                        className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        {t('common.open')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Latest version entry */}
                                        <tr className="bg-primary/5 font-medium">
                                            <td className="p-3">
                                                <span className="flex items-center gap-1.5 text-green-600 font-bold">
                                                    <CheckCircle className="w-4 h-4" />
                                                    {t('step5.latestVersion') || 'Aktuelle Version'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-500 italic">-</td>
                                            <td className="p-3 text-gray-500 italic">-</td>
                                            <td className="p-3 text-right">
                                                <span className="text-gray-400 italic text-xs">{t('step5.activeDoc') || 'Aktives Dokument'}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="@3xl:hidden divide-y divide-gray-100">
                                {[...store.versions].reverse().map((v) => (
                                    <div key={v.version} className="p-4 space-y-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-primary/5 rounded-lg">
                                                    <History className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="text-sm font-black text-primary underline">v{v.version}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenHistoryPdf(v.pdfPath)}
                                                className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/10 transition-all border border-primary/10 active:scale-95"
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                                {t('common.open')}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                                                <span className="block text-[9px] text-gray-400 font-black uppercase tracking-[0.1em] mb-1">{t('step5.createdAt') || 'Erstellt am'}</span>
                                                <span className="text-[11px] text-gray-700 font-bold">{v.createdAt}</span>
                                            </div>
                                            <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                                                <span className="block text-[9px] text-gray-400 font-black uppercase tracking-[0.1em] mb-1">{t('step5.createdBy') || 'Erstellt von'}</span>
                                                <span className="text-[11px] text-gray-700 font-bold">{v.createdBy}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Latest version card */}
                                <div className="p-4 bg-emerald-50/30 border-l-4 border-emerald-500">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-wider">
                                            <div className="p-1.5 bg-emerald-100 rounded-full">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            </div>
                                            {t('step5.latestVersion') || 'Aktuelle Version'}
                                        </span>
                                        <span className="text-emerald-500/60 italic text-[9px] font-black uppercase tracking-widest">{t('step5.activeDoc') || 'Aktives Dokument'}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center text-gray-400 italic">
                            {t('step5.noHistory') || 'Noch keine Dokumentenhistorie verfügbar. Generieren Sie ein PDF, um die Historie zu starten.'}
                        </div>
                    )}
                </Card>
            </div>

            {/* PDF Preview Modal */}
            {previewUrl && (
                <ModalWrapper
                    isOpen={!!previewUrl}
                    onClose={handleClosePreview}
                    title={t('step5.pdfPreview')}
                    fullScreen
                    noPadding
                >
                    <div className="w-full h-full flex flex-col bg-gray-100">
                        <div className="flex-1 min-h-0 relative">
                            <iframe
                                src={previewUrl}
                                className="absolute inset-0 w-full h-full border-0"
                                title={t('step5.pdfPreview')}
                            />
                        </div>
                        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 no-print">
                            {generating ? (
                                <button disabled className="btn-primary flex items-center gap-2 px-5 py-2 text-sm opacity-70">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('common.generatingPDF')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await handleGeneratePdf();
                                        handleClosePreview();
                                    }}
                                    disabled={missingPhotos.length > 0}
                                    className={`btn-primary flex items-center justify-center gap-2 px-5 py-2 text-sm shadow-sm transition-all ${missingPhotos.length > 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
                                >
                                    <Printer className="w-4 h-4" />
                                    {t('common.downloadPDF')}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleClosePreview}
                                className="btn-secondary px-5 py-2 text-sm"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
};

export default Step5_Summary;
