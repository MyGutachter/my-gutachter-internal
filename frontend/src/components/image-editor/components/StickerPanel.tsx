import React, { useState, useEffect, useRef } from 'react';
import { ARROW_STICKERS, SHAPE_COLORS, STROKE_WIDTH_OPTIONS, type ShapePreset } from '../config/presets';
import { ShapePresetGrid } from './ShapePresetGrid';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, Check, Layers } from 'lucide-react';
import type { ActiveShapeProperties } from '../hooks/useFabricCanvas';

interface CustomShapeItem {
    id: string;
    name: string;
    dataUrl: string;
    createdAt: number;
}

interface StickerPanelProps {
    onSelectArrowSticker: (colorHex: string) => void;
    onSelectShapePreset: (preset: ShapePreset, customOverrides?: Partial<ShapePreset>) => void;
    selectedShape?: ActiveShapeProperties | null;
    onUpdateShape?: (props: Partial<ActiveShapeProperties>) => void;
    onAddCustomStickerImage?: (dataUrl: string) => void;
}

export const StickerPanel: React.FC<StickerPanelProps> = ({
    onSelectArrowSticker,
    onSelectShapePreset,
    selectedShape,
    onUpdateShape,
    onAddCustomStickerImage,
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Color & styling states
    const [customColor, setCustomColor] = useState<string>('#FACC15');
    const [fillMode, setFillMode] = useState<'filled' | 'outline'>('filled');
    const [strokeWidth, setStrokeWidth] = useState<number>(4);

    // Custom uploaded shapes stored in localStorage
    const [customShapes, setCustomShapes] = useState<CustomShapeItem[]>(() => {
        try {
            const saved = localStorage.getItem('my_custom_uploaded_shapes');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // 2-way sync when a shape is selected on the canvas
    useEffect(() => {
        if (selectedShape) {
            if (selectedShape.fill && selectedShape.fill !== 'transparent' && selectedShape.fill !== 'none') {
                setCustomColor(selectedShape.fill);
                setFillMode('filled');
            } else if (selectedShape.stroke && selectedShape.stroke !== 'transparent') {
                setCustomColor(selectedShape.stroke);
                setFillMode('outline');
            }
            if (selectedShape.strokeWidth > 0) {
                setStrokeWidth(selectedShape.strokeWidth);
            }
        }
    }, [selectedShape]);

    const handleColorChange = (newColor: string) => {
        setCustomColor(newColor);
        if (selectedShape && onUpdateShape) {
            if (fillMode === 'filled') {
                onUpdateShape({ fill: newColor });
            } else {
                onUpdateShape({ stroke: newColor, fill: 'transparent' });
            }
        }
    };

    const handleFillModeChange = (mode: 'filled' | 'outline') => {
        setFillMode(mode);
        if (selectedShape && onUpdateShape) {
            if (mode === 'filled') {
                onUpdateShape({ fill: customColor });
            } else {
                onUpdateShape({ fill: 'transparent', stroke: customColor, strokeWidth: Math.max(strokeWidth, 2) });
            }
        }
    };

    const handleStrokeWidthChange = (width: number) => {
        setStrokeWidth(width);
        if (selectedShape && onUpdateShape) {
            onUpdateShape({ strokeWidth: width });
        }
    };

    const handleSelectPreset = (preset: ShapePreset) => {
        const isLineType = ['line', 'vert_line', 'arrow_line', 'double_arrow', 'dashed_line'].includes(preset.type);
        let fill = 'transparent';
        let stroke = customColor;
        let sWidth = strokeWidth;

        if (isLineType) {
            fill = customColor;
            stroke = customColor;
            sWidth = Math.max(strokeWidth, 3);
        } else if (fillMode === 'filled') {
            fill = customColor;
            stroke = preset.strokeWidth > 0
                ? (customColor === '#FACC15' ? '#CA8A04' : customColor === '#FFFFFF' ? '#9CA3AF' : '#000000')
                : 'transparent';
            sWidth = preset.strokeWidth || 0;
        } else {
            fill = 'transparent';
            stroke = customColor;
            sWidth = Math.max(strokeWidth, 3);
        }

        onSelectShapePreset(preset, {
            fill,
            stroke,
            strokeWidth: sWidth,
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const dataUrl = loadEvent.target?.result as string;
            if (!dataUrl) return;

            const newShape: CustomShapeItem = {
                id: 'custom-' + Date.now(),
                name: file.name.replace(/\.[^/.]+$/, ''),
                dataUrl,
                createdAt: Date.now(),
            };

            const updated = [newShape, ...customShapes.filter(s => s.dataUrl !== dataUrl)].slice(0, 20);
            setCustomShapes(updated);
            try {
                localStorage.setItem('my_custom_uploaded_shapes', JSON.stringify(updated));
            } catch { /* ignore storage quota */ }

            onAddCustomStickerImage?.(dataUrl);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDeleteCustomShape = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = customShapes.filter(s => s.id !== id);
        setCustomShapes(updated);
        try {
            localStorage.setItem('my_custom_uploaded_shapes', JSON.stringify(updated));
        } catch { /* ignore storage error */ }
    };

    return (
        <div className="p-4 space-y-5 w-72 sm:w-80 bg-[#181C26] border-r-2 border-orange-500/70 text-gray-200 select-none overflow-y-auto custom-scrollbar max-h-full shadow-[4px_0_15px_rgba(249,115,22,0.15)]">
            {/* Arrow Stickers on TOP */}
            <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {t('imageEditor.sticker.title', 'Pfeil-Sticker')}
                </h3>
                <div className="space-y-2">
                    {ARROW_STICKERS.map((sticker) => {
                        const isYellow = sticker.id === 'arrow-yellow';
                        const isRed = sticker.id === 'arrow-red';
                        const isWhite = sticker.id === 'arrow-white';

                        const bgClass = isYellow
                            ? 'from-yellow-700/60 to-yellow-900/80 hover:from-yellow-600/70 hover:to-yellow-800/90 border-yellow-500/40'
                            : isRed
                            ? 'from-red-800/60 to-red-950/80 hover:from-red-700/70 hover:to-red-900/90 border-red-500/40'
                            : isWhite
                            ? 'from-gray-300/30 to-gray-500/50 hover:from-gray-200/40 hover:to-gray-400/60 border-gray-300/40'
                            : 'from-gray-800 to-gray-950 hover:from-gray-700 hover:to-gray-900 border-gray-700';

                        const localizedLabel = sticker.id === 'arrow-yellow'
                            ? t('imageEditor.sticker.yellow', 'Gelb')
                            : sticker.id === 'arrow-red'
                            ? t('imageEditor.sticker.red', 'Rot')
                            : sticker.id === 'arrow-white'
                            ? t('imageEditor.sticker.white', 'Weiß')
                            : t('imageEditor.sticker.black', 'Schwarz');

                        return (
                            <button
                                key={sticker.id}
                                onClick={() => onSelectArrowSticker(sticker.fillColor)}
                                className={`w-full h-14 rounded-xl bg-gradient-to-r ${bgClass} border flex items-center justify-between px-5 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md relative overflow-hidden group`}
                            >
                                <div className="w-10 h-10 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8 drop-shadow-md" viewBox="0 0 40 40">
                                        <path
                                            d="M 6 30 L 26 10 L 22 6 L 36 6 L 36 20 L 32 16 L 12 36 Z"
                                            fill={sticker.fillColor}
                                            stroke={sticker.strokeColor}
                                            strokeWidth="1.5"
                                        />
                                    </svg>
                                </div>
                                <span className="text-sm font-bold tracking-wide text-gray-100 shadow-sm">
                                    {localizedLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Shape Preset Grid */}
            <div className="pt-2 border-t border-gray-800">
                <ShapePresetGrid
                    onSelectPreset={handleSelectPreset}
                    activeColor={customColor}
                    activeFillMode={fillMode}
                />
            </div>

            {/* Custom Shapes / Upload Section */}
            <div className="pt-2 border-t border-gray-800 space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-orange-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                            {t('imageEditor.shapes.customUploadTitle', 'Eigene Formen')}
                        </h4>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-[11px] bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded-lg transition-colors font-semibold"
                    >
                        <Upload className="w-3 h-3" />
                        <span>{t('imageEditor.shapes.uploadBtn', 'Hochladen')}</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </div>

                {customShapes.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {customShapes.map((shape) => (
                            <div
                                key={shape.id}
                                onClick={() => onAddCustomStickerImage?.(shape.dataUrl)}
                                className="h-14 bg-gray-950/80 hover:bg-gray-800 border border-gray-800 hover:border-orange-500/50 rounded-lg p-1 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
                                title={shape.name}
                            >
                                <img
                                    src={shape.dataUrl}
                                    alt={shape.name}
                                    className="max-h-8 max-w-[90%] object-contain drop-shadow"
                                />
                                <span className="text-[9px] text-gray-400 truncate max-w-full px-1 mt-0.5">
                                    {shape.name}
                                </span>
                                <button
                                    onClick={(e) => handleDeleteCustomShape(shape.id, e)}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600/90 hover:bg-red-500 text-white p-0.5 rounded transition-all"
                                    title={t('common.delete', 'Löschen')}
                                >
                                    <Trash2 className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-gray-700 hover:border-orange-500/50 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors bg-gray-950/40 group text-center"
                    >
                        <Upload className="w-4 h-4 text-gray-400 group-hover:text-orange-400 transition-colors" />
                        <span className="text-[10px] text-gray-400 group-hover:text-gray-300">
                            {t('imageEditor.shapes.uploadPrompt', 'SVG oder PNG-Sticker hier hinzufügen')}
                        </span>
                    </div>
                )}
            </div>

            {/* Shape Color & Stroke Customizer (at LAST) */}
            <div className="pt-2 border-t border-gray-800 space-y-3">
                <div className="space-y-3 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                            {t('imageEditor.shapes.customizeTitle', 'Farbe & Stil')}
                        </h3>
                        {/* Fill Mode Switcher */}
                        <div className="flex items-center bg-gray-950 p-0.5 rounded-lg border border-gray-800 text-[11px]">
                            <button
                                onClick={() => handleFillModeChange('filled')}
                                className={`px-2 py-0.5 rounded transition-colors ${
                                    fillMode === 'filled'
                                        ? 'bg-orange-500 text-white font-semibold shadow-sm'
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                {t('imageEditor.shapes.solidFill', 'Gefüllt')}
                            </button>
                            <button
                                onClick={() => handleFillModeChange('outline')}
                                className={`px-2 py-0.5 rounded transition-colors ${
                                    fillMode === 'outline'
                                        ? 'bg-orange-500 text-white font-semibold shadow-sm'
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                {t('imageEditor.shapes.outlineOnly', 'Kontur')}
                            </button>
                        </div>
                    </div>

                    {/* Color Swatches Grid */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span>{t('imageEditor.shapes.color', 'Farbe')}</span>
                            <span className="font-mono text-[10px] text-gray-500 uppercase">{customColor}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {SHAPE_COLORS.map((c) => {
                                const isSelected = customColor.toLowerCase() === c.hex.toLowerCase();
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => handleColorChange(c.hex)}
                                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'scale-110 ring-2 ring-orange-500 border-white shadow-md'
                                                : 'border-gray-700 hover:scale-105 hover:border-gray-500'
                                        }`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.label}
                                    >
                                        {isSelected && (
                                            <Check
                                                className={`w-3.5 h-3.5 drop-shadow ${
                                                    ['#ffffff', '#facc15'].includes(c.hex.toLowerCase())
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
                                className="w-6 h-6 rounded-md border border-gray-700 hover:border-gray-500 flex items-center justify-center cursor-pointer transition-all hover:scale-105 relative overflow-hidden bg-gradient-to-br from-red-500 via-green-500 to-blue-500"
                                title={t('imageEditor.shapes.customColor', 'Eigene Farbe wählen')}
                            >
                                <input
                                    type="color"
                                    value={customColor.startsWith('#') ? customColor : '#FACC15'}
                                    onChange={(e) => handleColorChange(e.target.value)}
                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Stroke Width Options */}
                    <div className="space-y-1.5 pt-1 border-t border-gray-800/80">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span>{t('imageEditor.shapes.strokeWidth', 'Linienstärke')}</span>
                            <span className="font-semibold text-gray-300">{strokeWidth}px</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {STROKE_WIDTH_OPTIONS.map((w) => (
                                <button
                                    key={w}
                                    onClick={() => handleStrokeWidthChange(w)}
                                    className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all ${
                                        strokeWidth === w
                                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm'
                                            : 'bg-gray-950/60 text-gray-400 hover:text-gray-200 border border-gray-800'
                                    }`}
                                >
                                    {w}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
