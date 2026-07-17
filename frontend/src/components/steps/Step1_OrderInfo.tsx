import React from 'react';
import { useTranslation } from 'react-i18next';
import { CONCERN_TYPES } from '../../constants/damageTypes';

import { useAuthStore } from '../../store/authStore';
import { useReportStore } from '../../store/reportStore';
import { useUIStore } from '../../store/uiStore';
import api from '../../utils/api';
import Card from '../ui/Card';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';
import SectionTitle from '../ui/SectionTitle';

interface Props {
    adminMode?: boolean;
    onToggleRequired?: (fieldName: string) => Promise<void>;
}

const Step1_OrderInfo: React.FC<Props> = ({ adminMode, onToggleRequired }) => {
    const { t } = useTranslation();
    const store = useReportStore();
    const { showValidationErrors } = useUIStore();
    const validationErrors = store.getStepValidationErrors(1);
    const getFieldError = (fieldName: string) => {
        return showValidationErrors && validationErrors[fieldName] ? t('validation.required', 'Pflichtfeld') : undefined;
    };
    const isRequired = (fieldName: string) => store.fieldConfigs.find(c => c.fieldName === fieldName)?.required;
    const { expertName, isVideoxpert } = useAuthStore();
    const [claimTypes, setClaimTypes] = React.useState<{ value: string; label: string }[]>([]);
    const [loadingTypes, setLoadingTypes] = React.useState(false);
    const [customerContacts, setCustomerContacts] = React.useState<{ value: string; label: string; raw: any }[]>([]);
    const [loadingContacts, setLoadingContacts] = React.useState(false);
    const [selectedContactId, setSelectedContactId] = React.useState<string>("");
    const [configStatus, setConfigStatus] = React.useState<'idle' | 'loading' | 'customer' | 'default'>('idle');


    const ALLOWED_CLAIM_TYPES = [
        "Zustandsbericht / Minderwertgutachten",
        "Fahrzeugbewertung",
        "Zustandsbericht / Minderwertbericht Foto",
        "Zustandsbericht / Minderwertbericht Video"
    ];

    React.useEffect(() => {
        setLoadingTypes(true);
        api.get('/reports/claim-types')
            .then(res => {
                if (Array.isArray(res.data)) {
                    // Map OMT Response to { value, label } and filter by ALLOWED_CLAIM_TYPES
                    const fetched = res.data
                        .map((item: any) => {
                            const label = item.label || item.name || item.id || (typeof item === 'string' ? item : '');
                            return {
                                value: label,
                                label: t(`step1.claimTypes.${label}`, label) as string
                            };
                        })
                        .filter((item: any) => {
                            if (!item.label) return false;

                            // Check if the label is in our allowed list (case-insensitive)
                            const isAllowed = ALLOWED_CLAIM_TYPES.some(allowed =>
                                allowed.trim().toLowerCase() === item.label.trim().toLowerCase()
                            );

                            if (!isAllowed) return false;

                            // Gate Video option by Videoxpert flag
                            if (item.label.toLowerCase().includes("video") && !isVideoxpert) {
                                return false;
                            }
                            return true;
                        });

                    if (fetched.length > 0) {
                        setClaimTypes(fetched);
                    } else {
                        // Fallback to default list if OMT returns nothing matching
                        const defaults = ALLOWED_CLAIM_TYPES
                            .filter(type => {
                                if (type.toLowerCase().includes("video") && !isVideoxpert) return false;
                                return true;
                            })
                            .map(type => ({
                                value: type,
                                label: t(`step1.claimTypes.${type}`, type) as string
                            }));
                        setClaimTypes(defaults);
                    }
                }
            })
            .catch(err => {
                console.error('Failed to fetch claim types', err);
            })
            .finally(() => {
                setLoadingTypes(false);
            });

        // Fetch Customer Contacts
        setLoadingContacts(true);
        api.get('/reports/customer-contacts')
            .then(res => {
                if (Array.isArray(res.data)) {
                    const mapped = res.data
                        .map((item: any) => {
                            const label = item.name1 || item.fullName || item.name || '';
                            return {
                                value: item.id?.toString() || item.name1 || item.name || JSON.stringify(item),
                                label: label,
                                raw: item
                            };
                        })
                        .filter((item: any) => item.label && item.label.trim() !== '');
                    setCustomerContacts(mapped);
                }
            })
            .catch(err => {
                console.error('Failed to fetch customer contacts', err);
            })
            .finally(() => {
                setLoadingContacts(false);
            });
    }, []);

    React.useEffect(() => {
        setSelectedContactId(store.intranetCustomerId || "");
    }, [store.intranetCustomerId]);

    React.useEffect(() => {
        if (!store.inspectorName && expertName) {
            const formatted = expertName.includes(' ')
                ? expertName
                : expertName.replace(/([a-z])([A-Z])/g, '$1 $2');
            store.updateField('inspectorName', formatted);
        }
    }, [expertName, store.inspectorName, store.updateField]);

    const concernOptions = CONCERN_TYPES
        .filter(c => {
            const value = c.value.toLowerCase();
            return !value.includes('leasingrücknahme') &&
                !value.includes('leasingrückgabe') &&
                !value.includes('leasingrückläufer') &&
                !value.includes('minderwertgutachten');
        })
        .map(c => ({
            value: c.value,
            label: t(`concernTypes.${c.value}`, c.labelDe) as string,
        }));

    React.useEffect(() => {
        if (store.customerNumber) {
            if (store.globalConfig?.type === 'customer') {
                setConfigStatus('customer');
            } else if (store.globalConfig?.type === 'global') {
                setConfigStatus('default');
            } else {
                setConfigStatus('idle');
            }
        } else {
            setConfigStatus('idle');
        }
    }, [store.customerNumber, store.globalConfig?.type]);

    const applyCustomerRates = async (customerNum: string) => {
        if (!customerNum) {
            await store.fetchGlobalConfig();
            setConfigStatus('idle');
            return;
        }
        setConfigStatus('loading');
        await store.fetchAndApplyCustomerRates(customerNum);
        const currentType = useReportStore.getState().globalConfig?.type;
        if (currentType === 'customer') {
            setConfigStatus('customer');
        } else if (currentType === 'global') {
            setConfigStatus('default');
        } else {
            setConfigStatus('idle');
        }
    };

    const handleContactChange = (id: string) => {
        setSelectedContactId(id);
        store.updateField('intranetCustomerId', id);
        const contact = customerContacts.find(c => c.value === id);
        if (contact && contact.raw) {
            const raw = contact.raw;
            // Map raw contact fields to store
            const name = raw.name1 || raw.fullName || raw.name || raw.companyName || '';
            store.updateField('clientName', name);
            store.updateField('concernCompany', name);

            if (raw.street || raw.houseNumber) {
                const street = raw.street || '';
                const houseNumber = raw.houseNumber || '';
                store.updateField('clientStreet', street);
                store.updateField('clientHouseNumber', houseNumber);
                store.updateField('clientAddress', `${street} ${houseNumber}`.trim());
            } else if (raw.address) {
                store.updateField('clientAddress', raw.address);
                // Try to split address into street and house number
                const match = raw.address.match(/^(.*?)\s*(\d+.*)?$/);
                if (match) {
                    store.updateField('clientStreet', match[1].trim());
                    store.updateField('clientHouseNumber', match[2] ? match[2].trim() : '');
                }
            } else if (raw.fullAddress) {
                store.updateField('clientAddress', raw.fullAddress);
            } else {
                store.updateField('clientAddress', '');
                store.updateField('clientStreet', '');
                store.updateField('clientHouseNumber', '');
            }

            if (raw.zipCodes) store.updateField('clientZip', raw.zipCodes);
            else if (raw.postcode) store.updateField('clientZip', raw.postcode);
            else if (raw.postCode) store.updateField('clientZip', raw.postCode);
            else if (raw.zipCode) store.updateField('clientZip', raw.zipCode);
            else store.updateField('clientZip', '');

            if (raw.city) store.updateField('clientCity', raw.city);
            else if (raw.location) store.updateField('clientCity', raw.location);
            else if (raw.place) store.updateField('clientCity', raw.place);
            else store.updateField('clientCity', '');

            if (raw.emailAddress) store.updateField('customerEmail', raw.emailAddress);
            else if (raw.email) store.updateField('customerEmail', raw.email);

            const customerNum = raw.kundennummer || raw.customerNo || raw.customerNumber || raw.debitorNumber || '';
            store.updateField('customerNumber', customerNum);
            applyCustomerRates(customerNum);

            if (raw.contractNumber) store.updateField('contractNumber', raw.contractNumber);
            else if (raw.contractNo) store.updateField('contractNumber', raw.contractNo);
            else store.updateField('contractNumber', '');
        }
    };




    return (
        <div className="animate-fade-in">
            <SectionTitle>{t('step1.title')}</SectionTitle>
            <Card>
                <div className="grid grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-3 gap-x-6">
                    <div className="col-span-full mb-4">
                        <FormSelect
                            name="claimType"
                            error={getFieldError('claimType')}
                            label={t('step1.claimType')}
                            value={store.claimType}
                            onChange={v => store.updateField('claimType', v as any)}
                            options={claimTypes.length > 0 ? claimTypes : [
                                { value: store.claimType, label: (store.claimType ? t(`step1.claimTypes.${store.claimType}`, store.claimType) : t('common.loading')) as string }
                            ]}
                            disabled={loadingTypes || adminMode}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('claimType')}
                            required={isRequired('claimType')}
                        />
                        {store.claimType === 'Fahrzeugbewertung' && (
                            <p className="text-sm text-orange-600 mt-1">{t('step1.priceNote')}</p>
                        )}
                    </div>
                    <div className="col-span-full mb-4">
                        <FormSelect
                            name="omtContactSelect"
                            error={getFieldError('omtContactSelect')}
                            label={t('step1.omtContactSelect')}
                            value={selectedContactId}
                            onChange={handleContactChange}
                            options={customerContacts}
                            disabled={loadingContacts || adminMode}
                            adminMode={adminMode}
                            onToggleRequired={() => onToggleRequired?.('omtContactSelect')}
                            required={isRequired('omtContactSelect')}
                        />
                        {/* Config status badge */}
                        {configStatus !== 'idle' && (
                            <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md w-fit ${configStatus === 'loading' ? 'bg-gray-100 text-gray-500' :
                                configStatus === 'customer' ? 'bg-green-50 text-green-700 border border-green-200' :
                                    'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                {configStatus === 'loading' && (
                                    <><span className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin inline-block" />
                                        {t('step1.configLoading')}</>
                                )}
                                {configStatus === 'customer' && (
                                    <><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                        {t('step1.configCustomer')}</>
                                )}
                                {configStatus === 'default' && (
                                    <><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                                        {t('step1.configDefault')}</>
                                )}
                            </div>
                        )}
                    </div>
                    <FormInput
                        name="caseNumber"
                        error={getFieldError('caseNumber')}
                        label={t('step1.caseNumber')}
                        value={store.source && store.source !== 'MANUAL' ? `${store.source.replace('-', '_')}_${store.auftragsnummer || store.caseNumber}` : (store.auftragsnummer || store.caseNumber)}
                        onChange={v => store.updateField('caseNumber', v)}
                        mono
                        disabled
                        placeholder={t('step1.caseNumberPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('caseNumber')}
                        required={isRequired('caseNumber')}
                    />

                    <FormInput
                        name="licensePlate"
                        error={getFieldError('licensePlate')}
                        label={t('step1.licensePlate')}
                        value={store.licensePlate}
                        onChange={v => store.updateField('licensePlate', v.toUpperCase())}
                        placeholder={t('step1.licensePlatePlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('licensePlate')}
                        required={isRequired('licensePlate')}
                    />

                    <FormInput
                        name="customerNumber"
                        error={getFieldError('customerNumber')}
                        label={t('step1.customerNumber')}
                        value={store.customerNumber}
                        onChange={v => store.updateField('customerNumber', v)}
                        onBlur={() => applyCustomerRates(store.customerNumber)}
                        placeholder={t('step1.customerNumberPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('customerNumber')}
                        required={isRequired('customerNumber')}
                    />

                    <FormInput
                        name="contractNumber"
                        error={getFieldError('contractNumber')}
                        label={t('step1.contractNumber')}
                        value={store.contractNumber}
                        onChange={v => store.updateField('contractNumber', v)}
                        placeholder={t('step1.contractNumberPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('contractNumber')}
                        required={isRequired('contractNumber')}
                    />

                    <FormSelect
                        name="concernType"
                        error={getFieldError('concernType')}
                        label={t('step1.concernType')}
                        value={store.concernType}
                        onChange={v => store.updateField('concernType', v as any)}
                        options={concernOptions}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('concernType')}
                        required={isRequired('concernType') || false}
                    />

                    <FormInput
                        name="clientName"
                        error={getFieldError('clientName')}
                        label={t('step1.clientName')}
                        value={store.clientName}
                        onChange={v => store.updateField('clientName', v)}
                        placeholder={t('step1.clientNamePlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('clientName')}
                        required={isRequired('clientName') || false}
                    />

                    <FormInput
                        name="clientStreet"
                        error={getFieldError('clientStreet')}
                        label={t('step1.clientStreet')}
                        value={store.clientStreet}
                        onChange={v => {
                            store.updateField('clientStreet', v);
                            store.updateField('clientAddress', `${v} ${store.clientHouseNumber}`.trim());
                        }}
                        placeholder={t('step1.clientStreetPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('clientStreet')}
                        required={isRequired('clientStreet') || false}
                    />

                    <FormInput
                        name="clientHouseNumber"
                        error={getFieldError('clientHouseNumber')}
                        label={t('step1.clientHouseNumber')}
                        value={store.clientHouseNumber}
                        onChange={v => {
                            store.updateField('clientHouseNumber', v);
                            store.updateField('clientAddress', `${store.clientStreet} ${v}`.trim());
                        }}
                        placeholder={t('step1.clientHouseNumberPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('clientHouseNumber')}
                        required={isRequired('clientHouseNumber') || false}
                    />

                    <FormInput
                        name="clientZip"
                        error={getFieldError('clientZip')}
                        label={t('step1.clientZip')}
                        value={store.clientZip}
                        onChange={v => store.updateField('clientZip', v)}
                        placeholder={t('step1.clientZipPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('clientZip')}
                        required={isRequired('clientZip') || false}
                    />

                    <FormInput
                        name="clientCity"
                        error={getFieldError('clientCity')}
                        label={t('step1.clientCity')}
                        value={store.clientCity}
                        onChange={v => store.updateField('clientCity', v)}
                        placeholder={t('step1.clientCityPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('clientCity')}
                        required={isRequired('clientCity') || false}
                    />

                    <FormInput
                        name="orderDate"
                        error={getFieldError('orderDate')}
                        label={t('step1.orderDate')}
                        value={store.orderDate}
                        onChange={v => store.updateField('orderDate', v)}
                        type="date"
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('orderDate')}
                        required={isRequired('orderDate') || false}
                    />

                    <FormInput
                        name="inspectionDate"
                        error={getFieldError('inspectionDate')}
                        label={t('step1.inspectionDate')}
                        value={store.inspectionDate}
                        onChange={v => store.updateField('inspectionDate', v)}
                        type="date"
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('inspectionDate')}
                        required={isRequired('inspectionDate') || false}
                    />

                    <FormInput
                        name="inspectionTime"
                        error={getFieldError('inspectionTime')}
                        label={t('step1.inspectionTime')}
                        value={store.inspectionTime}
                        onChange={v => store.updateField('inspectionTime', v)}
                        type="time"
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('inspectionTime')}
                        required={isRequired('inspectionTime') || false}
                    />

                    <FormInput
                        name="inspectionLocation"
                        error={getFieldError('inspectionLocation')}
                        label={t('step1.inspectionLocation')}
                        value={store.inspectionLocation}
                        onChange={v => store.updateField('inspectionLocation', v)}
                        placeholder={t('step1.inspectionLocationPlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('inspectionLocation')}
                        required={isRequired('inspectionLocation') || false}
                    />

                    <FormInput
                        name="inspectorName"
                        error={getFieldError('inspectorName')}
                        label={t('step1.inspectorName')}
                        value={store.inspectorName}
                        onChange={v => store.updateField('inspectorName', v)}
                        placeholder={t('step1.inspectorNamePlaceholder')}
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('inspectorName')}
                        required={isRequired('inspectorName')}
                    />

                    <FormInput
                        name="valuationDate"
                        error={getFieldError('valuationDate')}
                        label={t('step1.valuationDate')}
                        value={store.valuationDate}
                        onChange={v => store.updateField('valuationDate', v)}
                        type="date"
                        adminMode={adminMode}
                        onToggleRequired={() => onToggleRequired?.('valuationDate')}
                        required={isRequired('valuationDate') || false}
                    />
                    {useAuthStore.getState().role === 'ADMIN' && (
                        <FormSelect
                            name="status"
                            label={t('orders.table.status')}
                            value={store.status || 'OPEN'}
                            onChange={v => store.updateField('status', v as any)}
                            options={[
                                { value: 'OPEN', label: t('orders.statusValues.OPEN') as string },
                                { value: 'IN_PROGRESS', label: t('orders.statusValues.IN_PROGRESS') as string },
                                { value: 'COMPLETED', label: t('orders.statusValues.COMPLETED') as string },
                                { value: 'CANCELLED', label: t('orders.statusValues.CANCELLED') as string }
                            ]}
                        />
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Step1_OrderInfo;
