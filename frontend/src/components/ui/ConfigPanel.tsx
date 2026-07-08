import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReportStore } from '../../store/reportStore';
import { Settings, ChevronDown, ChevronUp, SlidersHorizontal, Save, Check, AlertCircle } from 'lucide-react';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import { formatCurrency } from '../../utils/currency';
import AdminKalkulationSettings from '../admin/AdminKalkulationSettings';

interface ConfigPanelProps {
    initialOpen?: boolean;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ initialOpen = false }) => {
    const { t } = useTranslation();
    const store = useReportStore();
    const [isOpen, setIsOpen] = useState(initialOpen);
    const [showAdvanced, setShowAdvanced] = useState(initialOpen);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const paintCalcOptions = [
        { value: 'AZT', label: t('config.paintCalcAzt') },
        { value: 'Hersteller', label: t('config.paintCalcHersteller') },
    ];

    const uniqueCatsList = store.globalConfig?.vehicleCategories && store.globalConfig.vehicleCategories.length > 0
        ? store.globalConfig.vehicleCategories
        : ['Subcompact', 'Compact', 'Mid-size', 'Full-size', 'Luxury', 'Super Luxury / Sports', 'Transporter'];

    const catsForOptions = uniqueCatsList.map(cat => {
        let label = cat;
        if (cat === 'Subcompact') label = 'Subcompact (Kleinstwagen)';
        else if (cat === 'Compact') label = 'Compact (Kompaktklasse)';
        else if (cat === 'Mid-size') label = 'Mid-size (Mittelklasse)';
        else if (cat === 'Full-size') label = 'Full-size (Obere Mittelklasse)';
        else if (cat === 'Luxury') label = 'Luxury (Oberklasse)';
        else if (cat === 'Super Luxury / Sports') label = 'Super Luxury / Sports';
        else if (cat === 'Transporter') label = 'Transporter (Transporter)';
        return { value: cat, label };
    });

    const vehicleCatOptions = [
        { value: '', label: t('common.noneSelected') },
        ...catsForOptions
    ];

    return (
        <div className="bg-white shadow-sm rounded-lg mb-4 border border-gray-200 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-dark-gray hover:bg-gray-50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    {t('config.title')}
                    <span className="text-xs font-normal text-gray-400">
                        {formatCurrency(store.karosseriestundensatz)}/h · {store.vehicleCategory ?? t('common.noneSelected')} · {store.lackberechnungsart}
                    </span>
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {isOpen && (
                <div className="px-3 pb-3 border-t border-gray-100 animate-slide-down">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 mt-2 items-end">
                        <FormInput
                            label={t('config.hourlyRateBodyMsv')}
                            value={String(store.karosseriestundensatz)}
                            onChange={v => store.setKarosseriestundensatz(parseFloat(v) || 0)}
                            type="number"
                        />
                        <FormInput
                            label={t('config.hourlyRatePaint')}
                            value={String(store.lackstundensatz)}
                            onChange={v => store.setLackstundensatz(parseFloat(v) || 0)}
                            type="number"
                        />
                        <FormSelect
                            label={t('config.paintCalcType')}
                            value={store.lackberechnungsart}
                            onChange={v => store.setLackberechnungsart(v as 'AZT' | 'Hersteller')}
                            options={paintCalcOptions}
                        />
                        <FormSelect
                            label={t('step2.vehicleCategory') || 'Vehicle Category'}
                            value={store.vehicleCategory || ''}
                            onChange={v => store.setVehicleCategory(v as any)}
                            options={vehicleCatOptions}
                        />
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            {t('config.advancedSettings')}
                            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {store.customerNumber && (
                            <button
                                onClick={async () => {
                                    setIsSaving(true);
                                    const success = await store.saveCurrentRatesAsCustomerDefault(store.customerNumber);
                                    setIsSaving(false);
                                    setSaveStatus(success ? 'success' : 'error');
                                    setTimeout(() => setSaveStatus('idle'), 3000);
                                }}
                                disabled={isSaving}
                                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${saveStatus === 'success'
                                    ? 'bg-green-100 text-green-700'
                                    : saveStatus === 'error'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                                    }`}
                            >
                                {isSaving ? (
                                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ) : saveStatus === 'success' ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : saveStatus === 'error' ? (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                ) : (
                                    <Save className="w-3.5 h-3.5" />
                                )}
                                {saveStatus === 'success'
                                    ? t('config.customerRatesSaved')
                                    : saveStatus === 'error'
                                        ? t('common.error')
                                        : t('config.saveAsCustomerDefault')}
                            </button>
                        )}
                    </div>
                    {showAdvanced && (
                        <div className="mt-3 pt-3 border-t border-gray-50">
                            <AdminKalkulationSettings />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ConfigPanel;

