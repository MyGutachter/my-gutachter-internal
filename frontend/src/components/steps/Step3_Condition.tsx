import { Calendar, Camera, CheckCircle, Clock, Copy, Hash, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BODY_PARTS } from '../../constants/bodyParts';
import { useReportStore } from '../../store/reportStore';
import { useUIStore } from '../../store/uiStore';
import { compressImage } from '../../utils/imageCompression';
import { validateImageAspectRatio } from '../../utils/imageValidation';
import Card from '../ui/Card';
import EquipmentSelect from '../ui/EquipmentSelect';
import FormCheckbox from '../ui/FormCheckbox';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';
import FormTextarea from '../ui/FormTextarea';
import SectionTitle from '../ui/SectionTitle';
import PhotoThumbnail from '../ui/PhotoThumbnail';

import TireEntryModal from '../ui/TireEntryModal';
import { ManualSelect } from '../ui/TireSelects';

const PAINT_BODY_PART_OPTIONS = [
    'bumper_front',
    'hood',
    'fender_front_left',
    'door_front_left',
    'door_rear_left',
    'quarter_panel_left',
    'roof_frame_left',
    'fender_front_right',
    'door_front_right',
    'door_rear_right',
    'quarter_panel_right',
    'roof_frame_right',
    'roof',
    'tailgate',
    'bumper_rear'
];




interface Props {
    adminMode?: boolean;
    onToggleRequired?: (fieldName: string) => Promise<void>;
}

