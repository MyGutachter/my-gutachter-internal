import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import type { ShapePreset } from '../config/presets';
import { toSafeDataUrl } from '../../../utils/imageEdit';

export interface CorrectionsState {
    brightness: number;
    contrast: number;
    saturation: number;
    gamma: number;
    clarity: number;
    exposure: number;
    shadows: number;
    highlights: number;
}

export interface ActiveTextProperties {
    text: string;
    fontFamily: string;
    fontSize: number;
    fill: string;
    fontWeight: 'bold' | 'normal';
    fontStyle: 'italic' | 'normal';
    underline: boolean;
    linethrough: boolean;
    textAlign: 'left' | 'center' | 'right';
    stroke: string;
    strokeWidth: number;
    backgroundColor: string;
    padding: number;
    hasShadow: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
}

export interface ActiveShapeProperties {
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    type: string;
}

export interface CanvasTextItem {
    id: string;
    text: string;
    fill: string;
    backgroundColor?: string;
    fontSize: number;
    fontFamily: string;
}

export function isTextObject(obj: any): boolean {
    if (!obj) return false;
    const type = (obj.type || '').toLowerCase();
    return (
        obj instanceof fabric.IText ||
        obj instanceof fabric.Textbox ||
        type === 'textbox' ||
        type === 'itext' ||
        type === 'text' ||
        type === 'i-text'
    );
}

export function isShapeObject(obj: any): boolean {
    if (!obj) return false;
    if (isTextObject(obj)) return false;
    const type = (obj.type || '').toLowerCase();
    return ['rect', 'circle', 'ellipse', 'line', 'triangle', 'path', 'polygon', 'group'].includes(type);
}

export function extractShapeProperties(obj: fabric.Object): ActiveShapeProperties {
    let fill = '#FACC15';
    if (typeof obj.fill === 'string') {
        fill = obj.fill;
    } else if (obj.fill === null || (obj.fill as any) === undefined) {
        fill = 'transparent';
    }

    let stroke = '#000000';
    if (typeof obj.stroke === 'string') {
        stroke = obj.stroke;
    } else if (obj.stroke === null) {
        stroke = 'transparent';
    }

    return {
        fill,
        stroke,
        strokeWidth: obj.strokeWidth || 0,
        opacity: obj.opacity ?? 1,
        type: (obj.type || '').toLowerCase(),
    };
}

export function extractTextProperties(obj: any): ActiveTextProperties {
    const shadow = obj.shadow as fabric.Shadow | null | undefined;
    return {
        text: obj.text ?? '',
        fontFamily: obj.fontFamily || 'Inter',
        fontSize: Math.round(obj.fontSize || 32),
        fill: typeof obj.fill === 'string' ? obj.fill : '#FACC15',
        fontWeight: obj.fontWeight === 'bold' || obj.fontWeight === '700' || obj.fontWeight === 700 ? 'bold' : 'normal',
        fontStyle: obj.fontStyle === 'italic' ? 'italic' : 'normal',
        underline: !!obj.underline,
        linethrough: !!obj.linethrough,
        textAlign: (obj.textAlign === 'left' || obj.textAlign === 'right') ? obj.textAlign : 'center',
        stroke: typeof obj.stroke === 'string' ? obj.stroke : '#000000',
        strokeWidth: obj.strokeWidth ?? 0,
        backgroundColor: (typeof obj.backgroundColor === 'string' && obj.backgroundColor) ? obj.backgroundColor : 'transparent',
        padding: obj.padding ?? 0,
        hasShadow: !!shadow,
        shadowColor: shadow?.color || 'rgba(0,0,0,0.6)',
        shadowBlur: shadow?.blur || 6,
        shadowOffsetX: shadow?.offsetX || 2,
        shadowOffsetY: shadow?.offsetY || 2,
    };
}

export interface UseFabricCanvasOptions {
    imageUrl: string;
    onSelectionChange?: (hasSelection: boolean, activeType?: string) => void;
}

// ─── Editor Overlay Store ────────────────────────────────────────────────────
// Stores ONLY overlay objects (not the background image) so that re-editing
// always loads the original clean image fresh and replays overlays on top.
// ─────────────────────────────────────────────────────────────────────────────

export interface EditorOverlayState {
    overlayObjects: string; // JSON array of fabric object descriptors
    scaleX: number;
    scaleY: number;
    /** The original clean image DataURL (before any edits were baked in) */
    originalDataUrl: string;
    corrections?: CorrectionsState;
    activeFilterPreset?: string;
    globalBlur?: number;
    baseImageAngle?: number;
    flipX?: boolean;
    flipY?: boolean;
}

export function normalizeImageKey(url: string): string {
    if (!url) return '';
    if (url.startsWith('data:')) {
        let hash = 5381;
        const len = url.length;
        const step = Math.max(1, Math.floor(len / 100));
        for (let i = 0; i < len; i += step) {
            hash = ((hash << 5) + hash) + url.charCodeAt(i);
            hash |= 0;
        }
        return `data_${len}_${Math.abs(hash)}`;
    }
    try {
        let clean = url;
        if (clean.includes('?')) clean = clean.split('?')[0];
        if (clean.includes('/api/')) clean = clean.substring(clean.indexOf('/api/'));
        const parts = clean.split('/');
        return parts[parts.length - 1] || clean;
    } catch {
        return url;
    }
}

const STORAGE_PREFIX = 'mgut_editor_overlay_v3_';
const memoryOverlayStore = new Map<string, EditorOverlayState>();

export const fabricJsonStore = {
    get: (url: string): EditorOverlayState | null => {
        if (!url) return null;
        const key = normalizeImageKey(url);
        if (memoryOverlayStore.has(key)) return memoryOverlayStore.get(key)!;
        if (memoryOverlayStore.has(url)) return memoryOverlayStore.get(url)!;
        try {
            const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
            if (raw) {
                const parsed = JSON.parse(raw) as EditorOverlayState;
                memoryOverlayStore.set(key, parsed);
                return parsed;
            }
        } catch { /* ignore */ }
        return null;
    },
    set: (url: string, state: EditorOverlayState) => {
        if (!url) return;
        const key = normalizeImageKey(url);
        memoryOverlayStore.set(key, state);
        memoryOverlayStore.set(url, state);
        try {
            sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
        } catch {
            try {
                // If quota exceeded (due to massive base64 originalDataUrl), store metadata without huge dataURL
                const fallback = { ...state, originalDataUrl: '' };
                sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(fallback));
            } catch { /* ignore quota errors */ }
        }
    },
};

