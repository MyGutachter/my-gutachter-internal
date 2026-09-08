import React, { useState, useEffect } from 'react';
import { Paintbrush, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DrawPanelProps {
    onToggleDraw: (enabled: boolean, opts?: { color?: string; width?: number; opacity?: number }) => void;
}

const BRUSH_COLORS = [
    '#FACC15', // Yellow
    '#EF4444', // Red
    '#F97316', // Orange
    '#3B82F6', // Blue
    '#22C55E', // Green
    '#FFFFFF', // White
    '#000000', // Black
    '#EC4899', // Pink
    '#A855F7', // Purple
];

const PRESET_WIDTHS = [2, 5, 10, 16, 24];

export const DrawPanel: React.FC<DrawPanelProps> = ({ onToggleDraw }) => {
    const { t } = useTranslation();
    const [color, setColor] = useState('#FACC15');
    const [width, setWidth] = useState(5);

    useEffect(() => {
        onToggleDraw(true, { color, width });
        return () => {
            onToggleDraw(false);
        };
    }, [color, width, onToggleDraw]);

    return (
        <div className="p-4 space-y-5 w-64 sm:w-72 bg-[#181C26] border-r-2 border-orange-500/70 text-gray-200 select-none overflow-y-auto custom-scrollbar shadow-[4px_0_15px_rgba(249,115,22,0.15)]">
            <div className="flex items-center space-x-2 text-orange-400">
                <Paintbrush className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                    {t('imageEditor.draw.title', 'Freihand Malen')}
                </h3>
            </div>

            {/* Color swatches & custom color picker */}
            <div className="space-y-2 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                <div className="flex items-center justify-between text-xs font-semibold">
                    <label className="text-gray-400">{t('imageEditor.draw.color', 'Pinselfarbe')}</label>
                    <span className="font-mono text-[11px] text-gray-400 uppercase">{color}</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {BRUSH_COLORS.map((c) => {
                        const isSelected = color.toLowerCase() === c.toLowerCase();
                        return (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                        ? 'scale-110 border-orange-400 ring-2 ring-orange-500/50 shadow-md'
                                        : 'border-gray-700 hover:scale-105 hover:border-gray-500'
                                }`}
                                style={{ backgroundColor: c }}
                                title={c}
                            >
                                {isSelected && (
                                    <Check
                                        className={`w-3.5 h-3.5 drop-shadow ${
                                            ['#ffffff', '#facc15'].includes(c.toLowerCase())
                                                ? 'text-black'
                                                : 'text-white'
                                        }`}
                                    />
                                )}
                            </button>
                        );
                    })}

                    {/* Custom Color Input */}
                    <label
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-105 relative overflow-hidden bg-gradient-to-br from-red-500 via-green-500 to-blue-500 shadow-sm ${
                            !BRUSH_COLORS.map(c => c.toLowerCase()).includes(color.toLowerCase())
                                ? 'scale-110 border-orange-400 ring-2 ring-orange-500/50'
                                : 'border-gray-600 hover:border-gray-400'
                        }`}
                        title={t('imageEditor.shapes.customColor', 'Eigene Farbe wählen')}
                    >
                        <input
                            type="color"
                            value={color.startsWith('#') ? color : '#FACC15'}
                            onChange={(e) => setColor(e.target.value)}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        {!BRUSH_COLORS.map(c => c.toLowerCase()).includes(color.toLowerCase()) && (
                            <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                        )}
                    </label>
                </div>
            </div>

            {/* Width slider & quick buttons */}
            <div className="space-y-2.5 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-400">{t('imageEditor.draw.width', 'Pinselstärke')}</span>
                    <span className="text-orange-400 font-bold">{width}px</span>
                </div>

                <div className="flex items-center gap-1.5">
                    {PRESET_WIDTHS.map((pw) => (
                        <button
                            key={pw}
                            onClick={() => setWidth(pw)}
                            className={`flex-1 py-1 rounded text-[11px] font-semibold transition-all ${
                                width === pw
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm'
                                    : 'bg-gray-950/60 text-gray-400 hover:text-gray-200 border border-gray-800'
                            }`}
                        >
                            {pw}px
                        </button>
                    ))}
                </div>

                <input
                    type="range"
                    min="1"
                    max="40"
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value))}
                    className="w-full accent-orange-500"
                />
            </div>

            <div className="pt-2 text-xs text-gray-400 italic">
                {t('imageEditor.draw.desc', 'Zeichnen Sie direkt mit der Maus oder dem Touchscreen auf das Bild.')}
            </div>
        </div>
    );
};
