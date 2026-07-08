import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import CarInspectionLoader from '../CarInspectionLoader';
import api from '../../../utils/api';

/**
 * Shared "forgot password" page (ported from VideoExpert, T7.6c). Hits the
 * merged backend PublicAuthController POST /api/auth/forgot-password.
 */
export const ForgotPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
            toast.success(t('auth.resetEmailSent'));
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t('auth.resetPassword')} subtitle={t('auth.resetSubtitle')}>
            {loading && (
                <div className="fixed inset-0 z-50 bg-[var(--color-bg-primary)]/80 backdrop-blur-sm flex items-center justify-center">
                    <CarInspectionLoader text={t('common.sending')} size="sm" />
                </div>
            )}

            {submitted ? (
                <div className="text-center space-y-6">
                    <div className="bg-green-500/10 text-green-600 p-4 rounded-lg border border-green-500/20">
                        {t('auth.resetEmailSent')}
                    </div>
                    <Link to="/login">
                        <Button variant="outline" fullWidth className="mt-4">
                            {t('auth.backToLogin')}
                        </Button>
                    </Link>
                </div>
            ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <Input
                        label={t('auth.email')}
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                    />

                    <Button type="submit" fullWidth disabled={loading}>
                        {loading ? t('common.sending') : t('auth.sendResetLink')}
                    </Button>

                    <div className="text-sm text-center text-[var(--color-text-secondary)]">
                        {t('auth.rememberPassword')}{' '}
                        <Link
                            to="/login"
                            className="font-medium text-[var(--color-primary-orange)] hover:text-[var(--color-primary-orange-dark)] transition-colors"
                        >
                            {t('auth.signIn')}
                        </Link>
                    </div>
                </form>
            )}
        </AuthLayout>
    );
};

export default ForgotPasswordPage;
