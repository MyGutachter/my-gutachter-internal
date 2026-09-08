import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { FILTER_CATEGORIES, type FilterCategory } from '../config/presets';
import { useTranslation } from 'react-i18next';

interface FilterPanelProps {
    activeFilter: string;
    onApplyFilter: (filterId: string) => void;
    currentImageUrl?: string;
}

const getCssFilter = (presetId: string): string => {
    switch (presetId) {
        case 'none':
            return 'none';
        case 'duotone_purple_yellow':
            return 'hue-rotate(240deg) saturate(2)';
        case 'duotone_blue_red':
            return 'hue-rotate(180deg) contrast(1.4)';
        case 'duotone_magenta_cyan':
            return 'hue-rotate(280deg) saturate(1.8)';
        case 'duotone_dark_gold':
            return 'sepia(0.9) brightness(0.9) contrast(1.3)';
        case 'bw_grayscale':
        case 'grayscale':
            return 'grayscale(1)';
        case 'bw_high_contrast':
            return 'grayscale(1) contrast(1.8)';
        case 'bw_noir':
            return 'grayscale(1) contrast(2) brightness(0.8)';
        case 'bw_sepia_mono':
            return 'grayscale(1) sepia(0.6)';
        case 'bw_silvertone':
            return 'grayscale(1) brightness(1.2) contrast(1.1)';
        case 'vintage_polaroid':
        case 'vintage':
            return 'sepia(0.5) contrast(1.2) brightness(1.1)';
        case 'vintage_sunny70s':
            return 'sepia(0.3) saturate(1.6) hue-rotate(-10deg)';
        case 'vintage_oldtimer':
            return 'sepia(0.8) hue-rotate(-20deg) contrast(1.3)';
        case 'vintage_inferno':
            return 'hue-rotate(40deg) contrast(1.5) saturate(1.8)';
        case 'vintage_snappy':
            return 'saturate(2) contrast(1.3)';
        case 'smooth_soft':
            return 'brightness(1.1) contrast(0.9)';
        case 'smooth_glamour':
            return 'brightness(1.15) saturate(1.3)';
        case 'smooth_matte':
            return 'contrast(0.75) brightness(1.05)';
        case 'smooth_faded':
            return 'saturate(0.6) contrast(0.85)';
        case 'cold_ice':
        case 'cold':
            return 'hue-rotate(-30deg) brightness(1.1)';
        case 'cold_cyan':
            return 'hue-rotate(-40deg) saturate(1.4)';
        case 'cold_deep_blue':
            return 'hue-rotate(-60deg) contrast(1.3)';
        case 'cold_nordic':
            return 'hue-rotate(-20deg) saturate(0.7) contrast(1.1)';
        case 'warm_sunset':
            return 'hue-rotate(15deg) saturate(1.6) brightness(1.1)';
        case 'warm_amber':
            return 'sepia(0.6) brightness(1.1) saturate(1.4)';
        case 'warm_golden':
            return 'hue-rotate(10deg) brightness(1.2) saturate(1.5)';
        case 'warm_summer':
            return 'saturate(1.8) brightness(1.1)';
        case 'legacy_invert':
        case 'invert':
            return 'invert(1)';
        case 'legacy_technicolor':
            return 'contrast(1.6) saturate(2)';
        case 'legacy_kodachrome':
            return 'saturate(1.5) contrast(1.3)';
        case 'legacy_techno':
            return 'invert(1) contrast(1.4)';
        default:
            return 'none';
    }
};

