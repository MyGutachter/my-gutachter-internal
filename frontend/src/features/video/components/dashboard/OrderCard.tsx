import { Calendar, Clock, Copy, Mail, Smartphone, User, Video, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { useNavigate } from 'react-router-dom';
import orderLogo from '../../assets/logo.png';
import { sendMeetingInvite } from '../../services/orderService';
import type { Order } from '../../types';

/**
 * Video Expert order card (T7.8) — faithful port. Rewired: invite via the merged
 * `sendMeetingInvite` (POST /api/meeting/invite), call routes to `/video/call`,
 * details to `/video/meeting-summary/:id`, guest link to `/guest-video`.
 */
interface OrderCardProps {
    order: Order;
}

const OrderCard = ({ order }: OrderCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mobile, setMobile] = useState('+49');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendSms, setSendSms] = useState(true);

    useEffect(() => {
        if (isModalOpen) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            setDate(`${year}-${month}-${day}`);
            setTime(`${hours}:${minutes}`);
        }
    }, [isModalOpen]);

    const handleVideoClick = () => {
        const newRoomId = order.id; // Use Order ID (caseNumber) as Meeting ID
        setRoomId(newRoomId);
        setMobile(order.contactPersonMobile || '');
        setEmail(order.contactPersonEmail || '');
        setName(order.contactPersonName || '');
        setError('');
        setCopySuccess(false);
        setIsModalOpen(true);
        setSendEmail(true);
        setSendSms(true);
    };

    const publicLink = `${window.location.origin}/guest-video?roomId=${roomId}&role=guest`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(publicLink).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleStartMeeting = async () => {
        if (sendEmail && !email) {
            setError(t('validation.emailRequired', { defaultValue: 'Email is required to send invite' }));
            return;
        }
        if (sendSms && (!mobile || mobile === '+49')) {
            setError(t('validation.mobileRequired', { defaultValue: 'Mobile number is required to send invite' }));
            return;
        }

        setIsSending(true);
        try {
            const meetingLink = `${window.location.origin}/guest-video?roomId=${roomId}&role=guest`;

            if (sendEmail || sendSms) {
                let formattedDate = date;
                if (date) {
                    const [y, m, d] = date.split('-');
                    formattedDate = `${d}.${m}.${y}`;
                }

                const formattedTime = time;

                await sendMeetingInvite(
                    sendEmail ? email : '',
                    sendSms ? mobile : '',
                    meetingLink,
                    name,
                    formattedDate,
                    formattedTime
                );
            }
        } catch (err) {
            console.error('Failed to send invite', err);
        } finally {
            setIsSending(false);
        }

        const params = new URLSearchParams();
        params.set('roomId', roomId);
        if (name) params.set('pName', name);
        if (email) params.set('pEmail', email);
        if (mobile) params.set('pMobile', mobile);

        navigate(`/video/call?${params.toString()}`);
    };

    return (
        <div className="bg-[var(--color-bg-card)] h-full rounded-xl border border-[var(--color-border-primary)] flex flex-col shadow-card relative overflow-hidden transition-all duration-300 hover:shadow-lg group">

            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-primary-orange)] to-[var(--color-primary-orange-light)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center space-x-2">
                    <span className="text-[var(--color-primary-orange)] font-black text-sm">#</span>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest leading-none mb-0.5">{t('order.number', { defaultValue: 'Order No.' })}</span>
                        <span className="font-bold text-xs text-[var(--color-text-primary)] tracking-tight">{order.dispatchOrOrderNo || 'N/A'}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {order.source && (
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wider ${order.source === 'OMT' ? 'bg-blue-100/50 text-blue-600 border-blue-200/50' :
                            order.source === 'OMT-DEV' ? 'bg-purple-100/50 text-purple-600 border-purple-200/50' :
                                'bg-gray-100/50 text-gray-600 border-gray-200/50'
                            }`}>
                            {order.source}
                        </span>
                    )}
                    <span className="px-2 py-0.5 bg-green-100/50 text-green-600 text-[9px] font-bold rounded-full border border-green-200/50 uppercase tracking-wider">{order.status ? t(`common.${order.status.toLowerCase()}`, { defaultValue: order.status }) : t('common.active', { defaultValue: 'Active' })}</span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-secondary)]/50 p-4 relative overflow-hidden">
                <div className="absolute w-48 h-48 bg-[var(--color-primary-orange)]/5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl transform scale-0 group-hover:scale-150"></div>
                <div className="flex flex-col items-center relative z-10 transform transition-transform duration-500 group-hover:scale-105">
                    <img src={orderLogo} alt="ADI Order Logo" className="w-48 h-auto object-contain" />
                </div>
            </div>

            <div className="p-3 bg-[var(--color-bg-card)] border-t border-[var(--color-border-subtle)] flex justify-between items-center">
                <button
                    onClick={() => navigate(`/video/meeting-summary/${order.id}`)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center cursor-pointer"
                >
                    {t('order.viewDetails', { defaultValue: 'View Details' })}
                </button>
                <Video onClick={handleVideoClick} className="cursor-pointer w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-orange)] transition-colors" />
            </div>

            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="min-h-full flex items-center justify-center p-2 sm:p-8">
                        <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-2xl w-full max-w-md animate-scale-up border border-[var(--color-border-primary)] relative flex flex-col">
                            <div className="bg-gradient-to-r from-[var(--color-primary-orange)] to-[var(--color-primary-orange-light)] p-4 sm:p-5 relative rounded-t-2xl">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/30 rounded-full p-1 cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">{t('meeting.setupTitle', { defaultValue: 'Meeting einrichten' })}</h3>
                                <p className="text-orange-50 text-sm font-medium opacity-90">{t('meeting.setupSubtitle', { defaultValue: 'Link teilen & Teilnehmer benachrichtigen' })}</p>
                            </div>

                            <div className="p-4 sm:p-6 space-y-5 overflow-visible">
                                <div className="bg-[var(--color-bg-secondary)] p-3 rounded-xl border border-[var(--color-border-primary)]">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">{t('meeting.publicLink', { defaultValue: 'Public Meeting Link' })}</label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] text-[11px] p-2 rounded-lg truncate font-mono">
                                            {publicLink}
                                        </code>
                                        <button
                                            onClick={copyToClipboard}
                                            className="p-2.5 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] hover:border-[var(--color-primary-orange)] rounded-lg transition-all flex-shrink-0 cursor-pointer"
                                            title={t('common.copy', { defaultValue: 'Copy' })}
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    {copySuccess && <p className="text-[10px] text-green-500 mt-1 font-bold ml-1">{t('common.copied', { defaultValue: 'Copied!' })}</p>}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="h-px flex-1 bg-[var(--color-border-primary)]"></div>
                                        <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{t('meeting.participantDetails', { defaultValue: 'PARTICIPANT DETAILS' })}</span>
                                        <div className="h-px flex-1 bg-[var(--color-border-primary)]"></div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                                            <User size={14} className="text-[var(--color-text-muted)]" />
                                            {t('common.name', { defaultValue: 'Name' })}
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('auth.fullName', { defaultValue: 'Vor und Nachname' })}
                                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--color-primary-orange)] focus:ring-1 focus:ring-[var(--color-primary-orange)] transition-all placeholder:text-[var(--color-text-muted)]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                                                <Mail size={14} className="text-[var(--color-text-muted)]" />
                                                {t('common.email', { defaultValue: 'E-Mail Adresse' })}
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                                placeholder="client@example.com"
                                                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--color-primary-orange)] focus:ring-1 focus:ring-[var(--color-primary-orange)] transition-all placeholder:text-[var(--color-text-muted)]"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                                                <Smartphone size={14} className="text-[var(--color-text-muted)]" />
                                                {t('common.mobile', { defaultValue: 'Mobile Number' })}
                                            </label>
                                            <div className="flex w-full bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-lg focus-within:border-[var(--color-primary-orange)] focus-within:ring-1 focus-within:ring-[var(--color-primary-orange)] transition-all h-[42px] items-center relative z-[5]">
                                                <PhoneInput
                                                    defaultCountry="de"
                                                    value={mobile}
                                                    onChange={(phone) => { setMobile(phone); setError(''); }}
                                                    className="w-full flex !border-none !bg-transparent"
                                                    inputClassName="!w-full !bg-transparent !border-none !text-[var(--color-text-primary)] !text-sm !py-2.5 !px-3 !transition-all"
                                                    countrySelectorStyleProps={{
                                                        buttonClassName: '!bg-transparent !border-none !h-full !flex !items-center !pl-2',
                                                        dropdownStyleProps: { style: { width: '200px' } },
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                                                <Calendar size={14} className="text-[var(--color-text-muted)]" />
                                                {t('common.date', { defaultValue: 'Datum' })}
                                            </label>
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary-orange)] focus:ring-1 focus:ring-[var(--color-primary-orange)] transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                                                <Clock size={14} className="text-[var(--color-text-muted)]" />
                                                {t('common.time', { defaultValue: 'Uhrzeit' })}
                                            </label>
                                            <input
                                                type="time"
                                                value={time}
                                                onChange={(e) => setTime(e.target.value)}
                                                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary-orange)] focus:ring-1 focus:ring-[var(--color-primary-orange)] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="h-px flex-1 bg-[var(--color-border-primary)]"></div>
                                            <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{t('meeting.notifyVia', { defaultValue: 'NOTIFY VIA' })}</span>
                                            <div className="h-px flex-1 bg-[var(--color-border-primary)]"></div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl cursor-pointer hover:border-[var(--color-primary-orange)] transition-all group">
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${sendEmail ? 'bg-[var(--color-primary-orange)] border-[var(--color-primary-orange)]' : 'border-[var(--color-border-secondary)]'}`}>
                                                    {sendEmail && <div className="w-2.5 h-2.5 bg-white rounded-[1px]"></div>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-[var(--color-text-primary)]">{t('meeting.sendEmail', { defaultValue: 'Send Email' })}</span>
                                                    <span className="text-[9px] text-[var(--color-text-muted)] font-medium">Mailgun Service</span>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl cursor-pointer hover:border-[var(--color-primary-orange)] transition-all group">
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${sendSms ? 'bg-[var(--color-primary-orange)] border-[var(--color-primary-orange)]' : 'border-[var(--color-border-secondary)]'}`}>
                                                    {sendSms && <div className="w-2.5 h-2.5 bg-white rounded-[1px]"></div>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-[var(--color-text-primary)]">{t('meeting.sendSms', { defaultValue: 'Send SMS' })}</span>
                                                    <span className="text-[9px] text-[var(--color-text-muted)] font-medium">Twilio Service</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="text-red-500 text-[11px] font-bold bg-red-500/10 p-2.5 rounded-lg flex items-center gap-2 animate-shake">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 sm:p-4 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-primary)] flex flex-col sm:flex-row gap-2 sm:gap-3 rounded-b-2xl">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full sm:flex-1 px-4 py-2.5 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] font-bold text-[13px] rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors uppercase tracking-wide order-2 sm:order-1 cursor-pointer"
                                >
                                    {t('common.cancel', { defaultValue: 'Cancel' })}
                                </button>
                                <button
                                    onClick={handleStartMeeting}
                                    disabled={isSending}
                                    className="cursor-pointer w-full sm:flex-1 px-4 py-2.5 bg-[var(--color-primary-orange)] text-white font-bold text-[13px] rounded-xl hover:bg-[var(--color-primary-orange-dark)] transition-colors shadow-lg shadow-[var(--color-primary-orange)]/20 uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                                >
                                    {isSending ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Video size={18} />
                                    )}
                                    {isSending ? t('common.sending', { defaultValue: 'Sending...' }) : t('meeting.start', { defaultValue: 'Start Meeting' })}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default OrderCard;
