import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
    password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
    const { t } = useTranslation();

    const requirements = [
        {
            label: t('auth.passwordRequirements.length'),
            met: password.length >= 8,
        },
        {
            label: t('auth.passwordRequirements.uppercase'),
            met: /[A-Z]/.test(password),
        },
        {
            label: t('auth.passwordRequirements.number'),
            met: /[0-9]/.test(password),
        },
        {
            label: t('auth.passwordRequirements.special'),
            met: /[@#$%^&+=!]/.test(password),
        },
    ];

    return (
        <div className="mt-2 space-y-1.5 bg-[var(--color-bg-secondary)] p-3 rounded-lg border border-[var(--color-border-primary)] animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
                {t('auth.passwordRequirements.title')}
            </p>
            {requirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2">
                    {req.met ? (
                        <div className="flex-shrink-0 w-4 h-4 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                        </div>
                    ) : (
                        <div className="flex-shrink-0 w-4 h-4 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center">
                            <X size={10} strokeWidth={3} />
                        </div>
                    )}
                    <span className={`text-[11px] ${req.met ? 'text-green-600 dark:text-green-400' : 'text-[var(--color-text-muted)]'}`}>
                        {req.label}
                    </span>
                </div>
            ))}
        </div>
    );
};
