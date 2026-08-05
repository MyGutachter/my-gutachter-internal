import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Box, Camera, CheckCircle, ChevronDown, DoorClosed, FileText, GripVertical, ImagePlus, LayoutDashboard, Pencil, Plus, RefreshCw, Search, Settings, Trash2, X } from 'lucide-react';
import SecureImage from '../ui/SecureImage';
import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { BODY_PARTS, INTERIOR_PARTS, getBodyPartLabel } from '../../constants/bodyParts';
import { ANRECHNUNG_OPTIONS, DAMAGE_TYPES } from '../../constants/damageTypes';
import { ESTIMATE_REPAIR_CODE_IDS, ESTIMATE_REPAIR_CODE_LABELS, lookupEstimatePrice } from '../../constants/estimateRepairCodes';
import { useReportStore } from '../../store/reportStore';
import { useUIStore } from '../../store/uiStore';
import { formatCurrency } from '../../utils/currency';
import { compressImage } from '../../utils/imageCompression';
import { validateImageAspectRatio } from '../../utils/imageValidation';
import { lookupDepreciationMatrixFactor, parseGermanDate } from '../../utils/minderwertCalculator';
import { calcBrutto, calcNetto } from '../../utils/vatCalculator';
import Card from '../ui/Card';
import { scrollToElement } from '../../utils/scroll';
import { CarOverlay } from '../ui/CarOverlay';
import DamageEntryModal from '../ui/DamageEntryModal';
import ModalWrapper from '../ui/ModalWrapper';
import PhotoThumbnail from '../ui/PhotoThumbnail';
import SectionTitle from '../ui/SectionTitle';


const INTERIOR_PART_ICONS: Record<string, React.ComponentType<any>> = {
    dashboard: LayoutDashboard,
    door_panel_fl: DoorClosed,
    trunk_lining: Box,
};

// Mapping from BODY_PARTS IDs (dropdowns/store) → CarOverlay SVG part IDs
const BODY_TO_OVERLAY: Record<string, string> = {
    bumper_front: 'front_bumper',
    hood: 'bonnet',
    windshield: 'windshield',
    fender_front_left: 'Front_left_fender',
    door_front_left: 'Front_left_door',
    door_rear_left: 'Rear_left_door',
    quarter_panel_left: 'Left_side_wall',
    sill_left: 'left_sill',
    roof_frame_left: 'Dachrahmen_links',
    fender_front_right: 'front_right_fender',
    door_front_right: 'Front_right_door',
    door_rear_right: 'Rear_right_door',
    quarter_panel_right: 'Right_side_wall',
    sill_right: 'Right_sill',
    roof_frame_right: 'Roof_frame_right',
    mirror_left: 'Left_wing_mirror',
    mirror_right: 'Right_hand_exterior_mirror',
    roof: 'Roof',
    tailgate: 'Tailgate',
    bumper_rear: 'rear_bumper',
    headlight_left: 'Headlight_on_the_left',
    headlight_right: 'Headlight_on_the_right',
    rear_light_left: 'Left_rear_light',
    rear_light_right: 'Taillights_right',
};

interface Props {
    adminMode?: boolean;
    onToggleRequired?: (fieldName: string) => Promise<void>;
}

const translatePhotoLabel = (label: string, t: any, lang: 'de' | 'en' = 'de') => {
    if (!label) return '';
    return getBodyPartLabel(label, lang) || label;
};


