import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore';
import { ClipboardList, Car, Search, AlertTriangle, BarChart3 } from 'lucide-react';

const MobileNav: React.FC = () => {
    const { t } = useTranslation();
    // const { currentStep, setCurrentStep } = useUIStore();

    const steps = [
        { num: 1, icon: ClipboardList, label: t('steps.step1').split(' ')[0] },
        { num: 2, icon: Car, label: t('steps.step2').split(' ')[0] },
        { num: 3, icon: Search, label: t('steps.step3').split(' ')[0] },
        { num: 4, icon: AlertTriangle, label: t('steps.step4').split(' ')[0] },
        { num: 5, icon: BarChart3, label: t('steps.step5').split(' ')[0] },
    ];

    return (
        <></>
        // <nav className="md:hidden fixed bottom-14 left-0 right-0 bg-white border-t z-30 no-print">
        //     <div className="flex justify-around py-1">
        //         {steps.map(s => {
        //             const Icon = s.icon;
        //             return (
        //                 <button
        //                     key={s.num}
        //                     onClick={() => setCurrentStep(s.num)}
        //                     className={`flex flex-col items-center py-1 px-2 text-[10px] transition-colors
        //         ${currentStep === s.num ? 'text-primary font-bold' : 'text-gray-400'}`}
        //                 >
        //                     <Icon className="w-4 h-4" />
        //                     <span>{s.label}</span>
        //                 </button>
        //             );
        //         })}
        //     </div>
        // </nav>
    );
};

export default MobileNav;
