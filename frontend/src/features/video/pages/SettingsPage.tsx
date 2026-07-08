import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../useVideoAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Shield, Upload, Camera, ChevronRight, KeyRound, Key, Trash2, Copy, Code } from 'lucide-react';
import type { ApiKey } from '../services/apiKeyService';
import { getMyApiKeys, generateApiKey, revokeApiKey } from '../services/apiKeyService';
import { updateProfile, changePassword, disableTwoFactor } from '../services/userService';
import TwoFactorVerificationModal from '../components/TwoFactorVerificationModal';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
    const { t } = useTranslation();
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'developer'>('profile');

    // Profile State
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [profilePicture, setProfilePicture] = useState<string>('');
    const [previewUrl, setPreviewUrl] = useState(user?.profilePicture || '');
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    // 2FA Verification State
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'profile' | 'password' | 'disable' | null>(null);
    const [verifying, setVerifying] = useState(false);

    // API Keys State
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<ApiKey | null>(null);
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
            setPreviewUrl(user.profilePicture || '');
        }
        if (activeTab === 'developer' && user) {
            fetchApiKeys();
        }
    }, [user, activeTab]);

    const fetchApiKeys = async () => {
        if (!user) return;
        try {
            const keys = await getMyApiKeys();
            setApiKeys(keys.filter(k => k.active));
        } catch (error) {
            console.error("Failed to fetch API keys", error);
        }
    };

    useEffect(() => {
        // Create cleanup for object URLs
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        }
    }, [previewUrl]);

    const executeProfileUpdate = async (code?: string) => {
        setLoadingProfile(true);
        try {
            await updateProfile(fullName, profilePicture, code);

            if (user) {
                // Keep current preview for UX.
                const newPicUrl = profilePicture || user.profilePicture;
                login({ ...user, fullName, profilePicture: newPicUrl });
            }

            toast.success(t('settings.successProfileUpdate'));
            setShow2FAModal(false);
            setPendingAction(null);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoadingProfile(false);
            setVerifying(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user?.twoFactorEnabled) {
            setPendingAction('profile');
            setShow2FAModal(true);
        } else {
            executeProfileUpdate();
        }
    };

    const executePasswordChange = async (code?: string) => {
        setLoadingPassword(true);
        try {
            await changePassword(currentPassword, newPassword, code);
            toast.success(t('settings.successPasswordChange'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShow2FAModal(false);
            setPendingAction(null);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || t('common.error');
            toast.error(msg);
        } finally {
            setLoadingPassword(false);
            setVerifying(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        const isPasswordStrong = newPassword.length >= 8 &&
            /[A-Z]/.test(newPassword) &&
            /[0-9]/.test(newPassword) &&
            /[@#$%^&+=!]/.test(newPassword);

        if (!isPasswordStrong) {
            toast.error(t('auth.passwordRequirements.title'));
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error(t('auth.passwordsDoNotMatch'));
            return;
        }

        if (user?.twoFactorEnabled) {
            setPendingAction('password');
            setShow2FAModal(true);
        } else {
            executePasswordChange();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setProfilePicture(dataUrl);
                setPreviewUrl(dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const TabButton = ({ id, icon: Icon, label }: { id: 'profile' | 'security' | 'developer', icon: any, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 transition-all duration-300 group cursor-pointer ${activeTab === id
                ? 'text-[var(--color-primary-orange)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
        >
            <Icon size={18} className={`flex-shrink-0 sm:w-5 sm:h-5 ${activeTab === id ? 'text-[var(--color-primary-orange)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors'}`} />
            <span className={`font-bold text-[9px] sm:text-xs md:text-sm uppercase tracking-widest whitespace-nowrap ${activeTab === id ? 'block' : 'hidden sm:block'}`}>
                {label}
            </span>
            {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-primary-orange)] rounded-t-full shadow-[0_-2px_10px_rgba(255,107,0,0.3)] animate-in slide-in-from-bottom-1 duration-300"></div>
            )}
        </button>
    );

    const handle2FAVerify = async (code: string) => {
        setVerifying(true);
        if (pendingAction === 'profile') {
            await executeProfileUpdate(code);
        } else if (pendingAction === 'password') {
            await executePasswordChange(code);
        } else if (pendingAction === 'disable') {
            try {
                await disableTwoFactor(code);
                if (user) {
                    login({ ...user, twoFactorEnabled: false });
                }
                toast.success(t('auth.2faDisabled'));
                setShow2FAModal(false);
                setPendingAction(null);
            } catch (error) {
                console.error(error);
                toast.error(t('auth.invalidCode'));
            } finally {
                setVerifying(false);
            }
        }
    };

    const handleToggle2FA = () => {
        if (user?.twoFactorEnabled) {
            setPendingAction('disable');
            setShow2FAModal(true);
        } else {
            navigate('/video/2fa-setup');
        }
    };

    const handleGenerateKey = async () => {
        if (!user?.twoFactorEnabled) {
            toast.error(t('auth.enable2faFirst') || "Please enable 2FA first to generate API keys associated with high security operations.");
            navigate('/video/2fa-setup');
            return;
        }

        try {
            const key = await generateApiKey(newKeyName || t('settings.defaultKeyName'));
            setGeneratedKey(key);
            setIsKeyModalOpen(true);
            setNewKeyName('');
            fetchApiKeys();
        } catch (error: any) {
            toast.error(error.response?.data?.error || t('settings.generateFailed'));
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!window.confirm(t('settings.revokeConfirm'))) return;
        try {
            await revokeApiKey(id);
            toast.success(t('settings.revokeSuccess'));
            fetchApiKeys();
        } catch (error) {
            toast.error(t('settings.revokeFailed'));
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-3 py-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 border-b border-[var(--color-border-primary)] pb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                {/* Left Side Title */}
                <div className="text-center xl:text-left">
                    <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight mb-1">{t('settings.title')}</h1>
                    <p className="text-[var(--color-text-muted)] text-xs sm:text-sm font-medium">{t('settings.subtitle')}</p>
                </div>

                {/* Center Tabs Navigation */}
                <div className="flex justify-center xl:flex-1 w-full xl:w-auto mt-4 xl:mt-0">
                    <div className="flex items-center bg-[var(--color-bg-card)] p-1 rounded-2xl border border-[var(--color-border-primary)] shadow-lg backdrop-blur-md overflow-hidden max-w-full">
                        <TabButton id="profile" icon={User} label={t('settings.profile')} />
                        <TabButton id="security" icon={Shield} label={t('settings.security')} />
                        <TabButton id="developer" icon={Code} label={t('settings.developer')} />
                    </div>
                </div>

                {/* Right Spacer for balance on desktop */}
                <div className="hidden xl:block xl:w-[200px]"></div>
            </div>

            {/* Centered Content Area */}
            <div className="max-w-4xl mx-auto min-w-0 w-full space-y-8">
                {activeTab === 'profile' && (
                    <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-card border border-[var(--color-border-primary)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-5 sm:p-8 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[var(--color-primary-orange)]/10 rounded-xl text-[var(--color-primary-orange)] shadow-sm">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('settings.profile')}</h2>
                                    <p className="text-sm text-[var(--color-text-muted)]">{t('settings.updatePublicInfo')}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="p-5 sm:p-8 space-y-6 sm:space-y-8">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                                    {t('settings.profilePicture')}
                                </label>
                                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--color-bg-secondary)] shadow-2xl bg-[var(--color-bg-secondary)] ring-1 ring-[var(--color-border-primary)]">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]">
                                                    <User size={48} />
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full cursor-pointer backdrop-blur-[2px]">
                                            <div className="flex flex-col items-center gap-1">
                                                <Camera size={24} />
                                                <span className="text-[10px] font-bold uppercase">{t('common.edit')}</span>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                    </div>

                                    <div className="flex-1 w-full space-y-4">
                                        <div className="p-4 sm:p-5 bg-[var(--color-bg-secondary)]/50 rounded-2xl border border-[var(--color-border-primary)] shadow-inner">
                                            <Input
                                                label={t('settings.url')}
                                                value={profilePicture.startsWith('data:') ? '' : profilePicture}
                                                onChange={(e) => {
                                                    setProfilePicture(e.target.value);
                                                    setPreviewUrl(e.target.value);
                                                }}
                                                placeholder="https://example.com/avatar.jpg"
                                                disabled={profilePicture.startsWith('data:')}
                                                className="bg-[var(--color-bg-primary)]"
                                            />
                                            <div className="my-3 sm:my-4 flex items-center gap-4">
                                                <div className="h-px flex-1 bg-[var(--color-border-primary)]"></div>
                                                <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">{t('settings.or')}</span>
                                                <div className="h-px flex-1 bg-[var(--color-border-primary)]"></div>
                                            </div>
                                            <div className="text-center">
                                                <label className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-xl hover:border-[var(--color-primary-orange)]/50 hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer shadow-sm text-sm font-bold active:scale-95 group">
                                                    <Upload size={18} className="text-[var(--color-primary-orange)] group-hover:scale-110 transition-transform" />
                                                    {t('settings.chooseFile')}
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label={t('settings.fullName')}
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="John Doe"
                                    className="bg-[var(--color-bg-secondary)]/30"
                                />
                            </div>

                            <div className="flex justify-end pt-6 border-t border-[var(--color-border-primary)]">
                                <Button type="submit" disabled={loadingProfile} className="px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/10 transition-all hover:shadow-orange-500/20 active:scale-95 cursor-pointer">
                                    {loadingProfile ? t('settings.saving') : t('common.save')}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Password Change */}
                        <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-card border border-[var(--color-border-primary)] overflow-hidden">
                            <div className="p-5 sm:p-8 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 shadow-sm">
                                        <KeyRound size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('settings.changePassword')}</h2>
                                        <p className="text-sm text-[var(--color-text-muted)]">{t('settings.ensureStrongPassword')}</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handlePasswordChange} className="p-5 sm:p-8 space-y-6">
                                <div className="max-w-2xl space-y-6">
                                    <Input
                                        label={t('settings.currentPassword')}
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        className="bg-[var(--color-bg-secondary)]/30"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Input
                                                label={t('settings.newPassword')}
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                            />
                                            {newPassword && <PasswordStrengthIndicator password={newPassword} />}
                                        </div>
                                        <Input
                                            label={t('settings.confirmPassword')}
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="bg-[var(--color-bg-secondary)]/30"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-6 border-t border-[var(--color-border-primary)]">
                                    <Button type="submit" disabled={loadingPassword} className="px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/10 active:scale-95 cursor-pointer">
                                        {t('common.save')}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* 2FA Section */}
                        <div className="bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] rounded-2xl shadow-card border border-[var(--color-border-primary)] p-6 sm:p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-32 bg-[var(--color-primary-orange)]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-[var(--color-primary-orange)]/10 transition-colors duration-500"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
                                    <div className="p-3 bg-[var(--color-bg-primary)] rounded-xl text-[var(--color-primary-orange)] shadow-md border border-[var(--color-border-primary)] flex-shrink-0">
                                        <Shield size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold mb-1">{t('settings.2fa')}</h2>
                                        <p className="text-[var(--color-text-secondary)] text-sm max-w-md leading-relaxed">
                                            {user?.twoFactorEnabled
                                                ? t('auth.accountMoreSecure')
                                                : t('settings.2faDescription')}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full animate-pulse ${user?.twoFactorEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                                                {user?.twoFactorEnabled ? t('common.active') : t('common.inactive')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleToggle2FA}
                                    variant="outline"
                                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer ${user?.twoFactorEnabled
                                        ? "border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm"
                                        : "bg-[var(--color-primary-orange)] border-transparent text-white hover:bg-[var(--color-primary-orange-dark)] shadow-lg shadow-orange-500/20"}`}
                                >
                                    {user?.twoFactorEnabled ? t('settings.disable2fa') : t('settings.enable2fa')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'developer' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* API Keys Section */}
                        <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-card border border-[var(--color-border-primary)] overflow-hidden">
                            <div className="p-5 sm:p-8 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500 shadow-sm">
                                        <Key size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('settings.apiKeys')}</h2>
                                        <p className="text-sm text-[var(--color-text-muted)]">{t('settings.manageApiKeys')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 sm:p-8 space-y-8">
                                <div className="flex flex-col sm:flex-row items-end gap-4 bg-[var(--color-bg-secondary)]/30 p-5 rounded-2xl border border-[var(--color-border-primary)] shadow-inner">
                                    <div className="flex-1 w-full">
                                        <Input
                                            label={t('settings.apiKeyName')}
                                            placeholder={t('settings.keyNamePlaceholder')}
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                            className="bg-[var(--color-bg-primary)]"
                                        />
                                    </div>
                                    <Button onClick={handleGenerateKey} className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold shadow-lg shadow-indigo-500/10 active:scale-95 whitespace-nowrap cursor-pointer">
                                        {t('settings.generateKey')}
                                    </Button>
                                </div>

                                {apiKeys.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {apiKeys.map((key) => (
                                            <div key={key.id} className="group flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-5 bg-[var(--color-bg-secondary)]/50 rounded-2xl border border-[var(--color-border-primary)] hover:border-[var(--color-primary-orange)]/30 transition-all duration-300 hover:shadow-md gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-[var(--color-text-primary)] text-base truncate pr-4">{key.name}</p>
                                                    <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">
                                                        {t('settings.created')}: {new Date(key.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 w-full lg:w-auto">
                                                    <code className="hidden sm:block text-[10px] sm:text-xs font-mono bg-[var(--color-bg-primary)] px-3 py-1.5 rounded-lg border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] flex-1 lg:flex-none text-center sm:text-left">
                                                        {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                                                    </code>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            className="flex-1 lg:flex-none p-2.5 bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] rounded-xl border border-[var(--color-border-primary)] hover:border-[var(--color-primary-orange)]/30 transition-all shadow-sm active:scale-90 cursor-pointer"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(key.key);
                                                                toast.success(t('common.copied'));
                                                            }}
                                                            title={t('common.copy')}
                                                        >
                                                            <div className="flex items-center justify-center gap-2 sm:block">
                                                                <Copy size={18} />
                                                                <span className="sm:hidden text-xs font-bold uppercase">{t('common.copy')}</span>
                                                            </div>
                                                        </button>
                                                        <button
                                                            className="flex-1 lg:flex-none p-2.5 bg-[var(--color-bg-primary)] text-red-500/70 hover:text-red-500 rounded-xl border border-[var(--color-border-primary)] hover:border-red-500/30 transition-all shadow-sm active:scale-90 cursor-pointer"
                                                            onClick={() => handleRevokeKey(key.id)}
                                                            title={t('common.delete')}
                                                        >
                                                            <div className="flex items-center justify-center gap-2 sm:block">
                                                                <Trash2 size={18} />
                                                                <span className="sm:hidden text-xs font-bold uppercase">{t('common.delete')}</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 px-6 bg-[var(--color-bg-secondary)]/30 rounded-2xl border-2 border-dashed border-[var(--color-border-primary)]">
                                        <div className="w-16 h-16 bg-[var(--color-bg-primary)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-text-muted)] shadow-inner">
                                            <Key size={32} />
                                        </div>
                                        <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">{t('settings.noApiKeys') || "No active API keys found."}</h3>
                                        <p className="text-sm text-[var(--color-text-muted)] max-w-xs mx-auto leading-relaxed">{t('settings.apiKeysDescription') || "Generate API keys to integrate with your own tools and automate your workflow."}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Generated Key Modal */}
            {isKeyModalOpen && generatedKey && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 p-4">
                    <div className="bg-[var(--color-bg-card)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-[var(--color-border-primary)]">
                        <div className="p-6 sm:p-10 bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)]">
                            <div className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center mb-8 text-green-500 shadow-sm border border-green-500/20">
                                <Key size={40} />
                            </div>
                            <h3 className="text-2xl font-extrabold text-[var(--color-text-primary)] mb-3 tracking-tight">{t('settings.apiKeyGenerated')}</h3>
                            <p className="text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed font-medium">
                                {t('settings.copyApiKeyWarning')}
                            </p>

                            <div className="bg-[var(--color-bg-primary)] p-5 rounded-2xl border-2 border-[var(--color-primary-orange)]/20 flex items-center justify-between mb-10 group transition-all hover:border-[var(--color-primary-orange)]/40 shadow-inner">
                                <code className="text-sm text-[var(--color-text-primary)] font-mono break-all font-bold pr-4">{generatedKey.key}</code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedKey.key);
                                        toast.success(t('common.copied'));
                                    }}
                                    className="p-3.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] rounded-xl transition-all text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] shadow-sm active:scale-90 flex-shrink-0"
                                >
                                    <Copy size={24} />
                                </button>
                            </div>

                            <Button onClick={() => setIsKeyModalOpen(false)} className="w-full py-4 rounded-xl font-bold shadow-xl shadow-orange-500/10 active:scale-95 text-lg">
                                {t('common.done')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <TwoFactorVerificationModal
                isOpen={show2FAModal}
                onClose={() => { setShow2FAModal(false); setPendingAction(null); }}
                onVerify={handle2FAVerify}
                isLoading={verifying}
                action={pendingAction}
            />
        </div>
    );
};

export default SettingsPage;
