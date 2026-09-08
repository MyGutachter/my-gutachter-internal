import React from 'react';
import { Undo2, Redo2, Minus, Plus, Tag, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EditorToolbarProps {
    zoomPercent: number;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onSave: () => void;
    onSaveForRwb: () => void;
    onSaveAndPrev?: () => void;
    onSaveAndNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    onClose: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    zoomPercent,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onSave,
    onSaveForRwb,
    onSaveAndPrev,
    onSaveAndNext,
    hasPrev = false,
    hasNext = false,
    onClose,
}) => {
    const { t } = useTranslation();

    return (
        <div className="h-14 bg-[#181C26] border-b border-gray-800 px-4 flex items-center justify-between select-none z-40">
            {/* Left: Undo / Redo */}
            <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`p-2 rounded-lg transition-colors ${
                        canUndo
                            ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                            : 'text-gray-600 cursor-not-allowed'
                    }`}
                    title={t('imageEditor.toolbar.undo', 'Rückgängig (Undo)')}
                >
                    <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`p-2 rounded-lg transition-colors ${
                        canRedo
                            ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                            : 'text-gray-600 cursor-not-allowed'
                    }`}
                    title={t('imageEditor.toolbar.redo', 'Wiederholen (Redo)')}
                >
                    <Redo2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
            </div>

            {/* Center: Zoom percentage & controls */}
            <div className="flex items-center space-x-2 text-gray-300 text-xs sm:text-sm font-medium bg-gray-900/60 px-3 py-1.5 rounded-lg border border-gray-800">
                <button
                    onClick={onZoomOut}
                    className="hover:text-white transition-colors p-0.5"
                    title={t('imageEditor.toolbar.zoomOut', 'Verkleinern')}
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center font-semibold text-gray-200">
                    {zoomPercent} %
                </span>
                <button
                    onClick={onZoomIn}
                    className="hover:text-white transition-colors p-0.5"
                    title={t('imageEditor.toolbar.zoomIn', 'Vergrößern')}
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Right: Action Buttons & Close */}
            <div className="flex items-center space-x-2">
                {hasPrev && onSaveAndPrev && (
                    <button
                        onClick={onSaveAndPrev}
                        className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700 hover:border-orange-500/50 rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
                        title={t('imageEditor.toolbar.savePrev', 'Speichern + vorheriges Bild')}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>{t('imageEditor.toolbar.savePrev', 'Speichern + vorheriges Bild')}</span>
                    </button>
                )}

                {hasNext && onSaveAndNext && (
                    <button
                        onClick={onSaveAndNext}
                        className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700 hover:border-orange-500/50 rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
                        title={t('imageEditor.toolbar.saveNext', 'Speichern + nächstes Bild')}
                    >
                        <span>{t('imageEditor.toolbar.saveNext', 'Speichern + nächstes Bild')}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                )}

                <button
                    onClick={onSaveForRwb}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
                    title={t('imageEditor.toolbar.saveRwb', 'Speichern für RWB')}
                >
                    <Tag className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('imageEditor.toolbar.saveRwb', 'Speichern für RWB')}</span>
                </button>

                <button
                    onClick={onSave}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                    title={t('imageEditor.toolbar.save', 'Speichern')}
                >
                    <Check className="w-4 h-4" />
                    <span>{t('imageEditor.toolbar.save', 'Speichern')}</span>
                </button>

                <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                    title={t('imageEditor.toolbar.close', 'Schließen')}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
