
import { useAuth } from '../useVideoAuth';
import { useTranslation } from 'react-i18next';
import { User, Mail, Shield, CheckCircle2, Edit2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{t('profilePage.title')}</h1>
                    <p className="text-[var(--color-text-muted)] text-sm sm:text-base mt-1">{t('profilePage.subtitle')}</p>
                </div>
                <button
                    onClick={() => navigate('/settings')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-xl hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-secondary)] transition-all font-semibold shadow-sm text-sm active:scale-95 group cursor-pointer"
                >
                    <Edit2 size={16} className="group-hover:text-[var(--color-primary-orange)] transition-colors" />
                    {t('profilePage.editProfile')}
                </button>
            </div>

            <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border-primary)]">
                {/* Banner Section */}
                <div className="h-32 sm:h-40 md:h-48 w-full bg-gradient-to-br from-[var(--color-primary-orange)] via-[var(--color-primary-orange)] to-[var(--color-primary-orange-light)] relative">
                    <div className="absolute inset-0 bg-black/5"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/30 to-transparent"></div>
                </div>

                <div className="px-6 sm:px-8 pb-8">
                    <div className="relative flex flex-col sm:flex-row items-center sm:items-end -mt-12 sm:-mt-16 md:-mt-20 mb-8 gap-6">
                        <div className="relative group">
                            <div className="p-1 bg-[var(--color-bg-primary)] rounded-full shadow-2xl">
                                {user?.profilePicture ? (
                                    <img
                                        src={user.profilePicture}
                                        alt="Profile"
                                        className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-[var(--color-bg-primary)] shadow-inner"
                                    />
                                ) : (
                                    <div className="w-24 h-24  rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center border-4 border-[var(--color-bg-primary)] shadow-inner">
                                        <User size={40} className="text-[var(--color-text-muted)] " />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-green-500 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-4 border-[var(--color-bg-primary)] shadow-[0_0_15px_rgba(34,197,94,0.4)] z-10 group-hover:scale-110 transition-transform duration-300" title={t('common.online')}>
                                <span className="absolute inset-0 rounded-full bg-green-500 animate-pulse opacity-60"></span>
                            </div>
                        </div>

                        <div className="text-center sm:text-left flex-1 min-w-0">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] truncate">
                                {user?.fullName || t('auth.guestUser')}
                            </h2>
                            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-primary-orange)]/10 text-[var(--color-primary-orange)] border border-[var(--color-primary-orange)]/20">
                                    {t('videoCall.user')}
                                </span>
                                <span className="text-[var(--color-text-muted)] text-sm font-medium flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)]/30"></span>
                                    {user?.email}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Contact Information Card */}
                        <div className="p-6 bg-[var(--color-bg-secondary)]/50 rounded-2xl border border-[var(--color-border-primary)] hover:border-[var(--color-primary-orange)]/30 hover:bg-[var(--color-primary-orange)]/5 transition-all duration-300 group shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-2.5 bg-[var(--color-bg-primary)] text-[var(--color-primary-orange)] rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                    <Mail size={20} />
                                </div>
                                <h3 className="font-bold text-[var(--color-text-primary)] text-base">{t('auth.email')}</h3>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[var(--color-text-secondary)] break-all text-sm font-medium leading-relaxed">{user?.email}</p>
                                <div className="flex items-center gap-2 text-green-600 text-xs mt-2 bg-green-500/5 py-1 px-2.5 rounded-full w-fit">
                                    <CheckCircle2 size={14} />
                                    <span className="font-bold uppercase tracking-wider">{t('common.verified')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Security Status Card */}
                        <div className="p-6 bg-[var(--color-bg-secondary)]/50 rounded-2xl border border-[var(--color-border-primary)] hover:border-[var(--color-primary-orange)]/30 hover:bg-[var(--color-primary-orange)]/5 transition-all duration-300 group shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-2.5 bg-[var(--color-bg-primary)] text-[var(--color-primary-orange)] rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                    <Shield size={20} />
                                </div>
                                <h3 className="font-bold text-[var(--color-text-primary)] text-base">{t('auth.twoFactorAuth')}</h3>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[var(--color-text-secondary)] text-sm font-medium leading-relaxed">
                                    {user?.twoFactorEnabled
                                        ? t('auth.accountSecured')
                                        : t('settings.2faDescription')}
                                </p>
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user?.twoFactorEnabled
                                    ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                    : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                                    }`}>
                                    {user?.twoFactorEnabled ? (
                                        <>
                                            <CheckCircle2 size={14} />
                                            {t('auth.2faEnabled')}
                                        </>
                                    ) : (
                                        <>
                                            <Shield size={14} />
                                            {t('auth.2faDisabled')}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Account Details Card */}
                        <div className="p-6 bg-[var(--color-bg-secondary)]/50 rounded-2xl border border-[var(--color-border-primary)] hover:border-[var(--color-primary-orange)]/30 hover:bg-[var(--color-primary-orange)]/5 transition-all duration-300 group shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-2.5 bg-[var(--color-bg-primary)] text-[var(--color-primary-orange)] rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                    <Calendar size={20} />
                                </div>
                                <h3 className="font-bold text-[var(--color-text-primary)] text-base">{t('profilePage.memberSince')}</h3>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[var(--color-text-secondary)] text-sm font-medium leading-relaxed">
                                    {t('profilePage.memberSinceDate', { date: 'Januar 2024' })}
                                </p>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-full text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest">
                                    {t('profilePage.standardPlan')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
