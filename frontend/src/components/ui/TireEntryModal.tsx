import React from 'react';
import { useTranslation } from 'react-i18next';
import { useReportStore } from '../../store/reportStore';
import ModalWrapper from './ModalWrapper';
import { ManualSelect, TireModelSelect } from './TireSelects';
import { TIRE_BRANDS, TIRE_MODELS } from '../../constants/tireData';
import { Camera, ImagePlus, X } from 'lucide-react';
import SecureImage from './SecureImage';
import { compressImage } from '../../utils/imageCompression';
import toast from 'react-hot-toast';
import PhotoThumbnail from './PhotoThumbnail';

interface TireEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    tireIndex: number | null; // null means spare tire
    isSecondSet?: boolean;
}

const TireEntryModal: React.FC<TireEntryModalProps> = ({ isOpen, onClose, tireIndex, isSecondSet }) => {
    const { t } = useTranslation();
    const store = useReportStore();
    const isVehicleEvaluation = store.claimType === 'Fahrzeugbewertung';

    const isSpare = tireIndex === null;
    const tire = isSpare
        ? store.spareTire
        : (isSecondSet ? store.secondTires[tireIndex as number] : store.tires[tireIndex as number]);

    if (!tire) return null;

    const showTireFields = true;
    const showRimFields = !isSecondSet || store.secondTireSetSelection !== 'Only Tires';
    const showTireDamage = !isSecondSet || store.secondTireSetSelection !== 'Only Rims';

    const tireTypeOptions = [
        { value: 'A', label: `A (${t('step3.tireAllSeason')})` },
        { value: 'S', label: `S (${t('step3.tireSummer')})` },
        { value: 'W', label: `W (${t('step3.tireWinter')})` },
    ];

    const updateTire = (data: any) => {
        if (isSpare) {
            store.updateSpareTire(data);
        } else if (isSecondSet) {
            store.updateSecondTire(tireIndex as number, data);
        } else {
            store.updateTire(tireIndex as number, data);
        }
    };

    const handleTirePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const currentImages = tire.images || [];
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
        updateTire({ images: newImages });
        e.target.value = '';
    };

    const removeTirePhoto = (imgIndex: number) => {
        const newImages = [...(tire.images || [])];
        newImages.splice(imgIndex, 1);
        updateTire({ images: newImages });
    };

    const title = isSpare
        ? t('step3.tireSpareTire')
        : t('step3.axleLabel', {
            axle: (tire as any).axle,
            side: (tire as any).side === 'links' ? t('common.left') : t('common.right')
        });

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                {showTireFields && (
                    <>
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">{t('step3.tireDesignation')}</label>
                            <input
                                className="form-input py-2 w-full text-center"
                                value={tire.designation || ''}
                                onChange={e => {
                                    let val = e.target.value;
                                    const prevVal = tire.designation || '';
                                    const isDeleting = val.length < prevVal.length;

                                    let newVal = val;

                                    // Auto-formatting for numeric patterns (e.g. 20555 -> 205/55)
                                    if (!isDeleting) {
                                        // Extract digits from the start to check for the pattern
                                        const patternMatch = val.match(/^(\d{3})(\d{1,2})$/);
                                        if (patternMatch && !val.includes('/')) {
                                            newVal = patternMatch[1] + '/' + patternMatch[2] + val.slice(patternMatch[0].length);
                                        }
                                        // If exactly 3 digits at the start and no slash, auto-append slash
                                        else if (/^\d{3}$/.test(val)) {
                                            newVal = val + '/';
                                        }
                                    }

                                    updateTire({ designation: newVal });
                                }}
                                placeholder="205/55 R16"
                                maxLength={30}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{t('step3.tireManufacturer')}</label>
                                <ManualSelect
                                    options={TIRE_BRANDS}
                                    value={tire.manufacturer}
                                    onChange={brand => {
                                        const type = (tire.type || 'S') as 'S' | 'W' | 'A';
                                        const models = (brand && TIRE_MODELS[brand]) ? TIRE_MODELS[brand][type] : [];
                                        const firstModel = models?.[0] || '';
                                        updateTire({ manufacturer: brand, tireModel: firstModel });
                                    }}
                                    placeholder={t('step3.tireManufacturer')}
                                    manualSentinel={t('step3.manualEntry')}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{t('step3.tireModel')}</label>
                                <TireModelSelect
                                    brand={tire.manufacturer}
                                    type={tire.type as any}
                                    value={tire.tireModel}
                                    onChange={val => updateTire({ tireModel: val })}
                                    placeholder={t('step3.tireModel')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{t('step3.tireType')}</label>
                                <ManualSelect
                                    options={tireTypeOptions}
                                    value={tire.type}
                                    onChange={val => {
                                        const type = val as 'S' | 'W' | 'A';
                                        const brand = tire.manufacturer;
                                        const models = (brand && TIRE_MODELS[brand]) ? TIRE_MODELS[brand][type] : [];
                                        const firstModel = models?.[0] || '';
                                        updateTire({ type, tireModel: firstModel });
                                    }}
                                    placeholder={t('step3.tireType')}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{t('step3.tireTread')}</label>
                                <input
                                    className="form-input py-2 w-full"
                                    value={tire.treadDepth}
                                    onChange={e => updateTire({ treadDepth: e.target.value })}
                                    placeholder={t('step3.tireTreadPlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">DOT</label>
                                <input
                                    className="form-input py-2 w-full uppercase"
                                    value={tire.dotNumber}
                                    onChange={e => updateTire({ dotNumber: e.target.value.replace(/[^0-9]/g, '') })}
                                    placeholder="DOT"
                                    maxLength={4}
                                />
                            </div>
                        </div>
                    </>
                )}

                {showRimFields && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider block mb-2">{t('step3.rimType')}</label>
                            <select
                                className="form-select py-2 w-full"
                                value={tire.rimType || ''}
                                onChange={e => {
                                    const newRimType = e.target.value;
                                    // Clear Hub Cap damage if switching away from Steel
                                    const updatedRimDamage = (tire.rimDamage || []).filter(d =>
                                        newRimType === 'Steel' ? true : d !== 'Hub Cap'
                                    );
                                    updateTire({
                                        rimType: newRimType,
                                        rimDamage: updatedRimDamage,
                                        ...(newRimType !== 'Steel' ? { hubCapDepreciation: 0 } : {})
                                    });
                                }}
                            >
                                <option value="">{t('common.noneSelected')}</option>
                                <option value="Steel">{t('step3.rimSteel')}</option>
                                <option value="Alloy">{t('step3.rimAlloy')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider block mb-2">{t('step3.rimDamage')}</label>
                            <div className="flex flex-wrap gap-2">
                                {['Scratched', 'Curb Damage', 'Other'].map(damage => (
                                    <button
                                        key={damage}
                                        onClick={() => {
                                            const current = tire.rimDamage || [];
                                            const next = current.includes(damage)
                                                ? current.filter(d => d !== damage)
                                                : [...current, damage];
                                            updateTire({ rimDamage: next });
                                        }}
                                        className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${tire.rimDamage?.includes(damage)
                                            ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                            : 'bg-white text-gray-400 border-gray-200 hover:border-red-200 hover:text-red-400'
                                            }`}
                                    >
                                        {t(`step3.damage${damage.replace(' ', '')}`, damage)}
                                    </button>
                                ))}
                                {/* Hub Cap damage — only shown for Steel Rims */}
                                {tire.rimType === 'Steel' && (
                                    <button
                                        key="Hub Cap"
                                        onClick={() => {
                                            const current = tire.rimDamage || [];
                                            const next = current.includes('Hub Cap')
                                                ? current.filter(d => d !== 'Hub Cap')
                                                : [...current, 'Hub Cap'];
                                            updateTire({ rimDamage: next });
                                        }}
                                        className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all border ${tire.rimDamage?.includes('Hub Cap')
                                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                            : 'bg-white text-gray-400 border-gray-200 hover:border-amber-200 hover:text-amber-500'
                                            }`}
                                    >
                                        {t('step3.damageHubCap')}
                                    </button>
                                )}
                            </div>
                            {/* Hub Cap depreciation input — only shown when Hub Cap damage is selected */}
                            {tire.rimType === 'Steel' && tire.rimDamage?.includes('Hub Cap') && !isVehicleEvaluation && (
                                <div className="mt-3 animate-fade-in">
                                    <label className="text-xs font-semibold text-amber-700 uppercase tracking-wider block mb-1">
                                        {t('step3.hubCapDepreciation')} (€)
                                    </label>
                                    <div className="relative">
                                        <input
                                            className="form-input py-1.5 pr-8 text-sm w-full border-amber-200 focus:border-amber-400 focus:ring-amber-100"
                                            type="number"
                                            value={tire.hubCapDepreciation || ''}
                                            onChange={e => updateTire({ hubCapDepreciation: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                            min={0}
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-500 pointer-events-none">€</span>
                                    </div>
                                </div>
                            )}

                            {/* Custom rim damage description — only shown when 'Other' is selected */}
                            {tire.rimDamage?.includes('Other') && (
                                <div className="mt-3 animate-fade-in">
                                    <label className="text-xs font-semibold text-red-700 uppercase tracking-wider block mb-1">
                                        {t('step3.otherRimDamageDescription')}
                                    </label>
                                    <textarea
                                        className="form-input py-2 text-sm w-full border-red-200 focus:border-red-400 focus:ring-red-100 min-h-[80px]"
                                        value={tire.rimDamageDescription || ''}
                                        onChange={e => updateTire({ rimDamageDescription: e.target.value })}
                                        placeholder={t('step3.otherRimDamageDescriptionPlaceholder', 'Describe the rim damage...')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showTireDamage && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">{t('step3.damaged')}</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => updateTire({ damaged: true })}
                                className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all border ${
                                    tire.damaged === true
                                        ? 'bg-red-500 text-white border-red-500 shadow-md scale-[1.02]'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {t('common.yes')}
                            </button>
                            <button
                                type="button"
                                onClick={() => updateTire({ damaged: false })}
                                className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all border ${
                                    tire.damaged !== true
                                        ? 'bg-green-500 text-white border-green-500 shadow-md scale-[1.02]'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {t('common.no')}
                            </button>
                        </div>
                    </div>
                )}



                {!isVehicleEvaluation && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">{t('step3.depreciation')} (€)</label>
                        <input
                            className="form-input py-2 w-full"
                            type="number"
                            value={tire.depreciationValue || ''}
                            onChange={e => updateTire({ depreciationValue: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                        />
                    </div>
                )}

                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">{t('step4.photos')}</label>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-dark transition-all text-sm shadow-sm active:scale-95 group">
                            <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span>{t('step4.takePhoto')}</span>
                            <input type="file" accept="image/*" capture="environment" onChange={handleTirePhoto} className="hidden" />
                        </label>
                        <label className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all text-sm shadow-sm active:scale-95 group">
                            <ImagePlus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                            <span>{t('step4.choosePhoto')}</span>
                            <input type="file" multiple accept="image/*" onChange={handleTirePhoto} className="hidden" />
                        </label>
                    </div>

                    {tire.images && tire.images.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {tire.images.map((img, idx) => (
                                <PhotoThumbnail
                                    key={idx}
                                    src={img}
                                    onRemove={() => removeTirePhoto(idx)}
                                    onUpdate={(newSrc) => {
                                        const newImages = [...(tire.images || [])];
                                        newImages[idx] = newSrc;
                                        updateTire({ images: newImages });
                                    }}
                                    className="w-full"
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button onClick={onClose} className="btn-primary w-full sm:w-auto px-8 shadow-md">
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default TireEntryModal;
