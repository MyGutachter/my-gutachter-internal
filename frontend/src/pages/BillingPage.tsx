import React from 'react';
import AppHeader from '../components/layout/AppHeader';
import AppFooter from '../components/layout/AppFooter';
import { Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BillingPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
            <AppHeader />

            <main className="flex-1 container mx-auto px-2 sm:px-4 lg:px-4 py-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <Receipt className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-4">
                            {t('billing.title')}
                        </h1>
                        <p className="text-slate-500 max-w-lg font-medium text-lg leading-relaxed">
                            {t('billing.description')}
                        </p>
                    </div>
                </div>
            </main>

            <AppFooter />
        </div>
    );
};

export default BillingPage;
