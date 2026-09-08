import React from 'react';
import { Crop, Sliders, Sun, Droplets, Type, Compass, Paintbrush } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ToolType = 'crop' | 'filters' | 'corrections' | 'blur' | 'text' | 'sticker' | 'draw' | null;

interface LeftSidebarProps {
    activeTool: ToolType;
    onSelectTool: (tool: ToolType) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeTool, onSelectTool }) => {
    const { t } = useTranslation();

    const tools = [
        { id: 'crop' as ToolType, label: t('imageEditor.tools.crop', 'Zuschneiden'), icon: Crop },
        { id: 'filters' as ToolType, label: t('imageEditor.tools.filters', 'Filter'), icon: Sliders },
        { id: 'corrections' as ToolType, label: t('imageEditor.tools.corrections', 'Korrekturen'), icon: Sun },
        { id: 'blur' as ToolType, label: t('imageEditor.tools.blur', 'Weichzeichnen'), icon: Droplets },
        { id: 'text' as ToolType, label: t('imageEditor.tools.text', 'Text'), icon: Type },
        { id: 'sticker' as ToolType, label: t('imageEditor.tools.sticker', 'Sticker'), icon: Compass },
        { id: 'draw' as ToolType, label: t('imageEditor.tools.draw', 'Malen'), icon: Paintbrush },
    ];

    return (
        <div className="w-16 sm:w-20 bg-[#12161F] border-r border-gray-800/80 flex flex-col items-center py-4 space-y-2 select-none z-30">
            {tools.map((tItem) => {
                const Icon = tItem.icon;
                const isActive = activeTool === tItem.id;
                return (
                    <button
                        key={tItem.id}
                        onClick={() => onSelectTool(isActive ? null : tItem.id)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${
                            isActive
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        }`}
                        title={tItem.label}
                    >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[10px] sm:text-[11px] font-medium leading-tight tracking-tight truncate max-w-[56px]">
                            {tItem.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
