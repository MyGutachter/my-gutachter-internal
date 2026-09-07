import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
    label: React.ReactNode;
    checked: boolean;
    onChange: (val: boolean) => void;
    className?: string;
    adminMode?: boolean;
    onToggleRequired?: () => void;
    onToggleHidden?: () => void;
    required?: boolean;
    hidden?: boolean;
    name?: string;
    error?: boolean;
}

const FormCheckbox: React.FC<Props> = ({ label, checked, onChange, className = '', adminMode, onToggleRequired, onToggleHidden, required, hidden, name, error }) => {
    if (!adminMode && hidden) return null;

    return (
        <div
            className={`flex items-center gap-2 py-1 group ${className} ${adminMode && hidden ? 'opacity-65' : ''}`}
            data-fieldname={name}
        >
            <label className="flex items-center gap-2 cursor-pointer">
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
                        <div className={`absolute -inset-1 border-2 rounded transition-colors pointer-events-none ${required && !hidden ? 'border-amber-600/40 border-2 ring-2 ring-amber-600/10' : 'border-transparent'}`} />
                    )}
                </div>
                <span className={`text-xs transition-colors font-medium 
                    ${adminMode && required ? 'text-black font-bold' : (required && !adminMode ? 'text-black font-black uppercase tracking-[0.05em]' : 'text-slate-600')}
                    ${adminMode && hidden ? 'line-through text-slate-500' : ''}
                    ${error ? 'text-red-500 font-bold' : ''}
                `}>
                    {label}
                    {required && !adminMode && <span className="text-red-500 ml-1 font-bold">*</span>}
                </span>
            </label>

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
    );
};

export default FormCheckbox;
