import React, { createContext, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createStore, useStore, type StateCreator, type StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { BODY_PARTS } from '../constants/bodyParts';
import { DEFAULT_GLOBAL_CONFIG } from '../constants/configDefaults';
import { lookupEstimatePrice, mapRepairCodeStringToEstimateId } from '../constants/estimateRepairCodes';
import { calcLackstundensatz, DEFAULT_KAROSSERIE_STUNDENSATZ } from '../constants/hourlyRates';
import type { DamageItem, DamageType, GlobalConfig, LackberechnungsartType, MinderwertRow, PaintMeasurement, RepairMethodType, RepairPosition, RepairTableEntry, RepairType, ReportData, ReportPhoto, SignatureNames, Signatures, TireInfo, VehicleCategoryType } from '../types/report.types';
import { getAutomaticDevaluations } from '../utils/automaticDevaluationService';
import { formatDate, formatMonthYear, normalizeDate, todayISO } from '../utils/dateFormatter';
import { generateCaseNumber } from '../utils/generateCaseNumber';
import { calculateMinderwertProRata, parseGermanDate } from '../utils/minderwertCalculator';
import { calculateRepairCostForPart, getDescriptionsFromCode, getRepairCodeInfo } from '../utils/repairCostCalculatorExcel';
import { calcBrutto, calcNetto } from '../utils/vatCalculator';



const getStoredConfig = () => {
    try {
        const stored = localStorage.getItem('rateConfig');
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
};

const storedConfig = getStoredConfig();

const defaultTires: TireInfo[] = [
    { axle: 1, side: 'links', designation: '', manufacturer: '', tireModel: '', type: 'A', treadDepth: '', dotNumber: '', depreciationValue: 0, rimType: '', rimDamage: [], images: [], damaged: false },
    { axle: 1, side: 'rechts', designation: '', manufacturer: '', tireModel: '', type: 'A', treadDepth: '', dotNumber: '', depreciationValue: 0, rimType: '', rimDamage: [], images: [], damaged: false },
    { axle: 2, side: 'rechts', designation: '', manufacturer: '', tireModel: '', type: 'A', treadDepth: '', dotNumber: '', depreciationValue: 0, rimType: '', rimDamage: [], images: [], damaged: false },
    { axle: 2, side: 'links', designation: '', manufacturer: '', tireModel: '', type: 'A', treadDepth: '', dotNumber: '', depreciationValue: 0, rimType: '', rimDamage: [], images: [], damaged: false },
];

/**
 * Sorts a flat tire array into the canonical inspection sequence:
 */
const normalizeTireOrder = (tires: TireInfo[]): TireInfo[] => {
    if (!tires || tires.length === 0) return tires;
    // Build a canonical sort key per tire:
    const sideOrder = (axle: number, side: string): number => {
        if (axle === 1) return side === 'links' ? 0 : 1;
        return side === 'rechts' ? 0 : 1; // right side first for rear axles: VL -> VR -> HR -> HL
    };
    return [...tires].sort((a, b) => {
        if (a.axle !== b.axle) return a.axle - b.axle;
        return sideOrder(a.axle, a.side) - sideOrder(b.axle, b.side);
    });
};




const defaultSpareTire: ReportData['spareTire'] = {
    present: false,
    designation: '',
    manufacturer: '',
    tireModel: '',
    type: 'A',
    treadDepth: '',
    dotNumber: '',
    depreciationValue: 0,
    rimType: '',
    rimDamage: [],
    images: [],
    damaged: false
};

const defaultMinderwertRows: MinderwertRow[] = [
    ...BODY_PARTS.map(part => ({
        id: part.id,
        bodyPart: part.id,
        damage: '' as DamageType,
        repairMethod: '' as const,
        repairCost: 0,
        repairCostBrutto: 0,
        presetType: 1 as const,
        isCustom: false,
        repairCodeIndex: 0,
        images: [],
        reparaturweg: 'Karosserie' as const,
        spareParts: 0,
        sparePartsBrutto: 0,
        anrechnung: 'keine' as const,
        repairType: '' as const
    })),
];

const defaultPaintMeasurements: PaintMeasurement[] = [];

const initialState: ReportData = {
    ...DEFAULT_GLOBAL_CONFIG,
    globalConfig: (storedConfig && Object.keys(storedConfig).length > 0) ? storedConfig : DEFAULT_GLOBAL_CONFIG,
    caseNumber: generateCaseNumber(),
    source: '',
    licensePlate: '',
    customerNumber: '',
    customerEmail: '',
    contractNumber: '',
    claimType: '',
    concernType: '',
    concernCompany: '',
    clientName: '',
    clientAddress: '',
    clientStreet: '',
    clientHouseNumber: '',
    clientZip: '',
    clientCity: '',
    orderDate: todayISO(),
    inspectionDate: todayISO(),
    inspectionTime: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    inspectionLocation: '',
    inspectorName: '',
    valuationDate: todayISO(),
    intranetCustomerId: '',
    vin: '',
    manufacturer: '',
    baseModel: '',
    subModel: '',
    datECode: '',
    kbaNumbers: '',
    firstRegistration: '',
    lastRegistration: '',
    bodyType: '',
    doors: null,
    seats: null,
    keyNumber: '',
    mileage: 0,
    nextHU: '',
    fuelType: '',
    cylinders: null,
    powerKw: 0,
    displacement: 0,
    emissionClass: '',
    driveType: '',
    transmission: '',
    wheels: '',
    colorDescription: '',
    upholsteryDescription: '',
    standardEquipment: [],
    optionalEquipment: [],

    lastRegistrationImages: [],
    mileageImages: [],
    nextHUImages: [],
    identificationImages: [],
    karosseriestundensatz: storedConfig?.karosseriestundensatz ?? DEFAULT_KAROSSERIE_STUNDENSATZ,
    lackstundensatz: storedConfig?.lackstundensatz ?? calcLackstundensatz(DEFAULT_KAROSSERIE_STUNDENSATZ),
    lackberechnungsart: storedConfig?.lackberechnungsart ?? 'AZT',
    vehicleCategory: null, // Always start with null, no default/fallback allowed
    audatexHaupttyp: '',
    testDriveDone: '',
    liftingPlatformStatus: '',
    vehicleConditionStatus: '',
    vehicleConditionOther: '',
    errorMemoryRead: null,
    hybridBatteryChecked: null,
    keysPresent: 2,
    targetKeysCount: 2,    // System default: 2 keys expected
    actualKeysCount: 0,    // User will fill this in on-site
    workshopKeysCount: 0,
    remoteControlsCount: 0,
    documentsPresent: [],
    registrationCertificateStatus: '',
    registrationCertificateSubmittedLater: false,
    serviceBookletStatus: '',
    serviceBookletSubmittedLater: false,
    operatingManualStatus: '',
    operatingManualSubmittedLater: false,
    environmentalBadgeStatus: '',
    environmentalBadgeSubmittedLater: false,
    additionalNotes: '',
    noPaintIssuesDetected: false,
    paintMeasurements: defaultPaintMeasurements,
    tires: defaultTires,
    spareTire: defaultSpareTire,
    breakdownKit: { status: '', images: [] },
    firstAidKit: { status: '', images: [] },
    safetyVest: { status: '', images: [] },
    warningTriangle: { status: '', images: [] },
    nextMaintenanceDate: '',
    nextMaintenanceMileage: 0,
    nextMaintenanceType: '',
    nextMaintenanceIntervalValue: null,
    maintenanceStatus: '',
    maintenancePrice: 0,
    serviceheftImages: [],
    bordliteraturImages: [],
    keysImages: [],
    maintenanceImages: [],
    fzScheinImages: [],
    errorMemoryReadImages: [],
    hybridBatteryCheckedImages: [],
    inspectionFromAboveImages: [],
    inspectionFromBelowImages: [],
    vehicleConditionImages: [],
    equipmentListAvailableImages: [],
    deliveryConfirmationAvailableImages: [],
    engineRunPerformedImages: [],
    environmentalBadgeImages: [],
    tireConfiguration: '2-axle',
    inspectionFromAbove: null,
    inspectionFromBelow: null,
    engineRunPerformed: '',
    engineRunStatus: '',
    engineRunNoise: '',
    engineRunRoughRunning: '',
    engineRunWarningLightsActive: '',
    engineRunWarningLightsDetails: '',
    engineRunOtherIssues: '',
    equipmentListAvailable: null,
    deliveryConfirmationAvailable: null,
    bodyPartDamages: {},
    minderwertRows: defaultMinderwertRows,
    systemMinderwertRows: [],
    damages: [],
    photos: [],
    signatures: { driver: '', inspector: '', receiver: '' },
    signatureNames: { driver: '', inspector: '', receiver: '' },
    expertAssessmentStatus: null,
    chargingCable: '',
    chargingCableImages: [],
    hasSecondTireSet: false,
    secondTires: [],
    secondTireSetSelection: 'Both',
    sendLogs: [],
    isAuthorizedPerson: false,
    authorizedPersonName: '',
    authorizedPersonPhoto: '',
    customerPresent: false,
    status: 'OPEN',
    omtSyncStatus: 'PENDING',
    fieldConfigs: [] as any[],
    versions: [],
    initialData: null,
    vehicleBaseValue: 0,
    priceCategory: '',
    depreciationMatrixFactor: 1,
    finalVehicleValue: 0,
};

interface ReportStore extends ReportData {
    totalRepairCostBrutto: () => number;
    totalMinderwertBrutto: () => number;
    totalMinderwertNetto: () => number;
    updateField: <K extends keyof ReportData>(key: K, value: ReportData[K]) => void;
    updateOrderInfo: (data: Partial<ReportData>) => void;
    updateVehicleData: (data: Partial<ReportData>) => void;
    updateCondition: (data: Partial<ReportData>) => void;
    setKarosseriestundensatz: (rate: number) => void;
    setLackstundensatz: (rate: number) => void;
    setLackberechnungsart: (art: LackberechnungsartType) => void;
    setVehicleCategory: (kat: VehicleCategoryType | null) => void;
    addDamage: (id?: string, type?: 'exterior' | 'interior' | 'manual', bodyPart?: string) => void;
    updateDamage: (id: string, data: Partial<DamageItem>) => void;
    handleDamagePhoto: (id: string, photo: string) => void;
    removeDamagePhoto: (id: string, photoIndex: number) => void;
    removeDamage: (id: string) => void;
    copyDamage: (id: string) => void;
    addPhoto: (photo: ReportPhoto) => void;
    removePhoto: (id: string) => void;
    updatePhoto: (id: string, data: Partial<ReportPhoto>) => void;
    movePhoto: (id: string, direction: 'left' | 'right') => void;
    reorderPhoto: (id: string, newIndex: number) => void;
    setBodyPartDamage: (partId: string, damage?: DamageType, repair?: RepairMethodType) => void;
    addPaintMeasurement: () => void;
    updatePaintMeasurement: (id: string, data: Partial<PaintMeasurement>) => void;
    removePaintMeasurement: (id: string) => void;
    updateTire: (index: number, data: Partial<TireInfo>) => void;
    updateTireConfiguration: (config: ReportData['tireConfiguration']) => void;
    updateSpareTire: (data: Partial<ReportData['spareTire']>) => void;
    updateSecondTire: (index: number, data: Partial<TireInfo>) => void;
    toggleSecondTireSet: (active: boolean) => void;
    updateMinderwertRow: (id: string, data: Partial<MinderwertRow>) => void;
    addCustomMinderwertRow: (id?: string) => void;
    removeMinderwertPhoto: (id: string, photoIndex: number) => void;
    removeMinderwertRow: (id: string) => void;
    copyFirstTireToAll: () => void;
    copyToNextTire: (index: number) => void;
    copySecondTireToNext: (index: number) => void;
    updateSignature: (role: keyof Signatures, data: string) => void;
    updateSignatureName: (role: keyof SignatureNames, name: string) => void;
    resetAll: () => void;
    setAllData: (data: Partial<ReportData>) => void;
    setGlobalConfig: (config: GlobalConfig) => void;
    fetchFieldConfigs: (customerNumber?: string) => Promise<void>;
    updateFieldConfig: (fieldName: string, required: boolean, stepNumber: number, customerNumber?: string) => Promise<void>;
    updatePhotoSlotConfigs: (slots: Array<{ id: string; label: string; required: boolean; sortOrder: number; isCustom?: boolean }>, customerNumber?: string) => Promise<void>;
    getPhotoSlots: () => Array<{ id: string; label: string }>;
    fetchAndApplyCustomerRates: (customerNumber: string) => Promise<boolean>;
    saveCurrentRatesAsCustomerDefault: (customerNumber: string) => Promise<boolean>;
    getStepValidationErrors: (step: number) => Record<string, string>;
    isStepValid: (step: number) => boolean;
    fetchGlobalConfig: () => Promise<void>;
    reSyncPhotosWithVideoXpert: () => Promise<boolean>;
    getEffectiveRepairTable: () => RepairTableEntry[];
    getEffectiveRepairPositions: () => RepairPosition[];
    getEffectiveRepairTypes: () => RepairType[];
    getEffectiveRepairSurcharges: () => Record<string, number>;
    recalculateVehicleValue: () => void;
    fieldConfigs: any[];
    globalConfig: GlobalConfig | null;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

const recalculateMinderwertAndDamages = (
    damages: DamageItem[],
    minderwertRows: MinderwertRow[],
    mileage: number,
    firstRegistration: string,
    vehicleCategory: VehicleCategoryType | null,
    globalConfig: GlobalConfig | null,
    karosseriestundensatz: number
) => {
    const updatedDamages = damages.map(d => {
        const updated = { ...d };
        const sparePartsBrutto = updated.sparePartsBrutto != null ? updated.sparePartsBrutto : Math.round(calcBrutto(updated.spareParts || 0) * 100) / 100;
        updated.sparePartsBrutto = sparePartsBrutto;
        const totalCostBrutto = (updated.repairCostBrutto || 0) + sparePartsBrutto;
        if (!updated.isManualMinderwert) {
            if (updated.anrechnung === 'voll') {
                updated.minderwertBrutto = totalCostBrutto;
            } else if (updated.anrechnung === 'anteilig' || updated.anrechnung === 'pro-rata') {
                const mwBrutto = calculateMinderwertProRata(
                    totalCostBrutto,
                    firstRegistration || '',
                    mileage || 0,
                    globalConfig
                );
                updated.minderwertBrutto = Math.min(Math.round(mwBrutto * 100) / 100, totalCostBrutto);
            }
        }
        updated.minderwertBrutto = Math.max(0, Math.min(updated.minderwertBrutto || 0, totalCostBrutto));
        updated.minderwertNetto = calcNetto(updated.minderwertBrutto);
        return updated;
    });

    const updatedMinderwertRows = minderwertRows.map(r => {
        let cost = r.repairCost;
        let repairCostBrutto = r.repairCostBrutto || 0;

        if (!r.isCustom && r.bodyPart) {
            const estCodeId = r.estimateRepairCodeId;
            const rCodeIndex = r.repairCodeIndex || 0;

            if (estCodeId) {
                let flatPriceGross = 0;
                if (globalConfig?.estimateConfig && vehicleCategory) {
                    flatPriceGross = lookupEstimatePrice(
                        globalConfig.estimateConfig,
                        r.bodyPart,
                        estCodeId,
                        vehicleCategory
                    );
                }
                cost = flatPriceGross / 1.19;
                repairCostBrutto = flatPriceGross;
            } else if (rCodeIndex > 0) {
                const codeInfo = getRepairCodeInfo(r.bodyPart, rCodeIndex);
                const estimateId = mapRepairCodeStringToEstimateId(codeInfo?.code);
                let foundEstimate = false;

                if (globalConfig?.estimateConfig && vehicleCategory && estimateId) {
                    const flatPriceGross = lookupEstimatePrice(
                        globalConfig.estimateConfig,
                        r.bodyPart,
                        estimateId,
                        vehicleCategory
                    );
                    if (flatPriceGross > 0) {
                        cost = flatPriceGross / 1.19;
                        repairCostBrutto = flatPriceGross;
                        foundEstimate = true;
                    }
                }

                if (!foundEstimate) {
                    cost = calculateRepairCostForPart(
                        r.bodyPart,
                        rCodeIndex,
                        vehicleCategory,
                        karosseriestundensatz,
                        globalConfig
                    );
                    repairCostBrutto = Math.round(calcBrutto(cost) * 100) / 100;
                }
            }
        }

        // Standard fallbacks if values are missing
        if (repairCostBrutto === 0 && cost > 0) {
            repairCostBrutto = Math.round(calcBrutto(cost) * 100) / 100;
        } else if (cost === 0 && repairCostBrutto > 0) {
            cost = calcNetto(repairCostBrutto);
        }

        const sparePartsBrutto = Math.round(calcBrutto(r.spareParts || 0) * 100) / 100;
        const totalCostNetto = cost + (r.spareParts || 0);
        const totalCostBrutto = repairCostBrutto + sparePartsBrutto;
        let mb = r.minderwertBrutto || 0;
        if (!r.isManualMinderwert) {
            if (r.anrechnung === 'voll') {
                mb = totalCostBrutto;
            } else if (r.anrechnung === 'anteilig' || r.anrechnung === 'pro-rata') {
                const mwNetto = calculateMinderwertProRata(
                    totalCostNetto,
                    firstRegistration || '',
                    mileage || 0,
                    globalConfig
                );
                mb = Math.min(Math.round(calcBrutto(mwNetto) * 100) / 100, totalCostBrutto);
            } else {
                mb = 0;
            }
        }

        mb = Math.max(0, Math.min(mb, totalCostBrutto));

        return {
            ...r,
            repairCost: Math.round(cost * 100) / 100,
            repairCostBrutto,
            sparePartsBrutto,
            minderwertBrutto: mb,
            minderwertNetto: calcNetto(mb)
        };
    });

    return {
        damages: updatedDamages,
        minderwertRows: updatedMinderwertRows
    };
};

const reportStoreCreator: StateCreator<ReportStore> = (set, get) => ({
            ...initialState,
            globalConfig: initialState.globalConfig ?? null,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            totalRepairCostBrutto: () => {
                if (get().claimType === 'Fahrzeugbewertung') return 0;
                let equipmentDepreciation = 0;
                const s = get();
                const config = s.globalConfig;

                if (!config) return 0;

                const ep = config.equipmentPrices || {};

                // Breakdown Kit
                if (s.breakdownKit?.price) {
                    equipmentDepreciation += s.breakdownKit.price;
                } else if (s.breakdownKit?.status === 'Not available') {
                    equipmentDepreciation += ep['breakdown_kit_missing'] ?? ep['breakdownKit_missing'] ?? 50;
                } else if (s.breakdownKit?.status === 'Available' && s.breakdownKit.expirationDate) {
                    const exp = new Date(s.breakdownKit.expirationDate);
                    const now = new Date();
                    if (exp < now) equipmentDepreciation += ep['breakdown_kit_expired'] ?? ep['breakdownKit_expired'] ?? 30;
                }

                // First Aid Kit
                if (s.firstAidKit?.price) {
                    equipmentDepreciation += s.firstAidKit.price;
                } else if (s.firstAidKit?.status === 'Not available') {
                    equipmentDepreciation += ep['first_aid_kit_missing'] ?? ep['firstAidKit_missing'] ?? 25;
                } else if (s.firstAidKit?.status === 'Available' && s.firstAidKit.expirationDate) {
                    const exp = new Date(s.firstAidKit.expirationDate);
                    const now = new Date();
                    if (exp < now) equipmentDepreciation += ep['first_aid_kit_expired'] ?? ep['firstAidKit_expired'] ?? 20;
                }

                // Safety Vest
                if (s.safetyVest?.price) {
                    equipmentDepreciation += s.safetyVest.price;
                } else if (s.safetyVest?.status === 'Not available') {
                    equipmentDepreciation += ep['safety_vest_missing'] ?? ep['safetyVest_missing'] ?? 10;
                }

                // Warning Triangle
                if (s.warningTriangle?.price) {
                    equipmentDepreciation += s.warningTriangle.price;
                } else if (s.warningTriangle?.status === 'Not available') {
                    equipmentDepreciation += ep['warning_triangle_missing'] ?? ep['warningTriangle_missing'] ?? 15;
                }

                let maintenanceDepreciation = s.maintenancePrice || 0;
                const mr = config.maintenanceRules || {};

                // Handle new flexible maintenance types
                if (s.nextMaintenanceType === 'mileage' && s.nextMaintenanceIntervalValue !== null) {
                    if (s.nextMaintenanceIntervalValue < 0) {
                        maintenanceDepreciation += Math.abs(s.nextMaintenanceIntervalValue) * (mr['overdueKmFactor'] ?? 0.05);
                    }
                } else if (s.nextMaintenanceType === 'days' && s.nextMaintenanceIntervalValue !== null) {
                    if (s.nextMaintenanceIntervalValue < 0) {
                        maintenanceDepreciation += Math.abs(s.nextMaintenanceIntervalValue) * (mr['overdueDayFactor'] ?? 1);
                    }
                } else if (s.nextMaintenanceType === 'months' && s.nextMaintenanceIntervalValue !== null) {
                    if (s.nextMaintenanceIntervalValue < 0) {
                        maintenanceDepreciation += Math.abs(s.nextMaintenanceIntervalValue) * 30 * (mr['overdueDayFactor'] ?? 1);
                    }
                } else {
                    // Fallback to legacy date/mileage fields if type is 'date' or not set
                    if (s.nextMaintenanceMileage && s.mileage && s.nextMaintenanceMileage < s.mileage) {
                        maintenanceDepreciation += (s.mileage - s.nextMaintenanceMileage) * (mr['overdueKmFactor'] ?? 0.05);
                    }
                    if (s.nextMaintenanceDate) {
                        const nextDate = new Date(s.nextMaintenanceDate);
                        const now = new Date();
                        if (nextDate < now) {
                            const daysOverdue = Math.floor((now.getTime() - nextDate.getTime()) / (1000 * 3600 * 24));
                            maintenanceDepreciation += daysOverdue * (mr['overdueDayFactor'] ?? 1);
                        }
                    }
                }

                let paintDepreciation = 0;
                if (!s.noPaintIssuesDetected && s.paintMeasurements) {
                    paintDepreciation = s.paintMeasurements
                        .filter(p => p.damageUnknown)
                        .reduce((acc, p) => acc + (p.depreciationValue || 0), 0);
                }

                let tireDepreciation = 0;
                if (s.tires) {
                    tireDepreciation += s.tires.reduce((acc, t) => acc + (t.depreciationValue || 0) + (t.hubCapDepreciation || 0), 0);
                }
                if (s.spareTire && s.spareTire.present) {
                    tireDepreciation += (s.spareTire.depreciationValue || 0) + (s.spareTire.hubCapDepreciation || 0);
                }
                if (s.hasSecondTireSet && s.secondTires) {
                    tireDepreciation += s.secondTires.reduce((acc, t) => acc + (t.depreciationValue || 0) + (t.hubCapDepreciation || 0), 0);
                }

                const damages = get().damages;
                const rows = get().minderwertRows;
                const systemRows = get().systemMinderwertRows || [];
                const surcharges = get().getEffectiveRepairSurcharges();

                const damagesRC = damages.filter(d => d.anrechnung !== 'informational').reduce((sum, d) => sum + (d.repairCostBrutto || 0) + (
                    d.sparePartsBrutto != null ? d.sparePartsBrutto : Math.round(calcBrutto(d.spareParts || 0) * 100) / 100
                ), 0);
                const rowsRC = rows.filter(r => r.anrechnung !== 'informational').reduce((sum, r) => sum + (
                    r.repairCostBrutto != null ? r.repairCostBrutto : Math.round(calcBrutto(r.repairCost) * 100) / 100
                ) + (
                    r.sparePartsBrutto != null ? r.sparePartsBrutto : Math.round(calcBrutto(r.spareParts || 0) * 100) / 100
                ), 0);
                const sysDevalsRC = systemRows.filter(r => r.anrechnung !== 'informational' && !r.id?.startsWith('sys-equip-')).reduce((sum, r) => sum + (
                    r.repairCostBrutto != null ? r.repairCostBrutto : Math.round(calcBrutto(r.repairCost || 0) * 100) / 100
                ) + (
                    r.sparePartsBrutto != null ? r.sparePartsBrutto : Math.round(calcBrutto(r.spareParts || 0) * 100) / 100
                ), 0);

                const autoRows = getAutomaticDevaluations(get());
                const autoRC = autoRows.filter(r => r.anrechnung !== 'informational').reduce((sum, r) => sum + (
                    r.repairCostBrutto != null ? r.repairCostBrutto : Math.round(calcBrutto(r.repairCost || 0) * 100) / 100
                ), 0);

                // Find unique repair types used in damages AND rows AND systemRows AND autoRows
                const usedTypes = new Set<string>();
                damages.forEach(d => { if (d.repairType && d.anrechnung !== 'informational') usedTypes.add(d.repairType); });
                rows.forEach(r => { if (r.repairType && r.anrechnung !== 'informational') usedTypes.add(r.repairType); });
                systemRows.forEach(r => { if (r.repairType && r.anrechnung !== 'informational') usedTypes.add(r.repairType); });
                autoRows.forEach(r => { if (r.repairType && r.anrechnung !== 'informational') usedTypes.add(r.repairType); });

                // Add surcharge for each unique type (applied once per type)
                let surchargeTotal = 0;
                usedTypes.forEach(type => {
                    const surcharge = surcharges[type] || 0;
                    surchargeTotal += surcharge;
                });

                return Math.round((
                    damagesRC
                    + rowsRC
                    + sysDevalsRC
                    + autoRC
                    + equipmentDepreciation
                    + maintenanceDepreciation
                    + paintDepreciation
                    + tireDepreciation
                    + surchargeTotal
                ) * 100) / 100;
            },
            totalMinderwertBrutto: () => {
                if (get().claimType === 'Fahrzeugbewertung') return 0;
                let equipmentDepreciation = 0;
                const s = get();
                const config = s.globalConfig;

                if (!config) return 0;

                const ep = config.equipmentPrices || {};

                // Breakdown Kit
                if (s.breakdownKit?.price) {
                    equipmentDepreciation += s.breakdownKit.price;
                } else if (s.breakdownKit?.status === 'Not available') {
                    equipmentDepreciation += ep['breakdown_kit_missing'] ?? ep['breakdownKit_missing'] ?? 50;
                } else if (s.breakdownKit?.status === 'Available' && s.breakdownKit.expirationDate) {
                    const exp = new Date(s.breakdownKit.expirationDate);
                    const now = new Date();
                    if (exp < now) equipmentDepreciation += ep['breakdown_kit_expired'] ?? ep['breakdownKit_expired'] ?? 30;
                }

                // First Aid Kit
                if (s.firstAidKit?.price) {
                    equipmentDepreciation += s.firstAidKit.price;
                } else if (s.firstAidKit?.status === 'Not available') {
                    equipmentDepreciation += ep['first_aid_kit_missing'] ?? ep['firstAidKit_missing'] ?? 25;
                } else if (s.firstAidKit?.status === 'Available' && s.firstAidKit.expirationDate) {
                    const exp = new Date(s.firstAidKit.expirationDate);
                    const now = new Date();
                    if (exp < now) equipmentDepreciation += ep['first_aid_kit_expired'] ?? ep['firstAidKit_expired'] ?? 20;
                }

                // Safety Vest
                if (s.safetyVest?.price) {
                    equipmentDepreciation += s.safetyVest.price;
                } else if (s.safetyVest?.status === 'Not available') {
                    equipmentDepreciation += ep['safety_vest_missing'] ?? ep['safetyVest_missing'] ?? 10;
                }

                // Warning Triangle
                if (s.warningTriangle?.price) {
                    equipmentDepreciation += s.warningTriangle.price;
                } else if (s.warningTriangle?.status === 'Not available') {
                    equipmentDepreciation += ep['warning_triangle_missing'] ?? ep['warningTriangle_missing'] ?? 15;
                }

                let maintenanceDepreciation = s.maintenancePrice || 0;
                const mr = config.maintenanceRules || {};

                // Handle new flexible maintenance types
                if (s.nextMaintenanceType === 'mileage' && s.nextMaintenanceIntervalValue !== null) {
                    if (s.nextMaintenanceIntervalValue < 0) {
                        maintenanceDepreciation += Math.abs(s.nextMaintenanceIntervalValue) * (mr['overdueKmFactor'] ?? 0.05);
                    }
                } else if (s.nextMaintenanceType === 'days' && s.nextMaintenanceIntervalValue !== null) {
                    if (s.nextMaintenanceIntervalValue < 0) {
                        maintenanceDepreciation += Math.abs(s.nextMaintenanceIntervalValue) * (mr['overdueDayFactor'] ?? 1);
                    }
                } else if (s.nextMaintenanceType === 'months' && s.nextMaintenanceIntervalValue !== null) {
                    if (s.nextMaintenanceIntervalValue < 0) {
                        maintenanceDepreciation += Math.abs(s.nextMaintenanceIntervalValue) * 30 * (mr['overdueDayFactor'] ?? 1);
                    }
                } else {
                    // Fallback to legacy date/mileage fields if type is 'date' or not set
                    if (s.nextMaintenanceMileage && s.mileage && s.nextMaintenanceMileage < s.mileage) {
                        maintenanceDepreciation += (s.mileage - s.nextMaintenanceMileage) * (mr['overdueKmFactor'] ?? 0.05);
                    }
                    if (s.nextMaintenanceDate) {
                        const nextDate = new Date(s.nextMaintenanceDate);
                        const now = new Date();
                        if (nextDate < now) {
                            const daysOverdue = Math.floor((now.getTime() - nextDate.getTime()) / (1000 * 3600 * 24));
                            maintenanceDepreciation += daysOverdue * (mr['overdueDayFactor'] ?? 1);
                        }
                    }
                }

                let paintDepreciation = 0;
                if (!s.noPaintIssuesDetected && s.paintMeasurements) {
                    paintDepreciation = s.paintMeasurements
                        .filter(p => p.damageUnknown)
                        .reduce((acc, p) => acc + (p.depreciationValue || 0), 0);
                }

                let tireDepreciation = 0;
                if (s.tires) {
                    tireDepreciation += s.tires.reduce((acc, t) => acc + (t.depreciationValue || 0) + (t.hubCapDepreciation || 0), 0);
                }
                if (s.spareTire && s.spareTire.present) {
                    tireDepreciation += (s.spareTire.depreciationValue || 0) + (s.spareTire.hubCapDepreciation || 0);
                }
                if (s.hasSecondTireSet && s.secondTires) {
                    tireDepreciation += s.secondTires.reduce((acc, t) => acc + (t.depreciationValue || 0) + (t.hubCapDepreciation || 0), 0);
                }

                const damages = get().damages;
                const rows = get().minderwertRows;
                const systemRows = get().systemMinderwertRows || [];
                const surcharges = get().getEffectiveRepairSurcharges();

                const damagesMW = damages.filter(d => d.anrechnung !== 'informational').reduce((sum, d) => sum + (d.minderwertBrutto || 0), 0);
                const rowsMW = rows.filter(r => r.anrechnung !== 'informational').reduce((sum, r) => sum + (r.minderwertBrutto || 0), 0);
                const sysDevalsMW = systemRows.filter(r => r.anrechnung !== 'informational' && !r.id?.startsWith('sys-equip-')).reduce((sum, r) => sum + (r.minderwertBrutto || 0), 0);

                const autoRows = getAutomaticDevaluations(get());
                const autoMW = autoRows.filter(r => r.anrechnung !== 'informational').reduce((sum, r) => sum + (r.minderwertBrutto || 0), 0);

                // Find unique repair types used in damages AND rows AND systemRows AND autoRows
                const usedTypes = new Set<string>();
                damages.forEach(d => { if (d.repairType && d.anrechnung !== 'informational') usedTypes.add(d.repairType); });
                rows.forEach(r => { if (r.repairType && r.anrechnung !== 'informational') usedTypes.add(r.repairType); });
                systemRows.forEach(r => { if (r.repairType && r.anrechnung !== 'informational') usedTypes.add(r.repairType); });
                autoRows.forEach(r => { if (r.repairType && r.anrechnung !== 'informational') usedTypes.add(r.repairType); });

                // Add surcharge for each unique type (applied once per type)
                let surchargeTotal = 0;
                usedTypes.forEach(type => {
                    const surcharge = surcharges[type] || 0;
                    surchargeTotal += surcharge;
                });

                return Math.round((
                    damagesMW
                    + rowsMW
                    + sysDevalsMW
                    + autoMW
                    + equipmentDepreciation
                    + maintenanceDepreciation
                    + paintDepreciation
                    + tireDepreciation
                    + surchargeTotal
                ) * 100) / 100;
            },
            totalMinderwertNetto: () => calcNetto(get().totalMinderwertBrutto()),

            updateField: (key, value) => {
                set({ [key]: value } as Partial<ReportData>);

                // When interval type or value changes, sync to legacy fields so the backend always gets concrete values
                if (key === 'nextMaintenanceIntervalValue' || key === 'nextMaintenanceType') {
                    const s = get();
                    // Use the just-set value for the changed key, otherwise current state
                    const type = (key === 'nextMaintenanceType' ? value : s.nextMaintenanceType) as string;
                    const val = (key === 'nextMaintenanceIntervalValue' ? value : s.nextMaintenanceIntervalValue) as number | null;

                    if (type === 'mileage') {
                        if (val !== null && val !== undefined) {
                            const currentMileage = s.mileage || 0;
                            set({ nextMaintenanceMileage: currentMileage + val, nextMaintenanceDate: '' });
                        } else {
                            set({ nextMaintenanceMileage: 0 });
                        }
                    } else if (type === 'days') {
                        if (val !== null && val !== undefined) {
                            const d = new Date();
                            d.setDate(d.getDate() + val);
                            set({ nextMaintenanceDate: d.toISOString().split('T')[0], nextMaintenanceMileage: 0 });
                        } else {
                            set({ nextMaintenanceDate: '' });
                        }
                    } else if (type === 'months') {
                        if (val !== null && val !== undefined) {
                            const d = new Date();
                            d.setMonth(d.getMonth() + val);
                            set({ nextMaintenanceDate: d.toISOString().split('T')[0], nextMaintenanceMileage: 0 });
                        } else {
                            set({ nextMaintenanceDate: '' });
                        }
                    } else if (type === 'date') {
                        // Switching back to date mode — clear interval-derived values
                        set({ nextMaintenanceMileage: 0, nextMaintenanceIntervalValue: null });
                    }
                }

                if (key === 'mileage') {
                    const s = get();
                    if (s.nextMaintenanceType === 'mileage' && s.nextMaintenanceIntervalValue !== null) {
                        set({ nextMaintenanceMileage: (value as number) + s.nextMaintenanceIntervalValue });
                    }
                }

                const reCalcFields = ['vehicleBaseValue', 'priceCategory', 'mileage', 'firstRegistration', 'bodyType'];
                if (reCalcFields.includes(key as string)) {
                    get().recalculateVehicleValue();
                }

                if (key === 'mileage' || key === 'firstRegistration') {
                    const s = get();
                    const { damages, minderwertRows } = recalculateMinderwertAndDamages(
                        s.damages,
                        s.minderwertRows,
                        s.mileage,
                        s.firstRegistration,
                        s.vehicleCategory,
                        s.globalConfig,
                        s.karosseriestundensatz
                    );
                    set({ damages, minderwertRows });
                }
            },
            updateOrderInfo: (data) => {
                set(data);
                get().recalculateVehicleValue();
            },
            updateVehicleData: (data) => {
                set(data);
                get().recalculateVehicleValue();

                const s = get();
                const { damages, minderwertRows } = recalculateMinderwertAndDamages(
                    s.damages,
                    s.minderwertRows,
                    s.mileage,
                    s.firstRegistration,
                    s.vehicleCategory,
                    s.globalConfig,
                    s.karosseriestundensatz
                );
                set({ damages, minderwertRows });
            },
            updateCondition: (data) => {
                set(data);
                get().recalculateVehicleValue();
            },

            setKarosseriestundensatz: (rate) => set({
                karosseriestundensatz: rate,
                lackstundensatz: calcLackstundensatz(rate),
            }),

            setLackstundensatz: (rate: number) => set({
                lackstundensatz: rate,
            }),

            setLackberechnungsart: (art) => set({ lackberechnungsart: art }),
            setVehicleCategory: (kat) => set(state => {
                const { damages, minderwertRows } = recalculateMinderwertAndDamages(
                    state.damages,
                    state.minderwertRows,
                    state.mileage,
                    state.firstRegistration || '',
                    kat,
                    state.globalConfig,
                    state.karosseriestundensatz
                );
                return {
                    vehicleCategory: kat,
                    damages,
                    minderwertRows
                };
            }),

            addDamage: (id?: string, type: 'exterior' | 'interior' | 'manual' = 'exterior', bodyPart: string = '') => set(state => ({
                damages: [...state.damages, {
                    id: id || uuidv4(),
                    type,
                    bodyPart,
                    description: '',
                    repairMethod: '',
                    repairCostBrutto: 0,
                    anrechnung: 'voll',
                    minderwertBrutto: 0,
                    minderwertNetto: 0,
                    imageRef: '',
                    spareParts: 0,
                    sparePartsBrutto: 0,
                    reparaturweg: 'Karosserie' as const,
                    repairCodeIndex: 0,
                    presetType: 1,
                    images: [],
                    repairType: '',
                    estimateRepairCodeId: '',
                }],
            })),

            updateDamage: (id, data) => set(state => {
                const vc = state.vehicleCategory;
                console.log("🚀 ~ id, data:", id, data)
                console.log("🚀 ~ state.damages:", state.damages)
                const updatedDamages = state.damages.map(d => {
                    if (d.id !== id) return d;
                    const updated = { ...d, ...data };
                    const sparePartsBrutto = Math.round(calcBrutto(updated.spareParts || 0) * 100) / 100;
                    updated.sparePartsBrutto = sparePartsBrutto;
                    const totalCostBrutto = (updated.repairCostBrutto || 0) + sparePartsBrutto;

                    // Re-calculate Minderwert based on anrechnung and presetType
                    if (data.minderwertBrutto !== undefined && (data.isManualMinderwert || data.isManualMinderwert === undefined)) {
                        updated.minderwertBrutto = Math.max(0, Math.min(data.minderwertBrutto, totalCostBrutto));
                        updated.isManualMinderwert = true;
                    } else {
                        if (data.repairCostBrutto !== undefined || data.spareParts !== undefined || data.anrechnung !== undefined || data.presetType !== undefined) {
                            updated.isManualMinderwert = false;
                        }

                        if (!updated.isManualMinderwert) {
                            if (updated.anrechnung === 'voll') {
                                updated.minderwertBrutto = totalCostBrutto;
                            } else if (updated.anrechnung === 'anteilig' || updated.anrechnung === 'pro-rata') {
                                // totalCostBrutto is already gross — factor is applied directly
                                const mwBrutto = calculateMinderwertProRata(
                                    totalCostBrutto,
                                    state.firstRegistration || '',
                                    state.mileage || 0,
                                    state.globalConfig
                                );
                                updated.minderwertBrutto = Math.min(Math.round(mwBrutto * 100) / 100, totalCostBrutto);
                            } else if (updated.anrechnung === 'keine') {
                                updated.minderwertBrutto = 0;
                            } else { // 'kein'
                                updated.minderwertBrutto = 0;
                            }
                        }
                    }
                    updated.minderwertBrutto = Math.max(0, Math.min(updated.minderwertBrutto || 0, totalCostBrutto));
                    updated.minderwertNetto = calcNetto(updated.minderwertBrutto);
                    return updated;
                });

                return {
                    damages: updatedDamages
                };
            }),

            handleDamagePhoto: (id: string, photo: string) => set(state => {
                const damage = state.damages.find(d => d.id === id);
                const bodyPartLabel = damage ? damage.bodyPart : 'Damage';
                const autoLabel = damage
                    ? `${bodyPartLabel}${damage.description ? `: ${damage.description}` : ''}`
                    : 'Damage Photo';

                const newPhoto = {
                    id: uuidv4(),
                    data: photo,
                    label: autoLabel,
                    fileName: `damage_${id}_${Date.now()}.jpg`,
                    damageId: id
                };

                const updatedDamages = state.damages.map(d =>
                    d.id === id ? { ...d, images: [...(d.images || []), photo] } : d
                );
                return {
                    damages: updatedDamages,
                    photos: [...state.photos, newPhoto]
                };
            }),

            removeDamagePhoto: (id: string, photoIndex: number) => set(state => {
                const damage = state.damages.find(d => d.id === id);
                if (!damage || !damage.images || photoIndex < 0 || photoIndex >= damage.images.length) return state;

                const base64Data = damage.images[photoIndex];
                const updatedDamages = state.damages.map(d => {
                    if (d.id !== id) return d;
                    const newImages = [...(d.images || [])];
                    newImages.splice(photoIndex, 1);
                    return { ...d, images: newImages };
                });

                let removedOne = false;
                const updatedPhotos = state.photos.filter(p => {
                    if (p.damageId === id && p.data === base64Data && !removedOne) {
                        removedOne = true;
                        return false;
                    }
                    return true;
                });

                return {
                    damages: updatedDamages,
                    photos: updatedPhotos
                };
            }),

            removeDamage: (id) => set(state => ({
                damages: state.damages.filter(d => d.id !== id),
                photos: state.photos.filter(p => p.damageId !== id),
            })),

            copyDamage: (id) => set(state => {
                const damageToCopy = state.damages.find(d => d.id === id);
                if (!damageToCopy) return state;

                const newDamage = {
                    ...damageToCopy,
                    id: uuidv4()
                };

                const index = state.damages.findIndex(d => d.id === id);
                const newDamages = [...state.damages];
                newDamages.splice(index + 1, 0, newDamage);

                // Copy photos as well if they exist for this damage
                const photosToCopy = state.photos.filter(p => p.damageId === id);
                const newPhotos = photosToCopy.map(p => ({
                    ...p,
                    id: uuidv4(),
                    damageId: newDamage.id
                }));

                return {
                    damages: newDamages,
                    photos: [...state.photos, ...newPhotos]
                };
            }),

            addPhoto: (photo) => set(state => {
                let updatedDamages = state.damages;
                if (photo.damageId) {
                    updatedDamages = state.damages.map(d =>
                        d.id === photo.damageId ? { ...d, images: [...(d.images || []), photo.data] } : d
                    );
                }
                return {
                    photos: [...state.photos, photo],
                    damages: updatedDamages
                };
            }),

            removePhoto: (id) => set(state => {
                const photoToRemove = state.photos.find(p => p.id === id);
                let updatedDamages = state.damages;
                if (photoToRemove && photoToRemove.damageId) {
                    updatedDamages = state.damages.map(d => {
                        if (d.id !== photoToRemove.damageId) return d;
                        return {
                            ...d,
                            images: (d.images || []).filter(img => img !== photoToRemove.data)
                        };
                    });
                }
                return {
                    photos: state.photos.filter(p => p.id !== id),
                    damages: updatedDamages
                };
            }),

            updatePhoto: (id, data) => set(state => {
                const oldPhoto = state.photos.find(p => p.id === id);
                const updatedPhotos = state.photos.map(p => p.id === id ? { ...p, ...data } : p);

                let updatedDamages = state.damages;
                if (oldPhoto && oldPhoto.damageId && data.data) {
                    updatedDamages = state.damages.map(d => {
                        if (d.id !== oldPhoto.damageId) return d;
                        return {
                            ...d,
                            images: (d.images || []).map(img => img === oldPhoto.data ? data.data! : img)
                        };
                    });
                }
                return {
                    photos: updatedPhotos,
                    damages: updatedDamages
                };
            }),

            movePhoto: (id, direction) => set(state => {
                const index = state.photos.findIndex(p => p.id === id);
                if (index === -1) return state;

                const newPhotos = [...state.photos];
                const newIndex = direction === 'left' ? index - 1 : index + 1;

                if (newIndex >= 0 && newIndex < newPhotos.length) {
                    [newPhotos[index], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[index]];
                }

                return { photos: newPhotos };
            }),

            reorderPhoto: (id, newIndex) => set(state => {
                const oldIndex = state.photos.findIndex(p => p.id === id);
                if (oldIndex === -1) return state;

                const newPhotos = [...state.photos];
                const [photo] = newPhotos.splice(oldIndex, 1);
                newPhotos.splice(newIndex, 0, photo);

                return { photos: newPhotos };
            }),

            setBodyPartDamage: (partId, damage, repair) => set(state => {
                const current = state.bodyPartDamages[partId] || { damage: '', repair: '' };
                return {
                    bodyPartDamages: {
                        ...state.bodyPartDamages,
                        [partId]: {
                            damage: damage !== undefined ? damage : current.damage,
                            repair: repair !== undefined ? repair : current.repair,
                        }
                    },
                };
            }),

            addPaintMeasurement: () => set(state => ({
                paintMeasurements: [...state.paintMeasurements, {
                    id: uuidv4(), bodyPart: '', measuredMicrons: 0, damageKnown: false, damageUnknown: false, repairDamage: '', depreciationValue: 0, images: []
                }],
            })),

            updatePaintMeasurement: (id, data) => set(state => ({
                paintMeasurements: state.paintMeasurements.map(p =>
                    p.id === id ? { ...p, ...data } : p
                ),
            })),

            removePaintMeasurement: (id) => set(state => ({
                paintMeasurements: state.paintMeasurements.filter(p => p.id !== id),
            })),

            updateTire: (index, data) => set(state => {
                const newTires = [...state.tires];
                newTires[index] = { ...newTires[index], ...data };
                return { tires: newTires };
            }),

            updateTireConfiguration: (config) => set(state => {
                let newTires: TireInfo[] = [];
                const baseTire: TireInfo = { axle: 1, side: 'links', designation: '', manufacturer: '', tireModel: '', type: 'S', treadDepth: '', dotNumber: '', images: [] };

                switch (config) {
                    case '2-axle':
                        newTires = [
                            { ...baseTire, axle: 1, side: 'links' },
                            { ...baseTire, axle: 1, side: 'rechts' },
                            { ...baseTire, axle: 2, side: 'rechts' },
                            { ...baseTire, axle: 2, side: 'links' }
                        ];
                        break;
                    case '3-axle':
                        newTires = [
                            { ...baseTire, axle: 1, side: 'links' },
                            { ...baseTire, axle: 1, side: 'rechts' },
                            { ...baseTire, axle: 2, side: 'rechts' },
                            { ...baseTire, axle: 3, side: 'rechts' },
                            { ...baseTire, axle: 3, side: 'links' },
                            { ...baseTire, axle: 2, side: 'links' }
                        ];
                        break;
                    case '2-axle-twin':
                        newTires = [
                            { ...baseTire, axle: 1, side: 'links' },
                            { ...baseTire, axle: 1, side: 'rechts' },
                            { ...baseTire, axle: 2, side: 'rechts' }, // Outer
                            { ...baseTire, axle: 2, side: 'rechts' }, // Inner
                            { ...baseTire, axle: 2, side: 'links' },  // Inner
                            { ...baseTire, axle: 2, side: 'links' }   // Outer
                        ];
                        break;
                    case '3-axle-twin':
                        newTires = [
                            { ...baseTire, axle: 1, side: 'links' },
                            { ...baseTire, axle: 1, side: 'rechts' },
                            { ...baseTire, axle: 2, side: 'rechts' },
                            { ...baseTire, axle: 2, side: 'rechts' },
                            { ...baseTire, axle: 3, side: 'rechts' },
                            { ...baseTire, axle: 3, side: 'rechts' },
                            { ...baseTire, axle: 3, side: 'links' },
                            { ...baseTire, axle: 3, side: 'links' },
                            { ...baseTire, axle: 2, side: 'links' },
                            { ...baseTire, axle: 2, side: 'links' }
                        ];
                        break;
                }

                // Preserve existing tire data by matching on axle + side
                // (index-based merge would corrupt data when the old order differs from the new order)
                newTires = newTires.map(slot => {
                    const match = state.tires.find(old => old.axle === slot.axle && old.side === slot.side);
                    return match ? { ...slot, ...match } : slot;
                });

                return { tireConfiguration: config, tires: newTires };
            }),
            updateSpareTire: (data) => set(state => ({
                spareTire: { ...state.spareTire, ...data }
            })),
            updateSecondTire: (index, data) => set(state => {
                const newTires = [...state.secondTires];
                newTires[index] = { ...newTires[index], ...data };
                return { secondTires: newTires };
            }),
            toggleSecondTireSet: (active) => set(state => {
                if (active && state.secondTires.length === 0) {
                    // Initialize with 4 tires as a standard set
                    const baseTire: TireInfo = { axle: 1, side: 'links', designation: '', manufacturer: '', tireModel: '', type: 'S', treadDepth: '', dotNumber: '', images: [], depreciationValue: 0, damaged: false };
                    return {
                        hasSecondTireSet: true,
                        secondTires: [
                            { ...baseTire, axle: 1, side: 'links' },
                            { ...baseTire, axle: 1, side: 'rechts' },
                            { ...baseTire, axle: 2, side: 'rechts' },
                            { ...baseTire, axle: 2, side: 'links' }
                        ]
                    };
                }
                return { hasSecondTireSet: active };
            }),

            copyToNextTire: (index: number) => set(state => {
                const source = state.tires[index];
                if (!source || state.tires.length === 0) return state;

                // Wrap-around to the first tire if index is the last one
                const targetIndex = (index + 1) % state.tires.length;

                const newTires = [...state.tires];
                newTires[targetIndex] = {
                    ...newTires[targetIndex],
                    designation: source.designation,
                    manufacturer: source.manufacturer,
                    tireModel: source.tireModel,
                    type: source.type,
                    treadDepth: source.treadDepth,
                    dotNumber: source.dotNumber,
                    rimType: source.rimType,
                    rimDamage: [], // Rim damage is wheel-specific and not copied
                    damaged: source.damaged,
                    // depreciationValue is NOT copied (Requirement: independent depreciation)
                    // axle and side are preserved from the target tire
                    // images are NOT copied as they are specific to each tire
                };

                return { tires: newTires };
            }),

            copySecondTireToNext: (index: number) => set(state => {
                if (state.secondTires.length === 0) return state;
                const source = state.secondTires[index];
                if (!source) return state;

                // Wrap-around to the first tire if index is the last one
                const targetIndex = (index + 1) % state.secondTires.length;

                const newTires = [...state.secondTires];
                newTires[targetIndex] = {
                    ...newTires[targetIndex],
                    designation: source.designation,
                    manufacturer: source.manufacturer,
                    tireModel: source.tireModel,
                    type: source.type,
                    treadDepth: source.treadDepth,
                    dotNumber: source.dotNumber,
                    rimType: source.rimType,
                    rimDamage: [], // Rim damage is wheel-specific and not copied
                    damaged: source.damaged,
                    // depreciationValue is NOT copied (Requirement: independent depreciation)
                };
                return { secondTires: newTires };
            }),

            copyFirstTireToAll: () => set(state => {
                if (state.tires.length === 0) return state;
                const first = state.tires[0];
                return {
                    tires: state.tires.map(t => ({
                        ...t,
                        designation: first.designation,
                        manufacturer: first.manufacturer,
                        tireModel: first.tireModel,
                        type: first.type,
                        treadDepth: first.treadDepth,
                        dotNumber: first.dotNumber,
                        rimType: first.rimType,
                        rimDamage: [], // Rim damage is wheel-specific and not copied
                        damaged: first.damaged,
                        // depreciationValue is NOT copied (Requirement: independent depreciation)
                        // Do not copy images to all
                    }))
                };
            }),

            updateMinderwertRow: (id, data) => set(state => {
                const vc = state.vehicleCategory;
                let enrichedData = { ...data };
                const currentRow = state.minderwertRows.find(r => r.id === id);
                if (currentRow && ('repairCodeIndex' in data || 'estimateRepairCodeId' in data) && !currentRow.isCustom && currentRow.bodyPart) {
                    const rCodeIndex = data.repairCodeIndex !== undefined ? data.repairCodeIndex : ('repairCodeIndex' in data ? 0 : currentRow.repairCodeIndex);
                    const estCodeId = data.estimateRepairCodeId !== undefined ? data.estimateRepairCodeId : ('estimateRepairCodeId' in data ? undefined : currentRow.estimateRepairCodeId);

                    if (estCodeId) {
                        // Custom or mapped estimate repair code
                        let cost = 0;
                        let costBrutto = 0;
                        if (state.claimType !== 'Fahrzeugbewertung' && state.globalConfig?.estimateConfig && vc) {
                            const flatPriceGross = lookupEstimatePrice(
                                state.globalConfig.estimateConfig,
                                currentRow.bodyPart,
                                estCodeId,
                                vc
                            );
                            if (flatPriceGross > 0) {
                                cost = flatPriceGross / 1.19;
                                costBrutto = flatPriceGross;
                            }
                        }

                        // Set standard values for custom code label
                        const customCodeObj = state.globalConfig?.estimateConfig?.customRepairCodes?.find(c => c.id === estCodeId);
                        const labelDe = customCodeObj?.labelDe || estCodeId;

                        enrichedData = {
                            ...enrichedData,
                            repairCost: Math.round(cost * 100) / 100,
                            repairCostBrutto: costBrutto,
                            damage: (data.damage ?? currentRow.damage ?? 'zerkratzt') as DamageType,
                            repairMethod: (labelDe) as any, // Store custom label in repairMethod
                            repairCodeIndex: 0, // clear standard index
                            estimateRepairCodeId: estCodeId
                        };
                    } else if (rCodeIndex > 0) {
                        const descs = getDescriptionsFromCode(currentRow.bodyPart, rCodeIndex);
                        const codeInfo = getRepairCodeInfo(currentRow.bodyPart, rCodeIndex);
                        let cost = 0;
                        let costBrutto = 0;
                        let foundEstimate = false;
                        let matchedEstId = undefined;

                        if (state.claimType !== 'Fahrzeugbewertung' && state.globalConfig?.estimateConfig && vc) {
                            const estimateId = mapRepairCodeStringToEstimateId(codeInfo?.code);
                            if (estimateId) {
                                const flatPriceGross = lookupEstimatePrice(
                                    state.globalConfig.estimateConfig,
                                    currentRow.bodyPart,
                                    estimateId,
                                    vc
                                );
                                if (flatPriceGross > 0) {
                                    cost = flatPriceGross / 1.19;
                                    costBrutto = flatPriceGross;
                                    foundEstimate = true;
                                    matchedEstId = estimateId;
                                }
                            }
                        }

                        if (!foundEstimate) {
                            cost = calculateRepairCostForPart(
                                currentRow.bodyPart,
                                rCodeIndex,
                                vc,
                                state.karosseriestundensatz,
                                state.globalConfig
                            );
                        }

                        enrichedData = {
                            ...enrichedData,
                            repairCost: Math.round(cost * 100) / 100,
                            repairCostBrutto: costBrutto,
                            damage: (descs.damage || (data.damage ?? currentRow.damage) || '') as DamageType,
                            repairMethod: (descs.repairMethod || (data.repairMethod ?? currentRow.repairMethod) || '') as RepairMethodType,
                            estimateRepairCodeId: matchedEstId
                        };
                    } else {
                        enrichedData = {
                            ...enrichedData,
                            repairCost: 0,
                            estimateRepairCodeId: undefined
                        };
                    }
                }

                const updatedRows = state.minderwertRows.map(r => {
                    if (r.id !== id) return r;
                    const updated = { ...r, ...enrichedData };

                    let repairCostBrutto = updated.repairCostBrutto;
                    if (enrichedData.repairCostBrutto !== undefined) {
                        repairCostBrutto = enrichedData.repairCostBrutto;
                    } else if (enrichedData.repairCost !== undefined || repairCostBrutto === undefined || repairCostBrutto === 0) {
                        repairCostBrutto = Math.round(calcBrutto(updated.repairCost || 0) * 100) / 100;
                    }
                    const sparePartsBrutto = Math.round(calcBrutto(updated.spareParts || 0) * 100) / 100;
                    const totalCostBrutto = (repairCostBrutto || 0) + sparePartsBrutto;
                    const totalCostNetto = (updated.repairCost || 0) + (updated.spareParts || 0);

                    updated.repairCostBrutto = repairCostBrutto;
                    updated.sparePartsBrutto = sparePartsBrutto;

                    // Calculate Minderwert for this row
                    if (data.minderwertBrutto !== undefined && (data.isManualMinderwert || data.isManualMinderwert === undefined)) {
                        updated.minderwertBrutto = Math.max(0, Math.min(data.minderwertBrutto, totalCostBrutto));
                        updated.isManualMinderwert = true;
                    } else {
                        if (data.repairCost !== undefined || data.spareParts !== undefined || data.anrechnung !== undefined || data.presetType !== undefined || 'repairCodeIndex' in data || 'estimateRepairCodeId' in data) {
                            updated.isManualMinderwert = false;
                        }

                        if (!updated.isManualMinderwert) {
                            let mb = 0;
                            if (updated.anrechnung === 'voll') {
                                mb = totalCostBrutto;
                            } else if (updated.anrechnung === 'anteilig' || updated.anrechnung === 'pro-rata') {
                                const mwNetto = calculateMinderwertProRata(
                                    totalCostNetto,
                                    state.firstRegistration || '',
                                    state.mileage || 0,
                                    state.globalConfig
                                );
                                mb = Math.min(Math.round(calcBrutto(mwNetto) * 100) / 100, totalCostBrutto);
                            } else {
                                mb = 0;
                            }
                            updated.minderwertBrutto = mb;
                        }
                    }
                    updated.minderwertBrutto = Math.max(0, Math.min(updated.minderwertBrutto || 0, totalCostBrutto));
                    updated.minderwertNetto = calcNetto(updated.minderwertBrutto);

                    return updated;
                });

                return {
                    minderwertRows: updatedRows,
                };
            }),

            addCustomMinderwertRow: (_id?: string) => { /* No longer used in splitted UI */ },

            removeMinderwertPhoto: (id: string, photoIndex: number) => set(state => ({
                minderwertRows: state.minderwertRows.map(r => {
                    if (r.id !== id) return r;
                    const newImages = [...(r.images || [])];
                    newImages.splice(photoIndex, 1);
                    return { ...r, images: newImages };
                })
            })),

            removeMinderwertRow: (id: string) => set(state => ({
                minderwertRows: state.minderwertRows.filter(r => r.id !== id)
            })),

            updateSignature: (role, data) => set(state => ({
                signatures: { ...state.signatures, [role]: data },
            })),

            updateSignatureName: (role, name) => set(state => ({
                signatureNames: { ...state.signatureNames, [role]: name },
            })),

            resetAll: () => set(state => ({
                ...initialState,
                caseNumber: generateCaseNumber(),
                fieldConfigs: state.fieldConfigs,
                globalConfig: state.globalConfig
            })),
            setAllData: (data) => set(state => {
                const migratedData = { ...data };

                // Normalize date inputs (HTML5 inputs expect YYYY-MM-DD)
                const dateInputs: (keyof ReportData)[] = [
                    'orderDate', 'inspectionDate', 'valuationDate', 'nextMaintenanceDate',
                ];
                for (const field of dateInputs) {
                    if (migratedData[field] && typeof migratedData[field] === 'string') {
                        migratedData[field] = normalizeDate(migratedData[field] as string) as any;
                    }
                }

                // Format German text date fields as DD.MM.YYYY
                const germanTextDates: (keyof ReportData)[] = [
                    'firstRegistration', 'lastRegistration',
                ];
                for (const field of germanTextDates) {
                    if (migratedData[field] && typeof migratedData[field] === 'string') {
                        migratedData[field] = formatDate(migratedData[field] as string) as any;
                    }
                }

                if (migratedData.nextHU && typeof migratedData.nextHU === 'string') {
                    migratedData.nextHU = formatMonthYear(migratedData.nextHU) as any;
                }

                // 1. Test Drive migration (Boolean -> String)
                if (typeof (migratedData as any).testDriveDone === 'boolean') {
                    migratedData.testDriveDone = (migratedData as any).testDriveDone ? 'carried_out' : 'not_possible';
                }

                // 2. Lifting Platform migration
                if (!migratedData.liftingPlatformStatus) {
                    if ((migratedData as any).inspectedOnLift) {
                        migratedData.liftingPlatformStatus = 'available_used';
                    } else if ((migratedData as any).noLiftingPlatformAvailable) {
                        migratedData.liftingPlatformStatus = 'not_available';
                    }
                }

                // 3. Vehicle Condition migration
                if (!migratedData.vehicleConditionStatus) {
                    if ((migratedData as any).vehicleDirty) {
                        migratedData.vehicleConditionStatus = 'dirty';
                    } else if ((migratedData as any).vehicleWet) {
                        migratedData.vehicleConditionStatus = 'wet';
                    }
                }

                // 4. Renamed fields migration (inspectionFromAbove/Below)
                if (migratedData.inspectionFromAbove === undefined && (migratedData as any).inspectionFromAboveNotPossible !== undefined) {
                    migratedData.inspectionFromAbove = (migratedData as any).inspectionFromAboveNotPossible;
                }
                if (migratedData.inspectionFromBelow === undefined && (migratedData as any).inspectionFromBelowNotPossible !== undefined) {
                    migratedData.inspectionFromBelow = (migratedData as any).inspectionFromBelowNotPossible;
                }

                // 5. Images migration
                if (!migratedData.vehicleConditionImages || migratedData.vehicleConditionImages.length === 0) {
                    if ((migratedData as any).vehicleDirtyImages?.length > 0) {
                        migratedData.vehicleConditionImages = (migratedData as any).vehicleDirtyImages;
                    } else if ((migratedData as any).vehicleWetImages?.length > 0) {
                        migratedData.vehicleConditionImages = (migratedData as any).vehicleWetImages;
                    }
                }



                // Safe merge of photos to preserve client-only data like mandatoryPhotoId
                const newPhotos = migratedData.photos?.map(newPhoto => {
                    const existingPhoto = state.photos?.find(p => p.id === newPhoto.id);

                    // Try to recover mandatoryPhotoId from known labels if missing
                    let recoveredId = newPhoto.mandatoryPhotoId || existingPhoto?.mandatoryPhotoId;
                    if (!recoveredId && newPhoto.label) {
                        const label = newPhoto.label;
                        if (label === 'Übersicht diagonal vorne links' || label === 'Overview diagonal front left') recoveredId = 'diag_fl';
                        else if (label === 'Übersicht diagonal hinten links' || label === 'Overview diagonal rear left') recoveredId = 'diag_rl';
                        else if (label === 'Übersicht diagonal vorne rechts' || label === 'Overview diagonal front right') recoveredId = 'diag_fr';
                        else if (label === 'Übersicht diagonal hinten rechts' || label === 'Overview diagonal rear right') recoveredId = 'diag_rr';
                        else if (label === 'Fahrzeug-Ident.-Nr. / Typschild' || label === 'Chassis number / Type plate') recoveredId = 'vin_photo';
                        else if (label === 'Kilometerstand / Tacho' || label === 'Mileage / Instrument cluster') recoveredId = 'mileage_photo';
                        else if (label === 'Fahrzeuginnenraum durch die Fahrertür' || label === 'Vehicle interior through driver\'s door') recoveredId = 'interior_door';
                        else if (label === 'Schweller rechts' || label === 'Right sill') recoveredId = 'sill_right';
                        else if (label === 'Schweller links' || label === 'Left sill') recoveredId = 'sill_left';
                    }

                    return {
                        ...existingPhoto,
                        ...newPhoto,
                        // If backend returns null data but has filePath, use filePath
                        data: newPhoto.data || (newPhoto as any).filePath || existingPhoto?.data || '',
                        // Preserve mandatoryPhotoId from client if it was dropped by backend
                        mandatoryPhotoId: recoveredId
                    };
                });

                // Normalize tire order so reports saved with the old order display correctly
                if (migratedData.tires && migratedData.tires.length > 0) {
                    migratedData.tires = normalizeTireOrder(migratedData.tires);
                }
                if (migratedData.secondTires && migratedData.secondTires.length > 0) {
                    migratedData.secondTires = normalizeTireOrder(migratedData.secondTires);
                }

                const finalData: any = {
                    ...migratedData,
                    ...(newPhotos ? { photos: newPhotos } : {})
                };

                const mileage = finalData.mileage !== undefined ? finalData.mileage : state.mileage;
                const firstRegistration = finalData.firstRegistration !== undefined ? finalData.firstRegistration : state.firstRegistration;
                const vehicleCategory = finalData.vehicleCategory !== undefined ? finalData.vehicleCategory : state.vehicleCategory;
                const globalConfig = finalData.globalConfig !== undefined ? finalData.globalConfig : state.globalConfig;
                const karosseriestundensatz = finalData.karosseriestundensatz !== undefined ? finalData.karosseriestundensatz : state.karosseriestundensatz;

                const { damages, minderwertRows } = recalculateMinderwertAndDamages(
                    finalData.damages || state.damages || [],
                    finalData.minderwertRows || state.minderwertRows || [],
                    mileage || 0,
                    firstRegistration || '',
                    vehicleCategory,
                    globalConfig,
                    karosseriestundensatz
                );

                finalData.damages = damages;
                finalData.minderwertRows = minderwertRows;

                return {
                    ...finalData,
                    initialData: { ...finalData }
                };
            }),

            recalculateVehicleValue: () => {
                const s = get();
                if (!s.vehicleBaseValue || s.vehicleBaseValue <= 0) {
                    set({ finalVehicleValue: 0, depreciationMatrixFactor: 1 });
                    return;
                }

                let ageMonths = 0;
                if (s.firstRegistration) {
                    try {
                        const regDate = parseGermanDate(s.firstRegistration);
                        if (regDate) {
                            const now = new Date();
                            ageMonths = (now.getFullYear() - regDate.getFullYear()) * 12 + (now.getMonth() - regDate.getMonth());
                            if (now.getDate() < regDate.getDate()) {
                                ageMonths--;
                            }
                        }
                    } catch (e) { /* ignore */ }
                }
                if (ageMonths < 0) ageMonths = 0;

                const calcType = s.globalConfig?.calculationType || 'proportional';

                // Type 2: 100% Value
                if (calcType === 'hundred_percent') {
                    set({
                        depreciationMatrixFactor: 1.0,
                        finalVehicleValue: Math.round(s.vehicleBaseValue * 100) / 100
                    });
                    return;
                }

                // Type 3: Text Only
                if (calcType === 'text_only') {
                    set({
                        depreciationMatrixFactor: 0,
                        finalVehicleValue: 0
                    });
                    return;
                }

                const mileage = s.mileage || 0;
                const matrix = s.globalConfig?.depreciationMatrix || [];
                let matrixFactor = 1.0;

                for (const entry of matrix) {
                    const ageMatch = (entry.ageFrom === undefined || entry.ageFrom === null || ageMonths >= entry.ageFrom)
                        && (entry.ageTo === undefined || entry.ageTo === null || ageMonths <= entry.ageTo);
                    const mileageMatch = (entry.mileageFrom === undefined || entry.mileageFrom === null || mileage >= entry.mileageFrom)
                        && (entry.mileageTo === undefined || entry.mileageTo === null || mileage <= entry.mileageTo);

                    if (ageMatch && mileageMatch) {
                        matrixFactor = entry.factor;
                        break;
                    }
                }

                let priceFactor = 1.0;
                if (s.priceCategory) {
                    const entries = s.globalConfig?.priceCategoryEntries;
                    if (entries && entries.length > 0) {
                        const found = entries.find(e => e.key === s.priceCategory || e.label === s.priceCategory);
                        priceFactor = found ? found.factor : 1.0;
                    } else {
                        const priceFactors = s.globalConfig?.priceCategoryFactors || {};
                        priceFactor = priceFactors[s.priceCategory] || 1.0;
                    }
                }

                const finalValue = s.vehicleBaseValue * matrixFactor * priceFactor;

                set({
                    depreciationMatrixFactor: matrixFactor,
                    finalVehicleValue: Math.round(finalValue * 100) / 100
                });
            },

            setGlobalConfig: (config) => set(state => {
                if (!config || Object.keys(config).length === 0) {
                    return {};
                }
                localStorage.setItem('rateConfig', JSON.stringify(config));

                const { damages, minderwertRows } = recalculateMinderwertAndDamages(
                    state.damages,
                    state.minderwertRows,
                    state.mileage,
                    state.firstRegistration || '',
                    state.vehicleCategory,
                    config,
                    config.karosseriestundensatz || state.karosseriestundensatz
                );

                return {
                    globalConfig: config,
                    karosseriestundensatz: config.karosseriestundensatz,
                    lackstundensatz: config.lackstundensatz,
                    lackberechnungsart: config.lackberechnungsart,
                    damages,
                    minderwertRows
                };
            }),

            getStepValidationErrors: (step: number) => {
                const s = get();
                const errors: Record<string, string> = {};
                // mileage_photo and vin_photo are required by default.
                // They can only be made optional if admin explicitly saved them
                // via the photo-slot panel (isPhotoSlot: true) with required: false.
                const isPhotoSlotRequired = (fieldName: string): boolean => {
                    if (fieldName === 'mileage_photo' || fieldName === 'vin_photo') return true; // always required
                    const cfg = s.fieldConfigs.find(c => c.fieldName === fieldName);
                    if (cfg && (cfg as any).isPhotoSlot === true) return cfg.required;
                    return true; // always required unless photo-slot config says otherwise
                };
                const MILEAGE_VIN_IDS = new Set(['mileage_photo', 'vin_photo']);
                const isRequired = (fieldName: string) => {
                    if (MILEAGE_VIN_IDS.has(fieldName)) return isPhotoSlotRequired(fieldName);
                    const cfg = s.fieldConfigs.find(c => c.fieldName === fieldName);
                    return cfg?.required;
                };

                const checkRequired = (fields: string[]) => {
                    for (const f of fields) {
                        if (isRequired(f)) {
                            const val = (s as any)[f];
                            let invalid = false;
                            if (val === undefined || val === null || val === '') invalid = true;
                            else if (Array.isArray(val) && val.length === 0) invalid = true;
                            else if (typeof val === 'number' && isNaN(val)) invalid = true;
                            if (invalid) {
                                errors[f] = 'Required';
                            }
                        }
                    }
                };

                if (step === 1) {
                    const step1Fields = [
                        'claimType', 'caseNumber', 'licensePlate', 'customerNumber',
                        'contractNumber', 'concernType', 'concernCompany', 'clientName',
                        'clientStreet', 'clientHouseNumber', 'clientZip', 'clientCity',
                        'orderDate', 'inspectionDate', 'inspectionTime', 'inspectionLocation',
                        'inspectorName', 'valuationDate'
                    ];
                    checkRequired(step1Fields);
                }
                if (step === 2) {
                    const step2Fields = [
                        'vin', 'firstRegistration', 'lastRegistration', 'mileage',
                        'nextHU', 'bodyType', 'doors', 'seats', 'keyNumber',
                        'fuelType', 'cylinders', 'powerKw', 'displacement',
                        'emissionClass', 'driveType', 'transmission', 'wheels',
                        'colorDescription', 'upholsteryDescription', 'identificationImages',
                        'vehicleCategory'
                    ];
                    checkRequired(step2Fields);

                    // Vehicle Category is ALWAYS mandatory
                    const vc = s.vehicleCategory;
                    if (!vc) {
                        errors['vehicleCategory'] = 'Required';
                    }
                }
                if (step === 3) {
                    const step3Fields = [
                        'testDriveDone', 'liftingPlatformStatus', 'inspectionFromBelow',
                        'inspectionFromAbove', 'vehicleConditionStatus', 'errorMemoryRead',
                        'hybridBatteryChecked', 'nextMaintenanceType', 'maintenancePrice'
                    ];

                    const mType = s.nextMaintenanceType;
                    if (!mType || mType === 'date') {
                        step3Fields.push('nextMaintenanceDate');
                    } else if (mType === 'days' || mType === 'months') {
                        step3Fields.push('nextMaintenanceIntervalValue');
                        step3Fields.push('nextMaintenanceMileage');
                    } else if (mType === 'mileage') {
                        step3Fields.push('nextMaintenanceIntervalValue');
                    }

                    checkRequired(step3Fields);

                    // Conditional: Charging Cable (only for EV/Hybrid)
                    const fuel = (s.fuelType || '').toLowerCase();
                    const showChargingCable = fuel.includes('elektro') || fuel.includes('hybrid') || fuel.includes('phev');
                    if (showChargingCable && isRequired('chargingCable') && !s.chargingCable) {
                        errors['chargingCable'] = 'Required';
                    }

                    // Complex equipment fields
                    const equipmentFields = ['breakdownKit', 'firstAidKit', 'warningTriangle', 'safetyVest'];
                    for (const f of equipmentFields) {
                        if (isRequired(f)) {
                            const val = (s as any)[f];
                            if (!val || !val.status) {
                                errors[f] = 'Required';
                            }
                        }
                    }

                    // Paint Measurements logic
                    const paintRequired = isRequired('noPaintIssuesDetected');

                    if (!s.noPaintIssuesDetected) {
                        const hasMeasurements = s.paintMeasurements && s.paintMeasurements.length > 0;
                        if (paintRequired && !hasMeasurements) {
                            errors['noPaintIssuesDetected'] = 'Required';
                        }
                        if (hasMeasurements) {
                            const measurementsValid = s.paintMeasurements.every(p => {
                                const hasBodyPart = p.bodyPart && String(p.bodyPart).trim() !== '';
                                const hasMicrons = Number(p.measuredMicrons) > 0;
                                const hasImages = p.images && p.images.length > 0;
                                const hasDamageDesc = !p.damageKnown || (p.repairDamage && String(p.repairDamage).trim() !== '');
                                return hasBodyPart && hasMicrons && hasImages && hasDamageDesc;
                            });

                            if (!measurementsValid) {
                                errors['paintMeasurements'] = 'Required';
                            }
                        }
                    }
                }
                if (step === 4) {
                    // Build dynamic photo slot list from fieldConfigs (admin-configured)
                    const DEFAULT_PHOTO_SLOTS = [
                        { id: 'diag_fl', label: 'Übersicht diagonal vorne links', en: 'Overview diagonal front left' },
                        { id: 'diag_rl', label: 'Übersicht diagonal hinten links', en: 'Overview diagonal rear left' },
                        { id: 'diag_rr', label: 'Übersicht diagonal hinten rechts', en: 'Overview diagonal rear right' },
                        { id: 'diag_fr', label: 'Übersicht diagonal vorne rechts', en: 'Overview diagonal front right' },
                        { id: 'mileage_photo', label: 'Kilometerstand / Tacho', en: 'Mileage / Instrument cluster' },
                        { id: 'vin_photo', label: 'Fahrzeug-Ident.-Nr. / Typschild', en: 'Chassis number / Type plate' },
                        { id: 'interior_door', label: 'Fahrzeuginnenraum durch die Fahrertür', en: 'Vehicle interior through driver\'s door' },
                        { id: 'sill_left', label: 'Schweller links', en: 'Left sill' },
                        { id: 'sill_right', label: 'Schweller rechts', en: 'Right sill' }
                    ];

                    // Check if admin has configured photo slots; if so, use them (sorted by sortOrder)
                    const configuredSlots = s.fieldConfigs
                        .filter((c: any) => c.isPhotoSlot === true)
                        .sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

                    const mandatoryPhotoIds = configuredSlots.length > 0
                        ? configuredSlots.map((c: any) => ({ id: c.fieldName, label: c.label || c.fieldName, en: c.label || c.fieldName }))
                        : DEFAULT_PHOTO_SLOTS;

                    // Validate all mandatory photos uniformly via isRequired()
                    for (const item of mandatoryPhotoIds) {
                        if (!isRequired(item.id)) continue; // only validate if admin marked as required

                        let exists: boolean;
                        if (item.id === 'mileage_photo') {
                            exists =
                                (s.mileageImages && s.mileageImages.length > 0) ||
                                s.photos.some(p => p.mandatoryPhotoId === 'mileage_photo');
                        } else if (item.id === 'vin_photo') {
                            exists =
                                (s.identificationImages && s.identificationImages.length > 0) ||
                                s.photos.some(p => p.mandatoryPhotoId === 'vin_photo');
                        } else {
                            exists = s.photos.some(p =>
                                p.mandatoryPhotoId === item.id ||
                                p.label === item.label ||
                                p.label === item.en
                            );
                        }

                        if (!exists) {
                            errors[item.id] = 'Required';
                        }
                    }

                    const damagesValid = s.damages.every(d =>
                        (d.description && d.description.trim() !== '') ||
                        (d.images && d.images.length > 0)
                    );
                    if (!damagesValid) {
                        errors['damages'] = 'Required';
                    }
                }
                if (step === 5) {
                    if (isRequired('expertAssessmentStatus') && !s.expertAssessmentStatus) {
                        errors['expertAssessmentStatus'] = 'Required';
                    }
                    if (isRequired('signatureDriver') && (!s.signatures.driver || !s.signatureNames.driver)) {
                        errors['signatureDriver'] = 'Required';
                    }
                    if (isRequired('signatureReceiver') && (!s.signatures.receiver || !s.signatureNames.receiver)) {
                        errors['signatureReceiver'] = 'Required';
                    }
                }
                return errors;
            },

            isStepValid: (step: number) => {
                return Object.keys(get().getStepValidationErrors(step)).length === 0;
            },

            fetchAndApplyCustomerRates: async (customerNumber: string) => {
                if (!customerNumber) return false;
                try {
                    const api = (await import('../utils/api')).default;
                    const res = await api.get(`/config/customer/${customerNumber}`);
                    if (res.data && Object.keys(res.data).length > 0) {
                        const config = res.data as GlobalConfig;
                        get().setGlobalConfig(config);
                        get().recalculateVehicleValue();
                        return true;
                    }
                    return false;
                } catch (err) {
                    console.warn('No specific rates for customer:', customerNumber);
                    return false;
                }
            },

            saveCurrentRatesAsCustomerDefault: async (customerNumber: string) => {
                if (!customerNumber) return false;
                try {
                    const api = (await import('../utils/api')).default;
                    const state = get();
                    const config = {
                        karosseriestundensatz: state.karosseriestundensatz,
                        lackstundensatz: state.lackstundensatz,
                        lackberechnungsart: state.lackberechnungsart,
                        vehicleCategory: state.vehicleCategory
                    };
                    await api.post(`/config/customer/${customerNumber}`, config);
                    return true;
                } catch (err) {
                    console.error('Failed to save customer rates:', err);
                    return false;
                }
            },

            updatePhotoSlotConfigs: async (slots, customerNumber) => {
                const ALWAYS_REQUIRED = new Set(['mileage_photo', 'vin_photo']);
                try {
                    const api = (await import('../utils/api')).default;
                    const url = customerNumber ? `/field-configs/customer/${customerNumber}` : '/field-configs';
                    // Save each slot sequentially
                    for (const slot of slots) {
                        await api.post(url, {
                            fieldName: slot.id,
                            required: ALWAYS_REQUIRED.has(slot.id) ? true : slot.required,
                            stepNumber: 4,
                            label: slot.label,
                            sortOrder: slot.sortOrder,
                            isPhotoSlot: true,
                            isCustom: slot.isCustom ?? false,
                        });
                    }
                    // Refresh fieldConfigs from server
                    await get().fetchFieldConfigs(customerNumber);
                } catch (err) {
                    console.error('Failed to update photo slot configs', err);
                    throw err;
                }
            },

            getPhotoSlots: () => {
                const s = get();
                // mileage_photo and vin_photo are always required by default
                const ALWAYS_REQUIRED_DEFAULTS = new Set(['mileage_photo', 'vin_photo']);
                const DEFAULT_SLOTS = [
                    { id: 'diag_fl', label: 'Übersicht diagonal vorne links' },
                    { id: 'diag_rl', label: 'Übersicht diagonal hinten links' },
                    { id: 'diag_rr', label: 'Übersicht diagonal hinten rechts' },
                    { id: 'diag_fr', label: 'Übersicht diagonal vorne rechts' },
                    { id: 'mileage_photo', label: 'Kilometerstand / Tacho' },
                    { id: 'vin_photo', label: 'Fahrzeug-Ident.-Nr. / Typschild' },
                    { id: 'interior_door', label: 'Fahrzeuginnenraum durch die Fahrertür' },
                    { id: 'sill_left', label: 'Schweller links' },
                    { id: 'sill_right', label: 'Schweller rechts' },
                ];
                const configured = s.fieldConfigs
                    .filter((c: any) => c.isPhotoSlot === true)
                    .sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
                    .map((c: any) => ({ id: c.fieldName, label: c.label || c.fieldName }));
                if (configured.length > 0) return configured;
                // When using defaults, reflect the always-required state in the slot objects
                // so Step4 can show the correct required styling without any admin config
                return DEFAULT_SLOTS;
            },

            fetchFieldConfigs: async (customerNumber?: string) => {
                try {
                    const api = (await import('../utils/api')).default;
                    const url = customerNumber ? `/field-configs?customerNumber=${customerNumber}` : '/field-configs';
                    const res = await api.get(url);
                    set({ fieldConfigs: res.data });
                } catch (err) {
                    console.error('Failed to fetch field configs', err);
                }
            },

            updateFieldConfig: async (fieldName: string, required: boolean, stepNumber: number, customerNumber?: string) => {
                try {
                    const api = (await import('../utils/api')).default;
                    const url = customerNumber ? `/field-configs/customer/${customerNumber}` : '/field-configs';
                    await api.post(url, { fieldName, required, stepNumber });
                    const configs = [...get().fieldConfigs];
                    const idx = configs.findIndex(c => c.fieldName === fieldName);
                    if (idx > -1) {
                        configs[idx] = { ...configs[idx], required };
                    } else {
                        configs.push({ fieldName, required, stepNumber, customerNumber });
                    }
                    set({ fieldConfigs: configs });
                } catch (err) {
                    console.error('Failed to update field config', err);
                    throw err;
                }
            },

            fetchGlobalConfig: async () => {
                try {
                    const api = (await import('../utils/api')).default;
                    const res = await api.get('/config');
                    if (res.data && Object.keys(res.data).length > 0) {
                        get().setGlobalConfig(res.data);
                    }
                    get().recalculateVehicleValue();
                } catch (err) {
                    console.error('Failed to fetch global config', err);
                }
            },

            reSyncPhotosWithVideoXpert: async () => {
                const caseNumber = get().caseNumber;
                if (!caseNumber) return false;
                try {
                    const api = (await import('../utils/api')).default;
                    const res = await api.post(`/reports/re-sync-photos?caseNumber=${caseNumber}`);
                    if (res.data) {
                        get().setAllData(res.data);
                        return true;
                    }
                    return false;
                } catch (err) {
                    console.error('Failed to re-sync photos with VideoXpert:', err);
                    throw err;
                }
            },

            getEffectiveRepairTable: () => {
                const config = get().globalConfig;
                if (config?.repairTable && config.repairTable.length > 0) {
                    return config.repairTable;
                }
                return DEFAULT_GLOBAL_CONFIG.repairTable || [];
            },

            getEffectiveRepairPositions: () => {
                const config = get().globalConfig;
                if (config?.repairPositions && config.repairPositions.length > 0) {
                    return config.repairPositions;
                }
                return DEFAULT_GLOBAL_CONFIG.repairPositions || [];
            },

            getEffectiveRepairTypes: () => {
                const config = get().globalConfig;
                if (config?.repairTypes && config.repairTypes.length > 0) {
                    return config.repairTypes;
                }
                return DEFAULT_GLOBAL_CONFIG.repairTypes || [];
            },

            getEffectiveRepairSurcharges: () => {
                const config = get().globalConfig;
                if (config?.repairSurcharges && Object.keys(config.repairSurcharges).length > 0) {
                    return config.repairSurcharges;
                }
                return DEFAULT_GLOBAL_CONFIG.repairSurcharges || {};
            },
        });

export const globalReportStore = createStore<ReportStore>()(
    persist(
        reportStoreCreator,
        {
            name: 'report-storage',
            partialize: (state) => {
                const {
                    totalRepairCostBrutto,
                    totalMinderwertBrutto,
                    totalMinderwertNetto,
                    updateField,
                    updateOrderInfo,
                    updateVehicleData,
                    updateCondition,
                    setKarosseriestundensatz,
                    setLackstundensatz,
                    setLackberechnungsart,
                    setVehicleCategory,
                    addDamage,
                    updateDamage,
                    handleDamagePhoto,
                    removeDamagePhoto,
                    removeDamage,
                    copyDamage,
                    addPhoto,
                    removePhoto,
                    updatePhoto,
                    movePhoto,
                    reorderPhoto,
                    setBodyPartDamage,
                    addPaintMeasurement,
                    updatePaintMeasurement,
                    removePaintMeasurement,
                    updateTire,
                    updateTireConfiguration,
                    updateSpareTire,
                    updateSecondTire,
                    toggleSecondTireSet,
                    updateMinderwertRow,
                    addCustomMinderwertRow,
                    removeMinderwertPhoto,
                    removeMinderwertRow,
                    copyFirstTireToAll,
                    copyToNextTire,
                    copySecondTireToNext,
                    updateSignature,
                    updateSignatureName,
                    resetAll,
                    setAllData,
                    setGlobalConfig,
                    fetchFieldConfigs,
                    updateFieldConfig,
                    updatePhotoSlotConfigs,
                    getPhotoSlots,
                    fetchAndApplyCustomerRates,
                    saveCurrentRatesAsCustomerDefault,
                    getStepValidationErrors,
                    isStepValid,
                    fetchGlobalConfig,
                    getEffectiveRepairTable,
                    getEffectiveRepairPositions,
                    getEffectiveRepairTypes,
                    getEffectiveRepairSurcharges,
                    recalculateVehicleValue,
                    setHasHydrated,
                    ...persistableState
                } = state;
                return persistableState;
            },
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (!state.globalConfig || Object.keys(state.globalConfig).length === 0) {
                        state.globalConfig = DEFAULT_GLOBAL_CONFIG;
                    }
                    // Normalize tire order on hydration so old-format localStorage data is corrected
                    if (state.tires && state.tires.length > 0) {
                        state.tires = normalizeTireOrder(state.tires);
                    }
                    if (state.secondTires && state.secondTires.length > 0) {
                        state.secondTires = normalizeTireOrder(state.secondTires);
                    }
                    state.setHasHydrated(true);
                }
            },
        }
    )
);

export const ReportStoreContext = createContext<StoreApi<ReportStore> | null>(null);

let activeStore: StoreApi<ReportStore> = globalReportStore;

export interface UseReportStore {
    (): ReportStore;
    <U>(selector: (state: ReportStore) => U): U;
    getState: () => ReportStore;
    setState: StoreApi<ReportStore>['setState'];
    subscribe: StoreApi<ReportStore>['subscribe'];
}

const useReportStoreHook = (<T>(selector?: (state: ReportStore) => T) => {
    const contextStore = useContext(ReportStoreContext);
    const store = contextStore || globalReportStore;
    if (selector) {
        return useStore(store, selector);
    }
    return useStore(store);
}) as UseReportStore;

// Expose static store methods on the custom hook function
useReportStoreHook.getState = () => activeStore.getState();
useReportStoreHook.setState = (
    nextStateOrUpdater: ReportStore | Partial<ReportStore> | ((state: ReportStore) => ReportStore | Partial<ReportStore>),
    replace?: boolean
) => {
    if (replace) {
        activeStore.setState(nextStateOrUpdater as ReportStore | ((state: ReportStore) => ReportStore), true);
    } else {
        activeStore.setState(nextStateOrUpdater, false);
    }
};
useReportStoreHook.subscribe = (
    listener: (state: ReportStore, prevState: ReportStore) => void
) => activeStore.subscribe(listener);

export const useReportStore = useReportStoreHook;

export const ReportStoreProvider: React.FC<{ store: StoreApi<ReportStore>; children: React.ReactNode }> = ({ store, children }) => {
    React.useEffect(() => {
        const prevStore = activeStore;
        activeStore = store;
        return () => {
            activeStore = prevStore;
        };
    }, [store]);

    return React.createElement(ReportStoreContext.Provider, { value: store }, children);
};

export const createAdminReportStore = () => {
    return createStore<ReportStore>()(reportStoreCreator);
};
