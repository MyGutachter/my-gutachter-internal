import React, { useState } from 'react';
import {
    Type,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Plus,
    Copy,
    Trash2,
    Sparkles,
    X,
    Layers,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ActiveTextProperties, CanvasTextItem } from '../hooks/useFabricCanvas';

export interface TextPanelProps {
    selectedText: ActiveTextProperties | null;
    canvasTexts?: CanvasTextItem[];
    onSelectText?: (index: number) => void;
    onAddText: (text: string, options: Partial<ActiveTextProperties>) => void;
    onUpdateText: (options: Partial<ActiveTextProperties>) => void;
    onDuplicateText?: () => void;
    onDeleteText?: () => void;
    onDeselect?: () => void;
}

const FONTS = [
    { label: 'Inter (Modern)', value: 'Inter' },
    { label: 'Roboto (Clean)', value: 'Roboto' },
    { label: 'Arial (Standard)', value: 'Arial' },
    { label: 'Impact (Heavy / Notice)', value: 'Impact' },
    { label: 'Courier New (FIN / Mono)', value: 'Courier New' },
    { label: 'Georgia (Serif)', value: 'Georgia' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS' },
    { label: 'Verdana', value: 'Verdana' },
];

const TEXT_COLORS = [
    '#FACC15', // Bright Yellow
    '#EF4444', // Red
    '#F97316', // Orange
    '#22C55E', // Green
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#EC4899', // Pink
    '#FFFFFF', // White
    '#000000', // Black
];

const BG_COLORS = [
    'transparent',
    'rgba(0, 0, 0, 0.75)',
    '#000000',
    '#1E293B',
    '#EF4444',
    '#F97316',
    '#FACC15',
    '#2563EB',
    '#10B981',
    '#FFFFFF',
];

const STROKE_COLORS = [
    '#000000',
    '#FFFFFF',
    '#FACC15',
    '#EF4444',
    '#3B82F6',
    '#1E293B',
];

const getFormattedTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
};

interface PresetItem {
    id: string;
    labelKey: string;
    defaultLabel: string;
    getText: () => string;
    fill: string;
    backgroundColor: string;
    stroke: string;
    strokeWidth: number;
    fontWeight: 'bold' | 'normal';
    fontSize: number;
    padding: number;
    fontFamily: string;
    badgeStyle: string;
}

