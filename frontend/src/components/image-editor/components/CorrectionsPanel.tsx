import React from 'react';
import { Sun, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CorrectionsState } from '../hooks/useFabricCanvas';

interface CorrectionsPanelProps {
    corrections: CorrectionsState;
    onChangeCorrections: (corrections: Partial<CorrectionsState>) => void;
    onCommitCorrections?: () => void;
}

export const CorrectionsPanel: React.FC<CorrectionsPanelProps> = ({
    corrections,
    onChangeCorrections,
    onCommitCorrections,
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
        onCommitCorrections?.();
    };

    const renderSlider = (
        label: string,
        value: number = 0,
        onChange: (val: number) => void,
        min = -1,
        max = 1,
        step = 0.01
    ) => {
        const displayVal = Math.round((value ?? 0) * 100);
        const isModified = Math.abs(displayVal) > 0;

        return (
            <div className="space-y-1.5 group">
                <div className="flex justify-between text-xs font-medium text-gray-300">
                    <span
                        className="cursor-pointer hover:text-orange-300 transition-colors select-none"
                        title={t('imageEditor.corrections.doubleClickReset', 'Doppelklick zum Zurücksetzen')}
                        onDoubleClick={() => {
                            onChange(0);
                            onCommitCorrections?.();
                        }}
                    >
                        {label}
                    </span>
                    <span
                        className={`text-[11px] font-mono cursor-pointer px-1.5 py-0.5 rounded transition-colors ${
                            isModified
                                ? "text-orange-400 font-bold bg-orange-500/10 border border-orange-500/30"
                                : "text-gray-400"
                        }`}
                        title={t('imageEditor.corrections.doubleClickReset', 'Doppelklick zum Zurücksetzen')}
                        onDoubleClick={() => {
                            onChange(0);
                            onCommitCorrections?.();
                        }}
                    >
                        {displayVal > 0 ? `+${displayVal}` : displayVal}
                    </span>
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value ?? 0}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    onPointerUp={() => onCommitCorrections?.()}
                    onKeyUp={() => onCommitCorrections?.()}
                    onTouchEnd={() => onCommitCorrections?.()}
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
export default CorrectionsPanel;
