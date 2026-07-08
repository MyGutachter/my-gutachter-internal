import React, { useState, useEffect } from 'react';
import ModalWrapper from '../ui/ModalWrapper';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';

interface Field {
    id: string;
    label: string;
    placeholder?: string;
    type?: string;
    fieldType?: 'input' | 'select';
    options?: { value: string; label: string }[];
    defaultValue?: string;
}

interface AdminInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (values: Record<string, string>) => void;
    title: string;
    fields: Field[];
}

const AdminInputModal: React.FC<AdminInputModalProps> = ({ isOpen, onClose, onConfirm, title, fields }) => {
    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            const initial: Record<string, string> = {};
            fields.forEach(f => {
                initial[f.id] = f.defaultValue || '';
            });
            setValues(initial);
        }
    }, [isOpen, fields]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(values);
        onClose();
    };

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {fields.map(field => (
                        field.fieldType === 'select' ? (
                            <FormSelect
                                key={field.id}
                                label={field.label}
                                options={field.options || []}
                                value={values[field.id] || ''}
                                onChange={v => setValues(prev => ({ ...prev, [field.id]: v }))}
                            />
                        ) : (
                            <FormInput
                                key={field.id}
                                label={field.label}
                                placeholder={field.placeholder}
                                type={field.type || 'text'}
                                value={values[field.id] || ''}
                                onChange={v => setValues(prev => ({ ...prev, [field.id]: v }))}
                                autoFocus={fields[0]?.id === field.id}
                            />
                        )
                    ))}
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-black shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all uppercase tracking-widest"
                    >
                        Bestätigen
                    </button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default AdminInputModal;
