import { Calendar, Camera, CheckCircle, Copy, ImagePlus, List, Plus, ScanLine, Search, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { fetchVehicleByVIN } from '../../api/datApi';
import { getColorName } from '../../constants/datColorMap';
import { useReportStore } from '../../store/reportStore';
import { useUIStore } from '../../store/uiStore';
import { formatDate, formatDateInput, formatMonthYear, formatMonthYearInput, normalizeDate, normalizeMonthYear } from '../../utils/dateFormatter';
import { compressImage } from '../../utils/imageCompression';
import { validateImageAspectRatio } from '../../utils/imageValidation';
import { validateVIN } from '../../utils/vinValidator';
import Card from '../ui/Card';
import ErrorBanner from '../ui/ErrorBanner';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';
import LoadingSpinner from '../ui/LoadingSpinner';
import ModalWrapper from '../ui/ModalWrapper';
import PhotoThumbnail from '../ui/PhotoThumbnail';
import SectionTitle from '../ui/SectionTitle';
import VINScannerModal from '../ui/VINScannerModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Search all equipment strings for the first one that matches `pattern` and
 * return the full RegExp match array, or null when nothing matches.
 */
const matchEquipment = (equipment: string[], pattern: RegExp): RegExpMatchArray | null => {
    const entry = equipment.find(eq => pattern.test(eq));
    return entry ? entry.match(pattern) : null;
};

/**
 * Resolve the fuel type from equipment strings.
 * Priority: Electric > Plug-in Hybrid > Hybrid > Hydrogen > Diesel > Petrol
 */
const resolveFuelType = (equipment: string[], fallback: string): string => {
    const has = (pattern: RegExp) => equipment.some(e => pattern.test(e));

    // Full / mild hybrid
    if (has(/Mild-Hybrid/i) && has(/\bDiesel\b/i)) return 'Mild-Hybrid Diesel';
    if (has(/Mild-Hybrid/i)) return 'Mild-Hybrid Benzin';
    if (has(/Hybrid/i) && has(/\bDiesel\b/i)) return 'Hybrid Diesel';
    if (has(/Hybrid/i)) return 'Hybrid';
    // Pure electric
    if (has(/Elektromotor|HV-Batterie|Elektrofahrzeug/i) && !has(/Plug-?in|PHEV/i)) return 'Elektro';
    // Plug-in hybrid
    if (has(/Plug-?in|PHEV/i)) return 'Plug-in Hybrid';
    // Hydrogen fuel cell
    if (has(/Wasserstoff|Brennstoffzelle/i)) return 'Wasserstoff';
    // Conventional
    if (has(/\bDiesel\b/i)) return 'Diesel';
    if (has(/Otto-Partikelfilter|Benzin/i)) return 'Benzin';

    return fallback;
};

/**
 * Extract power in kW.
 * Prefers explicit "Motor X kW" / "Elektromotor X kW" entries over any kW mention.
 * Never confuses kWh (battery capacity) with kW (power).
 */
const resolvePowerKw = (equipment: string[], fallback: number | undefined): number | undefined => {
    // 1. Prioritize ICE "Motor" (not Elektromotor)
    const iceEntry = equipment.find(e => /\bMotor\s[\d,.].*?\d+\s*kW(?!h)/i.test(e));
    if (iceEntry) {
        const m = iceEntry.match(/\bMotor.*?(\d+)\s*kW(?!h)/i);
        if (m) return parseInt(m[1]);
    }

    // 2. Then try "Elektromotor"
    const electricEntry = equipment.find(e => /Elektromotor\s[\d,.].*?\d+\s*kW(?!h)/i.test(e));
    if (electricEntry) {
        const m = electricEntry.match(/Elektromotor.*?(\d+)\s*kW(?!h)/i);
        if (m) return parseInt(m[1]);
    }
    // Fallback: any kW that is NOT kWh
    const m = matchEquipment(equipment, /(\d+)\s*kW(?!h)/i);
    return m ? parseInt(m[1]) : fallback;
};

/**
 * Translates a rounded liter value from an equipment string (e.g. "2,0 Ltr.")
 * into the exact historical/technical ccm displacement commonly returned by DAT.
 * Maps 1.0 -> 999, BMW 2.0 Diesel -> 1995, BMW 3.0 Petrol -> 2998, etc.
 */
const resolveDisplacement = (
    equipment: string[],
    manufacturer: string,
    fallback: number | undefined
): number | undefined => {
    const dispMatch = matchEquipment(equipment, /(\d+[,.]\d+)\s*Ltr/i);
    if (!dispMatch) return fallback;

    const liters = parseFloat(dispMatch[1].replace(',', '.'));
    const mfg = manufacturer ? manufacturer.toUpperCase() : '';
    const eq = equipment.join(' ').toLowerCase();
    const isDiesel = eq.includes("diesel") || eq.includes("d ") || eq.includes(" hdi")
        || eq.includes(" tdi") || eq.includes(" cdti") || eq.includes(" crdi")
        || eq.includes(" dci") || eq.includes("td ");

    // Round to 1 decimal place
    const l = Math.round(liters * 10) / 10;

    if (l === 1.0) {
        if (mfg.includes('FORD') || mfg.includes('TOYOTA')) return 998;
        return 999; // Standard VAG, BMW, Opel, Renault, PSA 1.0
    }
    if (l === 1.2) {
        if (mfg.includes('OPEL') || mfg.includes('PEUGEOT') || mfg.includes('CITROEN') || mfg.includes('PSA')) return 1199;
        if (mfg.includes('RENAULT') || mfg.includes('DACIA')) return 1149;
        return 1197; // VAG 1.2 TSI
    }
    if (l === 1.3) {
        if (mfg.includes('RENAULT') || mfg.includes('MERCEDES')) return 1332;
        return 1329;
    }
    if (l === 1.4) {
        if (mfg.includes('OPEL')) return 1364;
        return 1395; // VAG 1.4 TSI
    }
    if (l === 1.5) {
        if (mfg.includes('BMW')) {
            return isDiesel ? 1496 : 1499;
        }
        if (mfg.includes('MERCEDES')) {
            return 1461; // OM607/OM608
        }
        if (mfg.includes('FORD') || mfg.includes('PEUGEOT') || mfg.includes('CITROEN') || mfg.includes('PSA')) {
            return isDiesel ? 1499 : 1496;
        }
        return 1498; // VAG 1.5 TSI
    }
    if (l === 1.6) {
        return 1598; // Universally 1598 ccm
    }
    if (l === 1.8) {
        if (mfg.includes('MERCEDES')) return 1796;
        return 1798; // VAG, Toyota 1.8
    }
    if (l === 2.0) {
        if (mfg.includes('BMW')) {
            return isDiesel ? 1995 : 1998;
        }
        if (mfg.includes('MERCEDES')) {
            return isDiesel ? 1950 : 1991;
        }
        if (mfg.includes('AUDI') || mfg.includes('VOLKSWAGEN') || mfg.includes('VW') || mfg.includes('SEAT') || mfg.includes('SKODA')) {
            return isDiesel ? 1968 : 1984;
        }
        if (mfg.includes('OPEL')) return 1956;
        if (mfg.includes('PSA') || mfg.includes('PEUGEOT') || mfg.includes('CITROEN')) return 1997;
        if (mfg.includes('FORD')) return 1996;
        return 1995; // Default fallback
    }
    if (l === 2.1 || l === 2.2) {
        if (mfg.includes('MERCEDES')) return 2143; // OM651 2.1/2.2 Diesel
        if (mfg.includes('PSA') || mfg.includes('FORD')) return 2198;
        return Math.floor(l * 1000);
    }
    if (l === 2.5) {
        if (mfg.includes('AUDI') || mfg.includes('VOLKSWAGEN') || mfg.includes('VW')) return 2480; // RS3/TTRS 5-cyl
        return 2497;
    }
    if (l === 3.0) {
        if (mfg.includes('BMW')) {
            return isDiesel ? 2993 : 2998;
        }
        if (mfg.includes('MERCEDES')) {
            return isDiesel ? 2925 : 2999;
        }
        if (mfg.includes('AUDI') || mfg.includes('VOLKSWAGEN') || mfg.includes('VW')) {
            return isDiesel ? 2967 : 2995;
        }
        return 2998; // Default fallback
    }
    return Math.floor(liters * 1000);
};

/**
 * Resolve body type.
 * Equipment "Karosserie: X" wins; otherwise inspect the base model name.
 */
const resolveBodyType = (equipment: string[], baseModel: string, fallback: string): string => {
    const equipMatch = matchEquipment(equipment, /Karosserie:\s*([^\n,]+)/i);
    if (equipMatch) return equipMatch[1].trim();

    const modelBodyMap: [RegExp, string][] = [
        [/Sports Tourer|Kombi|Touring|Avant|Variant|SW\b|T-Model|Estate/i, 'Kombi'],
        [/Cabriolet|Cabrio|Roadster|Spider|Spyder/i, 'Cabrio'],
        [/Coupé|Coupe|GTS|Gran Coupe/i, 'Coupé'],
        [/SUV|Crossover|X-Trail|Tiguan|RAV4|Karoq/i, 'SUV'],
        [/Geländewagen|G-Klasse|Defender|Land Cruiser/i, 'Geländewagen'],
        [/Van|MPV|Bus|Transporter|Touran/i, 'Van'],
        [/Pickup|Amarok|Ranger|Hilux/i, 'Pickup'],
        [/Lim\.|Limousine/i, 'Limousine'],
        [/Hatchback|Schrägheck/i, 'Schrägheck'],
        [/Targa/i, 'Targa'],
        [/Shooting Brake/i, 'Shooting Brake'],
    ];
    for (const [pattern, label] of modelBodyMap) {
        if (pattern.test(baseModel)) return label;
    }
    return fallback;
};

/**
 * Extract the best wheel/rim description including full size notation.
 * Prefers optional equipment (upgraded rims) over standard.
 */
const resolveWheels = (
    standard: string[],
    optional: string[],
    fallback: string
): string => {
    const rimPattern = /(?:LM|Stahl|Leichtmetall)-?(?:Felgen?|Räder?)\s*[\dx,.\s]+(?:\"\s*)?(?:Zoll)?/i;
    // Optional rims first (usually better)
    const optHit = optional.find(e => rimPattern.test(e));
    if (optHit) return optHit.trim();
    const stdHit = standard.find(e => rimPattern.test(e));
    if (stdHit) return stdHit.trim();
    return fallback;
};

/**
 * Resolve cylinder count.
 * Pure EVs get 0. Otherwise try explicit "X-Zylinder", then engine descriptors.
 */
const resolveCylinders = (equipment: string[], isPureEV: boolean, fallback: number | undefined): number | undefined => {
    if (isPureEV) return 0;

    const explicit = matchEquipment(equipment, /(\d+)-Zylinder/i);
    if (explicit) return parseInt(explicit[1]);

    const engineDesc = equipment.find(e => /Motor\s+\d/i.test(e)) ?? '';
    if (/V12/i.test(engineDesc)) return 12;
    if (/V10/i.test(engineDesc)) return 10;
    if (/V8/i.test(engineDesc)) return 8;
    if (/V6|24V|S58|B58/i.test(engineDesc)) return 6;
    if (/16V|4-Zyl|4Zyl/i.test(engineDesc)) return 4;
    if (/12V|3-Zyl|3Zyl/i.test(engineDesc)) return 3;

    return fallback;
};

/**
 * Resolve transmission label.
 * Maps "Getriebe für Elektrofahrzeug" → meaningful label, etc.
 */
const resolveTransmission = (equipment: string[], fallback: string): string => {
    const m = matchEquipment(equipment, /Getriebe\s+([^\n,]+?)(?:\s*$|\s*\()/);
    if (m) {
        const raw = m[1].trim();
        if (/Elektro/i.test(raw)) return 'Elektrogetriebe (1-Gang)';
        if (/Automatik/i.test(raw)) return `Automatik (${raw})`;
        return raw; // e.g. "6-Gang"
    }
    if (equipment.some(e => /Automatikgetriebe/i.test(e))) return 'Automatik';
    if (equipment.some(e => /DSG|S.Tronic|PDK|Tiptronic|CVT/i.test(e))) return 'Automatik (DSG/CVT)';
    return fallback;
};

/**
 * Resolve drive type.
 */
const resolveDriveType = (equipment: string[], fallback: string): string => {
    const m = matchEquipment(equipment, /Antriebsart:\s*([^\n,]+)/i);
    if (m) return m[1].trim();
    if (equipment.some(e => /Allradantrieb|4x4|4MATIC|xDrive|4Motion|AWD/i.test(e))) return 'Allradantrieb';
    if (equipment.some(e => /Hinterradantrieb|RWD/i.test(e))) return 'Hinterradantrieb';
    if (equipment.some(e => /Frontantrieb|FWD/i.test(e))) return 'Frontantrieb';
    return fallback;
};

/**
 * Resolve color description.
 * Extracts the human-readable color name from colorData or falls back to standardColor.
 */
const resolveColor = (
    colorData: Record<string, string> | undefined | null,
    standardColor: string | undefined,
    fallback: string
): string => {
    if (colorData?.A1_desc) {
        // "COLORE ESTERNO (Onyx Schwarz)" → "Onyx Schwarz"
        const inParens = colorData.A1_desc.match(/\(([^)]+)\)/);
        if (inParens) return inParens[1].trim();
        return colorData.A1_desc.trim();
    }
    if (standardColor) {
        const name = getColorName(standardColor);
        if (name) return name;
    }
    return fallback;
};

/**
 * Resolve upholstery description.
 * Falls back to extracting "Sitzbezug / Polsterung: X" from equipment.
 */
const resolveUpholstery = (
    colorData: Record<string, string> | undefined | null,
    equipment: string[],
    fallback: string
): string => {
    if (colorData?.PM_desc && colorData.PM_desc !== 'undefined') {
        const parts = [colorData.PM_desc, colorData.PF_desc].filter(Boolean);
        return parts.join(' / ');
    }
    if (colorData?.PM && colorData.PM !== 'undefined') {
        const parts = [colorData.PM, colorData.PF].filter(Boolean);
        return parts.join(' / ');
    }
    // Try equipment string
    const m = matchEquipment(equipment, /Sitzbezug[^:]*:\s*([^\n,]+)/i);
    if (m) return m[1].trim();
    return fallback;
};

// ---------------------------------------------------------------------------
// German Date Picker Wrapper Component
// ---------------------------------------------------------------------------

interface DateInputProps {
    label: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    required?: boolean;
    adminMode?: boolean;
    onToggleRequired?: () => void;
    className?: string;
    name?: string;
    error?: string;
}

const GermanDatePickerInput: React.FC<DateInputProps> = ({
    label,
    value,
    onChange,
    required,
    adminMode,
    onToggleRequired,
    className,
    name,
    error
}) => {
    const dateInputRef = React.useRef<HTMLInputElement>(null);

    const handleCalendarClick = () => {
        if (dateInputRef.current) {
            try {
                dateInputRef.current.showPicker();
            } catch (err) {
                dateInputRef.current.focus();
                dateInputRef.current.click();
            }
        }
    };

    return (
        <div className={`relative ${className || ''}`}>
            <FormInput
                name={name}
                error={error}
                label={label}
                value={value}
                onChange={v => onChange(formatDateInput(v))}
                placeholder="DD.MM.YYYY"
                inputMode="numeric"
                adminMode={adminMode}
                onToggleRequired={onToggleRequired}
                required={required}
                suffix={
                    <button
                        type="button"
                        onClick={handleCalendarClick}
                        disabled={adminMode}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-primary transition-all active:scale-95 pointer-events-auto flex items-center justify-center"
                        title="Kalender öffnen"
                    >
                        <Calendar className="w-4 h-4" />
                    </button>
                }
            />
            {/* Hidden native date input */}
            <input
                ref={dateInputRef}
                type="date"
                value={normalizeDate(value)}
                onChange={e => {
                    const val = e.target.value;
                    if (val) {
                        onChange(formatDate(val));
                    }
                }}
                disabled={adminMode}
                className="absolute inset-0 opacity-0 pointer-events-none"
            />
        </div>
    );
};

interface MonthYearInputProps extends DateInputProps {
    placeholder?: string;
}

const GermanMonthYearPickerInput: React.FC<MonthYearInputProps> = ({
    label,
    value,
    onChange,
    required,
    adminMode,
    onToggleRequired,
    className,
    name,
    error,
    placeholder
}) => {
    const monthInputRef = React.useRef<HTMLInputElement>(null);

    const handleCalendarClick = () => {
        if (monthInputRef.current) {
            try {
                monthInputRef.current.showPicker();
            } catch (err) {
                monthInputRef.current.focus();
                monthInputRef.current.click();
            }
        }
    };

    return (
        <div className={`relative ${className || ''}`}>
            <FormInput
                name={name}
                error={error}
                label={label}
                value={value}
                onChange={v => onChange(formatMonthYearInput(v))}
                placeholder={placeholder}
                inputMode="numeric"
                adminMode={adminMode}
                onToggleRequired={onToggleRequired}
                required={required}
                suffix={
                    <button
                        type="button"
                        onClick={handleCalendarClick}
                        disabled={adminMode}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-primary transition-all active:scale-95 pointer-events-auto flex items-center justify-center"
                        title="Kalender öffnen"
                    >
                        <Calendar className="w-4 h-4" />
                    </button>
                }
            />
            <input
                ref={monthInputRef}
                type="month"
                value={normalizeMonthYear(value)}
                onChange={e => {
                    const val = e.target.value;
                    if (val) {
                        onChange(formatMonthYear(val));
                    }
                }}
                disabled={adminMode}
                className="absolute inset-0 opacity-0 pointer-events-none"
            />
        </div>
    );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
    adminMode?: boolean;
    onToggleRequired?: (fieldName: string) => Promise<void>;
}

const Step2_VehicleID: React.FC<Props> = ({ adminMode, onToggleRequired }) => {
    const { t } = useTranslation();
    const store = useReportStore();
    const { showValidationErrors } = useUIStore();
    const validationErrors = store.getStepValidationErrors(2);
    const getFieldError = (fieldName: string) => {
        return showValidationErrors && validationErrors[fieldName] ? t('validation.required', 'Pflichtfeld') : undefined;
    };
    const isRequired = (fieldName: string) => store.fieldConfigs?.find(c => c.fieldName === fieldName)?.required;
    const [vinInput, setVinInput] = useState(store.vin);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [vinValidation, setVinValidation] = useState<{ isValid: boolean, scannedVin: string } | null>(null);
    const [showEquipmentModal, setShowEquipmentModal] = useState(false);
    const [equipmentSearch, setEquipmentSearch] = useState('');
    const [newEquipmentName, setNewEquipmentName] = useState('');

    const handleFieldPhoto = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const files = e.target.files;
        if (!files) return;
        const currentImages = (store as any)[fieldName] || [];
        const newImages = [...currentImages];
        for (const file of Array.from(files)) {
            try {
                // Non-blocking aspect ratio check
                const validation = await validateImageAspectRatio(file);
                if (!validation.valid) {
                    // Show informational toast instead of blocking
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
        store.updateField(fieldName as any, newImages);
        e.target.value = '';
    };

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

    const handleAddEquipment = (type: 'standard' | 'optional') => {
        const trimmed = newEquipmentName.trim();
        if (!trimmed) {
            toast.error(t('step2.equipmentNameEmpty'));
            return;
        }

        if (type === 'standard') {
            if (store.standardEquipment.includes(trimmed)) {
                toast.error(t('step2.equipmentDuplicate'));
                return;
            }
            const updated = [...store.standardEquipment, trimmed];
            store.updateField('standardEquipment', updated);
            toast.success(t('step2.equipmentAddedStandard'));
        } else {
            if (store.optionalEquipment.includes(trimmed)) {
                toast.error(t('step2.equipmentDuplicate'));
                return;
            }
            const updated = [...store.optionalEquipment, trimmed];
            store.updateField('optionalEquipment', updated);
            toast.success(t('step2.equipmentAddedOptional'));
        }
        setNewEquipmentName('');
    };

    const handleRemoveEquipment = (type: 'standard' | 'optional', itemToRemove: string) => {
        if (type === 'standard') {
            const updated = store.standardEquipment.filter(item => item !== itemToRemove);
            store.updateField('standardEquipment', updated);
            toast.success(t('step2.equipmentRemoved'));
        } else {
            const updated = store.optionalEquipment.filter(item => item !== itemToRemove);
            store.updateField('optionalEquipment', updated);
            toast.success(t('step2.equipmentRemoved'));
        }
    };

    const handleLookup = async () => {
        if (!validateVIN(vinInput)) {
            setError(t('step2.vinInvalid'));
            return;
        }
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const data = await fetchVehicleByVIN(vinInput);

            // ----------------------------------------------------------------
            // Normalise — guard against missing optional fields in the API
            // response (e.g. Opel Astra has no optionalEquipment / colorData).
            // ----------------------------------------------------------------
            const std: string[] = data.standardEquipment ?? [];
            const opt: string[] = data.optionalEquipment ?? [];
            const all: string[] = [...std, ...opt];
            const colorData: Record<string, string> | null = data.colorData ?? null;

            // ----------------------------------------------------------------
            // Derive values — all logic in pure helpers above so it is easy to
            // unit-test independently of React / Zustand.
            // ----------------------------------------------------------------

            const fuelType = data.fuelType ?? resolveFuelType(all, store.fuelType);
            const isPureEV = fuelType === 'Elektro';

            // Power — exclude kWh battery entries
            const powerKw = data.powerKw ?? resolvePowerKw(all, store.powerKw);

            // Displacement — use exact value from DAT API when available.
            // NOTE: safeDisplacement (below) applies EV guard; this raw value
            // is kept as intermediate only.
            const displacement = data.displacement ?? resolveDisplacement(all, data.manufacturer || '', store.displacement);

            const transmission = data.transmission ?? resolveTransmission(all, store.transmission);
            const emissionMatch = matchEquipment(all, /nach Abgasnorm\s+(Euro\s*\d+\w*)/i);
            const emissionClass = data.emissionClass ?? (emissionMatch ? emissionMatch[1].trim() : store.emissionClass);
            const driveType = data.driveType ?? resolveDriveType(all, store.driveType);

            const doorsMatch = matchEquipment(all, /(\d+)-türig/i);
            const doors = data.doors ?? (doorsMatch ? parseInt(doorsMatch[1]) : store.doors);

            const seatsMatch = matchEquipment(all, /(\d+)-Sitzer/i);
            // FIX: preserve store.seats when no match (was always resetting to 4/5)
            const seatsFromEquipment = seatsMatch ? parseInt(seatsMatch[1]) : undefined;

            const bodyType = data.bodyType ?? resolveBodyType(all, data.baseModel ?? '', store.bodyType);
            const cylinders = data.cylinders ?? resolveCylinders(all, isPureEV, store.cylinders ?? undefined);
            const wheels = resolveWheels(std, opt, store.wheels);

            // EV-safe normalization: zero out ICE-only fields that may have
            // leaked through the DAT fallback chain for pure electric vehicles.
            const safeDisplacement = isPureEV ? 0 : (data.displacement ?? resolveDisplacement(all, data.manufacturer || '', store.displacement));
            const safeCylinders    = isPureEV ? 0 : cylinders;
            const safeTransmission = isPureEV && transmission !== undefined && /\d+-Gang/i.test(transmission || '')
                ? 'Elektrogetriebe (1-Gang)'
                : transmission;

            // Seats fallback hierarchy: DAT API -> equipment -> store -> body-type heuristic
            const seats =
                data.seats ??
                seatsFromEquipment ??
                store.seats ??
                (bodyType === 'Van' ? 7 : bodyType === 'Coupé' ? 4 : 5);

            // Key number = first KBA number
            const keyNumber = data.kbaNumbers
                ? data.kbaNumbers.split(/[,/]/)[0].trim()
                : store.keyNumber;

            const colorDescription = resolveColor(colorData, data.standardColor, store.colorDescription);
            const upholsteryDescription = resolveUpholstery(colorData, all, store.upholsteryDescription);

            // ----------------------------------------------------------------
            // Single atomic store update — Clear old data and apply new results
            // ----------------------------------------------------------------
            store.updateVehicleData({
                // Identity
                vin: vinInput.toUpperCase(),
                manufacturer: data.manufacturer,
                baseModel: data.baseModel,
                subModel: data.subModel,
                datECode: data.datECode,
                kbaNumbers: data.kbaNumbers,
                standardEquipment: std,
                optionalEquipment: opt,

                // Derived vehicle data — use lookup results or empty defaults
                fuelType,
                powerKw,
                displacement: safeDisplacement,
                transmission: safeTransmission,
                emissionClass,
                driveType,
                doors,
                seats,
                cylinders: safeCylinders,
                bodyType,
                keyNumber,
                wheels,
                colorDescription,
                upholsteryDescription,

                // Clear manual-entry fields on successful lookup
                firstRegistration: '',
                lastRegistration: '',
                nextHU: '',
            });

            setSuccess(true);
            toast.success(t('step2.lookupSuccess') || 'Vehicle data found!');
        } catch (err) {
            console.error('VIN lookup error:', err);
            setError(t('step2.lookupError'));
            toast.error(t('step2.lookupError'));
        }

        setLoading(false);
    };

    return (
        <div className="animate-fade-in space-y-4">
            <SectionTitle>{t('step2.vinLookup')}</SectionTitle>

            <Card>
                <div className="space-y-4">
                    {/* Identification Photos aligned above the Search Button */}
                    <div
                        data-fieldname="identificationImages"
                        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-xl transition-all ${
                            showValidationErrors && (validationErrors['identificationImages'] || validationErrors['vin_photo'])
                                ? 'border-2 border-red-500 bg-red-50/10'
                                : 'border border-transparent'
                        }`}
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('step4.photoActions')}:</span>
                                <label className="p-1.5 bg-primary/5 border border-primary/20 rounded-lg cursor-pointer text-primary hover:bg-primary/10 transition-all flex items-center gap-1.5 shadow-sm active:scale-95" title={t('step4.takePhoto')}>
                                    <Camera className="w-4 h-4" />
                                    <span className="text-[10px] font-bold">{t('step2.takePhoto')}</span>
                                    <input type="file" accept="image/*" capture="environment" onChange={e => handleFieldPhoto(e, 'identificationImages')} className="hidden" />
                                </label>
                                <label className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer text-gray-500 hover:bg-gray-100 transition-all flex items-center gap-1.5 shadow-sm active:scale-95" title={t('step4.choosePhoto')}>
                                    <ImagePlus className="w-4 h-4" />
                                    <span className="text-[10px] font-bold">{t('step2.uploadPhoto')}</span>
                                    <input type="file" multiple accept="image/*" onChange={e => handleFieldPhoto(e, 'identificationImages')} className="hidden" />
                                </label>
                            </div>
                            {showValidationErrors && (validationErrors['identificationImages'] || validationErrors['vin_photo']) && (
                                <p className="text-[10px] text-red-600 font-medium">{t('validation.required', 'Pflichtfeld')}</p>
                            )}
                        </div>

                        {store.identificationImages && store.identificationImages.length > 0 && (
                            <div className="flex flex-wrap md:justify-end gap-1.5">
                                {store.identificationImages.map((img, idx) => (
                                    <PhotoThumbnail
                                        key={idx}
                                        src={img}
                                        onRemove={() => removeFieldPhoto('identificationImages', idx)}
                                        onUpdate={(newSrc) => updateFieldPhoto('identificationImages', idx, newSrc)}
                                        className="w-20 h-14"
                                        isExternal={store.videoExpertImages?.includes(img)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <div className="flex-1 w-full">
                            <FormInput
                                name="vin"
                                label={t('step2.vinInput')}
                                value={vinInput}
                                onChange={(v) => {
                                    setVinInput(v.toUpperCase());
                                    setVinValidation(null); // Reset validation when manually edited
                                }}
                                mono
                                placeholder={t('step2.vinInputPlaceholder')}
                                error={
                                    getFieldError('vin') || (vinInput.length > 0 && !validateVIN(vinInput)
                                        ? t('step2.vinFormatError')
                                        : '')
                                }
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('vin')}
                                required={isRequired('vin')}
                            />
                            {vinValidation && (
                                <div className={`mt-1 flex items-center gap-1.5 text-[11px] font-medium animate-fade-in ${vinValidation.isValid ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {vinValidation.isValid ? (
                                        <>
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            {t('step2.scanSuccess')}
                                        </>
                                    ) : (
                                        <>
                                            <ShieldAlert className="w-3.5 h-3.5" />
                                            {t('step2.scanMismatch')}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 h-[42px]">
                            <VINScannerModal
                                expectedVin={vinInput}
                                onValidated={(isValid, scannedVin) => setVinValidation({ isValid, scannedVin })}
                                onApply={(scannedVin) => {
                                    setVinInput(scannedVin);
                                    setVinValidation({ isValid: true, scannedVin });
                                }}
                            >
                                <button
                                    className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all flex items-center gap-2 border border-gray-200 active:scale-95"
                                    title={t('step2.scanToValidate')}
                                >
                                    <ScanLine className="w-5 h-5 text-primary" />
                                    <span className="text-xs font-bold whitespace-nowrap">{t('step2.scanVin')}</span>
                                </button>
                            </VINScannerModal>

                            <button
                                onClick={handleLookup}
                                disabled={loading}
                                className="btn-primary flex items-center gap-2 px-6 h-full"
                            >
                                <Search className="w-4 h-4" />
                                {t('step2.lookup')}
                            </button>
                        </div>
                    </div>

                    {loading && <LoadingSpinner text={t('step2.lookupLoading')} />}
                    {error && <ErrorBanner message={error} onClose={() => setError('')} />}

                    <div className="flex justify-center pt-2 animate-fade-in">
                        <button
                            onClick={() => setShowEquipmentModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-all text-xs font-bold shadow-sm border border-primary/20 active:scale-95"
                        >
                            <List className="w-4 h-4" />
                            {t('step2.viewEquipmentDetails')}
                        </button>
                    </div>
                </div>
            </Card>
            {success && (
                <div className="bg-orange-50 border-l-4 border-primary p-3 text-sm text-primary font-medium animate-slide-down flex items-center gap-2 mb-4">
                    <CheckCircle className="w-4 h-4" />
                    {t('step2.lookupSuccess')}
                </div>
            )}

            <div className="space-y-4">
                {/* Manual entry — date / mileage fields */}
                <Card>
                    <div className="border-b border-gray-100 pb-2 mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">{t('step2.manualEntry')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <GermanDatePickerInput
                            name="firstRegistration"
                            error={getFieldError('firstRegistration')}
                            label={t('step2.firstRegistration')}
                            value={store.firstRegistration}
                            onChange={v => store.updateField('firstRegistration', v)}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('firstRegistration')}
                            required={isRequired('firstRegistration')}
                        />
                        <div className="flex flex-col gap-2">
                            <GermanDatePickerInput
                                name="lastRegistration"
                                error={getFieldError('lastRegistration')}
                                label={
                                    <span className="flex items-center gap-1.5">
                                        <span>{t('step2.lastRegistration')}</span>
                                        {store.firstRegistration && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    store.updateField('lastRegistration', store.firstRegistration);
                                                    toast.success(t('step2.copyFirstToLast'));
                                                }}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold text-primary bg-primary/5 border border-primary/20 rounded hover:bg-primary/10 hover:border-primary/40 transition-all active:scale-95 shadow-sm normal-case"
                                                title={t('step2.copyFirstToLast')}
                                            >
                                                <Copy className="w-2.5 h-2.5" />
                                                {t('step2.copyFirstToLast')}
                                            </button>
                                        )}
                                    </span>
                                }
                                value={store.lastRegistration}
                                onChange={v => store.updateField('lastRegistration', v)}
                                className="mb-1"
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('lastRegistration')}
                                required={isRequired('lastRegistration')}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <FormInput
                                name="mileage"
                                error={getFieldError('mileage')}
                                label={t('step2.mileage')}
                                value={String(store.mileage || '')}
                                onChange={v => store.updateField('mileage', parseInt(v) || 0)}
                                type="number"
                                inputMode="numeric"
                                placeholder={t('step2.mileagePlaceholder')}
                                className="mb-1"
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('mileage')}
                                required={isRequired('mileage')}
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.takePhoto')}>
                                    <Camera className="w-4 h-4" />
                                    <input type="file" accept="image/*" capture="environment" onChange={e => handleFieldPhoto(e, 'mileageImages')} className="hidden" />
                                </label>
                                <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.choosePhoto')}>
                                    <ImagePlus className="w-4 h-4" />
                                    <input type="file" multiple accept="image/*" onChange={e => handleFieldPhoto(e, 'mileageImages')} className="hidden" />
                                </label>
                                {store.mileageImages && store.mileageImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {store.mileageImages.map((img, idx) => (
                                            <PhotoThumbnail
                                                key={idx}
                                                src={img}
                                                onRemove={() => removeFieldPhoto('mileageImages', idx)}
                                                onUpdate={(newSrc) => updateFieldPhoto('mileageImages', idx, newSrc)}
                                                className="w-20 h-14"
                                                isExternal={store.videoExpertImages?.includes(img)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <GermanMonthYearPickerInput
                                name="nextHU"
                                error={getFieldError('nextHU')}
                                label={t('step2.nextHU')}
                                value={store.nextHU}
                                onChange={v => store.updateField('nextHU', v)}
                                placeholder={t('step2.nextHUPlaceholder')}
                                className="mb-1"
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('nextHU')}
                                required={isRequired('nextHU')}
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.takePhoto')}>
                                    <Camera className="w-4 h-4" />
                                    <input type="file" accept="image/*" capture="environment" onChange={e => handleFieldPhoto(e, 'nextHUImages')} className="hidden" />
                                </label>
                                <label className="p-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm" title={t('step4.choosePhoto')}>
                                    <ImagePlus className="w-4 h-4" />
                                    <input type="file" multiple accept="image/*" onChange={e => handleFieldPhoto(e, 'nextHUImages')} className="hidden" />
                                </label>
                                {store.nextHUImages && store.nextHUImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {store.nextHUImages.map((img, idx) => (
                                            <PhotoThumbnail
                                                key={idx}
                                                src={img}
                                                onRemove={() => removeFieldPhoto('nextHUImages', idx)}
                                                onUpdate={(newSrc) => updateFieldPhoto('nextHUImages', idx, newSrc)}
                                                className="w-20 h-14"
                                                isExternal={store.videoExpertImages?.includes(img)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">{t('step3.keys')}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">{t('step4.photoActions')}:</span>
                                <label className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm active:scale-95" title={t('step4.takePhoto')}>
                                    <Camera className="w-4 h-4" />
                                    <input type="file" accept="image/*" capture="environment" onChange={e => handleFieldPhoto(e, 'keysImages')} className="hidden" />
                                </label>
                                <label className="p-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm active:scale-95" title={t('step4.choosePhoto')}>
                                    <ImagePlus className="w-4 h-4" />
                                    <input type="file" multiple accept="image/*" onChange={e => handleFieldPhoto(e, 'keysImages')} className="hidden" />
                                </label>
                                {store.keysImages && store.keysImages.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 ml-2">
                                        {store.keysImages.map((img, idx) => (
                                            <PhotoThumbnail
                                                key={idx}
                                                src={img}
                                                onRemove={() => removeFieldPhoto('keysImages', idx)}
                                                onUpdate={(newSrc) => updateFieldPhoto('keysImages', idx, newSrc)}
                                                className="w-20 h-14"
                                                isExternal={store.videoExpertImages?.includes(img)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Target Keys — manually editable */}
                            <FormInput
                                label={t('step2.targetKeysCount')}
                                type="number"
                                inputMode="numeric"
                                value={String(store.targetKeysCount ?? '')}
                                onChange={v => {
                                    const val = parseInt(v) || 0;
                                    store.updateField('targetKeysCount', val);
                                }}
                                placeholder="2"
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('targetKeysCount')}
                                required={isRequired('targetKeysCount')}
                            />

                            {/* Actual Keys — user input */}
                            <div className="space-y-1">
                                <FormInput
                                    label={t('step2.actualKeysCount')}
                                    type="number"
                                    inputMode="numeric"
                                    value={String(store.actualKeysCount ?? '')}
                                    onChange={v => {
                                        const val = parseInt(v) || 0;
                                        store.updateField('actualKeysCount', val);
                                        store.updateField('keysPresent', val);
                                    }}
                                    placeholder={String(store.targetKeysCount ?? 2)}
                                    adminMode={adminMode}
                                    onToggleRequired={() => onToggleRequired?.('actualKeysCount')}
                                    required={isRequired('actualKeysCount')}
                                />
                                {(store.actualKeysCount ?? 0) !== (store.targetKeysCount ?? 2) && (store.actualKeysCount ?? 0) > 0 && (
                                    <p className="text-[10px] text-orange-600 font-medium flex items-center gap-1">
                                        <X className="w-3 h-3" /> {t('step2.keysMismatch')}
                                    </p>
                                )}
                            </div>

                            {/* Workshop Keys — unchanged */}
                            <FormInput
                                label={t('step2.workshopKeysCount')}
                                type="number"
                                inputMode="numeric"
                                value={String(store.workshopKeysCount ?? '')}
                                onChange={v => store.updateField('workshopKeysCount', parseInt(v) || 0)}
                                placeholder="0"
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('workshopKeysCount')}
                                required={isRequired('workshopKeysCount')}
                            />

                            {/* Additional Remote — unchanged */}
                            <FormInput
                                label={t('step2.remoteControlsCount')}
                                type="number"
                                inputMode="numeric"
                                value={String(store.remoteControlsCount ?? '')}
                                onChange={v => store.updateField('remoteControlsCount', parseInt(v) || 0)}
                                placeholder="0"
                                adminMode={adminMode}
                                onToggleRequired={() => onToggleRequired?.('remoteControlsCount')}
                                required={isRequired('remoteControlsCount')}
                            />
                        </div>

                    </div>
                </Card>

                {/* Vehicle data — populated from VIN lookup */}
                <Card>
                    <div className="border-b border-gray-100 pb-2 mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">{t('step2.vehicleData')}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                        <FormInput
                            name="manufacturer"
                            error={getFieldError('manufacturer')}
                            label={t('step2.manufacturer')}
                            value={store.manufacturer}
                            onChange={v => store.updateField('manufacturer', v)}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('manufacturer')}
                            required={isRequired('manufacturer')}
                        />
                        <FormInput
                            name="baseModel"
                            error={getFieldError('baseModel')}
                            label={t('step2.baseModel')}
                            value={store.baseModel}
                            onChange={v => store.updateField('baseModel', v)}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('baseModel')}
                            required={isRequired('baseModel')}
                        />
                        <FormInput
                            name="subModel"
                            error={getFieldError('subModel')}
                            label={t('step2.subModel')}
                            value={store.subModel}
                            onChange={v => store.updateField('subModel', v)}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('subModel')}
                            required={isRequired('subModel')}
                        />
                        <FormInput
                            name="bodyType"
                            error={getFieldError('bodyType')}
                            label={t('step2.bodyType')}
                            value={t(`step2.bodyTypes.${store.bodyType}`, store.bodyType || '')}
                            onChange={v => store.updateField('bodyType', v)}
                            placeholder={t('step2.bodyTypePlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('bodyType')}
                            required={isRequired('bodyType')}
                        />
                        <FormInput
                            name="doors"
                            error={getFieldError('doors')}
                            label={t('step2.doors')}
                            value={store.doors === null || store.doors === undefined ? '' : String(store.doors)}
                            onChange={v => store.updateField('doors', v === '' ? null : (parseInt(v) || 0))}
                            type="number"
                            inputMode="numeric"
                            placeholder={t('step2.doorsPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('doors')}
                            required={isRequired('doors')}
                        />
                        <FormInput
                            name="seats"
                            error={getFieldError('seats')}
                            label={t('step2.seats')}
                            value={store.seats === null || store.seats === undefined ? '' : String(store.seats)}
                            onChange={v => store.updateField('seats', v === '' ? null : (parseInt(v) || 0))}
                            type="number"
                            inputMode="numeric"
                            placeholder={t('step2.seatsPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('seats')}
                            required={isRequired('seats')}
                        />
                        <FormInput
                            name="keyNumber"
                            error={getFieldError('keyNumber')}
                            label={t('step2.keyNumber')}
                            value={store.keyNumber}
                            onChange={v => store.updateField('keyNumber', v)}
                            mono
                            placeholder={t('step2.keyNumberPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('keyNumber')}
                            required={isRequired('keyNumber')}
                        />
                        <FormSelect
                            name="fuelType"
                            error={getFieldError('fuelType')}
                            label={
                                <span className="flex items-center gap-1.5">
                                    {t('step2.fuelType')}
                                </span>
                            }
                            value={store.fuelType}
                            onChange={v => store.updateField('fuelType', v)}
                            options={[
                                { value: 'Benzin', label: t('step2.fuelTypes.Benzin') },
                                { value: 'Diesel', label: t('step2.fuelTypes.Diesel') },
                                { value: 'Elektro', label: t('step2.fuelTypes.Elektro') },
                                { value: 'Hybrid', label: t('step2.fuelTypes.Hybrid') },
                                { value: 'Plug-in Hybrid', label: t('step2.fuelTypes.Plug-in Hybrid') },
                                { value: 'Mild-Hybrid Benzin', label: t('step2.fuelTypes.Mild-Hybrid Benzin') },
                                { value: 'Mild-Hybrid Diesel', label: t('step2.fuelTypes.Mild-Hybrid Diesel') },
                                { value: 'Hybrid Diesel', label: t('step2.fuelTypes.Hybrid Diesel') },
                                { value: 'Gas', label: t('step2.fuelTypes.Gas') },
                                { value: 'Wasserstoff', label: t('step2.fuelTypes.Wasserstoff') }
                            ]}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('fuelType')}
                            required={isRequired('fuelType')}
                        />
                        {/* Cylinders — always shown; empty for pure EVs */}
                        <FormInput
                            name="cylinders"
                            error={getFieldError('cylinders')}
                            label={t('step2.cylinders')}
                            value={store.fuelType === 'Elektro' ? '' : (store.cylinders === null || store.cylinders === undefined ? '' : String(store.cylinders))}
                            onChange={v => store.updateField('cylinders', v === '' ? null : (parseInt(v) || 0))}
                            type="number"
                            inputMode="numeric"
                            placeholder={t('step2.cylindersPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('cylinders')}
                            required={isRequired('cylinders')}
                        />
                        {/* Power (kW) — always shown; empty for pure EVs */}
                        <FormInput
                            name="powerKw"
                            error={getFieldError('powerKw')}
                            label={t('step2.powerKw')}
                            value={store.fuelType === 'Elektro' ? '' : String(store.powerKw || '')}
                            onChange={v => store.updateField('powerKw', parseInt(v) || 0)}
                            type="number"
                            inputMode="numeric"
                            placeholder={t('step2.powerKwPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('powerKw')}
                            required={isRequired('powerKw')}
                        />
                        {/* Displacement (Hubraum) — always shown; empty for pure EVs */}
                        <FormInput
                            name="displacement"
                            error={getFieldError('displacement')}
                            label={t('step2.displacement')}
                            value={store.fuelType === 'Elektro' ? '' : String(store.displacement || '')}
                            onChange={v => store.updateField('displacement', parseInt(v) || 0)}
                            type="number"
                            inputMode="numeric"
                            placeholder={t('step2.displacementPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('displacement')}
                            required={isRequired('displacement')}
                        />
                        <FormInput
                            name="emissionClass"
                            error={getFieldError('emissionClass')}
                            label={t('step2.emissionClass')}
                            value={store.emissionClass}
                            onChange={v => store.updateField('emissionClass', v)}
                            placeholder={t('step2.emissionClassPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('emissionClass')}
                            required={isRequired('emissionClass')}
                        />
                        <FormInput
                            name="driveType"
                            error={getFieldError('driveType')}
                            label={t('step2.driveType')}
                            value={t(`step2.driveTypes.${store.driveType}`, store.driveType || '')}
                            onChange={v => store.updateField('driveType', v)}
                            placeholder={t('step2.driveTypePlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('driveType')}
                            required={isRequired('driveType')}
                        />
                        <FormInput
                            name="transmission"
                            error={getFieldError('transmission')}
                            label={t('step2.transmission')}
                            value={store.transmission}
                            onChange={v => store.updateField('transmission', v)}
                            placeholder={t('step2.transmissionPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('transmission')}
                            required={isRequired('transmission')}
                        />
                        <FormInput
                            name="colorDescription"
                            error={getFieldError('colorDescription')}
                            label={t('step2.color')}
                            value={store.colorDescription}
                            onChange={v => store.updateField('colorDescription', v)}
                            placeholder={t('step2.colorPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('colorDescription')}
                            required={isRequired('colorDescription')}
                        />
                        <FormInput
                            name="upholsteryDescription"
                            error={getFieldError('upholsteryDescription')}
                            label={t('step2.upholstery')}
                            value={store.upholsteryDescription}
                            onChange={v => store.updateField('upholsteryDescription', v)}
                            placeholder={t('step2.upholsteryPlaceholder')}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('upholsteryDescription')}
                            required={isRequired('upholsteryDescription')}
                        />
                        <FormSelect
                            name="vehicleCategory"
                            error={getFieldError('vehicleCategory')}
                            label={t('step2.vehicleCategory') || 'Vehicle Category'}
                            value={store.vehicleCategory || ''}
                            onChange={v => store.setVehicleCategory(v as any)}
                            options={(store.globalConfig?.vehicleCategories?.length
                                ? store.globalConfig.vehicleCategories
                                : [
                                    'Subcompact',
                                    'Compact',
                                    'Mid-size',
                                    'Full-size',
                                    'Luxury',
                                    'Super Luxury / Sports',
                                    'Transporter'
                                ]
                            ).map(cat => {
                                let label = cat;
                                if (cat === 'Subcompact') label = 'Subcompact (Kleinstwagen)';
                                else if (cat === 'Compact') label = 'Compact (Kompaktklasse)';
                                else if (cat === 'Mid-size') label = 'Mid-size (Mittelklasse)';
                                else if (cat === 'Full-size') label = 'Full-size (Obere Mittelklasse)';
                                else if (cat === 'Luxury') label = 'Luxury (Oberklasse)';
                                else if (cat === 'Super Luxury / Sports') label = 'Super Luxury / Sports';
                                else if (cat === 'Transporter') label = 'Transporter (Transporter)';
                                return { value: cat, label };
                            })}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('vehicleCategory')}
                            required={isRequired('vehicleCategory') || true}
                        />
                    </div>
                </Card>


            </div>
            {/* Equipment Details Modal */}
            <ModalWrapper
                isOpen={showEquipmentModal}
                onClose={() => {
                    setShowEquipmentModal(false);
                    setEquipmentSearch('');
                    setNewEquipmentName('');
                }}
                title={t('step2.equipmentDetails')}
                className="max-w-5xl"
            >
                <div className="space-y-6">
                    {/* Add Equipment Form & Search Bar */}
                    <div className="flex flex-col gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    {t('step2.addEquipmentItem')}
                                </label>
                                <input
                                    type="text"
                                    placeholder={t('step2.equipmentNamePlaceholder')}
                                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-[42px]"
                                    value={newEquipmentName}
                                    onChange={(e) => setNewEquipmentName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleAddEquipment('optional');
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto h-[42px]">
                                <button
                                    onClick={() => handleAddEquipment('standard')}
                                    className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap h-full"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t('step2.addAsStandard')}
                                </button>
                                <button
                                    onClick={() => handleAddEquipment('optional')}
                                    className="px-4 py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap h-full"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t('step2.addAsOptional')}
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-3">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('activityLog.search')}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-[38px]"
                                    value={equipmentSearch}
                                    onChange={(e) => setEquipmentSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Optional Equipment List */}
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-4 py-1">
                                <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                                <h4 className="text-base font-extrabold text-gray-900 tracking-tight">{t('step2.optionalEquipment')}</h4>
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold">
                                    {store.optionalEquipment.length}
                                </span>
                            </div>
                            {store.optionalEquipment.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                                    {store.optionalEquipment
                                        .filter(item => item.toLowerCase().includes(equipmentSearch.toLowerCase()))
                                        .map((item, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 group transition-all duration-200 p-1.5 hover:bg-orange-50/50 rounded-lg border border-transparent hover:border-orange-100 text-left">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="mt-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform" />
                                                    <span className="text-xs text-gray-700 leading-tight font-medium group-hover:text-gray-900 break-words">
                                                        {item}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveEquipment('optional', item)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded-lg transition-all hover:bg-red-50 flex-shrink-0"
                                                    title={t('common.remove')}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic ml-4">{t('common.noneSelected')}</p>
                            )}
                            {store.optionalEquipment.length > 0 && store.optionalEquipment.filter(item => item.toLowerCase().includes(equipmentSearch.toLowerCase())).length === 0 && equipmentSearch && (
                                <p className="text-xs text-gray-400 italic mt-2 ml-4">Keine Sonderausstattung gefunden.</p>
                            )}
                        </div>

                        {/* Standard Equipment List */}
                        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                            <div className="flex items-center gap-2 mb-4 py-1">
                                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                <h4 className="text-base font-extrabold text-gray-900 tracking-tight">{t('step2.standardEquipment')}</h4>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                                    {store.standardEquipment.length}
                                </span>
                            </div>
                            {store.standardEquipment.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                                    {store.standardEquipment
                                        .filter(item => item.toLowerCase().includes(equipmentSearch.toLowerCase()))
                                        .map((item, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 group transition-all duration-200 p-1.5 hover:bg-blue-50/50 rounded-lg border border-transparent hover:border-blue-100 text-left">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform" />
                                                    <span className="text-xs text-gray-700 leading-tight font-medium group-hover:text-gray-900 break-words">
                                                        {item}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveEquipment('standard', item)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded-lg transition-all hover:bg-red-50 flex-shrink-0"
                                                    title={t('common.remove')}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic ml-4">{t('common.noneSelected')}</p>
                            )}
                            {store.standardEquipment.length > 0 && store.standardEquipment.filter(item => item.toLowerCase().includes(equipmentSearch.toLowerCase())).length === 0 && equipmentSearch && (
                                <p className="text-xs text-gray-400 italic mt-2 ml-4">Keine Serienausstattung gefunden.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100 mt-2">
                        <button
                            onClick={() => {
                                setShowEquipmentModal(false);
                                setEquipmentSearch('');
                            }}
                            className="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            {t('step2.closeEquipment')}
                        </button>
                    </div>
                </div>
            </ModalWrapper>
        </div>
    );
};

export default Step2_VehicleID;
