import React, { useState, useEffect, useRef } from 'react';
import { RotateCw } from 'lucide-react';

interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface CropOverlayProps {
    containerWidth: number;
    containerHeight: number;
    aspectRatio?: number; // undefined for freeform
    cropRect: CropRect;
    onChangeCropRect: (rect: CropRect) => void;
    onRotateAngle?: (angle: number) => void;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'rotate' | null;

export const CropOverlay: React.FC<CropOverlayProps> = ({
    containerWidth,
    containerHeight,
    aspectRatio,
    cropRect,
    onChangeCropRect,
    onRotateAngle,
}) => {
    const [dragMode, setDragMode] = useState<DragHandle>(null);
    const dragStartRef = useRef<{ startX: number; startY: number; initialRect: CropRect }>({
        startX: 0,
        startY: 0,
        initialRect: { x: 0, y: 0, width: 0, height: 0 },
    });

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, handle: DragHandle) => {
        e.preventDefault();
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setDragMode(handle);
        dragStartRef.current = {
            startX: clientX,
            startY: clientY,
            initialRect: { ...cropRect },
        };
    };

    useEffect(() => {
        if (!dragMode) return;

        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const dx = clientX - dragStartRef.current.startX;
            const dy = clientY - dragStartRef.current.startY;
            const init = dragStartRef.current.initialRect;

            if (dragMode === 'rotate') {
                const rectCenterX = init.x + init.width / 2;
                const rectCenterY = init.y + init.height / 2;
                const angleRad = Math.atan2(clientY - rectCenterY, clientX - rectCenterX);
                let angleDeg = Math.round(angleRad * (180 / Math.PI) + 90);
                if (angleDeg > 180) angleDeg -= 360;
                if (angleDeg < -180) angleDeg += 360;
                onRotateAngle?.(angleDeg);
                return;
            }

            let newX = init.x;
            let newY = init.y;
            let newW = init.width;
            let newH = init.height;

            if (dragMode === 'move') {
                newX = Math.max(0, Math.min(containerWidth - init.width, init.x + dx));
                newY = Math.max(0, Math.min(containerHeight - init.height, init.y + dy));
            } else {
                if (dragMode.includes('e')) {
                    newW = Math.max(40, Math.min(containerWidth - init.x, init.width + dx));
                }
                if (dragMode.includes('s')) {
                    newH = Math.max(40, Math.min(containerHeight - init.y, init.height + dy));
                }
                if (dragMode.includes('w')) {
                    const maxDx = init.width - 40;
                    const constrainedDx = Math.min(maxDx, Math.max(-init.x, dx));
                    newX = init.x + constrainedDx;
                    newW = init.width - constrainedDx;
                }
                if (dragMode.includes('n')) {
                    const maxDy = init.height - 40;
                    const constrainedDy = Math.min(maxDy, Math.max(-init.y, dy));
                    newY = init.y + constrainedDy;
                    newH = init.height - constrainedDy;
                }

                // If fixed aspect ratio is selected
                if (aspectRatio) {
                    if (dragMode === 'e' || dragMode === 'w' || dragMode === 'n' || dragMode === 's') {
                        if (dragMode === 'e' || dragMode === 'w') {
                            newH = Math.round(newW / aspectRatio);
                        } else {
                            newW = Math.round(newH * aspectRatio);
                        }
                    } else {
                        // Corner resize: adjust height based on width
                        newH = Math.round(newW / aspectRatio);
                    }

                    // Keep inside container bounds
                    if (newX + newW > containerWidth) newW = containerWidth - newX;
                    if (newY + newH > containerHeight) newH = containerHeight - newY;
                }
            }

            onChangeCropRect({
                x: Math.round(newX),
                y: Math.round(newY),
                width: Math.round(newW),
                height: Math.round(newH),
            });
        };

        const handleMouseUp = () => {
            setDragMode(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [dragMode, containerWidth, containerHeight, aspectRatio, onChangeCropRect, onRotateAngle]);

    if (containerWidth === 0 || containerHeight === 0) return null;

    return (
        <div
            className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden"
            style={{ width: containerWidth, height: containerHeight }}
        >
            {/* Dark Masked Crop Window with 9999px Box Shadow */}
            <div
                className="absolute border-2 border-orange-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-auto cursor-move"
                style={{
                    left: `${cropRect.x}px`,
                    top: `${cropRect.y}px`,
                    width: `${cropRect.width}px`,
                    height: `${cropRect.height}px`,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                onTouchStart={(e) => handleMouseDown(e, 'move')}
            >
                {/* Top Stem & Interactive Circular Rotation Handle */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-orange-500 z-40 pointer-events-none" />
                <div
                    className="absolute -top-11 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-500 border-2 border-white rounded-full cursor-grab active:cursor-grabbing z-50 shadow-md flex items-center justify-center text-white hover:scale-110 transition-transform"
                    onMouseDown={(e) => handleMouseDown(e, 'rotate')}
                    onTouchStart={(e) => handleMouseDown(e, 'rotate')}
                    title="Ziehen zum manuellen Drehen"
                >
                    <RotateCw className="w-3.5 h-3.5 text-white" />
                </div>

                {/* 3x3 Rule of Thirds Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                </div>

                {/* Live Resolution Badge Overlay */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-orange-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-sm pointer-events-none whitespace-nowrap hidden sm:block">
                    {Math.round(cropRect.width)} B × {Math.round(cropRect.height)} H px
                </div>

                {/* Corner Handles */}
                <div
                    className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-nwse-resize z-40 shadow"
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    onTouchStart={(e) => handleMouseDown(e, 'nw')}
                />
                <div
                    className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-nesw-resize z-40 shadow"
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    onTouchStart={(e) => handleMouseDown(e, 'ne')}
                />
                <div
                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-nesw-resize z-40 shadow"
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    onTouchStart={(e) => handleMouseDown(e, 'sw')}
                />
                <div
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-nwse-resize z-40 shadow"
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                    onTouchStart={(e) => handleMouseDown(e, 'se')}
                />

                {/* Edge Midpoint Handles */}
                <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border-2 border-orange-500 rounded-sm cursor-ns-resize z-40 shadow"
                    onMouseDown={(e) => handleMouseDown(e, 'n')}
                    onTouchStart={(e) => handleMouseDown(e, 'n')}
                />
                <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border-2 border-orange-500 rounded-sm cursor-ns-resize z-40 shadow"
                    onMouseDown={(e) => handleMouseDown(e, 's')}
                    onTouchStart={(e) => handleMouseDown(e, 's')}
                />
                <div
                    className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-6 bg-white border-2 border-orange-500 rounded-sm cursor-ew-resize z-40 shadow"
                    onMouseDown={(e) => handleMouseDown(e, 'w')}
                    onTouchStart={(e) => handleMouseDown(e, 'w')}
                />
                <div
                    className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-6 bg-white border-2 border-orange-500 rounded-sm cursor-ew-resize z-40 shadow"
                    onMouseDown={(e) => handleMouseDown(e, 'e')}
                    onTouchStart={(e) => handleMouseDown(e, 'e')}
                />
            </div>
        </div>
    );
};
