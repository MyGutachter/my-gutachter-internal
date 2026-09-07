import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadScreenshot } from '../../services/orderService';

export const VEHICLE_PARTS_LIST = [
    // Identification (Schritt 2)
    { id: 'vin_number', name: 'FIN / Typenschild (VIN / Type plate)', category: 'Identification' },
    { id: 'Meter_reading', name: 'Kilometerstand / Tacho (Meter reading)', category: 'Identification' },
    { id: 'next_hu', name: 'Nächste HU Plakette (Next HU Badge)', category: 'Identification' },
    { id: 'keys_photo', name: 'Fahrzeugschlüssel (Keys)', category: 'Identification' },
    { id: 'Front', name: 'Front', category: 'Identification' },
    { id: 'vehicle_view_front', name: 'Fahrzeugansicht vorne', category: 'Identification' },

    // Documents & Equipment (Schritt 3)
    { id: 'docRegistration', name: 'Fahrzeugschein (Registration document)', category: 'Documents & Equipment' },
    { id: 'docServiceBook', name: 'Serviceheft (Service book)', category: 'Documents & Equipment' },
    { id: 'docManual', name: 'Bedienungsanleitung (Operating manual)', category: 'Documents & Equipment' },
    { id: 'docBadge', name: 'Umweltplakette (Environmental badge)', category: 'Documents & Equipment' },
    { id: 'maintenance_images', name: 'Wartungsberichte (Maintenance docs)', category: 'Documents & Equipment' },
    { id: 'breakdown_kit', name: 'Pannenset (Breakdown kit)', category: 'Documents & Equipment' },
    { id: 'first_aid_kit', name: 'Verbandskasten (First aid kit)', category: 'Documents & Equipment' },
    { id: 'warning_triangle', name: 'Warndreieck (Warning triangle)', category: 'Documents & Equipment' },
    { id: 'safety_vest', name: 'Warnweste (Safety vest)', category: 'Documents & Equipment' },
    { id: 'spare_tire', name: 'Ersatzrad (Spare tire)', category: 'Documents & Equipment' },
    { id: 'EV_charging_cover', name: 'Ladekabel EV (EV charging cover)', category: 'Documents & Equipment' },

    // Overview images (Schritt 4 - Pflichtaufnahmen)
    { id: 'Overview_diagonal_front_left', name: 'Übersicht diagonal vorne links', category: 'Overview images' },
    { id: 'Overview_diagonal_front_right', name: 'Übersicht diagonal vorne rechts', category: 'Overview images' },
    { id: 'Overview_diagonal_rear_left', name: 'Übersicht diagonal hinten links', category: 'Overview images' },
    { id: 'Overview_diagonal_rear_right', name: 'Übersicht diagonal hinten rechts', category: 'Overview images' },
    { id: 'vehicle_photo_right_side', name: 'Fahrzeugfoto rechte Seite', category: 'Overview images' },
    { id: 'vehicle_photo_left_side', name: 'Fahrzeugfoto linke Seite', category: 'Overview images' },

    // Wheels (Schritt 4 - Reifen)
    { id: 'front_left_wheel', name: 'Reifen Vorne Links (Front left wheel)', category: 'Wheels' },
    { id: 'front_right_wheel', name: 'Reifen Vorne Rechts (Front right wheel)', category: 'Wheels' },
    { id: 'rear_left_wheel', name: 'Reifen Hinten Links (Rear left wheel)', category: 'Wheels' },
    { id: 'rear_right_wheel', name: 'Reifen Hinten Rechts (Rear right wheel)', category: 'Wheels' },

    // Sills (Schritt 4 - Schweller)
    { id: 'left_sill', name: 'Schweller links (Left sill)', category: 'Sills' },
    { id: 'Right_sill', name: 'Schweller rechts (Right sill)', category: 'Sills' },

    // Light
    { id: 'Headlight_on_the_left', name: 'Scheinwerfer links (Headlight left)', category: 'Light' },
    { id: 'Headlight_on_the_right', name: 'Scheinwerfer rechts (Headlight right)', category: 'Light' },
    { id: 'Left_rear_light', name: 'Rücklicht links (Left rear light)', category: 'Light' },
    { id: 'Taillights_right', name: 'Rücklicht rechts (Taillights right)', category: 'Light' },

    // Doors
    { id: 'Front_left_door', name: 'Tür vorne links (Front left door)', category: 'Doors' },
    { id: 'Front_right_door', name: 'Tür vorne rechts (Front right door)', category: 'Doors' },
    { id: 'Rear_left_door', name: 'Tür hinten links (Rear left door)', category: 'Doors' },
    { id: 'Rear_right_door', name: 'Tür hinten rechts (Rear right door)', category: 'Doors' },

    // Panes, mirrors and glass
    { id: 'windshield', name: 'Windschutzscheibe (Windshield)', category: 'Panes, mirrors and glass' },
    { id: 'rear_window', name: 'Heckscheibe (Rear window)', category: 'Panes, mirrors and glass' },
    { id: 'Front_left_door_window', name: 'Fenster Tür vorne links', category: 'Panes, mirrors and glass' },
    { id: 'Front_right_door_window', name: 'Fenster Tür vorne rechts', category: 'Panes, mirrors and glass' },
    { id: 'Rear_left_door_window', name: 'Fenster Tür hinten links', category: 'Panes, mirrors and glass' },
    { id: 'rear_right_door_window', name: 'Fenster Tür hinten rechts', category: 'Panes, mirrors and glass' },
    { id: 'Left_wing_mirror', name: 'Außenspiegel links (Left wing mirror)', category: 'Panes, mirrors and glass' },
    { id: 'Right-hand_exterior_mirror', name: 'Außenspiegel rechts (Right exterior mirror)', category: 'Panes, mirrors and glass' },

    // Body and bumper
    { id: 'Front_left_fender', name: 'Kotflügel vorne links (Front left fender)', category: 'Body and bumper' },
    { id: 'front_right_fender', name: 'Kotflügel vorne rechts (Front right fender)', category: 'Body and bumper' },
    { id: 'bonnet', name: 'Motorhaube (Bonnet)', category: 'Body and bumper' },
    { id: 'front_bumper', name: 'Stoßstange vorne (Front bumper)', category: 'Body and bumper' },
    { id: 'rear_bumper', name: 'Stoßstange hinten (Rear bumper)', category: 'Body and bumper' },
    { id: 'Fuel_cap', name: 'Tankdeckel (Fuel cap)', category: 'Body and bumper' },

    // Roof
    { id: 'Roof', name: 'Dach (Roof)', category: 'Roof' },
    { id: 'Dachrahmen_links', name: 'Dachrahmen links (Roof frame left)', category: 'Roof' },
    { id: 'Roof_frame_right', name: 'Dachrahmen rechts (Roof frame right)', category: 'Roof' },

    // Tailgate / Rear
    { id: 'Tailgate', name: 'Heckklappe (Tailgate)', category: 'Tailgate' },
    { id: 'Heck', name: 'Heck', category: 'Tailgate' },
    { id: 'Vehicle_view_from_the_rear', name: 'Fahrzeugansicht von hinten', category: 'Tailgate' },

    // Other
    { id: 'additional_images', name: 'Zusätzliche Bilder (Additional images)', category: 'Other' },
];