export function getPresetFilters(presetId: string): fabric.filters.BaseFilter<string>[] {
    const filters: fabric.filters.BaseFilter<string>[] = [];
    switch (presetId) {
        case 'none': break;
        case 'duotone_purple_yellow': filters.push(new fabric.filters.HueRotation({ rotation: 0.6 })); filters.push(new fabric.filters.Saturation({ saturation: 0.5 })); break;
        case 'duotone_blue_red': filters.push(new fabric.filters.HueRotation({ rotation: -0.6 })); filters.push(new fabric.filters.Contrast({ contrast: 0.3 })); break;
        case 'duotone_magenta_cyan': filters.push(new fabric.filters.HueRotation({ rotation: 0.8 })); filters.push(new fabric.filters.Saturation({ saturation: 0.4 })); break;
        case 'duotone_dark_gold': filters.push(new fabric.filters.Sepia()); filters.push(new fabric.filters.Brightness({ brightness: 0.1 })); filters.push(new fabric.filters.Contrast({ contrast: 0.2 })); break;
        case 'bw_grayscale': case 'grayscale': filters.push(new fabric.filters.Grayscale()); break;
        case 'bw_high_contrast': filters.push(new fabric.filters.Grayscale()); filters.push(new fabric.filters.Contrast({ contrast: 0.4 })); break;
        case 'bw_noir': filters.push(new fabric.filters.Grayscale()); filters.push(new fabric.filters.Contrast({ contrast: 0.5 })); filters.push(new fabric.filters.Brightness({ brightness: -0.1 })); break;
        case 'bw_sepia_mono': filters.push(new fabric.filters.Grayscale()); filters.push(new fabric.filters.Sepia()); break;
        case 'bw_silvertone': filters.push(new fabric.filters.Grayscale()); filters.push(new fabric.filters.Brightness({ brightness: 0.15 })); break;
        case 'vintage_polaroid': case 'vintage': filters.push(new fabric.filters.Sepia()); filters.push(new fabric.filters.Contrast({ contrast: 0.15 })); filters.push(new fabric.filters.Brightness({ brightness: 0.1 })); break;
        case 'vintage_sunny70s': filters.push(new fabric.filters.HueRotation({ rotation: 0.1 })); filters.push(new fabric.filters.Brightness({ brightness: 0.15 })); filters.push(new fabric.filters.Saturation({ saturation: 0.2 })); break;
        case 'vintage_oldtimer': filters.push(new fabric.filters.Sepia()); filters.push(new fabric.filters.HueRotation({ rotation: -0.2 })); filters.push(new fabric.filters.Contrast({ contrast: 0.2 })); break;
        case 'vintage_inferno': filters.push(new fabric.filters.HueRotation({ rotation: 0.4 })); filters.push(new fabric.filters.Contrast({ contrast: 0.3 })); filters.push(new fabric.filters.Saturation({ saturation: 0.4 })); break;
        case 'vintage_snappy': filters.push(new fabric.filters.Saturation({ saturation: 0.5 })); filters.push(new fabric.filters.Contrast({ contrast: 0.25 })); break;
        case 'smooth_soft': filters.push(new fabric.filters.Brightness({ brightness: 0.1 })); filters.push(new fabric.filters.Contrast({ contrast: -0.1 })); break;
        case 'smooth_glamour': filters.push(new fabric.filters.Brightness({ brightness: 0.15 })); filters.push(new fabric.filters.Saturation({ saturation: 0.15 })); break;
        case 'smooth_matte': filters.push(new fabric.filters.Contrast({ contrast: -0.25 })); filters.push(new fabric.filters.Brightness({ brightness: 0.05 })); break;
        case 'smooth_faded': filters.push(new fabric.filters.Saturation({ saturation: -0.3 })); filters.push(new fabric.filters.Contrast({ contrast: -0.15 })); break;
        case 'cold_ice': case 'cold': filters.push(new fabric.filters.HueRotation({ rotation: -0.3 })); filters.push(new fabric.filters.Brightness({ brightness: 0.05 })); break;
        case 'cold_cyan': filters.push(new fabric.filters.HueRotation({ rotation: -0.4 })); filters.push(new fabric.filters.Saturation({ saturation: 0.2 })); break;
        case 'cold_deep_blue': filters.push(new fabric.filters.HueRotation({ rotation: -0.5 })); filters.push(new fabric.filters.Contrast({ contrast: 0.2 })); break;
        case 'cold_nordic': filters.push(new fabric.filters.HueRotation({ rotation: -0.2 })); filters.push(new fabric.filters.Saturation({ saturation: -0.2 })); break;
        case 'warm_sunset': filters.push(new fabric.filters.HueRotation({ rotation: 0.15 })); filters.push(new fabric.filters.Saturation({ saturation: 0.3 })); filters.push(new fabric.filters.Brightness({ brightness: 0.1 })); break;
        case 'warm_amber': filters.push(new fabric.filters.Sepia()); filters.push(new fabric.filters.Brightness({ brightness: 0.1 })); break;
        case 'warm_golden': filters.push(new fabric.filters.HueRotation({ rotation: 0.1 })); filters.push(new fabric.filters.Brightness({ brightness: 0.2 })); break;
        case 'warm_summer': filters.push(new fabric.filters.Saturation({ saturation: 0.4 })); filters.push(new fabric.filters.Brightness({ brightness: 0.1 })); break;
        case 'legacy_invert': case 'invert': filters.push(new fabric.filters.Invert()); break;
        case 'legacy_technicolor': filters.push(new fabric.filters.Contrast({ contrast: 0.4 })); filters.push(new fabric.filters.Saturation({ saturation: 0.6 })); break;
        case 'legacy_kodachrome': filters.push(new fabric.filters.Saturation({ saturation: 0.3 })); filters.push(new fabric.filters.Contrast({ contrast: 0.2 })); break;
        case 'legacy_techno': filters.push(new fabric.filters.Invert()); filters.push(new fabric.filters.Contrast({ contrast: 0.3 })); break;
        case 'sepia': filters.push(new fabric.filters.Sepia()); break;
        case 'brightness_high': filters.push(new fabric.filters.Brightness({ brightness: 0.25 })); break;
        case 'contrast_high': filters.push(new fabric.filters.Contrast({ contrast: 0.3 })); break;
    }
    return filters;
}

export function rebuildAndApplyFilters(
    img: fabric.FabricImage | null,
    canvas: fabric.Canvas | null,
    corr: CorrectionsState,
    presetId: string,
    blurVal: number
) {
    if (!img || !canvas) return;

    const filters: fabric.filters.BaseFilter<string>[] = [];

    // 1. Preset filter (if any)
    const presetFilters = getPresetFilters(presetId);
    filters.push(...presetFilters);

    // 2. Global blur (if any)
    if (blurVal > 0) {
        filters.push(new fabric.filters.Blur({ blur: blurVal / 100 }));
    }

    // 3. Brightness & Exposure & Highlights & Shadows
    const totalBrightness = Math.max(-1, Math.min(1,
        corr.brightness +
        (corr.exposure * 0.45) +
        (corr.highlights * 0.2) +
        (corr.shadows * 0.08)
    ));
    if (Math.abs(totalBrightness) > 0.005) {
        filters.push(new fabric.filters.Brightness({ brightness: totalBrightness }));
    }

    // 4. Contrast & Highlights
    const totalContrast = Math.max(-1, Math.min(1,
        corr.contrast +
        (corr.clarity * 0.15) -
        (corr.highlights * 0.1)
    ));
    if (Math.abs(totalContrast) > 0.005) {
        filters.push(new fabric.filters.Contrast({ contrast: totalContrast }));
    }

    // 5. Saturation
    if (Math.abs(corr.saturation) > 0.005) {
        filters.push(new fabric.filters.Saturation({
            saturation: Math.max(-1, Math.min(1, corr.saturation))
        }));
    }

    // 6. Gamma & Shadows (power curve with combined gamma + shadows lift)
    const combinedGammaVal = corr.gamma + (corr.shadows * 0.5);
    if (Math.abs(combinedGammaVal) > 0.005) {
        const g = combinedGammaVal >= 0
            ? (1 + combinedGammaVal * 1.5)
            : (1 / (1 + Math.abs(combinedGammaVal) * 1.5));
        const clampedG = Math.max(0.1, Math.min(4, g));
        filters.push(new fabric.filters.Gamma({ gamma: [clampedG, clampedG, clampedG] }));
    }

    // 7. Clarity (Convolution sharpening/softening matrix)
    if (Math.abs(corr.clarity) > 0.005) {
        const k = corr.clarity * 0.35;
        filters.push(new fabric.filters.Convolute({
            matrix: [
                0, -k, 0,
                -k, 1 + 4 * k, -k,
                0, -k, 0
            ],
            opaque: false
        }));
    }

    img.filters = filters;
    try {
        img.applyFilters();
    } catch (err) {
        console.warn('[ImageEditor] Error in applyFilters:', err);
    }
    canvas.renderAll();
}

