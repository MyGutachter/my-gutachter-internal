import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { ShieldCheck, Loader2, X } from 'lucide-react';


// Wait, I don't know if 'Dialog' exists in ui/Dialog. I'll check first.
// If not, I'll build a simple fixed overlay.

interface TwoFactorVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (code: string) => void;
    isLoading?: boolean;
    action?: 'disable' | 'profile' | 'password' | null;
}

const TwoFactorVerificationModal: React.FC<TwoFactorVerificationModalProps> = ({
    isOpen,
    onClose,
    onVerify,
    isLoading = false,
    action
}) => {
    const { t } = useTranslation();
    const [code, setCode] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCode('');
        }
    }, [isOpen]);


    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length === 6) {
            onVerify(code);
            // Optionally clear code or keep it until success
            // setCode(''); 
        }
    };

    const getActionTitle = () => {
        switch (action) {
            case 'disable': return t('settings.disable2fa');
            case 'profile': return t('settings.updateProfile');
            case 'password': return t('settings.changePassword');
            default: return t('auth.verifyIdentity');
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-bg-overlay)] backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative bg-[var(--color-bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 z-10 border border-[var(--color-border-primary)]">
                {/* Decoration */}
                <div className="absolute top-0 right-0 p-16 bg-[var(--color-primary-orange)]/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none"></div>

                <div className="relative flex justify-between items-center p-6 border-b border-[var(--color-border-primary)] bg-gradient-to-br from-[var(--color-bg-secondary)]/50 to-transparent shadow-sm z-20">
                    <h3 className="text-xl font-extrabold text-[var(--color-text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-[var(--color-primary-orange)]/10 rounded-xl text-[var(--color-primary-orange)] shadow-sm">
                            <ShieldCheck size={20} />
                        </div>
                        {t('auth.securityCheck')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all p-2 rounded-xl hover:bg-[var(--color-bg-hover)] active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="relative p-8">
                    <p className="text-[var(--color-text-secondary)] mb-8 text-sm sm:text-base text-center font-medium leading-relaxed">
                        {t('auth.enterVerificationCodeToConfirm', { action: getActionTitle() })}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="flex justify-center">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                placeholder="000 000"
                                className="w-full text-center text-4xl font-black tracking-[0.4em] text-[var(--color-primary-orange)] py-4 border-b-4 border-[var(--color-border-secondary)] focus:border-[var(--color-primary-orange)] focus:outline-none bg-transparent placeholder-[var(--color-border-secondary)]/30 transition-all duration-300"
                                autoFocus
                                disabled={isLoading}
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 py-3 rounded-2xl font-bold border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)] transition-all active:scale-95"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 py-3 rounded-2xl font-bold bg-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange-dark)] shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                                disabled={code.length !== 6 || isLoading}
                            >
                                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : t('common.verify')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TwoFactorVerificationModal;
