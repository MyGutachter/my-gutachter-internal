import React, { useState } from 'react';
import { SHAPE_PRESETS, type ShapePreset } from '../config/presets';
import { useTranslation } from 'react-i18next';

interface ShapePresetGridProps {
    onSelectPreset: (preset: ShapePreset) => void;
    activeColor?: string;
    activeFillMode?: 'filled' | 'outline';
}

export const ShapePresetGrid: React.FC<ShapePresetGridProps> = ({
    onSelectPreset,
    activeColor = '#FACC15',
    activeFillMode = 'filled',
}) => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'basic' | 'lines' | 'symbols'>('all');

    const filteredPresets = selectedCategory === 'all'
        ? SHAPE_PRESETS
        : SHAPE_PRESETS.filter(p => p.category === selectedCategory);

    // Helper to render inline SVG icon preview for shape swatches
    const renderShapeIcon = (preset: ShapePreset) => {
        const color = activeColor || '#FACC15';
        const isOutline = preset.fill === 'transparent' || (activeFillMode === 'outline' && !['line', 'vert_line', 'arrow_line', 'double_arrow', 'dashed_line'].includes(preset.type));
        const fillColor = isOutline ? 'none' : color;
        const strokeColor = color;

        switch (preset.type) {
            case 'rect':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <rect
                            x="4"
                            y="8"
                            width="24"
                            height="16"
                            rx="1"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2.5"
                        />
                    </svg>
                );

            case 'rounded_rect':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <rect
                            x="4"
                            y="8"
                            width="24"
                            height="16"
                            rx="5"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2.5"
                        />
                    </svg>
                );

            case 'circle':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <circle
                            cx="16"
                            cy="16"
                            r="10"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2.5"
                        />
                    </svg>
                );

            case 'ellipse':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <ellipse
                            cx="16"
                            cy="16"
                            rx="12"
                            ry="7"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2.5"
                        />
                    </svg>
                );

            case 'triangle':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <polygon
                            points="16,6 27,24 5,24"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2.5"
                        />
                    </svg>
                );

            case 'line':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <line x1="4" y1="16" x2="28" y2="16" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                    </svg>
                );

            case 'vert_line':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <line x1="16" y1="4" x2="16" y2="28" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                    </svg>
                );

            case 'arrow_line':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <line x1="5" y1="25" x2="23" y2="7" stroke={strokeColor} strokeWidth="3.5" strokeLinecap="round" />
                        <polygon points="25,5 17,7 23,13" fill={strokeColor} />
                    </svg>
                );

            case 'double_arrow':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <line x1="7" y1="16" x2="25" y2="16" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
                        <polygon points="4,16 10,12 10,20" fill={strokeColor} />
                        <polygon points="28,16 22,12 22,20" fill={strokeColor} />
                    </svg>
                );

            case 'star':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <polygon
                            points="16,4 19.5,12 28,12.5 21.5,18 23.5,26.5 16,22 8.5,26.5 10.5,18 4,12.5 12.5,12"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2"
                        />
                    </svg>
                );

            case 'diamond':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <polygon
                            points="16,4 27,16 16,28 5,16"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2"
                        />
                    </svg>
                );

            case 'cross':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <path
                            d="M 13 4 L 19 4 L 19 13 L 28 13 L 28 19 L 19 19 L 19 28 L 13 28 L 13 19 L 4 19 L 4 13 L 13 13 Z"
                            fill={fillColor === 'none' ? strokeColor : fillColor}
                            stroke={strokeColor}
                            strokeWidth="1.5"
                        />
                    </svg>
                );

            case 'hexagon':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <polygon
                            points="10,5 22,5 28,16 22,27 10,27 4,16"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2"
                        />
                    </svg>
                );

            case 'callout':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <path
                            d="M 6 7 L 26 7 C 28 7 28 9 28 9 L 28 20 C 28 22 26 22 26 22 L 18 22 L 12 27 L 14 22 L 6 22 C 4 22 4 20 4 20 L 4 9 C 4 7 6 7 6 7 Z"
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2"
                        />
                    </svg>
                );

            case 'marker_pin':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <path
                            d="M 16 4 C 11 4 8 8 8 13 C 8 20 16 28 16 28 C 16 28 24 20 24 13 C 24 8 21 4 16 4 Z"
                            fill={fillColor === 'none' ? 'none' : strokeColor}
                            stroke={strokeColor}
                            strokeWidth="2"
                        />
                        <circle cx="16" cy="12" r="3" fill={fillColor === 'none' ? strokeColor : '#181C26'} />
                    </svg>
                );

            case 'dashed_rect':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <rect
                            x="4"
                            y="8"
                            width="24"
                            height="16"
                            rx="2"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            strokeDasharray="4 3"
                        />
                    </svg>
                );

            case 'dashed_circle':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <circle
                            cx="16"
                            cy="16"
                            r="10"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            strokeDasharray="4 3"
                        />
                    </svg>
                );

            case 'dashed_line':
                return (
                    <svg className="w-6 h-6" viewBox="0 0 32 32">
                        <line x1="4" y1="16" x2="28" y2="16" stroke={strokeColor} strokeWidth="3" strokeDasharray="4 3" />
                    </svg>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {t('imageEditor.sticker.shapePresets', 'Formen-Presets')}
                </h4>
                <span className="text-[10px] text-gray-500">
                    {filteredPresets.length} {t('imageEditor.shapes.count', 'Formen')}
                </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-lg border border-gray-800 text-[11px]">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`flex-1 py-1 rounded transition-colors ${
                        selectedCategory === 'all'
                            ? 'bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    {t('imageEditor.shapes.categoryAll', 'Alle')}
                </button>
                <button
                    onClick={() => setSelectedCategory('basic')}
                    className={`flex-1 py-1 rounded transition-colors ${
                        selectedCategory === 'basic'
                            ? 'bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    {t('imageEditor.shapes.categoryBasic', 'Basis')}
                </button>
                <button
                    onClick={() => setSelectedCategory('lines')}
                    className={`flex-1 py-1 rounded transition-colors ${
                        selectedCategory === 'lines'
                            ? 'bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    {t('imageEditor.shapes.categoryLines', 'Linien')}
                </button>
                <button
                    onClick={() => setSelectedCategory('symbols')}
                    className={`flex-1 py-1 rounded transition-colors ${
                        selectedCategory === 'symbols'
                            ? 'bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    {t('imageEditor.shapes.categorySymbols', 'Symbole')}
                </button>
            </div>

            {/* Shape Grid */}
            <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {filteredPresets.map((preset) => {
                    const label = preset.labelKey ? t(preset.labelKey, preset.label) : preset.label;
                    return (
                        <button
                            key={preset.id}
                            onClick={() => onSelectPreset(preset)}
                            className="h-12 bg-gray-900/90 hover:bg-gray-800 border border-gray-800/80 hover:border-gray-600 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 group shadow-sm relative"
                            title={label}
                        >
                            <div className="group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.4)] transition-all">
                                {renderShapeIcon(preset)}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
