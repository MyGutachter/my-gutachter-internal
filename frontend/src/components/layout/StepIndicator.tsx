import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore';
import { useReportStore } from '../../store/reportStore';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { scrollToElement } from '../../utils/scroll';

const StepIndicator: React.FC = () => {
    const { t } = useTranslation();
    const { currentStep, setCurrentStep, setShowValidationErrors } = useUIStore();
    const damages = useReportStore(s => s.damages);
    const getStepValidationErrors = useReportStore(s => s.getStepValidationErrors);

    const steps = [
        { num: 1, label: t('steps.step1') },
        { num: 2, label: t('steps.step2') },
        { num: 3, label: t('steps.step3') },
        { num: 4, label: t('steps.step4') },
        { num: 5, label: t('steps.step5') },
    ];

    const handleStepClick = (targetStep: number) => {
        if (targetStep <= currentStep) {
            setCurrentStep(targetStep);
            return;
        }

        // Validate intermediate steps from currentStep to targetStep - 1
        for (let s = currentStep; s < targetStep; s++) {
            const errors = getStepValidationErrors(s);
            if (Object.keys(errors).length > 0) {
                // Navigate to the first invalid step
                setCurrentStep(s);
                setShowValidationErrors(true);
                toast.error(t('common.validationError'));

                // Scroll and focus first invalid field after a short delay to allow DOM to render
                setTimeout(() => {
                    const firstErrorKey = Object.keys(errors)[0];
                    const element = document.querySelector(`[data-fieldname="${firstErrorKey}"]`);
                    if (element) {
                        scrollToElement(element as HTMLElement);
                        const focusable = element.querySelector('input, select, textarea, [tabindex]');
                        if (focusable) {
                            (focusable as HTMLElement).focus();
                        }
                    }
                }, 200);
                return;
            }
        }

        // All intermediate steps are valid
        setCurrentStep(targetStep);
    };

    return (
        <div className="no-print">
            {/* Desktop */}
            <div className="hidden @3xl:flex items-center justify-center gap-2 py-2 bg-white shadow-sm">
                {steps.map((step, i) => {
                    return (
                        <React.Fragment key={step.num}>
                            {i > 0 && <div className={`w-8 h-0.5 ${step.num <= currentStep ? 'bg-primary' : 'bg-gray-300'}`} />}
                            <button
                                onClick={() => handleStepClick(step.num)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105
                    ${step.num === currentStep ? 'step-active' : step.num < currentStep ? 'step-completed' : 'step-inactive'}`}
                            >
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-current">
                                    {step.num < currentStep ? <Check className="w-3 h-3" /> : step.num}
                                </span>
                                <span className="hidden @5xl:inline">{step.label}</span>
                                {step.num === 4 && damages.length > 0 && (
                                    <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{damages.length}</span>
                                )}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Mobile compact */}
            <div className="@3xl:hidden flex items-center justify-center gap-1 py-2 bg-white shadow-sm px-2">
                {steps.map((step, i) => {
                    return (
                        <React.Fragment key={step.num}>
                            {i > 0 && <div className={`flex-1 h-0.5 ${step.num <= currentStep ? 'bg-primary' : 'bg-gray-300'}`} />}
                            <button
                                onClick={() => handleStepClick(step.num)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-105
                    ${step.num === currentStep ? 'step-active' : step.num < currentStep ? 'step-completed' : 'step-inactive'}`}
                            >
                                {step.num < currentStep ? <Check className="w-3 h-3" /> : step.num}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default StepIndicator;
