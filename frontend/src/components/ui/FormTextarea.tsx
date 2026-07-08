import React from 'react';

interface Props {
    label: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    rows?: number;
    placeholder?: string;
    className?: string;
    adminMode?: boolean;
    onToggleRequired?: () => void;
    required?: boolean;
    name?: string;
    error?: string;
}

const FormTextarea: React.FC<Props> = ({
    label,
    value,
    onChange,
    rows = 3,
    placeholder,
    className = '',
    adminMode,
    onToggleRequired,
    required,
    name,
    error
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
                    <span className="text-[9px] font-bold bg-primary text-white px-2 py-0.5 rounded-full ml-auto">
                        MANDATORY
                    </span>
                )}
            </div>
        </label>
        <div className="relative overflow-hidden rounded-xl">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                placeholder={placeholder}
                disabled={adminMode}
                className={`w-full px-4 py-3 bg-slate-50 border-2 transition-all duration-300 outline-none font-medium resize-y rounded-xl
                    ${adminMode ? 'cursor-pointer' : ''}
                    ${error
                        ? 'border-red-500 focus:border-red-600 text-red-900 bg-red-50/30 ring-2 ring-red-500/10'
                        : 'border-slate-200 focus:border-primary/20 focus:bg-white text-slate-700'
                    }
                `}
            />
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

export default FormTextarea;
