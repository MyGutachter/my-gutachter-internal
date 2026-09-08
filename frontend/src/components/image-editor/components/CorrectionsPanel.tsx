import React from 'react';
import { Sun, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CorrectionsState } from '../hooks/useFabricCanvas';

interface CorrectionsPanelProps {
    corrections: CorrectionsState;
    onChangeCorrections: (corrections: Partial<CorrectionsState>) => void;
}

export const CorrectionsPanel: React.FC<CorrectionsPanelProps> = ({
    corrections,
    onChangeCorrections,
}) => {
    const { t } = useTranslation();

    const handleReset = () => {
        onChangeCorrections({
            brightness: 0,
            saturation: 0,
            contrast: 0,
            gamma: 0,
            clarity: 0,
            exposure: 0,
            shadows: 0,
            highlights: 0,
        });
    };

    const renderSlider = (
        label: string,
        value: number,
        onChange: (val: number) => void,
        min = -1,
        max = 1,
        step = 0.05
    ) => {
        const displayVal = Math.round(value * 100);
        return (
            <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-gray-300">
                    <span>{label}</span>
                    <span className={displayVal !== 0 ? "text-orange-400 font-bold" : "text-gray-400"}>
                        {displayVal}
                    </span>
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700/80 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-colors"
                />
            </div>
        );
    };

    return (
        <div className="p-4 space-y-6 w-64 sm:w-72 bg-[#181C26] border-r-2 border-orange-500/70 text-gray-200 select-none overflow-y-auto custom-scrollbar shadow-[4px_0_15px_rgba(249,115,22,0.15)] max-h-full">
            {/* Header & Reset Button */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2 text-orange-400">
                    <Sun className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                        {t('imageEditor.corrections.title', 'KORREKTUREN')}
                    </h3>
                </div>
                <button
                    onClick={handleReset}
                    className="text-xs font-bold text-gray-400 hover:text-orange-400 flex items-center space-x-1 px-2.5 py-1 rounded border border-gray-700 hover:border-orange-500/50 bg-gray-800/60 hover:bg-gray-800 transition-all uppercase tracking-wider"
                    title={t('imageEditor.corrections.reset', 'ZURÜCKSETZEN')}
                >
                    <RefreshCcw className="w-3 h-3" />
                    <span>{t('imageEditor.corrections.reset', 'ZURÜCKSETZEN')}</span>
                </button>
            </div>

            {/* Section 1: GRUNDLAGEN */}
            <div className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400/90 border-b border-gray-800/60 pb-1">
                    {t('imageEditor.corrections.basics', 'GRUNDLAGEN')}
                </h4>
                <div className="space-y-3.5 pl-1">
                    {renderSlider(
                        t('imageEditor.corrections.brightness', 'Helligkeit'),
                        corrections.brightness,
                        (val) => onChangeCorrections({ brightness: val })
                    )}
                    {renderSlider(
                        t('imageEditor.corrections.saturation', 'Sättigung'),
                        corrections.saturation,
                        (val) => onChangeCorrections({ saturation: val })
                    )}
                    {renderSlider(
                        t('imageEditor.corrections.contrast', 'Kontrast'),
                        corrections.contrast,
                        (val) => onChangeCorrections({ contrast: val })
                    )}
                    {renderSlider(
                        t('imageEditor.corrections.gamma', 'Gamma'),
                        corrections.gamma,
                        (val) => onChangeCorrections({ gamma: val })
                    )}
                </div>
            </div>

            {/* Section 2: FEINHEITEN */}
            <div className="space-y-4 pt-1">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400/90 border-b border-gray-800/60 pb-1">
                    {t('imageEditor.corrections.fineDetails', 'FEINHEITEN')}
                </h4>
                <div className="space-y-3.5 pl-1">
                    {renderSlider(
                        t('imageEditor.corrections.clarity', 'Klarheit'),
                        corrections.clarity,
                        (val) => onChangeCorrections({ clarity: val })
                    )}
                    {renderSlider(
                        t('imageEditor.corrections.exposure', 'Belichtung'),
                        corrections.exposure,
                        (val) => onChangeCorrections({ exposure: val })
                    )}
                    {renderSlider(
                        t('imageEditor.corrections.shadows', 'Schatten'),
                        corrections.shadows,
                        (val) => onChangeCorrections({ shadows: val })
                    )}
                    {renderSlider(
                        t('imageEditor.corrections.highlights', 'Lichter'),
                        corrections.highlights,
                        (val) => onChangeCorrections({ highlights: val })
                    )}
                </div>
            </div>
        </div>
    );
};

