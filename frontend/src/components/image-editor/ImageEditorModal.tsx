import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFabricCanvas, fabricJsonStore } from './hooks/useFabricCanvas';
import { LeftSidebar, type ToolType } from './components/LeftSidebar';
import { EditorToolbar } from './components/EditorToolbar';
import { EditorCanvas, type CropRect } from './components/EditorCanvas';
import { StickerPanel } from './components/StickerPanel';
import { TextPanel } from './components/TextPanel';
import { FilterPanel } from './components/FilterPanel';
import { CorrectionsPanel } from './components/CorrectionsPanel';
import { BlurPanel } from './components/BlurPanel';
import { DrawPanel } from './components/DrawPanel';
import { CropTool } from './components/CropTool';
import { cropImage } from '../../utils/imageEdit';

import { useTranslation } from 'react-i18next';

export interface ImageEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onSave: (editedDataUrl: string, target?: 'default' | 'rwb') => void;
    onSaveAndNavigate?: (editedDataUrl: string, direction: 'prev' | 'next') => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    title?: string;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
    isOpen,
    onClose,
    imageUrl,
    onSave,
    onSaveAndNavigate,
    hasPrev = false,
    hasNext = false,
    title,
}) => {
    const { t } = useTranslation();
    const modalTitle = title || t('imageEditor.title', 'FOTOBEARBEITUNG');
    const [activeTool, setActiveTool] = useState<ToolType>('sticker');
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);

    // Interactive Crop State
    const [selectedRatioId, setSelectedRatioId] = useState<string>('free');
    const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
    const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        if (isOpen) {
            setCurrentImageUrl(imageUrl);
            setActiveTool('sticker');
        }
    }, [isOpen, imageUrl]);

    const handleSelectionChange = useCallback((hasSelection: boolean, activeType?: string) => {
        const type = (activeType || '').toLowerCase();
        if (hasSelection && (type === 'textbox' || type === 'itext' || type === 'i-text' || type === 'text')) {
            setActiveTool('text');
        } else if (hasSelection && ['rect', 'circle', 'ellipse', 'line', 'triangle', 'path', 'polygon', 'group'].includes(type)) {
            setActiveTool('sticker');
        }
    }, []);

    const {
        setCanvasEl,
        isLoaded,
        zoomPercent,
        canUndo,
        canRedo,
        undo,
        redo,
        zoomIn,
        zoomOut,
        addShape,
        addArrowSticker,
        addCustomStickerImage,
        addText,
        selectedTextProperties,
        updateActiveText,
        selectedShapeProperties,
        updateActiveShape,
        duplicateActiveObject,
        deleteSelected,
        deselectAll,
        setDrawingMode,
        applyFilterPreset,
        activeFilterPreset,
        corrections,
        applyCorrections,
        globalBlur,
        applyGlobalBlur,
        rotateBaseImage,
        setBaseImageAngle,
        flipBaseImage,
        exportCanvas,
        exportCanvasJson,
        canvasDimensions,
        applyCrop,
    } = useFabricCanvas({
        imageUrl: currentImageUrl,
        onSelectionChange: handleSelectionChange,
    });

    // Automatically exit freehand drawing mode when switching away from the 'draw' tool
    useEffect(() => {
        if (activeTool !== 'draw') {
            setDrawingMode(false);
        }
    }, [activeTool, setDrawingMode]);

    // Initialize cropRect when canvas dimensions or crop tool opens
    useEffect(() => {
        if (canvasDimensions.width > 0 && canvasDimensions.height > 0) {
            setCropRect({
                x: 0,
                y: 0,
                width: canvasDimensions.width,
                height: canvasDimensions.height,
            });
        }
    }, [canvasDimensions]);

    // Handle Crop Preset Selection
    const handleSelectRatio = (ratioId: string, ratioVal?: number) => {
        setSelectedRatioId(ratioId);
        setAspectRatio(ratioVal);

        if (canvasDimensions.width === 0 || canvasDimensions.height === 0) return;

        const cw = canvasDimensions.width;
        const ch = canvasDimensions.height;

        if (!ratioVal) {
            // Freeform: full image rectangle
            setCropRect({ x: 0, y: 0, width: cw, height: ch });
            return;
        }

        let w = cw;
        let h = ch;
        if (cw / ch > ratioVal) {
            h = ch;
            w = Math.round(ch * ratioVal);
        } else {
            w = cw;
            h = Math.round(cw / ratioVal);
        }

        setCropRect({
            x: Math.round((cw - w) / 2),
            y: Math.round((ch - h) / 2),
            width: w,
            height: h,
        });
    };

    // Reset Crop Selection
    const handleResetCrop = () => {
        setSelectedRatioId('free');
        setAspectRatio(undefined);
        setBaseImageAngle(0);
        if (canvasDimensions.width > 0 && canvasDimensions.height > 0) {
            setCropRect({
                x: 0,
                y: 0,
                width: canvasDimensions.width,
                height: canvasDimensions.height,
            });
        }
    };

    // Apply Crop to Canvas Base Image
    const handleApplyCrop = async () => {
        try {
            if (cropRect.width <= 0 || cropRect.height <= 0) return;
            const croppedUrl = await applyCrop(cropRect);
            if (croppedUrl) {
                setCurrentImageUrl(croppedUrl);
                setActiveTool(null);
            }
        } catch (err) {
            console.error('Crop failed in editor', err);
        }
    };

    // Disable background page scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Persist overlay state so re-editing restores all added objects.
    // We store against THREE keys:
    //  1. currentImageUrl — the URL that was loaded (blob or data: URL from useSecureImage)
    //  2. imageUrl — the original prop URL (backend API path)
    //  3. exportedDataUrl — the flat JPEG that becomes the new imageUrl prop after save
    // This ensures fabricJsonStore.get() succeeds on the next re-open regardless
    // of how the parent passes the image URL back.
    const saveCurrentState = (exportedDataUrl: string) => {
        const overlayState = exportCanvasJson();
        if (overlayState) {
            fabricJsonStore.set(currentImageUrl, overlayState);
            fabricJsonStore.set(imageUrl, overlayState);
            if (exportedDataUrl) {
                fabricJsonStore.set(exportedDataUrl, overlayState);
            }
        }
    };

    const handleSavePrimary = () => {
        const dataUrl = exportCanvas('jpeg', 0.95);
        if (dataUrl) {
            saveCurrentState(dataUrl);
            onSave(dataUrl, 'default');
            onClose();
        }
    };

    const handleSaveRwb = () => {
        const dataUrl = exportCanvas('jpeg', 0.95);
        if (dataUrl) {
            saveCurrentState(dataUrl);
            onSave(dataUrl, 'rwb');
            onClose();
        }
    };

    const handleSaveAndPrev = () => {
        const dataUrl = exportCanvas('jpeg', 0.95);
        if (dataUrl && onSaveAndNavigate) {
            saveCurrentState(dataUrl);
            onSaveAndNavigate(dataUrl, 'prev');
        }
    };

    const handleSaveAndNext = () => {
        const dataUrl = exportCanvas('jpeg', 0.95);
        if (dataUrl && onSaveAndNavigate) {
            saveCurrentState(dataUrl);
            onSaveAndNavigate(dataUrl, 'next');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-[#0A0C10] flex flex-col overflow-hidden text-gray-100 font-sans animate-fade-in select-none">
            {/* Modal Header Title Bar */}
            <div className="h-9 bg-[#0F121A] border-b border-gray-800/80 px-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                <span className="truncate">{modalTitle}</span>
                <span className="text-[10px] font-normal text-gray-500">{t('imageEditor.fabricEngine', 'Fabric Engine')}</span>
            </div>

            {/* Top Toolbar */}
            <EditorToolbar
                zoomPercent={zoomPercent}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onSave={handleSavePrimary}
                onSaveForRwb={handleSaveRwb}
                onSaveAndPrev={handleSaveAndPrev}
                onSaveAndNext={handleSaveAndNext}
                hasPrev={hasPrev}
                hasNext={hasNext}
                onClose={onClose}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Tool Icon Bar */}
                <LeftSidebar activeTool={activeTool} onSelectTool={setActiveTool} />

                {/* Active Tool Sub-Panel Drawer */}
                {activeTool === 'sticker' && (
                    <StickerPanel
                        onSelectArrowSticker={addArrowSticker}
                        onSelectShapePreset={addShape}
                        selectedShape={selectedShapeProperties}
                        onUpdateShape={updateActiveShape}
                        onAddCustomStickerImage={addCustomStickerImage}
                    />
                )}
                {activeTool === 'text' && (
                    <TextPanel
                        selectedText={selectedTextProperties}
                        onAddText={addText}
                        onUpdateText={updateActiveText}
                        onDuplicateText={duplicateActiveObject}
                        onDeleteText={deleteSelected}
                        onDeselect={deselectAll}
                    />
                )}
                {activeTool === 'filters' && (
                    <FilterPanel
                        activeFilter={activeFilterPreset}
                        onApplyFilter={applyFilterPreset}
                        currentImageUrl={currentImageUrl}
                    />
                )}
                {activeTool === 'corrections' && (
                    <CorrectionsPanel
                        corrections={corrections}
                        onChangeCorrections={applyCorrections}
                    />
                )}
                {activeTool === 'blur' && (
                    <BlurPanel
                        globalBlur={globalBlur}
                        onApplyBlur={applyGlobalBlur}
                    />
                )}
                {activeTool === 'draw' && (
                    <DrawPanel onToggleDraw={setDrawingMode} />
                )}
                {activeTool === 'crop' && (
                    <CropTool
                        cropRect={cropRect}
                        selectedRatioId={selectedRatioId}
                        onSelectRatio={handleSelectRatio}
                        onResetCrop={handleResetCrop}
                        onApplyCrop={handleApplyCrop}
                        onCancelCrop={() => setActiveTool(null)}
                        onRotate={rotateBaseImage}
                        onSetAngle={setBaseImageAngle}
                        onFlip={flipBaseImage}
                    />
                )}

                {/* Center Canvas Viewport */}
                <EditorCanvas
                    setCanvasEl={setCanvasEl}
                    isLoaded={isLoaded}
                    isCropping={activeTool === 'crop'}
                    cropRect={cropRect}
                    onChangeCropRect={setCropRect}
                    onRotateAngle={setBaseImageAngle}
                    aspectRatio={aspectRatio}
                    canvasDimensions={canvasDimensions}
                />
            </div>
        </div>,
        document.body
    );
};

export default ImageEditorModal;
