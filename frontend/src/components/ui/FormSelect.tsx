import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';

interface Option { value: string; label: string; disabled?: boolean; }

interface Props {
    label: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    options: Option[];
    error?: string;
    required?: boolean;
    hidden?: boolean;
    disabled?: boolean;
    className?: string;
    adminMode?: boolean;
    onToggleRequired?: () => void;
    onToggleHidden?: () => void;
    name?: string;
}

const FormSelect: React.FC<Props> = ({
    label,
    value,
    onChange,
    options,
    error,
    required,
    hidden,
    disabled,
    className = '',
    adminMode,
    onToggleRequired,
    onToggleHidden,
    name
}) => {
    const { t } = useTranslation();

    const effectiveOptions = useMemo(() => {
        if (!value || value?.toString().trim() === '') return options;
        const exists = options.some(o => o.value === value);
        if (exists) return options;
        return [{ value, label: value }, ...options];
    }, [value, options]);

    if (!adminMode && hidden) return null;

    return (
        <div className={`relative group ${className} ${adminMode && hidden ? 'opacity-65' : ''}`} data-fieldname={name}>
            <label
                className={`block text-[11px] font-black uppercase tracking-[0.05em] mb-2 transition-all duration-300 ${required ? 'text-black' : 'text-slate-700'
                    }`}
            >
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={adminMode && hidden ? 'line-through text-slate-500' : ''}>{label}</span>
                    {required && !adminMode && <span className="text-red-500 ml-0.5 font-bold">*</span>}

                    {adminMode && (
                        <div className="flex items-center gap-1.5 ml-auto">
                            {onToggleHidden && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onToggleHidden();
                                    }}
                                    className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                        hidden
                                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-400'
                                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                    }`}
                                    title={hidden ? 'Feld ist ausgeblendet' : 'Feld ist sichtbar'}
                                >
                                    {hidden ? <EyeOff className="w-3 h-3 text-slate-600" /> : <Eye className="w-3 h-3 text-emerald-700" />}
                                    <span>{hidden ? 'Ausgeblendet' : 'Sichtbar'}</span>
                                </button>
                            )}
                            {onToggleRequired && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onToggleRequired();
                                    }}
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                        required
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                                            : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                                    }`}
                                    title={required ? 'Pflichtfeld' : 'Optionales Feld'}
                                >
                                    {required ? 'Pflicht' : 'Optional'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </label>

            <div className="relative overflow-hidden rounded-xl">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || adminMode}
                    className={`w-full px-4 py-3 bg-slate-50 border-2 transition-all duration-300 outline-none font-medium appearance-none rounded-xl
                        ${adminMode && hidden ? 'border-dashed border-slate-300 bg-slate-100/80 text-slate-400' : ''}
                        ${error
                            ? 'border-red-500 focus:border-red-600 text-red-900 bg-red-50/30 ring-2 ring-red-500/10'
                            : `border-slate-200 focus:border-${adminMode ? 'amber-600' : 'primary'}/20 focus:bg-white text-slate-700`
                        }
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
                            ${required && !hidden ? 'border-amber-600/40 ring-4 ring-amber-600/5' : 'border-transparent'}
                        `}
                    />
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

export default FormSelect;
