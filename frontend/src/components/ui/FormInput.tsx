import React from 'react';

interface Props {
    label: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    type?: string;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    highlight?: boolean;
    mono?: boolean;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    adminMode?: boolean;
    onToggleRequired?: () => void;
    suffix?: React.ReactNode;
    inputMode?: "search" | "text" | "email" | "tel" | "url" | "none" | "numeric" | "decimal";
    pattern?: string;
    autoFocus?: boolean;
    step?: string;
    name?: string;
}

const FormInput: React.FC<Props> = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    error,
    required,
    disabled,
    className = '',
    highlight,
    mono,
    onBlur,
    onKeyDown,
    adminMode,
    onToggleRequired,
    suffix,
    inputMode,
    pattern,
    autoFocus,
    step,
    name
}) => (
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
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                disabled={disabled || adminMode}
                placeholder={placeholder}
                inputMode={inputMode}
                pattern={pattern}
                autoFocus={autoFocus}
                step={step}
                className={`w-full px-4 py-3 bg-slate-50 border-2 transition-all duration-300 outline-none font-medium rounded-xl
                    ${highlight ? 'bg-slate-100/50' : ''}
                    ${mono ? 'font-mono' : ''}
                    ${suffix ? 'pr-12' : ''}
                    ${error
                        ? 'border-red-500 focus:border-red-600 text-red-900 bg-red-50/30 ring-2 ring-red-500/10'
                        : `border-slate-200 focus:border-${adminMode ? 'amber-600' : 'primary'}/20 focus:bg-white text-slate-700`
                    }
                    ${adminMode ? 'cursor-pointer' : ''}
                    disabled:opacity-75
                `}
            />

            {suffix && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none select-none">
                    {suffix}
                </div>
            )}

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

        {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
    </div>
);

export default FormInput;
