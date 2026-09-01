import { AlertTriangle, Camera, ImagePlus, Keyboard, List, Pencil } from 'lucide-react';
import React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BODY_PARTS, INTERIOR_PARTS } from '../../constants/bodyParts';
import { ANRECHNUNG_OPTIONS, DAMAGE_TYPES, REPAIR_METHODS } from '../../constants/damageTypes';
import { ESTIMATE_REPAIR_CODE_IDS, ESTIMATE_REPAIR_CODE_LABELS, lookupEstimatePrice } from '../../constants/estimateRepairCodes';
import { useReportStore } from '../../store/reportStore';
import type { AnrechnungType } from '../../types/report.types';
import { compressImage } from '../../utils/imageCompression';
import { validateImageAspectRatio } from '../../utils/imageValidation';
import ModalWrapper from './ModalWrapper';
import PhotoThumbnail from './PhotoThumbnail';

interface DamageEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    damageId: string | null;
}

const DamageEntryModal: React.FC<DamageEntryModalProps> = ({ isOpen, onClose, damageId }) => {
    const { t, i18n } = useTranslation();
    const store = useReportStore();
    const lang = (i18n.language || 'de') as 'de' | 'en';
    const descInputRef = React.useRef<HTMLInputElement>(null);

    const damage = store.damages.find(d => d.id === damageId);

    const [localDescription, setLocalDescription] = React.useState('');

    React.useEffect(() => {
        if (damage) {
            setLocalDescription(damage.description || '');
        }
    }, [damageId, damage?.description, damage]);

    const handleSave = () => {
        if (damage) {
            store.updateDamage(damage.id, { description: localDescription });
        }
        onClose();
    };

    if (!damage) return null;

    const bodyPartOpts = [
        { value: '', label: t('common.noneSelected') },
        ...BODY_PARTS.map(p => ({ value: p.id, label: t(`bodyParts.${p.id}`, lang === 'de' ? p.labelDe : p.labelEn) })),
        ...INTERIOR_PARTS.map(p => ({ value: p.id, label: t(`bodyParts.${p.id}`, lang === 'de' ? p.labelDe : p.labelEn) })),
    ];


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

    const damageTypeOpts = getEffectiveDamageTypes().map(m => ({ value: m.value, label: t(`damageTypes.${m.value}`, m.labelDe) }));
    const repairMethodOpts = REPAIR_METHODS.map(m => ({ value: m.value, label: t(`repairMethods.${m.value}`, m.labelDe) }));
    const anrechnungOpts = ANRECHNUNG_OPTIONS.map(a => ({ value: a.value, label: t(`anrechnungOptions.${a.value}`, a.labelDe) }));

    const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        let autoLabel = '';
        const bodyPartLabel = t(`bodyParts.${damage.bodyPart}`, damage.bodyPart);
        autoLabel = `${bodyPartLabel}${localDescription ? `: ${localDescription}` : ''}`.trim().replace(/: $/, '');

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
                    id: crypto.randomUUID(),
                    data: compressedData,
                    label: autoLabel,
                    fileName: file.name,
                    damageId: damage.id
                });
            } catch (err) {
                console.error('Failed to compress image:', file.name, err);
                toast.error(t('step4.compressionError') || `Failed to compress image: ${file.name}`);
            }
        }
        e.target.value = '';
    };

    return (
        <ModalWrapper isOpen={isOpen} onClose={handleSave} title={t('step4.editDamage')}>
            <div className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">{t('step4.bodyPartCol')}</label>
                    {damage.type === 'manual' ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t('step4.partNamePlaceholder', 'Bauteil Name')}
                                className="form-input py-2 flex-1 w-full text-gray-900 font-medium"
                                value={damage.bodyPart}
                                onChange={e => store.updateDamage(damage.id, { bodyPart: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => store.updateDamage(damage.id, { type: 'exterior', bodyPart: '' })}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 transition-colors shrink-0"
                            >
                                <List className="w-3.5 h-3.5 text-gray-500" />
                                <span>{lang === 'de' ? 'Liste' : 'List'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <select
                                className="form-input py-2 flex-1 w-full text-gray-900 font-medium"
                                value={damage.bodyPart}
                                onChange={e => store.updateDamage(damage.id, { bodyPart: e.target.value })}
                            >
                                {bodyPartOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={() => store.updateDamage(damage.id, { type: 'manual' })}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 transition-colors shrink-0"
                            >
                                <Keyboard className="w-3.5 h-3.5 text-gray-500" />
                                <span>{lang === 'de' ? 'Manuell' : 'Manual'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {damage.type !== 'manual' && (
                    <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800">{t('step4.interiorParts')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {INTERIOR_PARTS.map(part => (
                                <button
                                    key={part.id}
                                    onClick={() => store.updateDamage(damage.id, { bodyPart: part.id })}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${damage.bodyPart === part.id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:border-primary/30 hover:bg-primary/5'}`}
                                >
                                    {lang === 'de' ? part.labelDe : part.labelEn}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">{t('step4.damageDesc')}</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {damageTypeOpts.filter(o => o.value && o.value !== 'custom').map(o => (
                            <button
                                key={o.value}
                                onClick={() => {
                                    setLocalDescription(o.value);
                                    store.updateDamage(damage.id, { description: o.value });
                                }}
                                className={`px-2 py-1 rounded text-xs transition-colors border ${damage.description === o.value ? 'bg-secondary text-primary-dark border-secondary-dark' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'}`}
                            >
                                {o.label}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setLocalDescription('');
                                store.updateDamage(damage.id, { description: '' });
                                setTimeout(() => descInputRef.current?.focus(), 50);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border ${!damageTypeOpts.some(o => o.value && o.value !== 'custom' && o.value === damage.description)
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                                }`}
                        >
                            <Pencil className="w-3 h-3" />
                            <span>{lang === 'de' ? 'Eigener Text' : 'Custom text'}</span>
                        </button>
                    </div>
                    <input
                        ref={descInputRef}
                        className="form-input py-2 w-full text-gray-900 font-medium"
                        value={localDescription}
                        onChange={e => setLocalDescription(e.target.value)}
                        onBlur={() => {
                            store.updateDamage(damage.id, { description: localDescription });
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                descInputRef.current?.blur();
                            }
                        }}
                        placeholder={t('step4.customDescription')}
                    />
                </div>

                {/* <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">{t('step4.repairMethodCol')}</label>
                    <select
                        className="form-input py-2 w-full text-gray-900 font-medium"
                        value={damage.repairMethod}
                        onChange={e => store.updateDamage(damage.id, { repairMethod: e.target.value as RepairMethodType })}
                    >
                        {repairMethodOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div> */}
                {/* Estimate Repair Code Selector */}
                {store.claimType !== 'Fahrzeugbewertung' && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                            {lang === 'de' ? 'Reparaturcode (Pauschale)' : 'Repair Code (Flat Price)'}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ESTIMATE_REPAIR_CODE_IDS.map(codeId => {
                                const isSelected = damage.estimateRepairCodeId === codeId;
                                const price = store.vehicleCategory
                                    ? lookupEstimatePrice(
                                        store.globalConfig?.estimateConfig,
                                        damage.bodyPart,
                                        codeId,
                                        store.vehicleCategory
                                    )
                                    : 0;
                                const hasNoPrice = store.vehicleCategory && price === 0;
                                return (
                                    <button
                                        key={codeId}
                                        onClick={() => {
                                            const flatPrice = store.vehicleCategory
                                                ? lookupEstimatePrice(
                                                    store.globalConfig?.estimateConfig,
                                                    damage.bodyPart,
                                                    codeId,
                                                    store.vehicleCategory
                                                )
                                                : 0;
                                            store.updateDamage(damage.id, {
                                                estimateRepairCodeId: codeId,
                                                repairCostBrutto: flatPrice,
                                            });
                                        }}
                                        className={`flex flex-col items-start px-3 py-2 rounded-xl text-xs border transition-colors ${
                                            isSelected
                                                ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                                                : hasNoPrice
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400 hover:bg-amber-50'
                                        }`}
                                    >
                                        <span className="font-bold">{ESTIMATE_REPAIR_CODE_LABELS[codeId][lang]}</span>
                                        {price > 0 && (
                                            <span className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-amber-100' : 'text-amber-600'}`}>
                                                €{price.toFixed(0)}
                                            </span>
                                        )}
                                        {hasNoPrice && (
                                            <span className={`flex items-center gap-0.5 text-[9px] font-bold mt-0.5 ${isSelected ? 'text-amber-200' : 'text-amber-500'}`}>
                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                {lang === 'de' ? 'Kein Preis' : 'No price'}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            {/* Custom Repair Codes from Admin */}
                            {store.globalConfig?.estimateConfig?.customRepairCodes && store.globalConfig.estimateConfig.customRepairCodes.length > 0 && (
                                <>
                                    <div className="w-full flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-px bg-gray-200" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            {lang === 'de' ? 'Benutzerdefiniert' : 'Custom Codes'}
                                        </span>
                                        <div className="flex-1 h-px bg-gray-200" />
                                    </div>
                                    {store.globalConfig.estimateConfig.customRepairCodes.map(customCode => {
                                        const isSelected = damage.estimateRepairCodeId === customCode.id;
                                        const price = store.vehicleCategory
                                            ? lookupEstimatePrice(
                                                store.globalConfig?.estimateConfig,
                                                damage.bodyPart,
                                                customCode.id,
                                                store.vehicleCategory
                                            )
                                            : 0;
                                        const hasNoPrice = store.vehicleCategory && price === 0;
                                        return (
                                            <button
                                                key={customCode.id}
                                                onClick={() => {
                                                    const flatPrice = store.vehicleCategory
                                                        ? lookupEstimatePrice(
                                                            store.globalConfig?.estimateConfig,
                                                            damage.bodyPart,
                                                            customCode.id,
                                                            store.vehicleCategory
                                                        )
                                                        : 0;
                                                    store.updateDamage(damage.id, {
                                                        estimateRepairCodeId: customCode.id,
                                                        repairCostBrutto: flatPrice,
                                                    });
                                                }}
                                                className={`flex flex-col items-start px-3 py-2 rounded-xl text-xs border transition-colors ${
                                                    isSelected
                                                        ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                                                        : hasNoPrice
                                                        ? 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-violet-400 hover:bg-violet-50'
                                                }`}
                                            >
                                                <span className="font-bold">{lang === 'de' ? customCode.labelDe : customCode.labelEn}</span>
                                                {price > 0 && (
                                                    <span className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-violet-100' : 'text-violet-600'}`}>
                                                        €{price.toFixed(0)}
                                                    </span>
                                                )}
                                                {hasNoPrice && (
                                                    <span className={`flex items-center gap-0.5 text-[9px] font-bold mt-0.5 ${isSelected ? 'text-violet-200' : 'text-violet-500'}`}>
                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                        {lang === 'de' ? 'Kein Preis' : 'No price'}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                            {damage.estimateRepairCodeId && (
                                <button
                                    onClick={() => store.updateDamage(damage.id, { estimateRepairCodeId: '' })}
                                    className="px-3 py-2 rounded-xl text-xs border border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
                                >
                                    ✕ {lang === 'de' ? 'Zurücksetzen' : 'Clear'}
                                </button>
                            )}
                        </div>
                        {/* Warning when selected code has no price */}
                        {damage.estimateRepairCodeId && store.vehicleCategory && (() => {
                            const selPrice = lookupEstimatePrice(
                                store.globalConfig?.estimateConfig,
                                damage.bodyPart,
                                damage.estimateRepairCodeId as any,
                                store.vehicleCategory
                            );
                            if (selPrice === 0) {
                                return (
                                    <div className="flex items-center gap-1.5 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-[11px] font-semibold">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                            {lang === 'de'
                                                ? 'Kein Preis für diesen Reparaturcode definiert – manuelle Kalkulation erforderlich'
                                                : 'No price defined for this repair type – manual calculation required'}
                                        </span>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        {!store.vehicleCategory && (
                            <p className="mt-1 text-[11px] text-amber-600">
                                {lang === 'de' ? '⚠ Fahrzeugkategorie zuerst in Schritt 2 auswählen' : '⚠ Select vehicle category in Step 2 first'}
                            </p>
                        )}
                    </div>
                )}


                {store.claimType !== 'Fahrzeugbewertung' && (damage.anrechnung as string) !== 'keine' && (damage.anrechnung as string) !== 'kein' && (
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-fade-in">
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">{t('step4.repairCost')}</label>
                            <input
                                className="form-input py-2 w-full bg-highlight text-gray-900 font-medium"
                                type="number" step="0.01"
                                value={damage.repairCostBrutto || ''}
                                onChange={e => store.updateDamage(damage.id, { repairCostBrutto: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        {/* <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">{t('step4.sparePartsCol')}</label>
                            <input
                                className="form-input py-2 w-full text-gray-900 font-medium"
                                type="number" step="0.01"
                                value={damage.spareParts || ''}
                                onChange={e => store.updateDamage(damage.id, { spareParts: parseFloat(e.target.value) || 0 })}
                            />
                        </div> */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">{t('step4.anrechnung')}</label>
                            <select
                                className="form-input py-2 w-full text-gray-900 font-medium"
                                value={
                                    damage.anrechnung === 'kein'
                                        ? 'keine'
                                        : damage.anrechnung === 'pro-rata'
                                        ? 'anteilig'
                                        : (damage.anrechnung as string)
                                }
                                onChange={e => store.updateDamage(damage.id, { anrechnung: e.target.value as AnrechnungType })}
                            >
                                {anrechnungOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">{t('step4.minderwertBrutto')}</label>
                            <input
                                className={`form-input py-2 w-full text-gray-900 font-medium ${(damage.anrechnung === 'anteilig' || damage.anrechnung === 'pro-rata') ? 'bg-highlight' : 'bg-gray-100'}`}
                                type="number" step="0.01"
                                value={damage.minderwertBrutto || ''}
                                disabled={damage.anrechnung !== 'anteilig' && damage.anrechnung !== 'pro-rata'}
                                onChange={e => store.updateDamage(damage.id, { minderwertBrutto: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                )}


                {store.claimType !== 'Fahrzeugbewertung' && ((damage.anrechnung as string) === 'keine' || (damage.anrechnung as string) === 'kein') && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <label className="text-sm font-medium text-blue-700 block mb-1">{t('step4.anrechnung')}</label>
                        <select
                            className="form-input py-2 w-full bg-white text-gray-900 font-medium"
                            value={
                                damage.anrechnung === 'kein'
                                    ? 'keine'
                                    : damage.anrechnung === 'pro-rata'
                                    ? 'anteilig'
                                    : (damage.anrechnung as string)
                            }
                            onChange={e => store.updateDamage(damage.id, { anrechnung: e.target.value as AnrechnungType })}
                        >
                            {anrechnungOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <p className="mt-2 text-xs text-blue-600 italic">
                            {t('step1.priceNote')}
                        </p>
                    </div>
                )}

                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">{t('step4.photos')}</label>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-dark transition-all text-sm">
                            <Camera className="w-4 h-4" />
                            <span>{t('step4.takePhoto')}</span>
                            <input type="file" accept="image/*" capture="environment" onChange={handlePhotos} className="hidden" />
                        </label>
                        <label className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all text-sm">
                            <ImagePlus className="w-4 h-4" />
                            <span>{t('step4.choosePhoto')}</span>
                            <input type="file" multiple accept="image/*" onChange={handlePhotos} className="hidden" />
                        </label>
                    </div>
                    {store.photos.filter(p => p.damageId === damage.id).length > 0 && (
                        <div className="mt-3 space-y-3">
                            <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-md inline-block">
                                {store.photos.filter(p => p.damageId === damage.id).length} {t('step4.photosAttached')}
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100/80">
                                {store.photos.filter(p => p.damageId === damage.id).map((photo) => (
                                    <PhotoThumbnail
                                        key={photo.id}
                                        src={photo.data}
                                        includeInPdf={store.isImageIncludedInPdf(photo.data, photo)}
                                        onToggleIncludeInPdf={(incl) => store.toggleImagePdfInclusion(photo.data, photo.id, incl)}
                                        onRemove={() => store.removePhoto(photo.id)}
                                        onUpdate={(newSrc) => store.updatePhoto(photo.id, { data: newSrc })}
                                        className="w-16 h-12 rounded-lg"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button onClick={handleSave} className="btn-primary w-full sm:w-auto px-8">
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default DamageEntryModal;
