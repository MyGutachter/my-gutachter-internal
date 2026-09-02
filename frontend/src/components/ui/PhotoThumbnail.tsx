import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, RotateCcw, X, AlertTriangle, RefreshCw, Crop, Check, Layout, Square, Maximize, Printer, EyeOff } from 'lucide-react';
import { rotateImage, isPortraitImage } from '../../utils/imageRotation';
import { cropImage } from '../../utils/imageEdit';
import { useSecureImage } from '../../hooks/useSecureImage';
import SecureImage from './SecureImage';
import ModalWrapper from './ModalWrapper';
import { useTranslation } from 'react-i18next';
import { Maximize2 } from 'lucide-react';

interface PhotoThumbnailProps {
    src: string;
    onRemove: () => void;
    onUpdate: (newSrc: string) => void;
    className?: string;
    aspectRatio?: string; // e.g. "aspect-[4/3]"
    isExternal?: boolean;
    includeInPdf?: boolean;
    onToggleIncludeInPdf?: (include: boolean) => void;
    hidePrintOption?: boolean;
}

const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
    src,
    onRemove,
    onUpdate,
    className = "w-24 h-18",
    aspectRatio = "aspect-video",
    isExternal = false,
    includeInPdf = true,
    onToggleIncludeInPdf,
    hidePrintOption = false,
}) => {
    const { t } = useTranslation();
    const { secureUrl } = useSecureImage(src);
    const [isPortrait, setIsPortrait] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [checkTrigger, setCheckTrigger] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isCropping, setIsCropping] = useState(false);
    const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
    const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const thumbnailRef = useRef<HTMLDivElement>(null);
    const [dragMode, setDragMode] = useState<{ type: 'move' | 'resize'; corner?: string } | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, area: { x: 0, y: 0, width: 0, height: 0 } });
    const [showMobileActions, setShowMobileActions] = useState(false);

    useEffect(() => {
        if (!secureUrl) return;
        let isMounted = true;
        const img = new Image();
        img.onload = () => {
            if (isMounted) {
                setImgDimensions({ width: img.width, height: img.height });
                setIsPortrait(img.height > img.width);
                // Initialize crop area to full image if not already cropping
                if (!isCropping) {
                    setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
                }
            }
        };
        img.src = secureUrl;
        return () => { isMounted = false; };
    }, [secureUrl, checkTrigger]);

    const handleRotate = async (direction: 'left' | 'right') => {
        if (rotating || !secureUrl) return;
        setRotating(true);
        try {
            const newSrc = await rotateImage(secureUrl, direction);
            onUpdate(newSrc);
            setCheckTrigger(prev => prev + 1);
        } catch (err) {
            console.error('Rotation failed', err);
        } finally {
            setRotating(false);
        }
    };

    const handleSetAspectRatio = (ratio: number) => {
        const { width, height } = imgDimensions;
        if (width === 0 || height === 0) return;

        let newWidth, newHeight, x, y;

        if (width / height > ratio) {
            // Wider than ratio
            newHeight = height;
            newWidth = height * ratio;
            x = (width - newWidth) / 2;
            y = 0;
        } else {
            // Taller than ratio
            newWidth = width;
            newHeight = width / ratio;
            x = 0;
            y = (height - newHeight) / 2;
        }

        setCropArea({
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(newWidth),
            height: Math.round(newHeight)
        });
        setIsCropping(true);
    };

    const handleApplyCrop = async () => {
        if (rotating || !secureUrl) return;
        setRotating(true);
        try {
            const newSrc = await cropImage(secureUrl, cropArea);
            onUpdate(newSrc);
            setIsCropping(false);
            setCheckTrigger(prev => prev + 1);
        } catch (err) {
            console.error('Crop failed', err);
        } finally {
            setRotating(false);
        }
    };

    const getScreenToImageScale = () => {
        if (!containerRef.current) return 1;
        const rect = containerRef.current.getBoundingClientRect();
        return imgDimensions.width / rect.width;
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize', corner?: string) => {
        if (!isCropping) return;
        e.preventDefault();
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setDragMode({ type, corner });
        setDragStart({ x: clientX, y: clientY, area: { ...cropArea } });
    };

    useEffect(() => {
        if (!dragMode) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const scale = getScreenToImageScale();
            const dx = (clientX - dragStart.x) * scale;
            const dy = (clientY - dragStart.y) * scale;

            setCropArea(prev => {
                let newArea = { ...dragStart.area };

                if (dragMode.type === 'move') {
                    newArea.x = Math.max(0, Math.min(imgDimensions.width - newArea.width, dragStart.area.x + dx));
                    newArea.y = Math.max(0, Math.min(imgDimensions.height - newArea.height, dragStart.area.y + dy));
                } else if (dragMode.type === 'resize') {
                    const corner = dragMode.corner;
                    if (corner?.includes('right')) {
                        newArea.width = Math.max(10, Math.min(imgDimensions.width - dragStart.area.x, dragStart.area.width + dx));
                    }
                    if (corner?.includes('left')) {
                        const newX = Math.max(0, Math.min(dragStart.area.x + dragStart.area.width - 10, dragStart.area.x + dx));
                        newArea.width = dragStart.area.width + (dragStart.area.x - newX);
                        newArea.x = newX;
                    }
                    if (corner?.includes('bottom')) {
                        newArea.height = Math.max(10, Math.min(imgDimensions.height - dragStart.area.y, dragStart.area.height + dy));
                    }
                    if (corner?.includes('top')) {
                        const newY = Math.max(0, Math.min(dragStart.area.y + dragStart.area.height - 10, dragStart.area.y + dy));
                        newArea.height = dragStart.area.height + (dragStart.area.y - newY);
                        newArea.y = newY;
                    }
                }

                return {
                    x: Math.round(newArea.x),
                    y: Math.round(newArea.y),
                    width: Math.round(newArea.width),
                    height: Math.round(newArea.height)
                };
            });
        };

        const handleUp = () => {
            setDragMode(null);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [dragMode, dragStart, imgDimensions]);

    useEffect(() => {
        if (!showMobileActions) return;

        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (thumbnailRef.current && !thumbnailRef.current.contains(e.target as Node)) {
                setShowMobileActions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showMobileActions]);

    return (
        <div
            ref={thumbnailRef}
            className={`relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm transition-all hover:shadow-md ${aspectRatio} ${className}`}
        >
            <SecureImage src={src} className="w-full h-full object-cover" />

            {/* Non-print badge (Visible if marked as tool-only) */}
            {!hidePrintOption && !includeInPdf && (
                <div
                    className="absolute top-1 left-1 z-20 bg-amber-500/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 backdrop-blur-xs select-none pointer-events-none tracking-tight"
                    title={t('common.toolOnlyTooltip', 'Nur im Tool (wird nicht im PDF gedruckt)')}
                >
                    <EyeOff className="w-2.5 h-2.5 flex-shrink-0" />
                    <span>{t('common.toolOnlyBadge', 'Nur Tool')}</span>
                </div>
            )}

            {/* Click to toggle actions on mobile or open edit modal on desktop */}
            <div
                className="absolute inset-0 cursor-pointer z-10"
                onClick={() => setShowMobileActions(!showMobileActions)}
                onDoubleClick={() => setShowEditModal(true)}
                title={t('common.clickToEdit', 'Zum Bearbeiten klicken')}
            />

            {/* Actions Overlay — visible on mobile tap, or hover on desktop */}
            <div
                className={`absolute inset-0 z-20 flex items-center justify-center p-1 bg-black/40 backdrop-blur-[1px] transition-all duration-150 pointer-events-none ${showMobileActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
            >
                <div className="flex items-center justify-center gap-1 bg-gray-900/90 backdrop-blur-md p-1 rounded-lg shadow-xl border border-white/20 pointer-events-auto max-w-[96%] max-h-[96%]">
                    {/* Toggle PDF Print Button */}
                    {!hidePrintOption && onToggleIncludeInPdf && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleIncludeInPdf(!includeInPdf); }}
                            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0 ${includeInPdf
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                                }`}
                            title={includeInPdf ? t('common.printInReportTooltip', 'Dieses Bild im PDF-Gutachten drucken') : t('common.toolOnlyTooltip', 'Nur im Tool zur Beweissicherung gespeichert')}
                            aria-label={t('common.togglePrintTooltip', 'Drucken im PDF-Bericht umschalten')}
                        >
                            {includeInPdf ? <Printer className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {/* Edit/Expand Button */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
                        className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-md shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
                        title={t('common.edit') || 'Bild anpassen'}
                        aria-label={t('common.edit') || 'Edit photo'}
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove Button */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-red-600/90 hover:bg-red-500 text-white rounded-md shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
                        title={t('common.remove') || 'Entfernen'}
                        aria-label={t('common.remove') || 'Remove photo'}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>


            {/* Proper Adjustment Modal */}
            <ModalWrapper
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title={t('common.editImage', 'Bild anpassen')}
                headerExtra={!hidePrintOption && onToggleIncludeInPdf ? (
                    <button
                        type="button"
                        onClick={() => onToggleIncludeInPdf(!includeInPdf)}
                        title={includeInPdf ? t('common.printInReportTooltip', 'Dieses Bild im PDF-Gutachten drucken') : t('common.toolOnlyTooltip', 'Nur im Tool zur Beweissicherung gespeichert')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm select-none active:scale-95 ${includeInPdf
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            }`}
                    >
                        {includeInPdf ? <Printer className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-amber-600" />}
                        <span className="font-semibold text-[11px] sm:text-xs">
                            {includeInPdf ? t('common.printInReport', 'Im Bericht drucken') : t('common.toolOnlyEvidence', 'Nur im Tool (Beweis)')}
                        </span>
                        <div className={`w-7 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${includeInPdf ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${includeInPdf ? 'translate-x-3' : 'translate-x-0'}`} />
                        </div>
                    </button>
                ) : null}
            >
                <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
                    <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center select-none">
                        <div className="relative" ref={containerRef}>
                            <SecureImage
                                src={src}
                                className={`max-w-full max-h-[50vh] object-contain transition-opacity ${rotating ? 'opacity-50' : 'opacity-100'}`}
                                draggable={false}
                            />

                            {isCropping && !rotating && (
                                <div
                                    className="absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-20 cursor-move"
                                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                                    onTouchStart={(e) => handleMouseDown(e, 'move')}
                                    style={{
                                        left: `${(cropArea.x / imgDimensions.width) * 100}%`,
                                        top: `${(cropArea.y / imgDimensions.height) * 100}%`,
                                        width: `${(cropArea.width / imgDimensions.width) * 100}%`,
                                        height: `${(cropArea.height / imgDimensions.height) * 100}%`,
                                    }}
                                >
                                    {/* Corner Handles */}
                                    <div
                                        className="absolute -top-3 -left-3 w-6 h-6 bg-primary rounded-full border-2 border-white cursor-nwse-resize z-30 shadow-md"
                                        onMouseDown={(e) => handleMouseDown(e, 'resize', 'top-left')}
                                        onTouchStart={(e) => handleMouseDown(e, 'resize', 'top-left')}
                                    />
                                    <div
                                        className="absolute -top-3 -right-3 w-6 h-6 bg-primary rounded-full border-2 border-white cursor-nesw-resize z-30 shadow-md"
                                        onMouseDown={(e) => handleMouseDown(e, 'resize', 'top-right')}
                                        onTouchStart={(e) => handleMouseDown(e, 'resize', 'top-right')}
                                    />
                                    <div
                                        className="absolute -bottom-3 -left-3 w-6 h-6 bg-primary rounded-full border-2 border-white cursor-nesw-resize z-30 shadow-md"
                                        onMouseDown={(e) => handleMouseDown(e, 'resize', 'bottom-left')}
                                        onTouchStart={(e) => handleMouseDown(e, 'resize', 'bottom-left')}
                                    />
                                    <div
                                        className="absolute -bottom-3 -right-3 w-6 h-6 bg-primary rounded-full border-2 border-white cursor-nwse-resize z-30 shadow-md"
                                        onMouseDown={(e) => handleMouseDown(e, 'resize', 'bottom-right')}
                                        onTouchStart={(e) => handleMouseDown(e, 'resize', 'bottom-right')}
                                    />

                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-primary/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                            {Math.round(cropArea.width)} x {Math.round(cropArea.height)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isPortrait && !isCropping && (
                            <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg animate-pulse z-30">
                                <AlertTriangle className="w-4 h-4" />
                                {t('common.imageValidation.orientationWarningShort', 'Falsche Ausrichtung')}
                            </div>
                        )}
                    </div>

                    <div className="w-full flex flex-col gap-4">
                        {/* Info & Manual Inputs */}
                        <div className="flex flex-wrap justify-between items-center px-2 gap-4">
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                <Maximize className="w-4 h-4" />
                                <span>{Math.round(imgDimensions.width)} x {Math.round(imgDimensions.height)} px</span>
                                {isExternal && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-600/90 text-white rounded text-[9px] font-bold tracking-wider select-none uppercase shadow-sm">
                                        {t('common.external', 'Extern')}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                                    <span className="text-[10px] text-gray-400 mr-1">W</span>
                                    <input
                                        type="number"
                                        value={Math.round(cropArea.width)}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (val > 0 && val <= imgDimensions.width) {
                                                setCropArea(prev => ({ ...prev, width: val }));
                                                setIsCropping(true);
                                            }
                                        }}
                                        className="w-12 bg-transparent text-xs font-bold focus:outline-none"
                                    />
                                </div>
                                <span className="text-gray-300">×</span>
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                                    <span className="text-[10px] text-gray-400 mr-1">H</span>
                                    <input
                                        type="number"
                                        value={Math.round(cropArea.height)}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (val > 0 && val <= imgDimensions.height) {
                                                setCropArea(prev => ({ ...prev, height: val }));
                                                setIsCropping(true);
                                            }
                                        }}
                                        className="w-12 bg-transparent text-xs font-bold focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => handleSetAspectRatio(4 / 3)}
                                    className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-1 rounded font-bold hover:bg-primary/20 transition-colors"
                                >
                                    SET 4:3
                                </button>
                            </div>

                            {isCropping && (
                                <button
                                    onClick={() => {
                                        setIsCropping(false);
                                        setCropArea({ x: 0, y: 0, width: imgDimensions.width, height: imgDimensions.height });
                                    }}
                                    className="text-xs text-red-500 hover:underline font-medium"
                                >
                                    {t('common.reset', 'Zurücksetzen')}
                                </button>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <button
                                onClick={() => handleRotate('left')}
                                disabled={rotating}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
                            >
                                <RotateCcw className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                                <span className="text-xs font-medium text-gray-600">{t('common.rotateLeft')}</span>
                            </button>

                            <button
                                onClick={() => handleRotate('right')}
                                disabled={rotating}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
                            >
                                <RotateCw className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                                <span className="text-xs font-medium text-gray-600">{t('common.rotateRight')}</span>
                            </button>

                            <button
                                onClick={() => handleSetAspectRatio(4 / 3)}
                                disabled={rotating}
                                className={`flex flex-col items-center justify-center gap-2 p-3 border rounded-xl transition-all shadow-sm group ${isCropping ? 'bg-primary/5 border-primary/30' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                            >
                                <Layout className={`w-5 h-5 ${isCropping ? 'text-primary' : 'text-gray-600 group-hover:text-primary'}`} />
                                <span className="text-xs font-medium text-gray-600">{t('common.setAspectRatio', '4:3 Format')}</span>
                            </button>

                            {isCropping ? (
                                <button
                                    onClick={handleApplyCrop}
                                    disabled={rotating}
                                    className="flex flex-col items-center justify-center gap-2 p-3 bg-green-600 text-white border border-green-700 rounded-xl hover:bg-green-700 transition-all shadow-md animate-in zoom-in-95 duration-200"
                                >
                                    {rotating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    <span className="text-xs font-bold">{t('common.apply', 'Anwenden')}</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsCropping(true)}
                                    disabled={rotating}
                                    className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
                                >
                                    <Crop className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                                    <span className="text-xs font-medium text-gray-600">{t('common.crop', 'Zuschneiden')}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-sm"
                        >
                            {t('common.done', 'Fertig')}
                        </button>
                    </div>
                </div>
            </ModalWrapper>
        </div>
    );
};

export default PhotoThumbnail;
