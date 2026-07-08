import { ArrowRight, FileText, LayoutGrid, ListChecks, Receipt, Save, Settings, ShieldCheck, Users } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AdminFieldRequirements from '../components/admin/AdminFieldRequirements';
import AdminKalkulationSettings from '../components/admin/AdminKalkulationSettings';
import AdminReportList from '../components/admin/AdminReportList';
import AdminUserManagement from '../components/admin/AdminUserManagement';
import AppFooter from '../components/layout/AppFooter';
import AppHeader from '../components/layout/AppHeader';
import { useReportStore } from '../store/reportStore';
import api from '../utils/api';

export const AdminPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'kalkulation' | 'mandatory' | 'reports' | 'users' | 'access'>('users');
    const store = useReportStore();

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeSection]);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const config = {
                ...store.globalConfig,
                karosseriestundensatz: store.karosseriestundensatz,
                lackstundensatz: store.lackstundensatz,
                lackberechnungsart: store.lackberechnungsart,
                vehicleCategory: store.vehicleCategory,
            };
            await api.post('/config', config);
            toast.success(t('admin.saveSuccess'));
            store.setGlobalConfig(config as any);
        } catch (error) {
            console.error('Failed to save config', error);
            toast.error(t('admin.saveError'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
            <AppHeader />

            <main className="flex-1 container mx-auto px-2 sm:px-4 lg:px-4 py-2">
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                                <div className="bg-amber-600/20 p-1.5 rounded-2xl">
                                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                                </div>
                                {t('admin.title')}
                            </h1>
                            <p className="text-slate-500 font-medium md:ml-10">{t('admin.subtitle')}</p>
                        </div>

                        <div className="flex overflow-x-auto lg:flex-wrap items-center gap-2 p-1.5 bg-slate-200/40 backdrop-blur-sm rounded-[1.25rem] border border-slate-200/50 w-full lg:w-fit no-scrollbar">
                            <button
                                onClick={() => setActiveSection('kalkulation')}
                                className={`flex-shrink-0 flex items-center gap-2.5 px-4 md:px-6 py-2.5 md:py-3 rounded-[1rem] md:rounded-2xl text-sm font-black transition-all duration-300 ${activeSection === 'kalkulation' ? 'bg-white text-amber-600 shadow-lg shadow-amber-600/10 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                            >
                                <Settings className={`w-4 h-4 ${activeSection === 'kalkulation' ? 'text-amber-600' : 'text-slate-400'}`} />
                                <span className="whitespace-nowrap">{t('admin.calculationConfig')}</span>
                            </button>
                            <button
                                onClick={() => setActiveSection('mandatory')}
                                className={`flex-shrink-0 flex items-center gap-2.5 px-4 md:px-6 py-2.5 md:py-3 rounded-[1rem] md:rounded-2xl text-sm font-black transition-all duration-300 ${activeSection === 'mandatory' ? 'bg-white text-amber-600 shadow-lg shadow-amber-600/10 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                            >
                                <ListChecks className={`w-5 h-5 ${activeSection === 'mandatory' ? 'text-amber-600' : 'text-slate-400'}`} />
                                <span className="whitespace-nowrap">{t('admin.fieldRequirements', 'Mandatory Fields')}</span>
                            </button>
                            <button
                                onClick={() => setActiveSection('reports')}
                                className={`flex-shrink-0 flex items-center gap-2.5 px-4 md:px-6 py-2.5 md:py-3 rounded-[1rem] md:rounded-2xl text-sm font-black transition-all duration-300 ${activeSection === 'reports' ? 'bg-white text-amber-600 shadow-lg shadow-amber-600/10 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                            >
                                <FileText className={`w-5 h-5 ${activeSection === 'reports' ? 'text-amber-600' : 'text-slate-400'}`} />
                                <span className="whitespace-nowrap">{t('admin.expertReports')}</span>
                            </button>
                            <button
                                onClick={() => setActiveSection('users')}
                                className={`flex-shrink-0 flex items-center gap-2.5 px-4 md:px-6 py-2.5 md:py-3 rounded-[1rem] md:rounded-2xl text-sm font-black transition-all duration-300 ${activeSection === 'users' ? 'bg-white text-amber-600 shadow-lg shadow-amber-600/10 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                            >
                                <Users className={`w-5 h-5 ${activeSection === 'users' ? 'text-amber-600' : 'text-slate-400'}`} />
                                <span className="whitespace-nowrap">{t('admin.roleManagement')}</span>
                            </button>
                            <button
                                onClick={() => setActiveSection('access')}
                                className={`flex-shrink-0 flex items-center gap-2.5 px-4 md:px-6 py-2.5 md:py-3 rounded-[1rem] md:rounded-2xl text-sm font-black transition-all duration-300 ${activeSection === 'access' ? 'bg-white text-primary shadow-lg shadow-primary/10 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                            >
                                <LayoutGrid className={`w-5 h-5 ${activeSection === 'access' ? 'text-primary' : 'text-slate-400'}`} />
                                <span className="whitespace-nowrap">{t('admin.appAccess')}</span>
                            </button>
                        </div>


                    </div>

                    <div className="animate-fade-in">
                        {activeSection === 'kalkulation' && (
                            <section className="bg-white rounded-3xl md:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-4 md:p-8 lg:p-10">
                                <AdminKalkulationSettings />
                                <div className="mt-10 flex justify-end">
                                    <button
                                        onClick={handleSaveConfig}
                                        disabled={isSaving}
                                        className={`bg-amber-600 text-white flex items-center justify-center gap-3 px-10 py-3.5 rounded-2xl shadow-xl hover:bg-amber-700 hover:shadow-xl hover:translate-y-0 active:scale-100 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        <Save className={`w-5 h-5 ${isSaving ? 'animate-pulse' : ''}`} />
                                        <span className="font-black tracking-tight">
                                            {isSaving ? t('common.saving') : t('common.saveSettings')}
                                        </span>
                                    </button>
                                </div>
                            </section>
                        )}

                        {activeSection === 'mandatory' && (
                            <div className="space-y-6">
                                <AdminFieldRequirements />
                            </div>
                        )}

                        {activeSection === 'reports' && (
                            <section className="bg-white rounded-3xl md:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-4 md:p-8 lg:p-10">
                                <AdminReportList />
                            </section>
                        )}

                        {activeSection === 'users' && (
                            <section className="bg-white rounded-3xl md:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-4 md:p-8 lg:p-10">
                                <AdminUserManagement />
                            </section>
                        )}

                        {activeSection === 'access' && (
                            <section className="animate-fade-in space-y-6">
                                <div className="bg-white rounded-3xl md:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-4 md:p-8 lg:p-10">
                                    <div className="mb-8">
                                        <h2 className="text-xl font-black text-slate-800">{t('admin.appAccess')}</h2>
                                        <p className="text-slate-500 font-medium">{t('admin.appAccessSubtitle')}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            {
                                                title: t('admin.accessOrders'),
                                                desc: t('admin.accessOrdersDesc'),
                                                icon: FileText,
                                                path: '/report',
                                                color: 'bg-blue-50 text-blue-600'
                                            },
                                            {
                                                title: t('admin.accessReport'),
                                                desc: t('admin.accessReportDesc'),
                                                icon: Save,
                                                path: '/report/form',
                                                color: 'bg-emerald-50 text-emerald-600'
                                            },
                                            {
                                                title: t('admin.accessList'),
                                                desc: t('admin.accessListDesc'),
                                                icon: ListChecks,
                                                path: '/report/list',
                                                color: 'bg-amber-50 text-amber-600'
                                            },
                                            {
                                                title: t('admin.accessBilling'),
                                                desc: t('admin.accessBillingDesc'),
                                                icon: Receipt,
                                                path: '/report/billing',
                                                color: 'bg-purple-50 text-purple-600'
                                            }
                                        ].map((item) => (
                                             <button
                                                key={item.path}
                                                onClick={() => navigate(item.path)}
                                                className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-5 sm:p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:border-primary/20 text-left"
                                            >
                                                <div className={`p-4 rounded-2xl ${item.color} transition-transform duration-300 group-hover:scale-110`}>
                                                    <item.icon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-black text-slate-800 group-hover:text-primary transition-colors">{item.title}</h3>
                                                    <p className="text-sm text-slate-500 font-medium line-clamp-2 sm:line-clamp-1">{item.desc}</p>
                                                </div>
                                                <ArrowRight className="hidden sm:block w-5 h-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>

            <AppFooter />
        </div>
    );
};
