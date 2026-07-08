import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../../../assets/full_logo.png';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

/**
 * Shared auth-page shell (ported from VideoExpert, T7.6c) used by the combined
 * /forgot-password and /reset-password pages.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
    const { t } = useTranslation();
    return (
        <div className="min-h-screen flex w-full bg-[var(--color-bg-secondary)]">
            {/* Left Side - Hero/Brand (hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 bg-dark-900 relative overflow-hidden items-center justify-center">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--color-primary-orange),_transparent_70%)]" />
                <div className="relative z-10 text-center px-12">
                    <img
                        src={logo}
                        alt="My Gutachter"
                        className="w-64 mx-auto mb-8 object-contain drop-shadow-2xl bg-white/90 rounded-2xl p-6"
                    />
                </div>
            </div>

            {/* Right Side - Form content */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-12 xl:p-24 bg-[var(--color-bg-primary)]">
                <div className="w-full max-w-md space-y-8">
                    <div className="lg:hidden flex flex-col items-center mb-8">
                        <img src={logo} alt="My Gutachter" className="w-40 object-contain mb-4" />
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
                        )}
                    </div>

                    <div className="mt-8">{children}</div>
                </div>

                <div className="mt-auto pt-8 text-center text-xs text-[var(--color-text-muted)]">
                    &copy; {new Date().getFullYear()} My Gutachter. {t('common.rightsReserved')}.
                </div>
            </div>
        </div>
    );
};