const Step3_Condition: React.FC<Props> = ({ adminMode, onToggleRequired }) => {
    const { t } = useTranslation();
    const store = useReportStore();
    const { showValidationErrors } = useUIStore();
    const validationErrors = store.getStepValidationErrors(3);
    const getFieldError = (fieldName: string) => {
        return showValidationErrors && validationErrors[fieldName] ? t('validation.required', 'Pflichtfeld') : undefined;
    };
    const isVehicleEvaluation = store.claimType === 'Fahrzeugbewertung';
    const isRequired = (fieldName: string) => store.fieldConfigs.find(c => c.fieldName === fieldName)?.required;
    const [editingTireIndex, setEditingTireIndex] = React.useState<number | null | undefined>(undefined);
    const [editingSecondTireIndex, setEditingSecondTireIndex] = React.useState<number | undefined>(undefined);

    const showChargingCable = useMemo(() => {
        const fuel = (store.fuelType || '').toLowerCase();
        return fuel.includes('elektro') || fuel.includes('hybrid') || fuel.includes('phev');
    }, [store.fuelType]);



    const updateFieldPhoto = (fieldName: string, idx: number, newSrc: string) => {
        const newImages = [...((store as any)[fieldName] || [])];
        newImages[idx] = newSrc;
        store.updateField(fieldName as any, newImages);
    };

    const removeFieldPhoto = (fieldName: string, idx: number) => {
        const newImages = [...((store as any)[fieldName] || [])];
        newImages.splice(idx, 1);
        store.updateField(fieldName as any, newImages);
    };

    const handleChargingCablePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const currentImages = (store as any).chargingCableImages || [];
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
                toast.error(`${t('step4.compressionError')}: ${file.name}`);
            }
        }
        store.updateField('chargingCableImages' as any, newImages);
        e.target.value = '';
    };

    const handleGenericPhoto = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const files = e.target.files;
        if (!files) return;
        const currentImages = (store as any)[fieldName] || [];
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
                toast.error(`${t('step4.compressionError')}: ${file.name}`);
            }
        }
        store.updateField(fieldName as any, newImages);
        e.target.value = '';
    };

    const handlePaintPhoto = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        const files = e.target.files;
        if (!files) return;
        const pm = store.paintMeasurements.find(p => p.id === id);
        if (!pm) return;
        const currentImages = pm.images || [];
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
                toast.error(`${t('step4.compressionError')}: ${file.name}`);
            }
        }
        store.updatePaintMeasurement(id, { images: newImages });
        e.target.value = '';
    };

    const updatePaintPhoto = (id: string, idx: number, newSrc: string) => {
        const pm = store.paintMeasurements.find(p => p.id === id);
        if (!pm) return;
        const newImages = [...(pm.images || [])];
        newImages[idx] = newSrc;
        store.updatePaintMeasurement(id, { images: newImages });
    };

    const removePaintPhoto = (id: string, imgIndex: number) => {
        const pm = store.paintMeasurements.find(p => p.id === id);
        if (!pm) return;
        const newImages = [...(pm.images || [])];
        newImages.splice(imgIndex, 1);
        store.updatePaintMeasurement(id, { images: newImages });
    };

    const handleTireQuickPhoto = async (e: React.ChangeEvent<HTMLInputElement>, index: number, isSecondSet: boolean) => {
        const files = e.target.files;
        if (!files) return;

        const tire = isSecondSet ? store.secondTires[index] : store.tires[index];
        if (!tire) return;

        const currentImages = tire.images || [];
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
                toast.error(`${t('step4.compressionError')}: ${file.name}`);
            }
        }

        if (isSecondSet) {
            store.updateSecondTire(index, { images: newImages });
        } else {
            store.updateTire(index, { images: newImages });
        }

        toast.success(t('step3.photoAdded'));
        e.target.value = '';
    };

    const updateTirePhoto = (index: number, idx: number, newSrc: string, isSecondSet: boolean) => {
        const tire = isSecondSet ? store.secondTires[index] : store.tires[index];
        if (!tire) return;
        const newImages = [...(tire.images || [])];
        newImages[idx] = newSrc;
        if (isSecondSet) {
            store.updateSecondTire(index, { images: newImages });
        } else {
            store.updateTire(index, { images: newImages });
        }
    };

    const removeTirePhoto = (index: number, idx: number, isSecondSet: boolean) => {
        const tire = isSecondSet ? store.secondTires[index] : store.tires[index];
        if (!tire) return;
        const newImages = [...(tire.images || [])];
        newImages.splice(idx, 1);
        if (isSecondSet) {
            store.updateSecondTire(index, { images: newImages });
        } else {
            store.updateTire(index, { images: newImages });
        }
    };







    return (
        <div className="animate-fade-in space-y-4">
            {/* Inspection Checks */}
            <SectionTitle>{t('step3.inspectionChecks')}</SectionTitle>
            <Card>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-x-6 gap-y-4">
                        {/* Test Drive Group */}
                        <FormSelect
                            name="testDriveDone"
                            error={getFieldError('testDriveDone')}
                            label={t('step3.testDrive')}
                            value={store.testDriveDone}
                            onChange={v => store.updateField('testDriveDone', v as any)}
                            options={[
                                { value: 'carried_out', label: t('step3.testDriveOptions.carried_out') },
                                { value: 'not_occurred', label: t('step3.testDriveOptions.not_occurred') },
                                { value: 'not_possible', label: t('step3.testDriveOptions.not_possible') }
                            ]}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('testDriveDone')}
                            required={isRequired('testDriveDone')}
                        />

                        {/* Lift Group */}
                        <FormSelect
                            name="liftingPlatformStatus"
                            error={getFieldError('liftingPlatformStatus')}
                            label={t('step3.lift')}
                            value={store.liftingPlatformStatus}
                            onChange={v => store.updateField('liftingPlatformStatus', v as any)}
                            options={[
                                { value: 'available_used', label: t('step3.liftingPlatformOptions.available_used') },
                                { value: 'not_available', label: t('step3.liftingPlatformOptions.not_available') },
                                { value: 'not_possible', label: t('step3.liftingPlatformOptions.not_possible') }
                            ]}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('liftingPlatformStatus')}
                            required={isRequired('liftingPlatformStatus')}
                        />
                    </div>

                    {/* Inspection Group */}
                    <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-x-6 gap-y-4">
                        <FormSelect
                            name="inspectionFromBelow"
                            error={getFieldError('inspectionFromBelow')}
                            label={t('step3.inspectionFromBelow')}
                            value={store.inspectionFromBelow === null || store.inspectionFromBelow === undefined ? '' : (store.inspectionFromBelow ? 'true' : 'false')}
                            onChange={v => store.updateField('inspectionFromBelow', v === '' ? null : v === 'true')}
                            options={[
                                { value: 'false', label: t('common.possible') },
                                { value: 'true', label: t('common.notPossible') }
                            ]}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('inspectionFromBelow')}
                            required={isRequired('inspectionFromBelow')}
                        />
                        <FormSelect
                            name="inspectionFromAbove"
                            error={getFieldError('inspectionFromAbove')}
                            label={t('step3.inspectionFromAbove')}
                            value={store.inspectionFromAbove === null || store.inspectionFromAbove === undefined ? '' : (store.inspectionFromAbove ? 'true' : 'false')}
                            onChange={v => store.updateField('inspectionFromAbove', v === '' ? null : v === 'true')}
                            options={[
                                { value: 'false', label: t('common.possible') },
                                { value: 'true', label: t('common.notPossible') }
                            ]}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('inspectionFromAbove')}
                            required={isRequired('inspectionFromAbove')}
                        />
                    </div>

                    {/* Vehicle Condition Group */}
                    <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex flex-col gap-2">
                            <FormSelect
                                name="vehicleConditionStatus"
                                error={getFieldError('vehicleConditionStatus')}
                                label={t('step3.vehicleCondition')}
                                value={store.vehicleConditionStatus}
                                onChange={v => store.updateField('vehicleConditionStatus', v as any)}
                                options={[
                                    { value: 'dirty', label: t('step3.vehicleConditionOptions.dirty') },
                                    { value: 'wet', label: t('step3.vehicleConditionOptions.wet') },
                                    { value: 'restricted', label: t('step3.vehicleConditionOptions.restricted') },
                                    { value: 'ausreichend', label: t('step3.vehicleConditionOptions.ausreichend') },
                                    { value: 'other', label: t('step3.vehicleConditionOptions.other') },
                                ]}
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('vehicleConditionStatus')}
                                required={isRequired('vehicleConditionStatus')}
                            />
                            {store.vehicleConditionStatus === 'other' && (
                                <FormInput
                                    name="vehicleConditionOther"
                                    error={getFieldError('vehicleConditionOther')}
                                    label={t('step3.vehicleConditionOther', 'Bitte spezifizieren')}
                                    value={store.vehicleConditionOther || ''}
                                    onChange={v => store.updateField('vehicleConditionOther', v)}
                                    adminMode={adminMode}
                                    onToggleRequired={() => onToggleRequired?.('vehicleConditionOther')}
                                    required={isRequired('vehicleConditionOther')}
                                />
                            )}
                            {store.vehicleConditionStatus && <div className="flex flex-wrap items-center gap-2 ml-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                    <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'vehicleConditionImages')} className="hidden" /></label>
                                    <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'vehicleConditionImages')} className="hidden" /></label>
                                </div>
                                {store.vehicleConditionImages && store.vehicleConditionImages.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {store.vehicleConditionImages.map((img: string, idx: number) => (
                                            <PhotoThumbnail
                                                key={idx}
                                                src={img}
                                                onRemove={() => removeFieldPhoto('vehicleConditionImages', idx)}
                                                onUpdate={(newSrc) => updateFieldPhoto('vehicleConditionImages', idx, newSrc)}
                                                className="w-20 h-14"
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>}
                        </div>
                    </div>

                    {/* System Checks Group */}
                    <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex flex-col gap-2">
                            <FormSelect
                                name="errorMemoryRead"
                                error={getFieldError('errorMemoryRead')}
                                label={t('step3.errorMemory')}
                                value={store.errorMemoryRead === null || store.errorMemoryRead === undefined ? '' : (store.errorMemoryRead ? 'true' : 'false')}
                                onChange={v => store.updateField('errorMemoryRead', v === '' ? null : v === 'true')}
                                options={[
                                    { value: 'true', label: t('common.yes') },
                                    { value: 'false', label: t('common.no') }
                                ]}
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('errorMemoryRead')}
                                required={isRequired('errorMemoryRead')}
                            />
                            {store.errorMemoryRead && (
                                <div className="flex flex-wrap items-center gap-2 ml-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'errorMemoryReadImages')} className="hidden" /></label>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'errorMemoryReadImages')} className="hidden" /></label>
                                    </div>
                                    {(store as any).errorMemoryReadImages && (store as any).errorMemoryReadImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(store as any).errorMemoryReadImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('errorMemoryReadImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('errorMemoryReadImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <FormSelect
                                name="hybridBatteryChecked"
                                error={getFieldError('hybridBatteryChecked')}
                                label={t('step3.hybridBattery')}
                                value={store.hybridBatteryChecked === null || store.hybridBatteryChecked === undefined ? '' : (store.hybridBatteryChecked ? 'true' : 'false')}
                                onChange={v => store.updateField('hybridBatteryChecked', v === '' ? null : v === 'true')}
                                options={[
                                    { value: 'true', label: t('common.available') },
                                    { value: 'false', label: t('common.notAvailable') }
                                ]}
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('hybridBatteryChecked')}
                                required={isRequired('hybridBatteryChecked')}
                            />
                        </div>
                    </div>

                    {/* Documentation Group */}
                    <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex flex-col gap-2">
                            <FormSelect
                                label={t('step3.equipmentListAvailable')}
                                value={store.equipmentListAvailable === null || store.equipmentListAvailable === undefined ? '' : String(store.equipmentListAvailable)}
                                onChange={v => store.updateField('equipmentListAvailable', v === '' ? null : (v === 'true' ? true : (v === 'false' ? false : 'dat')))}
                                options={[
                                    { value: 'true', label: t('step3.equipmentListAvailableOptions.available') },
                                    { value: 'false', label: t('step3.equipmentListAvailableOptions.notAvailable') },
                                    { value: 'dat', label: t('step3.equipmentListAvailableOptions.accordingToDat') }
                                ]}
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('equipmentListAvailable')}
                                required={isRequired('equipmentListAvailable')}
                            />
                            {store.equipmentListAvailable && (
                                <div className="flex flex-wrap items-center gap-2 ml-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'equipmentListAvailableImages')} className="hidden" /></label>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'equipmentListAvailableImages')} className="hidden" /></label>
                                    </div>
                                    {(store as any).equipmentListAvailableImages && (store as any).equipmentListAvailableImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(store as any).equipmentListAvailableImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('equipmentListAvailableImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('equipmentListAvailableImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <FormSelect
                                label={t('step3.deliveryConfirmationAvailable')}
                                value={store.deliveryConfirmationAvailable === null || store.deliveryConfirmationAvailable === undefined ? '' : (store.deliveryConfirmationAvailable ? 'true' : 'false')}
                                onChange={v => store.updateField('deliveryConfirmationAvailable', v === '' ? null : v === 'true')}
                                options={[
                                    { value: 'true', label: t('common.available') },
                                    { value: 'false', label: t('common.notAvailable') }
                                ]}
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('deliveryConfirmationAvailable')}
                                required={isRequired('deliveryConfirmationAvailable')}
                            />
                            {store.deliveryConfirmationAvailable && (
                                <div className="flex flex-wrap items-center gap-2 ml-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'deliveryConfirmationAvailableImages')} className="hidden" /></label>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'deliveryConfirmationAvailableImages')} className="hidden" /></label>
                                    </div>
                                    {(store as any).deliveryConfirmationAvailableImages && (store as any).deliveryConfirmationAvailableImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(store as any).deliveryConfirmationAvailableImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('deliveryConfirmationAvailableImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('deliveryConfirmationAvailableImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <FormSelect
                                label={t('step3.engineRunPerformed')}
                                value={store.engineRunPerformed}
                                onChange={v => {
                                    store.updateField('engineRunPerformed', v as any);
                                    if (v !== 'carried_out') {
                                        store.updateField('engineRunStatus', '');
                                        store.updateField('engineRunNoise', '');
                                        store.updateField('engineRunRoughRunning', '');
                                        store.updateField('engineRunWarningLightsActive', '');
                                        store.updateField('engineRunWarningLightsDetails', '');
                                        store.updateField('engineRunOtherIssues', '');
                                    }
                                }}
                                options={[
                                    { value: 'carried_out', label: t('common.yes') },
                                    { value: 'not_occurred', label: t('common.no') },
                                    { value: 'not_possible', label: t('common.notPossible') },
                                    { value: 'not_specified', label: t('common.notSpecified') }
                                ]}
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('engineRunPerformed')}
                                required={isRequired('engineRunPerformed')}
                            />

                            {store.engineRunPerformed === 'carried_out' && (
                                <div className="pl-4 border-l-2 border-primary/20 space-y-3 mt-1">
                                    <FormSelect
                                        label={t('step3.engineRunStatus')}
                                        value={store.engineRunStatus || ''}
                                        onChange={v => {
                                            store.updateField('engineRunStatus', v as any);
                                            if (v !== 'issues') {
                                                store.updateField('engineRunNoise', '');
                                                store.updateField('engineRunRoughRunning', '');
                                                store.updateField('engineRunWarningLightsActive', '');
                                                store.updateField('engineRunWarningLightsDetails', '');
                                                store.updateField('engineRunOtherIssues', '');
                                            }
                                        }}
                                        options={[
                                            { value: 'no_issues', label: t('step3.engineRunStatusOptions.no_issues') },
                                            { value: 'issues', label: t('step3.engineRunStatusOptions.issues') }
                                        ]}
                                        adminMode={adminMode}
                                        onToggleRequired={() => onToggleRequired?.('engineRunStatus')}
                                        required={isRequired('engineRunStatus')}
                                    />

                                    {store.engineRunStatus === 'issues' && (
                                        <div className="pl-4 border-l border-gray-200 space-y-3">
                                            <FormSelect
                                                label={t('step3.engineRunNoise')}
                                                value={store.engineRunNoise || ''}
                                                onChange={v => store.updateField('engineRunNoise', v as any)}
                                                options={[
                                                    { value: 'none', label: t('step3.engineRunNoiseOptions.none') },
                                                    { value: 'knocking', label: t('step3.engineRunNoiseOptions.knocking') },
                                                    { value: 'rattling', label: t('step3.engineRunNoiseOptions.rattling') },
                                                    { value: 'whistling', label: t('step3.engineRunNoiseOptions.whistling') },
                                                    { value: 'squeaking', label: t('step3.engineRunNoiseOptions.squeaking') },
                                                    { value: 'grinding', label: t('step3.engineRunNoiseOptions.grinding') },
                                                    { value: 'vibrations', label: t('step3.engineRunNoiseOptions.vibrations') },
                                                    { value: 'irregular', label: t('step3.engineRunNoiseOptions.irregular') }
                                                ]}
                                                adminMode={adminMode}
                                                onToggleRequired={() => onToggleRequired?.('engineRunNoise')}
                                                required={isRequired('engineRunNoise')}
                                            />

                                            <FormSelect
                                                label={t('step3.engineRunRoughRunning')}
                                                value={store.engineRunRoughRunning || ''}
                                                onChange={v => store.updateField('engineRunRoughRunning', v as any)}
                                                options={[
                                                    { value: 'normal', label: t('step3.engineRunRoughRunningOptions.normal') },
                                                    { value: 'rough', label: t('step3.engineRunRoughRunningOptions.rough') }
                                                ]}
                                                adminMode={adminMode}
                                                onToggleRequired={() => onToggleRequired?.('engineRunRoughRunning')}
                                                required={isRequired('engineRunRoughRunning')}
                                            />

                                            <div className="space-y-2">
                                                <FormSelect
                                                    label={t('step3.engineRunWarningLights')}
                                                    value={store.engineRunWarningLightsActive || ''}
                                                    onChange={v => {
                                                        store.updateField('engineRunWarningLightsActive', v as any);
                                                        if (v !== 'yes') {
                                                            store.updateField('engineRunWarningLightsDetails', '');
                                                        }
                                                    }}
                                                    options={[
                                                        { value: 'no', label: t('step3.engineRunWarningLightsOptions.no') },
                                                        { value: 'yes', label: t('step3.engineRunWarningLightsOptions.yes') }
                                                    ]}
                                                    adminMode={adminMode}
                                                    onToggleRequired={() => onToggleRequired?.('engineRunWarningLightsActive')}
                                                    required={isRequired('engineRunWarningLightsActive')}
                                                />
                                                {store.engineRunWarningLightsActive === 'yes' && (
                                                    <FormInput
                                                        label={t('step3.engineRunWarningLightsSpecify')}
                                                        value={store.engineRunWarningLightsDetails || ''}
                                                        onChange={v => store.updateField('engineRunWarningLightsDetails', v)}
                                                        placeholder={t('step3.engineRunWarningLightsSpecify')}
                                                        adminMode={adminMode}
                                                        onToggleRequired={() => onToggleRequired?.('engineRunWarningLightsDetails')}
                                                        required={isRequired('engineRunWarningLightsDetails')}
                                                    />
                                                )}
                                            </div>

                                            <FormTextarea
                                                label={t('step3.engineRunOtherIssues')}
                                                value={store.engineRunOtherIssues || ''}
                                                onChange={v => store.updateField('engineRunOtherIssues', v)}
                                                placeholder={t('step3.engineRunOtherIssuesPlaceholder')}
                                                adminMode={adminMode}
                                                onToggleRequired={() => onToggleRequired?.('engineRunOtherIssues')}
                                                required={isRequired('engineRunOtherIssues')}
                                                rows={2}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {store.engineRunPerformed && (
                                <div className="flex flex-wrap items-center gap-2 ml-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'engineRunPerformedImages')} className="hidden" /></label>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'engineRunPerformedImages')} className="hidden" /></label>
                                    </div>
                                    {(store as any).engineRunPerformedImages && (store as any).engineRunPerformedImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(store as any).engineRunPerformedImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('engineRunPerformedImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('engineRunPerformedImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-y-4">

                    <div className="pt-2 border-t border-gray-100">
                        <label className="form-label">{t('step3.documents')}</label>
                        <div className="space-y-6 mt-4">
                            {/* Registration Certificate */}
                            <div className="space-y-3">
                                <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4">
                                    <label className="text-sm font-medium text-gray-700 w-full @3xl:w-1/3">{t('step3.docRegistration')}</label>
                                    <div className="flex-1 flex flex-col @3xl:flex-row items-start @3xl:items-center gap-4">
                                        <select
                                            className="form-input py-1.5 text-sm w-full @3xl:w-48 bg-white"
                                            value={store.registrationCertificateStatus || ''}
                                            onChange={e => store.updateField('registrationCertificateStatus', e.target.value as any)}
                                        >
                                            <option value="">{t('common.noneSelected')}</option>
                                            <option value="Original">{t('step3.docStatusOriginal')}</option>
                                            <option value="Copy">{t('step3.docStatusCopy')}</option>
                                            <option value="Not Available">{t('step3.docStatusNotAvailable')}</option>
                                        </select>
                                        {adminMode && (
                                            <button
                                                onClick={() => onToggleRequired?.('registrationCertificateStatus')}
                                                className={`p-1.5 rounded-lg border-2 transition-all ${isRequired('registrationCertificateStatus')
                                                    ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200'
                                                    }`}
                                                title={t('admin.toggleRequired')}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <FormCheckbox
                                            label={t('step3.willBeSubmittedLater')}
                                            checked={store.registrationCertificateSubmittedLater}
                                            onChange={v => store.updateField('registrationCertificateSubmittedLater', v)}
                                            adminMode={adminMode}
                                            onToggleRequired={() => onToggleRequired?.('registrationCertificateSubmittedLater')}
                                            required={isRequired('registrationCertificateSubmittedLater')}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 ml-0 @3xl:ml-[33.333%]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'fzScheinImages')} className="hidden" /></label>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'fzScheinImages')} className="hidden" /></label>
                                    </div>
                                    {(store as any).fzScheinImages && (store as any).fzScheinImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(store as any).fzScheinImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('fzScheinImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('fzScheinImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Service Booklet */}
                            <div className="space-y-3">
                                <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4">
                                    <label className="text-sm font-medium text-gray-700 w-full @3xl:w-1/3">{t('step3.docServiceBook')}</label>
                                    <div className="flex-1 flex flex-col @3xl:flex-row items-start @3xl:items-center gap-4">
                                        <select
                                            className="form-input py-1.5 text-sm w-full @3xl:w-48 bg-white"
                                            value={store.serviceBookletStatus || ''}
                                            onChange={e => store.updateField('serviceBookletStatus', e.target.value as any)}
                                        >
                                            <option value="">{t('common.noneSelected')}</option>
                                            <option value="Original">{t('step3.docStatusOriginal')}</option>
                                            <option value="Digital">{t('step3.docStatusDigital')}</option>
                                            <option value="Not Available">{t('step3.docStatusNotAvailable')}</option>
                                        </select>
                                        {adminMode && (
                                            <button
                                                onClick={() => onToggleRequired?.('serviceBookletStatus')}
                                                className={`p-1.5 rounded-lg border-2 transition-all ${isRequired('serviceBookletStatus')
                                                    ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200'
                                                    }`}
                                                title={t('admin.toggleRequired')}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <FormCheckbox
                                            label={t('step3.willBeSubmittedLater')}
                                            checked={store.serviceBookletSubmittedLater}
                                            onChange={v => store.updateField('serviceBookletSubmittedLater', v)}
                                            adminMode={adminMode}
                                            onToggleRequired={() => onToggleRequired?.('serviceBookletSubmittedLater')}
                                            required={isRequired('serviceBookletSubmittedLater')}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 ml-0 @3xl:ml-[33.333%]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'serviceheftImages')} className="hidden" /></label>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'serviceheftImages')} className="hidden" /></label>
                                    </div>
                                    {(store as any).serviceheftImages && (store as any).serviceheftImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(store as any).serviceheftImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('serviceheftImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('serviceheftImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Operating Manual */}
                            <div className="space-y-3">
                                <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4">
                                    <label className="text-sm font-medium text-gray-700 w-full @3xl:w-1/3">{t('step3.docManual')}</label>
                                    <div className="flex-1 flex flex-col @3xl:flex-row items-start @3xl:items-center gap-4">
                                        <select
                                            className="form-input py-1.5 text-sm w-full @3xl:w-48 bg-white"
                                            value={store.operatingManualStatus || ''}
                                            onChange={e => store.updateField('operatingManualStatus', e.target.value as any)}
                                        >
                                            <option value="">{t('common.noneSelected')}</option>
                                            <option value="In-Vehicle">{t('step3.docStatusInVehicle')}</option>
                                            <option value="Not Available">{t('step3.docStatusNotAvailable')}</option>
                                        </select>
                                        {adminMode && (
                                            <button
                                                onClick={() => onToggleRequired?.('operatingManualStatus')}
                                                className={`p-1.5 rounded-lg border-2 transition-all ${isRequired('operatingManualStatus')
                                                    ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200'
                                                    }`}
                                                title={t('admin.toggleRequired')}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <FormCheckbox
                                            label={t('step3.willBeSubmittedLater')}
                                            checked={store.operatingManualSubmittedLater}
                                            onChange={v => store.updateField('operatingManualSubmittedLater', v)}
                                            adminMode={adminMode}
                                            onToggleRequired={() => onToggleRequired?.('operatingManualSubmittedLater')}
                                            required={isRequired('operatingManualSubmittedLater')}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 ml-0 @3xl:ml-[33.333%]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'bordliteraturImages')} className="hidden" /></label>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'bordliteraturImages')} className="hidden" /></label>
                                    </div>
                                    {(store as any).bordliteraturImages && (store as any).bordliteraturImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(store as any).bordliteraturImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('bordliteraturImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('bordliteraturImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Environmental Badge */}
                            <div className="space-y-3">
                                <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4">
                                    <label className="text-sm font-medium text-gray-700 w-full @3xl:w-1/3">{t('step3.docBadge')}</label>
                                    <div className="flex-1 flex flex-col @3xl:flex-row items-start @3xl:items-center gap-4">
                                        <select
                                            className="form-input py-1.5 text-sm w-full @3xl:w-48 bg-white"
                                            value={store.environmentalBadgeStatus || ''}
                                            onChange={e => store.updateField('environmentalBadgeStatus', e.target.value as any)}
                                        >
                                            <option value="">{t('common.noneSelected')}</option>
                                            <option value="Green">{t('step3.docStatusGreen')}</option>
                                            <option value="Yellow">{t('step3.docStatusYellow')}</option>
                                            <option value="Red">{t('step3.docStatusRed')}</option>
                                            <option value="Not Available">{t('step3.docStatusNotAvailable')}</option>
                                        </select>
                                        {adminMode && (
                                            <button
                                                onClick={() => onToggleRequired?.('environmentalBadgeStatus')}
                                                className={`p-1.5 rounded-lg border-2 transition-all ${isRequired('environmentalBadgeStatus')
                                                    ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200'
                                                    }`}
                                                title={t('admin.toggleRequired')}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <FormCheckbox
                                            label={t('step3.willBeSubmittedLater')}
                                            checked={store.environmentalBadgeSubmittedLater}
                                            onChange={v => store.updateField('environmentalBadgeSubmittedLater', v)}
                                            adminMode={adminMode}
                                            onToggleRequired={() => onToggleRequired?.('environmentalBadgeSubmittedLater')}
                                            required={isRequired('environmentalBadgeSubmittedLater')}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 ml-0 @3xl:ml-[33.333%]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'environmentalBadgeImages')} className="hidden" /></label>
                                        <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm"><ImagePlus className="w-4 h-4" /><input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'environmentalBadgeImages')} className="hidden" /></label>
                                    </div>
                                    {(store as any).environmentalBadgeImages && (store as any).environmentalBadgeImages.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(store as any).environmentalBadgeImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('environmentalBadgeImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('environmentalBadgeImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <FormTextarea
                        label={t('step3.additionalNotes')}
                        value={store.additionalNotes}
                        onChange={v => store.updateField('additionalNotes', v)}
                        placeholder={t('step3.additionalNotesPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('additionalNotes')}
                        required={isRequired('additionalNotes')}
                    />

                    <div className="pt-2 border-t border-gray-100">
                        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-8 items-start">
                            {/* Maintenance Trigger Choice */}
                            <div className="space-y-4">
                                <div 
                                    data-fieldname="nextMaintenanceType"
                                    className={`flex flex-col gap-2 p-2 rounded-xl transition-all ${
                                        showValidationErrors && validationErrors['nextMaintenanceType']
                                            ? 'border-2 border-red-500 bg-red-50/10'
                                            : 'border border-transparent'
                                    }`}
                                >
                                    <label className="text-[11px] font-black uppercase tracking-[0.05em] text-slate-400">
                                        {t('step3.maintenanceSelection')}
                                    </label>
                                    <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                                        {[
                                            { id: 'date', label: t('step3.maintenanceTypeDate'), icon: Calendar },
                                            { id: 'days', label: t('step3.maintenanceIntervalDays'), icon: Clock },
                                            { id: 'months', label: t('step3.maintenanceIntervalMonths'), icon: Clock },
                                            { id: 'mileage', label: 'km', icon: Hash }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    if (store.nextMaintenanceType === opt.id) return;
                                                    // Clear stale fields when switching modes
                                                    if (opt.id === 'date') {
                                                        // Switching to date: clear interval fields
                                                        store.updateField('nextMaintenanceIntervalValue', null);
                                                        store.updateField('nextMaintenanceMileage', 0);
                                                    } else if (opt.id === 'mileage') {
                                                        // Switching to km: clear date fields
                                                        store.updateField('nextMaintenanceDate', '');
                                                        store.updateField('nextMaintenanceIntervalValue', null);
                                                    } else {
                                                        // Switching to days/months: clear mileage and date
                                                        store.updateField('nextMaintenanceDate', '');
                                                        store.updateField('nextMaintenanceMileage', 0);
                                                        store.updateField('nextMaintenanceIntervalValue', null);
                                                    }
                                                    store.updateField('nextMaintenanceType', opt.id as any);
                                                }}
                                                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                                    store.nextMaintenanceType === opt.id || (opt.id === 'date' && !store.nextMaintenanceType)
                                                        ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                                                }`}
                                            >
                                                <opt.icon className={`w-3.5 h-3.5 ${(store.nextMaintenanceType === opt.id || (opt.id === 'date' && !store.nextMaintenanceType)) ? 'text-primary' : 'text-slate-300'}`} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {showValidationErrors && validationErrors['nextMaintenanceType'] && (
                                        <p className="text-[10px] text-red-600 font-medium">{t('validation.required', 'Pflichtfeld')}</p>
                                    )}
                                </div>

                                <div className="animate-fade-in">
                                    {(!store.nextMaintenanceType || store.nextMaintenanceType === 'date') ? (
                                        <FormInput
                                            name="nextMaintenanceDate"
                                            error={getFieldError('nextMaintenanceDate')}
                                            label={t('step3.nextMaintenanceDate')}
                                            value={store.nextMaintenanceDate}
                                            onChange={v => store.updateField('nextMaintenanceDate', v)}
                                            type="date"
                                            adminMode={adminMode}
                                            onToggleRequired={() => onToggleRequired?.('nextMaintenanceDate')}
                                            required={isRequired('nextMaintenanceDate')}
                                        />
                                    ) : (
                                        <FormInput
                                            name="nextMaintenanceIntervalValue"
                                            error={getFieldError('nextMaintenanceIntervalValue')}
                                            label={t('step3.nextMaintenanceInterval')}
                                            value={store.nextMaintenanceIntervalValue === null ? '' : String(store.nextMaintenanceIntervalValue)}
                                            onChange={v => store.updateField('nextMaintenanceIntervalValue', v === '' ? null : parseInt(v))}
                                            type="number"
                                            placeholder={store.nextMaintenanceType === 'mileage' ? 'z.B. 10000' : 'z.B. 30'}
                                            suffix={store.nextMaintenanceType === 'mileage' ? 'km' : (store.nextMaintenanceType === 'days' ? t('step3.maintenanceIntervalDays') : t('step3.maintenanceIntervalMonths'))}
                                            adminMode={adminMode}
                                            onToggleRequired={() => onToggleRequired?.('nextMaintenanceIntervalValue')}
                                            required={isRequired('nextMaintenanceIntervalValue')}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Additional Info: Photos, Fixed Mileage Target, Price */}
                            <div className="space-y-6">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-[0.05em] text-slate-400">{t('step4.photoActions')}</span>
                                        <div className="flex items-center gap-2">
                                            <label className="p-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer text-slate-500 hover:text-primary hover:border-primary transition-all shadow-sm">
                                                <Camera className="w-4 h-4" />
                                                <input type="file" accept="image/*" capture="environment" onChange={e => handleGenericPhoto(e, 'maintenanceImages')} className="hidden" />
                                            </label>
                                            <label className="p-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer text-slate-500 hover:text-primary hover:border-primary transition-all shadow-sm">
                                                <ImagePlus className="w-4 h-4" />
                                                <input type="file" multiple accept="image/*" onChange={e => handleGenericPhoto(e, 'maintenanceImages')} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                    {(store as any).maintenanceImages && (store as any).maintenanceImages.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 min-h-[50px]">
                                            {(store as any).maintenanceImages.map((img: string, idx: number) => (
                                                <PhotoThumbnail
                                                    key={idx}
                                                    src={img}
                                                    onRemove={() => removeFieldPhoto('maintenanceImages', idx)}
                                                    onUpdate={(newSrc) => updateFieldPhoto('maintenanceImages', idx, newSrc)}
                                                    className="w-20 h-14"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className={`grid grid-cols-1 ${isVehicleEvaluation || store.nextMaintenanceType === 'mileage' ? '' : '@3xl:grid-cols-2'} gap-4`}>
                                    {store.nextMaintenanceType !== 'mileage' && (
                                        <FormInput
                                            name="nextMaintenanceMileage"
                                            error={getFieldError('nextMaintenanceMileage')}
                                            label={t('step3.nextMaintenanceMileage')}
                                            value={store.nextMaintenanceMileage ? String(store.nextMaintenanceMileage) : ''}
                                            onChange={v => store.updateField('nextMaintenanceMileage', parseInt(v) || 0)}
                                            type="number"
                                            placeholder="z.B. 30000"
                                            suffix="km"
                                            adminMode={adminMode}
                                            onToggleRequired={() => onToggleRequired?.('nextMaintenanceMileage')}
                                            required={isRequired('nextMaintenanceMileage')}
                                        />
                                    )}
                                    {!isVehicleEvaluation && (
                                        <FormInput
                                            name="maintenancePrice"
                                            error={getFieldError('maintenancePrice')}
                                            label={t('step3.maintenancePrice')}
                                            type="number"
                                            value={String(store.maintenancePrice || '')}
                                            onChange={v => store.updateField('maintenancePrice', parseFloat(v) || 0)}
                                            placeholder="0.00"
                                            suffix="€"
                                            adminMode={adminMode}
                                            onToggleRequired={() => onToggleRequired?.('maintenancePrice')}
                                            required={isRequired('maintenancePrice')}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Charging Cable - Only for EV/Hybrid */}
            {showChargingCable && (
                <>
                    <SectionTitle>{t('step3.chargingCable')}</SectionTitle>
                    <Card>
                        <div 
                            data-fieldname="chargingCable"
                            className={`flex flex-col gap-2 p-3 rounded-xl transition-all ${
                                showValidationErrors && validationErrors['chargingCable']
                                    ? 'border-2 border-red-500 bg-red-50/10'
                                    : 'border border-transparent'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">{t('step3.chargingCable')}</label>
                                {adminMode && (
                                    <button
                                        onClick={() => onToggleRequired?.('chargingCable')}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all text-[10px] font-bold uppercase tracking-wider
                                            ${isRequired('chargingCable')
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'bg-white text-gray-400 border border-gray-200 hover:border-primary/30 hover:text-primary'
                                            }`}
                                    >
                                        <CheckCircle className="w-3 h-3" />
                                        {t('admin.mandatory')}
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4">
                                {(['YES', 'NO', 'NOT_AVAILABLE'] as const).map((option) => (
                                    <label key={option} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="chargingCable"
                                            value={option}
                                            checked={store.chargingCable === option}
                                            onChange={(e) => store.updateField('chargingCable', e.target.value as any)}
                                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                        />
                                        <span className={`text-sm ${store.chargingCable === option ? 'text-primary font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                            {t(`step3.chargingCableOptions.${option}`)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {showValidationErrors && validationErrors['chargingCable'] && (
                                <p className="text-[10px] text-red-600 font-medium">{t('validation.required', 'Pflichtfeld')}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                    <label className="p-2 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm">
                                        <Camera className="w-4 h-4" />
                                        <input type="file" accept="image/*" capture="environment" onChange={handleChargingCablePhoto} className="hidden" />
                                    </label>
                                    <label className="p-2 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm">
                                        <ImagePlus className="w-4 h-4" />
                                        <input type="file" multiple accept="image/*" onChange={handleChargingCablePhoto} className="hidden" />
                                    </label>
                                </div>
                                {(store as any).chargingCableImages && (store as any).chargingCableImages.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {(store as any).chargingCableImages.map((img: string, idx: number) => (
                                            <PhotoThumbnail
                                                key={idx}
                                                src={img}
                                                onRemove={() => removeFieldPhoto('chargingCableImages', idx)}
                                                onUpdate={(newSrc) => updateFieldPhoto('chargingCableImages', idx, newSrc)}
                                                className="w-20 h-14"
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </Card>
                </>
            )}

            {/* Paint Measurements */}
            <SectionTitle>{t('step3.paintMeasurements')}</SectionTitle>
            <Card>
                <div className="mb-6">
                    <FormCheckbox
                        name="noPaintIssuesDetected"
                        error={showValidationErrors && validationErrors['noPaintIssuesDetected'] ? true : false}
                        label={<span>{t('step3.noPaintIssuesDetected')}</span>}
                        checked={store.noPaintIssuesDetected}
                        onChange={v => store.updateField('noPaintIssuesDetected', v)}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('noPaintIssuesDetected')}
                        required={isRequired('noPaintIssuesDetected')}
                    />
                </div>

                {!store.noPaintIssuesDetected && (
                    <div 
                        data-fieldname="paintMeasurements"
                        className={`space-y-4 animate-fade-in p-3 rounded-xl transition-all ${
                            showValidationErrors && validationErrors['paintMeasurements']
                                ? 'border-2 border-red-500 bg-red-50/10'
                                : 'border border-transparent'
                        }`}
                    >
                        {/* Desktop Table - Hidden on Mobile */}
                        <div className="hidden @3xl:block overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-1/4">{t('step3.paintComponent')}</th>
                                        <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 w-32">{t('step4.photoActions')}</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 w-24">{t('step3.measuredMicrons')}</th>
                                        <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 w-32">{t('step3.damageKnown')}</th>
                                        <th className="py-3 px-4 text-center text-sm font-semibold text-gray-900 w-32">{t('step3.damageUnknown')}</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 flex-1">{t('step3.paintValueOrDetails', 'Beschreibung / Wertminderung')}</th>
                                        <th className="py-3 px-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {store.paintMeasurements.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors whitespace-nowrap">
                                            <td className="py-3 px-4 w-1/4">
                                                <ManualSelect
                                                    options={PAINT_BODY_PART_OPTIONS.map(opt => ({
                                                        value: opt,
                                                        label: t(`bodyParts.${opt}`)
                                                    }))}
                                                    value={p.bodyPart}
                                                    onChange={val => {
                                                        store.updatePaintMeasurement(p.id, { bodyPart: val });
                                                    }}
                                                    placeholder={t('step3.componentPlaceholder')}
                                                    className={`!py-1.5 ${showValidationErrors && !p.bodyPart ? 'border-2 border-red-500 rounded-xl bg-red-50/10' : ''}`}
                                                    disabled={store.noPaintIssuesDetected}
                                                />
                                            </td>
                                            <td className="py-3 px-4 w-32">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className={`flex items-center gap-1 p-1 rounded-lg ${showValidationErrors && (!p.images || p.images.length === 0) ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                                                        <label className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.takePhoto')}>
                                                            <Camera className="w-4 h-4" />
                                                            <input type="file" accept="image/*" capture="environment" onChange={e => handlePaintPhoto(e, p.id)} className="hidden" />
                                                        </label>
                                                        <label className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.choosePhoto')}>
                                                            <ImagePlus className="w-4 h-4" />
                                                            <input type="file" multiple accept="image/*" onChange={e => handlePaintPhoto(e, p.id)} className="hidden" />
                                                        </label>
                                                    </div>
                                                    {p.images && p.images.length > 0 && (
                                                        <div className="flex flex-wrap justify-center gap-1 max-w-[120px]">
                                                            {p.images.map((img, idx) => (
                                                                <PhotoThumbnail
                                                                    key={idx}
                                                                    src={img}
                                                                    onRemove={() => removePaintPhoto(p.id, idx)}
                                                                    onUpdate={(newSrc) => updatePaintPhoto(p.id, idx, newSrc)}
                                                                    className="w-20 h-14"
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 w-24">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        className={`form-input py-1.5 pr-8 text-sm w-full text-center font-mono bg-white ${showValidationErrors && !(Number(p.measuredMicrons) > 0) ? 'border-2 border-red-500 bg-red-50/10' : ''}`}
                                                        value={p.measuredMicrons || ''}
                                                        onChange={e => store.updatePaintMeasurement(p.id, { measuredMicrons: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0"
                                                        disabled={store.noPaintIssuesDetected}
                                                    />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono pointer-events-none">µm</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 w-32">
                                                <button
                                                    type="button"
                                                    onClick={() => store.updatePaintMeasurement(p.id, {
                                                        damageKnown: !p.damageKnown,
                                                        damageUnknown: false
                                                    })}
                                                    disabled={store.noPaintIssuesDetected}
                                                    className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm h-[34px] ${p.damageKnown
                                                        ? 'bg-red-500 text-white shadow-red-200'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {t('step3.damageKnown')}
                                                </button>
                                            </td>
                                            <td className="py-3 px-4 w-32">
                                                <button
                                                    type="button"
                                                    onClick={() => store.updatePaintMeasurement(p.id, {
                                                        damageUnknown: !p.damageUnknown,
                                                        damageKnown: false
                                                    })}
                                                    disabled={store.noPaintIssuesDetected}
                                                    className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm h-[34px] ${p.damageUnknown
                                                        ? 'bg-orange-500 text-white shadow-orange-200'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {t('step3.damageUnknown')}
                                                </button>
                                            </td>
                                            <td className="py-3 px-4 flex-1">
                                                <div className="flex items-center gap-3 min-w-[300px]">
                                                    {p.damageKnown && (
                                                        <div className="flex-1 animate-fade-in">
                                                            <input
                                                                type="text"
                                                                className={`form-input py-1.5 text-sm w-full ${showValidationErrors && p.damageKnown && (!p.repairDamage || !p.repairDamage.trim()) ? 'border-2 border-red-500 bg-red-50/10' : 'border-red-100 focus:border-red-300 focus:ring-red-100'}`}
                                                                value={p.repairDamage || ''}
                                                                onChange={e => store.updatePaintMeasurement(p.id, { repairDamage: e.target.value })}
                                                                placeholder={`${t('step3.repairDamageDesc')} *`}
                                                            />
                                                        </div>
                                                    )}
                                                    {(p.damageKnown || p.damageUnknown) && !isVehicleEvaluation && (
                                                        <div className="w-32 relative animate-fade-in">
                                                            <input
                                                                type="number"
                                                                className={`form-input py-1.5 pr-6 text-sm w-full ${p.damageKnown ? 'border-red-100 focus:border-red-300' : 'border-orange-100 focus:border-orange-300'}`}
                                                                value={p.depreciationValue || ''}
                                                                onChange={e => store.updatePaintMeasurement(p.id, { depreciationValue: parseFloat(e.target.value) || 0 })}
                                                                placeholder="0.00"
                                                            />
                                                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold ${p.damageKnown ? 'text-red-400' : 'text-orange-400'}`}>€</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Note: Photo Actions cell was moved up next to Bauteil */}
                                            <td className="py-3 px-4 w-10 text-right">
                                                <button
                                                    onClick={() => store.removePaintMeasurement(p.id)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                    disabled={store.noPaintIssuesDetected}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card Layout - Shown on Small Screens */}
                        <div className="@3xl:hidden space-y-4">
                            {store.paintMeasurements.map((p) => (
                                <div key={p.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col ${showValidationErrors && (!p.bodyPart || !(Number(p.measuredMicrons) > 0) || !p.images || p.images.length === 0 || (p.damageKnown && (!p.repairDamage || !p.repairDamage.trim()))) ? 'border-red-500 ring-1 ring-red-500 bg-red-50/5' : 'border-gray-200'}`}>
                                    {/* Card Header: Part Name & Delete */}
                                    <div className="bg-gray-50/80 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                                        <div className="flex-1 mr-2">
                                            <ManualSelect
                                                options={PAINT_BODY_PART_OPTIONS.map(opt => ({
                                                    value: opt,
                                                    label: t(`bodyParts.${opt}`)
                                                }))}
                                                value={p.bodyPart}
                                                onChange={val => store.updatePaintMeasurement(p.id, { bodyPart: val })}
                                                placeholder={t('step3.componentPlaceholder')}
                                                className={`!py-1 font-bold text-gray-900 border-none bg-transparent focus:ring-0 ${showValidationErrors && !p.bodyPart ? 'text-red-600 bg-red-50' : ''}`}
                                                disabled={store.noPaintIssuesDetected}
                                            />
                                        </div>
                                        <button
                                            onClick={() => store.removePaintMeasurement(p.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            disabled={store.noPaintIssuesDetected}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 space-y-4">
                                        {/* Measurement Row */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                                                    {t('step3.measuredMicrons')} (µm)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        className={`form-input py-2 pr-8 text-base w-full font-mono bg-gray-50 rounded-lg text-center ${showValidationErrors && !(Number(p.measuredMicrons) > 0) ? 'border-2 border-red-500 bg-red-50/10' : 'border-gray-200'}`}
                                                        value={p.measuredMicrons || ''}
                                                        onChange={e => store.updatePaintMeasurement(p.id, { measuredMicrons: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0"
                                                        disabled={store.noPaintIssuesDetected}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">µm</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center gap-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                                                    {t('step4.photoActions')}
                                                </label>
                                                <div className={`flex items-center gap-2 p-1 rounded-lg ${showValidationErrors && (!p.images || p.images.length === 0) ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                                                    <label className="p-2.5 bg-primary text-white rounded-lg cursor-pointer shadow-md active:scale-95 transition-all">
                                                        <Camera className="w-5 h-5" />
                                                        <input type="file" accept="image/*" capture="environment" onChange={e => handlePaintPhoto(e, p.id)} className="hidden" />
                                                    </label>
                                                    <label className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg cursor-pointer shadow-sm active:scale-95 transition-all">
                                                        <ImagePlus className="w-5 h-5" />
                                                        <input type="file" multiple accept="image/*" onChange={e => handlePaintPhoto(e, p.id)} className="hidden" />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Thumbnails Row */}
                                        {p.images && p.images.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {p.images.map((img, idx) => (
                                                    <PhotoThumbnail
                                                        key={idx}
                                                        src={img}
                                                        onRemove={() => removePaintPhoto(p.id, idx)}
                                                        onUpdate={(newSrc) => updatePaintPhoto(p.id, idx, newSrc)}
                                                        className="w-20 h-14"
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Assessment Row */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => store.updatePaintMeasurement(p.id, {
                                                    damageKnown: !p.damageKnown,
                                                    damageUnknown: false
                                                })}
                                                disabled={store.noPaintIssuesDetected}
                                                className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${p.damageKnown
                                                    ? 'bg-red-500 text-white shadow-red-100 ring-2 ring-red-500 ring-offset-2'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {t('step3.damageKnown')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => store.updatePaintMeasurement(p.id, {
                                                    damageUnknown: !p.damageUnknown,
                                                    damageKnown: false
                                                })}
                                                disabled={store.noPaintIssuesDetected}
                                                className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${p.damageUnknown
                                                    ? 'bg-orange-500 text-white shadow-orange-100 ring-2 ring-orange-500 ring-offset-2'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {t('step3.damageUnknown')}
                                            </button>
                                        </div>

                                        {/* Repair/Calculation Details */}
                                        {((p.damageKnown) || (p.damageUnknown && !isVehicleEvaluation)) && (
                                            <div className={`mt-2 p-4 rounded-xl border space-y-4 animate-in slide-in-from-top-2 duration-300 ${p.damageKnown ? 'bg-red-50/50 border-red-100' : 'bg-orange-50/50 border-orange-100'}`}>
                                                {p.damageKnown && (
                                                    <div>
                                                        <label className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 ${p.damageKnown ? 'text-red-400' : 'text-orange-400'}`}>
                                                            {t('step3.repairDamageDesc')} *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className={`form-input py-2 text-sm w-full bg-white rounded-lg ${showValidationErrors && p.damageKnown && (!p.repairDamage || !p.repairDamage.trim()) ? 'border-2 border-red-500 bg-red-50/10' : 'border-none shadow-sm'}`}
                                                            value={p.repairDamage || ''}
                                                            onChange={e => store.updatePaintMeasurement(p.id, { repairDamage: e.target.value })}
                                                            placeholder={t('step3.repairDamageDesc')}
                                                        />
                                                    </div>
                                                )}
                                                {!isVehicleEvaluation && (
                                                    <div>
                                                        <label className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 ${p.damageKnown ? 'text-red-400' : 'text-orange-400'}`}>
                                                            {t('minderwert.depreciation', 'Wertminderung')}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                className="form-input py-2 pr-10 text-base w-full font-mono bg-white border-none shadow-sm rounded-lg text-right"
                                                                value={p.depreciationValue || ''}
                                                                onChange={e => store.updatePaintMeasurement(p.id, { depreciationValue: parseFloat(e.target.value) || 0 })}
                                                                placeholder="0.00"
                                                            />
                                                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${p.damageKnown ? 'text-red-400' : 'text-orange-400'}`}>€</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={store.addPaintMeasurement}
                                disabled={store.noPaintIssuesDetected}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all shadow-sm"
                            >
                                <Plus className="w-4 h-4 text-red-500" />
                                {t('step3.addPaint')}
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Tires & Equipment */}
            <SectionTitle>{t('step3.tiresAndEquipment')}</SectionTitle>
            <Card>
                <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-3 mb-6">
                    <EquipmentSelect
                        name="breakdownKit"
                        error={getFieldError('breakdownKit')}
                        label={t('step3.breakdownKit')}
                        value={store.breakdownKit}
                        onChange={v => store.updateField('breakdownKit', v)}
                        showExpiration={true}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('breakdownKit')}
                        required={isRequired('breakdownKit')}
                    />
                    <div className="relative flex flex-col gap-2 w-full group">
                        <label className="block text-[11px] font-black uppercase tracking-[0.05em] mb-1 text-slate-400 group-hover:text-slate-600">
                            {t('step3.tireConfiguration')}
                        </label>
                        <div className="relative flex flex-col gap-2 p-2 bg-white rounded-xl border border-slate-200 transition-all duration-300">
                            <select
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-primary/30 transition-all"
                                value={store.tireConfiguration || '2-axle'}
                                onChange={e => store.updateTireConfiguration(e.target.value as any)}
                            >
                                <option value="2-axle">{t('step3.config2Axle')}</option>
                                <option value="3-axle">{t('step3.config3Axle')}</option>
                                <option value="2-axle-twin">{t('step3.config2AxleTwin')}</option>
                                <option value="3-axle-twin">{t('step3.config3AxleTwin')}</option>
                            </select>
                        </div>
                    </div>
                    <EquipmentSelect
                        name="firstAidKit"
                        error={getFieldError('firstAidKit')}
                        label={t('step3.firstAidKit')}
                        value={store.firstAidKit}
                        onChange={v => store.updateField('firstAidKit', v)}
                        showExpiration={true}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('firstAidKit')}
                        required={isRequired('firstAidKit')}
                    />
                    <EquipmentSelect
                        name="warningTriangle"
                        error={getFieldError('warningTriangle')}
                        label={t('step3.warningTriangle')}
                        value={store.warningTriangle}
                        onChange={v => store.updateField('warningTriangle', v)}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('warningTriangle')}
                        required={isRequired('warningTriangle')}
                    />
                    <EquipmentSelect
                        name="safetyVest"
                        error={getFieldError('safetyVest')}
                        label={t('step3.safetyVest')}
                        value={store.safetyVest}
                        onChange={v => store.updateField('safetyVest', v)}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('safetyVest')}
                        required={isRequired('safetyVest') || false}
                    />
                </div>

                <div className="mb-6 p-4 bg-orange-50/50 border border-orange-100 rounded-xl flex flex-col @3xl:flex-row @3xl:items-center gap-4">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t('step3.quickPhoto')}:</span>
                    <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-medium text-gray-400 bg-white px-2 py-1 rounded border border-gray-100 self-center">{t('step3.selectTire')}</span>
                    </div>
                </div>

                {/* Desktop table - Matching Step 4 design */}
                <div className="hidden @3xl:block overflow-x-auto -mx-4 @3xl:mx-0">
                    <table className="w-full min-w-[1000px]">
                        <thead>
                            <tr>
                                <th className="table-header w-32">{t('step4.photoActions')}</th>
                                <th className="table-header w-12">{t('step3.tireAxle')}</th>
                                <th className="table-header">{t('step3.tireSide')}</th>
                                <th className="table-header">{t('step3.tireDesignation')}</th>
                                <th className="table-header">{t('step3.tireManufacturer')}</th>
                                <th className="table-header">{t('step3.tireModel')}</th>
                                <th className="table-header">{t('step3.tireType')}</th>
                                <th className="table-header">{t('step3.tireTread')}</th>
                                <th className="table-header">DOT</th>
                                <th className="table-header">{t('step3.rimType')}</th>
                                <th className="table-header">{t('step3.damaged')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {store.tires.map((tire, i) => {
                                const photoCount = (tire.images || []).length;
                                return (
                                    <tr key={i} className="hover:bg-gray-50 group">
                                        <td className="table-cell">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setEditingTireIndex(i)} className="p-1 text-primary hover:bg-primary/10 rounded font-medium text-sm">
                                                    {t('step4.edit')}
                                                </button>
                                                {photoCount > 0 && (
                                                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-white text-[10px] font-bold rounded-full shadow-sm whitespace-nowrap">
                                                        {photoCount} {t('step4.photosAbbr')}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        store.copyToNextTire(i);
                                                        toast.success(t('step3.copySuccess'));
                                                    }}
                                                    className="p-1 text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                                                    title={t('step3.copyToAxle', 'Copy to next')}
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <div className="flex items-center gap-1 border-l border-gray-200 pl-1">
                                                    <label className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded cursor-pointer transition-all" title={t('step4.takePhoto')}>
                                                        <Camera className="w-4 h-4" />
                                                        <input type="file" accept="image/*" capture="environment" onChange={e => handleTireQuickPhoto(e, i, false)} className="hidden" />
                                                    </label>
                                                    <label className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded cursor-pointer transition-all" title={t('step4.choosePhoto')}>
                                                        <ImagePlus className="w-4 h-4" />
                                                        <input type="file" multiple accept="image/*" onChange={e => handleTireQuickPhoto(e, i, false)} className="hidden" />
                                                    </label>
                                                </div>
                                                {tire.images && tire.images.length > 0 && (
                                                    <div className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-1">
                                                        {tire.images.map((img, idx) => (
                                                            <PhotoThumbnail
                                                                key={idx}
                                                                src={img}
                                                                onRemove={() => removeTirePhoto(i, idx, false)}
                                                                onUpdate={(newSrc) => updateTirePhoto(i, idx, newSrc, false)}
                                                                className="w-20 h-14"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="table-cell font-bold">{tire.axle}</td>
                                        <td className="table-cell">{tire.side === 'links' ? t('common.left') : t('common.right')}</td>
                                        <td className="table-cell">{tire.designation || '-'}</td>
                                        <td className="table-cell">{tire.manufacturer || '-'}</td>
                                        <td className="table-cell">{tire.tireModel || '-'}</td>
                                        <td className="table-cell">
                                            {tire.type === 'S' && t('step3.tireSummer')}
                                            {tire.type === 'W' && t('step3.tireWinter')}
                                            {tire.type === 'A' && t('step3.tireAllSeason')}
                                            {!tire.type && '-'}
                                        </td>
                                        <td className="table-cell">{tire.treadDepth || '-'}</td>
                                        <td className="table-cell uppercase font-mono">{tire.dotNumber || '-'}</td>
                                        <td className="table-cell">{tire.rimType ? t(`step3.rim${tire.rimType}`, tire.rimType) : '-'}</td>
                                        <td className="table-cell">
                                            {tire.damaged ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                    {t('common.yes')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                    {t('common.no')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Mobile cards - Matching Step 4 design */}
                <div className="@3xl:hidden space-y-3">
                    {store.tires.map((tire, i) => {
                        const photoCount = (tire.images || []).length;
                        return (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-primary">#{i + 1}</span>
                                        <div className="flex items-center gap-1 ml-2">
                                            <button onClick={() => setEditingTireIndex(i)} className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-primary transition-colors hover:shadow-sm font-medium text-sm px-3">
                                                {t('step4.edit')}
                                            </button>
                                            {photoCount > 0 && (
                                                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-white text-[10px] font-bold rounded-full">
                                                    {photoCount} {t('step4.photosAbbr')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            store.copyToNextTire(i);
                                            toast.success(t('step3.copySuccess'));
                                        }}
                                        className="flex items-center gap-1 text-[10px] bg-primary/10 px-2 py-0.5 rounded text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                                    >
                                        <Copy className="w-3 h-3" />
                                        {t('step3.copyToAxle', 'Copy to next')}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 py-1 border-y border-gray-100/50">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('step4.photoActions')}:</span>
                                    <label className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-primary shadow-sm active:scale-95 transition-all flex items-center gap-1">
                                        <Camera className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold">{t('step4.takePhoto')}</span>
                                        <input type="file" accept="image/*" capture="environment" onChange={e => handleTireQuickPhoto(e, i, false)} className="hidden" />
                                    </label>
                                    <label className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-500 shadow-sm active:scale-95 transition-all flex items-center gap-1">
                                        <ImagePlus className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold">{t('step4.upload')}</span>
                                        <input type="file" multiple accept="image/*" onChange={e => handleTireQuickPhoto(e, i, false)} className="hidden" />
                                    </label>
                                </div>
                                <div className="text-sm font-semibold text-gray-800">
                                    {t('step3.axleLabel', { axle: tire.axle, side: tire.side === 'links' ? t('common.left') : t('common.right') })}
                                    {tire.designation && <span className="text-gray-600 font-normal"> - {tire.designation}</span>}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 bg-white/50 p-2 rounded-lg border border-gray-100/50">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireManufacturer')}</label>
                                        <div className="text-sm truncate">{tire.manufacturer || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireModel')}</label>
                                        <div className="text-sm truncate">{tire.tireModel || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireType')}</label>
                                        <div className="text-sm">
                                            {tire.type === 'S' && t('step3.tireSummer')}
                                            {tire.type === 'W' && t('step3.tireWinter')}
                                            {tire.type === 'A' && t('step3.tireAllSeason')}
                                            {!tire.type && '-'}
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireTread')}</label>
                                            <div className="text-sm">{tire.treadDepth || '-'}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">DOT</label>
                                            <div className="text-sm">{tire.dotNumber || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 mt-1 border-t border-gray-100 pt-1 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.rimType')}</label>
                                            <div className="text-sm truncate">{tire.rimType ? t(`step3.rim${tire.rimType}`, tire.rimType) : '-'}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.damaged')}</label>
                                            <div className="text-sm">{tire.damaged ? t('common.yes') : t('common.no')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Spare Tire Section */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="font-semibold text-gray-700">{t('step3.tireSpareTire')}</span>
                        <FormCheckbox
                            label={t('step3.spareTirePresent')}
                            checked={store.spareTire.present}
                            onChange={v => store.updateSpareTire({ present: v })}
                        />
                    </div>

                    {store.spareTire.present && (
                        <div className="animate-fade-in">
                            {/* Desktop Spare Tire Summary */}
                            <div className="hidden @3xl:block overflow-x-auto -mx-4 @3xl:mx-0">
                                <table className="w-full min-w-[1000px]">
                                    <thead>
                                        <tr>
                                            <th className="table-header w-24">{t('step4.photoActions')}</th>
                                            <th className="table-header">{t('step3.tireDesignation')}</th>
                                            <th className="table-header">{t('step3.tireManufacturer')}</th>
                                            <th className="table-header">{t('step3.tireModel')}</th>
                                            <th className="table-header">{t('step3.tireType')}</th>
                                            <th className="table-header">{t('step3.tireTread')}</th>
                                            <th className="table-header">DOT</th>
                                            <th className="table-header">{t('step3.rimType')}</th>
                                            <th className="table-header">{t('step3.damaged')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="hover:bg-gray-50">
                                            <td className="table-cell">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setEditingTireIndex(null)} className="p-1 text-primary hover:bg-primary/10 rounded font-medium text-sm">
                                                        {t('step4.edit')}
                                                    </button>
                                                    {store.spareTire.images && store.spareTire.images.length > 0 && (
                                                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-white text-[10px] font-bold rounded-full shadow-sm whitespace-nowrap">
                                                            {store.spareTire.images.length} {t('step4.photosAbbr')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="table-cell">{store.spareTire.designation || '-'}</td>
                                            <td className="table-cell">{store.spareTire.manufacturer || '-'}</td>
                                            <td className="table-cell">{store.spareTire.tireModel || '-'}</td>
                                            <td className="table-cell">
                                                {store.spareTire.type === 'S' && t('step3.tireSummer')}
                                                {store.spareTire.type === 'W' && t('step3.tireWinter')}
                                                {store.spareTire.type === 'A' && t('step3.tireAllSeason')}
                                                {!store.spareTire.type && '-'}
                                            </td>
                                            <td className="table-cell">{store.spareTire.treadDepth || '-'}</td>
                                            <td className="table-cell uppercase font-mono">{store.spareTire.dotNumber || '-'}</td>
                                            <td className="table-cell">{store.spareTire.rimType ? t(`step3.rim${store.spareTire.rimType}`, store.spareTire.rimType) : '-'}</td>
                                            <td className="table-cell">
                                                {store.spareTire.damaged ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                        {t('common.yes')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                        {t('common.no')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Spare Tire Card */}
                            <div className="@3xl:hidden bg-gray-50 rounded-lg p-3 space-y-2 border border-blue-100">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-primary">#{t('step3.tireSpareTire')}</span>
                                        <button onClick={() => setEditingTireIndex(null)} className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-primary transition-colors hover:shadow-sm font-medium text-sm px-3 ml-2">
                                            {t('step4.edit')}
                                        </button>
                                        {store.spareTire.images && store.spareTire.images.length > 0 && (
                                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-white text-[10px] font-bold rounded-full">
                                                {store.spareTire.images.length} {t('step4.photosAbbr')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-gray-800">
                                    {store.spareTire.designation || t('step3.tireSpareTire')}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 bg-white/50 p-2 rounded-lg border border-gray-100/50">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireManufacturer')}</label>
                                        <div className="text-sm truncate">{store.spareTire.manufacturer || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireModel')}</label>
                                        <div className="text-sm truncate">{store.spareTire.tireModel || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireType')}</label>
                                        <div className="text-sm">
                                            {store.spareTire.type === 'S' && t('step3.tireSummer')}
                                            {store.spareTire.type === 'W' && t('step3.tireWinter')}
                                            {store.spareTire.type === 'A' && t('step3.tireAllSeason')}
                                            {!store.spareTire.type && '-'}
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireTread')}</label>
                                            <div className="text-sm">{store.spareTire.treadDepth || '-'}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">DOT</label>
                                            <div className="text-sm">{store.spareTire.dotNumber || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 mt-1 border-t border-gray-100 pt-1 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.rimType')}</label>
                                            <div className="text-sm truncate">{store.spareTire.rimType ? t(`step3.rim${store.spareTire.rimType}`, store.spareTire.rimType) : '-'}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.damaged')}</label>
                                            <div className="text-sm">{store.spareTire.damaged ? t('common.yes') : t('common.no')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Second Set of Tires Section */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="font-semibold text-gray-700">{t('step3.secondTireSet')}</span>
                        <FormCheckbox
                            label={t('step3.addSecondTireSet')}
                            checked={store.hasSecondTireSet}
                            onChange={v => store.toggleSecondTireSet(v)}
                        />
                    </div>

                    {store.hasSecondTireSet && (
                        <div className="animate-fade-in space-y-6">
                            <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('step3.wheelsetSelection')}</label>
                                    <select
                                        className="form-input py-2 text-sm"
                                        value={store.secondTireSetSelection || 'Both'}
                                        onChange={e => store.updateField('secondTireSetSelection', e.target.value as any)}
                                    >
                                        <option value="Both">{t('step3.selectionBoth')}</option>
                                        <option value="Only Tires">{t('step3.selectionOnlyTires')}</option>
                                        <option value="Only Rims">{t('step3.selectionOnlyRims')}</option>
                                    </select>
                                </div>
                            </div>
                            {/* Desktop Second Set Table */}
                            <div className="hidden @3xl:block overflow-x-auto -mx-4 @3xl:mx-0">
                                <table className="w-full min-w-[1000px]">
                                    <thead>
                                        <tr>
                                            <th className="table-header w-32">{t('step4.photoActions')}</th>
                                            <th className="table-header w-12">{t('step3.tireAxle')}</th>
                                            <th className="table-header">{t('step3.tireSide')}</th>
                                            <th className="table-header">{t('step3.tireDesignation')}</th>
                                            <th className="table-header">{t('step3.tireManufacturer')}</th>
                                            <th className="table-header">{t('step3.tireModel')}</th>
                                            <th className="table-header">{t('step3.tireType')}</th>
                                            <th className="table-header">{t('step3.tireTread')}</th>
                                            <th className="table-header">DOT</th>
                                            {store.secondTireSetSelection !== 'Only Tires' && (
                                                <th className="table-header">{t('step3.rimType')}</th>
                                            )}
                                            {store.secondTireSetSelection !== 'Only Rims' && (
                                                <th className="table-header">{t('step3.damaged')}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {store.secondTires.map((tire, i) => {
                                            const photoCount = (tire.images || []).length;
                                            return (
                                                <tr key={i} className="hover:bg-gray-50 group">
                                                    <td className="table-cell">
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => setEditingSecondTireIndex(i)} className="p-1 text-primary hover:bg-primary/10 rounded font-medium text-sm">
                                                                {t('step4.edit')}
                                                            </button>
                                                            {photoCount > 0 && (
                                                                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-white text-[10px] font-bold rounded-full shadow-sm whitespace-nowrap">
                                                                    {photoCount} {t('step4.photosAbbr')}
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    store.copySecondTireToNext(i);
                                                                    toast.success(t('step3.copySuccess'));
                                                                }}
                                                                className="p-1 text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                                                                title={t('step3.copyToAxle', 'Copy to next')}
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                            <div className="flex items-center gap-1 border-l border-gray-200 pl-1">
                                                                <label className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded cursor-pointer transition-all" title={t('step4.takePhoto')}>
                                                                    <Camera className="w-4 h-4" />
                                                                    <input type="file" accept="image/*" capture="environment" onChange={e => handleTireQuickPhoto(e, i, true)} className="hidden" />
                                                                </label>
                                                                <label className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded cursor-pointer transition-all" title={t('step4.choosePhoto')}>
                                                                    <ImagePlus className="w-4 h-4" />
                                                                    <input type="file" multiple accept="image/*" onChange={e => handleTireQuickPhoto(e, i, true)} className="hidden" />
                                                                </label>
                                                            </div>
                                                            {tire.images && tire.images.length > 0 && (
                                                                <div className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-1">
                                                                    {tire.images.map((img, idx) => (
                                                                        <PhotoThumbnail
                                                                            key={idx}
                                                                            src={img}
                                                                            onRemove={() => removeTirePhoto(i, idx, true)}
                                                                            onUpdate={(newSrc) => updateTirePhoto(i, idx, newSrc, true)}
                                                                            className="w-20 h-14"
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="table-cell font-bold">{tire.axle}</td>
                                                    <td className="table-cell">{tire.side === 'links' ? t('common.left') : t('common.right')}</td>
                                                    <td className="table-cell">{tire.designation || '-'}</td>
                                                    <td className="table-cell">{tire.manufacturer || '-'}</td>
                                                    <td className="table-cell">{tire.tireModel || '-'}</td>
                                                    <td className="table-cell">
                                                        {tire.type === 'S' && t('step3.tireSummer')}
                                                        {tire.type === 'W' && t('step3.tireWinter')}
                                                        {tire.type === 'A' && t('step3.tireAllSeason')}
                                                        {!tire.type && '-'}
                                                    </td>
                                                    <td className="table-cell">{tire.treadDepth || '-'}</td>
                                                    <td className="table-cell uppercase font-mono">{tire.dotNumber || '-'}</td>
                                                    {store.secondTireSetSelection !== 'Only Tires' && (
                                                        <td className="table-cell">{tire.rimType ? t(`step3.rim${tire.rimType}`, tire.rimType) : '-'}</td>
                                                    )}
                                                    {store.secondTireSetSelection !== 'Only Rims' && (
                                                        <td className="table-cell">
                                                            {tire.damaged ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                                    {t('common.yes')}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                    {t('common.no')}
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                             {/* Mobile Second Set Cards */}
                             <div className="@3xl:hidden space-y-3">
                                 {store.secondTires.map((tire, i) => {
                                     const photoCount = (tire.images || []).length;
                                     return (
                                         <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
                                             <div className="flex justify-between items-center">
                                                 <div className="flex items-center gap-2">
                                                     <span className="font-bold text-primary">#{i + 1}</span>
                                                     <div className="flex items-center gap-1 ml-2">
                                                         <button onClick={() => setEditingSecondTireIndex(i)} className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-primary transition-colors hover:shadow-sm font-medium text-sm px-3">
                                                             {t('step4.edit')}
                                                         </button>
                                                         {photoCount > 0 && (
                                                             <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                                                                 {photoCount} {t('step4.photosAbbr')}
                                                             </span>
                                                         )}
                                                     </div>
                                                 </div>
                                                 <button
                                                     onClick={() => {
                                                         store.copySecondTireToNext(i);
                                                         toast.success(t('step3.copySuccess'));
                                                     }}
                                                     className="flex items-center gap-1 text-[10px] bg-primary/10 px-2 py-0.5 rounded text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                                                 >
                                                     <Copy className="w-3 h-3" />
                                                     {t('step3.copyToAxle', 'Copy to next')}
                                                 </button>
                                             </div>
                                             <div className="text-sm font-semibold text-gray-800">
                                                 {t('step3.axleLabel', { axle: tire.axle, side: tire.side === 'links' ? t('common.left') : t('common.right') })}
                                             </div>
                                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 bg-white/50 p-2 rounded-lg border border-gray-100/50">
                                                 <div>
                                                     <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireManufacturer')}</label>
                                                     <div className="text-sm truncate">{tire.manufacturer || '-'}</div>
                                                 </div>
                                                 <div>
                                                     <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.tireModel')}</label>
                                                     <div className="text-sm truncate">{tire.tireModel || '-'}</div>
                                                 </div>
                                                 {store.secondTireSetSelection === 'Both' && (
                                                     <div className="col-span-2 mt-1 border-t border-gray-100 pt-1 grid grid-cols-2 gap-4">
                                                         <div>
                                                             <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.rimType')}</label>
                                                             <div className="text-sm truncate">{tire.rimType ? t(`step3.rim${tire.rimType}`, tire.rimType) : '-'}</div>
                                                         </div>
                                                         <div>
                                                             <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.damaged')}</label>
                                                             <div className="text-sm">{tire.damaged ? t('common.yes') : t('common.no')}</div>
                                                         </div>
                                                     </div>
                                                 )}
                                                 {store.secondTireSetSelection === 'Only Tires' && (
                                                     <div className="col-span-2 mt-1 border-t border-gray-100 pt-1">
                                                         <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.damaged')}</label>
                                                         <div className="text-sm">{tire.damaged ? t('common.yes') : t('common.no')}</div>
                                                     </div>
                                                 )}
                                                 {store.secondTireSetSelection === 'Only Rims' && (
                                                     <div className="col-span-2 mt-1 border-t border-gray-100 pt-1">
                                                         <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('step3.rimType')}</label>
                                                         <div className="text-sm truncate">{tire.rimType ? t(`step3.rim${tire.rimType}`, tire.rimType) : '-'}</div>
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Card>



            <TireEntryModal
                isOpen={editingTireIndex !== undefined}
                onClose={() => setEditingTireIndex(undefined)}
                tireIndex={editingTireIndex as any}
            />

            <TireEntryModal
                isOpen={editingSecondTireIndex !== undefined}
                onClose={() => setEditingSecondTireIndex(undefined)}
                tireIndex={editingSecondTireIndex as any}
                isSecondSet={true}
            />
        </div>
    );
};

export default Step3_Condition;
