import { Check, ChevronRight, Loader2, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useVideoAuth';
import api from '../../../utils/api';

/**
 * 2FA enrolment (T7.6c) — ported from VideoExpert, rewired to the merged
 * TwoFactorController (/api/2fa/setup|verify). Disabling 2FA requires a code, so
 * the already-enabled state routes to Settings (which collects the code via the
 * verification modal) rather than a code-less disable.
 */
const TwoFactorSetupPage = () => {
    const { t } = useTranslation();
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<'initial' | 'qr' | 'verify' | 'success'>('initial');
    const [secret, setSecret] = useState('');
    const [qrCodeUri, setQrCodeUri] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const startSetup = async () => {
        setLoading(true);
        try {
            const response = await api.post('/2fa/setup');
            setSecret(response.data.secret);
            setQrCodeUri(response.data.qrCodeUri);
            setStep('qr');
        } catch (error) {
            console.error(error);
            toast.error(t('auth.unexpectedError'));
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async () => {
        setLoading(true);
        try {
            await api.post('/2fa/verify', { code });
            setStep('success');
            if (user) {
                login({ ...user, twoFactorEnabled: true });
            }
            toast.success(t('auth.2faEnabled'));
        } catch (error) {
            console.error(error);
            toast.error(t('auth.invalidCode'));
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 'qr', icon: QrCode, title: t('auth.steps.scan') },
        { id: 'verify', icon: Smartphone, title: t('auth.steps.verify') },
        { id: 'success', icon: Check, title: t('auth.steps.done') },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === step);

    if (user?.twoFactorEnabled && step === 'initial') {
        return (
            <div className="max-w-md mx-auto mt-12 px-4">
                <div className="bg-[var(--color-bg-card)] rounded-xl shadow-card border border-[var(--color-border-primary)] p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{t('auth.2faIsEnabled')}</h2>
                    <p className="text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto leading-relaxed text-sm">{t('auth.accountSecured')}</p>
                    <button
                        onClick={() => navigate('/settings')}
                        className="cursor-pointer inline-flex items-center justify-center px-5 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors font-medium text-sm border border-[var(--color-border-primary)]"
                    >
                        {t('settings.title')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
            <div className="bg-[var(--color-bg-card)] rounded-3xl shadow-2xl border border-[var(--color-border-primary)] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-gradient-to-br from-[var(--color-bg-secondary)]/80 to-[var(--color-bg-tertiary)]/50 p-8 sm:p-10 border-b border-[var(--color-border-primary)] text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-16 bg-[var(--color-primary-orange)]/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none"></div>
                    <div className="w-16 h-16 bg-[var(--color-bg-primary)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-[var(--color-border-primary)] relative z-10 group transition-transform hover:scale-110 duration-300">
                        <ShieldCheck className="w-8 h-8 text-[var(--color-primary-orange)]" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-2 relative z-10">{t('auth.twoFactorAuth')}</h2>
                    <p className="text-[var(--color-text-muted)] text-sm mt-2 max-w-sm mx-auto leading-relaxed font-medium relative z-10">{t('auth.secureAccountWith2FA')}</p>
                </div>

                {step !== 'initial' && (
                    <div className="flex items-center justify-center gap-1 sm:gap-4 p-5 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-card)]/50 backdrop-blur-sm">
                        {steps.map((s, idx) => {
                            const isActive = step === s.id;
                            const isCompleted = currentStepIndex > idx || step === 'success';
                            return (
                                <div key={s.id} className="flex items-center">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${isActive ? 'bg-[var(--color-primary-orange)] text-white shadow-lg shadow-orange-500/20 ring-4 ring-orange-500/10' : isCompleted ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border-primary)]'}`}>
                                        <div className="flex items-center justify-center">
                                            {isCompleted ? <Check size={14} strokeWidth={3} /> : <s.icon size={14} />}
                                        </div>
                                        <span className="hidden sm:inline uppercase tracking-widest">{s.title}</span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`w-4 sm:w-8 h-0.5 mx-1 rounded-full transition-colors duration-500 ${isCompleted ? 'bg-green-500/30' : 'bg-[var(--color-border-primary)]'}`}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="p-8 sm:p-10">
                    {step === 'initial' && (
                        <div className="space-y-8">
                            <div className="space-y-4 text-left p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 shadow-inner">
                                <h3 className="font-bold text-indigo-600 flex items-center gap-2 text-sm uppercase tracking-widest">
                                    <Smartphone size={18} />
                                    {t('auth.steps.howItWorks')}
                                </h3>
                                <ol className="space-y-3">
                                    {[t('auth.steps.installApp'), t('auth.steps.scanQr'), t('auth.steps.enterCode')].map((text, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-indigo-900/70 font-medium">
                                            <span className="flex-shrink-0 w-5 h-5 bg-indigo-500/10 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 border border-indigo-500/20">{i + 1}</span>
                                            {text}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <button
                                onClick={startSetup}
                                disabled={loading}
                                className="cursor-pointer w-full py-4 bg-[var(--color-primary-orange)] text-white font-extrabold text-lg rounded-2xl hover:bg-[var(--color-primary-orange-dark)] transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 active:scale-[0.98] group"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                    <>
                                        {t('auth.enable2FA')}
                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {step === 'qr' && (
                        <div className="flex flex-col items-center animate-in slide-in-from-right-8 duration-500">
                            <p className="text-[var(--color-text-secondary)] text-sm mb-8 text-center font-semibold leading-relaxed">{t('auth.scanQrCode')}</p>
                            <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-[var(--color-primary-orange)]/10 mb-8 relative group">
                                <div className="absolute -inset-2 bg-gradient-to-r from-[var(--color-primary-orange)] to-[var(--color-primary-orange-light)] rounded-[2.5rem] opacity-20 blur-xl group-hover:opacity-40 transition-opacity"></div>
                                <div className="relative z-10 bg-white p-2 rounded-2xl overflow-hidden">
                                    <img src={qrCodeUri} alt="QR Code" className="w-48 h-48 sm:w-56 sm:h-56 mix-blend-multiply" />
                                </div>
                            </div>
                            <div className="w-full bg-[var(--color-bg-secondary)] p-4 rounded-2xl border border-[var(--color-border-primary)] mb-8 text-center shadow-inner group cursor-pointer hover:border-[var(--color-primary-orange)]/30 transition-all" onClick={() => { navigator.clipboard.writeText(secret); toast.success(t('common.copied')); }}>
                                <p className="text-[10px] text-[var(--color-text-muted)] mb-2 uppercase tracking-[0.2em] font-bold">{t('auth.manualEntryCode')}</p>
                                <div className="flex items-center justify-center gap-3">
                                    <p className="font-mono text-sm sm:text-base text-[var(--color-text-primary)] font-extrabold tracking-[0.1em]">{secret}</p>
                                </div>
                            </div>
                            <button onClick={() => setStep('verify')} className="cursor-pointer w-full py-3.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-2xl hover:bg-[var(--color-bg-hover)] transition-all shadow-lg font-bold text-base border border-[var(--color-border-primary)] active:scale-[0.98]">
                                {t('common.next')}
                            </button>
                        </div>
                    )}

                    {step === 'verify' && (
                        <div className="animate-in slide-in-from-right-8 duration-500">
                            <p className="text-[var(--color-text-secondary)] text-center mb-8 text-sm sm:text-base font-medium leading-relaxed">{t('auth.enterVerificationCode')}</p>
                            <div className="mb-10">
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    placeholder="000 000"
                                    className="w-full text-center text-4xl sm:text-5xl font-black tracking-[0.4em] text-[var(--color-primary-orange)] py-6 border-b-4 border-[var(--color-border-secondary)] focus:border-[var(--color-primary-orange)] focus:outline-none bg-transparent placeholder-[var(--color-border-secondary)]/30 transition-all duration-300"
                                    autoFocus
                                />
                            </div>
                            <button onClick={verifyCode} disabled={loading || code.length !== 6} className="cursor-pointer w-full py-4 bg-[var(--color-primary-orange)] text-white font-extrabold rounded-2xl hover:bg-[var(--color-primary-orange-dark)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-orange-500/20 flex justify-center items-center text-base active:scale-[0.98]">
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : t('auth.verifyAndEnable')}
                            </button>
                            <button onClick={() => setStep('qr')} className="cursor-pointer w-full mt-6 text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] text-sm font-bold transition-colors uppercase tracking-widest">
                                {t('common.back')}
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-green-500/10">
                                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                                    <Check className="w-10 h-10 text-white" strokeWidth={4} />
                                </div>
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] mb-3 tracking-tight">{t('auth.2faEnabledExcl')}</h3>
                            <p className="text-[var(--color-text-muted)] mb-10 text-sm sm:text-base font-medium leading-relaxed max-w-xs mx-auto">{t('auth.accountMoreSecure')}</p>
                            <button onClick={() => navigate('/settings')} className="cursor-pointer w-full py-4 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-2xl hover:bg-[var(--color-bg-hover)] transition-all font-bold shadow-lg text-base border border-[var(--color-border-primary)] active:scale-[0.98]">
                                {t('common.done')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TwoFactorSetupPage;
