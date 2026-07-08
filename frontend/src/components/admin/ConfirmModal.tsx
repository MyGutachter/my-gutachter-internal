import React from 'react';
import ModalWrapper from '../ui/ModalWrapper';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: 'danger' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    type = 'info',
    confirmLabel = 'Bestätigen',
    cancelLabel = 'Abbrechen'
}) => {
    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {type === 'danger' ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                    </div>
                    <div>
                        <p className="text-slate-600 font-medium leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2.5 text-white rounded-xl text-sm font-black shadow-lg transition-all uppercase tracking-widest ${
                            type === 'danger' 
                                ? 'bg-red-600 shadow-red-200 hover:bg-red-700' 
                                : 'bg-amber-600 shadow-amber-200 hover:bg-amber-700'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default ConfirmModal;