const PRESETS: PresetItem[] = [
    {
        id: 'schaden',
        labelKey: 'imageEditor.text.presets.damage',
        defaultLabel: 'SCHADEN',
        getText: () => 'SCHADEN',
        fill: '#FFFFFF',
        backgroundColor: '#EF4444',
        stroke: '#7F1D1D',
        strokeWidth: 1,
        fontWeight: 'bold',
        fontSize: 28,
        padding: 8,
        fontFamily: 'Inter',
        badgeStyle: 'bg-red-500 text-white border-red-400 shadow-sm shadow-red-500/30',
    },
    {
        id: 'kratzer',
        labelKey: 'imageEditor.text.presets.scratch',
        defaultLabel: 'KRATZER',
        getText: () => 'KRATZER',
        fill: '#FFFFFF',
        backgroundColor: '#F97316',
        stroke: '#9A3412',
        strokeWidth: 1,
        fontWeight: 'bold',
        fontSize: 26,
        padding: 8,
        fontFamily: 'Inter',
        badgeStyle: 'bg-orange-500 text-white border-orange-400 shadow-sm shadow-orange-500/30',
    },
    {
        id: 'delle',
        labelKey: 'imageEditor.text.presets.dent',
        defaultLabel: 'DELLE',
        getText: () => 'DELLE',
        fill: '#000000',
        backgroundColor: '#FACC15',
        stroke: '#CA8A04',
        strokeWidth: 1,
        fontWeight: 'bold',
        fontSize: 26,
        padding: 8,
        fontFamily: 'Inter',
        badgeStyle: 'bg-yellow-400 text-black border-yellow-300 font-bold',
    },
    {
        id: 'vorschaden',
        labelKey: 'imageEditor.text.presets.priorDamage',
        defaultLabel: 'VORSCHADEN',
        getText: () => 'VORSCHADEN',
        fill: '#FFFFFF',
        backgroundColor: '#8B5CF6',
        stroke: '#5B21B6',
        strokeWidth: 1,
        fontWeight: 'bold',
        fontSize: 26,
        padding: 8,
        fontFamily: 'Inter',
        badgeStyle: 'bg-purple-600 text-white border-purple-400',
    },
    {
        id: 'nachlackiert',
        labelKey: 'imageEditor.text.presets.repainted',
        defaultLabel: 'NACHLACKIERT',
        getText: () => 'NACHLACKIERT',
        fill: '#FFFFFF',
        backgroundColor: '#2563EB',
        stroke: '#1E40AF',
        strokeWidth: 1,
        fontWeight: 'bold',
        fontSize: 26,
        padding: 8,
        fontFamily: 'Inter',
        badgeStyle: 'bg-blue-600 text-white border-blue-400',
    },
    {
        id: 'hinweis',
        labelKey: 'imageEditor.text.presets.notice',
        defaultLabel: 'HINWEIS',
        getText: () => 'HINWEIS',
        fill: '#FFFFFF',
        backgroundColor: '#10B981',
        stroke: '#065F46',
        strokeWidth: 1,
        fontWeight: 'bold',
        fontSize: 26,
        padding: 8,
        fontFamily: 'Inter',
        badgeStyle: 'bg-emerald-600 text-white border-emerald-400',
    },
    {
        id: 'datetime',
        labelKey: 'imageEditor.text.presets.dateTime',
        defaultLabel: 'DATUM & ZEIT',
        getText: () => getFormattedTimestamp(),
        fill: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        stroke: '#000000',
        strokeWidth: 1,
        fontWeight: 'bold',
        fontSize: 22,
        padding: 6,
        fontFamily: 'Inter',
        badgeStyle: 'bg-gray-900/90 text-gray-100 border-gray-600',
    },
    {
        id: 'fin',
        labelKey: 'imageEditor.text.presets.vin',
        defaultLabel: 'FIN / VIN',
        getText: () => 'FIN: ',
        fill: '#FACC15',
        backgroundColor: '#0F172A',
        stroke: '#000000',
        strokeWidth: 1,
        fontWeight: 'bold',
        fontSize: 22,
        padding: 6,
        fontFamily: 'Courier New',
        badgeStyle: 'bg-slate-900 text-yellow-400 border-slate-700 font-mono',
    },
];

