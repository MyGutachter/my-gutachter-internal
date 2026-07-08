import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import CarInspectionLoader from '../CarInspectionLoader';
import api from '../../../utils/api';

/**
 * Shared "reset password" page (ported from VideoExpert, T7.6c). Reached via
 * the emailed link (/reset-password?token=...) and hits the merged backend
 * PublicAuthController POST /api/auth/reset-password.
 */
export const ResetPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            toast.error(t('auth.invalidResetToken', { defaultValue: 'Invalid or missing reset token' }));
            return;
        }

        const isPasswordStrong =
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[@#$%^&+=!]/.test(password);

        if (!isPasswordStrong) {
            setError(t('auth.passwordRequirements.title'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('auth.passwordsDoNotMatch'));
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            toast.success(t('auth.resetPasswordSuccess'));
            navigate('/login');
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || t('common.error');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <AuthLayout title={t('auth.invalidRequest', { defaultValue: 'Invalid Request' })}>
                <div className="text-center">
                    <p className="text-[var(--color-text-muted)] mb-6">
                        {t('auth.resetLinkExpired', { defaultValue: 'The reset link is invalid or has expired.' })}
                    </p>
                    <Button onClick={() => navigate('/login')} fullWidth>
                        {t('auth.backToLogin')}
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={t('auth.setNewPassword')} subtitle={t('auth.updatePassword')}>
            {loading && (
                <div className="fixed inset-0 z-50 bg-[var(--color-bg-primary)]/80 backdrop-blur-sm flex items-center justify-center">
                    <CarInspectionLoader text={t('common.save')} size="sm" />
                </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative text-sm" role="alert">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Input
                        label={t('auth.password')}
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {password && <PasswordStrengthIndicator password={password} />}
                </div>

                <Input
                    label={t('auth.confirmPassword')}
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <Button type="submit" fullWidth disabled={loading}>
                    {loading ? t('common.save') : t('auth.resetPassword')}
                </Button>
            </form>
        </AuthLayout>
    );
};

export default ResetPasswordPage;
