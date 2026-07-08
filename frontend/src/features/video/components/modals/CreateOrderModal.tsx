import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import CarInspectionLoader from '../../CarInspectionLoader';
import { createOrder } from '../../services/orderService';

/**
 * Create-order modal (T7.8) — faithful port. Rewired to POST /api/orders via the
 * merged order service (was a raw fetch to the VideoExpert backend).
 */
interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderCreated: () => void;
}

const CreateOrderModal = ({ isOpen, onClose, onOrderCreated }: CreateOrderModalProps) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [formData, setFormData] = useState({
        dispatchOrOrderNo: '',
        contactPersonMobile: '+49',
        contactPersonEmail: '',
    });

    useEffect(() => {
        if (isOpen) {
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const generatedId = `RC_${randomNum}`;
            setFormData({
                dispatchOrOrderNo: generatedId,
                contactPersonMobile: '+49',
                contactPersonEmail: '',
            });
            setErrors({});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.dispatchOrOrderNo.trim()) {
            newErrors.dispatchOrOrderNo = t('validation.required', { defaultValue: 'Dispatch/Order No. is required' });
        }
        if (!formData.contactPersonMobile.trim()) {
            newErrors.contactPersonMobile = t('validation.required', { defaultValue: 'Mobile number is required' });
        } else if (!/^[0-9\s+]+$/.test(formData.contactPersonMobile)) {
            newErrors.contactPersonMobile = t('validation.mobileFormat', { defaultValue: 'Invalid mobile number format' });
        }
        if (!formData.contactPersonEmail.trim()) {
            newErrors.contactPersonEmail = t('validation.required', { defaultValue: 'Email is required' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactPersonEmail)) {
            newErrors.contactPersonEmail = t('validation.emailFormat', { defaultValue: 'Invalid email format' });
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const cleanData = Object.fromEntries(
                Object.entries(formData).filter(([, v]) => v !== '' && v !== null)
            );
            await createOrder(cleanData);
            onOrderCreated();
            onClose();
        } catch (error) {
            console.error('Error creating order', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm animate-fade-in md:left-[var(--sidebar-width,0px)] transition-all duration-300">
            <div className="min-h-full flex items-center justify-center p-2 sm:p-8">
                <div className="bg-[var(--color-bg-card)] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl animate-scale-up border border-[var(--color-border-primary)] relative flex flex-col">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-primary)] flex justify-between items-center bg-[var(--color-bg-secondary)]/50 relative rounded-t-xl sm:rounded-t-2xl">
                        {loading && (
                            <div className="fixed inset-0 z-50 bg-[var(--color-bg-card)]/80 backdrop-blur-sm flex items-center justify-center ">
                                <CarInspectionLoader text={t('modals.createOrder.creating', { defaultValue: 'Creating Order...' })} size="sm" />
                            </div>
                        )}
                        <h3 className="text-base sm:text-lg font-black text-[var(--color-text-primary)] uppercase tracking-tight">{t('modals.createOrder.title', { defaultValue: 'Add New Order' })}</h3>
                        <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-2 rounded-full hover:bg-[var(--color-bg-hover)] cursor-pointer">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-visible">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{t('order.dispatchOrderNo', { defaultValue: 'Dispatch No./Order No.' })} <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="dispatchOrOrderNo"
                                value={formData.dispatchOrOrderNo}
                                readOnly
                                placeholder={t('order.dispatchOrderNo', { defaultValue: 'Dispatch No./Order No.' })}
                                className={`w-full bg-[var(--color-bg-secondary)] border text-[var(--color-text-primary)] text-sm rounded-lg px-4 py-3 focus:outline-none ${errors.dispatchOrOrderNo ? 'border-red-500' : 'border-[var(--color-border-secondary)]'}`}
                            />
                            {errors.dispatchOrOrderNo && <p className="text-red-500 text-xs mt-1 font-medium">{errors.dispatchOrOrderNo}</p>}
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-[var(--color-text-primary)] border-b border-[var(--color-border-primary)] pb-2 flex items-center mb-2">
                                {t('order.contactDetails', { defaultValue: 'Contact Details' })}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{t('order.fields.mobile', { defaultValue: 'Mobile' })} {t('order.fields.contactPerson', { defaultValue: 'Contact Person' })} <span className="text-red-500">*</span></label>
                                    <div className="flex w-full bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-lg focus-within:border-[var(--color-primary-orange)] focus-within:ring-1 focus-within:ring-[var(--color-primary-orange)] transition-all h-11 items-center relative z-[5]">
                                        <PhoneInput
                                            defaultCountry="de"
                                            value={formData.contactPersonMobile}
                                            onChange={(phone) => {
                                                setFormData((prev) => ({ ...prev, contactPersonMobile: phone }));
                                                if (errors.contactPersonMobile) {
                                                    setErrors((prev) => ({ ...prev, contactPersonMobile: '' }));
                                                }
                                            }}
                                            forceDialCode={true}
                                            className="w-full flex !border-none !bg-transparent"
                                            inputClassName="!w-full !bg-transparent !border-none !text-[var(--color-text-primary)] !text-sm !py-2.5 !px-3 !transition-all"
                                            countrySelectorStyleProps={{
                                                buttonClassName: '!bg-transparent !border-none !h-full !flex !items-center !pl-2',
                                                dropdownStyleProps: { style: { width: '200px' } },
                                            }}
                                        />
                                    </div>
                                    {errors.contactPersonMobile && <p className="text-red-500 text-xs mt-1 font-medium">{errors.contactPersonMobile}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{t('order.fields.email', { defaultValue: 'E-mail' })} {t('order.fields.contactPerson', { defaultValue: 'Contact Person' })} <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        name="contactPersonEmail"
                                        value={formData.contactPersonEmail}
                                        onChange={handleChange}
                                        placeholder={t('order.fields.email', { defaultValue: 'E-mail' })}
                                        className={`w-full bg-[var(--color-bg-primary)] border text-[var(--color-text-primary)] text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-1 ${errors.contactPersonEmail ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-[var(--color-border-secondary)] focus:border-[var(--color-primary-orange)] focus:ring-[var(--color-primary-orange)]'}`}
                                    />
                                    {errors.contactPersonEmail && <p className="text-red-500 text-xs mt-1 font-medium">{errors.contactPersonEmail}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-primary)] flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 rounded-b-xl sm:rounded-b-2xl">
                        <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] font-bold text-sm rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors uppercase tracking-wide cursor-pointer">
                            {t('common.cancel', { defaultValue: 'Cancel' })}
                        </button>
                        <button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto px-6 py-2.5 bg-[var(--color-primary-orange)] text-white font-bold text-sm rounded-xl hover:bg-[var(--color-primary-orange-dark)] transition-colors shadow-lg shadow-[var(--color-primary-orange)]/20 uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer">
                            {loading ? t('modals.createOrder.saving', { defaultValue: 'Saving...' }) : t('modals.createOrder.save', { defaultValue: 'Create Order' })}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateOrderModal;
