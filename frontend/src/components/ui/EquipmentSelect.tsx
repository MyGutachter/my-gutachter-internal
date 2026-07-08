import React from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ImagePlus, X } from 'lucide-react';
import { compressImage } from '../../utils/imageCompression';
import toast from 'react-hot-toast';
import type { EquipmentItem } from '../../types/report.types';
import PhotoThumbnail from './PhotoThumbnail';
import { useReportStore } from '../../store/reportStore';

interface EquipmentSelectProps {
    label: string;
    value: EquipmentItem;
    onChange: (val: EquipmentItem) => void;
    showExpiration?: boolean;
    required?: boolean;
    adminMode?: boolean;
    onToggleRequired?: () => void;
    name?: string;
    error?: string;
}

const EquipmentSelect: React.FC<EquipmentSelectProps> = ({
    label,
    value,
    onChange,
    showExpiration,
    required,
    adminMode,
    onToggleRequired,
    name,
    error
}) => {
    const { t } = useTranslation();
    const claimType = useReportStore(state => state.claimType);
    const isVehicleEvaluation = claimType === 'Fahrzeugbewertung';

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const currentImages = value.images || [];
        const newImages = [...currentImages];

        for (const file of Array.from(files)) {
            try {
                const compressedData = await compressImage(file, 1200, 1200, 0.7);
                newImages.push(compressedData);
            } catch (err) {
                console.error('Failed to compress image:', file.name, err);
                toast.error(`${t('step4.compressionError')}: ${file.name}`);
            }
        }
        onChange({ ...value, images: newImages });
        e.target.value = '';
    };

    const removePhoto = (imgIndex: number) => {
        const newImages = [...(value.images || [])];
        newImages.splice(imgIndex, 1);
        onChange({ ...value, images: newImages });
    };

    return (
        <div className="relative flex flex-col gap-2 w-full group" data-fieldname={name}>
            <label
                className={`block text-[11px] font-black uppercase tracking-[0.05em] mb-1 transition-all duration-300 ${required ? 'text-black' : 'text-slate-400 group-hover:text-slate-600'
                    } ${adminMode ? 'cursor-pointer' : ''}`}
                onClick={adminMode ? onToggleRequired : undefined}
            >
                <div className="flex items-center gap-1.5">
                    {label}
                    {required && !adminMode && <span className="text-red-500 ml-1 font-bold">*</span>}

                    {adminMode && required && (
                        <span className="text-[9px] font-bold bg-primary text-white px-2 py-0.5 rounded-full ml-auto">
                            {t('admin.mandatory')}
                        </span>
                    )}
                </div>
            </label>

            <div className={`relative flex flex-col gap-2 p-2 bg-white rounded-xl border-2 transition-all duration-300 ${
                error ? 'border-red-500 bg-red-50/10' :
                (adminMode && required ? 'border-primary/30 bg-primary/5 ring-4 ring-primary/5' : 'border-slate-200')
            } ${adminMode ? 'cursor-pointer hover:bg-slate-50/50' : ''}`}>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        className={`flex-1 min-w-[150px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-primary/30 transition-all ${adminMode ? 'pointer-events-none' : ''
                            }`}
                        value={value?.status || ''}
                        onChange={e => !adminMode && onChange({ ...value, status: e.target.value as any })}
                        disabled={adminMode}
                    >
                        <option value="">{t('common.noneSelected')}</option>
                        <option value="Available">{t('step3.equipmentAvailable')}</option>
                        <option value="Not available">{t('step3.equipmentNotAvailable')}</option>
                    </select>
                    {showExpiration && value?.status === 'Available' && (
                        <input
                            type="month"
                            className="w-36 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-primary/30 transition-all"
                            value={value.expirationDate || ''}
                            onChange={e => !adminMode && onChange({ ...value, expirationDate: e.target.value })}
                            disabled={adminMode}
                        />
                    )}

                    {!isVehicleEvaluation && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <span className="text-slate-400 text-xs font-bold font-mono">€</span>
                            <input
                                type="number"
                                className="w-16 bg-transparent border-none focus:ring-0 text-sm font-black text-slate-700"
                                value={value.price || ''}
                                onChange={e => !adminMode && onChange({ ...value, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                                placeholder="0.00"
                                disabled={adminMode}
                            />
                        </div>
                    )}

                    {!adminMode && (
                        <div className="flex items-center gap-1.5 ml-auto">
                            <label className="p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-500 hover:text-primary hover:border-primary/30 shadow-sm transition-all active:scale-95">
                                <Camera className="w-4 h-4" />
                                <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                            </label>
                            <label className="p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-500 hover:text-primary hover:border-primary/30 shadow-sm transition-all active:scale-95">
                                <ImagePlus className="w-4 h-4" />
                                <input type="file" multiple accept="image/*" onChange={handlePhoto} className="hidden" />
                            </label>
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                {value.images && value.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                        {value.images.map((img, idx) => (
                            <PhotoThumbnail
                                key={idx}
                                src={img}
                                onRemove={() => removePhoto(idx)}
                                onUpdate={(newSrc) => {
                                    const newImages = [...(value.images || [])];
                                    newImages[idx] = newSrc;
                                    onChange({ ...value, images: newImages });
                                }}
                                className="w-20 h-14"
                            />
                        ))}
                    </div>
                )}
                {adminMode && (
                    <div
                        onClick={onToggleRequired}
                        className="absolute inset-0 cursor-pointer z-10"
                    />
                )}
            </div>
            {value?.status === 'Not available' && !isVehicleEvaluation && (
                <span className="text-xs text-error-red mt-1">
                    {t('step3.depreciationApplied')}
                </span>
            )}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

export default EquipmentSelect;
