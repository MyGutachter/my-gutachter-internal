import React from 'react';

interface Props {
    label: React.ReactNode;
    checked: boolean;
    onChange: (val: boolean) => void;
    className?: string;
    adminMode?: boolean;
    onToggleRequired?: () => void;
    required?: boolean;
    name?: string;
    error?: boolean;
}

const FormCheckbox: React.FC<Props> = ({ label, checked, onChange, className = '', adminMode, onToggleRequired, required, name, error }) => (
    <label
        className={`flex items-center gap-2 cursor-pointer py-1 group ${className} ${adminMode ? 'cursor-pointer' : ''}`}
        onClick={adminMode ? onToggleRequired : undefined}
        data-fieldname={name}
    >
        <div className="relative flex items-center">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={adminMode}
                className={`w-4 h-4 rounded text-primary focus:ring-primary transition-all
                    ${adminMode ? 'cursor-pointer pointer-events-none' : ''}
                    ${error ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-300'}
                `}
            />
            {adminMode && (
                <div className={`absolute -inset-1 border-2 rounded transition-colors pointer-events-none ${required ? 'border-primary border-2 ring-2 ring-primary/20' : 'border-transparent'}`} />
            )}
        </div>
        <span className={`text-xs transition-colors font-medium 
            ${adminMode && required ? 'text-black font-bold' : (required && !adminMode ? 'text-black font-black uppercase tracking-[0.05em]' : 'text-slate-600')}
            ${error ? 'text-red-500 font-bold' : ''}
        `}>
            {label}
            {required && !adminMode && <span className="text-red-500 ml-1 font-bold">*</span>}
        </span>
    </label>
);

export default FormCheckbox;