export const TextPanel: React.FC<TextPanelProps> = ({
    selectedText,
    canvasTexts,
    onSelectText,
    onAddText,
    onUpdateText,
    onDuplicateText,
    onDeleteText,
    onDeselect,
}) => {
    const { t } = useTranslation();

    // Local draft states (used when nothing is selected)
    const [draftText, setDraftText] = useState('Text eingeben...');
    const [draftFontFamily, setDraftFontFamily] = useState('Inter');
    const [draftFontSize, setDraftFontSize] = useState(32);
    const [draftFill, setDraftFill] = useState('#FACC15');
    const [draftIsBold, setDraftIsBold] = useState(true);
    const [draftIsItalic, setDraftIsItalic] = useState(false);
    const [draftUnderline, setDraftUnderline] = useState(false);
    const [draftLinethrough, setDraftLinethrough] = useState(false);
    const [draftTextAlign, setDraftTextAlign] = useState<'left' | 'center' | 'right'>('center');
    const [draftStrokeColor, setDraftStrokeColor] = useState('#000000');
    const [draftStrokeWidth, setDraftStrokeWidth] = useState(1.5);
    const [draftBgColor, setDraftBgColor] = useState('transparent');
    const [draftPadding, setDraftPadding] = useState(6);

    // Active values: read from selectedText if an object is selected, else fallback to draft
    const textInput = selectedText ? selectedText.text : draftText;
    const fontFamily = selectedText ? selectedText.fontFamily : draftFontFamily;
    const fontSize = selectedText ? selectedText.fontSize : draftFontSize;
    const fillColor = selectedText ? selectedText.fill : draftFill;
    const isBold = selectedText ? (selectedText.fontWeight === 'bold') : draftIsBold;
    const isItalic = selectedText ? (selectedText.fontStyle === 'italic') : draftIsItalic;
    const underline = selectedText ? selectedText.underline : draftUnderline;
    const linethrough = selectedText ? selectedText.linethrough : draftLinethrough;
    const textAlign = selectedText ? selectedText.textAlign : draftTextAlign;
    const strokeColor = selectedText ? selectedText.stroke : draftStrokeColor;
    const strokeWidth = selectedText ? selectedText.strokeWidth : draftStrokeWidth;
    const bgColor = selectedText ? selectedText.backgroundColor : draftBgColor;
    const padding = selectedText ? selectedText.padding : draftPadding;

    // Helper to dispatch updates live or save to draft
    const handleChangeText = (val: string) => {
        if (selectedText) {
            onUpdateText({ text: val });
        } else {
            setDraftText(val);
        }
    };

    const handleChangeFontFamily = (val: string) => {
        if (selectedText) {
            onUpdateText({ fontFamily: val });
        } else {
            setDraftFontFamily(val);
        }
    };

    const handleChangeFontSize = (val: number) => {
        const clamped = Math.max(8, Math.min(200, val));
        if (selectedText) {
            onUpdateText({ fontSize: clamped });
        } else {
            setDraftFontSize(clamped);
        }
    };

    const handleChangeFill = (val: string) => {
        if (selectedText) {
            onUpdateText({ fill: val });
        } else {
            setDraftFill(val);
        }
    };

    const handleToggleBold = () => {
        const next = !isBold;
        if (selectedText) {
            onUpdateText({ fontWeight: next ? 'bold' : 'normal' });
        } else {
            setDraftIsBold(next);
        }
    };

    const handleToggleItalic = () => {
        const next = !isItalic;
        if (selectedText) {
            onUpdateText({ fontStyle: next ? 'italic' : 'normal' });
        } else {
            setDraftIsItalic(next);
        }
    };

    const handleToggleUnderline = () => {
        const next = !underline;
        if (selectedText) {
            onUpdateText({ underline: next });
        } else {
            setDraftUnderline(next);
        }
    };

    const handleToggleLinethrough = () => {
        const next = !linethrough;
        if (selectedText) {
            onUpdateText({ linethrough: next });
        } else {
            setDraftLinethrough(next);
        }
    };

    const handleChangeAlign = (align: 'left' | 'center' | 'right') => {
        if (selectedText) {
            onUpdateText({ textAlign: align });
        } else {
            setDraftTextAlign(align);
        }
    };

    const handleChangeStrokeColor = (val: string) => {
        if (selectedText) {
            onUpdateText({ stroke: val });
        } else {
            setDraftStrokeColor(val);
        }
    };

    const handleChangeStrokeWidth = (val: number) => {
        if (selectedText) {
            onUpdateText({ strokeWidth: val });
        } else {
            setDraftStrokeWidth(val);
        }
    };

    const handleChangeBgColor = (val: string) => {
        if (selectedText) {
            onUpdateText({ backgroundColor: val });
        } else {
            setDraftBgColor(val);
        }
    };

    const handleChangePadding = (val: number) => {
        if (selectedText) {
            onUpdateText({ padding: val });
        } else {
            setDraftPadding(val);
        }
    };

    // Preset click handler
    const handleSelectPreset = (preset: PresetItem) => {
        const textVal = preset.getText();
        const opts: Partial<ActiveTextProperties> = {
            text: textVal,
            fill: preset.fill,
            backgroundColor: preset.backgroundColor,
            stroke: preset.stroke,
            strokeWidth: preset.strokeWidth,
            fontWeight: preset.fontWeight,
            fontSize: preset.fontSize,
            padding: preset.padding,
            fontFamily: preset.fontFamily,
        };

        if (selectedText) {
            onUpdateText(opts);
        } else {
            onAddText(textVal, opts);
        }
    };

    // Place text button
    const handleAdd = () => {
        onAddText(textInput || 'Text', {
            fontFamily,
            fontSize,
            fill: fillColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            underline,
            linethrough,
            textAlign,
            stroke: strokeColor,
            strokeWidth,
            backgroundColor: bgColor,
            padding,
        });
    };

    return (
        <div className="p-3.5 space-y-4 w-72 sm:w-80 bg-[#181C26] border-r border-orange-500/40 text-gray-200 select-none overflow-y-auto custom-scrollbar shadow-[4px_0_20px_rgba(0,0,0,0.45)]">
            {/* Header / Selection Status */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
                <div className="flex items-center space-x-2">
                    <Type className="w-5 h-5 text-orange-400" />
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-100">
                            {t('imageEditor.text.title', 'Text Editor')}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {selectedText ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    {t('imageEditor.text.activeEditing', 'Live Sync')}
                                </span>
                            ) : (
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {t('imageEditor.text.draftMode', 'Neuer Text')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick actions for selected text */}
                {selectedText && (
                    <div className="flex items-center gap-1">
                        {onDuplicateText && (
                            <button
                                onClick={onDuplicateText}
                                title={t('imageEditor.text.duplicate', 'Duplizieren')}
                                className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {onDeleteText && (
                            <button
                                onClick={onDeleteText}
                                title={t('imageEditor.text.delete', 'Löschen')}
                                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 transition-colors border border-red-800/60"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {onDeselect && (
                            <button
                                onClick={onDeselect}
                                title={t('imageEditor.text.deselect', 'Auswahl aufheben')}
                                className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Existing Texts on Canvas */}
            {canvasTexts && canvasTexts.length > 0 && (
                <div className="space-y-1.5 p-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 shadow-inner">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-orange-400" />
                            <span>{t('imageEditor.text.existingTexts', 'Texte auf Bild')} ({canvasTexts.length})</span>
                        </label>
                        {selectedText && onDeselect && (
                            <button
                                type="button"
                                onClick={onDeselect}
                                className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30"
                            >
                                <Plus className="w-2.5 h-2.5" />
                                {t('imageEditor.text.newTextBtn', 'Neu')}
                            </button>
                        )}
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
                        {canvasTexts.map((item, idx) => {
                            const isItemActive = selectedText && selectedText.text === item.text;
                            return (
                                <button
                                    key={item.id || idx}
                                    type="button"
                                    onClick={() => onSelectText?.(idx)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                                        isItemActive
                                            ? 'bg-orange-500/25 border-orange-500 text-white font-semibold ring-1 ring-orange-500/50 shadow-sm'
                                            : 'bg-gray-800/80 border-gray-700/70 text-gray-300 hover:bg-gray-700/80 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span
                                            className="w-3 h-3 rounded-full border border-gray-500 flex-shrink-0"
                                            style={{ backgroundColor: item.fill || '#FFFFFF' }}
                                        />
                                        <span className="truncate text-xs">
                                            {item.text || `[Text #${idx + 1}]`}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 ml-2">
                                        {item.fontSize}px
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Presets / Gutachter Badges */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                        {t('imageEditor.text.quickPresets', 'Gutachter Badges')}
                    </label>
                    <span className="text-[10px] text-gray-500">
                        {t('imageEditor.text.oneClick', '1-Klick')}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => handleSelectPreset(preset)}
                            className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all text-center truncate active:scale-95 ${preset.badgeStyle}`}
                            title={t(preset.labelKey, preset.defaultLabel)}
                        >
                            {t(preset.labelKey, preset.defaultLabel)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Text Content */}
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                    <span>{t('imageEditor.text.content', 'Textinhalt')}</span>
                    {textInput && (
                        <button
                            onClick={() => handleChangeText('')}
                            className="text-[10px] text-gray-500 hover:text-orange-400 transition-colors"
                        >
                            {t('imageEditor.text.clear', 'Leeren')}
                        </button>
                    )}
                </label>
                <textarea
                    rows={2}
                    value={textInput}
                    onChange={(e) => handleChangeText(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500 resize-none font-medium custom-scrollbar"
                    placeholder={t('imageEditor.text.placeholder', 'Text eingeben...')}
                />
            </div>

            {/* Typography: Font Family */}
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                    {t('imageEditor.text.font', 'Schriftart')}
                </label>
                <select
                    value={fontFamily}
                    onChange={(e) => handleChangeFontFamily(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500 font-medium"
                >
                    {FONTS.map((f) => (
                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                            {f.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Size: Manual Number Input + Steppers + Slider */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                    <span>{t('imageEditor.text.size', 'Schriftgröße')}</span>

                    {/* Manual Numeric Entry + Steppers */}
                    <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-0.5 shadow-inner">
                        <button
                            type="button"
                            onClick={() => handleChangeFontSize(fontSize - 2)}
                            className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center justify-center text-xs font-bold transition-colors"
                            title="-2px"
                        >
                            -
                        </button>

                        <div className="flex items-center px-1">
                            <input
                                type="number"
                                min={8}
                                max={200}
                                value={fontSize}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) handleChangeFontSize(val);
                                }}
                                className="w-11 text-center text-xs font-mono font-bold text-orange-400 bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">px</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleChangeFontSize(fontSize + 2)}
                            className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center justify-center text-xs font-bold transition-colors"
                            title="+2px"
                        >
                            +
                        </button>
                    </div>
                </div>

                <input
                    type="range"
                    min="10"
                    max="140"
                    value={fontSize}
                    onChange={(e) => handleChangeFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-orange-500"
                />
            </div>

            {/* Style & Alignment Toolbar */}
            <div className="grid grid-cols-2 gap-2">
                {/* Style Toggles */}
                <div className="flex items-center bg-gray-900 border border-gray-700/80 rounded-lg p-0.5">
                    <button
                        onClick={handleToggleBold}
                        title={t('imageEditor.text.bold', 'Fett')}
                        className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${
                            isBold ? 'bg-orange-500 text-white font-bold' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleToggleItalic}
                        title={t('imageEditor.text.italic', 'Kursiv')}
                        className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${
                            isItalic ? 'bg-orange-500 text-white font-bold' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleToggleUnderline}
                        title={t('imageEditor.text.underline', 'Unterstrichen')}
                        className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${
                            underline ? 'bg-orange-500 text-white font-bold' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleToggleLinethrough}
                        title={t('imageEditor.text.strikethrough', 'Durchgestrichen')}
                        className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${
                            linethrough ? 'bg-orange-500 text-white font-bold' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Alignment Toggles */}
                <div className="flex items-center bg-gray-900 border border-gray-700/80 rounded-lg p-0.5">
                    <button
                        onClick={() => handleChangeAlign('left')}
                        title={t('imageEditor.text.alignLeft', 'Linksbündig')}
                        className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${
                            textAlign === 'left' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleChangeAlign('center')}
                        title={t('imageEditor.text.alignCenter', 'Zentriert')}
                        className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${
                            textAlign === 'center' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleChangeAlign('right')}
                        title={t('imageEditor.text.alignRight', 'Rechtsbündig')}
                        className={`flex-1 py-1.5 rounded flex items-center justify-center transition-colors ${
                            textAlign === 'right' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <AlignRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Text Color Swatches & Picker */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300">
                        {t('imageEditor.text.color', 'Textfarbe')}
                    </label>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-mono">{fillColor}</span>
                        <input
                            type="color"
                            value={fillColor.startsWith('#') ? fillColor : '#FACC15'}
                            onChange={(e) => handleChangeFill(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                            title={t('imageEditor.text.customColor', 'Eigene Farbe wählen')}
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {TEXT_COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => handleChangeFill(c)}
                            className={`w-6 h-6 rounded-md border transition-all ${
                                fillColor.toLowerCase() === c.toLowerCase()
                                    ? 'scale-110 border-orange-400 ring-2 ring-orange-500/50'
                                    : 'border-gray-700 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            {/* Background Badge Box */}
            <div className="space-y-2 pt-2 border-t border-gray-800/80">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-orange-400" />
                        {t('imageEditor.text.background', 'Hintergrund-Badge')}
                    </label>
                    <button
                        onClick={() => handleChangeBgColor(bgColor === 'transparent' ? 'rgba(0, 0, 0, 0.75)' : 'transparent')}
                        className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                            bgColor !== 'transparent'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        {bgColor !== 'transparent'
                            ? t('imageEditor.text.active', 'Aktiv')
                            : t('imageEditor.text.off', 'Aus')}
                    </button>
                </div>

                {bgColor !== 'transparent' && (
                    <div className="space-y-2 p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 animate-fade-in">
                        <div className="flex flex-wrap gap-1.5">
                            {BG_COLORS.map((bg) => {
                                const isTransparent = bg === 'transparent';
                                return (
                                    <button
                                        key={bg}
                                        onClick={() => handleChangeBgColor(bg)}
                                        className={`w-6 h-6 rounded-md border text-[9px] flex items-center justify-center transition-all ${
                                            bgColor === bg
                                                ? 'scale-110 border-orange-400 ring-2 ring-orange-500/50'
                                                : 'border-gray-700 hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: isTransparent ? '#181C26' : bg }}
                                        title={isTransparent ? t('imageEditor.text.off', 'Aus') : bg}
                                    >
                                        {isTransparent && <X className="w-3 h-3 text-gray-500" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Padding Slider */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                                <span>{t('imageEditor.text.padding', 'Innenabstand (Padding)')}</span>
                                <span className="font-mono text-orange-400">{padding}px</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="20"
                                value={padding}
                                onChange={(e) => handleChangePadding(parseInt(e.target.value, 10))}
                                className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Outline / Stroke (Kontur) */}
            <div className="space-y-2 pt-2 border-t border-gray-800/80">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300">
                        {t('imageEditor.text.outline', 'Kontur (Stroke)')}
                    </label>
                    <span className="text-[11px] font-mono text-orange-400 font-bold">
                        {strokeWidth > 0 ? `${strokeWidth}px` : t('imageEditor.text.off', 'Aus')}
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={strokeWidth}
                    onChange={(e) => handleChangeStrokeWidth(parseFloat(e.target.value))}
                    className="w-full accent-orange-500"
                />

                {strokeWidth > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                        {STROKE_COLORS.map((sc) => (
                            <button
                                key={sc}
                                onClick={() => handleChangeStrokeColor(sc)}
                                className={`w-5 h-5 rounded-full border transition-all ${
                                    strokeColor.toLowerCase() === sc.toLowerCase()
                                        ? 'scale-110 border-orange-400 ring-2 ring-orange-500/50'
                                        : 'border-gray-700 hover:scale-105'
                                }`}
                                style={{ backgroundColor: sc }}
                            />
                        ))}
                        <input
                            type="color"
                            value={strokeColor.startsWith('#') ? strokeColor : '#000000'}
                            onChange={(e) => handleChangeStrokeColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent ml-auto"
                            title={t('imageEditor.text.customOutlineColor', 'Eigene Konturfarbe')}
                        />
                    </div>
                )}
            </div>

            {/* Add / Action Button */}
            <div className="pt-2">
                <button
                    onClick={handleAdd}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>
                        {selectedText
                            ? t('imageEditor.text.addAnother', 'Neuen Text Hinzufügen')
                            : t('imageEditor.text.place', 'Text auf Bild Platzieren')}
                    </span>
                </button>
            </div>
        </div>
    );
};
