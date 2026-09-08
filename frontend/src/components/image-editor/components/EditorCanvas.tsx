import React, { useEffect, useRef } from 'react';
import { CropOverlay } from './CropOverlay';

export interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface EditorCanvasProps {
    setCanvasEl: (el: HTMLCanvasElement | null, container: HTMLDivElement | null) => void;
    isLoaded: boolean;
    isCropping?: boolean;
    cropRect?: CropRect;
    onChangeCropRect?: (rect: CropRect) => void;
    onRotateAngle?: (angle: number) => void;
    aspectRatio?: number;
    canvasDimensions?: { width: number; height: number };
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
    setCanvasEl,
    isLoaded,
    isCropping = false,
    cropRect,
    onChangeCropRect,
    onRotateAngle,
    aspectRatio,
    canvasDimensions = { width: 0, height: 0 },
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setCanvasEl(canvasRef.current, containerRef.current);
        return () => {
            setCanvasEl(null, null);
        };
    }, [setCanvasEl]);

    return (
        <div
            ref={containerRef}
            className="flex-1 bg-[#12141A] flex items-center justify-center p-4 sm:p-6 overflow-auto relative select-none"
        >
            {!isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#12141A]/90 z-20 space-y-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-gray-400">Bild wird geladen...</span>
                </div>
            )}

            {/* Canvas Wrapper */}
            <div className="shadow-2xl rounded-sm overflow-hidden border border-gray-800 bg-[#0A0C10] relative">
                <canvas ref={canvasRef} />

                {/* Live Crop Box & Darkened Surround Overlay */}
                {isCropping && cropRect && onChangeCropRect && (
                    <CropOverlay
                        containerWidth={canvasDimensions.width}
                        containerHeight={canvasDimensions.height}
                        cropRect={cropRect}
                        onChangeCropRect={onChangeCropRect}
                        onRotateAngle={onRotateAngle}
                        aspectRatio={aspectRatio}
                    />
                )}
            </div>
        </div>
    );
};