interface AddPhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    initialPartId?: string;
    onSuccess: () => void;
}

export const AddPhotoModal: React.FC<AddPhotoModalProps> = ({
    isOpen,
    onClose,
    orderId,
    initialPartId,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedPart, setSelectedPart] = useState<string>('additional_images');
    const [isCustomPart, setIsCustomPart] = useState<boolean>(false);
    const [customPartName, setCustomPartName] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);

    useEffect(() => {
        if (initialPartId) {
            const found = VEHICLE_PARTS_LIST.find((p) => p.id === initialPartId);
            if (found) {
                setSelectedPart(found.id);
                setIsCustomPart(false);
            } else {
                setSelectedPart('CUSTOM');
                setIsCustomPart(true);
                setCustomPartName(initialPartId);
            }
        } else {
            setSelectedPart('additional_images');
            setIsCustomPart(false);
            setCustomPartName('');
        }
    }, [initialPartId, isOpen]);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            validateAndSetFile(file);
        }
    };

    const validateAndSetFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setErrorMessage(t('addPhoto.errorInvalidType', { defaultValue: 'Please select a valid image file (JPEG, PNG, WEBP).' }));
            return;
        }
        setErrorMessage(null);
        setSelectedFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handlePartSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'CUSTOM') {
            setIsCustomPart(true);
            setSelectedPart('CUSTOM');
        } else {
            setIsCustomPart(false);
            setSelectedPart(val);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setErrorMessage(t('addPhoto.errorNoFile', { defaultValue: 'Please select an image file to upload.' }));
            return;
        }

        const finalPartName = isCustomPart ? customPartName.trim() : selectedPart;
        if (!finalPartName) {
            setErrorMessage(t('addPhoto.errorNoPartName', { defaultValue: 'Please specify a vehicle part name.' }));
            return;
        }

        setIsUploading(true);
        setErrorMessage(null);

        try {
            await uploadScreenshot(selectedFile, finalPartName, orderId);
            setIsUploading(false);
            setSelectedFile(null);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to upload photo:', err);
            setIsUploading(false);
            setErrorMessage(
                err?.response?.data?.message || err?.message || t('addPhoto.errorUploadFailed', { defaultValue: 'Failed to upload photo. Please try again.' })
            );
        }
    };

    const categories = Array.from(new Set(VEHICLE_PARTS_LIST.map((p) => p.category)));

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isUploading) onClose();
            }}
        >
            <div
                className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[var(--color-primary-orange)]/15 text-[var(--color-primary-orange)]">
                            <Upload size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                                {t('addPhoto.title', { defaultValue: 'Foto hinzufügen' })}
                            </h3>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                                {t('addPhoto.subtitle', { defaultValue: 'Post-Call Foto hochladen & Fahrzeugteil zuweisen' })}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isUploading}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                    {errorMessage && (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Drag & Drop File Picker */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                            {t('addPhoto.fileLabel', { defaultValue: 'Bilddatei wählen' })}
                        </label>

                        {previewUrl ? (
                            <div className="relative group aspect-video w-full bg-black/40 rounded-xl overflow-hidden border border-[var(--color-border-primary)] flex items-center justify-center">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold backdrop-blur-md transition-all"
                                    >
                                        {t('common.change', { defaultValue: 'Ändern' })}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFile(null)}
                                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold backdrop-blur-md transition-all"
                                    >
                                        {t('common.remove', { defaultValue: 'Entfernen' })}
                                    </button>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-md font-mono">
                                    {selectedFile?.name} ({(selectedFile?.size ? selectedFile.size / (1024 * 1024) : 0).toFixed(2)} MB)
                                </div>
                            </div>
                        ) : (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                                    isDragOver
                                        ? 'border-[var(--color-primary-orange)] bg-[var(--color-primary-orange)]/10'
                                        : 'border-[var(--color-border-primary)] hover:border-[var(--color-primary-orange)]/50 bg-[var(--color-bg-secondary)]'
                                }`}
                            >
                                <div className="p-3 rounded-full bg-[var(--color-bg-card)] text-[var(--color-primary-orange)] shadow-sm">
                                    <ImageIcon size={28} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[var(--color-text-primary)]">
                                        {t('addPhoto.dropText', { defaultValue: 'Bild hierher ziehen oder klicken' })}
                                    </p>
                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                                        PNG, JPG, WEBP ({t('addPhoto.maxSize', { defaultValue: 'max. 15MB' })})
                                    </p>
                                </div>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Vehicle Part Selector */}
                    <div>
                        <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                            {t('addPhoto.partLabel', { defaultValue: 'Fahrzeugteil / Kategorie' })}
                        </label>
                        <select
                            value={isCustomPart ? 'CUSTOM' : selectedPart}
                            onChange={handlePartSelectChange}
                            disabled={isUploading}
                            className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl text-xs font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary-orange)] transition-colors"
                        >
                            {categories.map((cat) => (
                                <optgroup
                                    key={cat}
                                    label={t(`meetingSummary.categories.${cat.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, { defaultValue: cat })}
                                >
                                    {VEHICLE_PARTS_LIST.filter((p) => p.category === cat).map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {t(`carParts.${p.id}`, { defaultValue: p.name })}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                            <optgroup label={t('addPhoto.customGroup', { defaultValue: 'Sonstiges' })}>
                                <option value="CUSTOM">
                                    ✍️ {t('addPhoto.customOption', { defaultValue: 'Benutzerdefinierter Name...' })}
                                </option>
                            </optgroup>
                        </select>

                        {isCustomPart && (
                            <div className="mt-2">
                                <input
                                    type="text"
                                    placeholder={t('addPhoto.customPlaceholder', { defaultValue: 'Teilename eingeben (z.B. Kotflügel Vorne Links)' })}
                                    value={customPartName}
                                    onChange={(e) => setCustomPartName(e.target.value)}
                                    disabled={isUploading}
                                    className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl text-xs font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary-orange)] transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-primary)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUploading}
                            className="px-4 py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                            {t('common.cancel', { defaultValue: 'Abbrechen' })}
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading || !selectedFile}
                            className="flex items-center gap-2 px-5 py-2 bg-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange)]/90 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>{t('addPhoto.uploading', { defaultValue: 'Wird hochgeladen...' })}</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={14} />
                                    <span>{t('addPhoto.submit', { defaultValue: 'Hochladen & Speichern' })}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPhotoModal;
