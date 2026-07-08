import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useReportStore, ReportStoreProvider, createAdminReportStore } from '../../store/reportStore';
import { RefreshCw, FileText, Smartphone, AlertCircle, Layout, Save, ChevronRight, Settings, CheckCircle2, Users, ChevronDown, Camera, ToggleLeft, ToggleRight, ChevronUp, Plus, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import type { GlobalConfig } from '../../types/report.types';
import Step1_OrderInfo from '../steps/Step1_OrderInfo';
import Step2_VehicleID from '../steps/Step2_VehicleID';
import Step3_Condition from '../steps/Step3_Condition';
import Step4_Damages from '../steps/Step4_Damages';
import Step5_Summary from '../steps/Step5_Summary';

type ConfigTab = 'step1' | 'step2' | 'step3' | 'step4' | 'step5';

const AdminFieldRequirementsContent: React.FC = () => {
    const { t } = useTranslation();
    const { fieldConfigs, fetchFieldConfigs, updateFieldConfig, updatePhotoSlotConfigs } = useReportStore();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<ConfigTab>('step1');
    const [appliedCustomerNumber, setAppliedCustomerNumber] = useState('');
    const [customers, setCustomers] = useState<GlobalConfig[]>([]);

    // ── Photo Slot State ──────────────────────────────────────────────────────
    type PhotoSlot = { id: string; label: string; required: boolean; isCustom: boolean };

    const DEFAULT_SLOTS: PhotoSlot[] = [
        { id: 'diag_fl', label: 'Übersicht diagonal vorne links', required: false, isCustom: false },
        { id: 'diag_rl', label: 'Übersicht diagonal hinten links', required: false, isCustom: false },
        { id: 'diag_rr', label: 'Übersicht diagonal hinten rechts', required: false, isCustom: false },
        { id: 'diag_fr', label: 'Übersicht diagonal vorne rechts', required: false, isCustom: false },
        // These two are ALWAYS required by default — admin can turn them off but not remove them
        { id: 'mileage_photo', label: 'Kilometerstand / Tacho', required: true, isCustom: false },
        { id: 'vin_photo', label: 'Fahrzeug-Ident.-Nr. / Typschild', required: true, isCustom: false },
        { id: 'interior_door', label: 'Fahrzeuginnenraum durch die Fahrertür', required: false, isCustom: false },
        { id: 'sill_left', label: 'Schweller links', required: false, isCustom: false },
        { id: 'sill_right', label: 'Schweller rechts', required: false, isCustom: false },
    ];

    const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(DEFAULT_SLOTS);
    const [slotsDirty, setSlotsDirty] = useState(false);
    const [savingSlots, setSavingSlots] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSlotLabel, setNewSlotLabel] = useState('');
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const res = await api.get('/config/customers');
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
        loadCustomers();
    }, []);

    // Sync photoSlots from fieldConfigs whenever fieldConfigs or customer changes
    useEffect(() => {
        const configured = fieldConfigs?.filter((c: any) => c.isPhotoSlot === true) ?? [];
        if (configured.length > 0) {
            const sorted = [...configured].sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
            setPhotoSlots(sorted.map((c: any) => ({
                id: c.fieldName,
                label: c.label || c.fieldName,
                required: c.required ?? false,
                isCustom: c.isCustom ?? false,
            })));
        } else {
            // Merge defaults with required state from fieldConfigs
            setPhotoSlots(DEFAULT_SLOTS.map(s => ({
                ...s,
                required: fieldConfigs?.find((c: any) => c.fieldName === s.id)?.required ?? s.required,
            })));
        }
        setSlotsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fieldConfigs]);

    useEffect(() => {
        fetchFieldConfigs(appliedCustomerNumber);
    }, [fetchFieldConfigs, appliedCustomerNumber]);

    const handleToggle = async (fieldName: string) => {
        const config = fieldConfigs?.find(c => c.fieldName === fieldName);
        const isCurrentlyRequired = config ? config.required : false;

        try {
            let step = 1;
            if (activeTab === 'step2') step = 2;
            if (activeTab === 'step3') step = 3;
            if (activeTab === 'step4') step = 4;
            if (activeTab === 'step5') step = 5;

            await updateFieldConfig(fieldName, !isCurrentlyRequired, step, appliedCustomerNumber);
            toast.success(t('admin.requirements.fieldUpdated', { fieldName }), { duration: 1000 });
        } catch (error) {
            toast.error(t('admin.requirements.failedUpdate'));
        }
    };

    // ── Photo Slot Handlers ───────────────────────────────────────────────────
    const moveSlot = (idx: number, dir: -1 | 1) => {
        const next = [...photoSlots];
        const target = idx + dir;
        if (target < 0 || target >= next.length) return;
        [next[idx], next[target]] = [next[target], next[idx]];
        setPhotoSlots(next);
        setSlotsDirty(true);
    };

    const toggleSlotRequired = (idx: number) => {
        const next = [...photoSlots];
        next[idx] = { ...next[idx], required: !next[idx].required };
        setPhotoSlots(next);
        setSlotsDirty(true);
    };

    const removeCustomSlot = (idx: number) => {
        setPhotoSlots(prev => prev.filter((_, i) => i !== idx));
        setSlotsDirty(true);
    };

    const addCustomSlot = () => {
        const label = newSlotLabel.trim();
        if (!label) return;
        const id = `custom_photo_${Date.now()}`;
        setPhotoSlots(prev => [...prev, { id, label, required: false, isCustom: true }]);
        setNewSlotLabel('');
        setShowAddForm(false);
        setSlotsDirty(true);
    };

    const savePhotoSlots = async () => {
        setSavingSlots(true);
        try {
            await updatePhotoSlotConfigs(
                photoSlots.map((s, i) => ({ id: s.id, label: s.label, required: s.required, sortOrder: i, isCustom: s.isCustom })),
                appliedCustomerNumber || undefined
            );
            setSlotsDirty(false);
            toast.success('Foto-Reihenfolge gespeichert', { duration: 1500 });
        } catch {
            toast.error('Fehler beim Speichern');
        } finally {
            setSavingSlots(false);
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    const requiredCount = photoSlots.filter(s => s.required).length;

    const renderStep = () => {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    {activeTab === 'step1' && <Step1_OrderInfo adminMode onToggleRequired={handleToggle} />}
                    {activeTab === 'step2' && <Step2_VehicleID adminMode onToggleRequired={handleToggle} />}
                    {activeTab === 'step3' && <Step3_Condition adminMode onToggleRequired={handleToggle} />}
                    {activeTab === 'step4' && (
                        <div className="space-y-5">
                            {/* ── Mandatory Photos Panel ── */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                {/* Header */}
                                <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 bg-amber-100 rounded-lg">
                                            <Camera className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">Pflichtfotos — Schritt 4</p>
                                            <p className="text-xs text-slate-500">
                                                <span className="font-bold text-orange-600">{requiredCount}</span> von {photoSlots.length} als Pflicht &bull; Reihenfolge per ↑↓ ändern
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {slotsDirty && (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={savePhotoSlots}
                                                disabled={savingSlots}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[11px] font-black rounded-xl shadow hover:bg-green-700 transition-all active:scale-95 disabled:opacity-60"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                {savingSlots ? 'Speichert…' : 'Reihenfolge speichern'}
                                            </motion.button>
                                        )}
                                        <button
                                            onClick={() => { setShowAddForm(v => !v); setNewSlotLabel(''); }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-[11px] font-black rounded-xl shadow hover:bg-amber-700 transition-all active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Foto hinzufügen
                                        </button>
                                    </div>
                                </div>

                                {/* Add Custom Form */}
                                <AnimatePresence>
                                    {showAddForm && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2">
                                                <Camera className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={newSlotLabel}
                                                    onChange={e => setNewSlotLabel(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') addCustomSlot(); if (e.key === 'Escape') setShowAddForm(false); }}
                                                    placeholder="Foto-Bezeichnung eingeben…"
                                                    className="flex-1 px-3 py-1.5 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                                />
                                                <button
                                                    onClick={addCustomSlot}
                                                    disabled={!newSlotLabel.trim()}
                                                    className="px-3 py-1.5 bg-amber-600 text-white text-[11px] font-black rounded-lg hover:bg-amber-700 transition-all disabled:opacity-40"
                                                >Hinzufügen</button>
                                                <button
                                                    onClick={() => setShowAddForm(false)}
                                                    className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-[11px] rounded-lg transition-all"
                                                >Abbrechen</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Ordered Slot List */}
                                <div className="divide-y divide-slate-50">
                                    {photoSlots.map((slot, idx) => (
                                        <div
                                            key={slot.id}
                                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                                slot.required ? 'bg-orange-50/40' : 'bg-white hover:bg-slate-50/50'
                                            }`}
                                        >
                                            {/* Position + Drag hint */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                                                    slot.required ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                            </div>

                                            {/* Label */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[12px] font-bold truncate ${
                                                    slot.required ? 'text-orange-800' : 'text-slate-700'
                                                }`}>{slot.label}</p>
                                                {slot.isCustom && (
                                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-wide">Benutzerdefiniert</span>
                                                )}
                                            </div>

                                            {/* Required toggle pill */}
                                            <button
                                                onClick={() => toggleSlotRequired(idx)}
                                                title={slot.required ? 'Als optional markieren' : 'Als Pflicht markieren'}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border transition-all active:scale-95 flex-shrink-0 ${
                                                    slot.required
                                                        ? 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600'
                                                        : 'bg-white border-slate-200 text-slate-400 hover:border-orange-400 hover:text-orange-500'
                                                }`}
                                            >
                                                {slot.required ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                                                {slot.required ? 'Pflicht' : 'Optional'}
                                            </button>

                                            {/* Up / Down arrows */}
                                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                                                <button
                                                    onClick={() => moveSlot(idx, -1)}
                                                    disabled={idx === 0}
                                                    title="Nach oben"
                                                    className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20 transition-all"
                                                >
                                                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                                </button>
                                                <button
                                                    onClick={() => moveSlot(idx, 1)}
                                                    disabled={idx === photoSlots.length - 1}
                                                    title="Nach unten"
                                                    className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20 transition-all"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                </button>
                                            </div>

                                            {/* Delete (custom only) */}
                                            {slot.isCustom && (
                                                <button
                                                    onClick={() => removeCustomSlot(idx)}
                                                    title="Entfernen"
                                                    className="p-1 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Footer note */}
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-start gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        Verwende ↑↓ zum Umsortieren. Klicke <strong>Reihenfolge speichern</strong> um Änderungen zu übernehmen. Pflichtfotos blockieren den Fortschritt wenn nicht hochgeladen.
                                    </p>
                                </div>
                            </div>

                            {/* Full Step 4 form for any other field toggles */}
                            <Step4_Damages adminMode onToggleRequired={handleToggle} />
                        </div>
                    )}
                    {activeTab === 'step5' && <Step5_Summary adminMode onToggleRequired={handleToggle} />}
                </motion.div>
            </AnimatePresence>
        );
    };


    return (
        <div className="max-w-[1400px] mx-auto space-y-3 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-600/20 p-2.5 rounded-2xl">
                            <Settings className="w-6 h-6 text-amber-600 animate-spin-slow" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {t('admin.requirements.title')}
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium ml-1">{t('admin.requirements.subtitle')}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full sm:w-auto">
                    <div className="relative group w-full sm:w-auto min-w-[200px]">
                        <select
                            value={appliedCustomerNumber}
                            onChange={(e) => setAppliedCustomerNumber(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white border-none rounded-xl text-sm font-black text-slate-700 focus:ring-2 focus:ring-amber-500/20 shadow-sm appearance-none cursor-pointer transition-all hover:bg-slate-50"
                        >
                            <option value="">{t('admin.kalkulation.systemDefault') || 'Systemstandard (Global)'}</option>
                            {customers.map(c => (
                                <option key={c.customerNumber} value={c.customerNumber}>
                                    {c.customerName || c.customerNumber} ({c.customerNumber})
                                </option>
                            ))}
                        </select>
                        <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button
                        onClick={async () => {
                            setLoading(true);
                            await fetchFieldConfigs(appliedCustomerNumber);
                            setLoading(false);
                            toast.success(t('admin.requirements.systemRefreshed'));
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('admin.requirements.syncData')}
                    </button>
                    <button
                        onClick={() => toast.success(t('admin.requirements.smartSaveActive'))}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-600 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-amber-600/25 hover:-translate-y-0.5 transition-all active:translate-y-0"
                    >
                        <Save className="w-4 h-4" />
                        {t('admin.requirements.publishChanges')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Sidebar Navigation */}
                <div className="xl:col-span-3 space-y-4 sticky top-24">
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                        {(['step1', 'step2', 'step3', 'step4', 'step5'] as const).map((tab) => {
                            const isActive = activeTab === tab;
                            const stepNum = tab.replace('step', '');
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`w-full group relative flex items-center justify-between p-4 rounded-2xl transition-all ${isActive
                                        ? 'bg-amber-600 text-white shadow-lg'
                                        : 'hover:bg-slate-50 text-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl transition-all ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                            }`}>
                                            {tab === 'step1' && <FileText className="w-5 h-5" />}
                                            {tab === 'step2' && <Smartphone className="w-5 h-5" />}
                                            {tab === 'step3' && <AlertCircle className="w-5 h-5" />}
                                            {tab === 'step4' && <Settings className="w-5 h-5" />}
                                            {tab === 'step5' && <CheckCircle2 className="w-5 h-5" />}
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-white/70' : 'opacity-60'}`}>{t('admin.requirements.section', { num: stepNum })}</p>
                                            <p className="font-bold text-sm">{t(`steps.step${stepNum}`, `Form Part ${stepNum}`)}</p>
                                        </div>
                                    </div>
                                    {isActive ? (
                                        <ChevronRight className="w-5 h-5 text-white/70" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-amber-600/50" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="xl:col-span-9 space-y-6">
                    <div className="relative group">
                        {/* Decorative background elements */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/20 to-amber-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>

                        <div className="relative bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
                            {/* Toolbar/Search */}
                            <div className="px-4 sm:px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded-full">
                                        <Layout className="w-3 h-3" />
                                        {activeTab.toUpperCase()}
                                    </div>
                                </div>
                                <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3 text-slate-400" />
                                    {t('admin.requirements.clickToToggle')}
                                </div>
                            </div>

                            {/* Form Area */}
                            <div className="p-2 md:p-3 lg:p-3">
                                <div className="max-w-5xl mx-auto space-y-1">
                                    <div className="flex items-center gap-3 sm:gap-4 py-1 border-b border-slate-100 mb-1 relative">
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-600/5 flex items-center justify-center text-amber-600 shadow-inner shrink-0"
                                        >
                                            {activeTab === 'step1' && <FileText className="w-6 h-6 sm:w-7 sm:h-7" />}
                                            {activeTab === 'step2' && <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />}
                                            {activeTab === 'step3' && <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" />}
                                            {activeTab === 'step4' && <Settings className="w-6 h-6 sm:w-7 sm:h-7" />}
                                            {activeTab === 'step5' && <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />}
                                        </motion.div>
                                        <div className="space-y-0.5 min-w-0">
                                            <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 sm:gap-3 truncate">
                                                {activeTab === 'step1' && t('steps.step1')}
                                                {activeTab === 'step2' && t('steps.step2')}
                                                {activeTab === 'step3' && t('steps.step3')}
                                                {activeTab === 'step4' && t('steps.step4')}
                                                {activeTab === 'step5' && t('steps.step5')}
                                                <CheckCircle2 className="w-5 h-5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </h2>
                                            <p className="text-slate-400 text-sm font-medium">{t('admin.requirements.fineTune')}</p>
                                        </div>
                                    </div>
                                    {renderStep()}
                                    <div className="h-20" /> {/* Extra padding for scroll */}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminFieldRequirements: React.FC = () => {
    const adminStore = useMemo(() => createAdminReportStore(), []);

    return (
        <ReportStoreProvider store={adminStore}>
            <AdminFieldRequirementsContent />
        </ReportStoreProvider>
    );
};

export default AdminFieldRequirements;
