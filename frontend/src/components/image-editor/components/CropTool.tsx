import React, { useState } from 'react';
import { Crop, Check, X, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface CropToolProps {
    cropRect: CropRect;
    selectedRatioId: string;
    onSelectRatio: (ratioId: string, ratioVal?: number) => void;
    onResetCrop: () => void;
    onApplyCrop: () => void;
    onCancelCrop: () => void;
    onRotate?: (angleDelta: number) => void;
    onSetAngle?: (angle: number) => void;
    onFlip?: (dir: 'horizontal' | 'vertical') => void;
}

export const CropTool: React.FC<CropToolProps> = ({
    cropRect,
    selectedRatioId,
    onSelectRatio,
    onResetCrop,
    onApplyCrop,
    onCancelCrop,
    onRotate,
    onSetAngle,
    onFlip,
}) => {
    const { t } = useTranslation();
    const [manualAngle, setManualAngle] = useState<number>(0);

    const cropRatios = [
        { id: 'free', label: t('imageEditor.crop.free', 'Frei'), ratio: undefined },
        { id: '1_1', label: t('imageEditor.crop.square', 'Quadratisch'), ratio: 1 },
        { id: '4_3', label: '4:3', ratio: 4 / 3 },
        { id: '16_9', label: '16:9', ratio: 16 / 9 },
        { id: '3_2', label: '3:2', ratio: 3 / 2 },
    ];

    const handleAngleChange = (angle: number) => {
        setManualAngle(angle);
        onSetAngle?.(angle);
    };

    const handleRotateDelta = (delta: number) => {
        const newAngle = (manualAngle + delta + 360) % 360;
        const normalized = newAngle > 180 ? newAngle - 360 : newAngle;
        setManualAngle(normalized);
        onRotate?.(delta);
    };

    return (
        <div className="p-4 space-y-5 w-64 sm:w-72 bg-[#181C26] border-r-2 border-orange-500/70 text-gray-200 select-none overflow-y-auto custom-scrollbar flex flex-col justify-between h-full shadow-[4px_0_15px_rgba(249,115,22,0.15)]">
            <div className="space-y-5">
                <div className="flex items-center space-x-2 text-orange-400">
                    <Crop className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                        {t('imageEditor.crop.title', 'Zuschnitt (Crop)')}
                    </h3>
                </div>

                <button
                    onClick={onResetCrop}
                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 border border-gray-700 shadow-sm hover:border-orange-500/50"
                >
                    <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                    <span>{t('imageEditor.crop.reset', 'Zurücksetzen')}</span>
                </button>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('imageEditor.crop.standardFormats', 'Standard Formate')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {cropRatios.map((r) => {
                            const isActive = selectedRatioId === r.id;
                            return (
                                <button
                                    key={r.id}
                                    onClick={() => onSelectRatio(r.id, r.ratio)}
                                    className={`py-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                                        isActive
                                            ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20 font-bold'
                                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                                    }`}
                                >
                                    <span className="text-xs">{r.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-800">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('imageEditor.crop.resolution', 'Auflösung (B x H)')}
                    </label>
                    <div className="flex items-center space-x-2 text-xs text-gray-300 bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl">
                        <span className="font-mono font-bold text-orange-400">{Math.round(cropRect.width)} b</span>
                        <span className="text-gray-500">×</span>
                        <span className="font-mono font-bold text-orange-400">{Math.round(cropRect.height)} h</span>
                        <span className="text-gray-500 text-[10px]">px</span>
                    </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-800">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                        {t('imageEditor.crop.rotateAndMirror', 'Drehen & Spiegeln')}
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleRotateDelta(-90)}
                            className="py-2 px-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-medium text-gray-300 hover:text-white flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-95"
                            title="-90°"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                            <span>-90°</span>
                        </button>
                        <button
                            onClick={() => handleRotateDelta(90)}
                            className="py-2 px-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-medium text-gray-300 hover:text-white flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-95"
                            title="+90°"
                        >
                            <RotateCw className="w-3.5 h-3.5 text-orange-400" />
                            <span>+90°</span>
                        </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-medium text-gray-300">
                            <span>{t('imageEditor.crop.manualRotation', 'Manuelle Drehung')}</span>
                            <div className="flex items-center space-x-1.5">
                                <span className="text-orange-400 font-bold font-mono">{manualAngle}°</span>
                                {manualAngle !== 0 && (
                                    <button
                                        onClick={() => handleAngleChange(0)}
                                        className="text-gray-500 hover:text-white transition-colors"
                                        title="0°"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={manualAngle}
                            onChange={(e) => handleAngleChange(parseInt(e.target.value, 10))}
                            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            onClick={() => onFlip?.('horizontal')}
                            className="py-2 px-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-medium text-gray-300 hover:text-white flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-95"
                            title={t('imageEditor.crop.horizontal', 'Horizontal')}
                        >
                            <FlipHorizontal className="w-3.5 h-3.5 text-orange-400" />
                            <span>{t('imageEditor.crop.horizontal', 'Horizontal')}</span>
                        </button>
                        <button
                            onClick={() => onFlip?.('vertical')}
                            className="py-2 px-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-medium text-gray-300 hover:text-white flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-95"
                            title={t('imageEditor.crop.vertical', 'Vertikal')}
                        >
                            <FlipVertical className="w-3.5 h-3.5 text-orange-400" />
                            <span>{t('imageEditor.crop.vertical', 'Vertikal')}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex space-x-2 border-t border-gray-800 mt-auto">
                <button
                    onClick={onCancelCrop}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1"
                >
                    <X className="w-4 h-4" />
                    <span>{t('imageEditor.crop.cancel', 'Abbrechen')}</span>
                </button>
                <button
                    onClick={onApplyCrop}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1 shadow-lg shadow-orange-500/20"
                >
                    <Check className="w-4 h-4" />
                    <span>{t('imageEditor.crop.apply', 'Anwenden')}</span>
                </button>
            </div>
        </div>
    );
};