const Step4_Damages: React.FC<Props> = ({ adminMode, onToggleRequired }) => {
    const { t, i18n } = useTranslation();
    const store = useReportStore();

    const getEffectiveDamageTypes = () => {
        const defaultTypes = DAMAGE_TYPES.filter(o => o.value !== 'custom');
        const customTypes = store.globalConfig?.damageTypes || [];
        const combined = [...defaultTypes];
        customTypes.forEach(c => {
            if (!combined.some(o => o.value === c.value)) {
                combined.push(c);
            }
        });
        const customOption = DAMAGE_TYPES.find(o => o.value === 'custom');
        if (customOption) {
            combined.push(customOption);
        }
        return combined;
    };

    const isVehicleEvaluation = store.claimType === 'Fahrzeugbewertung';
    const { setCurrentStep, showValidationErrors } = useUIStore();
    const validationErrors = store.getStepValidationErrors(4);
    // mileage_photo and vin_photo are always required by default.
    // Only a photo-slot admin config (isPhotoSlot: true) with required: false can override this.
    const isPhotoSlotRequired = (fieldName: string): boolean => {
        if (fieldName === 'mileage_photo' || fieldName === 'vin_photo') return true; // always required
        const cfg = store.fieldConfigs.find(c => c.fieldName === fieldName);
        if (cfg && (cfg as any).isPhotoSlot === true) return cfg.required;
        return true; // default required
    };
    const MILEAGE_VIN_IDS = new Set(['mileage_photo', 'vin_photo']);
    const isRequired = (fieldName: string) => {
        if (MILEAGE_VIN_IDS.has(fieldName)) return isPhotoSlotRequired(fieldName);
        const cfg = store.fieldConfigs.find(c => c.fieldName === fieldName);
        return cfg?.required;
    };
    const [activeComponentId, setActiveComponentId] = React.useState<string | null>(null);
    const [showTemplateModal, setShowTemplateModal] = React.useState(false);
    const [editingDamageId, setEditingDamageId] = React.useState<string | null>(null);
    const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());
    const [isSyncingPhotos, setIsSyncingPhotos] = React.useState(false);
    const [showConfirmSync, setShowConfirmSync] = React.useState(false);
    const [showSyncSuccessModal, setShowSyncSuccessModal] = React.useState(false);
    const [newlyAddedPhotos, setNewlyAddedPhotos] = React.useState<string[]>([]);

    const getReportAllImages = (s: any) => {
        const urls = new Set<string>();
        s.photos?.forEach((p: any) => { if (p.data) urls.add(p.data); });
        s.minderwertRows?.forEach((r: any) => { r.images?.forEach((img: string) => urls.add(img)); });
        s.damages?.forEach((d: any) => { d.images?.forEach((img: string) => urls.add(img)); });
        s.identificationImages?.forEach((img: string) => urls.add(img));
        s.mileageImages?.forEach((img: string) => urls.add(img));
        s.nextHUImages?.forEach((img: string) => urls.add(img));
        s.keysImages?.forEach((img: string) => urls.add(img));
        s.lastRegistrationImages?.forEach((img: string) => urls.add(img));
        return urls;
    };

    const handleReSyncPhotos = () => {
        setShowConfirmSync(true);
    };

    const confirmAndExecuteSync = async () => {
        setShowConfirmSync(false);
        setIsSyncingPhotos(true);
        try {
            const beforeImages = getReportAllImages(store);
            await store.reSyncPhotosWithVideoXpert();
            const afterImages = getReportAllImages(useReportStore.getState());
            const newImages = Array.from(afterImages).filter(img => !beforeImages.has(img));
            setNewlyAddedPhotos(newImages);
            setShowSyncSuccessModal(true);
        } catch (err) {
            console.error(err);
            toast.error(t('step4.syncError', 'Fehler bei der Synchronisierung.'));
        } finally {
            setIsSyncingPhotos(false);
        }
    };
    const componentRefs = React.useRef<Record<string, HTMLDivElement | null>>({});



    const lang = (i18n.language || 'de') as 'de' | 'en';

    const toggleCard = (id: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>, damageId?: string) => {
        const files = e.target.files;
        if (!files) return;

        let autoLabel = damageId
            ? (store.damages.find(d => d.id === damageId)?.description || t('step4.photoDefaultLabel', { num: store.photos.length + 1 }))
            : t('step4.photoDefaultLabel', { num: store.photos.filter(p => !p.mandatoryPhotoId && !p.damageId).length + 1 });

        if (damageId) {
            const damage = store.damages.find(d => d.id === damageId);
            if (damage) {
                const bodyPartLabel = t(`bodyParts.${damage.bodyPart}`, damage.bodyPart);
                autoLabel = `${bodyPartLabel}: ${damage.description}`.trim().replace(/: $/, '');
            }
        }

        for (const file of Array.from(files)) {
            try {
                const validation = await validateImageAspectRatio(file);
                if (!validation.valid) {
                    toast(t(validation.error || 'common.imageValidation.orientationWarning'), {
                        icon: '⚠️',
                        duration: 3000
                    });
                }
                const compressedData = await compressImage(file, 1200, 1200, 0.7);
                store.addPhoto({
                    id: uuidv4(),
                    data: compressedData,
                    label: autoLabel,
                    fileName: file.name,
                    damageId: damageId
                });
            } catch (err) {
                console.error('Failed to compress image:', file.name, err);
                toast.error(t('step4.compressionError') || `Failed to compress image: ${file.name}`);
            }
        }
        e.target.value = '';
    };

    const updatePhoto = (id: string, newData: string) => {
        const photo = store.photos.find(p => p.id === id);
        if (!photo) return;

        const oldData = photo.data;
        store.updatePhoto(id, { data: newData });

        // Handle sync fields for mandatory photos
        if (photo.mandatoryPhotoId === 'mileage_photo') {
            const current = store.mileageImages || [];
            const updated = current.map(d => d === oldData ? newData : d);
            store.updateField('mileageImages', updated);
        } else if (photo.mandatoryPhotoId === 'vin_photo') {
            const current = store.identificationImages || [];
            const updated = current.map(d => d === oldData ? newData : d);
            store.updateField('identificationImages', updated);
        }
    };

    const removePhotoWithSync = (id: string) => {
        const photo = store.photos.find(p => p.id === id);
        if (!photo) return;

        if (photo.mandatoryPhotoId === 'mileage_photo') {
            const remaining = (store.mileageImages || []).filter(img => img !== photo.data);
            store.updateField('mileageImages', remaining);
        } else if (photo.mandatoryPhotoId === 'vin_photo') {
            const remaining = (store.identificationImages || []).filter(img => img !== photo.data);
            store.updateField('identificationImages', remaining);
        }
        store.removePhoto(id);
    };


    const handleMinderwertPhoto = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        const files = e.target.files;
        if (!files) return;
        const row = store.minderwertRows.find(r => r.id === id);
        if (!row) return;
        const currentImages = row.images || [];
        const newImages = [...currentImages];
        for (const file of Array.from(files)) {
            try {
                const validation = await validateImageAspectRatio(file);
                if (!validation.valid) {
                    toast(t(validation.error || 'common.imageValidation.orientationWarning'), {
                        icon: '⚠️',
                        duration: 3000
                    });
                }
                const compressedData = await compressImage(file, 1200, 1200, 0.7);
                newImages.push(compressedData);
            } catch (err) {
                console.error('Failed to compress image:', file.name, err);
                toast.error(t('step4.compressionError') || `Failed to compress image: ${file.name}`);
            }
        }
        store.updateMinderwertRow(id, { images: newImages });
        e.target.value = '';
    };

    const updateMinderwertPhoto = (rowId: string, idx: number, newSrc: string) => {
        const row = store.minderwertRows.find(r => r.id === rowId);
        if (!row) return;
        const newImages = [...(row.images || [])];
        newImages[idx] = newSrc;
        store.updateMinderwertRow(rowId, { images: newImages });
    };


    const handleDamagePhoto = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            try {
                const validation = await validateImageAspectRatio(file);
                if (!validation.valid) {
                    toast(t(validation.error || 'common.imageValidation.orientationWarning'), {
                        icon: '⚠️',
                        duration: 3000
                    });
                }
                const compressedData = await compressImage(file, 1200, 1200, 0.7);
                store.handleDamagePhoto(id, compressedData);
            } catch (err) {
                console.error('Failed to compress image:', file.name, err);
                toast.error(t('step4.compressionError') || `Failed to compress image: ${file.name}`);
            }
        }
        e.target.value = '';
    };

    const updateDamagePhoto = (damageId: string, idx: number, newSrc: string) => {
        const damage = store.damages.find(d => d.id === damageId);
        if (!damage) return;
        const newImages = [...(damage.images || [])];
        newImages[idx] = newSrc;
        store.updateDamage(damageId, { images: newImages });
    };

    const handleAddPhoto = async (
        e: React.ChangeEvent<HTMLInputElement>,
        photoId: string,
        label: string,
        isCustom: boolean = false
    ) => {
        const files = e.target.files;
        if (!files) return;
        for (const file of Array.from(files)) {
            try {
                const validation = await validateImageAspectRatio(file);
                if (!validation.valid) {
                    toast(t(validation.error || 'common.imageValidation.orientationWarning'), {
                        icon: '⚠️',
                        duration: 3000
                    });
                }
                const data = await compressImage(file, 1200, 1200, 0.7);

                const mandatoryId = isCustom ? `custom_overview_${uuidv4()}` : photoId;

                store.addPhoto({
                    id: uuidv4(),
                    data,
                    label,
                    fileName: file.name,
                    mandatoryPhotoId: mandatoryId
                });

                if (photoId === 'mileage_photo') {
                    const current = store.mileageImages || [];
                    store.updateField('mileageImages', [...current, data]);
                } else if (photoId === 'vin_photo') {
                    const current = store.identificationImages || [];
                    store.updateField('identificationImages', [...current, data]);
                }
            } catch (err) {
                console.error('Failed to process image:', file.name, err);
                toast.error(t('step4.compressionError'));
            }
        }
        e.target.value = '';
    };

    // Config-driven mandatory photo list: admin can reorder and add custom slots
    const BUILT_IN_LABELS: Record<string, string> = {
        diag_fl: t('step4.diag_fl'),
        diag_rl: t('step4.diag_rl'),
        diag_rr: t('step4.diag_rr'),
        diag_fr: t('step4.diag_fr'),
        mileage_photo: t('step4.mileage_photo'),
        vin_photo: t('step4.vin_photo'),
        interior_door: t('step4.interior_door'),
        sill_left: t('step4.sill_left'),
        sill_right: t('step4.sill_right'),
    };
    const MANDATORY_PHOTOS = store.getPhotoSlots().map(slot => ({
        id: slot.id,
        label: BUILT_IN_LABELS[slot.id] ?? slot.label,
    }));



    const hasMandatoryPhoto = (id: string, label: string) => {
        if (id === 'mileage_photo') return store.mileageImages && store.mileageImages.length > 0;
        if (id === 'vin_photo') return store.identificationImages && store.identificationImages.length > 0;
        return store.photos.some(p => p.mandatoryPhotoId === id || p.label === label);
    };

    const minderwertTypeOptions = [
        { value: '1', label: `1: ${t('minderwert.type1')}` },
        { value: '2', label: `2: ${t('minderwert.type2')}` },
        { value: '3', label: `3: ${t('minderwert.type3')}` },
    ];

    // Derive selected parts from minderwertRows and damages, translated to CarOverlay IDs
    const selectedParts = useMemo(() => {
        const minderwertParts = store.minderwertRows
            .filter(row => !!row.damage || !!row.repairMethod || (row.images && row.images.length > 0))
            .map(row => BODY_TO_OVERLAY[row.bodyPart] || row.bodyPart);

        const damageParts = store.damages
            .filter(d => !!d.bodyPart)
            .map(d => BODY_TO_OVERLAY[d.bodyPart] || d.bodyPart);

        return Array.from(new Set([...minderwertParts, ...damageParts]));
    }, [store.minderwertRows, store.damages]);

    const handlePartClick = (overlayId: string | null) => {
        if (!overlayId) return;
        // Reverse mapping from overlayId to BODY_PARTS id
        let partId = Object.keys(BODY_TO_OVERLAY).find(k => BODY_TO_OVERLAY[k] === overlayId) || overlayId;

        // Special mapping for mandatory photos
        if (overlayId === 'vin_number' || overlayId === 'vin_photo') {
            partId = 'vin_photo';
        } else if (overlayId === 'Meter_reading' || overlayId === 'mileage_photo') {
            partId = 'mileage_photo';
        }

        setActiveComponentId(partId);

        // Find the correct key used in componentRefs and mobile cards
        let refKey = partId;
        if (!componentRefs.current[partId]) {
            const matchingDamage = store.damages.find(d => d.bodyPart === partId);
            if (matchingDamage) {
                refKey = matchingDamage.id;
            }
        }

        // Auto-expand card on mobile
        setExpandedCards(prev => {
            const next = new Set(prev);
            next.add(refKey);
            return next;
        });

        // Auto-scroll to the component field with a short delay for smooth transition after rendering
        setTimeout(() => {
            const element = componentRefs.current[refKey];
            if (element) {
                scrollToElement(element);

                // Find and focus the first editable input, select, or textarea
                const input = element.querySelector('input:not([type="file"]):not([type="hidden"]), select, textarea') as HTMLElement;
                if (input) {
                    input.focus({ preventScroll: true });
                }
            }
        }, 150);
    };



    // Calculate total Minderwert (Brutto)
    const allPhotosForGallery = useMemo(() => {
        const result = [...store.photos];

        // Add virtual photos only if they aren't already in store.photos
        (store.mileageImages || []).forEach((data, i) => {
            if (!store.photos.some(p => p.data === data)) {
                result.push({
                    id: `mileage_v_${i}`,
                    data,
                    label: t('step4.mileage_photo'),
                    isVirtual: true,
                    syncField: 'mileageImages'
                } as any);
            }
        });

        (store.identificationImages || []).forEach((data, i) => {
            if (!store.photos.some(p => p.data === data)) {
                result.push({
                    id: `vin_v_${i}`,
                    data,
                    label: t('step4.vin_photo'),
                    isVirtual: true,
                    syncField: 'identificationImages'
                } as any);
            }
        });

        return result;
    }, [store.photos, store.mileageImages, store.identificationImages, t]);

    const totalDamagesMinderwert = store.damages.reduce((sum: number, d: any) => sum + (d.minderwertBrutto || 0), 0);
    const totalRowsMinderwert = store.minderwertRows.reduce((sum: number, r: any) => sum + (r.minderwertBrutto || 0), 0);
    const totalMinderwert = Math.round(totalDamagesMinderwert + totalRowsMinderwert);

    // Compute missing required photos for banner
    const hasMileagePhoto =
        (store.mileageImages && store.mileageImages.length > 0) ||
        store.photos.some(p => p.mandatoryPhotoId === 'mileage_photo');
    const hasVinPhoto =
        (store.identificationImages && store.identificationImages.length > 0) ||
        store.photos.some(p => p.mandatoryPhotoId === 'vin_photo');
    const missingStep2Photos = [
        ...(!hasMileagePhoto ? [t('step4.mileage_photo', 'Kilometerstand / Tacho')] : []),
        ...(!hasVinPhoto ? [t('step4.vin_photo', 'Fahrzeug-Ident.-Nr. / Typschild')] : []),
    ];

    return (
        <div className="animate-fade-in space-y-6">

            {/* ── Warning banner when Step-2 photos are missing ── */}
            {missingStep2Photos.length > 0 && (
                <div className="flex flex-col @3xl:flex-row items-start @3xl:items-center gap-4 p-4 bg-amber-50 border border-amber-300 rounded-xl shadow-sm animate-fade-in">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-800">
                                {lang === 'de' ? 'Pflichtfotos fehlen (Schritt 2)' : 'Required photos missing (Step 2)'}
                            </p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                {lang === 'de'
                                    ? `Bitte nehmen Sie folgende Fotos in Schritt 2 auf: ${missingStep2Photos.join(', ')}`
                                    : `Please capture the following photos in Step 2: ${missingStep2Photos.join(', ')}`
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm whitespace-nowrap"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {lang === 'de' ? 'Zu Schritt 2' : 'Go to Step 2'}
                    </button>
                </div>
            )}

            <SectionTitle>{t('step4.mandatoryPhotos')}</SectionTitle>
            <div className="grid grid-cols-1 @@7xl:grid-cols-2 @5xl:grid-cols-4 gap-4">
                {MANDATORY_PHOTOS.map(photo => {
                    const isPhotoRequired = isRequired(photo.id);
                    // Find all photos for this category (show newest first)
                    // For mileage/vin, also include images captured on Page 2 that live in
                    // dedicated fields (mileageImages / identificationImages) rather than store.photos
                    const categoryPhotos = [...store.photos.filter(p => p.mandatoryPhotoId === photo.id || p.label === photo.label)];

                    if (photo.id === 'mileage_photo') {
                        (store.mileageImages || []).forEach((data, i) => {
                            if (!categoryPhotos.some(p => p.data === data)) {
                                categoryPhotos.push({
                                    id: `mileage_v_${i}`,
                                    data,
                                    label: t('step4.mileage_photo'),
                                    fileName: `mileage_${i}.jpg`,
                                    mandatoryPhotoId: 'mileage_photo',
                                } as any);
                            }
                        });
                    } else if (photo.id === 'vin_photo') {
                        (store.identificationImages || []).forEach((data, i) => {
                            if (!categoryPhotos.some(p => p.data === data)) {
                                categoryPhotos.push({
                                    id: `vin_v_${i}`,
                                    data,
                                    label: t('step4.vin_photo'),
                                    fileName: `vin_${i}.jpg`,
                                    mandatoryPhotoId: 'vin_photo',
                                } as any);
                            }
                        });
                    }

                    const done = categoryPhotos.length > 0;
                    const isPhotoInvalid = showValidationErrors && !!validationErrors[photo.id];

                    return (
                        <Card
                            key={photo.id}
                            ref={el => { componentRefs.current[photo.id] = el; }}
                            data-fieldname={isPhotoInvalid ? photo.id : undefined}
                            className={`flex flex-col border-2 transition-all ${
                                adminMode
                                    ? (isPhotoRequired ? 'border-orange-400 bg-orange-50/40 ring-2 ring-orange-300/30' : 'border-dashed border-gray-300 bg-white')
                                    : isPhotoInvalid
                                        ? 'border-red-500 bg-red-50/10 ring-2 ring-red-500/10'
                                        : (done ? 'border-gray-200 bg-white' : (isPhotoRequired ? 'border-dashed border-orange-300 bg-orange-50/30' : 'border-gray-200 bg-white shadow-sm hover:shadow-md'))
                            }`}
                        >
                            {/* Card Header */}
                            <div className={`px-2.5 py-1.5 border-b flex justify-between items-center ${
                                adminMode
                                    ? (isPhotoRequired ? 'bg-orange-100/60' : 'bg-gray-50')
                                    : isPhotoInvalid ? 'bg-red-100/50' : (done ? 'bg-gray-50' : (isPhotoRequired ? 'bg-orange-100/50' : 'bg-white'))
                            }`}>
                                <div className="flex flex-col truncate pr-2">
                                    <span className="text-[11px] font-bold text-gray-800 truncate" title={photo.label}>{photo.label}</span>
                                    {!adminMode && isPhotoRequired && !done && <span className="text-[10px] text-orange-600 font-semibold uppercase">{t('admin.mandatory')}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!adminMode && done && (
                                        <div className="bg-green-100 text-green-700 p-1 rounded-full">
                                            <CheckCircle className="w-4 h-4" />
                                        </div>
                                    )}
                                    {adminMode && (
                                        <button
                                            onClick={() => onToggleRequired?.(photo.id)}
                                            title={isPhotoRequired ? 'Click to make optional' : 'Click to make required'}
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border transition-all active:scale-95 ${
                                                isPhotoRequired
                                                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm hover:bg-orange-600'
                                                    : 'bg-white border-gray-300 text-gray-400 hover:border-orange-400 hover:text-orange-500'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                isPhotoRequired ? 'bg-white' : 'bg-gray-300'
                                            }`} />
                                            {isPhotoRequired ? 'Pflicht' : 'Optional'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="flex-1 p-2 space-y-2">
                                {categoryPhotos.length > 0 ? (
                                    <div className="space-y-3">
                                        {categoryPhotos.map((p, idx) => (
                                            <PhotoThumbnail
                                                key={p.id}
                                                src={p.data}
                                                isExternal={p.isExternal || store.videoExpertImages?.includes(p.data)}
                                                onRemove={() => {
                                                    if ((p as any).isVirtual || p.id.startsWith('mileage_v_') || p.id.startsWith('vin_v_')) {
                                                        // Virtual photo — remove from the dedicated field
                                                        if (photo.id === 'mileage_photo') {
                                                            const remaining = (store.mileageImages || []).filter(img => img !== p.data);
                                                            store.updateField('mileageImages', remaining);
                                                        } else if (photo.id === 'vin_photo') {
                                                            const remaining = (store.identificationImages || []).filter(img => img !== p.data);
                                                            store.updateField('identificationImages', remaining);
                                                        }
                                                    } else {
                                                        removePhotoWithSync(p.id);
                                                    }
                                                }}
                                                onUpdate={(newSrc) => {
                                                    if ((p as any).isVirtual || p.id.startsWith('mileage_v_') || p.id.startsWith('vin_v_')) {
                                                        // Virtual photo — update the dedicated field
                                                        if (photo.id === 'mileage_photo') {
                                                            const updated = (store.mileageImages || []).map(img => img === p.data ? newSrc : img);
                                                            store.updateField('mileageImages', updated);
                                                        } else if (photo.id === 'vin_photo') {
                                                            const updated = (store.identificationImages || []).map(img => img === p.data ? newSrc : img);
                                                            store.updateField('identificationImages', updated);
                                                        }
                                                    } else {
                                                        updatePhoto(p.id, newSrc);
                                                    }
                                                }}
                                                className="w-full"
                                            />
                                        ))}

                                        <div className="grid grid-cols-2 gap-2">
                                            <label
                                                htmlFor={`camera-${photo.id}`}
                                                className="flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-gray-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group bg-white shadow-sm active:scale-95"
                                            >
                                                <Camera className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary" />
                                                <span className="text-[10px] font-bold">{t('step4.takePhoto')}</span>
                                            </label>
                                            <input
                                                id={`camera-${photo.id}`}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => handleAddPhoto(e, photo.id, photo.label)}
                                            />

                                            <label
                                                htmlFor={`gallery-${photo.id}`}
                                                className="flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-gray-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group bg-white shadow-sm active:scale-95"
                                            >
                                                <ImagePlus className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary" />
                                                <span className="text-[10px] font-bold">{t('step4.choosePhoto')}</span>
                                            </label>
                                            <input
                                                id={`gallery-${photo.id}`}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleAddPhoto(e, photo.id, photo.label)}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-5 px-3 gap-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm text-gray-400">
                                                <Camera className="w-5 h-5" />
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-600">{t('step4.addPhoto')}</span>
                                        </div>

                                        <div className="flex flex-col w-full gap-2">
                                            <label
                                                htmlFor={`initial-camera-${photo.id}`}
                                                className="flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-dark transition-all shadow-md active:scale-95 group"
                                            >
                                                <Camera className="w-4 h-4" />
                                                <span className="text-[11px] font-bold">{t('step4.takePhoto')}</span>
                                            </label>
                                            <input
                                                id={`initial-camera-${photo.id}`}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => handleAddPhoto(e, photo.id, photo.label)}
                                            />

                                            <label
                                                htmlFor={`initial-gallery-${photo.id}`}
                                                className="flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 transition-all shadow-sm active:scale-95 group"
                                            >
                                                <ImagePlus className="w-4 h-4 text-primary" />
                                                <span className="text-[11px] font-bold">{t('step4.choosePhoto')}</span>
                                            </label>
                                            <input
                                                id={`initial-gallery-${photo.id}`}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleAddPhoto(e, photo.id, photo.label)}
                                            />
                                        </div>

                                        <div className="px-3 py-1 bg-white/50 border border-gray-100 rounded-full text-[9px] font-bold text-gray-400">
                                            4:3 ASPECT RATIO
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}

                {/* Custom Photos as separate slots */}
                {(() => {
                    const customPhotos = [...store.photos.filter(p => p.mandatoryPhotoId?.startsWith('custom_overview_'))];
                    return (
                        <>
                            {customPhotos.map((p, idx) => (
                                <Card key={p.id} className="flex flex-col border-2 border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
                                    <div className="px-2.5 py-1.5 border-b flex justify-between items-center bg-gray-50">
                                        <div className="flex flex-col truncate pr-2">
                                            <span className="text-[11px] font-bold text-gray-800 truncate" title={translatePhotoLabel(p.label, t, lang) || `${t('step4.customOverview', 'Zusätzliche Übersicht')} ${idx + 1}`}>
                                                {p.label && p.label !== t('step4.customOverview', 'Zusätzliche Übersicht') ? translatePhotoLabel(p.label, t, lang) : `${t('step4.customOverview', 'Zusätzliche Übersicht')} ${idx + 1}`}
                                            </span>
                                        </div>
                                        <div className="bg-green-100 text-green-700 p-1 rounded-full flex-shrink-0">
                                            <CheckCircle className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1 p-2 flex flex-col justify-between gap-2">
                                        <PhotoThumbnail
                                            src={p.data}
                                            isExternal={p.isExternal || store.videoExpertImages?.includes(p.data)}
                                            onRemove={() => store.removePhoto(p.id)}
                                            onUpdate={(newSrc) => updatePhoto(p.id, newSrc)}
                                            className="w-full"
                                        />
                                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider select-none">
                                                    {t('step4.photoLabel', 'Bildbezeichnung')}
                                                </span>
                                                <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-md hover:border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all px-2 py-1">
                                                    <input
                                                        className="w-full bg-transparent border-none p-0 text-[11px] text-gray-800 font-semibold focus:ring-0 outline-none placeholder-gray-500"
                                                        value={translatePhotoLabel(p.label, t, lang)}
                                                        onChange={e => store.updatePhoto(p.id, { label: e.target.value })}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        placeholder={t('step4.photoPlaceholder', 'Titel...')}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider select-none">
                                                    {t('step4.captionPlaceholder', 'Bildunterschrift...').replace(' hinzufügen...', '')}
                                                </span>
                                                <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-md hover:border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all px-2 py-1">
                                                    <input
                                                        className="w-full bg-transparent border-none p-0 text-[10px] text-gray-700 focus:ring-0 outline-none placeholder-gray-500 italic"
                                                        value={(p as any).caption || ''}
                                                        onChange={e => store.updatePhoto(p.id, { caption: e.target.value })}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        placeholder={t('step4.captionPlaceholder', 'Bildunterschrift...')}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}

                            {/* Add Button as a Card */}
                            <Card className="flex flex-col border-2 border-dashed border-gray-200 bg-gray-50/30 hover:bg-primary/5 transition-all group min-h-[150px]">
                                <div className="px-2.5 py-1.5 border-b flex justify-between items-center bg-white/50">
                                    <span className="text-[11px] font-bold text-gray-400">{t('step4.addCustomOverview', 'Weitere Übersicht')}</span>
                                    <Plus className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-sm text-gray-400 group-hover:scale-110 transition-all duration-300">
                                            <Camera className="w-4.5 h-4.5" />
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-500">{t('step4.addPhoto')}</span>
                                    </div>
                                    <div className="flex flex-col w-full gap-2">
                                        <label
                                            htmlFor="custom-camera-add"
                                            className="flex items-center justify-center gap-2 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-dark transition-all shadow-sm active:scale-95 group"
                                        >
                                            <Camera className="w-4 h-4" />
                                            <span className="text-[11px] font-bold">{t('step4.takePhoto')}</span>
                                        </label>
                                        <input
                                            id="custom-camera-add"
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => handleAddPhoto(e, '', t('step4.customOverview', 'Zusätzliche Übersicht'), true)}
                                        />

                                        <label
                                            htmlFor="custom-gallery-add"
                                            className="flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 transition-all shadow-sm active:scale-95 group"
                                        >
                                            <ImagePlus className="w-4 h-4 text-primary" />
                                            <span className="text-[11px] font-bold">{t('step4.choosePhoto')}</span>
                                        </label>
                                        <input
                                            id="custom-gallery-add"
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleAddPhoto(e, '', t('step4.customOverview', 'Zusätzliche Übersicht'), true)}
                                        />
                                    </div>
                                </div>
                            </Card>
                        </>
                    );
                })()}
            </div>


            {/* Unified Damage & Depreciation Assessment */}
            <SectionTitle>{t('minderwert.title')}</SectionTitle>
            <Card>
                {/* Car Diagram — portrait aspect matches SVG viewBox (~541×820) so full car fills width */}
                <div className="flex justify-center mb-8">
                    <div className="w-full max-w-md @5xl:max-w-lg">
                        <div className="relative aspect-[541/820] w-full">
                            <div className="absolute inset-0">
                                <CarOverlay
                                    selectedParts={selectedParts}
                                    onPartSelected={handlePartClick}
                                    savedScreenshots={{}}
                                    onViewScreenshot={() => { }}
                                    hideSelectedList
                                    readOnly={false}
                                    showControls={false}
                                    svgContainerStyle={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center italic">{t('step3.clickPartDiagram')}</p>
                    </div>
                </div>

                {/* Unified Table */}
                {/* Unified Layout: Table for Desktop, Cards for Mobile */}
                <div className="-mx-4 @3xl:mx-0 font-sans">
                    {/* Desktop Table - Hidden on Mobile */}
                    <div className="hidden @5xl:block overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="table-header pl-4">{t('minderwert.bodyPart')}</th>
                                    <th className="table-header w-20">{t('step4.photoActions')}</th>
                                    <th className="table-header">{t('minderwert.damageCol')}</th>

                                    <th className="table-header w-24">{t('minderwert.repairCode')}</th>
                                    {!isVehicleEvaluation && <th className="table-header w-24">{t('step4.repairCost')}</th>}

                                    {!isVehicleEvaluation && <th className="table-header w-24">{t('step4.anrechnung')}</th>}
                                    {!isVehicleEvaluation && <th className="table-header text-right w-24 pr-4">{t('sidebar.minderwertBrutto')}</th>}
                                    <th className="table-header w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* 1. Pre-filled Body Parts (MinderwertRows) */}
                                {store.minderwertRows.filter(r => !r.isCustom).map(row => {
                                    const isActive = row.bodyPart === activeComponentId;
                                    const mw = row.minderwertBrutto || 0;

                                    return (
                                        <tr
                                            key={row.id}
                                            className={`hover:bg-gray-50 border-b transition-colors ${isActive ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}
                                            onClick={() => setActiveComponentId(row.bodyPart || null)}
                                        >
                                            <td
                                                ref={el => { if (row.bodyPart) componentRefs.current[row.bodyPart] = el; }}
                                                className="table-cell pl-4 text-xs font-medium"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${row.repairCost > 0 || (row.images && row.images.length > 0) ? 'bg-orange-500 shadow-[0_0_8px_rgba(238,119,0,0.5)]' : 'bg-gray-200'}`} />
                                                    <span>{t(`bodyParts.${row.bodyPart}`, row.bodyPart)}</span>
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="flex items-center gap-1">
                                                        <label className="p-1 px-1.5 bg-white border border-gray-200 rounded-md cursor-pointer text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.takePhoto')}>
                                                            <Camera className="w-3.5 h-3.5" />
                                                            <input type="file" accept="image/*" capture="environment" onChange={e => handleMinderwertPhoto(e, row.id)} className="hidden" />
                                                        </label>
                                                        <label className="p-1 px-1.5 bg-white border border-gray-200 rounded-md cursor-pointer text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.choosePhoto')}>
                                                            <ImagePlus className="w-3.5 h-3.5" />
                                                            <input type="file" multiple accept="image/*" onChange={e => handleMinderwertPhoto(e, row.id)} className="hidden" />
                                                        </label>
                                                    </div>
                                                    {row.images && row.images.length > 0 && (
                                                        <div className="flex flex-wrap justify-center gap-1">
                                                            {row.images.map((img, idx) => (
                                                                <PhotoThumbnail
                                                                    key={idx}
                                                                    src={img}
                                                                    isExternal={store.videoExpertImages?.includes(img)}
                                                                    onRemove={() => store.removeMinderwertPhoto(row.id, idx)}
                                                                    onUpdate={(newSrc) => updateMinderwertPhoto(row.id, idx, newSrc)}
                                                                    className="w-14 h-10"
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="table-cell text-xs">
                                                {(() => {
                                                    const standardOptions = getEffectiveDamageTypes();
                                                    const isCustomTyped = row.damage === 'custom' || (row.damage && !standardOptions.some(o => o.value === row.damage));

                                                    if (isCustomTyped) {
                                                        return (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="text"
                                                                    className="form-input py-1 text-xs w-full bg-white border-gray-300 focus:border-primary"
                                                                    value={row.damage === 'custom' ? '' : row.damage}
                                                                    placeholder={t('step4.customDamagePlaceholder', 'Schaden eingeben...')}
                                                                    onClick={e => e.stopPropagation()}
                                                                    onChange={e => store.updateMinderwertRow(row.id, { damage: e.target.value as any })}
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        store.updateMinderwertRow(row.id, { damage: '' });
                                                                    }}
                                                                    className="p-1 text-gray-400 hover:text-red-500"
                                                                    title={t('common.cancel', 'Abbrechen')}
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <select
                                                            className="form-input py-1 text-xs w-full bg-transparent border-gray-200 focus:bg-white"
                                                            value={row.damage || ''}
                                                            onChange={e => store.updateMinderwertRow(row.id, { damage: e.target.value as any })}
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            {standardOptions.map(o => (
                                                                <option key={o.value} value={o.value}>
                                                                    {o.value === 'custom' || o.value === ''
                                                                        ? o.labelDe
                                                                        : (lang === 'de' ? o.labelDe : o.labelEn)
                                                                    }
                                                                </option>
                                                            ))}
                                                        </select>
                                                    );
                                                })()}
                                            </td>


                                            <td className="table-cell">
                                                {(() => {
                                                    // Determine warning state for this repair code
                                                    const selectedCodeId = row.estimateRepairCodeId || '';
                                                    const bodyPartId = row.bodyPart || '';
                                                    const vehicleCat = store.vehicleCategory || '';
                                                    let priceWarning: 'none' | 'no-price' | 'manual' = 'none';
                                                    if (selectedCodeId && bodyPartId && vehicleCat) {
                                                        const price = lookupEstimatePrice(
                                                            store.globalConfig?.estimateConfig,
                                                            bodyPartId,
                                                            selectedCodeId as any,
                                                            vehicleCat
                                                        );
                                                        if (price === 0) priceWarning = 'no-price';
                                                        else if (price === null || price === undefined) priceWarning = 'manual';
                                                    }
                                                    return (
                                                        <div className="flex flex-col gap-0.5">
                                                            <select
                                                                className="form-input py-1 text-xs w-full bg-transparent border-gray-200 focus:bg-white"
                                                                value={(row.repairCodeIndex > 0) ? row.repairCodeIndex.toString() : (row.estimateRepairCodeId ? `custom:${row.estimateRepairCodeId}` : (row.repairMethod || ''))}
                                                                onClick={e => e.stopPropagation()}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    if (val.startsWith('custom:')) {
                                                                        const customId = val.substring(7);
                                                                        store.updateMinderwertRow(row.id, { estimateRepairCodeId: customId, repairCodeIndex: 0 });
                                                                    } else {
                                                                        const idx = parseInt(val);
                                                                        if (!isNaN(idx) && idx > 0) {
                                                                            store.updateMinderwertRow(row.id, { repairCodeIndex: idx, estimateRepairCodeId: undefined });
                                                                        } else {
                                                                            store.updateMinderwertRow(row.id, { repairCodeIndex: 0, repairMethod: val as any, estimateRepairCodeId: undefined });
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">{t('common.pleaseSelect')}</option>

                                                                <optgroup label={t('minderwert.standardRepairCodes', 'Kalkulations-Codes')}>
                                                                    {ESTIMATE_REPAIR_CODE_IDS.map(codeId => {
                                                                        const labels = ESTIMATE_REPAIR_CODE_LABELS[codeId];
                                                                        const label = lang === 'de' ? labels.de : labels.en;
                                                                        return (
                                                                            <option key={codeId} value={`custom:${codeId}`}>
                                                                                {label}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </optgroup>

                                                                {store.globalConfig?.estimateConfig?.customRepairCodes && store.globalConfig.estimateConfig.customRepairCodes.length > 0 && (
                                                                    <optgroup label={t('minderwert.customRepairCodes', 'Custom Repair Codes')}>
                                                                        {store.globalConfig.estimateConfig.customRepairCodes.map(c => (
                                                                            <option key={c.id} value={`custom:${c.id}`}>
                                                                                {lang === 'de' ? c.labelDe : c.labelEn}
                                                                            </option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                            </select>
                                                            {(priceWarning === 'no-price' || priceWarning === 'manual') && (
                                                                <div className="flex items-center gap-1 text-amber-600 text-[9px] font-bold leading-tight">
                                                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                                    <span>
                                                                        {priceWarning === 'no-price'
                                                                            ? t('admin.kalkulation.noPriceDefined', 'No price defined')
                                                                            : t('admin.kalkulation.manualCalcRequired', 'Manual calc required')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            {!isVehicleEvaluation && (
                                                <>
                                                    <td className="table-cell">
                                                        <div className="flex items-center gap-1">
                                                        {/* {row.repairCostBrutto}
                                                        {Math.round(calcBrutto(row.repairCost) * 100) / 100} */}
                                                            <input
                                                                className={`form-input py-1 w-full text-xs font-mono text-right bg-transparent border-gray-200 focus:bg-white ${row.repairCodeIndex > 0 ? 'text-primary font-bold' : ''}`}
                                                                type="number"
                                                                step="0.01"
                                                                value={row.repairCost === 0 ? '' : (row.repairCostBrutto || (Math.round(calcBrutto(row.repairCost) * 100) / 100))}
                                                                onClick={e => e.stopPropagation()}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    store.updateMinderwertRow(row.id, {
                                                                        repairCost: calcNetto(val),
                                                                        repairCostBrutto: val
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    </td>

                                                    <td className="table-cell">
                                                        <div className="flex flex-col gap-1">
                                                            <select
                                                                className="form-input py-1 text-xs w-full bg-transparent border-gray-200 focus:bg-white font-medium"
                                                                value={
                                                                    row.anrechnung === 'kein'
                                                                        ? 'keine'
                                                                        : row.anrechnung === 'pro-rata'
                                                                        ? 'anteilig'
                                                                        : (row.anrechnung || 'keine')
                                                                }
                                                                onClick={e => e.stopPropagation()}
                                                                onChange={e => store.updateMinderwertRow(row.id, { anrechnung: e.target.value as any })}
                                                            >
                                                                {ANRECHNUNG_OPTIONS.map(a => (
                                                                    <option key={a.value} value={a.value}>{t(`anrechnungOptions.${a.value}`, a.labelDe)}</option>
                                                                ))}
                                                            </select>
                                                            {(row.anrechnung === 'pro-rata' || row.anrechnung === 'anteilig') && (() => {
                                                                const matrix = store.globalConfig?.depreciationMatrix || [];
                                                                if (matrix.length === 0) return <span className="text-[9px] text-amber-600 font-bold">⚠ Keine Matrix</span>;
                                                                let ageMonths = 0;
                                                                if (store.firstRegistration) {
                                                                    try {
                                                                        const reg = parseGermanDate(store.firstRegistration);
                                                                        if (reg) {
                                                                            const now = new Date();
                                                                            ageMonths = (now.getFullYear() - reg.getFullYear()) * 12 + (now.getMonth() - reg.getMonth());
                                                                            if (now.getDate() < reg.getDate()) {
                                                                                ageMonths--;
                                                                            }
                                                                            if (ageMonths < 0) ageMonths = 0;
                                                                        }
                                                                    } catch { }
                                                                }
                                                                const mileage = store.mileage || 0;
                                                                const factor = lookupDepreciationMatrixFactor(ageMonths, mileage, matrix);
                                                                if (factor === null) return <span className="text-[9px] text-amber-600 font-bold">⚠ Kein Treffer</span>;
                                                                return <span className="text-[9px] text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 font-bold">Faktor: {factor.toFixed(3)} → {(factor * 100).toFixed(1)}%</span>;
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="table-cell font-mono text-xs text-right pr-4 font-bold">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {row.isManualMinderwert && (
                                                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded uppercase font-bold" title={t('minderwert.manualOverride', 'Manuell angepasst')}>M</span>
                                                            )}
                                                            <input
                                                                className={`w-20 bg-transparent border-none p-0 text-right font-bold focus:ring-0 ${row.isManualMinderwert ? 'text-amber-600' : 'text-primary'}`}
                                                                type="number"
                                                                step="1"
                                                                value={mw === 0 ? '' : Math.round(mw)}
                                                                onChange={e => {
                                                                    const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
                                                                    store.updateMinderwertRow(row.id, {
                                                                        minderwertBrutto: val,
                                                                        isManualMinderwert: true
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="table-cell"></td>
                                        </tr>
                                    );
                                })}

                                {/* Divider for dynamic positions */}
                                {store.damages.length > 0 && (
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={12} className="py-2.5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] border-y border-gray-100">
                                            {t('step4.addDamage', 'Zusätzliche Positionen')}
                                        </td>
                                    </tr>
                                )}

                                {store.damages.map(damage => {
                                    const mw = damage.minderwertBrutto || 0;
                                    const isInterior = damage.type === 'interior';
                                    const isManual = damage.type === 'manual';
                                    const isActive = activeComponentId === damage.id;
                                    const isInvalid = showValidationErrors && (!damage.description || !damage.description.trim()) && (!damage.images || damage.images.length === 0);

                                    return (
                                        <tr
                                            key={damage.id}
                                            data-fieldname={isInvalid ? "damages" : undefined}
                                            className={`hover:bg-gray-50 border-b transition-colors ${
                                                isInvalid
                                                    ? 'bg-red-50/10 border-red-500 border-2'
                                                    : (isActive ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : '')
                                            }`}
                                            onClick={() => setActiveComponentId(damage.id)}
                                        >
                                            <td className="table-cell pl-4" ref={el => { componentRefs.current[damage.id] = el; }}>
                                                {isManual ? (
                                                    <input
                                                        type="text"
                                                        placeholder={t('step4.partNamePlaceholder', 'Bauteil Name')}
                                                        className="form-input py-1 text-xs w-full bg-transparent border-gray-200 focus:bg-white font-medium"
                                                        value={damage.bodyPart}
                                                        onClick={e => e.stopPropagation()}
                                                        onChange={e => store.updateDamage(damage.id, { bodyPart: e.target.value })}
                                                    />
                                                ) : isInterior ? (
                                                    <div className="flex items-center gap-2 font-bold text-xs text-primary">
                                                        {(() => {
                                                            const p = INTERIOR_PARTS.find(ip => ip.id === damage.bodyPart);
                                                            const Icon = INTERIOR_PART_ICONS[damage.bodyPart] || FileText;
                                                            return (
                                                                <>
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                    <span>{p ? (lang === 'de' ? p.labelDe : p.labelEn) : damage.bodyPart}</span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <select
                                                        className="form-input py-1 text-xs w-full bg-transparent border-gray-200 focus:bg-white font-medium"
                                                        value={damage.bodyPart}
                                                        onClick={e => e.stopPropagation()}
                                                        onChange={e => store.updateDamage(damage.id, { bodyPart: e.target.value })}
                                                    >
                                                        <option value="">{t('common.noneSelected')}</option>
                                                        <optgroup label={t('step4.bodyParts', 'Karosserieteile')}>
                                                            {BODY_PARTS.map(p => <option key={p.id} value={p.id}>{t(`bodyParts.${p.id}`, p.labelDe)}</option>)}
                                                        </optgroup>
                                                        <optgroup label={t('step4.dynamicPositions', 'Zusätzliche Positionen')}>
                                                            {store.getEffectiveRepairPositions().filter(p => p.active).map(p => (
                                                                <option key={p.id} value={p.id}>{t(`bodyParts.${p.id}`, p.name)}</option>
                                                            ))}
                                                        </optgroup>
                                                        <optgroup label={t('step4.interiorParts', 'Innenraum')}>
                                                            {INTERIOR_PARTS.map(p => <option key={p.id} value={p.id}>{lang === 'de' ? p.labelDe : p.labelEn}</option>)}
                                                        </optgroup>
                                                    </select>
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className={`flex items-center gap-1 p-1 rounded-md ${isInvalid ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                                                        <label className="p-1 px-1.5 bg-white border border-gray-200 rounded-md cursor-pointer text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.takePhoto')} onClick={e => e.stopPropagation()}>
                                                            <Camera className="w-3.5 h-3.5" />
                                                            <input type="file" accept="image/*" capture="environment" onChange={e => handleDamagePhoto(e, damage.id)} className="hidden" />
                                                        </label>
                                                        <label className="p-1 px-1.5 bg-white border border-gray-200 rounded-md cursor-pointer text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.choosePhoto')} onClick={e => e.stopPropagation()}>
                                                            <ImagePlus className="w-3.5 h-3.5" />
                                                            <input type="file" multiple accept="image/*" onChange={e => handleDamagePhoto(e, damage.id)} className="hidden" />
                                                        </label>
                                                    </div>
                                                    {damage.images && damage.images.length > 0 && (
                                                        <div className="flex flex-wrap justify-center gap-1">
                                                            {damage.images.map((img, idx) => (
                                                                <PhotoThumbnail
                                                                    key={idx}
                                                                    src={img}
                                                                    isExternal={store.videoExpertImages?.includes(img)}
                                                                    onRemove={() => store.removeDamagePhoto(damage.id, idx)}
                                                                    onUpdate={(newSrc) => updateDamagePhoto(damage.id, idx, newSrc)}
                                                                    className="w-14 h-10"
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <input
                                                    type="text"
                                                    placeholder={t('minderwert.damageCol')}
                                                    className={`form-input py-1 text-xs w-full bg-transparent focus:bg-white ${
                                                        isInvalid ? 'border-2 border-red-500 bg-red-50/10 focus:border-red-600' : 'border-gray-200'
                                                    }`}
                                                    value={damage.description || ''}
                                                    onClick={e => e.stopPropagation()}
                                                    onChange={e => store.updateDamage(damage.id, { description: e.target.value })}
                                                />
                                            </td>
                                            <td className="table-cell">
                                                {(() => {
                                                    // Determine price warning for this damage row
                                                    const selectedCodeId = damage.estimateRepairCodeId || '';
                                                    const bodyPartId = damage.bodyPart || '';
                                                    const vehicleCat = store.vehicleCategory || '';
                                                    let priceWarning: 'none' | 'no-price' | 'manual' = 'none';
                                                    if (selectedCodeId && bodyPartId && vehicleCat) {
                                                        const price = lookupEstimatePrice(
                                                            store.globalConfig?.estimateConfig,
                                                            bodyPartId,
                                                            selectedCodeId as any,
                                                            vehicleCat
                                                        );
                                                        if (price === 0) priceWarning = 'no-price';
                                                        else if (price === null || price === undefined) priceWarning = 'manual';
                                                    }
                                                    return (
                                                        <div className="flex flex-col gap-0.5">
                                                            <select
                                                                className="form-input py-1 text-xs w-full font-medium bg-transparent border-gray-200 focus:bg-white"
                                                                value={damage.estimateRepairCodeId ? `custom:${damage.estimateRepairCodeId}` : (damage.repairMethod || '')}
                                                                onClick={e => e.stopPropagation()}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    if (val.startsWith('custom:')) {
                                                                        const customId = val.substring(7);
                                                                        const flatPrice = store.vehicleCategory
                                                                            ? lookupEstimatePrice(
                                                                                store.globalConfig?.estimateConfig,
                                                                                damage.bodyPart,
                                                                                customId as any,
                                                                                store.vehicleCategory
                                                                            )
                                                                            : 0;
                                                                        store.updateDamage(damage.id, {
                                                                            estimateRepairCodeId: customId as any,
                                                                            repairMethod: customId as any,
                                                                            repairCostBrutto: flatPrice
                                                                        });
                                                                    } else {
                                                                        store.updateDamage(damage.id, {
                                                                            estimateRepairCodeId: '',
                                                                            repairMethod: val as any
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">{t('common.pleaseSelect')}</option>
                                                                <optgroup label={lang === 'de' ? 'Reparaturcodes' : 'Repair Codes'}>
                                                                    {ESTIMATE_REPAIR_CODE_IDS.map(codeId => (
                                                                        <option key={codeId} value={`custom:${codeId}`}>
                                                                            {ESTIMATE_REPAIR_CODE_LABELS[codeId][lang]}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                                {store.globalConfig?.estimateConfig?.customRepairCodes && store.globalConfig.estimateConfig.customRepairCodes.length > 0 && (
                                                                    <optgroup label={t('minderwert.customRepairCodes', 'Custom Repair Codes')}>
                                                                        {store.globalConfig.estimateConfig.customRepairCodes.map(c => (
                                                                            <option key={c.id} value={`custom:${c.id}`}>
                                                                                {lang === 'de' ? c.labelDe : c.labelEn}
                                                                            </option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                            </select>
                                                            {(priceWarning === 'no-price' || priceWarning === 'manual') && (
                                                                <div className="flex items-center gap-1 text-amber-600 text-[9px] font-bold leading-tight">
                                                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                                    <span>
                                                                        {priceWarning === 'no-price'
                                                                            ? t('admin.kalkulation.noPriceDefined', 'No price defined')
                                                                            : t('admin.kalkulation.manualCalcRequired', 'Manual calc required')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            {!isVehicleEvaluation && (
                                                <>
                                                    <td className="table-cell">
                                                        <input
                                                            className="form-input py-1 w-full text-xs font-mono text-right bg-transparent border-gray-200 focus:bg-white"
                                                            type="number"
                                                            step="0.01"
                                                            value={damage.repairCostBrutto === 0 ? '' : damage.repairCostBrutto}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => store.updateDamage(damage.id, { repairCostBrutto: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                                        />
                                                    </td>

                                                    <td className="table-cell">
                                                        <div className="flex flex-col gap-1">
                                                            <select
                                                                className="form-input py-1 text-xs w-full bg-transparent border-gray-200 focus:bg-white font-medium"
                                                                value={
                                                                    damage.anrechnung === 'kein'
                                                                        ? 'keine'
                                                                        : damage.anrechnung === 'pro-rata'
                                                                        ? 'anteilig'
                                                                        : (damage.anrechnung || 'keine')
                                                                }
                                                                onClick={e => e.stopPropagation()}
                                                                onChange={e => store.updateDamage(damage.id, { anrechnung: e.target.value as any })}
                                                            >
                                                                {ANRECHNUNG_OPTIONS.map(a => (
                                                                    <option key={a.value} value={a.value}>{t(`anrechnungOptions.${a.value}`, a.labelDe)}</option>
                                                                ))}
                                                            </select>

                                                            {(damage.anrechnung === 'pro-rata' || damage.anrechnung === 'anteilig') && (() => {
                                                                const matrix = store.globalConfig?.depreciationMatrix || [];
                                                                if (matrix.length === 0) return <span className="text-[9px] text-amber-600 font-bold">⚠ Keine Matrix</span>;
                                                                let ageMonths = 0;
                                                                if (store.firstRegistration) {
                                                                    try {
                                                                        const reg = parseGermanDate(store.firstRegistration);
                                                                        if (reg) {
                                                                            const now = new Date();
                                                                            ageMonths = (now.getFullYear() - reg.getFullYear()) * 12 + (now.getMonth() - reg.getMonth());
                                                                            if (now.getDate() < reg.getDate()) {
                                                                                ageMonths--;
                                                                            }
                                                                            if (ageMonths < 0) ageMonths = 0;
                                                                        }
                                                                    } catch { }
                                                                }
                                                                const mileage = store.mileage || 0;
                                                                const factor = lookupDepreciationMatrixFactor(ageMonths, mileage, matrix);
                                                                if (factor === null) return <span className="text-[9px] text-amber-600 font-bold">⚠ Kein Treffer</span>;
                                                                return <span className="text-[9px] text-violet-700 bg-violet-50 border border-violet-200 rounded px-1 py-0.5 font-bold">Faktor: {factor.toFixed(3)} → {((1 - factor) * 100).toFixed(1)}%</span>;
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="table-cell font-mono text-xs text-right pr-4 font-bold">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {damage.isManualMinderwert && (
                                                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded uppercase font-bold" title={t('minderwert.manualOverride', 'Manuell angepasst')}>M</span>
                                                            )}
                                                            <input
                                                                className={`w-20 bg-transparent border-none p-0 text-right font-bold focus:ring-0 ${damage.isManualMinderwert ? 'text-amber-600' : 'text-primary'}`}
                                                                type="number"
                                                                step="1"
                                                                value={mw === 0 ? '' : Math.round(mw)}
                                                                onClick={e => e.stopPropagation()}
                                                                onChange={e => {
                                                                    const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
                                                                    store.updateDamage(damage.id, {
                                                                        minderwertBrutto: val,
                                                                        isManualMinderwert: true
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="table-cell pr-2">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingDamageId(damage.id); }}
                                                        className="p-1 text-gray-400 hover:text-primary transition-colors"
                                                        title={t('common.edit', 'Bearbeiten')}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); store.removeDamage(damage.id); }}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            {!isVehicleEvaluation && (
                                <tfoot>
                                    <tr className="bg-primary/5 border-t-2 border-primary/10 font-bold">
                                        <td className="table-cell pl-4" colSpan={6}>{t('minderwert.total')}</td>
                                        <td className="table-cell font-mono text-right text-primary pr-4">{formatCurrency(totalMinderwert)}</td>
                                        <td className="table-cell"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Mobile Cards - Hidden on Desktop */}
                    <div className="@5xl:hidden space-y-3 px-1 pb-4">
                        {[...store.minderwertRows.filter(r => !r.isCustom), ...store.damages].map((item: any) => {
                            // Correctly identify if this is a user-added damage entry (should have a delete button)
                            const isUserAdded = store.damages.some(d => d.id === item.id);
                            const mw = item.minderwertBrutto || 0;
                            const cardKey = isUserAdded ? item.id : item.bodyPart;
                            const isCardInvalid = showValidationErrors && isUserAdded && (!item.description || !item.description.trim()) && (!item.images || item.images.length === 0);
                            const isExpanded = expandedCards.has(cardKey) || isCardInvalid;
                            const isActive = activeComponentId === cardKey;
                            const hasDamage = item.repairCost > 0 || item.repairCostBrutto > 0 || (item.images && item.images.length > 0);

                            return (
                                <div
                                    key={item.id}
                                    ref={el => { componentRefs.current[cardKey] = el; }}
                                    data-fieldname={isCardInvalid ? "damages" : undefined}
                                    className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 shadow-sm bg-white ${
                                        isCardInvalid
                                            ? 'border-red-500 bg-red-50/10 ring-2 ring-red-500/10'
                                            : (isActive ? 'border-primary ring-4 ring-primary/5' : 'border-gray-100')
                                    }`}
                                >
                                    {/* Card Header — click to expand/collapse */}
                                    <button
                                        type="button"
                                        className={`w-full px-4 py-3 flex justify-between items-center transition-colors text-left ${isExpanded
                                            ? (isActive ? 'bg-primary/5 border-b border-primary/10' : 'bg-gray-50 border-b border-gray-100')
                                            : 'bg-white'
                                            }`}
                                        onClick={() => {
                                            setActiveComponentId(cardKey);
                                            toggleCard(cardKey);
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-white shadow-sm transition-all duration-300 ${hasDamage ? 'bg-orange-500 scale-110' : 'bg-gray-200'}`} />
                                            <div className="flex flex-col text-left">
                                                <span className={`text-[13px] font-bold tracking-tight ${isActive ? 'text-primary' : 'text-gray-800'}`}>
                                                    {isUserAdded && item.type === 'manual' ? (item.bodyPart || t('step4.manualEntry')) : t(`bodyParts.${item.bodyPart}`, item.bodyPart)}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isUserAdded ? t('step4.addDamage') : t('minderwert.title')}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {mw > 0 && !isVehicleEvaluation && (
                                                <div className="text-[11px] font-bold text-primary">{formatCurrency(mw)}</div>
                                            )}
                                            {isUserAdded && (
                                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingDamageId(item.id); }}
                                                        className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                                                        title={t('common.edit', 'Bearbeiten')}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); store.removeDamage(item.id); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            <ChevronDown
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </div>
                                    </button>

                                    {/* Card Body — only rendered when expanded */}
                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                key="body"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div className="p-4 space-y-4">
                                                    {/* Main Fields Grid */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="col-span-2">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{t('minderwert.damageCol')}</label>
                                                            {!isUserAdded ? (
                                                                (() => {
                                                                    const standardOptions = getEffectiveDamageTypes();
                                                                    const isCustomTyped = item.damage === 'custom' || (item.damage && !standardOptions.some(o => o.value === item.damage));

                                                                    if (isCustomTyped) {
                                                                        return (
                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-input py-2 text-sm w-full bg-white border-gray-300 focus:border-primary rounded-xl"
                                                                                    value={item.damage === 'custom' ? '' : item.damage}
                                                                                    placeholder={t('step4.customDamagePlaceholder', 'Schaden eingeben...')}
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    onChange={e => store.updateMinderwertRow(item.id, { damage: e.target.value as any })}
                                                                                    autoFocus
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        store.updateMinderwertRow(item.id, { damage: '' });
                                                                                    }}
                                                                                    className="p-1 text-gray-400 hover:text-red-500"
                                                                                    title={t('common.cancel', 'Abbrechen')}
                                                                                >
                                                                                    <X className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <select
                                                                            className="form-input py-2 text-sm w-full bg-white border-gray-200 focus:ring-primary/20 rounded-xl"
                                                                            value={item.damage || ''}
                                                                            onClick={e => e.stopPropagation()}
                                                                            onChange={e => store.updateMinderwertRow(item.id, { damage: e.target.value as any })}
                                                                        >
                                                                            {standardOptions.map(o => (
                                                                                <option key={o.value} value={o.value}>
                                                                                    {o.value === 'custom' || o.value === ''
                                                                                        ? o.labelDe
                                                                                        : (lang === 'de' ? o.labelDe : o.labelEn)
                                                                                    }
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    );
                                                                })()
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    placeholder={t('minderwert.damageCol')}
                                                                    className={`form-input py-2 text-sm w-full bg-white focus:ring-primary/20 rounded-xl ${isCardInvalid ? 'border-2 border-red-500 bg-red-50/10' : 'border-gray-200'}`}
                                                                    value={item.description || ''}
                                                                    onClick={e => e.stopPropagation()}
                                                                    onChange={e => store.updateDamage(item.id, { description: e.target.value })}
                                                                />
                                                            )}
                                                        </div>

                                                        <div>

                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{t('minderwert.repairCode')}</label>
                                                            {!isUserAdded ? (
                                                                <select
                                                                    className="form-input py-2 text-sm w-full bg-white border-gray-200 focus:ring-primary/20 rounded-xl"
                                                                    value={(item.repairCodeIndex > 0) ? item.repairCodeIndex.toString() : (item.estimateRepairCodeId ? `custom:${item.estimateRepairCodeId}` : (item.repairMethod || ''))}
                                                                    onClick={e => e.stopPropagation()}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        if (val.startsWith('custom:')) {
                                                                            const customId = val.substring(7);
                                                                            store.updateMinderwertRow(item.id, { estimateRepairCodeId: customId, repairCodeIndex: 0 });
                                                                        } else {
                                                                            const idx = parseInt(val);
                                                                            if (!isNaN(idx) && idx > 0) {
                                                                                store.updateMinderwertRow(item.id, { repairCodeIndex: idx, estimateRepairCodeId: undefined });
                                                                            } else {
                                                                                store.updateMinderwertRow(item.id, { repairCodeIndex: 0, repairMethod: val as any, estimateRepairCodeId: undefined });
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">{t('common.pleaseSelect')}</option>

                                                                    <optgroup label={t('minderwert.standardRepairCodes', 'Kalkulations-Codes')}>
                                                                        {ESTIMATE_REPAIR_CODE_IDS.map(codeId => {
                                                                            const labels = ESTIMATE_REPAIR_CODE_LABELS[codeId];
                                                                            const label = lang === 'de' ? labels.de : labels.en;
                                                                            return (
                                                                                <option key={codeId} value={`custom:${codeId}`}>
                                                                                    {label}
                                                                                </option>
                                                                            );
                                                                        })}
                                                                    </optgroup>

                                                                    {store.globalConfig?.estimateConfig?.customRepairCodes && store.globalConfig.estimateConfig.customRepairCodes.length > 0 && (
                                                                        <optgroup label={t('minderwert.customRepairCodes', 'Custom Repair Codes')}>
                                                                            {store.globalConfig.estimateConfig.customRepairCodes.map(c => (
                                                                                <option key={c.id} value={`custom:${c.id}`}>
                                                                                    {lang === 'de' ? c.labelDe : c.labelEn}
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    )}



                                                                </select>
                                                            ) : (
                                                                <select
                                                                    className="form-input py-2 text-sm w-full bg-white border-gray-200 focus:ring-primary/20 rounded-xl font-medium"
                                                                    value={item.estimateRepairCodeId ? `custom:${item.estimateRepairCodeId}` : (item.repairMethod || '')}
                                                                    onClick={e => e.stopPropagation()}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        if (val.startsWith('custom:')) {
                                                                            const customId = val.substring(7);
                                                                            const flatPrice = store.vehicleCategory
                                                                                ? lookupEstimatePrice(
                                                                                    store.globalConfig?.estimateConfig,
                                                                                    item.bodyPart,
                                                                                    customId as any,
                                                                                    store.vehicleCategory
                                                                                )
                                                                                : 0;
                                                                            store.updateDamage(item.id, {
                                                                                estimateRepairCodeId: customId as any,
                                                                                repairMethod: customId as any,
                                                                                repairCostBrutto: flatPrice
                                                                            });
                                                                        } else {
                                                                            store.updateDamage(item.id, {
                                                                                estimateRepairCodeId: '',
                                                                                repairMethod: val as any
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">{t('common.pleaseSelect')}</option>
                                                                    <optgroup label={lang === 'de' ? 'Reparaturcodes' : 'Repair Codes'}>
                                                                        {ESTIMATE_REPAIR_CODE_IDS.map(codeId => (
                                                                            <option key={codeId} value={`custom:${codeId}`}>
                                                                                {ESTIMATE_REPAIR_CODE_LABELS[codeId][lang]}
                                                                            </option>
                                                                        ))}
                                                                    </optgroup>

                                                                </select>
                                                            )}
                                                        </div>

                                                        {!isVehicleEvaluation && (
                                                            <>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{t('step4.repairCost')}</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            className="form-input py-2 w-full text-sm font-mono text-right pr-6 bg-white border-gray-200 focus:ring-primary/20 rounded-xl"
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={!isUserAdded ? (item.repairCost === 0 ? '' : (item.repairCostBrutto || Math.round(calcBrutto(item.repairCost) * 100) / 100)) : (item.repairCostBrutto === 0 ? '' : item.repairCostBrutto)}
                                                                            onClick={e => e.stopPropagation()}
                                                                            onChange={e => {
                                                                                const val = parseFloat(e.target.value) || 0;
                                                                                if (!isUserAdded) {
                                                                                    store.updateMinderwertRow(item.id, {
                                                                                        repairCost: calcNetto(val),
                                                                                        repairCostBrutto: val
                                                                                    });
                                                                                } else {
                                                                                    store.updateDamage(item.id, {
                                                                                        repairCostBrutto: val
                                                                                    });
                                                                                }
                                                                            }}
                                                                        />
                                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">€</span>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{t('step4.anrechnung')}</label>
                                                                    <div className="space-y-1">
                                                                        <select
                                                                            className="form-input py-2 text-sm w-full bg-white border-gray-200 focus:ring-primary/20 rounded-xl"
                                                                            value={
                                                                                item.anrechnung === 'kein'
                                                                                    ? 'keine'
                                                                                    : item.anrechnung === 'pro-rata'
                                                                                    ? 'anteilig'
                                                                                    : (item.anrechnung || 'keine')
                                                                            }
                                                                            onClick={e => e.stopPropagation()}
                                                                            onChange={e => !isUserAdded ? store.updateMinderwertRow(item.id, { anrechnung: e.target.value as any }) : store.updateDamage(item.id, { anrechnung: e.target.value as any })}
                                                                        >
                                                                            {ANRECHNUNG_OPTIONS.map(a => (
                                                                                <option key={a.value} value={a.value}>{t(`anrechnungOptions.${a.value}`, a.labelDe)}</option>
                                                                            ))}
                                                                        </select>

                                                                        {(item.anrechnung === 'pro-rata' || item.anrechnung === 'anteilig') && (() => {
                                                                            const matrix = store.globalConfig?.depreciationMatrix || [];
                                                                            if (matrix.length === 0) return <span className="text-[9px] text-amber-600 font-bold">⚠ Keine Matrix konfiguriert</span>;
                                                                            let ageMonths = 0;
                                                                            if (store.firstRegistration) {
                                                                                try {
                                                                                    const reg = parseGermanDate(store.firstRegistration);
                                                                                    if (reg) {
                                                                                        const now = new Date();
                                                                                        ageMonths = (now.getFullYear() - reg.getFullYear()) * 12 + (now.getMonth() - reg.getMonth());
                                                                                        if (now.getDate() < reg.getDate()) {
                                                                                            ageMonths--;
                                                                                        }
                                                                                        if (ageMonths < 0) ageMonths = 0;
                                                                                    }
                                                                                } catch { }
                                                                            }
                                                                            const mileage = store.mileage || 0;
                                                                            const factor = lookupDepreciationMatrixFactor(ageMonths, mileage, matrix);
                                                                            if (factor === null) return <span className="text-[9px] text-amber-600 font-bold">⚠ Kein Matrix-Treffer für {Math.round(ageMonths / 12)}J / {mileage.toLocaleString()} km</span>;
                                                                            return (
                                                                                <div className="flex items-center gap-1 p-1.5 bg-violet-50 border border-violet-200 rounded-lg">
                                                                                    <span className="text-[9px] text-violet-700 font-black">Matrix: {factor.toFixed(3)}</span>
                                                                                    <span className="text-[9px] text-violet-500">→</span>
                                                                                    <span className="text-[9px] text-violet-800 font-bold">{((1 - factor) * 100).toFixed(1)}% Abzug</span>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Photo Section in Card */}
                                                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`flex items-center gap-2 p-1 rounded-xl ${isCardInvalid ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                                                                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-primary transition-all shadow-sm active:scale-95" onClick={e => e.stopPropagation()}>
                                                                    <Camera className="w-4 h-4" />
                                                                    <span className="text-[11px] font-bold">{t('step4.takePhoto')}</span>
                                                                    <input type="file" accept="image/*" capture="environment" onChange={e => !isUserAdded ? handleMinderwertPhoto(e, item.id) : handleDamagePhoto(e, item.id)} className="hidden" />
                                                                </label>
                                                                <label className="p-1.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-primary transition-all shadow-sm active:scale-95" onClick={e => e.stopPropagation()}>
                                                                    <ImagePlus className="w-4 h-4" />
                                                                    <input type="file" multiple accept="image/*" onChange={e => !isUserAdded ? handleMinderwertPhoto(e, item.id) : handleDamagePhoto(e, item.id)} className="hidden" />
                                                                </label>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap justify-end gap-1.5">
                                                            {item.images && item.images.length > 0 && item.images.map((img: string, idx: number) => (
                                                                <PhotoThumbnail
                                                                    key={idx}
                                                                    src={img}
                                                                    isExternal={store.videoExpertImages?.includes(img)}
                                                                    onRemove={() => !isUserAdded ? store.removeMinderwertPhoto(item.id, idx) : store.removeDamagePhoto(item.id, idx)}
                                                                    onUpdate={(newSrc) => !isUserAdded ? updateMinderwertPhoto(item.id, idx, newSrc) : updateDamagePhoto(item.id, idx, newSrc)}
                                                                    className="w-16 h-12"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}

                        {/* Mobile Total Footer */}
                        {!isVehicleEvaluation && (
                            <div className="mt-6 p-5 bg-primary/5 border border-primary/10 rounded-2xl flex justify-between items-center shadow-inner">
                                <span className="text-sm font-bold text-gray-600">{t('minderwert.total')}</span>
                                <span className="text-xl font-mono font-bold text-primary">{formatCurrency(totalMinderwert)}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons Section */}
                    <div className="mt-4 p-4 flex flex-wrap gap-3">
                        <button
                            onClick={() => {
                                const newId = uuidv4();
                                store.addDamage(newId, 'exterior');
                                setEditingDamageId(newId);
                            }}
                            className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 rounded-lg"
                        >
                            <Plus className="w-4 h-4" />
                            {t('step4.addDamage')}
                        </button>

                        <button
                            onClick={() => {
                                const newId = uuidv4();
                                store.addDamage(newId, 'manual');
                                setActiveComponentId(newId);
                                setTimeout(() => {
                                    scrollToElement(componentRefs.current[newId]);
                                }, 100);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/30 bg-white text-primary text-xs font-semibold hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                            <LayoutDashboard className="w-4 h-4 shrink-0" />
                            <span>{t('step4.addManualDamage', 'Manuelle Eingabe')}</span>
                        </button>

                        <button
                            onClick={() => setShowTemplateModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-xs font-bold hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm active:scale-95 whitespace-nowrap ml-auto"
                        >
                            <FileText className="w-4 h-4" />
                            <span>{t('step4.addFromTemplate', 'Aus Vorlage laden')}</span>
                        </button>
                    </div>
                </div>

            </Card>

            <TemplateSelectorModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onSelect={(template) => {
                    const pos = store.getEffectiveRepairPositions().find(p => p.id === template.positionId);
                    const newId = uuidv4();
                    store.addDamage(newId, 'exterior', template.positionId);
                    store.updateDamage(newId, {
                        description: pos ? t(`bodyParts.${pos.id}`, pos.name) : template.positionId,
                        repairType: template.typeId as any,
                        repairCostBrutto: template.defaultAmount,
                        anrechnung: 'voll'
                    });
                    const surcharge = store.getEffectiveRepairSurcharges()[template.typeId] || 0;
                    const finalTotal = template.defaultAmount + surcharge;
                    setActiveComponentId(newId);
                    setShowTemplateModal(false);
                    if (surcharge > 0) {
                        toast.success(`${t('step4.templateAdded', 'Position hinzugefügt')} · Aufschlag: +${formatCurrency(surcharge)} = ${formatCurrency(finalTotal)} gesamt`, { duration: 4000 });
                    } else {
                        toast.success(t('step4.templateAdded', 'Position hinzugefügt'));
                    }
                }}
            />

            <DamageEntryModal
                isOpen={editingDamageId !== null}
                onClose={() => setEditingDamageId(null)}
                damageId={editingDamageId}
            />


            {/* Additional Photos */}
            <SectionTitle>{t('step4.additionalPhotos', 'Zusätzliche Fotos')}</SectionTitle>
            <Card>
                <div className="flex flex-wrap items-center gap-2 mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-dark transition-all shadow-sm hover:shadow-md active:scale-95 group" title={t('step4.takePhoto')}>
                        <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">{t('step4.takePhoto')}</span>
                        <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotos(e)} className="hidden" />
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all shadow-sm hover:shadow-md active:scale-95 group" title={t('step4.choosePhoto')}>
                        <ImagePlus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">{t('step4.choosePhoto')}</span>
                        <input type="file" multiple accept="image/*" onChange={e => handlePhotos(e)} className="hidden" />
                    </label>
                </div>

                {allPhotosForGallery.length > 0 && (
                    <motion.div layout className="grid grid-cols-2 @@7xl:grid-cols-3 @5xl:grid-cols-4 gap-4 mt-4">
                        <AnimatePresence mode="popLayout">
                            {allPhotosForGallery.map((p) => {
                                const isVirtual = (p as any).isVirtual;
                                return (
                                    <motion.div
                                        key={p.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ y: -2 }}
                                        className="relative group bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        {/* Drag Handle Icon - Only for non-virtual */}
                                        {!isVirtual && (
                                            <div className="absolute top-2 left-2 z-10 p-1 bg-white/80 backdrop-blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-move shadow-sm border border-gray-100"
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', p.id);
                                                    const card = e.currentTarget.closest('.group') as HTMLElement;
                                                    if (card) {
                                                        e.dataTransfer.setDragImage(card, 20, 20);
                                                        card.classList.add('opacity-40', 'scale-95', 'z-50');
                                                    }
                                                }}
                                                onDragEnd={(e) => {
                                                    const card = e.currentTarget.closest('.group') as HTMLElement;
                                                    if (card) {
                                                        card.classList.remove('opacity-40', 'scale-95', 'z-50');
                                                    }
                                                }}
                                            >
                                                <GripVertical className="w-4 h-4 text-gray-500" />
                                            </div>
                                        )}

                                        <div
                                            className="relative aspect-[4/3] overflow-hidden rounded-md mb-1 bg-gray-100"
                                            onDragOver={(e) => {
                                                if (isVirtual) return;
                                                e.preventDefault();
                                                e.currentTarget.closest('.group')?.classList.add('ring-2', 'ring-primary');
                                            }}
                                            onDragLeave={(e) => {
                                                e.currentTarget.closest('.group')?.classList.remove('ring-2', 'ring-primary');
                                            }}
                                            onDrop={(e) => {
                                                if (isVirtual) return;
                                                e.preventDefault();
                                                e.currentTarget.closest('.group')?.classList.remove('ring-2', 'ring-primary');
                                                const sourceId = e.dataTransfer.getData('text/plain');
                                                if (sourceId && sourceId !== p.id) {
                                                    const absoluteTargetIndex = store.photos.findIndex(ph => ph.id === p.id);
                                                    if (absoluteTargetIndex !== -1) {
                                                        store.reorderPhoto(sourceId, absoluteTargetIndex);
                                                    }
                                                }
                                            }}
                                        >
                                            <PhotoThumbnail
                                                src={p.data}
                                                isExternal={p.isExternal || store.videoExpertImages?.includes(p.data)}
                                                onRemove={() => removePhotoWithSync(p.id)}
                                                onUpdate={(newSrc) => updatePhoto(p.id, newSrc)}
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="px-0.5 mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                                            {isVirtual ? (
                                                <div className="py-0.5 text-[10px] font-semibold text-gray-500 italic truncate">{translatePhotoLabel(p.label, t, lang)}</div>
                                            ) : (
                                                <>
                                                    <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded hover:border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all px-1.5 py-0.5">
                                                        <input className="w-full bg-transparent border-none p-0 text-[10px] text-gray-800 font-bold placeholder-gray-500 focus:ring-0 truncate outline-none"
                                                            value={translatePhotoLabel(p.label, t, lang)}
                                                            onChange={e => store.updatePhoto(p.id, { label: e.target.value })}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                            placeholder={t('step4.photoPlaceholder', 'Titel...')} />
                                                    </div>
                                                    <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded hover:border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all px-1.5 py-0.5">
                                                        <input className="w-full bg-transparent border-none p-0 text-[9px] text-gray-700 placeholder-gray-500 focus:ring-0 italic truncate outline-none"
                                                            value={(p as any).caption || ''}
                                                            onChange={e => store.updatePhoto(p.id, { caption: e.target.value })}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                            placeholder={t('step4.captionPlaceholder', 'Add caption...')} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}
            </Card>

            {/* Sync the Video Expert screenshots into this report by reference (T7.5). */}
            <div className="flex justify-center mt-4">
                <button
                    type="button"
                    disabled={isSyncingPhotos}
                    onClick={handleReSyncPhotos}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm border transition-all active:scale-95 ${
                        isSyncingPhotos
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPhotos ? 'animate-spin' : ''}`} />
                    {isSyncingPhotos ? t('step4.syncing', 'Synchronisiere...') : t('step4.reSyncPhotos', 'Fotos mit VideoXpert neu synchronisieren')}
                </button>
            </div>

            <ModalWrapper
                isOpen={showConfirmSync}
                onClose={() => setShowConfirmSync(false)}
                title={t('step4.confirmSyncTitle', 'Synchronisierung bestätigen')}
            >
                <div className="flex flex-col items-center gap-4 text-center max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                        <RefreshCw className="w-6 h-6 animate-pulse" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                        {t('step4.confirmSyncMessage', 'Möchten Sie die Schadensbilder mit VideoXpert neu synchronisieren?')}
                    </p>
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                        {t('step4.confirmSyncHint', 'Bereits vorhandene oder bearbeitete Bilder werden dabei nicht gelöscht oder verändert. Neu gefundene Bilder werden importiert.')}
                    </p>
                    <div className="flex justify-end gap-3 w-full mt-4">
                        <button
                            type="button"
                            onClick={() => setShowConfirmSync(false)}
                            className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                        >
                            {t('common.cancel', 'Abbrechen')}
                        </button>
                        <button
                            type="button"
                            onClick={confirmAndExecuteSync}
                            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all animate-in zoom-in-95 duration-150"
                        >
                            {t('step4.confirmSyncButton', 'Jetzt synchronisieren')}
                        </button>
                    </div>
                </div>
            </ModalWrapper>

            <ModalWrapper
                isOpen={showSyncSuccessModal}
                onClose={() => setShowSyncSuccessModal(false)}
                title={t('step4.syncResultTitle', 'Ergebnis der Synchronisierung')}
            >
                <div className="flex flex-col gap-4">
                    {newlyAddedPhotos.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                            <h3 className="font-bold text-gray-800 text-sm">{t('step4.noNewPhotos', 'Keine neuen Fotos gefunden')}</h3>
                            <p className="text-xs text-gray-500">
                                {t('step4.noNewPhotosDesc', 'Alle Bilder aus der externen Quelle sind bereits in Ihrem Bericht vorhanden.')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-xl border border-green-100">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-xs font-bold">
                                    {t('step4.newPhotosCount', 'Es wurden {{count}} neue(s) Foto(s) erfolgreich importiert:', { count: newlyAddedPhotos.length })}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 @@7xl:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
                                {newlyAddedPhotos.map((url, idx) => (
                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white group hover:shadow transition-all">
                                        <SecureImage src={url} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end mt-4">
                        <button
                            type="button"
                            onClick={() => setShowSyncSuccessModal(false)}
                            className="px-6 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all shadow"
                        >
                            {t('common.close', 'Schließen')}
                        </button>
                    </div>
                </div>
            </ModalWrapper>
        </div>
    );
};

interface TemplateSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: any) => void;
}

const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { t } = useTranslation();
    const store = useReportStore();
    const [search, setSearch] = React.useState('');

    if (!isOpen) return null;

    const surcharges = store.getEffectiveRepairSurcharges();
    const hasCustomerConfig = !!(store.customerNumber && store.globalConfig?.type === 'customer');

    const available = store.getEffectiveRepairTable().filter(e => e.vehicleCategory === store.vehicleCategory && e.active);
    const filtered = available.filter(e => {
        const pos = store.getEffectiveRepairPositions().find(p => p.id === e.positionId);
        const translatedName = pos ? t(`bodyParts.${pos.id}`, pos.name) : '';
        return (translatedName.toLowerCase() || '').includes(search.toLowerCase()) ||
            (pos?.name.toLowerCase() || '').includes(search.toLowerCase()) ||
            (e.typeId.toLowerCase().includes(search.toLowerCase()));
    });

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={t('step4.selectTemplate', 'Reparatur-Vorlage wählen')}
        >
            <div className="flex flex-col gap-4">
                {/* Pricing source info banner */}
                <div className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-semibold border-b ${hasCustomerConfig
                    ? 'bg-green-50 text-green-700 border-green-100'
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasCustomerConfig ? 'bg-green-500' : 'bg-amber-400'
                        }`} />
                    {hasCustomerConfig
                        ? `${t('step4.customerPricing', 'Kundenspezifische Preisliste')} · ${store.customerNumber}`
                        : t('step4.defaultPricing', 'Standard-Preisliste aktiv (kein Kundenprofil gefunden)')
                    }
                    {store.vehicleCategory && (
                        <span className="ml-auto px-2 py-0.5 bg-white/70 rounded-full border border-current/20">
                            {store.vehicleCategory}
                        </span>
                    )}
                </div>

                {/* Search */}
                <div className="p-4 border-b bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('common.search', 'Suchen...')}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 bg-gray-50/30">
                    {!store.vehicleCategory ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-orange-600 font-medium">{t('step4.noCategorySelected', 'Bitte wählen Sie zuerst eine Fahrzeugkategorie in Schritt 2.')}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 text-sm">{t('common.noResults', 'Keine Vorlagen gefunden')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {filtered.map(entry => {
                                const pos = store.getEffectiveRepairPositions().find(p => p.id === entry.positionId);
                                const type = store.getEffectiveRepairTypes().find(t => t.id === entry.typeId);
                                const surcharge = surcharges[entry.typeId] || 0;
                                const finalTotal = entry.defaultAmount + surcharge;
                                return (
                                    <button
                                        key={entry.id}
                                        onClick={() => onSelect(entry)}
                                        className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-primary/30 hover:bg-primary/5 hover:shadow-md transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <Box className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{pos ? t(`bodyParts.${pos.id}`, pos.name) : entry.positionId}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">{type?.name || entry.typeId}</span>
                                                    <span>•</span>
                                                    <span>{entry.vehicleCategory}</span>
                                                    {surcharge > 0 && (
                                                        <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded font-medium border border-orange-100">
                                                            +{formatCurrency(surcharge)} {t('step4.surcharge', 'Aufschlag')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-sm font-mono font-bold text-primary">{formatCurrency(entry.defaultAmount)}</div>
                                            {surcharge > 0 ? (
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {t('step4.total', 'Gesamt')}: <span className="font-bold text-gray-700">{formatCurrency(finalTotal)}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold group-hover:text-primary transition-colors">Select</div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </ModalWrapper>
    );
};

export default Step4_Damages;
