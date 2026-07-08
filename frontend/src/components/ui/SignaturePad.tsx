import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Eraser } from 'lucide-react';
import { useSecureImage } from '../../hooks/useSecureImage';

interface SignaturePadProps {
    label: string;
    value: string; // base64 PNG or URL
    onChange: (value: string) => void;
    hideLabel?: boolean;
    readOnly?: boolean;
    onClick?: () => void;
    name?: string;
    error?: boolean;
}

/**
 * Trims the empty transparent whitespace around the drawn canvas.
 * Returns a base64 PNG of the trimmed drawing, or an empty string if nothing was drawn.
 */
const trimCanvas = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');

    const width = canvas.width;
    const height = canvas.height;

    let imgData;
    try {
        imgData = ctx.getImageData(0, 0, width, height);
    } catch (e) {
        return canvas.toDataURL('image/png');
    }

    const data = imgData.data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasPixels = false;

    // Find bounding box of non-transparent pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 5) { // Ignore minor anti-aliasing artifacts
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                hasPixels = true;
            }
        }
    }

    if (!hasPixels) {
        return '';
    }

    // Add padding around the signature (e.g. 12 physical pixels) to avoid clipping strokes
    const padding = 12;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const croppedWidth = maxX - minX;
    const croppedHeight = maxY - minY;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = croppedWidth;
    tempCanvas.height = croppedHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return canvas.toDataURL('image/png');

    tempCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
    return tempCanvas.toDataURL('image/png');
};

const SignaturePad: React.FC<SignaturePadProps> = ({ label, value, onChange, hideLabel, readOnly, onClick, name, error }) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(!!value);

    const { secureUrl } = useSecureImage(value && value.startsWith('/api/') ? value : null);

    // Keep value in ref to avoid triggering hook updates when value changes internally
    const valueRef = useRef(value);
    const secureUrlRef = useRef(secureUrl);
    const lastExportedValueRef = useRef(value);

    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        secureUrlRef.current = secureUrl;
    }, [secureUrl]);

    const initializeCanvas = useCallback((canvas: HTMLCanvasElement, rect: DOMRect) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        // Set physical pixel dimensions for HiDPI/Retina screens
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);

        // Reset to identity first, then apply DPR scale
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const currentValue = valueRef.current;
        const currentSecureUrl = secureUrlRef.current;
        const urlToLoad = (currentValue && currentValue.startsWith('data:')) ? currentValue : currentSecureUrl;

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        if (urlToLoad) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const imgWidth = img.width;
                const imgHeight = img.height;
                const canvasWidth = rect.width;
                const canvasHeight = rect.height;
                
                // Calculate scale to center and preserve aspect ratio (contain fit)
                const imgRatio = imgWidth / imgHeight;
                const canvasRatio = canvasWidth / canvasHeight;
                
                let drawWidth = canvasWidth;
                let drawHeight = canvasHeight;
                let x = 0;
                let y = 0;
                
                if (imgRatio > canvasRatio) {
                    drawHeight = canvasWidth / imgRatio;
                    y = (canvasHeight - drawHeight) / 2;
                } else {
                    drawWidth = canvasHeight * imgRatio;
                    x = (canvasWidth - drawWidth) / 2;
                }
                
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                ctx.drawImage(img, x, y, drawWidth, drawHeight);
                setHasContent(true);
            };
            img.onerror = () => setHasContent(false);
            img.src = urlToLoad;
        } else {
            setHasContent(false);
        }
    }, []);

    // Handle initial setup and resizing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleResize = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                initializeCanvas(canvas, rect);
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });

        resizeObserver.observe(canvas);
        handleResize(); // Initial call

        return () => resizeObserver.disconnect();
    }, [initializeCanvas]);

    // Handle external updates to the value prop (e.g. loaded from backend or reset)
    useEffect(() => {
        if (value !== lastExportedValueRef.current) {
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    initializeCanvas(canvas, rect);
                }
            }
            lastExportedValueRef.current = value;
        }
    }, [value, initializeCanvas]);

    // Handle asynchronous secureUrl resolution (e.g. when backend signature blob loads)
    useEffect(() => {
        if (secureUrl) {
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    initializeCanvas(canvas, rect);
                }
            }
        }
    }, [secureUrl, initializeCanvas]);

    const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        
        return { 
            x: clientX - rect.left, 
            y: clientY - rect.top 
        };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (readOnly) return;
        
        if ('touches' in e) {
            e.preventDefault();
        }

        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || readOnly) return;
        if ('touches' in e) {
            e.preventDefault();
        }

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if (!hasContent) setHasContent(true);
    };

    const endDraw = () => {
        if (!isDrawing || readOnly) return;
        setIsDrawing(false);
        
        const canvas = canvasRef.current;
        if (canvas) {
            const croppedDataUrl = trimCanvas(canvas);
            lastExportedValueRef.current = croppedDataUrl;
            onChange(croppedDataUrl);
        }
    };

    const clear = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        setHasContent(false);
        lastExportedValueRef.current = '';
        onChange('');
    };

    const handleWrapperClick = (e: React.MouseEvent) => {
        if (readOnly && onClick) {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }
    };

    return (
        <div className="space-y-1.5" ref={containerRef} data-fieldname={name}>
            {!hideLabel && (
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-tight flex items-center gap-1.5">
                        {label} 
                    </label>
                    <div className="flex items-center gap-3">
                        {hasContent && !readOnly && (
                            <button 
                                type="button"
                                onClick={clear} 
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-error-red bg-red-50 border border-red-100 rounded hover:bg-red-100 transition-colors shadow-sm"
                            >
                                <Eraser className="w-3 h-3" />
                                {t('step5.newSignature')}
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div 
                className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-all duration-300 ${
                    error ? 'border-red-500 bg-red-50/10 ring-2 ring-red-500/10' :
                    (readOnly ? 'bg-white border-gray-300 hover:border-primary/50 cursor-pointer group shadow-sm hover:shadow-md' : 
                    'bg-white border-primary/40 shadow-inner')
                }`}
                style={{ touchAction: 'none' }}
                onClick={handleWrapperClick}
            >
                <canvas
                    ref={canvasRef}
                    className={`w-full block ${readOnly ? 'pointer-events-none' : 'cursor-crosshair'}`}
                    style={{ height: readOnly ? '120px' : '320px' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                />
                
                {readOnly && !hasContent && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-primary transition-all pointer-events-none space-y-1">
                        <span className="text-sm font-bold uppercase tracking-wider">{t('step5.newSignature')}</span>
                        <span className="text-[10px] opacity-60">{t('common.clickToEdit', 'Zum Unterschreiben klicken')}</span>
                    </div>
                )}

                {!readOnly && (
                    <div className="absolute top-3 right-3 flex gap-2">
                        <button 
                            type="button"
                            onClick={clear}
                            className="p-2.5 bg-white/90 backdrop-blur shadow-md rounded-full text-error-red hover:bg-error-red hover:text-white transition-all border border-red-100 active:scale-90"
                            title={t('common.clear')}
                        >
                            <Eraser className="w-4.5 h-4.5" />
                        </button>
                    </div>
                )}

                {!readOnly && !hasContent && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none">
                        <p className="text-sm italic">{t('common.drawHere', 'Hier unterschreiben')}</p>
                    </div>
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{t('validation.required', 'Unterschrift ist erforderlich')}</p>}
        </div>
    );
};

export default SignaturePad;
