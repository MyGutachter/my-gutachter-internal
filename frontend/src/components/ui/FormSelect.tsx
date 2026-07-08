import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface Option { value: string; label: string; disabled?: boolean; }

interface Props {
    label: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    options: Option[];
    error?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    adminMode?: boolean;
    onToggleRequired?: () => void;
    name?: string;
}

const FormSelect: React.FC<Props> = ({
    label,
    value,
    onChange,
    options,
    error,
    required,
    disabled,
    className = '',
    adminMode,
    onToggleRequired,
    name
}) => {
    const { t } = useTranslation();

    const effectiveOptions = useMemo(() => {
        if (!value || value?.toString().trim() === '') return options;
        const exists = options.some(o => o.value === value);
        if (exists) return options;
        return [{ value, label: value }, ...options];
    }, [value, options]);

    return (
        <div className={`relative group ${className}`} data-fieldname={name}>
            <label
                className={`block text-[11px] font-black uppercase tracking-[0.05em] mb-2 transition-all duration-300 ${required ? 'text-black' : 'text-slate-700'
                    } ${adminMode ? 'cursor-pointer' : ''}`}
                onClick={adminMode ? onToggleRequired : undefined}
            >
                <div className="flex items-center gap-1.5">
                    {label}
                    {required && !adminMode && <span className="text-red-500 ml-1 font-bold">*</span>}

                    {adminMode && required && (
                        <span className="text-[9px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full ml-auto">
                            MANDATORY
                        </span>
                    )}
                </div>
            </label>

            <div className="relative overflow-hidden rounded-xl">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || adminMode}
                    className={`w-full px-4 py-3 bg-slate-50 border-2 transition-all duration-300 outline-none font-medium appearance-none rounded-xl
                        ${error
                            ? 'border-red-500 focus:border-red-600 text-red-900 bg-red-50/30 ring-2 ring-red-500/10'
                            : `border-slate-200 focus:border-${adminMode ? 'amber-600' : 'primary'}/20 focus:bg-white text-slate-700`
                        }
                        ${adminMode ? 'cursor-pointer' : ''}
                        disabled:opacity-75
                    `}
                >
                    <option value="">{t('common.noneSelected')}</option>
                    {effectiveOptions.map(o => (
                        <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                    ))}
                </select>

                <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-${adminMode ? 'amber-600' : 'primary'} transition-colors`}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>

                {adminMode && (
                    <div
                        className={`absolute inset-0 border-2 transition-colors pointer-events-none rounded-xl
                            ${required ? 'border-amber-600/40 ring-4 ring-amber-600/5' : 'border-transparent'}
                        `}
                    />
                )}

                {adminMode && (
                    <div
                        className="absolute inset-0 cursor-pointer z-10"
                        onClick={onToggleRequired}
                    />
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

export default FormSelect;
