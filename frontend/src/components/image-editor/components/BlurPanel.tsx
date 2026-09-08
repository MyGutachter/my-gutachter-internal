import React from 'react';
import { Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BlurPanelProps {
    globalBlur: number;
    onApplyBlur: (blurVal: number) => void;
}

export const BlurPanel: React.FC<BlurPanelProps> = ({ globalBlur, onApplyBlur }) => {
    const { t } = useTranslation();

    return (
        <div className="p-4 space-y-5 w-64 sm:w-72 bg-[#181C26] border-r-2 border-orange-500/70 text-gray-200 select-none overflow-y-auto custom-scrollbar shadow-[4px_0_15px_rgba(249,115,22,0.15)]">
            <div className="flex items-center space-x-2 text-orange-400">
                <Droplets className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                    {t('imageEditor.blur.title', 'Weichzeichnen (Blur)')}
                </h3>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-400">{t('imageEditor.blur.totalBlur', 'Gesamte Bildunschärfe')}</span>
                    <span className="text-orange-400">{globalBlur}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={globalBlur}
                    onChange={(e) => onApplyBlur(parseInt(e.target.value))}
                    className="w-full accent-orange-500"
                />
            </div>

            <div className="pt-4 border-t border-gray-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {t('imageEditor.blur.brushTitle', 'Selektiver Pinsel-Blur')}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                    {t('imageEditor.blur.brushDesc', 'Verwenden Sie das Malen-Tool mit niedriger Deckkraft oder Grautönen, um Kennzeichen oder Gesichter unkenntlich zu machen.')}
                </p>
            </div>
        </div>
    );
};
