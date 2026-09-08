import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, RotateCcw, X, AlertTriangle, RefreshCw, Crop, Check, Layout, Square, Maximize, Printer, EyeOff } from 'lucide-react';
import { rotateImage, isPortraitImage } from '../../utils/imageRotation';
import { cropImage } from '../../utils/imageEdit';
import { useSecureImage } from '../../hooks/useSecureImage';
import SecureImage from './SecureImage';
import ModalWrapper from './ModalWrapper';
import { useTranslation } from 'react-i18next';
import { Maximize2 } from 'lucide-react';
import ImageEditorModal from '../image-editor/ImageEditorModal';

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


            {/* Full Fabric Image Editor Modal */}
            <ImageEditorModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                imageUrl={secureUrl || src}
                onSave={(newSrc) => {
                    onUpdate(newSrc);
                    setShowEditModal(false);
                }}
            />
        </div>
    );
};

export default PhotoThumbnail;
