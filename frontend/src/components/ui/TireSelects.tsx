import React from 'react';
import { useTranslation } from 'react-i18next';
import { TIRE_MODELS } from '../../constants/tireData';

export const ManualSelect: React.FC<{
    options: string[] | { value: string; label: string }[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    manualSentinel?: string;
    manualLabel?: string;
    className?: string;
    isManualAuto?: boolean;
    disabled?: boolean;
}> = ({ options, value, onChange, placeholder, manualSentinel = 'MANUAL_SENTINEL', manualLabel, className, isManualAuto, disabled }) => {
    const { t } = useTranslation();
    const [isManual, setIsManual] = React.useState(false);

    const optionValues = React.useMemo(() => {
        return options.map(o => typeof o === 'string' ? o : o.value);
    }, [options]);

    React.useEffect(() => {
        if (isManualAuto) {
            setIsManual(true);
            return;
        }

        if (value && !optionValues.includes(value) && value !== manualSentinel) {
            setIsManual(true);
        }
    }, [optionValues, value, manualSentinel, isManualAuto]);

    if (isManual) {
        return (
            <div className="relative">
                <input
                    className={`form-input py-1 text-sm w-full ${className || ''}`}
                    value={value === manualSentinel ? '' : value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || t('common.noneSelected')}
                    disabled={disabled}
                    autoFocus
                />
                <button
                    type="button"
                    onClick={() => {
                        setIsManual(false);
                        onChange('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-primary hover:underline bg-white/80 px-1 rounded"
                >
                    {t('nav.back')}
                </button>
            </div>
        );
    }

    return (
        <select
            className={`form-input py-1 text-sm w-full ${className || ''}`}
            value={value}
            disabled={disabled}
            onChange={(e) => {
                if (e.target.value === manualSentinel) {
                    setIsManual(true);
                    onChange('');
                } else {
                    onChange(e.target.value);
                }
            }}
        >
            <option value="">{placeholder || t('common.noneSelected')}</option>
            {options.map((o) => {
                const val = typeof o === 'string' ? o : o.value;
                const label = typeof o === 'string' ? o : o.label;
                return (
                    <option key={val} value={val}>
                        {label}
                    </option>
                );
            })}
            <option value={manualSentinel} className="text-primary font-medium italic border-t">
                {manualLabel || t('step3.manualEntry')}
            </option>
        </select>
    );
};

export const TireModelSelect: React.FC<{
    brand: string;
    type: 'S' | 'W' | 'A';
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}> = ({ brand, type, value, onChange, placeholder }) => {
    const models = React.useMemo(() => {
        if (!brand || !TIRE_MODELS[brand]) return [];
        const t = (type || 'S') as 'S' | 'W' | 'A';
        return TIRE_MODELS[brand][t] || [];
    }, [brand, type]);

    return (
        <ManualSelect
            options={models}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            isManualAuto={!!brand && models.length === 0}
        />
    );
};