// ─────────────────────────────────────────────────────────────────────────────

export function useFabricCanvas({ imageUrl, onSelectionChange }: UseFabricCanvasOptions) {
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const canvasElRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [zoomPercent, setZoomPercent] = useState(100);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const isHistoryOperationRef = useRef(false);

    const bgImageRef = useRef<fabric.FabricImage | null>(null);
    const originalImageDimensionsRef = useRef<{ width: number; height: number }>({ width: 800, height: 600 });
    const baseCanvasDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
    const lastLoadedUrlRef = useRef<string>('');
    const isLoadingRef = useRef<boolean>(false);
    const originalCleanDataUrlRef = useRef<string>('');
    const currentScaleRef = useRef<number>(1);

    const [corrections, setCorrections] = useState<CorrectionsState>({
        brightness: 0, contrast: 0, saturation: 0, gamma: 0,
        clarity: 0, exposure: 0, shadows: 0, highlights: 0,
    });
    const correctionsRef = useRef<CorrectionsState>({
        brightness: 0, contrast: 0, saturation: 0, gamma: 0,
        clarity: 0, exposure: 0, shadows: 0, highlights: 0,
    });
    const [activeFilterPreset, setActiveFilterPreset] = useState<string>('none');
    const activeFilterPresetRef = useRef<string>('none');
    const [globalBlur, setGlobalBlur] = useState<number>(0);
    const globalBlurRef = useRef<number>(0);
    const [selectedTextProperties, setSelectedTextProperties] = useState<ActiveTextProperties | null>(null);
    const [selectedShapeProperties, setSelectedShapeProperties] = useState<ActiveShapeProperties | null>(null);
    const [canvasTexts, setCanvasTexts] = useState<CanvasTextItem[]>([]);

    const refreshCanvasTexts = useCallback(() => {
        if (!canvasRef.current) {
            setCanvasTexts([]);
            return;
        }
        const objs = canvasRef.current.getObjects().filter(obj => obj !== bgImageRef.current && isTextObject(obj));
        const items: CanvasTextItem[] = objs.map((obj: any, idx: number) => ({
            id: obj.id || `text_${idx}`,
            text: obj.text || '',
            fill: (typeof obj.fill === 'string' ? obj.fill : '#FFFFFF') || '#FFFFFF',
            backgroundColor: typeof obj.backgroundColor === 'string' ? obj.backgroundColor : 'transparent',
            fontSize: obj.fontSize || 24,
            fontFamily: obj.fontFamily || 'Inter',
        }));
        setCanvasTexts(items);
    }, []);

    const selectTextObject = useCallback((index: number) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const objs = canvas.getObjects().filter(obj => obj !== bgImageRef.current && isTextObject(obj));
        if (objs[index]) {
            canvas.setActiveObject(objs[index]);
            setSelectedTextProperties(extractTextProperties(objs[index]));
            canvas.requestRenderAll();
        }
    }, []);

    const onSelectionChangeRef = useRef(onSelectionChange);
    useEffect(() => {
        onSelectionChangeRef.current = onSelectionChange;
    }, [onSelectionChange]);

    const imageUrlRef = useRef(imageUrl);
    useEffect(() => {
        imageUrlRef.current = imageUrl;
    }, [imageUrl]);

    const saveSnapshot = useCallback(() => {
        if (!canvasRef.current || isHistoryOperationRef.current) return;
        const json = JSON.stringify(canvasRef.current.toJSON());
        const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        newHistory.push(json);
        historyRef.current = newHistory;
        historyIndexRef.current = newHistory.length - 1;
        setCanUndo(newHistory.length > 1 && historyIndexRef.current > 0);
        setCanRedo(false);
        refreshCanvasTexts();
    }, [refreshCanvasTexts]);

    const cleanupCanvas = useCallback(() => {
        if (canvasRef.current) {
            try { canvasRef.current.dispose(); } catch { /* ignore */ }
            canvasRef.current = null;
        }
        canvasElRef.current = null;
        bgImageRef.current = null;
        lastLoadedUrlRef.current = '';
        isLoadingRef.current = false;
        setIsLoaded(false);
    }, []);

    useEffect(() => { return () => { cleanupCanvas(); }; }, [cleanupCanvas]);

    const applySavedOverlays = useCallback(async (
        canvas: fabric.Canvas,
        overlayJson: string,
        savedScale: number,
        currentScale: number,
    ) => {
        try {
            const overlayObjects = JSON.parse(overlayJson) as any[];
            if (!Array.isArray(overlayObjects) || overlayObjects.length === 0) return;
            const ratio = currentScale / savedScale;

            for (const objData of overlayObjects) {
                try {
                    const adjusted: any = {
                        ...objData,
                        left: (objData.left ?? 0) * ratio,
                        top: (objData.top ?? 0) * ratio,
                        scaleX: (objData.scaleX ?? 1) * ratio,
                        scaleY: (objData.scaleY ?? 1) * ratio,
                        selectable: true,
                        evented: true,
                        cornerColor: '#F97316',
                        cornerStyle: 'circle',
                        transparentCorners: false,
                    };

                    const cleanOpts: any = { ...adjusted };
                    delete cleanOpts.type;
                    delete cleanOpts.version;

                    let obj: fabric.Object | null = null;
                    const type = (objData.type || '').toLowerCase();

                    if (type === 'rect') {
                        obj = new fabric.Rect(cleanOpts);
                    } else if (type === 'circle') {
                        obj = new fabric.Circle(cleanOpts);
                    } else if (type === 'ellipse') {
                        obj = new fabric.Ellipse(cleanOpts);
                    } else if (type === 'triangle') {
                        obj = new fabric.Triangle(cleanOpts);
                    } else if (type === 'line') {
                        const x1 = (objData.x1 ?? 0) * ratio;
                        const y1 = (objData.y1 ?? 0) * ratio;
                        const x2 = (objData.x2 ?? 0) * ratio;
                        const y2 = (objData.y2 ?? 0) * ratio;
                        obj = new fabric.Line([x1, y1, x2, y2], cleanOpts);
                    } else if (type === 'path') {
                        obj = new fabric.Path(objData.path, cleanOpts);
                    } else if (type === 'textbox') {
                        obj = new fabric.Textbox(objData.text ?? '', {
                            ...cleanOpts,
                            paintFirst: cleanOpts.paintFirst || 'stroke',
                            editable: true,
                            selectable: true,
                            evented: true,
                        });
                    } else if (type === 'itext' || type === 'text' || type === 'i-text') {
                        obj = new fabric.IText(objData.text ?? '', {
                            ...cleanOpts,
                            paintFirst: cleanOpts.paintFirst || 'stroke',
                            editable: true,
                            selectable: true,
                            evented: true,
                        });
                    } else if (type === 'polygon') {
                        const points = (objData.points || []).map((p: any) => ({
                            x: (p.x ?? 0) * ratio,
                            y: (p.y ?? 0) * ratio,
                        }));
                        obj = new fabric.Polygon(points, cleanOpts);
                    } else if (type === 'image' || type === 'fabricimage') {
                        const src = objData.src || (objData as any)._element?.src;
                        if (src) {
                            try {
                                const img = await fabric.FabricImage.fromURL(src);
                                (img as any).src = src;
                                img.set({
                                    ...cleanOpts,
                                    left: cleanOpts.left,
                                    top: cleanOpts.top,
                                    scaleX: cleanOpts.scaleX,
                                    scaleY: cleanOpts.scaleY,
                                    angle: cleanOpts.angle ?? 0,
                                    originX: cleanOpts.originX || 'center',
                                    originY: cleanOpts.originY || 'center',
                                    selectable: true,
                                    evented: true,
                                    cornerColor: '#F97316',
                                    cornerStyle: 'circle' as const,
                                    transparentCorners: false,
                                });

                                // Safeguard against legacy oversized states
                                const canvasW = canvas.width || 800;
                                const effectiveW = (img.width || 100) * (img.scaleX || 1);
                                if (effectiveW > canvasW * 0.9) {
                                    const safeScale = (canvasW * 0.25) / (img.width || 100);
                                    img.set({ scaleX: safeScale, scaleY: safeScale });
                                }

                                img.setCoords();
                                obj = img;
                            } catch (imgErr) {
                                console.warn('[ImageEditor] Failed to restore image overlay:', imgErr);
                            }
                        }
                    } else if (type === 'group') {
                        const tmpEl = document.createElement('canvas');
                        const tmp = new fabric.Canvas(tmpEl);
                        await tmp.loadFromJSON({ version: '6.0.0', objects: [adjusted] });
                        const objs = tmp.getObjects();
                        if (objs.length > 0) {
                            obj = objs[0];
                            obj.set({ selectable: true, evented: true, cornerColor: '#F97316', cornerStyle: 'circle' as const, transparentCorners: false });
                        }
                        tmp.dispose();
                        tmpEl.remove();
                    }

                    if (obj) {
                        if (objData.shadow && !(obj.shadow instanceof fabric.Shadow)) {
                            obj.set('shadow', new fabric.Shadow(objData.shadow));
                        }
                        obj.setCoords();
                        canvas.add(obj);
                    }
                } catch (objErr) {
                    console.warn('[ImageEditor] Failed to restore overlay object:', objErr);
                }
            }
            canvas.renderAll();
        } catch (err) {
            console.warn('[ImageEditor] Failed to apply saved overlays:', err);
        }
    }, []);

    const loadBaseImage = useCallback(async (url: string) => {
        if (!canvasRef.current || !url) return;
        if (isLoadingRef.current) return;
        if (lastLoadedUrlRef.current === url && bgImageRef.current) return;

        try {
            isLoadingRef.current = true;
            setIsLoaded(false);
            const canvas = canvasRef.current;

            // Check for saved overlay state first — it may contain the original clean image
            const savedState = fabricJsonStore.get(url);

            // Use the stored original clean image if available, otherwise fetch the url.
            // This is critical: when re-editing a saved image, `url` may be a baked DataURL
            // (with arrows already burned in). We must load the original clean photo instead.
            const imageSourceUrl = savedState?.originalDataUrl || url;

            const safeUrl = await toSafeDataUrl(imageSourceUrl);
            originalCleanDataUrlRef.current = safeUrl;

            const options: Record<string, any> = {};
            if (safeUrl.startsWith('http://') || safeUrl.startsWith('https://')) {
                options.crossOrigin = 'anonymous';
            }

            const fabricImg = await fabric.FabricImage.fromURL(safeUrl, options);
            if (!canvasRef.current) return;

            canvas.clear();
            canvas.backgroundColor = '#111827';

            let containerWidth = containerRef.current?.clientWidth || 0;
            let containerHeight = containerRef.current?.clientHeight || 0;
            if (containerWidth === 0 || containerHeight === 0) {
                containerWidth = Math.round(window.innerWidth * 0.7);
                containerHeight = Math.round(window.innerHeight * 0.7);
            }

            const imgWidth = fabricImg.width || 800;
            const imgHeight = fabricImg.height || 600;
            originalImageDimensionsRef.current = { width: imgWidth, height: imgHeight };

            const scaleX = (containerWidth * 0.85) / imgWidth;
            const scaleY = (containerHeight * 0.80) / imgHeight;
            const scale = Math.min(scaleX, scaleY, 1);
            currentScaleRef.current = scale;

            const canvasWidth = Math.round(imgWidth * scale);
            const canvasHeight = Math.round(imgHeight * scale);

            canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
            baseCanvasDimensionsRef.current = { width: canvasWidth, height: canvasHeight };
            setCanvasDimensions({ width: canvasWidth, height: canvasHeight });

            fabricImg.set({
                originX: 'left', originY: 'top',
                left: 0, top: 0,
                scaleX: scale, scaleY: scale,
                selectable: false, evented: false,
                hasControls: false, lockMovementX: true, lockMovementY: true,
            });

            bgImageRef.current = fabricImg;
            canvas.add(fabricImg);
            canvas.sendObjectToBack(fabricImg);
            canvas.renderAll();

            // Restore saved overlay objects on top of the clean background
            if (savedState?.overlayObjects) {
                await applySavedOverlays(canvas, savedState.overlayObjects, savedState.scaleX, scale);
            }
            refreshCanvasTexts();

            // Restore saved rotation and flip if present
            if (savedState?.baseImageAngle) {
                const normalizedAngle = (savedState.baseImageAngle % 360 + 360) % 360;
                fabricImg.set('angle', normalizedAngle);
            }
            if (savedState?.flipX) {
                fabricImg.set('flipX', true);
            }
            if (savedState?.flipY) {
                fabricImg.set('flipY', true);
            }

            // Restore saved corrections, filterPreset, and blur
            const restoredCorrections: CorrectionsState = savedState?.corrections ? { ...savedState.corrections } : {
                brightness: 0, contrast: 0, saturation: 0, gamma: 0,
                clarity: 0, exposure: 0, shadows: 0, highlights: 0,
            };
            const restoredPreset = savedState?.activeFilterPreset || 'none';
            const restoredBlur = savedState?.globalBlur || 0;

            correctionsRef.current = restoredCorrections;
            setCorrections(restoredCorrections);
            activeFilterPresetRef.current = restoredPreset;
            setActiveFilterPreset(restoredPreset);
            globalBlurRef.current = restoredBlur;
            setGlobalBlur(restoredBlur);

            rebuildAndApplyFilters(fabricImg, canvas, restoredCorrections, restoredPreset, restoredBlur);

            canvas.renderAll();
            setIsLoaded(true);
            lastLoadedUrlRef.current = url;

            historyRef.current = [];
            historyIndexRef.current = -1;
            saveSnapshot();
        } catch (err) {
            console.error('[ImageEditor] Failed to load image into Fabric canvas', err);
            setIsLoaded(true);
        } finally {
            isLoadingRef.current = false;
        }
    }, [saveSnapshot, applySavedOverlays]);

    const setCanvasEl = useCallback((el: HTMLCanvasElement | null, container: HTMLDivElement | null) => {
        if (!el) { cleanupCanvas(); containerRef.current = null; return; }
        if (canvasRef.current && canvasElRef.current === el) return;

        cleanupCanvas();
        canvasElRef.current = el;
        containerRef.current = container;

        const canvas = new fabric.Canvas(el, {
            preserveObjectStacking: true, selection: true, backgroundColor: '#111827',
        });
        canvasRef.current = canvas;

        canvas.on('object:modified', () => saveSnapshot());
        canvas.on('object:added', (e: any) => { if (e.target !== bgImageRef.current) saveSnapshot(); });
        canvas.on('object:removed', (e: any) => { if (e.target !== bgImageRef.current) saveSnapshot(); });
        const syncSelection = () => {
            const activeObj = canvas.getActiveObject();
            if (isTextObject(activeObj)) {
                setSelectedTextProperties(extractTextProperties(activeObj));
                setSelectedShapeProperties(null);
            } else if (activeObj && activeObj !== bgImageRef.current) {
                setSelectedTextProperties(null);
                setSelectedShapeProperties(extractShapeProperties(activeObj));
            } else {
                setSelectedTextProperties(null);
                setSelectedShapeProperties(null);
            }
            onSelectionChangeRef.current?.(!!activeObj, activeObj?.type);
        };

        canvas.on('selection:created', syncSelection);
        canvas.on('selection:updated', syncSelection);
        canvas.on('selection:cleared', () => {
            setSelectedTextProperties(null);
            setSelectedShapeProperties(null);
            onSelectionChangeRef.current?.(false);
        });
        canvas.on('text:changed', () => {
            const activeObj = canvas.getActiveObject();
            if (isTextObject(activeObj)) {
                setSelectedTextProperties(extractTextProperties(activeObj));
            }
            saveSnapshot();
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const active = canvas.getActiveObjects();
                if (active?.length > 0) {
                    active.forEach(obj => { if (obj !== bgImageRef.current) canvas.remove(obj); });
                    canvas.discardActiveObject();
                    canvas.renderAll();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        if (imageUrlRef.current) loadBaseImage(imageUrlRef.current);
    }, [cleanupCanvas, loadBaseImage, saveSnapshot]);

    useEffect(() => {
        if (canvasRef.current && imageUrl && imageUrl !== lastLoadedUrlRef.current) {
            loadBaseImage(imageUrl);
        }
    }, [imageUrl, loadBaseImage]);

    const undo = useCallback(() => {
        if (!canvasRef.current || historyIndexRef.current <= 0) return;
        isHistoryOperationRef.current = true;
        historyIndexRef.current -= 1;
        canvasRef.current.loadFromJSON(historyRef.current[historyIndexRef.current]).then(() => {
            canvasRef.current?.renderAll();
            isHistoryOperationRef.current = false;
            setCanUndo(historyIndexRef.current > 0);
            setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        });
    }, []);

    const redo = useCallback(() => {
        if (!canvasRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
        isHistoryOperationRef.current = true;
        historyIndexRef.current += 1;
        canvasRef.current.loadFromJSON(historyRef.current[historyIndexRef.current]).then(() => {
            canvasRef.current?.renderAll();
            isHistoryOperationRef.current = false;
            setCanUndo(historyIndexRef.current > 0);
            setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        });
    }, []);

    const setZoom = useCallback((pct: number) => {
        if (!canvasRef.current) return;
        const zoomFactor = pct / 100;
        const baseW = baseCanvasDimensionsRef.current.width || 800;
        const baseH = baseCanvasDimensionsRef.current.height || 600;
        canvasRef.current.setZoom(zoomFactor);
        canvasRef.current.setDimensions({ width: Math.round(baseW * zoomFactor), height: Math.round(baseH * zoomFactor) });
        canvasRef.current.renderAll();
        setZoomPercent(pct);
    }, []);

    const zoomIn = useCallback(() => setZoom(Math.min(250, zoomPercent + 10)), [zoomPercent, setZoom]);
    const zoomOut = useCallback(() => setZoom(Math.max(25, zoomPercent - 10)), [zoomPercent, setZoom]);

    const deleteSelected = useCallback(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const active = canvas.getActiveObjects();
        if (active?.length > 0) {
            active.forEach(obj => { if (obj !== bgImageRef.current) canvas.remove(obj); });
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    }, []);

    const updateActiveShape = useCallback((props: Partial<ActiveShapeProperties>) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const activeObj = canvas.getActiveObject();
        if (!activeObj || activeObj === bgImageRef.current || isTextObject(activeObj)) return;

        if (activeObj.type === 'group') {
            const group = activeObj as fabric.Group;
            group.getObjects().forEach((child: any) => {
                if (props.fill !== undefined && child.type !== 'line') child.set('fill', props.fill);
                if (props.stroke !== undefined) child.set('stroke', props.stroke);
                if (props.strokeWidth !== undefined && child.type === 'line') child.set('strokeWidth', props.strokeWidth);
            });
        } else {
            if (props.fill !== undefined) activeObj.set('fill', props.fill);
            if (props.stroke !== undefined) activeObj.set('stroke', props.stroke);
            if (props.strokeWidth !== undefined) activeObj.set('strokeWidth', props.strokeWidth);
            if (props.opacity !== undefined) activeObj.set('opacity', props.opacity);
        }

        canvas.renderAll();
        saveSnapshot();
        setSelectedShapeProperties(extractShapeProperties(activeObj));
    }, [saveSnapshot]);

    const addShape = useCallback((preset: ShapePreset, customOverrides?: Partial<ShapePreset>) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.isDrawingMode = false;
        const center = canvas.getCenterPoint();

        const fill = customOverrides?.fill !== undefined ? customOverrides.fill : preset.fill;
        const stroke = customOverrides?.stroke !== undefined ? customOverrides.stroke : preset.stroke;
        const strokeWidth = customOverrides?.strokeWidth !== undefined ? customOverrides.strokeWidth : preset.strokeWidth;

        const commonOpts = {
            left: center.x, top: center.y,
            originX: 'center' as const, originY: 'center' as const,
            fill, stroke, strokeWidth,
            cornerColor: '#F97316', cornerStyle: 'circle' as const, transparentCorners: false,
        };

        let obj: fabric.Object | null = null;
        if (preset.type === 'rect') {
            obj = new fabric.Rect({ ...commonOpts, width: 120, height: 80 });
        } else if (preset.type === 'rounded_rect') {
            obj = new fabric.Rect({ ...commonOpts, width: 120, height: 80, rx: preset.rx || 15, ry: preset.ry || 15 });
        } else if (preset.type === 'circle') {
            obj = new fabric.Circle({ ...commonOpts, radius: 50 });
        } else if (preset.type === 'ellipse') {
            obj = new fabric.Ellipse({ ...commonOpts, rx: 60, ry: 40 });
        } else if (preset.type === 'line') {
            obj = new fabric.Line([center.x - 60, center.y, center.x + 60, center.y], { ...commonOpts });
        } else if (preset.type === 'vert_line') {
            obj = new fabric.Line([center.x, center.y - 60, center.x, center.y + 60], { ...commonOpts });
        } else if (preset.type === 'triangle') {
            obj = new fabric.Triangle({ ...commonOpts, width: 100, height: 90 });
        } else if (preset.type === 'arrow_line') {
            const line = new fabric.Line([0, 0, 100, 0], { stroke, strokeWidth, originX: 'center', originY: 'center' });
            const head = new fabric.Triangle({ width: 18, height: 18, fill: fill !== 'transparent' ? fill : stroke, left: 50, top: 0, angle: 90, originX: 'center', originY: 'center' });
            obj = new fabric.Group([line, head], { left: center.x, top: center.y, originX: 'center', originY: 'center' });
        } else if (preset.type === 'star') {
            obj = new fabric.Path('M 0 -50 L 15 -16 L 52 -16 L 23 6 L 34 42 L 0 20 L -34 42 L -23 6 L -52 -16 L -15 -16 Z', { ...commonOpts, scaleX: 0.9, scaleY: 0.9 });
        } else if (preset.type === 'diamond') {
            obj = new fabric.Path('M 0 -50 L 50 0 L 0 50 L -50 0 Z', { ...commonOpts, scaleX: 0.9, scaleY: 0.9 });
        } else if (preset.type === 'cross') {
            obj = new fabric.Path('M -12 -50 L 12 -50 L 12 -12 L 50 -12 L 50 12 L 12 12 L 12 50 L -12 50 L -12 12 L -50 12 L -50 -12 L -12 -12 Z', { ...commonOpts, scaleX: 0.8, scaleY: 0.8 });
        } else if (preset.type === 'double_arrow') {
            obj = new fabric.Path('M -70 0 L -45 -14 L -45 -5 L 45 -5 L 45 -14 L 70 0 L 45 14 L 45 5 L -45 5 L -45 14 Z', { ...commonOpts, scaleX: 0.85, scaleY: 0.85 });
        } else if (preset.type === 'callout') {
            obj = new fabric.Path('M -55 -35 L 55 -35 Q 70 -35 70 -20 L 70 20 Q 70 35 55 35 L 15 35 L -10 55 L -5 35 L -55 35 Q -70 35 -70 20 L -70 -20 Q -70 -35 -55 -35 Z', { ...commonOpts, scaleX: 0.85, scaleY: 0.85 });
        } else if (preset.type === 'hexagon') {
            obj = new fabric.Path('M -28 -48 L 28 -48 L 56 0 L 28 48 L -28 48 L -56 0 Z', { ...commonOpts, scaleX: 0.9, scaleY: 0.9 });
        } else if (preset.type === 'marker_pin') {
            obj = new fabric.Path('M 0 -50 C -25 -50 -42 -32 -42 -10 C -42 20 0 55 0 55 C 0 55 42 20 42 -10 C 42 -32 25 -50 0 -50 Z M 0 -22 A 14 14 0 1 0 0 6 A 14 14 0 1 0 0 -22 Z', { ...commonOpts, scaleX: 0.85, scaleY: 0.85 });
        } else if (preset.type === 'dashed_rect') {
            obj = new fabric.Rect({ ...commonOpts, width: 130, height: 85, strokeDashArray: preset.strokeDashArray || [8, 6] });
        } else if (preset.type === 'dashed_circle') {
            obj = new fabric.Circle({ ...commonOpts, radius: 50, strokeDashArray: preset.strokeDashArray || [8, 6] });
        } else if (preset.type === 'dashed_line') {
            obj = new fabric.Line([center.x - 60, center.y, center.x + 60, center.y], { ...commonOpts, strokeDashArray: preset.strokeDashArray || [8, 6] });
        }

        if (obj) { canvas.add(obj); canvas.setActiveObject(obj); canvas.renderAll(); }
    }, []);

    const addCustomStickerImage = useCallback(async (dataUrl: string) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.isDrawingMode = false;
        const center = canvas.getCenterPoint();

        try {
            const img = await fabric.FabricImage.fromURL(dataUrl);
            const maxDimension = 150;
            const currentW = img.width || 100;
            const currentH = img.height || 100;
            const scale = Math.min(maxDimension / currentW, maxDimension / currentH, 1);

            img.set({
                left: center.x,
                top: center.y,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                cornerColor: '#F97316',
                cornerStyle: 'circle' as const,
                transparentCorners: false,
            });
            (img as any).src = dataUrl;
            img.setCoords();

            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            saveSnapshot();
        } catch (err) {
            console.error('[ImageEditor] Failed to add custom sticker image', err);
        }
    }, [saveSnapshot]);

    const addArrowSticker = useCallback((colorHex: string) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.isDrawingMode = false;
        const center = canvas.getCenterPoint();
        const arrow = new fabric.Path('M 0 -20 L 70 -20 L 70 -40 L 130 0 L 70 40 L 70 20 L 0 20 Z', {
            left: center.x, top: center.y,
            originX: 'center', originY: 'center',
            fill: colorHex,
            stroke: colorHex === '#FFFFFF' ? '#6B7280' : '#000000',
            strokeWidth: 2, scaleX: 0.8, scaleY: 0.8,
            cornerColor: '#F97316', cornerStyle: 'circle' as const, transparentCorners: false,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', blur: 8, offsetX: 3, offsetY: 3 }),
        });
        canvas.add(arrow);
        canvas.setActiveObject(arrow);
        canvas.renderAll();
    }, []);

    const addText = useCallback((text = 'Text eingeben...', opts: Partial<ActiveTextProperties> = {}) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.isDrawingMode = false;
        const center = canvas.getCenterPoint();

        const shadow = opts.hasShadow ? new fabric.Shadow({
            color: opts.shadowColor || 'rgba(0,0,0,0.6)',
            blur: opts.shadowBlur ?? 6,
            offsetX: opts.shadowOffsetX ?? 2,
            offsetY: opts.shadowOffsetY ?? 2,
        }) : null;

        const fontSize = opts.fontSize || 32;
        const canvasW = canvas.width || 800;
        const width = Math.max(160, Math.min(canvasW * 0.75, Math.max(220, text.length * fontSize * 0.75)));

        const textObj = new fabric.Textbox(text, {
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
            width,
            fontFamily: opts.fontFamily || 'Inter',
            fontSize,
            fill: opts.fill || '#FACC15',
            fontWeight: opts.fontWeight || 'bold',
            fontStyle: opts.fontStyle || 'normal',
            underline: !!opts.underline,
            linethrough: !!opts.linethrough,
            textAlign: opts.textAlign || 'center',
            stroke: opts.stroke || '#000000',
            strokeWidth: opts.strokeWidth !== undefined ? opts.strokeWidth : 1.5,
            paintFirst: 'stroke',
            backgroundColor: opts.backgroundColor || 'transparent',
            padding: opts.padding !== undefined ? opts.padding : 6,
            shadow,
            cornerColor: '#F97316',
            cornerStyle: 'circle' as const,
            transparentCorners: false,
            borderColor: '#F97316',
        });

        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        canvas.requestRenderAll();
        setSelectedTextProperties(extractTextProperties(textObj));
        saveSnapshot();
    }, [saveSnapshot]);

    const updateActiveText = useCallback((updates: Partial<ActiveTextProperties>) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const activeObj = canvas.getActiveObject() as any;
        if (!isTextObject(activeObj)) return;

        if (updates.text !== undefined) activeObj.set('text', updates.text);
        if (updates.fontFamily !== undefined) activeObj.set('fontFamily', updates.fontFamily);
        if (updates.fontSize !== undefined) activeObj.set('fontSize', updates.fontSize);
        if (updates.fill !== undefined) activeObj.set('fill', updates.fill);
        if (updates.fontWeight !== undefined) activeObj.set('fontWeight', updates.fontWeight);
        if (updates.fontStyle !== undefined) activeObj.set('fontStyle', updates.fontStyle);
        if (updates.underline !== undefined) activeObj.set('underline', updates.underline);
        if (updates.linethrough !== undefined) activeObj.set('linethrough', updates.linethrough);
        if (updates.textAlign !== undefined) activeObj.set('textAlign', updates.textAlign);
        if (updates.stroke !== undefined) {
            activeObj.set('stroke', updates.stroke);
            activeObj.set('paintFirst', 'stroke');
        }
        if (updates.strokeWidth !== undefined) {
            activeObj.set('strokeWidth', updates.strokeWidth);
            activeObj.set('paintFirst', 'stroke');
        }
        if (updates.backgroundColor !== undefined) activeObj.set('backgroundColor', updates.backgroundColor);
        if (updates.padding !== undefined) activeObj.set('padding', updates.padding);

        if (updates.hasShadow !== undefined || updates.shadowColor !== undefined || updates.shadowBlur !== undefined || updates.shadowOffsetX !== undefined || updates.shadowOffsetY !== undefined) {
            const hasShadow = updates.hasShadow !== undefined ? updates.hasShadow : !!activeObj.shadow;
            if (hasShadow) {
                const color = updates.shadowColor ?? (activeObj.shadow?.color || 'rgba(0,0,0,0.6)');
                const blur = updates.shadowBlur ?? (activeObj.shadow?.blur ?? 6);
                const offsetX = updates.shadowOffsetX ?? (activeObj.shadow?.offsetX ?? 2);
                const offsetY = updates.shadowOffsetY ?? (activeObj.shadow?.offsetY ?? 2);
                activeObj.set('shadow', new fabric.Shadow({ color, blur, offsetX, offsetY }));
            } else {
                activeObj.set('shadow', null);
            }
        }

        activeObj.initDimensions?.();
        activeObj.setCoords();
        canvas.requestRenderAll();
        setSelectedTextProperties(extractTextProperties(activeObj));
        saveSnapshot();
    }, [saveSnapshot]);

    const duplicateActiveObject = useCallback(async () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const active = canvas.getActiveObject();
        if (!active || active === bgImageRef.current) return;

        try {
            const cloned = await active.clone();
            cloned.set({
                left: (active.left ?? 0) + 24,
                top: (active.top ?? 0) + 24,
                cornerColor: '#F97316',
                cornerStyle: 'circle' as const,
                transparentCorners: false,
            });
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.requestRenderAll();
            if (isTextObject(cloned)) {
                setSelectedTextProperties(extractTextProperties(cloned));
            }
            saveSnapshot();
        } catch (err) {
            console.warn('[ImageEditor] Failed to clone active object', err);
        }
    }, [saveSnapshot]);

    const deselectAll = useCallback(() => {
        if (!canvasRef.current) return;
        canvasRef.current.discardActiveObject();
        canvasRef.current.requestRenderAll();
        setSelectedTextProperties(null);
    }, []);

    const setDrawingMode = useCallback((enabled: boolean, opts: { color?: string; width?: number; opacity?: number } = {}) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.isDrawingMode = enabled;
        if (enabled) {
            const brush = new fabric.PencilBrush(canvas);
            brush.color = opts.color || '#FACC15';
            brush.width = opts.width || 5;
            canvas.freeDrawingBrush = brush;
        }
    }, []);

    const applyFilterPreset = useCallback((presetId: string) => {
        if (!bgImageRef.current || !canvasRef.current) return;
        activeFilterPresetRef.current = presetId;
        setActiveFilterPreset(presetId);
        rebuildAndApplyFilters(
            bgImageRef.current,
            canvasRef.current,
            correctionsRef.current,
            presetId,
            globalBlurRef.current
        );
        saveSnapshot();
    }, [saveSnapshot]);

    const applyCorrections = useCallback((newCorrections: Partial<CorrectionsState>) => {
        if (!bgImageRef.current || !canvasRef.current) return;
        const updated = { ...correctionsRef.current, ...newCorrections };
        correctionsRef.current = updated;
        setCorrections(updated);
        rebuildAndApplyFilters(
            bgImageRef.current,
            canvasRef.current,
            updated,
            activeFilterPresetRef.current,
            globalBlurRef.current
        );
    }, []);

    const commitCorrectionsSnapshot = useCallback(() => {
        saveSnapshot();
    }, [saveSnapshot]);

    const applyGlobalBlur = useCallback((blurVal: number) => {
        if (!bgImageRef.current || !canvasRef.current) return;
        globalBlurRef.current = blurVal;
        setGlobalBlur(blurVal);
        rebuildAndApplyFilters(
            bgImageRef.current,
            canvasRef.current,
            correctionsRef.current,
            activeFilterPresetRef.current,
            blurVal
        );
    }, []);

    const applyRotation = useCallback((targetAngle: number) => {
        if (!bgImageRef.current || !canvasRef.current) return;
        const img = bgImageRef.current;
        const canvas = canvasRef.current;
        const normalizedAngle = (targetAngle % 360 + 360) % 360;
        const rad = (normalizedAngle * Math.PI) / 180;
        let containerWidth = containerRef.current?.clientWidth || 0;
        let containerHeight = containerRef.current?.clientHeight || 0;
        if (containerWidth === 0 || containerHeight === 0) { containerWidth = Math.round(window.innerWidth * 0.7); containerHeight = Math.round(window.innerHeight * 0.7); }
        const origW = originalImageDimensionsRef.current.width || img.width || 800;
        const origH = originalImageDimensionsRef.current.height || img.height || 600;
        const boundW = Math.abs(origW * Math.cos(rad)) + Math.abs(origH * Math.sin(rad));
        const boundH = Math.abs(origW * Math.sin(rad)) + Math.abs(origH * Math.cos(rad));
        const scaleX = (containerWidth * 0.85) / boundW;
        const scaleY = (containerHeight * 0.80) / boundH;
        const scale = Math.min(scaleX, scaleY, 1);
        const canvasWidth = Math.round(boundW * scale);
        const canvasHeight = Math.round(boundH * scale);
        img.set({ angle: normalizedAngle, scaleX: scale, scaleY: scale });
        canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
        baseCanvasDimensionsRef.current = { width: canvasWidth, height: canvasHeight };
        setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
        img.setPositionByOrigin(new fabric.Point(canvasWidth / 2, canvasHeight / 2), 'center', 'center');
        canvas.renderAll();
    }, []);

    const rotateBaseImage = useCallback((angleDelta: number) => {
        if (!bgImageRef.current) return;
        applyRotation((bgImageRef.current.angle || 0) + angleDelta);
        saveSnapshot();
    }, [applyRotation, saveSnapshot]);

    const setBaseImageAngle = useCallback((angle: number) => {
        applyRotation(angle);
        saveSnapshot();
    }, [applyRotation, saveSnapshot]);

    const flipBaseImage = useCallback((dir: 'horizontal' | 'vertical') => {
        if (!bgImageRef.current || !canvasRef.current) return;
        if (dir === 'horizontal') bgImageRef.current.set('flipX', !bgImageRef.current.flipX);
        else bgImageRef.current.set('flipY', !bgImageRef.current.flipY);
        canvasRef.current.renderAll();
        saveSnapshot();
    }, [saveSnapshot]);

    const exportCanvas = useCallback((format: 'png' | 'jpeg' = 'jpeg', quality = 0.95): string => {
        if (!canvasRef.current) return '';
        const canvas = canvasRef.current;
        const currentZoom = canvas.getZoom();
        const baseW = baseCanvasDimensionsRef.current.width;
        const baseH = baseCanvasDimensionsRef.current.height;
        try {
            if (baseW && baseH) { canvas.setZoom(1); canvas.setDimensions({ width: baseW, height: baseH }); }
            canvas.discardActiveObject();
            if (bgImageRef.current) {
                rebuildAndApplyFilters(
                    bgImageRef.current,
                    canvas,
                    correctionsRef.current,
                    activeFilterPresetRef.current,
                    globalBlurRef.current
                );
            }
            canvas.renderAll();
            return canvas.toDataURL({ format: format === 'jpeg' ? 'jpeg' : 'png', quality, multiplier: 2 });
        } catch (err) {
            console.error('[ImageEditor] Failed to export canvas', err);
            return '';
        } finally {
            if (baseW && baseH) {
                canvas.setZoom(currentZoom);
                canvas.setDimensions({ width: Math.round(baseW * currentZoom), height: Math.round(baseH * currentZoom) });
                canvas.renderAll();
            }
        }
    }, []);

    /**
     * Exports only the overlay objects (no background image) as an EditorOverlayState.
     * Store this with fabricJsonStore.set() to enable re-editing.
     */
    const exportCanvasJson = useCallback((): EditorOverlayState | null => {
        if (!canvasRef.current) return null;
        try {
            const canvas = canvasRef.current;
            const overlayObjects = canvas.getObjects().filter(obj => obj !== bgImageRef.current);
            return {
                overlayObjects: JSON.stringify(overlayObjects.map(obj => {
                    const objData = obj.toObject([
                        'src',
                        'strokeDashArray',
                        'text',
                        'fontFamily',
                        'fontSize',
                        'fontWeight',
                        'fontStyle',
                        'underline',
                        'linethrough',
                        'textAlign',
                        'fill',
                        'stroke',
                        'strokeWidth',
                        'backgroundColor',
                        'padding',
                        'paintFirst',
                        'shadow',
                    ]);
                    if (obj instanceof fabric.FabricImage || (obj.type || '').toLowerCase() === 'image') {
                        const img = obj as any;
                        const src = img.src || (img.getSrc ? img.getSrc() : img._element?.src);
                        if (src) {
                            objData.src = src;
                        }
                    }
                    return objData;
                })),
                scaleX: currentScaleRef.current,
                scaleY: currentScaleRef.current,
                // Store the original clean image DataURL so re-editing always
                // loads the un-baked photo rather than the exported flat JPEG.
                originalDataUrl: originalCleanDataUrlRef.current,
                corrections: { ...correctionsRef.current },
                activeFilterPreset: activeFilterPresetRef.current,
                globalBlur: globalBlurRef.current,
                baseImageAngle: bgImageRef.current?.angle || 0,
                flipX: !!bgImageRef.current?.flipX,
                flipY: !!bgImageRef.current?.flipY,
            };
        } catch (err) {
            console.error('[ImageEditor] Failed to export overlay JSON', err);
            return null;
        }
    }, []);

    const applyCrop = useCallback(async (crop: { x: number; y: number; width: number; height: number }) => {
        if (!canvasRef.current) return null;
        const canvas = canvasRef.current;
        const baseW = baseCanvasDimensionsRef.current.width;
        const baseH = baseCanvasDimensionsRef.current.height;

        try {
            if (baseW && baseH) {
                canvas.setZoom(1);
                canvas.setDimensions({ width: baseW, height: baseH });
            }
            canvas.discardActiveObject();
            canvas.renderAll();

            const cropX = Math.max(0, Math.min(baseW - 10, Math.round(crop.x)));
            const cropY = Math.max(0, Math.min(baseH - 10, Math.round(crop.y)));
            const cropW = Math.max(10, Math.min(baseW - cropX, Math.round(crop.width)));
            const cropH = Math.max(10, Math.min(baseH - cropY, Math.round(crop.height)));

            const croppedDataUrl = canvas.toDataURL({
                format: 'jpeg',
                quality: 0.95,
                left: cropX,
                top: cropY,
                width: cropW,
                height: cropH,
                multiplier: 2,
            });

            if (!croppedDataUrl) return null;

            const fabricImg = await fabric.FabricImage.fromURL(croppedDataUrl);
            if (!canvasRef.current) return null;

            canvas.clear();
            canvas.backgroundColor = '#111827';

            let containerWidth = containerRef.current?.clientWidth || 0;
            let containerHeight = containerRef.current?.clientHeight || 0;
            if (containerWidth === 0 || containerHeight === 0) {
                containerWidth = Math.round(window.innerWidth * 0.7);
                containerHeight = Math.round(window.innerHeight * 0.7);
            }

            const imgW = fabricImg.width || cropW * 2;
            const imgH = fabricImg.height || cropH * 2;
            originalImageDimensionsRef.current = { width: imgW, height: imgH };

            const scaleX = (containerWidth * 0.85) / imgW;
            const scaleY = (containerHeight * 0.80) / imgH;
            const scale = Math.min(scaleX, scaleY, 1);
            currentScaleRef.current = scale;

            const newCanvasW = Math.round(imgW * scale);
            const newCanvasH = Math.round(imgH * scale);

            canvas.setDimensions({ width: newCanvasW, height: newCanvasH });
            baseCanvasDimensionsRef.current = { width: newCanvasW, height: newCanvasH };
            setCanvasDimensions({ width: newCanvasW, height: newCanvasH });

            fabricImg.set({
                originX: 'left',
                originY: 'top',
                left: 0,
                top: 0,
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
            });

            bgImageRef.current = fabricImg;
            canvas.add(fabricImg);
            canvas.sendObjectToBack(fabricImg);
            canvas.renderAll();

            originalCleanDataUrlRef.current = croppedDataUrl;
            lastLoadedUrlRef.current = croppedDataUrl;

            const emptyCorrections = { brightness: 0, contrast: 0, saturation: 0, gamma: 0, clarity: 0, exposure: 0, shadows: 0, highlights: 0 };
            correctionsRef.current = emptyCorrections;
            setCorrections(emptyCorrections);
            activeFilterPresetRef.current = 'none';
            setActiveFilterPreset('none');
            globalBlurRef.current = 0;
            setGlobalBlur(0);

            historyRef.current = [];
            historyIndexRef.current = -1;
            saveSnapshot();

            return croppedDataUrl;
        } catch (err) {
            console.error('[ImageEditor] Failed to apply crop', err);
            return null;
        }
    }, [saveSnapshot]);

    return {
        canvasRef, containerRef, setCanvasEl,
        isLoaded, zoomPercent, canUndo, canRedo,
        undo, redo, zoomIn, zoomOut, setZoom,
        deleteSelected, addShape, addArrowSticker, addCustomStickerImage, addText,
        selectedTextProperties, updateActiveText, duplicateActiveObject, deselectAll,
        canvasTexts, selectTextObject, refreshCanvasTexts,
        selectedShapeProperties, updateActiveShape,
        setDrawingMode, applyFilterPreset, activeFilterPreset,
        corrections, applyCorrections, commitCorrectionsSnapshot, globalBlur, applyGlobalBlur,
        rotateBaseImage, setBaseImageAngle, flipBaseImage,
        exportCanvas, exportCanvasJson, canvasDimensions,
        applyCrop,
    };
}
