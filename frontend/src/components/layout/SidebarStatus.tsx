import React from 'react';
import { useTranslation } from 'react-i18next';
import { useReportStore } from '../../store/reportStore';
import { formatCurrency } from '../../utils/currency';

const SidebarStatus: React.FC = () => {
    const { t } = useTranslation();
    const totalRepairCostBrutto = useReportStore(s => s.totalRepairCostBrutto);
    const totalMinderwertBrutto = useReportStore(s => s.totalMinderwertBrutto);
    const totalMinderwertNetto = useReportStore(s => s.totalMinderwertNetto);
    const damages = useReportStore(s => s.damages);
    const vehicleCategory = useReportStore(s => s.vehicleCategory);
    const karosseriestundensatz = useReportStore(s => s.karosseriestundensatz);
    const lackstundensatz = useReportStore(s => s.lackstundensatz);

    return (
        <>
            {/* Desktop sidebar */}
            {/* <div className="hidden lg:block w-64 bg-white shadow-lg rounded-lg p-3 sticky top-20 no-print">
                <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-wide">{t('step5.title')}</h3>
                <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">{t('sidebar.damages')}:</span><span className="font-bold">{damages.length}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{t('step2.vehicleCategory') || 'Vehicle Category'}:</span><span className="font-bold">{vehicleCategory ?? t('common.notSpecified')}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-gray-500">{t('sidebar.bodyRate')}:</span><span className="font-mono">{formatCurrency(karosseriestundensatz)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{t('sidebar.paintRate')}:</span><span className="font-mono">{formatCurrency(lackstundensatz)}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-gray-500">{t('sidebar.repairCostBrutto')}:</span><span className="font-mono font-bold text-error-red">{formatCurrency(-totalRepairCostBrutto())}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{t('sidebar.minderwertBrutto')}:</span><span className="font-mono font-bold text-error-red">{formatCurrency(-totalMinderwertBrutto())}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{t('sidebar.minderwertNetto')}:</span><span className="font-mono text-error-red">{formatCurrency(-totalMinderwertNetto())}</span></div>
                </div>
            </div> */}

            {/* Mobile bottom bar */}
            {/* <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t p-2 z-40 no-print">
                <div className="flex justify-around text-xs">
                    <div className="text-center"><span className="text-gray-500 block">{t('sidebar.damages')}</span><span className="font-bold">{damages.length}</span></div>
                    <div className="text-center"><span className="text-gray-500 block">{t('sidebar.mobileRepairCost')}</span><span className="font-mono font-bold text-error-red">{formatCurrency(-totalRepairCostBrutto())}</span></div>
                    <div className="text-center"><span className="text-gray-500 block">{t('sidebar.mobileMinderwert')}</span><span className="font-mono font-bold text-error-red">{formatCurrency(-totalMinderwertBrutto())}</span></div>
                </div>
            </div> */}
        </>
    );
};

export default SidebarStatus;