const getCategoryCssFilter = (catId: string): string => {
    switch (catId) {
        case 'none':
            return 'none';
        case 'duotone':
            return 'hue-rotate(240deg) saturate(2)';
        case 'bw':
            return 'grayscale(1)';
        case 'vintage':
            return 'sepia(0.6) contrast(1.3)';
        case 'smooth':
            return 'brightness(1.1) contrast(0.9)';
        case 'cold':
            return 'hue-rotate(-40deg) saturate(1.4)';
        case 'warm':
            return 'hue-rotate(15deg) saturate(1.6)';
        case 'legacy':
            return 'invert(1)';
        default:
            return 'none';
    }
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
    activeFilter,
    onApplyFilter,
    currentImageUrl,
}) => {
    const { t } = useTranslation();
    // Default expanded category to 'vintage'
    const [expandedCategory, setExpandedCategory] = useState<string | null>('vintage');

    const handleCategoryClick = (cat: FilterCategory) => {
        if (cat.subFilters.length === 1) {
            onApplyFilter(cat.subFilters[0].id);
        } else {
            setExpandedCategory(expandedCategory === cat.id ? null : cat.id);
        }
    };

    return (
        <div className="p-4 space-y-4 w-64 sm:w-72 bg-[#181C26] border-r-2 border-orange-500/70 text-gray-200 select-none overflow-y-auto custom-scrollbar shadow-[4px_0_15px_rgba(249,115,22,0.15)] max-h-full">
            <div className="flex items-center space-x-2 text-orange-400">
                <Sliders className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                    {t('imageEditor.filters.title', 'FILTER')}
                </h3>
            </div>

            {/* Stacked Categories List with Live Image Previews */}
            <div className="space-y-2.5">
                {FILTER_CATEGORIES.map((cat) => {
                    const isExpanded = expandedCategory === cat.id;
                    const hasActiveSubFilter = cat.subFilters.some((sub) => sub.id === activeFilter);

                    return (
                        <div key={cat.id} className="space-y-1.5">
                            {/* Category Header Card with Live Image Preview */}
                            <button
                                onClick={() => handleCategoryClick(cat)}
                                className={`w-full h-16 rounded-xl border flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md relative overflow-hidden group ${hasActiveSubFilter
                                        ? 'border-orange-400 ring-2 ring-orange-500/50 shadow-[0_0_14px_rgba(249,115,22,0.35)]'
                                        : 'border-white/15 hover:border-white/40'
                                    }`}
                            >
                                {/* Direct Image Preview Background */}
                                {currentImageUrl ? (
                                    <img
                                        src={currentImageUrl}
                                        alt={cat.label}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        style={{ filter: getCategoryCssFilter(cat.id) }}
                                    />
                                ) : (
                                    <div className={`absolute inset-0 w-full h-full bg-gradient-to-r ${cat.coverGradient}`} />
                                )}

                                {/* Dark Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/75 flex items-center justify-between px-4 z-10">
                                    <span className="text-sm font-bold tracking-wide text-white drop-shadow-md flex items-center space-x-2">
                                        <span>{cat.label}</span>
                                        {hasActiveSubFilter && (
                                            <Check className="w-4 h-4 text-orange-400 ml-1" />
                                        )}
                                    </span>

                                    {cat.subFilters.length > 1 && (
                                        <div className="text-white/90 group-hover:text-white transition-colors">
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* Sub-Filters Accordion Drawer (Direct Image Previews) */}
                            {isExpanded && cat.subFilters.length > 1 && (
                                <div className="pl-2 space-y-2 animate-fade-in border-l-2 border-orange-500/50 ml-2 pt-1 pb-1">
                                    {cat.subFilters.map((sub) => {
                                        const isSelected = activeFilter === sub.id;

                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => onApplyFilter(sub.id)}
                                                className={`w-full h-14 rounded-xl border flex items-center justify-between transition-all shadow-md relative overflow-hidden group/sub ${isSelected
                                                        ? 'border-orange-400 ring-2 ring-orange-500/60 scale-[1.02] shadow-[0_0_14px_rgba(249,115,22,0.4)]'
                                                        : 'border-white/15 opacity-85 hover:opacity-100 hover:scale-[1.01]'
                                                    }`}
                                            >
                                                {/* Direct Image Preview with Filter */}
                                                {currentImageUrl ? (
                                                    <img
                                                        src={currentImageUrl}
                                                        alt={sub.label}
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                        style={{ filter: getCssFilter(sub.id) }}
                                                    />
                                                ) : (
                                                    <div className={`absolute inset-0 w-full h-full bg-gradient-to-r ${sub.previewGradient || cat.coverGradient}`} />
                                                )}

                                                {/* Label & Active Checkmark Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex items-end justify-between p-2.5 z-10">
                                                    <span className="text-white text-xs font-bold drop-shadow-md">
                                                        {sub.label}
                                                    </span>
                                                    {isSelected && (
                                                        <Check className="w-4 h-4 text-orange-400 drop-shadow-md" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
