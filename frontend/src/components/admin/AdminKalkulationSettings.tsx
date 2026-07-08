import {
    AlertCircle,
    Calculator,
    ChevronDown,
    ChevronRight,
    Copy,
    Euro,
    Plus,
    PlusCircle,
    Power,
    Save,
    Settings,
    Tag,
    Trash2,
    Users,
    X,
    Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BODY_PARTS, getBodyPartLabel, INTERIOR_PARTS } from '../../constants/bodyParts';
import { DEFAULT_GLOBAL_CONFIG } from '../../constants/configDefaults';
import {
    buildDefaultEstimateConfig,
    DEFAULT_ESTIMATE_PRICES,
    ESTIMATE_REPAIR_CODE_IDS,
    ESTIMATE_REPAIR_CODE_LABELS
} from '../../constants/estimateRepairCodes';
import { useReportStore } from '../../store/reportStore';
import type { EstimateComponentConfig, EstimateRepairCodeId, GlobalConfig } from '../../types/report.types';
import api from '../../utils/api';
import FormInput from '../ui/FormInput';
import Tooltip from '../ui/Tooltip';
import AdminInputModal from './AdminInputModal';
import ConfirmModal from './ConfirmModal';

const AdminKalkulationSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const lang = (i18n.language || 'de') as 'de' | 'en';
    const store = useReportStore();
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'estimate': true,
        'equipment': false,
        'system': false,
        'valuation': true
    });

    const [selectedComp, setSelectedComp] = useState<string>(BODY_PARTS[0]?.id || '');

    // Customer Management State
    const [customers, setCustomers] = useState<GlobalConfig[]>([]);
    const [selectedCustomerNum, setSelectedCustomerNum] = useState<string>('global');
    const [loading, setLoading] = useState(false);
    const [localConfig, setLocalConfig] = useState<GlobalConfig>(DEFAULT_GLOBAL_CONFIG);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [matrixRows, setMatrixRows] = useState<{ id: string; vehicleType: string; mileageFrom: number; mileageTo: number }[]>([]);
    const [ageColumns, setAgeColumns] = useState<{ id: string; from: number; to: number }[]>([]);

    // Modal State
    const [inputModal, setInputModal] = useState<{
        isOpen: boolean;
        title: string;
        fields: any[];
        onConfirm: (values: Record<string, string>) => void;
    }>({
        isOpen: false,
        title: '',
        fields: [],
        onConfirm: () => { }
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (store.globalConfig && Object.keys(store.globalConfig).length > 0) {
            setLocalConfig(store.globalConfig);
            setHasUnsavedChanges(false);

            const matrix = store.globalConfig.depreciationMatrix || [];
            const uniqueRows: { id: string; vehicleType: string; mileageFrom: number; mileageTo: number }[] = [];
            matrix.forEach(e => {
                if (!uniqueRows.some(r => r.vehicleType === e.vehicleType && r.mileageFrom === e.mileageFrom && r.mileageTo === e.mileageTo)) {
                    uniqueRows.push({
                        id: `${e.vehicleType}-${e.mileageFrom}-${e.mileageTo}-${Math.random()}`,
                        vehicleType: e.vehicleType,
                        mileageFrom: e.mileageFrom,
                        mileageTo: e.mileageTo
                    });
                }
            });
            uniqueRows.sort((a, b) => {
                if (a.vehicleType !== b.vehicleType) {
                    return a.vehicleType.localeCompare(b.vehicleType);
                }
                return a.mileageFrom - b.mileageFrom;
            });
            setMatrixRows(uniqueRows);

            const uniqueCols: { id: string; from: number; to: number }[] = [];
            matrix.forEach(e => {
                if (!uniqueCols.some(c => c.from === e.ageFrom && c.to === e.ageTo)) {
                    uniqueCols.push({
                        id: `${e.ageFrom}-${e.ageTo}-${Math.random()}`,
                        from: e.ageFrom,
                        to: e.ageTo
                    });
                }
            });
            uniqueCols.sort((a, b) => a.from - b.from);
            setAgeColumns(uniqueCols);
        }
    }, [store.globalConfig, selectedCustomerNum]);

    const loadCustomers = async () => {
        try {
            const res = await api.get('/config/customers');
            // Filter unique customers by number to prevent duplicates in dropdown
            const unique = res.data.reduce((acc: GlobalConfig[], current: GlobalConfig) => {
                const x = acc.find(item => item.customerNumber === current.customerNumber);
                if (!x) return acc.concat([current]);
                else return acc;
            }, []);
            setCustomers(unique);
        } catch (err) {
            console.error('Failed to load customers', err);
        }
    };

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };



    const config = localConfig;
    const cats = config.vehicleCategories && config.vehicleCategories.length > 0
        ? config.vehicleCategories
        : DEFAULT_GLOBAL_CONFIG.vehicleCategories || [];

    const getEffectiveRepairCodes = () => {
        const staticCodes = ESTIMATE_REPAIR_CODE_IDS.map(id => ({
            id,
            label: ESTIMATE_REPAIR_CODE_LABELS[id]?.en || id,
            isCustom: false
        }));
        const customCodes = (config.estimateConfig?.customRepairCodes || []).map(c => ({
            id: c.id,
            label: c.labelEn || c.labelDe || c.id,
            isCustom: true
        }));
        return [...staticCodes, ...customCodes];
    };

    const getComponentStatus = (componentId: string): 'none' | 'warning' | 'ok' => {
        const compCfg = config.estimateConfig?.components.find(c => c.componentId === componentId);
        if (!compCfg) return 'none';

        const effectiveCodes = getEffectiveRepairCodes();
        for (const code of effectiveCodes) {
            const codeEntry = compCfg.repairCodes.find(r => r.repairCodeId === code.id);
            if (!codeEntry) {
                return 'warning';
            }

            const prices = cats.map(cat => {
                const val = codeEntry.priceByCategory[cat];
                if (val !== undefined) {
                    return Number(val);
                }
                const defaultVal = cat === 'Transporter'
                    ? (DEFAULT_ESTIMATE_PRICES[code.id as EstimateRepairCodeId]?.[cat]
                        ?? DEFAULT_ESTIMATE_PRICES[code.id as EstimateRepairCodeId]?.['Compact']
                        ?? 0)
                    : (DEFAULT_ESTIMATE_PRICES[code.id as EstimateRepairCodeId]?.[cat] ?? 0);
                return Number(defaultVal);
            });

            const allZero = prices.every(p => p === 0);
            const hasZero = prices.some(p => p === 0);

            if (allZero || hasZero) {
                return 'warning';
            }
        }

        return 'ok';
    };

    const getComponentWarningMessage = (componentId: string): string => {
        const compCfg = config.estimateConfig?.components.find(c => c.componentId === componentId);
        if (!compCfg) return '';

        const effectiveCodes = getEffectiveRepairCodes();
        let hasAllZero = false;
        let hasPartiallyZero = false;

        for (const code of effectiveCodes) {
            const codeEntry = compCfg.repairCodes.find(r => r.repairCodeId === code.id);
            if (!codeEntry) {
                hasAllZero = true;
                continue;
            }

            const prices = cats.map(cat => {
                const val = codeEntry.priceByCategory[cat];
                if (val !== undefined) {
                    return Number(val);
                }
                const defaultVal = cat === 'Transporter'
                    ? (DEFAULT_ESTIMATE_PRICES[code.id as EstimateRepairCodeId]?.[cat]
                        ?? DEFAULT_ESTIMATE_PRICES[code.id as EstimateRepairCodeId]?.['Compact']
                        ?? 0)
                    : (DEFAULT_ESTIMATE_PRICES[code.id as EstimateRepairCodeId]?.[cat] ?? 0);
                return Number(defaultVal);
            });

            const allZero = prices.every(p => p === 0);
            const hasZero = prices.some(p => p === 0);

            if (allZero) {
                hasAllZero = true;
            } else if (hasZero) {
                hasPartiallyZero = true;
            }
        }
        if (hasAllZero) {
            return t('admin.kalkulation.noPriceDefined');
        }
        if (hasPartiallyZero) {
            return t('admin.kalkulation.manualCalcRequired');
        }
        return '';
    };


    const updateConfigLocal = (patch: Partial<GlobalConfig>) => {
        setLocalConfig(prev => ({ ...prev, ...patch }));
        setHasUnsavedChanges(true);
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            if (selectedCustomerNum === 'global') {
                await api.post('/config', localConfig);
            } else {
                await api.post(`/config/customer/${selectedCustomerNum}`, localConfig);
            }
            store.setGlobalConfig(localConfig);
            store.recalculateVehicleValue();
            setHasUnsavedChanges(false);
            await loadCustomers();
            toast.success(t('admin.saveSuccess'));
        } catch (err) {
            console.error('Failed to save config', err);
            toast.error(t('admin.saveError'));
        } finally {
            setLoading(false);
        }
    };



    const handleCustomerSwitch = async (num: string) => {
        const switchLogic = async () => {
            setLoading(true);
            setSelectedCustomerNum(num);
            try {
                if (num === 'global') {
                    await store.fetchGlobalConfig();
                } else {
                    await store.fetchAndApplyCustomerRates(num);
                }
            } catch (err) {
                console.error('Failed to switch customer', err);
            } finally {
                setLoading(false);
            }
        };

        if (hasUnsavedChanges) {
            setConfirmModal({
                isOpen: true,
                title: t('admin.unsavedChanges'),
                message: t('admin.unsavedChangesWarning'),
                type: 'info',
                onConfirm: switchLogic
            });
        } else {
            switchLogic();
        }
    };

    const handleCreateCustomerConfig = () => {
        setInputModal({
            isOpen: true,
            title: t('admin.kalkulation.createCustomerConfig'),
            fields: [
                { id: 'num', label: t('admin.kalkulation.customerNumber'), placeholder: 'e.g. 1001' },
                { id: 'name', label: t('admin.kalkulation.customerName'), placeholder: 'e.g. Autohaus Müller' }
            ],
            onConfirm: async (values) => {
                const { num, name } = values;
                if (!num || !name) return;
                try {
                    const newConfig = {
                        ...DEFAULT_GLOBAL_CONFIG,
                        customerNumber: num,
                        customerName: name,
                        isActive: true,
                        type: 'customer'
                    };
                    await api.post(`/config/customer/${num}`, newConfig);
                    await loadCustomers();
                    handleCustomerSwitch(num);
                } catch (err) {
                    toast.error(t('admin.kalkulation.failedCreateConfig'));
                }
            }
        });
    };

    const handleCopyConfig = () => {
        const customerOptions = [
            { value: 'global', label: t('admin.kalkulation.systemDefault') },
            ...customers.map(c => ({
                value: c.customerNumber,
                label: `${c.customerName || c.customerNumber} (${c.customerNumber})`
            }))
        ];

        setInputModal({
            isOpen: true,
            title: t('admin.kalkulation.copyConfig'),
            fields: [
                {
                    id: 'fromNum',
                    label: t('admin.kalkulation.copyFromCustomer'),
                    fieldType: 'select',
                    options: customerOptions,
                    defaultValue: selectedCustomerNum
                },
                { id: 'toNum', label: t('admin.kalkulation.newCustomerNumber'), placeholder: 'e.g. 1002' },
                { id: 'toName', label: t('admin.kalkulation.newCustomerName'), placeholder: 'e.g. Service Center GmbH' }
            ],
            onConfirm: async (values) => {
                const { fromNum, toNum, toName } = values;
                if (!fromNum || !toNum || !toName) return;
                try {
                    await api.post('/config/copy', {
                        from: fromNum,
                        to: toNum,
                        toName: toName
                    });
                    await loadCustomers();
                    handleCustomerSwitch(toNum);
                } catch (err) {
                    toast.error(t('admin.kalkulation.failedCopyConfig'));
                }
            }
        });
    };

    const handleToggleActive = async () => {
        if (selectedCustomerNum === 'global') return;
        const newActive = !config.isActive;
        updateConfigLocal({ isActive: newActive });
    };

    const handleAddDepreciationEntry = () => {
        const matrix = [...(config.depreciationMatrix || [])];
        matrix.push({
            vehicleType: 'Pkw',
            ageFrom: 0,
            ageTo: 12,
            mileageFrom: 0,
            mileageTo: 10000,
            factor: 0.95
        });
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const updateDepreciationEntry = (idx: number, patch: any) => {
        const matrix = [...(config.depreciationMatrix || [])];
        matrix[idx] = { ...matrix[idx], ...patch };
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const addAgeColumn = (from: number, to: number) => {
        const matrix = [...(config.depreciationMatrix || [])];
        const rows: { vehicleType: string; mileageFrom: number; mileageTo: number }[] = [];
        matrix.forEach(e => {
            if (!rows.some(r => r.vehicleType === e.vehicleType && r.mileageFrom === e.mileageFrom && r.mileageTo === e.mileageTo)) {
                rows.push({
                    vehicleType: e.vehicleType,
                    mileageFrom: e.mileageFrom,
                    mileageTo: e.mileageTo
                });
            }
        });
        if (rows.length === 0) {
            rows.push({ vehicleType: 'Pkw', mileageFrom: 0, mileageTo: 10000 });
        }
        rows.forEach(r => {
            matrix.push({
                ...r,
                ageFrom: from,
                ageTo: to,
                factor: 0.95
            });
        });
        setAgeColumns(prev => [
            ...prev,
            {
                id: `${from}-${to}-${Math.random()}`,
                from,
                to
            }
        ]);
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const addRow = () => {
        const matrix = [...(config.depreciationMatrix || [])];
        let ageRanges = ageColumns;
        if (ageRanges.length === 0) {
            const defaultCol = { id: `0-12-${Math.random()}`, from: 0, to: 12 };
            ageRanges = [defaultCol];
            setAgeColumns(ageRanges);
        }

        const baseVehicleType = 'Pkw';
        let baseMileageFrom = 0;
        let baseMileageTo = 10000;

        while (matrix.some(e => e.vehicleType === baseVehicleType && e.mileageFrom === baseMileageFrom && e.mileageTo === baseMileageTo)) {
            baseMileageFrom += 10000;
            baseMileageTo += 10000;
        }

        ageRanges.forEach(col => {
            matrix.push({
                vehicleType: baseVehicleType,
                mileageFrom: baseMileageFrom,
                mileageTo: baseMileageTo,
                ageFrom: col.from,
                ageTo: col.to,
                factor: 0.95
            });
        });

        setMatrixRows(prev => [
            ...prev,
            {
                id: `${baseVehicleType}-${baseMileageFrom}-${baseMileageTo}-${Math.random()}`,
                vehicleType: baseVehicleType,
                mileageFrom: baseMileageFrom,
                mileageTo: baseMileageTo
            }
        ]);

        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const updateAgeColumnRange = (oldCol: { id: string; from: number; to: number }, newCol: { from: number; to: number }) => {
        setAgeColumns(prev => prev.map(c => c.id === oldCol.id ? { ...c, from: newCol.from, to: newCol.to } : c));
        const matrix = (config.depreciationMatrix || []).map(entry => {
            if (entry.ageFrom === oldCol.from && entry.ageTo === oldCol.to) {
                return { ...entry, ageFrom: newCol.from, ageTo: newCol.to };
            }
            return entry;
        });
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const deleteAgeColumn = (col: { id: string; from: number; to: number }) => {
        setAgeColumns(prev => prev.filter(c => c.id !== col.id));
        const matrix = (config.depreciationMatrix || []).filter(entry =>
            !(entry.ageFrom === col.from && entry.ageTo === col.to)
        );
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const updateRowVehicleType = (row: { id: string; vehicleType: string; mileageFrom: number; mileageTo: number }, newType: string) => {
        setMatrixRows(prev => prev.map(r => r.id === row.id ? { ...r, vehicleType: newType } : r));
        const matrix = (config.depreciationMatrix || []).map(entry => {
            if (entry.vehicleType === row.vehicleType && entry.mileageFrom === row.mileageFrom && entry.mileageTo === row.mileageTo) {
                return { ...entry, vehicleType: newType };
            }
            return entry;
        });
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const updateRowMileage = (row: { id: string; vehicleType: string; mileageFrom: number; mileageTo: number }, newFrom: number, newTo: number) => {
        setMatrixRows(prev => prev.map(r => r.id === row.id ? { ...r, mileageFrom: newFrom, mileageTo: newTo } : r));
        const matrix = (config.depreciationMatrix || []).map(entry => {
            if (entry.vehicleType === row.vehicleType && entry.mileageFrom === row.mileageFrom && entry.mileageTo === row.mileageTo) {
                return { ...entry, mileageFrom: newFrom, mileageTo: newTo };
            }
            return entry;
        });
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const updateCellFactor = (row: { id: string; vehicleType: string; mileageFrom: number; mileageTo: number }, col: { from: number; to: number }, newFactor: number) => {
        const matrix = [...(config.depreciationMatrix || [])];
        const existingIdx = matrix.findIndex(e =>
            e.vehicleType === row.vehicleType &&
            e.mileageFrom === row.mileageFrom &&
            e.mileageTo === row.mileageTo &&
            e.ageFrom === col.from &&
            e.ageTo === col.to
        );

        if (existingIdx > -1) {
            matrix[existingIdx] = { ...matrix[existingIdx], factor: newFactor };
        } else {
            matrix.push({
                vehicleType: row.vehicleType,
                mileageFrom: row.mileageFrom,
                mileageTo: row.mileageTo,
                ageFrom: col.from,
                ageTo: col.to,
                factor: newFactor
            });
        }
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const deleteRow = (row: { id: string; vehicleType: string; mileageFrom: number; mileageTo: number }) => {
        setMatrixRows(prev => prev.filter(r => r.id !== row.id));
        const matrix = (config.depreciationMatrix || []).filter(entry =>
            !(entry.vehicleType === row.vehicleType && entry.mileageFrom === row.mileageFrom && entry.mileageTo === row.mileageTo)
        );
        updateConfigLocal({ depreciationMatrix: matrix });
    };

    const handleAddVehicleCategory = () => {
        setInputModal({
            isOpen: true,
            title: t('admin.kalkulation.addClass'),
            fields: [
                { id: 'catName', label: t('admin.kalkulation.addClass'), placeholder: 'e.g. SUV, Electric, etc.' }
            ],
            onConfirm: (values) => {
                const catName = values.catName?.trim();
                if (!catName) return;
                const currentCats = cats;
                if (currentCats.includes(catName)) {
                    toast.error(t('admin.kalkulation.categoryExists'));
                    return;
                }

                const newCats = [...currentCats, catName];

                // Update estimate config components to include the new category in priceByCategory
                const baseConfig = config.estimateConfig || buildDefaultEstimateConfig(newCats);
                const updatedComponents = baseConfig.components.map(comp => ({
                    ...comp,
                    repairCodes: comp.repairCodes.map(rc => ({
                        ...rc,
                        priceByCategory: {
                            ...rc.priceByCategory,
                            [catName]: rc.priceByCategory[catName] ?? 0
                        }
                    }))
                }));

                const baseKunststoff = config.kunststoffFactors || DEFAULT_GLOBAL_CONFIG.kunststoffFactors;
                const baseKarosserie = config.karosserieFactors || DEFAULT_GLOBAL_CONFIG.karosserieFactors;
                const baseMinderwert = config.minderwertFactors || DEFAULT_GLOBAL_CONFIG.minderwertFactors;

                updateConfigLocal({
                    vehicleCategories: newCats,
                    kunststoffFactors: {
                        ...baseKunststoff,
                        [catName]: baseKunststoff['Compact'] || [0.2, 0.3, 0.4]
                    },
                    karosserieFactors: {
                        ...baseKarosserie,
                        [catName]: baseKarosserie['Compact'] || [0.2, 0.3, 0.4]
                    },
                    minderwertFactors: {
                        ...baseMinderwert,
                        [catName]: baseMinderwert['Compact'] || 0.15
                    },
                    estimateConfig: {
                        ...baseConfig,
                        components: updatedComponents as EstimateComponentConfig[]
                    }
                });
                toast.success(t('admin.kalkulation.categoryAdded', { catName }));
            }
        });
    };

    const handleDeleteVehicleCategory = (catName: string) => {
        setConfirmModal({
            isOpen: true,
            title: t('admin.kalkulation.deleteCategoryConfirmTitle'),
            message: t('admin.kalkulation.deleteCategoryConfirmMsg', { catName }),
            type: 'danger',
            onConfirm: () => {
                const currentCats = cats;
                const newCats = currentCats.filter(c => c !== catName);
                const baseConfig = config.estimateConfig;
                const updatedComponents = baseConfig?.components.map(comp => ({
                    ...comp,
                    repairCodes: comp.repairCodes.map(rc => {
                        const prices = { ...rc.priceByCategory };
                        delete prices[catName];
                        return {
                            ...rc,
                            priceByCategory: prices
                        };
                    })
                }));

                const baseKunststoff = { ...(config.kunststoffFactors || DEFAULT_GLOBAL_CONFIG.kunststoffFactors) };
                const baseKarosserie = { ...(config.karosserieFactors || DEFAULT_GLOBAL_CONFIG.karosserieFactors) };
                const baseMinderwert = { ...(config.minderwertFactors || DEFAULT_GLOBAL_CONFIG.minderwertFactors) };
                delete baseKunststoff[catName];
                delete baseKarosserie[catName];
                delete baseMinderwert[catName];

                updateConfigLocal({
                    vehicleCategories: newCats,
                    kunststoffFactors: baseKunststoff,
                    karosserieFactors: baseKarosserie,
                    minderwertFactors: baseMinderwert,
                    ...(baseConfig ? {
                        estimateConfig: {
                            ...baseConfig,
                            components: updatedComponents as EstimateComponentConfig[]
                        }
                    } : {})
                });
                toast.success(t('admin.kalkulation.categoryDeleted', { catName }));
            }
        });
    };

    const handleAddRepairCode = () => {
        setInputModal({
            isOpen: true,
            title: t('admin.kalkulation.addCustomRepairCode'),
            fields: [
                { id: 'codeId', label: t('admin.kalkulation.codeId'), placeholder: 'e.g. SMART_Heavy' },
                { id: 'labelDe', label: t('admin.kalkulation.nameDe'), placeholder: 'e.g. SMART Repair Stark' },
                { id: 'labelEn', label: t('admin.kalkulation.nameEn'), placeholder: 'e.g. SMART Repair Heavy' }
            ],
            onConfirm: (values) => {
                const id = values.codeId?.trim();
                const labelDe = values.labelDe?.trim() || id;
                const labelEn = values.labelEn?.trim() || id;
                if (!id) return;

                const staticCodes = ESTIMATE_REPAIR_CODE_IDS.map(codeId => ({
                    id: codeId,
                    labelDe: ESTIMATE_REPAIR_CODE_LABELS[codeId]?.de || codeId,
                    labelEn: ESTIMATE_REPAIR_CODE_LABELS[codeId]?.en || codeId,
                }));
                const customCodes = config.estimateConfig?.customRepairCodes || [];
                const effective = [...staticCodes, ...customCodes];

                if (effective.some(c => c.id === id)) {
                    toast.error(t('admin.kalkulation.repairCodeExists'));
                    return;
                }

                const baseConfig = config.estimateConfig || buildDefaultEstimateConfig(cats);
                const updatedCustomCodes = [...(baseConfig.customRepairCodes || [])];
                updatedCustomCodes.push({ id, labelDe, labelEn });

                // Update all components in estimateConfig to include this new repair code
                const updatedComponents = baseConfig.components.map(comp => {
                    const hasCode = comp.repairCodes.some(rc => rc.repairCodeId === id);
                    if (hasCode) return comp;
                    return {
                        ...comp,
                        repairCodes: [
                            ...comp.repairCodes,
                            {
                                repairCodeId: id,
                                priceByCategory: Object.fromEntries(cats.map(c => [c, 0]))
                            }
                        ]
                    };
                });

                updateConfigLocal({
                    estimateConfig: {
                        ...baseConfig,
                        customRepairCodes: updatedCustomCodes,
                        components: updatedComponents as EstimateComponentConfig[]
                    }
                });
                const langLabel = localStorage.getItem('i18nextLng') === 'de' ? labelDe : labelEn;
                toast.success(t('admin.kalkulation.repairCodeAdded', { label: langLabel }));
            }
        });
    };

    const handleDeleteRepairCode = (codeId: string) => {
        setConfirmModal({
            isOpen: true,
            title: t('admin.kalkulation.deleteRepairCodeConfirmTitle'),
            message: t('admin.kalkulation.deleteRepairCodeConfirmMsg', { codeId }),
            type: 'danger',
            onConfirm: () => {
                const baseConfig = config.estimateConfig;
                if (!baseConfig) return;

                const customCodes = (baseConfig.customRepairCodes || []).filter(c => c.id !== codeId);
                const updatedComponents = baseConfig.components.map(comp => ({
                    ...comp,
                    repairCodes: comp.repairCodes.filter(rc => rc.repairCodeId !== codeId)
                }));

                updateConfigLocal({
                    estimateConfig: {
                        ...baseConfig,
                        customRepairCodes: customCodes,
                        components: updatedComponents as EstimateComponentConfig[]
                    }
                });
                toast.success(t('admin.kalkulation.repairCodeDeleted', { codeId }));
            }
        });
    };

    const handleAddDamageType = () => {
        setInputModal({
            isOpen: true,
            title: t('admin.kalkulation.addCustomDamageType', 'Schadensart hinzufügen'),
            fields: [
                { id: 'value', label: t('admin.kalkulation.damageTypeValue', 'Wert (ID / Name)'), placeholder: 'e.g. hagelschaden' },
                { id: 'labelDe', label: t('admin.kalkulation.damageTypeLabelDe', 'Name (DE)'), placeholder: 'e.g. Hagelschaden' },
                { id: 'labelEn', label: t('admin.kalkulation.damageTypeLabelEn', 'Name (EN)'), placeholder: 'e.g. Hail damage' }
            ],
            onConfirm: (values) => {
                const value = values.value?.trim();
                const labelDe = values.labelDe?.trim() || value;
                const labelEn = values.labelEn?.trim() || value;
                if (!value) return;

                const currentTypes = config.damageTypes || [];
                if (currentTypes.some(t => t.value === value)) {
                    toast.error(t('admin.kalkulation.damageTypeExists', 'Schadensart existiert bereits'));
                    return;
                }

                const newTypes = [...currentTypes, { value, labelDe, labelEn }];
                updateConfigLocal({ damageTypes: newTypes });
                toast.success(t('admin.kalkulation.damageTypeAdded', 'Schadensart hinzugefügt'));
            }
        });
    };

    const handleDeleteDamageType = (value: string) => {
        setConfirmModal({
            isOpen: true,
            title: t('admin.kalkulation.deleteDamageTypeConfirmTitle', 'Schadensart löschen'),
            message: t('admin.kalkulation.deleteDamageTypeConfirmMsg', { value }),
            type: 'danger',
            onConfirm: () => {
                const currentTypes = config.damageTypes || [];
                const newTypes = currentTypes.filter(t => t.value !== value);
                updateConfigLocal({ damageTypes: newTypes });
                toast.success(t('admin.kalkulation.damageTypeDeleted', 'Schadensart gelöscht'));
            }
        });
    };

    const sectionHeader = (id: string, title: string, icon: React.ReactNode, subtitle?: string) => (
        <div
            onClick={() => toggleSection(id)}
            className="flex items-center justify-between p-4 sm:p-6 bg-white border border-slate-100 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all duration-300 group shadow-sm"
        >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className={`p-2 sm:p-3 rounded-2xl transition-colors duration-300 shrink-0 ${expandedSections[id] ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 text-slate-500'}`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{title}</h3>
                    {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{subtitle}</p>}
                </div>
            </div>
            <div className={`transition-transform duration-300 shrink-0 ${expandedSections[id] ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-amber-600" />
            </div>
        </div>
    );

    const vehicleCatOptions = [
        { value: '', label: t('common.noneSelected') },
        ...cats.map(cat => ({ value: cat, label: cat }))
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">
            {/* Customer Management Header */}
            <div className="bg-white p-4 sm:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className="p-3 sm:p-4 bg-amber-600 rounded-2xl sm:rounded-[1.5rem] shadow-xl shadow-amber-200">
                            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{t('admin.kalkulation.configManagement')}</h2>
                            <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 truncate">
                                {selectedCustomerNum === 'global' ? t('admin.kalkulation.systemWideDefault') : `${t('admin.kalkulation.customer')}: ${config.customerName || selectedCustomerNum}`}
                                {selectedCustomerNum !== 'global' && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${config.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {config.isActive ? t('admin.kalkulation.active') : t('admin.kalkulation.inactive')}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative group flex-1 lg:flex-none">
                            <select
                                value={selectedCustomerNum}
                                onChange={(e) => handleCustomerSwitch(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-700 focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer transition-all hover:bg-slate-100 min-w-[180px] sm:min-w-[200px]"
                            >
                                <option value="global">{t('admin.kalkulation.systemDefault')}</option>
                                {customers.map(c => (
                                    <option key={c.customerNumber} value={c.customerNumber}>
                                        {c.customerName || c.customerNumber} ({c.customerNumber})
                                    </option>
                                ))}
                            </select>
                            <Users className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="hidden lg:block h-10 w-px bg-slate-100 mx-2" />

                        <div className="flex items-center gap-2 sm:gap-3 ml-auto lg:ml-0">
                            <button
                                onClick={handleCreateCustomerConfig}
                                className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-amber-50 hover:text-amber-600 transition-all group"
                                title={t('admin.kalkulation.createCustomerConfig')}
                            >
                                <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>

                            <button
                                onClick={handleCopyConfig}
                                className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-amber-50 hover:text-amber-600 transition-all group"
                                title={t('admin.kalkulation.copyConfig')}
                            >
                                <Copy className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>

                            {selectedCustomerNum !== 'global' && (
                                <button
                                    onClick={handleToggleActive}
                                    className={`p-3 rounded-2xl transition-all group ${config.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-600' : 'bg-red-50 text-red-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                    title={config.isActive ? t('admin.kalkulation.deactivate') : t('admin.kalkulation.activate')}
                                >
                                    <Power className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="pt-2 animate-pulse flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-widest">
                        <Zap className="w-3 h-3 animate-bounce" /> {t('admin.kalkulation.loadingConfig')}
                    </div>
                )}
            </div>

            {/* ── Estimate Configuration ────────────────────────────────── */}
            <div className="space-y-4">
                {sectionHeader('estimate', t('admin.kalkulation.estimateConfig'), <Tag className="w-6 h-6" />, t('admin.kalkulation.estimateSubtitle'))}
                {expandedSections['estimate'] && (
                    <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
                        <p className="text-xs text-slate-500 font-medium">
                            {t('admin.kalkulation.estimateDescription')}
                        </p>

                        {/* Extensible vehicle classes and repair codes toolbar */}
                        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <button
                                onClick={handleAddVehicleCategory}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> {t('admin.kalkulation.addClass')}
                            </button>
                            <button
                                onClick={handleAddRepairCode}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> {t('admin.kalkulation.addRepairCode')}
                            </button>
                            <button
                                onClick={handleAddDamageType}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> {t('admin.kalkulation.addDamageType', 'Schadensart hinzufügen')}
                            </button>

                            {/* Listing vehicle classes with delete options */}
                            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mr-1">{t('admin.kalkulation.classes')}</span>
                                {cats.map(cat => (
                                    <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wide">
                                        {cat}
                                        <button
                                            onClick={() => handleDeleteVehicleCategory(cat)}
                                            className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                                            title={t('admin.kalkulation.deleteCategoryTitle', { cat })}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Listing damage types with delete options */}
                            {config.damageTypes && config.damageTypes.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 ml-3 border-l pl-3 border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mr-1">{t('admin.kalkulation.damageTypes', 'Schadensarten')}</span>
                                    {config.damageTypes.filter((dt) => dt.value && dt.value !== '' && dt.value !== 'custom').map(dt => (
                                        <span key={dt.value} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wide">
                                            {dt.value}
                                            <button
                                                onClick={() => handleDeleteDamageType(dt.value)}
                                                className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                                                title={t('admin.kalkulation.deleteDamageTypeTitle', 'Schadensart löschen')}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left: component list */}
                            <div className="lg:col-span-4 space-y-4 max-h-[520px] overflow-y-auto pr-2 scrollbar-hide">
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">
                                        {lang === 'de' ? 'Karosserieteile' : 'Body Parts'}
                                    </div>
                                    {BODY_PARTS.map((part) => {
                                        const status = getComponentStatus(part.id);
                                        return (
                                            <button
                                                key={part.id}
                                                onClick={() => setSelectedComp(part.id)}
                                                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all group ${
                                                    selectedComp === part.id
                                                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-200'
                                                        : 'hover:bg-white text-slate-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {(() => {
                                                        if (status === 'none') {
                                                            return <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />;
                                                        } else if (status === 'warning') {
                                                            return (
                                                                <Tooltip
                                                                    content={getComponentWarningMessage(part.id)}
                                                                    position="right"
                                                                >
                                                                    <AlertCircle
                                                                        className={`w-4 h-4 animate-pulse shrink-0 cursor-help ${
                                                                            selectedComp === part.id ? 'text-amber-100' : 'text-amber-500'
                                                                        }`}
                                                                    />
                                                                </Tooltip>
                                                            );
                                                        } else {
                                                            return <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] shrink-0" />;
                                                        }
                                                    })()}
                                                    <span className="font-bold text-xs truncate">{getBodyPartLabel(part.id)}</span>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 transition-transform ${
                                                    selectedComp === part.id ? 'translate-x-1' : 'group-hover:translate-x-0.5 text-slate-300'
                                                }`} />
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">
                                        {lang === 'de' ? 'Innenraum' : 'Interior'}
                                    </div>
                                    {INTERIOR_PARTS.map((part) => {
                                        const status = getComponentStatus(part.id);
                                        return (
                                            <button
                                                key={part.id}
                                                onClick={() => setSelectedComp(part.id)}
                                                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all group ${
                                                    selectedComp === part.id
                                                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-200'
                                                        : 'hover:bg-white text-slate-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {(() => {
                                                        if (status === 'none') {
                                                            return <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />;
                                                        } else if (status === 'warning') {
                                                            return (
                                                                <Tooltip
                                                                    content={getComponentWarningMessage(part.id)}
                                                                    position="right"
                                                                >
                                                                    <AlertCircle
                                                                        className={`w-4 h-4 animate-pulse shrink-0 cursor-help ${
                                                                            selectedComp === part.id ? 'text-amber-100' : 'text-amber-500'
                                                                        }`}
                                                                    />
                                                                </Tooltip>
                                                            );
                                                        } else {
                                                            return <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] shrink-0" />;
                                                        }
                                                    })()}
                                                    <span className="font-bold text-xs truncate">{getBodyPartLabel(part.id)}</span>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 transition-transform ${
                                                    selectedComp === part.id ? 'translate-x-1' : 'group-hover:translate-x-0.5 text-slate-300'
                                                }`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right: repair codes for selected component */}
                            <div className="lg:col-span-8 bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-6">
                                {(() => {
                                    const compCfg = config.estimateConfig?.components.find(c => c.componentId === selectedComp);
                                    // Using cats from outer scope

                                    const ensureCompConfig = () => {
                                        const existing = config.estimateConfig || buildDefaultEstimateConfig(cats);
                                        const hasPart = existing.components.find(c => c.componentId === selectedComp);
                                        if (hasPart) return existing;

                                        const effectiveCodes = getEffectiveRepairCodes();
                                        return {
                                            ...existing,
                                            components: [
                                                ...existing.components,
                                                {
                                                    componentId: selectedComp,
                                                    description: getBodyPartLabel(selectedComp),
                                                    repairCodes: effectiveCodes.map(code => ({
                                                        repairCodeId: code.id as any,
                                                        priceByCategory: Object.fromEntries(cats.map(c => [
                                                            c,
                                                            code.isCustom ? 0 : (DEFAULT_ESTIMATE_PRICES[code.id as EstimateRepairCodeId]?.[c] ?? (DEFAULT_ESTIMATE_PRICES[code.id as EstimateRepairCodeId]?.['Compact'] ?? 0))
                                                        ]))
                                                    }))
                                                }
                                            ]
                                        };
                                    };

                                    const updateComp = (patch: Partial<typeof compCfg>) => {
                                        const base = ensureCompConfig();
                                        updateConfigLocal({
                                            estimateConfig: {
                                                ...base,
                                                components: base.components.map(c =>
                                                    c.componentId === selectedComp ? { ...c, ...patch } : c
                                                )
                                            }
                                        });
                                    };

                                    const updatePrice = (codeId: EstimateRepairCodeId | string, cat: string, price: number) => {
                                        const base = ensureCompConfig();
                                        const compEntry = base.components.find(c => c.componentId === selectedComp)!;
                                        const updatedCodes = compEntry.repairCodes.map(rc =>
                                            rc.repairCodeId === codeId
                                                ? { ...rc, priceByCategory: { ...rc.priceByCategory, [cat]: price } }
                                                : rc
                                        );
                                        // add code if missing
                                        const hasCode = compEntry.repairCodes.some(rc => rc.repairCodeId === codeId);
                                        const finalCodes = hasCode ? updatedCodes : [
                                            ...updatedCodes,
                                            { repairCodeId: codeId, priceByCategory: { [cat]: price } }
                                        ];
                                        updateConfigLocal({
                                            estimateConfig: {
                                                ...base,
                                                components: base.components.map(c =>
                                                    c.componentId === selectedComp ? { ...c, repairCodes: finalCodes } : c
                                                )
                                            }
                                        });
                                    };

                                    return (
                                        <>
                                            {/* Description */}
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-black text-slate-800">{getBodyPartLabel(selectedComp)}</h4>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t('admin.kalkulation.description')}</label>
                                                    <input
                                                        className="flex-1 bg-slate-50 border-none rounded-xl py-2 px-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-500/20"
                                                        value={compCfg?.description ?? getBodyPartLabel(selectedComp)}
                                                        onChange={e => updateComp({ description: e.target.value })}
                                                        placeholder={t('admin.kalkulation.componentDescPlaceholder')}
                                                    />
                                                </div>
                                            </div>

                                            {/* Repair Codes price table */}
                                            <div className="overflow-x-auto rounded-2xl border border-slate-100 scrollbar-hide">
                                                <table className="w-full text-left text-xs font-bold border-collapse" style={{ minWidth: `${180 + cats.length * 110}px` }}>
                                                    <thead>
                                                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                            <th className="px-4 py-3 font-black">{t('admin.kalkulation.repairCode')}</th>
                                                            {cats.map(cat => (
                                                                <th key={cat} className="px-3 py-3 font-black text-center whitespace-nowrap">{cat}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {getEffectiveRepairCodes().map(({ id: codeId, label: codeLabel, isCustom }) => {
                                                            const codeEntry = compCfg?.repairCodes.find(r => r.repairCodeId === codeId);
                                                            return (
                                                                <tr key={codeId} className="hover:bg-amber-50/30 transition-colors">
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex flex-col gap-1 align-baseline">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
                                                                                    {codeLabel}
                                                                                </span>
                                                                                {isCustom && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteRepairCode(codeId)}
                                                                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                                                        title={t('admin.kalkulation.deleteCustomRepairCode')}
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            {(() => {
                                                                                const prices = cats.map(cat => {
                                                                                    const raw = codeEntry?.priceByCategory[cat];
                                                                                    // Use stored value if explicitly set (even 0); only fall to default when undefined
                                                                                    if (raw !== undefined) return Number(raw);
                                                                                    return cat === 'Transporter'
                                                                                        ? (DEFAULT_ESTIMATE_PRICES[codeId as EstimateRepairCodeId]?.[cat]
                                                                                            ?? DEFAULT_ESTIMATE_PRICES[codeId as EstimateRepairCodeId]?.['Compact']
                                                                                            ?? 0)
                                                                                        : (DEFAULT_ESTIMATE_PRICES[codeId as EstimateRepairCodeId]?.[cat] ?? 0);
                                                                                });
                                                                                const allZero = prices.every(p => p === 0);
                                                                                const hasZero = prices.some(p => p === 0);
                                                                                if (allZero) {
                                                                                    return (
                                                                                        <div className="flex items-center gap-1 text-amber-600 text-[10px] font-bold leading-tight whitespace-normal mt-0.5">
                                                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                                                            <span>{t('admin.kalkulation.noPriceDefined')}</span>
                                                                                        </div>
                                                                                    );
                                                                                } else if (hasZero) {
                                                                                    return (
                                                                                        <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold leading-tight whitespace-normal mt-0.5">
                                                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                                                            <span>{t('admin.kalkulation.manualCalcRequired')}</span>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                    </td>
                                                                    {cats.map(cat => {
                                                                        const rawStored = codeEntry?.priceByCategory[cat];
                                                                        // Use stored value if explicitly set (even 0); only fall to default when undefined
                                                                        const resolvedVal = rawStored !== undefined
                                                                            ? rawStored
                                                                            : (cat === 'Transporter'
                                                                                ? (DEFAULT_ESTIMATE_PRICES[codeId as EstimateRepairCodeId]?.[cat]
                                                                                    ?? DEFAULT_ESTIMATE_PRICES[codeId as EstimateRepairCodeId]?.['Compact']
                                                                                    ?? 0)
                                                                                : (DEFAULT_ESTIMATE_PRICES[codeId as EstimateRepairCodeId]?.[cat] ?? 0));
                                                                        const isZero = Number(resolvedVal) === 0;
                                                                        return (
                                                                            <td key={cat} className="px-3 py-2 text-center">
                                                                                <div className="flex items-center gap-1 justify-center">
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        step="5"
                                                                                        value={resolvedVal}
                                                                                        onChange={e => updatePrice(codeId, cat, parseFloat(e.target.value) || 0)}
                                                                                        className={`w-20 text-center font-mono font-black py-1 transition-all focus:ring-2 focus:outline-none rounded-lg ${
                                                                                            isZero
                                                                                                ? 'text-amber-700 bg-amber-50/40 border border-amber-300 focus:ring-amber-500/20 focus:border-amber-400'
                                                                                                : 'text-slate-800 bg-white border border-slate-200 focus:ring-amber-500/30 focus:border-amber-400'
                                                                                        }`}
                                                                                    />
                                                                                    <span className={`text-[10px] transition-colors ${isZero ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>€</span>
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {!compCfg && (
                                                <div className="text-center py-4">
                                                    <button
                                                        onClick={() => {
                                                            const base = ensureCompConfig();
                                                            updateConfigLocal({ estimateConfig: base });
                                                        }}
                                                        className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
                                                    >
                                                        {t('admin.kalkulation.initCompConfig')}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Bulk initialize button */}
                        {(!config.estimateConfig || config.estimateConfig.components.length === 0) && (
                            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                                <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-xs font-bold text-amber-700">{t('admin.kalkulation.noEstimateConfig')}</span>
                                <button
                                    onClick={() => {
                                        updateConfigLocal({ estimateConfig: buildDefaultEstimateConfig(cats) });
                                    }}
                                    className="ml-auto px-3 py-1.5 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-all"
                                >
                                    {t('admin.kalkulation.initializeAll')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>








            <div className="space-y-4">
                {sectionHeader('equipment', t('admin.equipmentPrices'), <Euro className="w-6 h-6" />, t('admin.kalkulation.equipmentSubtitle'))}
                {expandedSections['equipment'] && (
                    <div className="bg-slate-50/50 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300 space-y-6 sm:space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">{t('admin.kalkulation.lumpSumPrices')}</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {Object.entries(config.equipmentPrices || {}).map(([key, val]) => (
                                        <FormInput
                                            key={key}
                                            label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            value={String(val)}
                                            onChange={v => {
                                                const ep = { ...(config.equipmentPrices || {}) };
                                                ep[key] = parseFloat(v) || 0;
                                                updateConfigLocal({ equipmentPrices: ep });
                                            }}
                                            type="number"
                                            suffix={<Euro className="w-4 h-4" />}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">{t('admin.kalkulation.maintenanceRules')}</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {Object.entries(config.maintenanceRules || {}).map(([key, val]) => (
                                        <FormInput
                                            key={key}
                                            label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            value={String(val)}
                                            onChange={v => {
                                                const mr = { ...(config.maintenanceRules || {}) };
                                                mr[key] = parseFloat(v) || 0;
                                                updateConfigLocal({ maintenanceRules: mr });
                                            }}
                                            type="number"
                                            suffix={<Euro className="w-4 h-4" />}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Save Button */}
            {/* Redundant button removed as it's handled by the Final Action Bar below */}
            {/* Modals */}
            <AdminInputModal
                isOpen={inputModal.isOpen}
                onClose={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={inputModal.onConfirm}
                title={inputModal.title}
                fields={inputModal.fields}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
            {/* D. System Deductions & Rules */}
            <div className="space-y-4">
                {sectionHeader('system', t('admin.calculationConfig'), <Zap className="w-6 h-6" />, t('admin.kalkulation.calculationSubtitle'))}
                {expandedSections['system'] && (
                    <div className="bg-slate-50/50 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <FormInput
                                label={t('admin.kalkulation.primaryKeyDeduction')}
                                value={String(config.systemSettings?.primaryKeyDeduction ?? 100)}
                                onChange={v => {
                                    const ss = { ...(config.systemSettings || {}) };
                                    ss.primaryKeyDeduction = parseFloat(v) || 0;
                                    updateConfigLocal({ systemSettings: ss });
                                }}
                                type="number"
                                suffix={<Euro className="w-4 h-4" />}
                            />
                            <FormInput
                                label={t('admin.kalkulation.spareKeyDeduction')}
                                value={String(config.systemSettings?.spareKeyDeduction ?? 50)}
                                onChange={v => {
                                    const ss = { ...(config.systemSettings || {}) };
                                    ss.spareKeyDeduction = parseFloat(v) || 0;
                                    updateConfigLocal({ systemSettings: ss });
                                }}
                                type="number"
                                suffix={<Euro className="w-4 h-4" />}
                            />
                            <FormInput
                                label={t('admin.kalkulation.reqPrimaryKeys')}
                                value={String(config.systemSettings?.requiredPrimaryKeys ?? 2)}
                                onChange={v => {
                                    const ss = { ...(config.systemSettings || {}) };
                                    ss.requiredPrimaryKeys = parseInt(v) || 0;
                                    updateConfigLocal({ systemSettings: ss });
                                }}
                                type="number"
                                suffix={<Settings className="w-4 h-4" />}
                            />
                            <FormInput
                                label={t('admin.kalkulation.reqSpareKeys')}
                                value={String(config.systemSettings?.requiredSpareKeys ?? 1)}
                                onChange={v => {
                                    const ss = { ...(config.systemSettings || {}) };
                                    ss.requiredSpareKeys = parseInt(v) || 0;
                                    updateConfigLocal({ systemSettings: ss });
                                }}
                                type="number"
                                suffix={<Settings className="w-4 h-4" />}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* V. Valuation Settings */}
            <div className="space-y-4">
                {sectionHeader('valuation', t('admin.kalkulation.valuationtitle'), <Calculator className="w-6 h-6" />, t('admin.kalkulation.valuationSubtitle'))}
                {expandedSections['valuation'] && (
                    <div className="bg-slate-50/50 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300 space-y-6 sm:space-y-10">

                        {/* === Calculation Type Selector === */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">{t('admin.kalkulation.calculationType')}</h4>
                                <p className="text-xs text-slate-500 font-medium">{t('admin.kalkulation.calcTypeDesc')}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {([
                                    { id: 'proportional' as const, label: t('admin.kalkulation.type1Label'), desc: t('admin.kalkulation.type1Desc'), color: 'amber' },
                                    { id: 'hundred_percent' as const, label: t('admin.kalkulation.type2Label'), desc: t('admin.kalkulation.type2Desc'), color: 'emerald' },
                                    { id: 'text_only' as const, label: t('admin.kalkulation.type3Label'), desc: t('admin.kalkulation.type3Desc'), color: 'slate' },
                                ]).map(opt => {
                                    const active = (config.calculationType || 'proportional') === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => updateConfigLocal({ calculationType: opt.id })}
                                            className={`text-left p-5 rounded-3xl border-2 transition-all duration-200 ${active
                                                ? opt.color === 'amber' ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-100'
                                                    : opt.color === 'emerald' ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
                                                        : 'border-slate-400 bg-slate-100 shadow-md'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black mb-3 ${active
                                                ? opt.color === 'amber' ? 'bg-amber-500 text-white'
                                                    : opt.color === 'emerald' ? 'bg-emerald-500 text-white'
                                                        : 'bg-slate-600 text-white'
                                                : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                {opt.id === 'proportional' ? '1' : opt.id === 'hundred_percent' ? '2' : '3'}
                                            </div>
                                            <p className={`text-xs font-black uppercase tracking-widest mb-1 ${active
                                                ? opt.color === 'amber' ? 'text-amber-700' : opt.color === 'emerald' ? 'text-emerald-700' : 'text-slate-700'
                                                : 'text-slate-500'
                                                }`}>{opt.label}</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-snug">{opt.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Type 3 text input */}
                            {(config.calculationType === 'text_only') && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('admin.kalkulation.displayText')}</label>
                                    <input
                                        type="text"
                                        value={config.calculationTypeText || ''}
                                        onChange={e => updateConfigLocal({ calculationTypeText: e.target.value })}
                                        placeholder={t('admin.kalkulation.displayTextPlaceholder')}
                                        className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-slate-300 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* === Depreciation Matrix === */}
                        {(() => {
                            const matrix = config.depreciationMatrix || [];

                            const getEntry = (row: { vehicleType: string; mileageFrom: number; mileageTo: number }, aRange: { from: number; to: number }) => {
                                return matrix.find(
                                    e => e.vehicleType === row.vehicleType &&
                                         e.mileageFrom === row.mileageFrom &&
                                         e.mileageTo === row.mileageTo &&
                                         e.ageFrom === aRange.from &&
                                         e.ageTo === aRange.to
                                );
                            };

                            return (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                <Calculator className="w-5 h-5 text-amber-500" />
                                                {t('admin.kalkulation.depreciationMatrix')}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium">{t('admin.kalkulation.depreciationMatrixDesc')}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    const lastRange = ageColumns[ageColumns.length - 1];
                                                    const from = lastRange ? lastRange.to + 1 : 0;
                                                    const to = lastRange ? lastRange.to + 12 : 12;
                                                    addAgeColumn(from, to);
                                                }}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 flex items-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> {t('admin.kalkulation.addAgeMonths')}
                                            </button>
                                            <button
                                                onClick={addRow}
                                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-amber-200"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> {t('admin.kalkulation.addMileageKm')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[1rem] border border-slate-100/80 overflow-x-auto shadow-xl shadow-slate-100/40 p-2 sm:p-4 scrollbar-hide">
                                        {matrix.length === 0 ? (
                                            <div className="py-12 text-center text-slate-400 font-extrabold uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3">
                                                <Calculator className="w-10 h-10 text-slate-300" />
                                                <span>{t('admin.kalkulation.noEntriesDefined')}</span>
                                                <button
                                                    onClick={addRow}
                                                    className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-amber-200"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> {t('admin.kalkulation.addRowInit')}
                                                </button>
                                            </div>
                                        ) : (
                                            <table className="w-full text-left text-xs border-collapse" style={{ minWidth: `${430 + ageColumns.length * 120}px` }}>
                                                <thead>
                                                    <tr className="border-b border-slate-100/80">
                                                        {/* Column 1: Vehicle Type */}
                                                        <th className="pb-4 pt-0 px-6 font-extrabold text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest w-36">
                                                            {t('admin.kalkulation.vehicleType')}
                                                        </th>
                                                        {/* Column 2: Mileage */}
                                                        <th className="pb-4 pt-0 px-6 font-extrabold text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest w-52">
                                                            {t('admin.kalkulation.mileageKm')}
                                                        </th>
                                                        {/* Age Columns */}
                                                        {ageColumns.map((aRange) => (
                                                            <th key={aRange.id} className="pb-4 pt-0 px-4 text-center relative group/col w-32 min-w-[110px]">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                                        {t('admin.kalkulation.ageMonths')}
                                                                    </span>
                                                                    <div className="flex items-center gap-1 justify-center bg-slate-50 border border-slate-100 rounded-full px-2 py-1">
                                                                        <input
                                                                            type="number"
                                                                            value={aRange.from}
                                                                            onChange={e => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                updateAgeColumnRange(aRange, { ...aRange, from: val });
                                                                            }}
                                                                            className="w-8 text-center bg-transparent border-none p-0 font-extrabold text-slate-700 text-[11px] focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        />
                                                                        <span className="text-slate-300 text-[9px] font-medium lowercase shrink-0 px-0.5">{t('admin.kalkulation.to')}</span>
                                                                        <input
                                                                            type="number"
                                                                            value={aRange.to}
                                                                            onChange={e => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                updateAgeColumnRange(aRange, { ...aRange, to: val });
                                                                            }}
                                                                            className="w-8 text-center bg-transparent border-none p-0 font-extrabold text-slate-700 text-[11px] focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {ageColumns.length > 0 && (
                                                                    <button
                                                                        onClick={() => deleteAgeColumn(aRange)}
                                                                        className="absolute top-0 right-1 p-1 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover/col:opacity-100 transition-opacity border border-red-100 shadow-sm"
                                                                        title={t('admin.kalkulation.deleteAgeCol')}
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </th>
                                                        ))}
                                                        {/* Column Last: Actions */}
                                                        <th className="pb-4 pt-0 px-6 font-extrabold text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest text-center w-24">
                                                            {t('admin.kalkulation.actions')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {matrixRows.map((row) => (
                                                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                                                            {/* Cell 1: Vehicle Type */}
                                                            <td className="py-2 px-2">
                                                                <input
                                                                    value={row.vehicleType}
                                                                    onChange={e => updateRowVehicleType(row, e.target.value)}
                                                                    className="w-32 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border-none rounded-full py-2 px-3.5 font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 text-center transition-all text-xs"
                                                                    placeholder={t('admin.kalkulation.pkText')}
                                                                />
                                                            </td>
                                                            {/* Cell 2: Mileage Range */}
                                                            <td className="py-2 px-2">
                                                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 w-48">
                                                                    <input
                                                                        type="number"
                                                                        value={row.mileageFrom}
                                                                        onChange={e => {
                                                                            const val = parseInt(e.target.value) || 0;
                                                                            updateRowMileage(row, val, row.mileageTo);
                                                                        }}
                                                                        className="flex-1 min-w-0 text-center bg-transparent border-none p-0 font-extrabold text-slate-700 text-xs focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    />
                                                                    <span className="text-slate-400 font-medium text-[10px] lowercase shrink-0 px-0.5">{t('admin.kalkulation.to')}</span>
                                                                    <input
                                                                        type="number"
                                                                        value={row.mileageTo}
                                                                        onChange={e => {
                                                                            const val = parseInt(e.target.value) || 0;
                                                                            updateRowMileage(row, row.mileageFrom, val);
                                                                        }}
                                                                        className="flex-1 min-w-0 text-center bg-transparent border-none p-0 font-extrabold text-slate-700 text-xs focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    />
                                                                </div>
                                                            </td>
                                                            {/* Cell Factors */}
                                                            {ageColumns.map((aRange) => {
                                                                const entry = getEntry(row, aRange);
                                                                const factorVal = entry ? entry.factor : 1.0;
                                                                return (
                                                                    <td key={aRange.id} className="py-2 px-2 text-center">
                                                                        <div className="relative inline-block w-20">
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={factorVal}
                                                                                onChange={e => {
                                                                                    const val = parseFloat(e.target.value) || 0;
                                                                                    updateCellFactor(row, aRange, val);
                                                                                }}
                                                                                className="w-full bg-amber-50 hover:bg-amber-100/50 focus:bg-white text-amber-700 font-black border-none rounded-full py-2 px-3 focus:ring-2 focus:ring-amber-500/20 text-center transition-all text-xs"
                                                                                placeholder="1.0"
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                            {/* Cell: Actions */}
                                                            <td className="py-2 px-6 text-center">
                                                                <button
                                                                    onClick={() => deleteRow(row)}
                                                                    className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all inline-flex items-center justify-center border border-transparent hover:border-red-100"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Final Action Bar */}
            {hasUnsavedChanges && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <button
                        onClick={handleSaveChanges}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl font-black text-xs transition-all shadow-2xl shadow-amber-600/20 hover:scale-105 active:scale-95"
                    >
                        {loading ? <Zap className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('admin.saveAllChanges')}
                    </button>
                </div>
            )}

            <AdminInputModal
                isOpen={inputModal.isOpen}
                title={inputModal.title}
                fields={inputModal.fields}
                onClose={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={(values) => {
                    inputModal.onConfirm(values);
                    setInputModal(prev => ({ ...prev, isOpen: false }));
                }}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
            />
        </div>
    );
};

export default AdminKalkulationSettings;
