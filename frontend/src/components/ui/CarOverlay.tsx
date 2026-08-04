import { Eye, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DamageItem } from '../../types/parts';

interface CarOverlayProps {
    onPartSelected: (partName: string | null) => void;
    selectedParts: string[];
    savedScreenshots: Record<string, string>;
    onViewScreenshot: (filename: string) => void;
    hideSelectedList?: boolean;
    readOnly?: boolean;
    onPartHover?: (part: { id: string; name: string } | null) => void;
    svgContainerStyle?: React.CSSProperties;
    /** Zoom/rotate toolbar. Default true. */
    showControls?: boolean;
}

const COLOR_PALETTE = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#f43f5e', '#a855f7', '#eab308', '#22c55e',
    '#06b6d4', '#f472b6', '#fb923c', '#4f46e5', '#0ea5e9'
];

const getColorForDamageId = (damageId: number | undefined): string => {
    if (damageId === undefined) return '#afb0ba';
    return COLOR_PALETTE[damageId % COLOR_PALETTE.length];
};

const SELECTED_COLOR = '#FF6B35';
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.1;
const ZOOM_DEFAULT = 1;
const ROTATE_STEP = 90;

const parsePercent = (value: string | number | undefined, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const match = value.trim().match(/^([\d.]+)%?$/);
        if (match) return parseFloat(match[1]);
    }
    return fallback;
};

const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 10) / 10));

export const CarOverlay: React.FC<CarOverlayProps> = (props) => {
    const { t } = useTranslation();
    const { selectedParts, onPartSelected, savedScreenshots, onViewScreenshot, readOnly, onPartHover, showControls = true } = props;
    const [hoveredPart, setHoveredPart] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
    const [zoom, setZoom] = useState(ZOOM_DEFAULT);
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const didDragRef = useRef(false);
    const panPendingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    const baseWidth = parsePercent(props.svgContainerStyle?.width as string | number | undefined, 100);
    const baseHeight = parsePercent(props.svgContainerStyle?.height as string | number | undefined, 100);

    const adjustZoom = (delta: number) => {
        setZoom((prev) => clampZoom(prev + delta));
    };

    const adjustRotation = (delta: number) => {
        setRotation((prev) => ((prev + delta) % 360 + 360) % 360);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Pan only when zoomed — keep default click/capture behavior at 1x
        if (zoom <= 1) return;
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('button')) return;

        const el = scrollContainerRef.current;
        if (!el) return;
        didDragRef.current = false;
        panPendingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: el.scrollLeft,
            scrollTop: el.scrollTop,
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!panPendingRef.current && !isDragging) return;
        const el = scrollContainerRef.current;
        if (!el) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;

        if (!isDragging) {
            setIsDragging(true);
            try {
                el.setPointerCapture(e.pointerId);
            } catch {
                // ignore
            }
        }
        didDragRef.current = true;
        el.scrollLeft = dragStartRef.current.scrollLeft - dx;
        el.scrollTop = dragStartRef.current.scrollTop - dy;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        panPendingRef.current = false;
        const el = scrollContainerRef.current;
        if (el?.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
        }
        setIsDragging(false);
        requestAnimationFrame(() => {
            didDragRef.current = false;
        });
    };

    useLayoutEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
        el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
    }, [zoom, rotation]);

    const isAdd = true;

    const damagesByLocation = useMemo(() => {
        const grouped: Record<string, DamageItem[]> = {};
        selectedParts.forEach((partId, index) => {
            if (!grouped[partId]) {
                grouped[partId] = [];
            }
            grouped[partId].push({
                id: partId,
                damageId: index + 1,
                severity: 'minor'
            } as DamageItem);
        });
        return grouped;
    }, [selectedParts]);

    const getPartColor = (partId: string): string => {
        if (isAdd) {
            if (selectedParts.includes(partId)) {
                return SELECTED_COLOR;
            }
            if (
                partId.includes('windshield') ||
                partId.includes('window') ||
                partId.includes('glass')
            ) {
                return '#dfe1f3';
            }
            return '#ffffff';
        }
        const damages = damagesByLocation[partId] || [];
        if (damages.length === 0) {
            if (
                partId.includes('windshield') ||
                partId.includes('window') ||
                partId.includes('glass')
            ) {
                return '#dfe1f3';
            }
            return '#ffffff';
        }
        if (damages.length === 1) {
            return getColorForDamageId(damages[0].damageId);
        }
        return `url(#pattern-${partId})`;
    };

    const createPatternDefs = () => {
        const patterns: React.ReactElement[] = [];
        Object.entries(damagesByLocation).forEach(([partId, damages]) => {
            if (damages.length > 1) {
                const colors = damages.map(d => getColorForDamageId(d.damageId));
                const patternId = `pattern-${partId}`;
                const gradientId = `gradient-${partId}`;
                patterns.push(
                    <g key={patternId}>
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                {colors.map((color, index) => {
                                    const offset = (index / (colors.length - 1)) * 100;
                                    return (
                                        <stop
                                            key={`${gradientId}-stop-${index}`}
                                            offset={`${offset}%`}
                                            stopColor={color}
                                            stopOpacity="0.8"
                                        />
                                    );
                                })}
                            </linearGradient>
                        </defs>
                        <pattern
                            id={patternId}
                            x="0"
                            y="0"
                            width="100"
                            height="100"
                            patternUnits="userSpaceOnUse"
                        >
                            <rect width="100" height="100" fill={`url(#${gradientId})`} />
                        </pattern>
                    </g>
                );
            }
        });
        return patterns;
    };

    const getPartOpacity = (partId: string) => {
        return selectedParts.includes(partId) ? 0.9 : 0.7;
    };

    const handlePartClick = (partId: string, _partName?: string) => {
        if (readOnly || didDragRef.current) return;
        onPartSelected(partId);
    };

    const handlePartMouseEnter = (partId: string, partName: string, e?: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        setHoveredPart({
            id: partId,
            name: t(`carParts.${partId}`, { defaultValue: partName }),
            x: rect ? e?.clientX || rect.left + rect.width / 2 : 0,
            y: (e?.clientY || 0) - 30
        });
        onPartHover?.({ id: partId, name: t(`carParts.${partId}`, { defaultValue: partName }) });
    };

    const handlePartMouseLeave = () => {
        setHoveredPart(null);
        onPartHover?.(null);
    };

    const handleContainerMouseMove = (e: React.MouseEvent) => {
        if (hoveredPart) {
            setHoveredPart(prev => prev ? { ...prev, x: e.clientX, y: e.clientY - 30 } : null);
        }
    };

    const createHitArea = (partId: string, partName: string, originalPath: string) => {
        return (
            <path
                d={originalPath}
                fill="transparent"
                stroke="transparent"
                strokeWidth="8"
                onClick={() => handlePartClick(partId)}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseEnter={(e) => handlePartMouseEnter(partId, partName, e)}
                onMouseLeave={handlePartMouseLeave}
                onMouseMove={handleContainerMouseMove}
                style={{ pointerEvents: 'auto', cursor: readOnly ? 'default' : 'pointer' }}
            />
        );
    };

    const renderCarView = () => (
        <svg
            version="1.1"
            id="Layer_1"
            x="0px"
            y="0px"
            viewBox="10 30 540.9 820"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
        >
            <style>{`
                .st0 { fill-rule: evenodd; clip-rule: evenodd; fill: #FFFFFF; stroke: #000000; stroke-width: 0.450; stroke-miterlimit: 22.9256; }
                .st1 { fill-rule: evenodd; clip-rule: evenodd; fill: #EF3E3D; stroke: #000000; stroke-width: 1.3802; stroke-miterlimit: 22.9256; }
                .st2 { fill-rule: evenodd; clip-rule: evenodd; fill: #FFFFFF; stroke: #000000; stroke-width: 0.69; stroke-miterlimit: 22.9256; }
                .st3 { fill-rule: evenodd; clip-rule: evenodd; fill: none; stroke: #000000; stroke-width: 0.345; stroke-miterlimit: 22.9256; }
                .st5 { font-size: 8.2809px; }
                .st6 { fill-rule: evenodd; clip-rule: evenodd; fill: #D4D1BE; stroke: #000000; stroke-width: 0.345; stroke-miterlimit: 22.9256; }
                .st15 { fill: #FF0000; }
                .st16 { fill: #FFFFFF; }
                .st19 { fill-rule: evenodd; clip-rule: evenodd; stroke: #000000; stroke-width: 0.345; stroke-miterlimit: 22.9256; }
                .st20 { fill: #2B2A29; }
                .st8 { fill: #FFFFFF; stroke: #000000; stroke-width: 0.345; stroke-miterlimit: 22.9256; }
                .part-path { transition: all 0.2s ease; cursor: pointer; }
                .part-path:hover { filter: brightness(1.1); }
            `}</style>
            <defs>
                {createPatternDefs()}
            </defs>

            {/* Vehicle view from the rear */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Vehicle_view_from_the_rear'), opacity: getPartOpacity('Vehicle_view_from_the_rear') }}
                onClick={() => handlePartClick('Vehicle_view_from_the_rear', 'Vehicle view from the rear')}
                onMouseEnter={(e) => handlePartMouseEnter('Vehicle_view_from_the_rear', 'Vehicle view from the rear', e)}
                onMouseLeave={handlePartMouseLeave}
                onMouseMove={handleContainerMouseMove}
                d="M194.6,783.6v-9.9c0-1.6,1.3-2.8,2.8-2.8h218.3c1.6,0,2.8,1.3,2.8,2.8v9.9c0,1.6-1.3,2.8-2.8,2.8H197.5 C195.9,786.4,194.6,785.1,194.6,783.6z"
            />
            {createHitArea('Vehicle_view_from_the_rear', 'Vehicle view from the rear', 'M194.6,783.6v-9.9c0-1.6,1.3-2.8,2.8-2.8h218.3c1.6,0,2.8,1.3,2.8,2.8v9.9c0,1.6-1.3,2.8-2.8,2.8H197.5 C195.9,786.4,194.6,785.1,194.6,783.6z')}

            {/* Vehicle view front */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('vehicle_view_front'), opacity: getPartOpacity('vehicle_view_front') }}
                onClick={() => handlePartClick('vehicle_view_front', 'Vehicle view front')}
                onMouseEnter={(e) => handlePartMouseEnter('vehicle_view_front', 'Vehicle view front', e)}
                onMouseLeave={handlePartMouseLeave}
                onMouseMove={handleContainerMouseMove}
                d="M194.6,64.9v-9.9c0-1.6,1.3-2.8,2.8-2.8h218.3c1.6,0,2.8,1.3,2.8,2.8v9.9c0,1.6-1.3,2.8-2.8,2.8H197.5 C195.9,67.7,194.6,66.4,194.6,64.9z"
            />
            {createHitArea('vehicle_view_front', 'Vehicle view front', 'M194.6,64.9v-9.9c0-1.6,1.3-2.8,2.8-2.8h218.3c1.6,0,2.8,1.3,2.8,2.8v9.9c0,1.6-1.3,2.8-2.8,2.8H197.5 C195.9,67.7,194.6,66.4,194.6,64.9z')}

            {/* Vehicle photo right side */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('vehicle_photo_right_side'), opacity: getPartOpacity('vehicle_photo_right_side') }}
                onClick={() => handlePartClick('vehicle_photo_right_side', 'Vehicle photo, right side')}
                onMouseEnter={(e) => handlePartMouseEnter('vehicle_photo_right_side', 'Vehicle photo, right side', e)}
                onMouseLeave={handlePartMouseLeave}
                onMouseMove={handleContainerMouseMove}
                d="M502.4,148.9h9.5c1.6,0,2.8,1.3,2.8,2.8v535.2c0,1.6-1.3,2.8-2.8,2.8h-9.5c-1.6,0-2.8-1.3-2.8-2.8V151.7 C499.6,150.1,500.9,148.9,502.4,148.9z"
            />
            {createHitArea('vehicle_photo_right_side', 'Vehicle photo, right side', 'M502.4,148.9h9.5c1.6,0,2.8,1.3,2.8,2.8v535.2c0,1.6-1.3,2.8-2.8,2.8h-9.5c-1.6,0-2.8-1.3-2.8-2.8V151.7 C499.6,150.1,500.9,148.9,502.4,148.9z')}

            {/* Vehicle photo left side */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('vehicle_photo_left_side'), opacity: getPartOpacity('vehicle_photo_left_side') }}
                onClick={() => handlePartClick('vehicle_photo_left_side', 'Vehicle photo, left side')}
                onMouseEnter={(e) => handlePartMouseEnter('vehicle_photo_left_side', 'Vehicle photo, left side', e)}
                onMouseLeave={handlePartMouseLeave}
                onMouseMove={handleContainerMouseMove}
                d="M102,148.9h9.5c1.6,0,2.8,1.3,2.8,2.8v535.2c0,1.6-1.3,2.8-2.8,2.8H102c-1.6,0-2.8-1.3-2.8-2.8V151.7 C99.1,150.1,100.4,148.9,102,148.9z"
            />
            {createHitArea('vehicle_photo_left_side', 'Vehicle photo, left side', 'M102,148.9h9.5c1.6,0,2.8,1.3,2.8,2.8v535.2c0,1.6-1.3,2.8-2.8,2.8H102c-1.6,0-2.8-1.3-2.8-2.8V151.7 C99.1,150.1,100.4,148.9,102,148.9z')}

            {/* Overview diagonal rear left */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Overview_diagonal_rear_left'), opacity: getPartOpacity('Overview_diagonal_rear_left') }}
                onClick={() => handlePartClick('Overview_diagonal_rear_left', 'Overview diagonal rear left')}
                onMouseEnter={() => handlePartMouseEnter('Overview_diagonal_rear_left', 'Overview diagonal rear left')}
                onMouseLeave={handlePartMouseLeave}
                d="M174.1,786.4L174.1,786.4c-20.7-2-41.3-4.3-61.8-7c-1.8-0.2-3.8-0.6-4.9-2c-0.7-0.9-0.9-2.1-1.1-3.2 c-0.3-1.9-0.6-3.9-0.9-5.9c-2.6-18.7-4.1-37.5-6.2-56.3c2.6,0.7,5.4,0.8,8,1.4c3.1,0.7,5.9,2.1,7.4,5c0.3,0.6,0.6,1.3,0.8,1.9l0,0 c0.3,1.9,0.6,3.7,1,5.5l0,0l0,0c4.3,17.7,16.4,32.3,32.6,39.8c5.8,2.8,12.1,4.6,18.8,5.2c0.5,0.3,1,0.6,1.4,1c1.9,1.7,3,4.2,3.5,6.8 C173.2,781.4,173.4,783.9,174.1,786.4z"
            />
            {createHitArea('Overview_diagonal_rear_left', 'Overview diagonal rear left', 'M174.1,786.4L174.1,786.4c-20.7-2-41.3-4.3-61.8-7c-1.8-0.2-3.8-0.6-4.9-2c-0.7-0.9-0.9-2.1-1.1-3.2 c-0.3-1.9-0.6-3.9-0.9-5.9c-2.6-18.7-4.1-37.5-6.2-56.3c2.6,0.7,5.4,0.8,8,1.4c3.1,0.7,5.9,2.1,7.4,5c0.3,0.6,0.6,1.3,0.8,1.9l0,0 c0.3,1.9,0.6,3.7,1,5.5l0,0l0,0c4.3,17.7,16.4,32.3,32.6,39.8c5.8,2.8,12.1,4.6,18.8,5.2c0.5,0.3,1,0.6,1.4,1c1.9,1.7,3,4.2,3.5,6.8 C173.2,781.4,173.4,783.9,174.1,786.4z')}

            {/* Overview diagonal rear right */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Overview_diagonal_rear_right'), opacity: getPartOpacity('Overview_diagonal_rear_right') }}
                onClick={() => handlePartClick('Overview_diagonal_rear_right', 'Overview diagonal rear right')}
                onMouseEnter={() => handlePartMouseEnter('Overview_diagonal_rear_right', 'Overview diagonal rear right')}
                onMouseLeave={handlePartMouseLeave}
                d="M514.8,711.5L514.8,711.5c-2,20.6-4.3,41.3-7,61.8c-0.2,1.8-0.6,3.8-2,4.9c-0.9,0.7-2.1,0.9-3.2,1.1 c-1.9,0.3-3.9,0.6-5.9,0.9c-18.7,2.6-37.5,4.1-56.3,6.2c0.7-2.6,0.8-5.4,1.4-8c0.7-3.1,2.1-5.9,5-7.4c0.6-0.3,1.3-0.6,1.9-0.8l0,0 c1.9-0.3,3.7-0.6,5.5-1l0,0l0,0c17.7-4.3,32.3-16.4,39.8-32.6c2.8-5.8,4.5-12.1,5.2-18.8c0.3-0.5,0.6-1,1-1.4c1.7-1.9,4.2-3,6.8-3.5 C509.7,712.3,512.3,712.1,514.8,711.5z"
            />
            {createHitArea('Overview_diagonal_rear_right', 'Overview diagonal rear right', 'M514.8,711.5L514.8,711.5c-2,20.6-4.3,41.3-7,61.8c-0.2,1.8-0.6,3.8-2,4.9c-0.9,0.7-2.1,0.9-3.2,1.1 c-1.9,0.3-3.9,0.6-5.9,0.9c-18.7,2.6-37.5,4.1-56.3,6.2c0.7-2.6,0.8-5.4,1.4-8c0.7-3.1,2.1-5.9,5-7.4c0.6-0.3,1.3-0.6,1.9-0.8l0,0 c1.9-0.3,3.7-0.6,5.5-1l0,0l0,0c17.7-4.3,32.3-16.4,39.8-32.6c2.8-5.8,4.5-12.1,5.2-18.8c0.3-0.5,0.6-1,1-1.4c1.7-1.9,4.2-3,6.8-3.5 C509.7,712.3,512.3,712.1,514.8,711.5z')}

            {/* Overview diagonal front right */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Overview_diagonal_front_right'), opacity: getPartOpacity('Overview_diagonal_front_right') }}
                onClick={() => handlePartClick('Overview_diagonal_front_right', 'Overview diagonal front right')}
                onMouseEnter={() => handlePartMouseEnter('Overview_diagonal_front_right', 'Overview diagonal front right')}
                onMouseLeave={handlePartMouseLeave}
                d="M439.8,52.1L439.8,52.1c20.7,2,41.3,4.3,61.8,7c1.8,0.2,3.8,0.6,4.9,2c0.7,0.9,0.9,2.1,1.1,3.2 c0.3,1.9,0.6,3.9,0.9,5.9c2.6,18.7,4.1,37.5,6.2,56.3c-2.6-0.7-5.4-0.8-8-1.4c-3.1-0.7-5.9-2.1-7.4-5c-0.3-0.6-0.6-1.3-0.8-1.9l0,0 c-0.3-1.9-0.6-3.7-1-5.5l0,0l0,0c-4.3-17.7-16.4-32.3-32.6-39.8c-5.8-2.8-12.1-4.5-18.8-5.2c-0.5-0.3-1-0.6-1.4-1 c-1.9-1.7-3-4.2-3.5-6.8C440.6,57.1,440.5,54.6,439.8,52.1z"
            />
            {createHitArea('Overview_diagonal_front_right', 'Overview diagonal front right', 'M439.8,52.1L439.8,52.1c20.7,2,41.3,4.3,61.8,7c1.8,0.2,3.8,0.6,4.9,2c0.7,0.9,0.9,2.1,1.1,3.2 c0.3,1.9,0.6,3.9,0.9,5.9c2.6,18.7,4.1,37.5,6.2,56.3c-2.6-0.7-5.4-0.8-8-1.4c-3.1-0.7-5.9-2.1-7.4-5c-0.3-0.6-0.6-1.3-0.8-1.9l0,0 c-0.3-1.9-0.6-3.7-1-5.5l0,0l0,0c-4.3-17.7-16.4-32.3-32.6-39.8c-5.8-2.8-12.1-4.5-18.8-5.2c-0.5-0.3-1-0.6-1.4-1 c-1.9-1.7-3-4.2-3.5-6.8C440.6,57.1,440.5,54.6,439.8,52.1z')}

            {/* Overview diagonal front left */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Overview_diagonal_front_left'), opacity: getPartOpacity('Overview_diagonal_front_left') }}
                onClick={() => handlePartClick('Overview_diagonal_front_left', 'Overview diagonal front left')}
                onMouseEnter={() => handlePartMouseEnter('Overview_diagonal_front_left', 'Overview diagonal front left')}
                onMouseLeave={handlePartMouseLeave}
                d="M99.1,127L99.1,127c2-20.7,4.3-41.3,7-61.8c0.2-1.8,0.6-3.8,2-4.9c0.9-0.7,2.1-0.9,3.2-1.1 c1.9-0.3,3.9-0.6,5.9-0.9c18.7-2.6,37.5-4.1,56.3-6.2c-0.7,2.6-0.8,5.4-1.4,8c-0.7,3.1-2.1,5.9-5,7.4c-0.6,0.3-1.3,0.6-1.9,0.8l0,0 c-1.9,0.3-3.7,0.6-5.5,1l0,0l0,0c-17.7,4.3-32.3,16.4-39.8,32.6c-2.8,5.8-4.5,12.1-5.2,18.8c-0.3,0.5-0.6,1-1,1.4 c-1.7,1.9-4.2,3-6.8,3.5C104.2,126.2,101.6,126.4,99.1,127z"
            />
            {createHitArea('Overview_diagonal_front_left', 'Overview diagonal front left', 'M99.1,127L99.1,127c2-20.7,4.3-41.3,7-61.8c0.2-1.8,0.6-3.8,2-4.9c0.9-0.7,2.1-0.9,3.2-1.1 c1.9-0.3,3.9-0.6,5.9-0.9c18.7-2.6,37.5-4.1,56.3-6.2c-0.7,2.6-0.8,5.4-1.4,8c-0.7,3.1-2.1,5.9-5,7.4c-0.6,0.3-1.3,0.6-1.9,0.8l0,0 c-1.9,0.3-3.7,0.6-5.5,1l0,0l0,0c-17.7,4.3-32.3,16.4-39.8,32.6c-2.8,5.8-4.5,12.1-5.2,18.8c-0.3,0.5-0.6,1-1,1.4 c-1.7,1.9-4.2,3-6.8,3.5C104.2,126.2,101.6,126.4,99.1,127z')}

            {/* Front left wheel */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('front_left_wheel'), opacity: getPartOpacity('front_left_wheel') }}
                onClick={() => handlePartClick('front_left_wheel', 'Front left wheel')}
                onMouseEnter={() => handlePartMouseEnter('front_left_wheel', 'Front left wheel')}
                onMouseLeave={handlePartMouseLeave}
                d="M173.4,232.5c-0.6-5.9-2.5-11.8-5.5-17c-6-10.6-16.3-18.1-28.2-20.6c-3.9-0.8-7.2-1.9-11.2-1.2 c0,19.2,0,38.3-0.1,57.5c0,3.9-0.1,7.9-0.1,11.8c-0.1,3.8,0,7.7-0.3,11.5c-0.1,1.7-0.4,4.1,1,5.3c1.2,1.2,3.1,1,4.8,0.8 c1.9-0.3,3.8-0.9,5.7-1.3c4.1-1,8.4-2.3,12.1-4.3c6.6-3.4,12-9.2,15.7-15.5c3.7-6.3,5.9-13.4,6.3-20.6c0-0.2,0-0.3,0-0.6 c0.1-1.4,0-2.8-0.1-4.3C173.5,233.5,173.4,233,173.4,232.5z"
            />
            {createHitArea('front_left_wheel', 'Front left wheel', 'M173.4,232.5c-0.6-5.9-2.5-11.8-5.5-17c-6-10.6-16.3-18.1-28.2-20.6c-3.9-0.8-7.2-1.9-11.2-1.2 c0,19.2,0,38.3-0.1,57.5c0,3.9-0.1,7.9-0.1,11.8c-0.1,3.8,0,7.7-0.3,11.5c-0.1,1.7-0.4,4.1,1,5.3c1.2,1.2,3.1,1,4.8,0.8 c1.9-0.3,3.8-0.9,5.7-1.3c4.1-1,8.4-2.3,12.1-4.3c6.6-3.4,12-9.2,15.7-15.5c3.7-6.3,5.9-13.4,6.3-20.6c0-0.2,0-0.3,0-0.6 c0.1-1.4,0-2.8-0.1-4.3C173.5,233.5,173.4,233,173.4,232.5z')}

            {/* Front right wheel */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('front_right_wheel'), opacity: getPartOpacity('front_right_wheel') }}
                onClick={() => handlePartClick('front_right_wheel', 'Front right wheel')}
                onMouseEnter={() => handlePartMouseEnter('front_right_wheel', 'Front right wheel')}
                onMouseLeave={handlePartMouseLeave}
                d="M437.9,241.8c0.6,5.9,2.5,11.8,5.5,17c6,10.6,16.3,18.1,28.2,20.6c3.9,0.8,7.2,1.9,11.2,1.2 c0-19.2,0-38.3,0.1-57.5c0-3.9,0.1-7.9,0.1-11.8c0.1-3.8,0-7.7,0.3-11.5c0.1-1.7,0.4-4.1-1-5.3c-1.2-1.2-3.1-1-4.8-0.8 c-1.9,0.3-3.8,0.9-5.7,1.3c-4.1,1-8.3,2.3-12.1,4.3c-6.6,3.4-12,9.2-15.7,15.5c-3.7,6.3-5.9,13.4-6.3,20.6c0,0.2,0,0.3,0,0.6 c-0.1,1.4,0,2.8,0.1,4.3C437.7,240.7,437.8,241.2,437.9,241.8z"
            />
            {createHitArea('front_right_wheel', 'Front right wheel', 'M437.9,241.8c0.6,5.9,2.5,11.8,5.5,17c6,10.6,16.3,18.1,28.2,20.6c3.9,0.8,7.2,1.9,11.2,1.2 c0-19.2,0-38.3,0.1-57.5c0-3.9,0.1-7.9,0.1-11.8c0.1-3.8,0-7.7,0.3-11.5c0.1-1.7,0.4-4.1-1-5.3c-1.2-1.2-3.1-1-4.8-0.8 c-1.9,0.3-3.8,0.9-5.7,1.3c-4.1,1-8.3,2.3-12.1,4.3c-6.6,3.4-12,9.2-15.7,15.5c-3.7,6.3-5.9,13.4-6.3,20.6c0,0.2,0,0.3,0,0.6 c-0.1,1.4,0,2.8,0.1,4.3C437.7,240.7,437.8,241.2,437.9,241.8z')}

            {/* Meter reading */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Meter_reading'), opacity: getPartOpacity('Meter_reading') }}
                onClick={() => handlePartClick('Meter_reading', 'Meter reading')}
                onMouseEnter={() => handlePartMouseEnter('Meter_reading', 'Meter reading')}
                onMouseLeave={handlePartMouseLeave}
                d="M272.3,306.4c-5.9,5.2-13.7,8.4-21.7,8c-3.8-0.2-7.5-1.4-11-2.9c-2.2-0.9-4.3-1.8-6.3-3.1c-1-0.8-4.3-3-3.3-4.7 c0.6-1.1,2.1-1.4,3.2-1.7c1.5-0.5,3.1-1,4.7-1.3c4.5-1.1,9.1-1.7,13.6-2.6c4.7-1,9.3-1.7,14.1-2.5c3.5-0.6,7-0.8,10.6-1.2 c1.4-0.1,3.2,0,3.5,1.7c0.4,1.7-1.2,3.7-2.3,5c-1.2,1.4-2.5,3-3.8,4.3C273.2,305.6,272.8,306,272.3,306.4z"
            />
            {createHitArea('Meter_reading', 'Meter reading', 'M272.3,306.4c-5.9,5.2-13.7,8.4-21.7,8c-3.8-0.2-7.5-1.4-11-2.9c-2.2-0.9-4.3-1.8-6.3-3.1c-1-0.8-4.3-3-3.3-4.7 c0.6-1.1,2.1-1.4,3.2-1.7c1.5-0.5,3.1-1,4.7-1.3c4.5-1.1,9.1-1.7,13.6-2.6c4.7-1,9.3-1.7,14.1-2.5c3.5-0.6,7-0.8,10.6-1.2 c1.4-0.1,3.2,0,3.5,1.7c0.4,1.7-1.2,3.7-2.3,5c-1.2,1.4-2.5,3-3.8,4.3C273.2,305.6,272.8,306,272.3,306.4z')}

            {/* Windshield */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('windshield'), opacity: getPartOpacity('windshield') }}
                onClick={() => handlePartClick('windshield', 'Windshield')}
                onMouseEnter={() => handlePartMouseEnter('windshield', 'Windshield')}
                onMouseLeave={handlePartMouseLeave}
                d="M325.9,292c-1.2-0.1-2.6-0.1-3.9-0.1c-9.9-0.3-19.9-0.1-29.9-0.2c-2.1,0-4.3-0.1-6.4-0.1c-0.1,0-0.3,0-0.4,0.1 c-0.1,0.1-0.2,0.2-0.2,0.3c-3.1,7.5-7.9,14.1-14.6,18.7c-1.5,1-3.2,2-5,2.8c-11,5.1-25,4.2-34.4-3.9c-2.2-1.9-4.1-5.7-7.5-5.5 c-1.1,0.1-2.3,0.6-3.2,1c-2.4,1.2-4.9,3-5,6.1c-0.1,4.3,3.9,9.5,5.9,13.2c2.4,4.5,5,8.8,7.7,13.2c5.2,8.6,10.9,16.9,16.6,25.2 c0.4,0.6,0.9,1.2,1.6,1.5c0.6,0.2,1,0.1,1.7,0.1c2.9-0.3,5.5-1.1,8.2-2c2.1-0.7,4.3-1,6.4-1.4c4.6-0.8,9.2-1.7,13.8-2.3 c13-1.7,26-2.3,39.1-1.6c6.6,0.3,13,1,19.5,1.9c6.1,0.9,12.6,1.6,18.4,3.5c2.5,0.8,4.5,1.5,7,1.8c1,0.1,2.1,0.5,3,0.1 c1.9-0.8,3.2-4.3,4.4-5.9c1.7-2.3,3.2-4.8,4.9-7.2c3.2-4.8,6.3-9.6,9.2-14.6c2.6-4.3,5-8.6,7.4-13c1.9-3.5,5.7-8.4,5.6-12.6 c-0.1-2.8-1.7-5-4.1-6.3c-1.7-1-3.5-1.3-5.2-2c-2-0.8-3.9-1.4-5.9-2.1c-9.3-3.2-18.8-5.5-28.6-6.8 C343.2,292.7,334.5,292.2,325.9,292z"
            />
            {createHitArea('windshield', 'Windshield', 'M325.9,292c-1.2-0.1-2.6-0.1-3.9-0.1c-9.9-0.3-19.9-0.1-29.9-0.2c-2.1,0-4.3-0.1-6.4-0.1c-0.1,0-0.3,0-0.4,0.1 c-0.1,0.1-0.2,0.2-0.2,0.3c-3.1,7.5-7.9,14.1-14.6,18.7c-1.5,1-3.2,2-5,2.8c-11,5.1-25,4.2-34.4-3.9c-2.2-1.9-4.1-5.7-7.5-5.5 c-1.1,0.1-2.3,0.6-3.2,1c-2.4,1.2-4.9,3-5,6.1c-0.1,4.3,3.9,9.5,5.9,13.2c2.4,4.5,5,8.8,7.7,13.2c5.2,8.6,10.9,16.9,16.6,25.2 c0.4,0.6,0.9,1.2,1.6,1.5c0.6,0.2,1,0.1,1.7,0.1c2.9-0.3,5.5-1.1,8.2-2c2.1-0.7,4.3-1,6.4-1.4c4.6-0.8,9.2-1.7,13.8-2.3 c13-1.7,26-2.3,39.1-1.6c6.6,0.3,13,1,19.5,1.9c6.1,0.9,12.6,1.6,18.4,3.5c2.5,0.8,4.5,1.5,7,1.8c1,0.1,2.1,0.5,3,0.1 c1.9-0.8,3.2-4.3,4.4-5.9c1.7-2.3,3.2-4.8,4.9-7.2c3.2-4.8,6.3-9.6,9.2-14.6c2.6-4.3,5-8.6,7.4-13c1.9-3.5,5.7-8.4,5.6-12.6 c-0.1-2.8-1.7-5-4.1-6.3c-1.7-1-3.5-1.3-5.2-2c-2-0.8-3.9-1.4-5.9-2.1c-9.3-3.2-18.8-5.5-28.6-6.8 C343.2,292.7,334.5,292.2,325.9,292z')}

            {/* Left sill */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('left_sill'), opacity: getPartOpacity('left_sill') }}
                onClick={() => handlePartClick('left_sill', 'Left sill')}
                onMouseEnter={() => handlePartMouseEnter('left_sill', 'Left sill')}
                onMouseLeave={handlePartMouseLeave}
                d="M130.8,330.6c-0.3-7.5-0.7-15-1-22.6c-0.3-5.9-0.6-11.7-0.9-17.5c-0.1-2.2,0.1-3.8,2.6-4.6 c3.5-1,8.7-2.3,12-0.4c2.9,1.7,2.6,6.1,2.9,8.8c0.4,4.1,1,8.2,1.3,12.4c0.3,2.3,0.7,5.5-1.4,7.2c-2.2,1.7-3.5,2.3-3.6,5.2 c-0.1,18.6-1,37.1-1,55.6c-0.2,9.5-0.3,18.9-0.4,28.4c-0.1,10.1,0.2,20.3-0.1,30.4c-0.4,12.9,0.7,25.7,0.5,38.6 c-0.2,19.2,0,38.3,0,57.6c0,8.1,0,16.3,0,24.4c0,4.1,0,8.1,0,12.2c0,5.6-1.2,10.4,4.7,13.6c5.5,3,12,4.5,17.2,8 c3.4,2.3,6.4,5.1,9.2,8.1c7.6,8.3,5.7,13,4.3,13.5c-5.1,2.1-8.2-6.3-10.5-9c-2.4-2.8-5.3-5.3-8.3-7.5c-6-4.3-13.1-7.3-20.6-8.8 c-4.6-0.9-4.1-3.7-4-7.4c0.8-28.5,1.8-57,2.1-85.5c0.1-14.5,0.1-29.1-0.3-43.5c-0.7-28.6-2.3-57.3-3.5-85.9 C131.6,351.3,131.1,341,130.8,330.6z"
            />
            {createHitArea('left_sill', 'Left sill', 'M130.8,330.6c-0.3-7.5-0.7-15-1-22.6c-0.3-5.9-0.6-11.7-0.9-17.5c-0.1-2.2,0.1-3.8,2.6-4.6 c3.5-1,8.7-2.3,12-0.4c2.9,1.7,2.6,6.1,2.9,8.8c0.4,4.1,1,8.2,1.3,12.4c0.3,2.3,0.7,5.5-1.4,7.2c-2.2,1.7-3.5,2.3-3.6,5.2 c-0.1,18.6-1,37.1-1,55.6c-0.2,9.5-0.3,18.9-0.4,28.4c-0.1,10.1,0.2,20.3-0.1,30.4c-0.4,12.9,0.7,25.7,0.5,38.6 c-0.2,19.2,0,38.3,0,57.6c0,8.1,0,16.3,0,24.4c0,4.1,0,8.1,0,12.2c0,5.6-1.2,10.4,4.7,13.6c5.5,3,12,4.5,17.2,8 c3.4,2.3,6.4,5.1,9.2,8.1c7.6,8.3,5.7,13,4.3,13.5c-5.1,2.1-8.2-6.3-10.5-9c-2.4-2.8-5.3-5.3-8.3-7.5c-6-4.3-13.1-7.3-20.6-8.8 c-4.6-0.9-4.1-3.7-4-7.4c0.8-28.5,1.8-57,2.1-85.5c0.1-14.5,0.1-29.1-0.3-43.5c-0.7-28.6-2.3-57.3-3.5-85.9 C131.6,351.3,131.1,341,130.8,330.6z')}

            {/* Right sill */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Right_sill'), opacity: getPartOpacity('Right_sill') }}
                onClick={() => handlePartClick('Right_sill', 'Right sill')}
                onMouseEnter={() => handlePartMouseEnter('Right_sill', 'Right sill')}
                onMouseLeave={handlePartMouseLeave}
                d="M482.1,330.6c0.3-7.5,0.7-15,1-22.6c0.3-5.9,0.6-11.7,0.9-17.5c0.1-2.2-0.1-3.8-2.6-4.6c-3.5-1-8.7-2.3-12-0.4 c-2.9,1.7-2.6,6.1-2.9,8.8c-0.4,4.1-1,8.2-1.3,12.4c-0.3,2.3-0.7,5.5,1.4,7.2c2.2,1.7,3.5,2.3,3.6,5.2c0.1,18.6,1,37.1,1,55.6 c0.2,9.5,0.3,18.9,0.4,28.4c0.1,10.1-0.2,20.3,0.1,30.4c0.4,12.9-0.7,25.7-0.5,38.6c0.2,19.2,0,38.3,0,57.6c0,8.1,0,16.3,0,24.4 c0,4.1,0,8.1,0,12.2c0,5.6,1.2,10.4-4.7,13.6c-5.5,3-12,4.5-17.2,8c-3.4,2.3-6.4,5.1-9.2,8.1c-7.6,8.3-5.7,13-4.3,13.5 c5.1,2.1,8.2-6.3,10.5-9c2.4-2.8,5.3-5.3,8.3-7.5c6-4.3,13.1-7.3,20.6-8.8c4.6-0.9,4.1-3.7,4-7.4c-0.8-28.5-1.8-57-2.1-85.5 c-0.1-14.5-0.1-29.1,0.3-43.5c0.7-28.6,2.3-57.3,3.5-85.9C481.3,351.3,481.7,341,482.1,330.6z"
            />
            {createHitArea('Right_sill', 'Right sill', 'M482.1,330.6c0.3-7.5,0.7-15,1-22.6c0.3-5.9,0.6-11.7,0.9-17.5c0.1-2.2-0.1-3.8-2.6-4.6c-3.5-1-8.7-2.3-12-0.4 c-2.9,1.7-2.6,6.1-2.9,8.8c-0.4,4.1-1,8.2-1.3,12.4c-0.3,2.3-0.7,5.5,1.4,7.2c2.2,1.7,3.5,2.3,3.6,5.2c0.1,18.6,1,37.1,1,55.6 c0.2,9.5,0.3,18.9,0.4,28.4c0.1,10.1-0.2,20.3,0.1,30.4c0.4,12.9-0.7,25.7-0.5,38.6c0.2,19.2,0,38.3,0,57.6c0,8.1,0,16.3,0,24.4 c0,4.1,0,8.1,0,12.2c0,5.6,1.2,10.4-4.7,13.6c-5.5,3-12,4.5-17.2,8c-3.4,2.3-6.4,5.1-9.2,8.1c-7.6,8.3-5.7,13-4.3,13.5 c5.1,2.1,8.2-6.3,10.5-9c2.4-2.8,5.3-5.3,8.3-7.5c6-4.3,13.1-7.3,20.6-8.8c4.6-0.9,4.1-3.7,4-7.4c-0.8-28.5-1.8-57-2.1-85.5 c-0.1-14.5-0.1-29.1,0.3-43.5c0.7-28.6,2.3-57.3,3.5-85.9C481.3,351.3,481.7,341,482.1,330.6z')}

            {/* Rear left door window */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Rear_left_door_window'), opacity: getPartOpacity('Rear_left_door_window') }}
                onClick={() => handlePartClick('Rear_left_door_window', 'Rear left door window')}
                onMouseEnter={() => handlePartMouseEnter('Rear_left_door_window', 'Rear left door window')}
                onMouseLeave={handlePartMouseLeave}
                d="M243,546.7c0,0.1-0.1,0.1-0.1,0.2c-0.7,2.3-3.1,4.1-4.7,5.9c-2.1,2.4-4.1,4.9-6,7.4c-5.5,7.4-11.2,14.6-17,21.9 c-2.9,3.7-5.8,7.3-8.8,11c-1.4,1.8-2.8,3.5-4.2,5.3c-1.1,1.4-2.3,3.6-3.8,4.6c-0.2,0.1-0.3,0.2-0.6,0.2c-0.6,0-0.8-0.8-0.8-1.3 c-0.1-5.4,0.1-10.8,0.1-16.2c0-13.4,0-26.9,0-40.3c0-14.7,0-29.5,0-44.1c0-9.7,0-19.4,0-29.1c0-1.8-0.8-5.7,1-6.5 c0.3-0.1,0.8-0.1,1.1-0.1c11.2-0.2,22.4-0.8,33.6-0.8c2.6,0,5,0,7.5,0c0.6,0,1,0,1.4,0.2c0.7,0.3,1,1,1.2,1.7 c0.3,1.6-0.2,3.4-0.2,5.1c0,10.6,0,21.3,0,31.8c0,7.8,0,15.5,0,23.4c0,5.4,0.2,10.9,0.2,16.3C243.4,544.2,243.3,545.5,243,546.7z"
            />
            {createHitArea('Rear_left_door_window', 'Rear left door window', 'M243,546.7c0,0.1-0.1,0.1-0.1,0.2c-0.7,2.3-3.1,4.1-4.7,5.9c-2.1,2.4-4.1,4.9-6,7.4c-5.5,7.4-11.2,14.6-17,21.9 c-2.9,3.7-5.8,7.3-8.8,11c-1.4,1.8-2.8,3.5-4.2,5.3c-1.1,1.4-2.3,3.6-3.8,4.6c-0.2,0.1-0.3,0.2-0.6,0.2c-0.6,0-0.8-0.8-0.8-1.3 c-0.1-5.4,0.1-10.8,0.1-16.2c0-13.4,0-26.9,0-40.3c0-14.7,0-29.5,0-44.1c0-9.7,0-19.4,0-29.1c0-1.8-0.8-5.7,1-6.5 c0.3-0.1,0.8-0.1,1.1-0.1c11.2-0.2,22.4-0.8,33.6-0.8c2.6,0,5,0,7.5,0c0.6,0,1,0,1.4,0.2c0.7,0.3,1,1,1.2,1.7 c0.3,1.6-0.2,3.4-0.2,5.1c0,10.6,0,21.3,0,31.8c0,7.8,0,15.5,0,23.4c0,5.4,0.2,10.9,0.2,16.3C243.4,544.2,243.3,545.5,243,546.7z')}

            {/* Rear left door */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Rear_left_door'), opacity: getPartOpacity('Rear_left_door') }}
                onClick={() => handlePartClick('Rear_left_door', 'Rear left door')}
                onMouseEnter={() => handlePartMouseEnter('Rear_left_door', 'Rear left door')}
                onMouseLeave={handlePartMouseLeave}
                d="M195.6,482.9c0-5.2,0-10.5,0-15.7c0-0.6,0-1-0.3-1.4c-0.4-0.5-1-0.5-1.6-0.5c-15.1-0.2-30.2-0.4-45.3-0.6 c-0.8,0-1.4,0-2,0.5c-0.7,0.6-0.7,1.5-0.7,2.4c0,28.8-0.1,57.6,0.4,86.3c0.1,4.1,0.1,8.3,0.1,12.5c0,2.8-1.3,9.6,1.2,11.4 c2.4,1.7,6.1,2.4,8.8,3.7c5.2,2.5,10.4,5.9,14.7,10c2.1,2.1,4.1,4.3,5.8,6.7c1.7,2.5,3.2,5.2,5.9,6.9c3.2,1.9,7.7,1.2,11.2,0.2 c0.5-0.1,0.9-0.3,1.2-0.6c2-1.7,0.9-7,0.8-9.2c-0.3-10.6-0.1-21.2-0.1-31.7C195.6,536.6,195.6,509.7,195.6,482.9z"
            />
            {createHitArea('Rear_left_door', 'Rear left door', 'M195.6,482.9c0-5.2,0-10.5,0-15.7c0-0.6,0-1-0.3-1.4c-0.4-0.5-1-0.5-1.6-0.5c-15.1-0.2-30.2-0.4-45.3-0.6 c-0.8,0-1.4,0-2,0.5c-0.7,0.6-0.7,1.5-0.7,2.4c0,28.8-0.1,57.6,0.4,86.3c0.1,4.1,0.1,8.3,0.1,12.5c0,2.8-1.3,9.6,1.2,11.4 c2.4,1.7,6.1,2.4,8.8,3.7c5.2,2.5,10.4,5.9,14.7,10c2.1,2.1,4.1,4.3,5.8,6.7c1.7,2.5,3.2,5.2,5.9,6.9c3.2,1.9,7.7,1.2,11.2,0.2 c0.5-0.1,0.9-0.3,1.2-0.6c2-1.7,0.9-7,0.8-9.2c-0.3-10.6-0.1-21.2-0.1-31.7C195.6,536.6,195.6,509.7,195.6,482.9z')}

            {/* Front left door window */}
            <path
                className="st2 part-path"
                style={{ fill: getPartColor('Front_left_door_window'), opacity: getPartOpacity('Front_left_door_window') }}
                onClick={() => handlePartClick('Front_left_door_window', 'Front left door window')}
                onMouseEnter={() => handlePartMouseEnter('Front_left_door_window', 'Front left door window')}
                onMouseLeave={handlePartMouseLeave}
                d="M197.9,330.1c0-0.7-0.1-1.3-0.1-2.1c0-3.2,0-6.6,0.1-9.8c0-0.2,0.1-0.6,0.3-0.6c0.1,0,0.2,0.1,0.3,0.1 c0.5,0.4,0.8,0.9,1.1,1.4c1.1,1.7,2.3,3.2,3.4,5c0.3,0.5,0.7,1,0.9,1.5c0.6,1.5-0.3,3.2-1.2,4.4c-0.6,0.8-1.2,1.5-1.9,2.3 c-0.3,0.3-0.7,0.8-1,1c-0.3,0.3-0.7,1-1.2,0.6c-0.3-0.2-0.3-0.6-0.4-0.9C198.1,332.1,198,331,197.9,330.1z"
            />
            {createHitArea('Front_left_door_window', 'Front left door window', 'M197.9,330.1c0-0.7-0.1-1.3-0.1-2.1c0-3.2,0-6.6,0.1-9.8c0-0.2,0.1-0.6,0.3-0.6c0.1,0,0.2,0.1,0.3,0.1 c0.5,0.4,0.8,0.9,1.1,1.4c1.1,1.7,2.3,3.2,3.4,5c0.3,0.5,0.7,1,0.9,1.5c0.6,1.5-0.3,3.2-1.2,4.4c-0.6,0.8-1.2,1.5-1.9,2.3 c-0.3,0.3-0.7,0.8-1,1c-0.3,0.3-0.7,1-1.2,0.6c-0.3-0.2-0.3-0.6-0.4-0.9C198.1,332.1,198,331,197.9,330.1z')}

            {/* Left side wall */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Left_side_wall'), opacity: getPartOpacity('Left_side_wall') }}
                onClick={() => handlePartClick('Left_side_wall', 'Left side wall')}
                onMouseEnter={() => handlePartMouseEnter('Left_side_wall', 'Left side wall')}
                onMouseLeave={handlePartMouseLeave}
                d="M245.4,552.2c-0.3-0.4-0.8-0.8-1.3-0.8c-0.4,0-0.8,0.1-1.1,0.3c-3,1.2-5.2,3.7-7.2,6.1c-3.2,3.9-6,8-9.2,11.9 c-1.3,1.7-2.7,3.3-4,5c-2.3,3-4.7,5.9-7,9c-1,1.4-2.2,2.8-3.2,4.3c-1,1.4-2.1,3.3-3.4,4.5c-1.5,2-3,4-4.6,6c-1.3,1.7-2.7,4-4.4,5.4 c-5.5,5.2-14.1,2.4-19.8,6.9c-2.3,1.8-2.9,4.6-2.6,7.3c0.3,3.1,1.1,6.2,1.4,9.3c0.3,3,0.4,6.1,0.1,9.2c-0.5,6.1-2.1,12-5,17.4 c-0.7,1.2-1.4,2.6-2.1,3.7c-6.8,10.7-17.7,18.6-29.9,21.5c-1.7,0.4-3.5,0.9-4.6,2.3c-1.8,2.6-0.6,8-0.3,11 c0.6,7.9,1.9,15.7,3.5,23.4c1,4.8,3.4,7.2,7.8,9.2c10.4,4.9,21.3,8.8,32.4,11.8c2.9,0.8,6.1,1.4,8.8,0.2c3.6-1.6,5.1-6.1,8.6-8 c-0.1-2.1-2.8-3-4.8-3.2c-8.1-1.2-16.2-2.4-24.4-3.5c-1.3-0.2-2.8-0.4-3.8-1.2c-1-0.8-1.5-2.1-2-3.4c-1.1-3.3-1.7-6.9-1.9-10.4 c-0.1-3.1,1.6-3.8,4.5-3.6c14.5,1.1,28.9,3.4,43.3,5.1c5.8,0.7,10.5,0.1,14.8-4.3c3.6-3.7,6.9-7.5,4.3-12.6c-3-6.3-5.2-13-6.6-19.8 c-2.8-13.9-3.8-28.2-4.9-42.3c-0.9-12.1,2.1-24.2,6.9-35.3c4.9-11.2,12.6-20.5,18.2-31.1c1-1.7,2.1-3.3,3-5.1 c0.8-1.7,1.7-3.9,0.7-5.7C245.5,552.3,245.5,552.3,245.4,552.2z"
            />
            {createHitArea('Left_side_wall', 'Left side wall', 'M245.4,552.2c-0.3-0.4-0.8-0.8-1.3-0.8c-0.4,0-0.8,0.1-1.1,0.3c-3,1.2-5.2,3.7-7.2,6.1c-3.2,3.9-6,8-9.2,11.9 c-1.3,1.7-2.7,3.3-4,5c-2.3,3-4.7,5.9-7,9c-1,1.4-2.2,2.8-3.2,4.3c-1,1.4-2.1,3.3-3.4,4.5c-1.5,2-3,4-4.6,6c-1.3,1.7-2.7,4-4.4,5.4 c-5.5,5.2-14.1,2.4-19.8,6.9c-2.3,1.8-2.9,4.6-2.6,7.3c0.3,3.1,1.1,6.2,1.4,9.3c0.3,3,0.4,6.1,0.1,9.2c-0.5,6.1-2.1,12-5,17.4 c-0.7,1.2-1.4,2.6-2.1,3.7c-6.8,10.7-17.7,18.6-29.9,21.5c-1.7,0.4-3.5,0.9-4.6,2.3c-1.8,2.6-0.6,8-0.3,11 c0.6,7.9,1.9,15.7,3.5,23.4c1,4.8,3.4,7.2,7.8,9.2c10.4,4.9,21.3,8.8,32.4,11.8c2.9,0.8,6.1,1.4,8.8,0.2c3.6-1.6,5.1-6.1,8.6-8 c-0.1-2.1-2.8-3-4.8-3.2c-8.1-1.2-16.2-2.4-24.4-3.5c-1.3-0.2-2.8-0.4-3.8-1.2c-1-0.8-1.5-2.1-2-3.4c-1.1-3.3-1.7-6.9-1.9-10.4 c-0.1-3.1,1.6-3.8,4.5-3.6c14.5,1.1,28.9,3.4,43.3,5.1c5.8,0.7,10.5,0.1,14.8-4.3c3.6-3.7,6.9-7.5,4.3-12.6c-3-6.3-5.2-13-6.6-19.8 c-2.8-13.9-3.8-28.2-4.9-42.3c-0.9-12.1,2.1-24.2,6.9-35.3c4.9-11.2,12.6-20.5,18.2-31.1c1-1.7,2.1-3.3,3-5.1 c0.8-1.7,1.7-3.9,0.7-5.7C245.5,552.3,245.5,552.3,245.4,552.2z')}

            {/* Right side wall */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Right_side_wall'), opacity: getPartOpacity('Right_side_wall') }}
                onClick={() => handlePartClick('Right_side_wall', 'Right side wall')}
                onMouseEnter={() => handlePartMouseEnter('Right_side_wall', 'Right side wall')}
                onMouseLeave={handlePartMouseLeave}
                d="M366.1,552.4c-1,1.7-0.2,4,0.7,5.7c0.9,1.7,2,3.3,3,5.1c5.7,10.7,13.3,19.9,18.2,31.1 c4.8,11.1,7.7,23.2,6.9,35.3c-1,14.1-2.1,28.4-4.9,42.3c-1.4,6.9-3.5,13.5-6.6,19.8c-2.5,5.1,0.8,8.8,4.3,12.6c4.3,4.3,9,5,14.8,4.3 c14.5-1.7,28.8-3.9,43.3-5.1c2.9-0.2,4.6,0.5,4.5,3.6c-0.1,3.5-0.8,7.1-1.9,10.4c-0.4,1.2-1,2.6-2,3.4c-1,0.9-2.5,1-3.8,1.2 c-8.1,1.2-16.2,2.4-24.4,3.5c-2.1,0.3-4.7,1.1-4.8,3.2c3.5,1.9,5,6.3,8.6,8c2.8,1.2,5.9,0.6,8.8-0.2c11.2-3,22-7,32.4-11.8 c4.4-2.1,6.8-4.4,7.8-9.2c1.6-7.7,3-15.5,3.5-23.4c0.2-3,1.4-8.4-0.3-11c-1-1.4-2.9-1.9-4.6-2.3c-12.2-3-23.3-10.9-29.9-21.5 c-0.8-1.2-1.4-2.5-2.1-3.7c-2.8-5.4-4.6-11.3-5-17.4c-0.2-3-0.1-6.1,0.1-9.2c0.3-3.1,1-6.2,1.4-9.3c0.3-2.8-0.3-5.5-2.6-7.3 c-5.7-4.6-14.3-1.7-19.8-6.9c-1.8-1.4-3-3.7-4.4-5.4c-1.5-2-3-4-4.6-6c-1.3-1.1-2.3-3-3.4-4.5c-1-1.4-2.2-2.8-3.2-4.3 c-2.3-3-4.6-5.9-7-9c-1.3-1.7-2.7-3.3-4-5c-3.1-3.9-6-8-9.2-11.9c-2-2.4-4.3-4.8-7.2-6.1c-0.3-0.1-0.8-0.3-1.1-0.3 c-0.6,0-1,0.3-1.3,0.8C366.2,552.3,366.2,552.3,366.1,552.4z"
            />
            {createHitArea('Right_side_wall', 'Right side wall', 'M366.1,552.4c-1,1.7-0.2,4,0.7,5.7c0.9,1.7,2,3.3,3,5.1c5.7,10.7,13.3,19.9,18.2,31.1 c4.8,11.1,7.7,23.2,6.9,35.3c-1,14.1-2.1,28.4-4.9,42.3c-1.4,6.9-3.5,13.5-6.6,19.8c-2.5,5.1,0.8,8.8,4.3,12.6c4.3,4.3,9,5,14.8,4.3 c14.5-1.7,28.8-3.9,43.3-5.1c2.9-0.2,4.6,0.5,4.5,3.6c-0.1,3.5-0.8,7.1-1.9,10.4c-0.4,1.2-1,2.6-2,3.4c-1,0.9-2.5,1-3.8,1.2 c-8.1,1.2-16.2,2.4-24.4,3.5c-2.1,0.3-4.7,1.1-4.8,3.2c3.5,1.9,5,6.3,8.6,8c2.8,1.2,5.9,0.6,8.8-0.2c11.2-3,22-7,32.4-11.8 c4.4-2.1,6.8-4.4,7.8-9.2c1.6-7.7,3-15.5,3.5-23.4c0.2-3,1.4-8.4-0.3-11c-1-1.4-2.9-1.9-4.6-2.3c-12.2-3-23.3-10.9-29.9-21.5 c-0.8-1.2-1.4-2.5-2.1-3.7c-2.8-5.4-4.6-11.3-5-17.4c-0.2-3-0.1-6.1,0.1-9.2c0.3-3.1,1-6.2,1.4-9.3c0.3-2.8-0.3-5.5-2.6-7.3 c-5.7-4.6-14.3-1.7-19.8-6.9c-1.8-1.4-3-3.7-4.4-5.4c-1.5-2-3-4-4.6-6c-1.3-1.1-2.3-3-3.4-4.5c-1-1.4-2.2-2.8-3.2-4.3 c-2.3-3-4.6-5.9-7-9c-1.3-1.7-2.7-3.3-4-5c-3.1-3.9-6-8-9.2-11.9c-2-2.4-4.3-4.8-7.2-6.1c-0.3-0.1-0.8-0.3-1.1-0.3 c-0.6,0-1,0.3-1.3,0.8C366.2,552.3,366.2,552.3,366.1,552.4z')}

            {/* Rear left wheel */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('rear_left_wheel'), opacity: getPartOpacity('rear_left_wheel') }}
                onClick={() => handlePartClick('rear_left_wheel', 'Rear left wheel')}
                onMouseEnter={() => handlePartMouseEnter('rear_left_wheel', 'Rear left wheel')}
                onMouseLeave={handlePartMouseLeave}
                d="M173,639.6c-0.2,1-0.4,2-0.7,3c-2.8,11-9,20.5-18.6,26.6c-3.6,2.3-7.6,4.1-11.7,5.2c-1.3,0.3-13.5,2.2-13.5,1.4 v-87.6c0.1-0.6,9.7,0.9,10.7,1c3.8,0.8,7.5,2.1,10.9,3.9C166.8,601.7,176.3,621.3,173,639.6z"
            />
            {createHitArea('rear_left_wheel', 'Rear left wheel', 'M173,639.6c-0.2,1-0.4,2-0.7,3c-2.8,11-9,20.5-18.6,26.6c-3.6,2.3-7.6,4.1-11.7,5.2c-1.3,0.3-13.5,2.2-13.5,1.4 v-87.6c0.1-0.6,9.7,0.9,10.7,1c3.8,0.8,7.5,2.1,10.9,3.9C166.8,601.7,176.3,621.3,173,639.6z')}

            {/* Rear right wheel */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('rear_right_wheel'), opacity: getPartOpacity('rear_right_wheel') }}
                onClick={() => handlePartClick('rear_right_wheel', 'Rear right wheel')}
                onMouseEnter={() => handlePartMouseEnter('rear_right_wheel', 'Rear right wheel')}
                onMouseLeave={handlePartMouseLeave}
                d="M439.3,624.6c0.2-1,0.4-2,0.7-3c2.8-11,9-20.5,18.6-26.6c3.6-2.3,7.6-4.1,11.7-5.2c1.3-0.3,13.5-2.2,13.5-1.4 V676c-0.1,0.6-9.7-0.9-10.7-1c-3.8-0.8-7.5-2.1-10.9-3.9C445.5,662.5,436,642.9,439.3,624.6z"
            />
            {createHitArea('rear_right_wheel', 'Rear right wheel', 'M439.3,624.6c0.2-1,0.4-2,0.7-3c2.8-11,9-20.5,18.6-26.6c3.6-2.3,7.6-4.1,11.7-5.2c1.3-0.3,13.5-2.2,13.5-1.4 V676c-0.1,0.6-9.7-0.9-10.7-1c-3.8-0.8-7.5-2.1-10.9-3.9C445.5,662.5,436,642.9,439.3,624.6z')}

            {/* Heck (Rear) */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Heck'), opacity: getPartOpacity('Heck') }}
                onClick={() => handlePartClick('Heck', 'Heck')}
                onMouseEnter={() => handlePartMouseEnter('Heck', 'Heck')}
                onMouseLeave={handlePartMouseLeave}
                d="M419.9,738.8c-0.1,0.1-0.1,0.1-0.3,0.1c-3.1,0.8-6.4,1-9.5,1.8c-1.6,0.4-3.2,0.8-4.8,1.1 c-19.3,4.1-39.4,5.2-59,6.3c-20,1.1-40,1.4-60.1,0.9c-20-0.6-40-1.9-60-4c-11.7-1.2-23.4-3.5-34.8-6.3c1-2.5,3.1-4.3,5.1-6.2 c1.3-1.3,2.7-2.8,4.4-3.5c2.1-0.9,4.4-0.7,6.6-0.3c6.4,1.2,12.8,2.1,19.3,3.3c1.2,0.2,2.7,0.4,3.6-0.4c1-0.9,1-2.5,0.8-3.8 c-0.3-3.1-0.8-6.3-1.3-9.3c-0.6-3-1.9-7-5.3-7.6c-0.8-0.1-1.7-0.1-2.1-0.8c-0.4-0.6-0.3-1.3,0-1.9c0.4-1,1-1.7,1.8-2.4 c1.9-2.1,4.3-6.1,7.2-6.8c1.9-0.5,4.5,2.1,6.3,2.8c3,1.1,6.2,1.5,9.3,1.9c19.7,2.1,39.6,2.8,59.5,2.8c10.2,0,20.4-0.2,30.6-0.6 c6.2-0.3,12.5-0.6,18.7-1.1c5.9-0.6,12.6-0.8,18.1-3c1.8-0.7,4.3-3.2,6.3-2.8c3.2,0.8,6,5.3,8.1,7.6c0.5,0.6,1,1,1.2,1.7 c0.2,0.7,0.1,1.5-0.6,1.9c-0.3,0.3-0.8,0.3-1.2,0.3c-2.2,0.4-3.9,2.1-5,4.2c-1.9,4-1.7,8.9-2.4,13.2c-0.4,2.1,0.4,4.1,2.8,4.3 c1.4,0.1,3-0.6,4.5-0.8c2-0.3,4-0.7,6-1c4-0.7,7.9-1.3,11.9-2c1.3-0.2,2.8-0.5,4.1-0.1c2.3,0.6,3.7,2.8,5.4,4.2c2,1.7,3.9,3.4,5,5.8 C419.9,738.6,420,738.8,419.9,738.8z"
            />
            {createHitArea('Heck', 'Heck', 'M419.9,738.8c-0.1,0.1-0.1,0.1-0.3,0.1c-3.1,0.8-6.4,1-9.5,1.8c-1.6,0.4-3.2,0.8-4.8,1.1 c-19.3,4.1-39.4,5.2-59,6.3c-20,1.1-40,1.4-60.1,0.9c-20-0.6-40-1.9-60-4c-11.7-1.2-23.4-3.5-34.8-6.3c1-2.5,3.1-4.3,5.1-6.2 c1.3-1.3,2.7-2.8,4.4-3.5c2.1-0.9,4.4-0.7,6.6-0.3c6.4,1.2,12.8,2.1,19.3,3.3c1.2,0.2,2.7,0.4,3.6-0.4c1-0.9,1-2.5,0.8-3.8 c-0.3-3.1-0.8-6.3-1.3-9.3c-0.6-3-1.9-7-5.3-7.6c-0.8-0.1-1.7-0.1-2.1-0.8c-0.4-0.6-0.3-1.3,0-1.9c0.4-1,1-1.7,1.8-2.4 c1.9-2.1,4.3-6.1,7.2-6.8c1.9-0.5,4.5,2.1,6.3,2.8c3,1.1,6.2,1.5,9.3,1.9c19.7,2.1,39.6,2.8,59.5,2.8c10.2,0,20.4-0.2,30.6-0.6 c6.2-0.3,12.5-0.6,18.7-1.1c5.9-0.6,12.6-0.8,18.1-3c1.8-0.7,4.3-3.2,6.3-2.8c3.2,0.8,6,5.3,8.1,7.6c0.5,0.6,1,1,1.2,1.7 c0.2,0.7,0.1,1.5-0.6,1.9c-0.3,0.3-0.8,0.3-1.2,0.3c-2.2,0.4-3.9,2.1-5,4.2c-1.9,4-1.7,8.9-2.4,13.2c-0.4,2.1,0.4,4.1,2.8,4.3 c1.4,0.1,3-0.6,4.5-0.8c2-0.3,4-0.7,6-1c4-0.7,7.9-1.3,11.9-2c1.3-0.2,2.8-0.5,4.1-0.1c2.3,0.6,3.7,2.8,5.4,4.2c2,1.7,3.9,3.4,5,5.8 C419.9,738.6,420,738.8,419.9,738.8z')}

            {/* Left rear light */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Left_rear_light'), opacity: getPartOpacity('Left_rear_light') }}
                onClick={() => handlePartClick('Left_rear_light', 'Left rear light')}
                onMouseEnter={() => handlePartMouseEnter('Left_rear_light', 'Left rear light')}
                onMouseLeave={handlePartMouseLeave}
                d="M221.8,711.9c-7.2-0.9-14.4-1.7-21.6-2.6c-7.2-0.8-14.2-1.6-21.4-2.3c-4.2-0.4-8.4-0.8-12.6-1.3 c-0.3-0.1-3.7-0.6-3.7-0.3c0.2,2.4,0.9,4.8,1.3,7.2c0.4,1.7,0.8,3.5,1.7,5.1c1,1.4,2.5,2.6,4.1,3.1c1.7,0.7,3.6,1,5.4,1.1 c1.2,0.1,2.6,0.2,3.8,0.3c3.8,0.3,7.5,0.8,11.2,1.4c1.5,0.3,3,0.6,4.6,0.8c11,1.9,22.1,3.7,33.1,5.6c0.5,0.1,1,0.1,1.4-0.2 c0.3-0.3,0.3-1,0.3-1.4c-0.6-4.2-1.4-8.4-2.5-12.5c-0.3-1-0.6-1.9-1.2-2.6c-0.9-0.8-2.1-1-3.2-1.1 C222.4,711.9,222.1,711.9,221.8,711.9z"
            />
            {createHitArea('Left_rear_light', 'Left rear light', 'M221.8,711.9c-7.2-0.9-14.4-1.7-21.6-2.6c-7.2-0.8-14.2-1.6-21.4-2.3c-4.2-0.4-8.4-0.8-12.6-1.3 c-0.3-0.1-3.7-0.6-3.7-0.3c0.2,2.4,0.9,4.8,1.3,7.2c0.4,1.7,0.8,3.5,1.7,5.1c1,1.4,2.5,2.6,4.1,3.1c1.7,0.7,3.6,1,5.4,1.1 c1.2,0.1,2.6,0.2,3.8,0.3c3.8,0.3,7.5,0.8,11.2,1.4c1.5,0.3,3,0.6,4.6,0.8c11,1.9,22.1,3.7,33.1,5.6c0.5,0.1,1,0.1,1.4-0.2 c0.3-0.3,0.3-1,0.3-1.4c-0.6-4.2-1.4-8.4-2.5-12.5c-0.3-1-0.6-1.9-1.2-2.6c-0.9-0.8-2.1-1-3.2-1.1 C222.4,711.9,222.1,711.9,221.8,711.9z')}

            {/* Taillights right */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Taillights_right'), opacity: getPartOpacity('Taillights_right') }}
                onClick={() => handlePartClick('Taillights_right', 'Taillights right')}
                onMouseEnter={() => handlePartMouseEnter('Taillights_right', 'Taillights right')}
                onMouseLeave={handlePartMouseLeave}
                d="M389.6,712.4c7.2-0.9,14.4-1.7,21.6-2.6c7.2-0.8,14.2-1.6,21.4-2.3c4.2-0.4,8.4-0.8,12.6-1.3 c0.3-0.1,3.7-0.6,3.7-0.3c-0.2,2.4-0.9,4.8-1.3,7.2c-0.4,1.7-0.8,3.5-1.7,5.1c-1,1.4-2.5,2.6-4.1,3.1c-1.7,0.7-3.6,1-5.4,1.1 c-1.2,0.1-2.6,0.2-3.8,0.3c-3.8,0.3-7.5,0.8-11.2,1.4c-1.5,0.3-3,0.6-4.6,0.8c-11,1.9-22.1,3.7-33.1,5.6c-0.5,0.1-1,0.1-1.4-0.2 c-0.3-0.3-0.3-1-0.3-1.4c0.6-4.2,1.4-8.4,2.5-12.5c0.3-1,0.6-1.9,1.2-2.6c0.9-0.8,2.1-1,3.2-1.1C389,712.4,389.3,712.4,389.6,712.4z"
            />
            {createHitArea('Taillights_right', 'Taillights right', 'M389.6,712.4c7.2-0.9,14.4-1.7,21.6-2.6c7.2-0.8,14.2-1.6,21.4-2.3c4.2-0.4,8.4-0.8,12.6-1.3 c0.3-0.1,3.7-0.6,3.7-0.3c-0.2,2.4-0.9,4.8-1.3,7.2c-0.4,1.7-0.8,3.5-1.7,5.1c-1,1.4-2.5,2.6-4.1,3.1c-1.7,0.7-3.6,1-5.4,1.1 c-1.2,0.1-2.6,0.2-3.8,0.3c-3.8,0.3-7.5,0.8-11.2,1.4c-1.5,0.3-3,0.6-4.6,0.8c-11,1.9-22.1,3.7-33.1,5.6c-0.5,0.1-1,0.1-1.4-0.2 c-0.3-0.3-0.3-1-0.3-1.4c0.6-4.2,1.4-8.4,2.5-12.5c0.3-1,0.6-1.9,1.2-2.6c0.9-0.8,2.1-1,3.2-1.1C389,712.4,389.3,712.4,389.6,712.4z')}

            {/* Rear bumper */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('rear_bumper'), opacity: getPartOpacity('rear_bumper') }}
                onClick={() => handlePartClick('rear_bumper', 'Rear bumper')}
                onMouseEnter={() => handlePartMouseEnter('rear_bumper', 'Rear bumper')}
                onMouseLeave={handlePartMouseLeave}
                d="M475.1,729.1c0,4.3-2.7,8.3-5.9,11c-2.7,2.2-5.8,3.8-9,5.2c-33.7,15-72.8,18.1-109.3,20.7c-0.1,0-0.1,0-0.1,0 c-39.3,2.8-78.9,2-118.1-2.1c-12-1.2-23.9-3-35.8-5.2c-16.5-3.2-33.1-7.2-48.3-14.5c-5.7-2.8-12.4-8-12.4-15c0-5.8,3.2-7.9,7.9-5 c5.6,3.5,11.5,6.6,17.8,8.9c12.7,4.9,26.2,7.5,39.5,9.7c39,6.4,78.5,9.4,117.9,8.6c16.2-0.3,32.4-1.3,48.6-3 c17.9-1.8,35.8-4.3,53.5-7.9c16.4-3.2,32.8-7.7,46.6-17.3C472.8,720.2,475.1,725,475.1,729.1z"
            />
            {createHitArea('rear_bumper', 'Rear bumper', 'M475.1,729.1c0,4.3-2.7,8.3-5.9,11c-2.7,2.2-5.8,3.8-9,5.2c-33.7,15-72.8,18.1-109.3,20.7c-0.1,0-0.1,0-0.1,0 c-39.3,2.8-78.9,2-118.1-2.1c-12-1.2-23.9-3-35.8-5.2c-16.5-3.2-33.1-7.2-48.3-14.5c-5.7-2.8-12.4-8-12.4-15c0-5.8,3.2-7.9,7.9-5 c5.6,3.5,11.5,6.6,17.8,8.9c12.7,4.9,26.2,7.5,39.5,9.7c39,6.4,78.5,9.4,117.9,8.6c16.2-0.3,32.4-1.3,48.6-3 c17.9-1.8,35.8-4.3,53.5-7.9c16.4-3.2,32.8-7.7,46.6-17.3C472.8,720.2,475.1,725,475.1,729.1z')}

            {/* Front left door window */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Front_left_door_window'), opacity: getPartOpacity('Front_left_door_window') }}
                onClick={() => handlePartClick('Front_left_door_window', 'Front left door window')}
                onMouseEnter={() => handlePartMouseEnter('Front_left_door_window', 'Front left door window')}
                onMouseLeave={handlePartMouseLeave}
                d="M242.9,384.6c0,3.2-0.2,6.4-0.2,9.5c0,19.2,0,38.4,0,57.6c0,1.5-0.1,3.4-1.4,4.2c-0.8,0.5-1.7,0.5-2.6,0.5 c-5.9,0-11.7-0.3-17.6-0.3c-7.9,0-15.8,0.1-23.7-0.1c-1-27-1.2-54-0.9-80.9c0.1-12.3,0.4-24.5,0.4-36.8c0.2-7.7,0-15.5-0.1-23.3 c2.2,1.9,4.3,4.1,6.2,6.3c7.9,9.4,14,20.4,21.5,30.1c3.1,4.1,6.5,8,9.6,12.1c3,3.9,6.6,8.1,7.9,12.9 C242.7,379,242.9,381.8,242.9,384.6z"
            />
            {createHitArea('Front_left_door_window', 'Front left door window', 'M242.9,384.6c0,3.2-0.2,6.4-0.2,9.5c0,19.2,0,38.4,0,57.6c0,1.5-0.1,3.4-1.4,4.2c-0.8,0.5-1.7,0.5-2.6,0.5 c-5.9,0-11.7-0.3-17.6-0.3c-7.9,0-15.8,0.1-23.7-0.1c-1-27-1.2-54-0.9-80.9c0.1-12.3,0.4-24.5,0.4-36.8c0.2-7.7,0-15.5-0.1-23.3 c2.2,1.9,4.3,4.1,6.2,6.3c7.9,9.4,14,20.4,21.5,30.1c3.1,4.1,6.5,8,9.6,12.1c3,3.9,6.6,8.1,7.9,12.9 C242.7,379,242.9,381.8,242.9,384.6z')}

            {/* Front left door */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Front_left_door'), opacity: getPartOpacity('Front_left_door') }}
                onClick={() => handlePartClick('Front_left_door', 'Front left door')}
                onMouseEnter={() => handlePartMouseEnter('Front_left_door', 'Front left door')}
                onMouseLeave={handlePartMouseLeave}
                d="M195.1,365.5v58.1c0,0,0,0.4,0,0.9c0,5.3-0.2,10.7-0.3,16c-0.1,2.7-0.1,5.4-0.1,8.1c0,1.3-0.1,2.7-0.1,4.1 c0,1.7,0.2,3.5-1.9,3.7c-6.7,0.6-13.4,0.3-20.1,0.3c-8.8,0-17.6,0-26.4,0.1c-0.1,0-0.3,0-0.3-0.1c-0.1-0.1-0.1-0.2-0.1-0.3 c-0.6-13.2-0.4-26.4-0.2-39.6c0.1-6.6,0.3-13.1,0.3-19.6c0.1-20.1,0.1-40.2,0.2-60.3c0-0.6,0-1.2,0-1.8c0-3.7,0-7.2,0-11 c0-2.6-0.6-6.1,1.2-8.2c1.4-1.7,3.9-1.8,6.1-1.9c13.9-0.1,27.7-0.2,41.6,0c0.1,9,0.1,17.8,0.1,26.8L195.1,365.5z"
            />
            {createHitArea('Front_left_door', 'Front left door', 'M195.1,365.5v58.1c0,0,0,0.4,0,0.9c0,5.3-0.2,10.7-0.3,16c-0.1,2.7-0.1,5.4-0.1,8.1c0,1.3-0.1,2.7-0.1,4.1 c0,1.7,0.2,3.5-1.9,3.7c-6.7,0.6-13.4,0.3-20.1,0.3c-8.8,0-17.6,0-26.4,0.1c-0.1,0-0.3,0-0.3-0.1c-0.1-0.1-0.1-0.2-0.1-0.3 c-0.6-13.2-0.4-26.4-0.2-39.6c0.1-6.6,0.3-13.1,0.3-19.6c0.1-20.1,0.1-40.2,0.2-60.3c0-0.6,0-1.2,0-1.8c0-3.7,0-7.2,0-11 c0-2.6-0.6-6.1,1.2-8.2c1.4-1.7,3.9-1.8,6.1-1.9c13.9-0.1,27.7-0.2,41.6,0c0.1,9,0.1,17.8,0.1,26.8L195.1,365.5z')}

            {/* Front left fender */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Front_left_fender'), opacity: getPartOpacity('Front_left_fender') }}
                onClick={() => handlePartClick('Front_left_fender', 'Front left fender')}
                onMouseEnter={() => handlePartMouseEnter('Front_left_fender', 'Front left fender')}
                onMouseLeave={handlePartMouseLeave}
                d="M243.9,371.7c0,0.1-0.1,0.1-0.1,0.1c0.1-0.1-5.7-6.3-6.2-7c-2-2.5-4-5-5.9-7.5c-3.9-5.1-7.6-10.4-11.5-15.5 c-4.1-5.4-8.2-10.8-12.4-16.1c-1.9-2.3-3.7-4.8-5.7-7c-1.9-2.2-3.7-4.4-6.5-5.5c-0.5-0.2-1-0.5-1.6-0.5c-2.4-0.6-4.9-0.6-7.3-0.6 c-6.2,0-12.4,0.1-18.6,0.1c-5.1,0-13,0.4-16.1-4.6c-1-1.6-1.2-3.5-1.4-5.5c-0.5-4.9-0.9-9.7,0.1-14.6c2.1-10.5,12.8-15,18.5-23.3 c5.7-8.3,9-18.4,9-28.5c0-2.9-0.3-5.7-0.8-8.5c-3.7-19.3-20.2-35.3-39.5-38.5c-2.7-0.5-5.8-1-7-3.4c-0.6-1.2-0.6-2.6-0.4-3.9 c1-14,2-28,3.2-42c0.5-5.6,1-11.3,3.3-16.5c3.8-8.3,12.6-14.2,21.7-14.5c-1,10-1.9,20.1-2.9,30.1c-0.1,1.1-0.2,2.5,0.6,3.3 c0.8,0.8,1.9,1,3,1c22.8,1.7,45.8,3.5,68.5,5.2c-1.6-0.1-7.2,24.4-7.8,26.8c-2.3,9.1-3.6,18.6-5.1,27.8c-3,19.8-5.3,39.9-6.9,59.9 c-1,11.9-1.7,24.2,0.9,36c1.2,5.9,3.5,11.2,6,16.6c2.5,5.3,5.4,10.5,8.6,15.5c6.1,9.8,12.9,19.2,18.6,29.2c1,1.8,2,3.7,2.5,5.7 C245.2,367.9,245.1,370.1,243.9,371.7z"
            />
            {createHitArea('Front_left_fender', 'Front left fender', 'M243.9,371.7c0,0.1-0.1,0.1-0.1,0.1c0.1-0.1-5.7-6.3-6.2-7c-2-2.5-4-5-5.9-7.5c-3.9-5.1-7.6-10.4-11.5-15.5 c-4.1-5.4-8.2-10.8-12.4-16.1c-1.9-2.3-3.7-4.8-5.7-7c-1.9-2.2-3.7-4.4-6.5-5.5c-0.5-0.2-1-0.5-1.6-0.5c-2.4-0.6-4.9-0.6-7.3-0.6 c-6.2,0-12.4,0.1-18.6,0.1c-5.1,0-13,0.4-16.1-4.6c-1-1.6-1.2-3.5-1.4-5.5c-0.5-4.9-0.9-9.7,0.1-14.6c2.1-10.5,12.8-15,18.5-23.3 c5.7-8.3,9-18.4,9-28.5c0-2.9-0.3-5.7-0.8-8.5c-3.7-19.3-20.2-35.3-39.5-38.5c-2.7-0.5-5.8-1-7-3.4c-0.6-1.2-0.6-2.6-0.4-3.9 c1-14,2-28,3.2-42c0.5-5.6,1-11.3,3.3-16.5c3.8-8.3,12.6-14.2,21.7-14.5c-1,10-1.9,20.1-2.9,30.1c-0.1,1.1-0.2,2.5,0.6,3.3 c0.8,0.8,1.9,1,3,1c22.8,1.7,45.8,3.5,68.5,5.2c-1.6-0.1-7.2,24.4-7.8,26.8c-2.3,9.1-3.6,18.6-5.1,27.8c-3,19.8-5.3,39.9-6.9,59.9 c-1,11.9-1.7,24.2,0.9,36c1.2,5.9,3.5,11.2,6,16.6c2.5,5.3,5.4,10.5,8.6,15.5c6.1,9.8,12.9,19.2,18.6,29.2c1,1.8,2,3.7,2.5,5.7 C245.2,367.9,245.1,370.1,243.9,371.7z')}

            {/* Front bumper */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('front_bumper'), opacity: getPartOpacity('front_bumper') }}
                onClick={() => handlePartClick('front_bumper', 'Front bumper')}
                onMouseEnter={() => handlePartMouseEnter('front_bumper', 'Front bumper')}
                onMouseLeave={handlePartMouseLeave}
                d="M305.6,71c16.8-0.1,33.5,0.3,50.2,1.5c19,1.3,37.9,3.1,56.6,6.6c9,1.7,17.9,3.7,26.7,6.3 c8.5,2.5,17.6,5.1,25.3,9.7c6.4,3.8,12.3,9.9,10.1,17.9c-0.3,1-0.8,2.1-1.8,2.7c-1,0.6-2.4,0.3-3.5-0.2c-2.2-1-4.1-2.6-6-3.9 c-3.2-2.4-7.2-3.7-11-5.2c-4.3-1.6-8.6-3-13-4.2c-8.7-2.5-17.5-4.3-26.3-6.1c-16.4-3.2-32.8-5.6-49.5-7.1c-12.1-1-24.2-1.6-36.2-1.9 c-7.2-0.1-14.5-0.1-21.7-0.3c-7.2,0.1-14.5,0.1-21.7,0.3c-12.1,0.3-24.2,0.8-36.2,1.9c-16.6,1.4-33.1,3.7-49.5,7.1 c-8.8,1.8-17.6,3.7-26.3,6.1c-4.3,1.2-8.7,2.6-13,4.2c-3.8,1.4-7.7,2.8-11,5.2c-1.9,1.4-3.7,3-6,3.9c-1.1,0.5-2.4,0.8-3.5,0.2 c-1-0.6-1.4-1.6-1.8-2.7c-2.2-8,3.7-14.1,10.1-17.9c7.7-4.6,16.8-7.2,25.3-9.7c8.8-2.6,17.7-4.6,26.7-6.3 c18.7-3.5,37.7-5.2,56.6-6.6C272.1,71.3,288.8,71,305.6,71z"
            />
            {createHitArea('front_bumper', 'Front bumper', 'M305.6,71c16.8-0.1,33.5,0.3,50.2,1.5c19,1.3,37.9,3.1,56.6,6.6c9,1.7,17.9,3.7,26.7,6.3 c8.5,2.5,17.6,5.1,25.3,9.7c6.4,3.8,12.3,9.9,10.1,17.9c-0.3,1-0.8,2.1-1.8,2.7c-1,0.6-2.4,0.3-3.5-0.2c-2.2-1-4.1-2.6-6-3.9 c-3.2-2.4-7.2-3.7-11-5.2c-4.3-1.6-8.6-3-13-4.2c-8.7-2.5-17.5-4.3-26.3-6.1c-16.4-3.2-32.8-5.6-49.5-7.1c-12.1-1-24.2-1.6-36.2-1.9 c-7.2-0.1-14.5-0.1-21.7-0.3c-7.2,0.1-14.5,0.1-21.7,0.3c-12.1,0.3-24.2,0.8-36.2,1.9c-16.6,1.4-33.1,3.7-49.5,7.1 c-8.8,1.8-17.6,3.7-26.3,6.1c-4.3,1.2-8.7,2.6-13,4.2c-3.8,1.4-7.7,2.8-11,5.2c-1.9,1.4-3.7,3-6,3.9c-1.1,0.5-2.4,0.8-3.5,0.2 c-1-0.6-1.4-1.6-1.8-2.7c-2.2-8,3.7-14.1,10.1-17.9c7.7-4.6,16.8-7.2,25.3-9.7c8.8-2.6,17.7-4.6,26.7-6.3 c18.7-3.5,37.7-5.2,56.6-6.6C272.1,71.3,288.8,71,305.6,71z')}

            {/* Headlight on the left */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Headlight_on_the_left'), opacity: getPartOpacity('Headlight_on_the_left') }}
                onClick={() => handlePartClick('Headlight_on_the_left', 'Headlight on the left')}
                onMouseEnter={() => handlePartMouseEnter('Headlight_on_the_left', 'Headlight on the left')}
                onMouseLeave={handlePartMouseLeave}
                d="M216.2,100.6L216.2,100.6c0.6-0.1,6.4-2.1,6.3-0.9c-0.1,2.2-0.3,4.4-0.6,6.6c-0.2,3.4-0.3,6.8-0.8,10.1 c-0.2,1.8-0.6,3.6-0.6,5.4c-0.1,2.1-0.1,4.5-1,6.4c-1.2,2.6-4,2.2-6.5,2.2c-3,0-6.1,0.3-9.2,1c-2.9,0.6-5.8,1.4-8.8,1.7 c-2.4,0.2-4.8,0.6-7.2,0.8c-0.8,0.1-1.5,0.1-2.3,0.2c-3.8,0.4-7.5,0.9-11.2,1.5c-1.7,0.3-3.5,0.8-5.2,0.8c-1.9,0-3.7-0.3-5.5-0.6 c-0.7-0.1,0.6-8.1,0.7-8.8c0.4-4.6,0.9-9.2,1.9-13.7c0.4-1.7,1.4-2.3,3.1-2.6c3.7-0.6,7.2-1.6,10.9-2.4c3.9-0.8,7.7-1.7,11.5-2.6 c5.4-1.3,10.7-2.7,16.1-3.5C210.9,101.9,213.5,101.4,216.2,100.6z"
            />
            {createHitArea('Headlight_on_the_left', 'Headlight on the left', 'M216.2,100.6L216.2,100.6c0.6-0.1,6.4-2.1,6.3-0.9c-0.1,2.2-0.3,4.4-0.6,6.6c-0.2,3.4-0.3,6.8-0.8,10.1 c-0.2,1.8-0.6,3.6-0.6,5.4c-0.1,2.1-0.1,4.5-1,6.4c-1.2,2.6-4,2.2-6.5,2.2c-3,0-6.1,0.3-9.2,1c-2.9,0.6-5.8,1.4-8.8,1.7 c-2.4,0.2-4.8,0.6-7.2,0.8c-0.8,0.1-1.5,0.1-2.3,0.2c-3.8,0.4-7.5,0.9-11.2,1.5c-1.7,0.3-3.5,0.8-5.2,0.8c-1.9,0-3.7-0.3-5.5-0.6 c-0.7-0.1,0.6-8.1,0.7-8.8c0.4-4.6,0.9-9.2,1.9-13.7c0.4-1.7,1.4-2.3,3.1-2.6c3.7-0.6,7.2-1.6,10.9-2.4c3.9-0.8,7.7-1.7,11.5-2.6 c5.4-1.3,10.7-2.7,16.1-3.5C210.9,101.9,213.5,101.4,216.2,100.6z')}

            {/* Front */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Front'), opacity: getPartOpacity('Front') }}
                onClick={() => handlePartClick('Front', 'Front')}
                onMouseEnter={() => handlePartMouseEnter('Front', 'Front')}
                onMouseLeave={handlePartMouseLeave}
                d="M305.9,92.4c-0.1,0-0.2,0-0.3,0c-22.4-0.3-44.7,0.7-66.9,2.9c-2.9,0.3-6,0.8-7.9,2.9c-1.4,1.6-1.9,3.8-2.3,5.9 c-0.9,5.1-1.4,10.1-1.7,15.3c-0.1,2.6-0.1,5.1-0.1,7.7c0,1.9-0.4,4.1,1,5.7c0.8,0.9,1.8,1.3,2.9,1.7c5.3,2,11,3.3,16.6,4.1 c1.2,0.1,2.3,0.5,3.5,0.7c1.5,0.3,3.3,0.1,5,0.1c3.4,0,6.8,0,10.1,0.1c6.8,0,13.5,0.1,20.3,0.1c11.5,0.1,23,0.1,34.4,0.1 c13.4,0.1,26.8,0.1,40.2-0.7c1.9-0.1,3.8-0.1,5.7-0.4c1.4-0.3,2.9-0.7,4.3-1c3.5-0.8,7.1-1.7,10.5-3c1-0.4,2.1-0.9,2.9-1.7 c1.3-1.6,1-3.7,1-5.7c0-2.6,0-5.1-0.1-7.7c-0.3-5.1-0.8-10.2-1.7-15.3c-0.3-2.1-0.9-4.3-2.3-5.9c-1.9-2.1-5.1-2.6-7.9-2.9 C350.5,93.1,328.2,92,305.9,92.4z"
            />
            {createHitArea('Front', 'Front', 'M305.9,92.4c-0.1,0-0.2,0-0.3,0c-22.4-0.3-44.7,0.7-66.9,2.9c-2.9,0.3-6,0.8-7.9,2.9c-1.4,1.6-1.9,3.8-2.3,5.9 c-0.9,5.1-1.4,10.1-1.7,15.3c-0.1,2.6-0.1,5.1-0.1,7.7c0,1.9-0.4,4.1,1,5.7c0.8,0.9,1.8,1.3,2.9,1.7c5.3,2,11,3.3,16.6,4.1 c1.2,0.1,2.3,0.5,3.5,0.7c1.5,0.3,3.3,0.1,5,0.1c3.4,0,6.8,0,10.1,0.1c6.8,0,13.5,0.1,20.3,0.1c11.5,0.1,23,0.1,34.4,0.1 c13.4,0.1,26.8,0.1,40.2-0.7c1.9-0.1,3.8-0.1,5.7-0.4c1.4-0.3,2.9-0.7,4.3-1c3.5-0.8,7.1-1.7,10.5-3c1-0.4,2.1-0.9,2.9-1.7 c1.3-1.6,1-3.7,1-5.7c0-2.6,0-5.1-0.1-7.7c-0.3-5.1-0.8-10.2-1.7-15.3c-0.3-2.1-0.9-4.3-2.3-5.9c-1.9-2.1-5.1-2.6-7.9-2.9 C350.5,93.1,328.2,92,305.9,92.4z')}

            {/* Headlight on the right */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Headlight_on_the_right'), opacity: getPartOpacity('Headlight_on_the_right') }}
                onClick={() => handlePartClick('Headlight_on_the_right', 'Headlight on the right')}
                onMouseEnter={() => handlePartMouseEnter('Headlight_on_the_right', 'Headlight on the right')}
                onMouseLeave={handlePartMouseLeave}
                d="M395,100.6L395,100.6c-0.6-0.1-6.4-2.1-6.3-0.9c0.1,2.2,0.3,4.4,0.6,6.6c0.2,3.4,0.3,6.8,0.8,10.1 c0.2,1.8,0.6,3.6,0.6,5.4c0.1,2.1,0.1,4.5,1,6.4c1.2,2.6,4,2.2,6.5,2.2c3,0,6.1,0.3,9.2,1c2.9,0.6,5.8,1.4,8.8,1.7 c2.4,0.2,4.8,0.6,7.2,0.8c0.8,0.1,1.5,0.1,2.3,0.2c3.8,0.4,7.5,0.9,11.2,1.5c1.7,0.3,3.5,0.8,5.2,0.8c1.9,0,3.7-0.3,5.5-0.6 c0.7-0.1-0.6-8.1-0.7-8.8c-0.4-4.6-0.9-9.2-1.9-13.7c-0.4-1.7-1.4-2.3-3.1-2.6c-3.7-0.6-7.2-1.6-10.9-2.4c-3.9-0.8-7.7-1.7-11.5-2.6 c-5.4-1.3-10.7-2.7-16.1-3.5C400.4,101.9,397.7,101.4,395,100.6z"
            />
            {createHitArea('Headlight_on_the_right', 'Headlight on the right', 'M395,100.6L395,100.6c-0.6-0.1-6.4-2.1-6.3-0.9c0.1,2.2,0.3,4.4,0.6,6.6c0.2,3.4,0.3,6.8,0.8,10.1 c0.2,1.8,0.6,3.6,0.6,5.4c0.1,2.1,0.1,4.5,1,6.4c1.2,2.6,4,2.2,6.5,2.2c3,0,6.1,0.3,9.2,1c2.9,0.6,5.8,1.4,8.8,1.7 c2.4,0.2,4.8,0.6,7.2,0.8c0.8,0.1,1.5,0.1,2.3,0.2c3.8,0.4,7.5,0.9,11.2,1.5c1.7,0.3,3.5,0.8,5.2,0.8c1.9,0,3.7-0.3,5.5-0.6 c0.7-0.1-0.6-8.1-0.7-8.8c-0.4-4.6-0.9-9.2-1.9-13.7c-0.4-1.7-1.4-2.3-3.1-2.6c-3.7-0.6-7.2-1.6-10.9-2.4c-3.9-0.8-7.7-1.7-11.5-2.6 c-5.4-1.3-10.7-2.7-16.1-3.5C400.4,101.9,397.7,101.4,395,100.6z')}

            {/* Bonnet */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('bonnet'), opacity: getPartOpacity('bonnet') }}
                onClick={() => handlePartClick('bonnet', 'Bonnet')}
                onMouseEnter={() => handlePartMouseEnter('bonnet', 'Bonnet')}
                onMouseLeave={handlePartMouseLeave}
                d="M305.5,143.8c23.6,0,47.3,1.4,70.8,4.5c1.4,0.2,3.6,0.4,4.7,1.7c0.8,1,1,3,1.4,4.3c3.1,10.8,5.9,21.7,8.2,32.8 c2.2,11.1,3.3,22.3,4.8,33.5c2.5,19,3.8,38.1,5.1,57.2c0.3,3.4,0.5,6.8,0.9,10.2c0.3,3-2.5,3-5,2.4c-24.7-6.2-50-9.8-75.4-10.9 c-25.5-1-51.2,0.5-76.5,4.7c-10,1.7-20.5,3.2-30.2,6.3c-1.3,0.4-3.7,1.9-4.5-0.2c-0.2-0.6-0.1-1.1-0.1-1.7c0.3-3.5,0.5-7.2,0.8-10.7 c1.7-25.3,3.6-50.8,7.4-75.9c1.3-9,3-17.9,5.1-26.8c1-4.6,2.3-9.1,3.6-13.5c0.7-2.3,1.3-4.5,2.1-6.7c0.6-1.5,0.9-4.4,2.1-5.5 c0.6-0.6,1.4-0.7,2.1-0.8C257,145.5,281.3,143.9,305.5,143.8z"
            />
            {createHitArea('bonnet', 'Bonnet', 'M305.5,143.8c23.6,0,47.3,1.4,70.8,4.5c1.4,0.2,3.6,0.4,4.7,1.7c0.8,1,1,3,1.4,4.3c3.1,10.8,5.9,21.7,8.2,32.8 c2.2,11.1,3.3,22.3,4.8,33.5c2.5,19,3.8,38.1,5.1,57.2c0.3,3.4,0.5,6.8,0.9,10.2c0.3,3-2.5,3-5,2.4c-24.7-6.2-50-9.8-75.4-10.9 c-25.5-1-51.2,0.5-76.5,4.7c-10,1.7-20.5,3.2-30.2,6.3c-1.3,0.4-3.7,1.9-4.5-0.2c-0.2-0.6-0.1-1.1-0.1-1.7c0.3-3.5,0.5-7.2,0.8-10.7 c1.7-25.3,3.6-50.8,7.4-75.9c1.3-9,3-17.9,5.1-26.8c1-4.6,2.3-9.1,3.6-13.5c0.7-2.3,1.3-4.5,2.1-6.7c0.6-1.5,0.9-4.4,2.1-5.5 c0.6-0.6,1.4-0.7,2.1-0.8C257,145.5,281.3,143.9,305.5,143.8z')}

            {/* Roof */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Roof'), opacity: getPartOpacity('Roof') }}
                onClick={() => handlePartClick('Roof', 'Roof')}
                onMouseEnter={() => handlePartMouseEnter('Roof', 'Roof')}
                onMouseLeave={handlePartMouseLeave}
                d="M366,491.3c0,1.7,0,3.4,0,5.1c0,11.3,0,22.8,0,34.1c0,6.6,2.8,22.1-5.1,25.5c-6.6,2.8-16.1,2.6-23.3,3.2 c-20.6,2-41.5,2-62.1,0.3c-5.7-0.5-11.4-0.4-17.1-1.2c-4-0.6-9.6-0.9-11.9-4.8c-1-1.7-1-3.9-1.1-5.9c-0.8-40.4-1-80.7-0.5-121.2 c0.2-16.5,0.1-32.9,0.4-49.4c0.1-3,0.4-6.4,2.1-9.1c0.8-1.2,2.3-1.9,3.7-2.5c8.5-3,17.2-4.8,25.9-5.9c9.3-1.2,18.7-1.7,28.1-1.9 l0.6,0c9.4,0.1,18.8,0.7,28.1,1.9c8.9,1.1,17.5,2.9,25.9,5.9c1.4,0.5,2.9,1.1,3.7,2.5c1.7,2.7,2,6,2.1,9.1 C366.3,414.9,366.1,453.2,366,491.3z"
            />
            {createHitArea('Roof', 'Roof', 'M366,491.3c0,1.7,0,3.4,0,5.1c0,11.3,0,22.8,0,34.1c0,6.6,2.8,22.1-5.1,25.5c-6.6,2.8-16.1,2.6-23.3,3.2 c-20.6,2-41.5,2-62.1,0.3c-5.7-0.5-11.4-0.4-17.1-1.2c-4-0.6-9.6-0.9-11.9-4.8c-1-1.7-1-3.9-1.1-5.9c-0.8-40.4-1-80.7-0.5-121.2 c0.2-16.5,0.1-32.9,0.4-49.4c0.1-3,0.4-6.4,2.1-9.1c0.8-1.2,2.3-1.9,3.7-2.5c8.5-3,17.2-4.8,25.9-5.9c9.3-1.2,18.7-1.7,28.1-1.9 l0.6,0c9.4,0.1,18.8,0.7,28.1,1.9c8.9,1.1,17.5,2.9,25.9,5.9c1.4,0.5,2.9,1.1,3.7,2.5c1.7,2.7,2,6,2.1,9.1 C366.3,414.9,366.1,453.2,366,491.3z')}

            {/* Rear right door window */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('rear_right_door_window'), opacity: getPartOpacity('rear_right_door_window') }}
                onClick={() => handlePartClick('rear_right_door_window', 'Rear right door window')}
                onMouseEnter={() => handlePartMouseEnter('rear_right_door_window', 'Rear right door window')}
                onMouseLeave={handlePartMouseLeave}
                d="M368.3,546.7c0,0.1,0.1,0.1,0.1,0.2c0.7,2.3,3.1,4.1,4.7,5.9c2.1,2.4,4.1,4.9,6,7.4c5.5,7.4,11.2,14.6,17,21.9 c2.9,3.7,5.8,7.3,8.8,11c1.4,1.8,2.8,3.5,4.2,5.3c1.1,1.4,2.3,3.6,3.8,4.6c0.2,0.1,0.3,0.2,0.6,0.2c0.6,0,0.8-0.8,0.8-1.3 c0.1-5.4-0.1-10.8-0.1-16.2c0-13.4,0-26.9,0-40.3c0-14.7,0-29.5,0-44.1c0-9.7,0-19.4,0-29.1c0-1.8,0.8-5.7-1-6.5 c-0.3-0.1-0.8-0.1-1.1-0.1c-11.2-0.2-22.4-0.8-33.6-0.8c-2.6,0-5,0-7.5,0c-0.6,0-1,0-1.4,0.2c-0.7,0.3-1,1-1.2,1.7 c-0.3,1.6,0.2,3.4,0.2,5.1c0,10.6,0,21.3,0,31.8c0,7.8,0,15.5,0,23.4c0,5.4-0.2,10.9-0.2,16.3C367.9,544.2,368,545.5,368.3,546.7z"
            />
            {createHitArea('rear_right_door_window', 'Rear right door window', 'M368.3,546.7c0,0.1,0.1,0.1,0.1,0.2c0.7,2.3,3.1,4.1,4.7,5.9c2.1,2.4,4.1,4.9,6,7.4c5.5,7.4,11.2,14.6,17,21.9 c2.9,3.7,5.8,7.3,8.8,11c1.4,1.8,2.8,3.5,4.2,5.3c1.1,1.4,2.3,3.6,3.8,4.6c0.2,0.1,0.3,0.2,0.6,0.2c0.6,0,0.8-0.8,0.8-1.3 c0.1-5.4-0.1-10.8-0.1-16.2c0-13.4,0-26.9,0-40.3c0-14.7,0-29.5,0-44.1c0-9.7,0-19.4,0-29.1c0-1.8,0.8-5.7-1-6.5 c-0.3-0.1-0.8-0.1-1.1-0.1c-11.2-0.2-22.4-0.8-33.6-0.8c-2.6,0-5,0-7.5,0c-0.6,0-1,0-1.4,0.2c-0.7,0.3-1,1-1.2,1.7 c-0.3,1.6,0.2,3.4,0.2,5.1c0,10.6,0,21.3,0,31.8c0,7.8,0,15.5,0,23.4c0,5.4-0.2,10.9-0.2,16.3C367.9,544.2,368,545.5,368.3,546.7z')}

            {/* Rear right door */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Rear_right_door'), opacity: getPartOpacity('Rear_right_door') }}
                onClick={() => handlePartClick('Rear_right_door', 'Rear right door')}
                onMouseEnter={() => handlePartMouseEnter('Rear_right_door', 'Rear right door')}
                onMouseLeave={handlePartMouseLeave}
                d="M415.7,563.5c0,10.6,0.2,21.2-0.1,31.7c-0.1,2.3-1.2,7.5,0.8,9.2c0.3,0.3,0.8,0.5,1.2,0.6 c3.5,1,7.8,1.7,11.2-0.2c2.8-1.5,4.2-4.3,5.9-6.9c1.7-2.4,3.7-4.6,5.8-6.7c4.3-4.1,9.3-7.5,14.7-10c2.7-1.2,6.3-2,8.8-3.7 c2.6-1.8,1.2-8.6,1.2-11.4c0-4.1,0.1-8.4,0.1-12.5c0.5-28.8,0.4-57.6,0.4-86.3c0-0.9-0.1-1.8-0.7-2.4c-0.6-0.5-1.3-0.5-2-0.5 c-15.1,0.2-30.2,0.4-45.3,0.6c-0.6,0-1.2,0.1-1.6,0.5c-0.3,0.4-0.3,1-0.3,1.4c0,5.2,0,10.5,0,15.7 C415.7,509.7,415.7,536.6,415.7,563.5z"
            />
            {createHitArea('Rear_right_door', 'Rear right door', 'M415.7,563.5c0,10.6,0.2,21.2-0.1,31.7c-0.1,2.3-1.2,7.5,0.8,9.2c0.3,0.3,0.8,0.5,1.2,0.6 c3.5,1,7.8,1.7,11.2-0.2c2.8-1.5,4.2-4.3,5.9-6.9c1.7-2.4,3.7-4.6,5.8-6.7c4.3-4.1,9.3-7.5,14.7-10c2.7-1.2,6.3-2,8.8-3.7 c2.6-1.8,1.2-8.6,1.2-11.4c0-4.1,0.1-8.4,0.1-12.5c0.5-28.8,0.4-57.6,0.4-86.3c0-0.9-0.1-1.8-0.7-2.4c-0.6-0.5-1.3-0.5-2-0.5 c-15.1,0.2-30.2,0.4-45.3,0.6c-0.6,0-1.2,0.1-1.6,0.5c-0.3,0.4-0.3,1-0.3,1.4c0,5.2,0,10.5,0,15.7 C415.7,509.7,415.7,536.6,415.7,563.5z')}

            {/* Tailgate */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Tailgate'), opacity: getPartOpacity('Tailgate') }}
                onClick={() => handlePartClick('Tailgate', 'Tailgate / tailgate / rear door')}
                onMouseEnter={() => handlePartMouseEnter('Tailgate', 'Tailgate / tailgate / rear door')}
                onMouseLeave={handlePartMouseLeave}
                d="M306.2,705.5c6.6,0,13.2-0.1,19.7-0.3c10-0.3,20-0.8,30-1.6c5-0.4,10.2-0.6,15.2-1.4c7.9-1.2,11.2-11,13.1-17.6 c3-10.6,4.8-21.4,6.2-32.2c0.7-5.5,1.2-10.9,1.7-16.4c0.5-5.2,1.6-10.5,1-15.7c0.2,1.8-48,4.7-52.2,4.9c-19.9,1-39.9,1.2-59.9,0.6 c-8.4-0.3-16.9-1.3-25.3-1.3c-6.3-0.5-12.6-1-19-1.6c-3.2-0.3-6.4-0.7-9.6-1c-1.6-0.2-3.2-0.4-4.8-0.6c-0.6-0.1-3-0.9-3.5-0.6 c-0.4,0.3-0.3,1.7-0.3,2.1c0,1.7,0.3,3.4,0.6,5.1c0.3,2.6,0.6,5.2,0.8,7.9c0.3,5.6,0.8,11.2,1.5,16.8c1.4,11.2,3.6,22.2,6.6,33 c1,3.7,2.1,7.5,4.3,10.7c3.4,5.1,8.3,6.3,14,6.8C266.3,704.6,286.2,705.5,306.2,705.5z"
            />
            {createHitArea('Tailgate', 'Tailgate / tailgate / rear door', 'M306.2,705.5c6.6,0,13.2-0.1,19.7-0.3c10-0.3,20-0.8,30-1.6c5-0.4,10.2-0.6,15.2-1.4c7.9-1.2,11.2-11,13.1-17.6 c3-10.6,4.8-21.4,6.2-32.2c0.7-5.5,1.2-10.9,1.7-16.4c0.5-5.2,1.6-10.5,1-15.7c0.2,1.8-48,4.7-52.2,4.9c-19.9,1-39.9,1.2-59.9,0.6 c-8.4-0.3-16.9-1.3-25.3-1.3c-6.3-0.5-12.6-1-19-1.6c-3.2-0.3-6.4-0.7-9.6-1c-1.6-0.2-3.2-0.4-4.8-0.6c-0.6-0.1-3-0.9-3.5-0.6 c-0.4,0.3-0.3,1.7-0.3,2.1c0,1.7,0.3,3.4,0.6,5.1c0.3,2.6,0.6,5.2,0.8,7.9c0.3,5.6,0.8,11.2,1.5,16.8c1.4,11.2,3.6,22.2,6.6,33 c1,3.7,2.1,7.5,4.3,10.7c3.4,5.1,8.3,6.3,14,6.8C266.3,704.6,286.2,705.5,306.2,705.5z')}

            {/* Rear window */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('rear_window'), opacity: getPartOpacity('rear_window') }}
                onClick={() => handlePartClick('rear_window', 'Rear window')}
                onMouseEnter={() => handlePartMouseEnter('rear_window', 'Rear window')}
                onMouseLeave={handlePartMouseLeave}
                d="M305.5,614.6c-20.8,0.1-41.5-0.4-62.1-3.8c-2.7-0.5-5.4-1-8.1-1.4c-2.6-0.5-5.2-0.8-7.7-1.5 c-2.1-0.7-5.4-2.1-5.4-4.8c0-0.8,0.3-1.4,0.6-2.1c3.7-8.3,8.1-16.1,12.7-23.9c2.5-4.2,5-8.3,7.3-12.7c1.2-2.3,3-4.7,5.5-5.7 c2.8-1.1,5.7-0.5,8.6,0.1c2.8,0.6,5.7,0.8,8.6,1.2c6.6,0.9,13.1,1.6,19.6,2c13.2,0.9,26.4,1,39.5,0.1c3.7-0.2,7.3-0.6,11-0.9 c3.5-0.3,7.2-0.8,10.7-1.2c3.8-0.6,7.6-1.2,11.4-1.7c2.7-0.3,5.5-0.1,7.6,1.5c1,0.9,1.8,2.1,2.5,3.3c5.7,9.9,11.7,19.5,16.9,29.7 c1.5,3,6.6,9.5,3.3,12.8c-1.4,1.4-3.4,1.9-5.3,2.3c-4.5,1-8.9,2-13.4,2.8c-19.8,3.6-40.1,3.7-60.3,3.8 C307.9,614.6,306.7,614.6,305.5,614.6z"
            />
            {createHitArea('rear_window', 'Rear window', 'M305.5,614.6c-20.8,0.1-41.5-0.4-62.1-3.8c-2.7-0.5-5.4-1-8.1-1.4c-2.6-0.5-5.2-0.8-7.7-1.5 c-2.1-0.7-5.4-2.1-5.4-4.8c0-0.8,0.3-1.4,0.6-2.1c3.7-8.3,8.1-16.1,12.7-23.9c2.5-4.2,5-8.3,7.3-12.7c1.2-2.3,3-4.7,5.5-5.7 c2.8-1.1,5.7-0.5,8.6,0.1c2.8,0.6,5.7,0.8,8.6,1.2c6.6,0.9,13.1,1.6,19.6,2c13.2,0.9,26.4,1,39.5,0.1c3.7-0.2,7.3-0.6,11-0.9 c3.5-0.3,7.2-0.8,10.7-1.2c3.8-0.6,7.6-1.2,11.4-1.7c2.7-0.3,5.5-0.1,7.6,1.5c1,0.9,1.8,2.1,2.5,3.3c5.7,9.9,11.7,19.5,16.9,29.7 c1.5,3,6.6,9.5,3.3,12.8c-1.4,1.4-3.4,1.9-5.3,2.3c-4.5,1-8.9,2-13.4,2.8c-19.8,3.6-40.1,3.7-60.3,3.8 C307.9,614.6,306.7,614.6,305.5,614.6z')}

            {/* Left wing mirror */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Left_wing_mirror'), opacity: getPartOpacity('Left_wing_mirror') }}
                onClick={() => handlePartClick('Left_wing_mirror', 'Left wing mirror')}
                onMouseEnter={() => handlePartMouseEnter('Left_wing_mirror', 'Left wing mirror')}
                onMouseLeave={handlePartMouseLeave}
                d="M229.4,339.7c0.3,0.6-12,9.1-13.1,9.8c-3,2.1-6,4.3-9,6.6c-2.9,2.1-5.7,4.2-8.6,6.3c-1.3,1-7.2,6.7-8.5,4.2 c-2-3.7-4-7.2-6-11c-1-1.7,0-2.6,1-3.9c1.2-1.4,2.5-3,3.7-4.3c4.3-5,8.7-10,13.1-15c2.2-2.5,4.3-5,6.5-7.5c1.9-2.2,3.5-4.8,5.8-6.6 c0.5-0.3,0.9-0.8,1.3-1C215.8,317.1,229.4,339.7,229.4,339.7z"
            />
            {createHitArea('Left_wing_mirror', 'Left wing mirror', 'M229.4,339.7c0.3,0.6-12,9.1-13.1,9.8c-3,2.1-6,4.3-9,6.6c-2.9,2.1-5.7,4.2-8.6,6.3c-1.3,1-7.2,6.7-8.5,4.2 c-2-3.7-4-7.2-6-11c-1-1.7,0-2.6,1-3.9c1.2-1.4,2.5-3,3.7-4.3c4.3-5,8.7-10,13.1-15c2.2-2.5,4.3-5,6.5-7.5c1.9-2.2,3.5-4.8,5.8-6.6 c0.5-0.3,0.9-0.8,1.3-1C215.8,317.1,229.4,339.7,229.4,339.7z')}

            {/* Front right door window */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Front_right_door_window'), opacity: getPartOpacity('Front_right_door_window') }}
                onClick={() => handlePartClick('Front_right_door_window', 'Front right door window')}
                onMouseEnter={() => handlePartMouseEnter('Front_right_door_window', 'Front right door window')}
                onMouseLeave={handlePartMouseLeave}
                d="M368.7,384.6c0,3.2,0.2,6.4,0.2,9.5c0,19.2,0,38.4,0,57.6c0,1.5,0.1,3.4,1.4,4.2c0.8,0.5,1.7,0.5,2.6,0.5 c5.9,0,11.7-0.3,17.6-0.3c7.9,0,15.8,0.1,23.7-0.1c1-27,1.2-54,0.9-80.9c-0.1-12.3-0.4-24.5-0.4-36.8c-0.2-7.7,0-15.5,0.1-23.3 c-2.2,1.9-4.3,4.1-6.2,6.3c-7.9,9.4-14,20.4-21.5,30.1c-3.1,4.1-6.5,8-9.6,12.1c-3,3.9-6.6,8.1-7.9,12.9 C368.9,379,368.7,381.8,368.7,384.6z"
            />
            {createHitArea('Front_right_door_window', 'Front right door window', 'M368.7,384.6c0,3.2,0.2,6.4,0.2,9.5c0,19.2,0,38.4,0,57.6c0,1.5,0.1,3.4,1.4,4.2c0.8,0.5,1.7,0.5,2.6,0.5 c5.9,0,11.7-0.3,17.6-0.3c7.9,0,15.8,0.1,23.7-0.1c1-27,1.2-54,0.9-80.9c-0.1-12.3-0.4-24.5-0.4-36.8c-0.2-7.7,0-15.5,0.1-23.3 c-2.2,1.9-4.3,4.1-6.2,6.3c-7.9,9.4-14,20.4-21.5,30.1c-3.1,4.1-6.5,8-9.6,12.1c-3,3.9-6.6,8.1-7.9,12.9 C368.9,379,368.7,381.8,368.7,384.6z')}

            {/* Front right door */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Front_right_door'), opacity: getPartOpacity('Front_right_door') }}
                onClick={() => handlePartClick('Front_right_door', 'Front right door')}
                onMouseEnter={() => handlePartMouseEnter('Front_right_door', 'Front right door')}
                onMouseLeave={handlePartMouseLeave}
                d="M416.5,365.5v58.1c0,0,0,0.4,0,0.9c0,5.3,0.2,10.7,0.3,16c0.1,2.7,0.1,5.4,0.1,8.1c0,1.3,0.1,2.7,0.1,4.1 c0,1.7-0.2,3.5,1.9,3.7c6.7,0.6,13.4,0.3,20.1,0.3c8.8,0,17.6,0,26.4,0.1c0.1,0,0.3,0,0.3-0.1c0.1-0.1,0.1-0.2,0.1-0.3 c0.6-13.2,0.4-26.4,0.2-39.6c-0.1-6.6-0.3-13.1-0.3-19.6c-0.1-20.1-0.1-40.2-0.2-60.3c0-0.6,0-1.2,0-1.8c0-3.7,0-7.2,0-11 c0-2.6,0.6-6.1-1.2-8.2c-1.4-1.7-3.9-1.8-6.1-1.9c-13.9-0.1-27.7-0.2-41.6,0c-0.1,9-0.1,17.8-0.1,26.8L416.5,365.5z"
            />
            {createHitArea('Front_right_door', 'Front right door', 'M416.5,365.5v58.1c0,0,0,0.4,0,0.9c0,5.3,0.2,10.7,0.3,16c0.1,2.7,0.1,5.4,0.1,8.1c0,1.3,0.1,2.7,0.1,4.1 c0,1.7-0.2,3.5,1.9,3.7c6.7,0.6,13.4,0.3,20.1,0.3c8.8,0,17.6,0,26.4,0.1c0.1,0,0.3,0,0.3-0.1c0.1-0.1,0.1-0.2,0.1-0.3 c0.6-13.2,0.4-26.4,0.2-39.6c-0.1-6.6-0.3-13.1-0.3-19.6c-0.1-20.1-0.1-40.2-0.2-60.3c0-0.6,0-1.2,0-1.8c0-3.7,0-7.2,0-11 c0-2.6,0.6-6.1-1.2-8.2c-1.4-1.7-3.9-1.8-6.1-1.9c-13.9-0.1-27.7-0.2-41.6,0c-0.1,9-0.1,17.8-0.1,26.8L416.5,365.5z')}

            {/* Right_hand exterior mirror */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Right_hand_exterior_mirror'), opacity: getPartOpacity('Right_hand_exterior_mirror') }}
                onClick={() => handlePartClick('Right_hand_exterior_mirror', 'Right_hand exterior mirror')}
                onMouseEnter={() => handlePartMouseEnter('Right_hand_exterior_mirror', 'Right_hand exterior mirror')}
                onMouseLeave={handlePartMouseLeave}
                d="M382.2,339.7c-0.3,0.6,12,9.1,13.1,9.8c3,2.1,6,4.3,9,6.6c2.9,2.1,5.7,4.2,8.6,6.3c1.3,1,7.2,6.7,8.5,4.2 c2-3.7,4-7.2,6-11c1-1.7,0-2.6-1-3.9c-1.2-1.4-2.5-3-3.7-4.3c-4.3-5-8.7-10-13.1-15c-2.2-2.5-4.3-5-6.5-7.5 c-1.9-2.2-3.5-4.8-5.8-6.6c-0.5-0.3-0.9-0.8-1.3-1C395.9,317.1,382.2,339.7,382.2,339.7z"
            />
            {createHitArea('Right_hand_exterior_mirror', 'Right_hand exterior mirror', 'M382.2,339.7c-0.3,0.6,12,9.1,13.1,9.8c3,2.1,6,4.3,9,6.6c2.9,2.1,5.7,4.2,8.6,6.3c1.3,1,7.2,6.7,8.5,4.2 c2-3.7,4-7.2,6-11c1-1.7,0-2.6-1-3.9c-1.2-1.4-2.5-3-3.7-4.3c-4.3-5-8.7-10-13.1-15c-2.2-2.5-4.3-5-6.5-7.5 c-1.9-2.2-3.5-4.8-5.8-6.6c-0.5-0.3-0.9-0.8-1.3-1C395.9,317.1,382.2,339.7,382.2,339.7z')}

            {/* Front right fender */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('front_right_fender'), opacity: getPartOpacity('front_right_fender') }}
                onClick={() => handlePartClick('front_right_fender', 'Front right fender')}
                onMouseEnter={() => handlePartMouseEnter('front_right_fender', 'Front right fender')}
                onMouseLeave={handlePartMouseLeave}
                d="M367.3,371.7c0,0.1,0.1,0.1,0.1,0.1c-0.1-0.1,5.7-6.3,6.2-7c2-2.5,4-5,5.9-7.5c3.9-5.1,7.6-10.4,11.5-15.5 c4.1-5.4,8.2-10.8,12.4-16.1c1.9-2.3,3.7-4.8,5.7-7c1.9-2.2,3.7-4.4,6.5-5.5c0.5-0.2,1-0.5,1.6-0.5c2.4-0.6,4.9-0.6,7.3-0.6 c6.2,0,12.4,0.1,18.6,0.1c5.1,0,13,0.4,16.1-4.6c1-1.6,1.2-3.5,1.4-5.5c0.5-4.9,0.9-9.7-0.1-14.6c-2.1-10.5-12.8-15-18.5-23.3 c-5.7-8.3-9-18.4-9-28.5c0-2.9,0.3-5.7,0.8-8.5c3.7-19.3,20.1-35.3,39.5-38.5c2.7-0.5,5.8-1,7-3.4c0.6-1.2,0.6-2.6,0.4-3.9 c-1-14-2-28-3.2-42c-0.5-5.6-1-11.3-3.3-16.5c-3.8-8.3-12.6-14.2-21.7-14.5c1,10,1.9,20.1,2.9,30.1c0.1,1.1,0.2,2.5-0.6,3.3 c-0.8,0.8-1.9,1-3,1c-22.8,1.7-45.8,3.5-68.5,5.2c1.6-0.1,7.2,24.4,7.8,26.8c2.3,9.1,3.6,18.6,5.1,27.8c3,19.8,5.3,39.9,6.9,59.9 c1,11.9,1.7,24.2-0.9,36c-1.2,5.9-3.5,11.2-6,16.6c-2.5,5.3-5.4,10.5-8.6,15.5c-6.1,9.8-12.9,19.2-18.6,29.2c-1,1.8-2,3.7-2.5,5.7 C366,367.9,366.1,370.1,367.3,371.7z"
            />
            {createHitArea('front_right_fender', 'Front right fender', 'M367.3,371.7c0,0.1,0.1,0.1,0.1,0.1c-0.1-0.1,5.7-6.3,6.2-7c2-2.5,4-5,5.9-7.5c3.9-5.1,7.6-10.4,11.5-15.5 c4.1-5.4,8.2-10.8,12.4-16.1c1.9-2.3,3.7-4.8,5.7-7c1.9-2.2,3.7-4.4,6.5-5.5c0.5-0.2,1-0.5,1.6-0.5c2.4-0.6,4.9-0.6,7.3-0.6 c6.2,0,12.4,0.1,18.6,0.1c5.1,0,13,0.4,16.1-4.6c1-1.6,1.2-3.5,1.4-5.5c0.5-4.9,0.9-9.7-0.1-14.6c-2.1-10.5-12.8-15-18.5-23.3 c-5.7-8.3-9-18.4-9-28.5c0-2.9,0.3-5.7,0.8-8.5c3.7-19.3,20.1-35.3,39.5-38.5c2.7-0.5,5.8-1,7-3.4c0.6-1.2,0.6-2.6,0.4-3.9 c-1-14-2-28-3.2-42c-0.5-5.6-1-11.3-3.3-16.5c-3.8-8.3-12.6-14.2-21.7-14.5c1,10,1.9,20.1,2.9,30.1c0.1,1.1,0.2,2.5-0.6,3.3 c-0.8,0.8-1.9,1-3,1c-22.8,1.7-45.8,3.5-68.5,5.2c1.6-0.1,7.2,24.4,7.8,26.8c2.3,9.1,3.6,18.6,5.1,27.8c3,19.8,5.3,39.9,6.9,59.9 c1,11.9,1.7,24.2-0.9,36c-1.2,5.9-3.5,11.2-6,16.6c-2.5,5.3-5.4,10.5-8.6,15.5c-6.1,9.8-12.9,19.2-18.6,29.2c-1,1.8-2,3.7-2.5,5.7 C366,367.9,366.1,370.1,367.3,371.7z')}

            {/* VIN Number */}
            <g>
                <path
                    className="st0 part-path"
                    style={{ fill: getPartColor('vin_number'), opacity: getPartOpacity('vin_number') }}
                    onClick={() => handlePartClick('vin_number', 'VIN Number / Type plate')}
                    onMouseEnter={() => handlePartMouseEnter('vin_number', 'VIN Number / Type plate')}
                    onMouseLeave={handlePartMouseLeave}
                    d="M310.4,278c-0.1,0-0.2,0-0.4,0c-1.3,0.1-2.6,0-3.9,0c-5.2,0-10.4,0.1-15.6,0.3c-3.5,0.1-7,0.3-10.6,0.6 c-8.3,0.6-16.7,1.4-25,2.6c-6.7,0.8-13.4,1.9-20,3.2c0,0,0,0-0.1,0c-1.2,0.2-2.4,0.5-3.5,0.7c-2.3,0.5-4.6,1-6.9,1.6 c-4.1,1-8.9,1.8-12.8,3.6c-1,0.3-2,0.2-2.4-1c-0.2-0.5-0.1-1.1-0.1-1.7c0.3-3.3,0.5-6.7,0.7-10v-0.1c0-0.2,0-0.4,0-0.6 c0.1-1,0.1-2.1,0.2-3.1c0.1-0.4,0.3-0.6,0.7-0.7c0,0,0,0,0.1,0c0.1-0.1,0.3-0.1,0.5-0.2c10.3-3.1,21.3-4.7,31.9-6.3 c5.4-0.9,10.8-1.6,16.2-2.2l8.6-0.9c4.2-0.4,8.4-0.8,12.6-1c8.9-0.6,17.8-0.9,26.8-0.9c1.5,0,2.7,1.2,2.7,2.6 c0.1,3.5,0.3,9.3,0.3,9.9c0,1,0.1,1.9,0.1,2.9C310.5,277.7,310.5,277.9,310.4,278z"
                />
                {createHitArea('vin_number', 'VIN Number / Type plate', 'M310.4,278c-0.1,0-0.2,0-0.4,0c-1.3,0.1-2.6,0-3.9,0c-5.2,0-10.4,0.1-15.6,0.3c-3.5,0.1-7,0.3-10.6,0.6 c-8.3,0.6-16.7,1.4-25,2.6c-6.7,0.8-13.4,1.9-20,3.2c0,0,0,0-0.1,0c-1.2,0.2-2.4,0.5-3.5,0.7c-2.3,0.5-4.6,1-6.9,1.6 c-4.1,1-8.9,1.8-12.8,3.6c-1,0.3-2,0.2-2.4-1c-0.2-0.5-0.1-1.1-0.1-1.7c0.3-3.3,0.5-6.7,0.7-10v-0.1c0-0.2,0-0.4,0-0.6 c0.1-1,0.1-2.1,0.2-3.1c0.1-0.4,0.3-0.6,0.7-0.7c0,0,0,0,0.1,0c0.1-0.1,0.3-0.1,0.5-0.2c10.3-3.1,21.3-4.7,31.9-6.3 c5.4-0.9,10.8-1.6,16.2-2.2l8.6-0.9c4.2-0.4,8.4-0.8,12.6-1c8.9-0.6,17.8-0.9,26.8-0.9c1.5,0,2.7,1.2,2.7,2.6 c0.1,3.5,0.3,9.3,0.3,9.9c0,1,0.1,1.9,0.1,2.9C310.5,277.7,310.5,277.9,310.4,278z')}
            </g>

            {/* Roof frame right */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Roof_frame_right'), opacity: getPartOpacity('Roof_frame_right') }}
                onClick={() => handlePartClick('Roof_frame_right', 'Roof frame right')}
                onMouseEnter={() => handlePartMouseEnter('Roof_frame_right', 'Roof frame right')}
                onMouseLeave={handlePartMouseLeave}
                d="M363.6,490.2c0,1.5,0,3.1,0,4.6c0,10.4,0,20.8,0,31.1c0,5.9,0.2,20.2-0.4,23.2c-0.6,2.6-1.4,2.3-1.9,3 c-1.7,1.8-3.5,1.8-5.2,0.3c-0.5-0.4-1-0.3-1.4-1.2c-0.3-0.6-0.8-0.8-1-4.3c-0.1-1.6-0.1-3.5-0.1-5.4c-0.1-36.8-0.1-73.6-0.1-110.4 c0-15,0-30,0-45c0-2.8,0-5.9,0.2-8.3c0.1-1.2,0.2-1.8,0.3-2.3c0.7-2.8,1.4-4.3,2.1-5.4c0.8-1.1,1.6-1.6,2.3-1.7l0.1,0 c0.8,0.1,1.6,0.6,2.3,1.7c0.8,1,1.4,2.6,2.1,5.4c0.1,0.4,0.2,1,0.3,2.3c0.1,2.4,0.1,5.5,0.2,8.3 C363.7,420.7,363.6,455.4,363.6,490.2z"
            />
            {createHitArea('Roof_frame_right', 'Roof frame right', 'M363.6,490.2c0,1.5,0,3.1,0,4.6c0,10.4,0,20.8,0,31.1c0,5.9,0.2,20.2-0.4,23.2c-0.6,2.6-1.4,2.3-1.9,3 c-1.7,1.8-3.5,1.8-5.2,0.3c-0.5-0.4-1-0.3-1.4-1.2c-0.3-0.6-0.8-0.8-1-4.3c-0.1-1.6-0.1-3.5-0.1-5.4c-0.1-36.8-0.1-73.6-0.1-110.4 c0-15,0-30,0-45c0-2.8,0-5.9,0.2-8.3c0.1-1.2,0.2-1.8,0.3-2.3c0.7-2.8,1.4-4.3,2.1-5.4c0.8-1.1,1.6-1.6,2.3-1.7l0.1,0 c0.8,0.1,1.6,0.6,2.3,1.7c0.8,1,1.4,2.6,2.1,5.4c0.1,0.4,0.2,1,0.3,2.3c0.1,2.4,0.1,5.5,0.2,8.3 C363.7,420.7,363.6,455.4,363.6,490.2z')}

            {/* Dachrahmen links (Roof frame left) */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Dachrahmen_links'), opacity: getPartOpacity('Dachrahmen_links') }}
                onClick={() => handlePartClick('Dachrahmen_links', 'Dachrahmen links')}
                onMouseEnter={() => handlePartMouseEnter('Dachrahmen_links', 'Dachrahmen links')}
                onMouseLeave={handlePartMouseLeave}
                d="M258,490.2c0,1.5,0,3.1,0,4.6c0,10.4,0,20.8,0,31.1c0,5.9,0.2,20.2-0.4,23.2c-0.6,2.6-1.4,2.3-1.9,3 c-1.7,1.8-3.5,1.8-5.2,0.3c-0.5-0.4-1-0.3-1.4-1.2c-0.3-0.6-0.8-0.8-1-4.3c-0.1-1.6-0.1-3.5-0.1-5.4c-0.1-36.8-0.1-73.6-0.1-110.4 c0-15,0-30,0-45c0-2.8,0-5.9,0.2-8.3c0.1-1.2,0.2-1.8,0.3-2.3c0.7-2.8,1.4-4.3,2.1-5.4c0.8-1.1,1.6-1.6,2.3-1.7l0.1,0 c0.8,0.1,1.6,0.6,2.3,1.7c0.8,1,1.4,2.6,2.1,5.4c0.1,0.4,0.2,1,0.3,2.3c0.1,2.4,0.1,5.5,0.2,8.3C258.1,420.7,258,455.4,258,490.2z"
            />
            {createHitArea('Dachrahmen_links', 'Dachrahmen links', 'M258,490.2c0,1.5,0,3.1,0,4.6c0,10.4,0,20.8,0,31.1c0,5.9,0.2,20.2-0.4,23.2c-0.6,2.6-1.4,2.3-1.9,3 c-1.7,1.8-3.5,1.8-5.2,0.3c-0.5-0.4-1-0.3-1.4-1.2c-0.3-0.6-0.8-0.8-1-4.3c-0.1-1.6-0.1-3.5-0.1-5.4c-0.1-36.8-0.1-73.6-0.1-110.4 c0-15,0-30,0-45c0-2.8,0-5.9,0.2-8.3c0.1-1.2,0.2-1.8,0.3-2.3c0.7-2.8,1.4-4.3,2.1-5.4c0.8-1.1,1.6-1.6,2.3-1.7l0.1,0 c0.8,0.1,1.6,0.6,2.3,1.7c0.8,1,1.4,2.6,2.1,5.4c0.1,0.4,0.2,1,0.3,2.3c0.1,2.4,0.1,5.5,0.2,8.3C258.1,420.7,258,455.4,258,490.2z')}

            {/* Fuel cap */}
            <path
                className="st0 part-path"
                style={{ fill: getPartColor('Fuel_cap'), opacity: getPartOpacity('Fuel_cap') }}
                onClick={() => handlePartClick('Fuel_cap', 'Fuel cap')}
                onMouseEnter={() => handlePartMouseEnter('Fuel_cap', 'Fuel cap')}
                onMouseLeave={handlePartMouseLeave}
                d="M421.9,654.5h-15.4c-1.4,0-2.6-1.2-2.6-2.6v-19.8c0-1.4,1.2-2.6,2.6-2.6h15.4c1.4,0,2.6,1.2,2.6,2.6v19.8 C424.5,653.4,423.3,654.5,421.9,654.5z"
            />
            {createHitArea('Fuel_cap', 'Fuel cap', 'M421.9,654.5h-15.4c-1.4,0-2.6-1.2-2.6-2.6v-19.8c0-1.4,1.2-2.6,2.6-2.6h15.4c1.4,0,2.6,1.2,2.6,2.6v19.8 C424.5,653.4,423.3,654.5,421.9,654.5z')}

            {/* EV charging cover */}
            <path
                className="st8 part-path"
                style={{ fill: getPartColor('EV_charging_cover'), opacity: getPartOpacity('EV_charging_cover') }}
                onClick={() => handlePartClick('EV_charging_cover', 'EV charging cover')}
                onMouseEnter={() => handlePartMouseEnter('EV_charging_cover', 'EV charging cover')}
                onMouseLeave={handlePartMouseLeave}
                d="M436.2,294.9H420c-2.2,0-4-1.8-4-4v-16.1c0-2.2,1.8-4,4-4h16.3c2.2,0,4,1.8,4,4v16.1 C440.3,293.1,438.4,294.9,436.2,294.9z"
            />
            {createHitArea('EV_charging_cover', 'EV charging cover', 'M436.2,294.9H420c-2.2,0-4-1.8-4-4v-16.1c0-2.2,1.8-4,4-4h16.3c2.2,0,4,1.8,4,4v16.1 C440.3,293.1,438.4,294.9,436.2,294.9z')}
        </svg>
    );

    const canvasSize = Math.max(zoom, 1) * 100;
    const carSizeRatio = zoom / Math.max(zoom, 1);
    const carWidthPercent = carSizeRatio * baseWidth;
    const carHeightPercent = carSizeRatio * baseHeight;

    return (
        <div className="w-full h-full min-h-[240px] relative overflow-hidden">
            {showControls && (
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        adjustZoom(ZOOM_STEP);
                    }}
                    disabled={zoom >= ZOOM_MAX}
                    title={t('carOverlay.zoomIn', { defaultValue: 'Zoom in' })}
                    className="p-1.5 rounded-lg bg-[var(--color-bg-card)]/90 backdrop-blur-sm border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-orange)] hover:border-[var(--color-primary-orange)]/50 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[var(--color-text-secondary)] disabled:hover:border-[var(--color-border-primary)] cursor-pointer"
                >
                    <ZoomIn size={16} />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        adjustZoom(-ZOOM_STEP);
                    }}
                    disabled={zoom <= ZOOM_MIN}
                    title={t('carOverlay.zoomOut', { defaultValue: 'Zoom out' })}
                    className="p-1.5 rounded-lg bg-[var(--color-bg-card)]/90 backdrop-blur-sm border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-orange)] hover:border-[var(--color-primary-orange)]/50 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[var(--color-text-secondary)] disabled:hover:border-[var(--color-border-primary)] cursor-pointer"
                >
                    <ZoomOut size={16} />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        adjustRotation(ROTATE_STEP);
                    }}
                    title={t('carOverlay.rotateCw', { defaultValue: 'Rotate right' })}
                    className="p-1.5 rounded-lg bg-[var(--color-bg-card)]/90 backdrop-blur-sm border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-orange)] hover:border-[var(--color-primary-orange)]/50 shadow-sm transition-colors cursor-pointer"
                >
                    <RotateCw size={16} />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        adjustRotation(-ROTATE_STEP);
                    }}
                    title={t('carOverlay.rotateCcw', { defaultValue: 'Rotate left' })}
                    className="p-1.5 rounded-lg bg-[var(--color-bg-card)]/90 backdrop-blur-sm border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary-orange)] hover:border-[var(--color-primary-orange)]/50 shadow-sm transition-colors cursor-pointer"
                >
                    <RotateCcw size={16} />
                </button>
            </div>
            )}
            <div
                ref={scrollContainerRef}
                onPointerDown={zoom > 1 ? handlePointerDown : undefined}
                onPointerMove={zoom > 1 ? handlePointerMove : undefined}
                onPointerUp={zoom > 1 ? handlePointerUp : undefined}
                onPointerCancel={zoom > 1 ? handlePointerUp : undefined}
                className={`absolute inset-0 bg-[var(--color-bg-primary)] rounded-lg border-[var(--color-border-primary)] ${zoom > 1 ? 'overflow-auto custom-scrollbar' : 'overflow-hidden'} ${readOnly ? 'p-0 border-0' : 'border-2'} ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            >
                <div
                    ref={containerRef}
                    className="flex items-center justify-center p-2 box-border"
                    style={{
                        userSelect: 'none',
                        width: `${canvasSize}%`,
                        height: `${canvasSize}%`,
                        minWidth: '100%',
                        minHeight: '100%',
                    }}
                >
                    <div
                        style={{
                            ...props.svgContainerStyle,
                            width: `${carWidthPercent}%`,
                            height: `${carHeightPercent}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center center',
                            transition: isDragging ? 'none' : 'transform 0.2s ease',
                        }}
                    >
                        {renderCarView()}
                    </div>
                </div>
            </div>

            {/* Fixed Position Tooltip - outside container so it stays on top when scrolling */}
            {hoveredPart && (
                <div
                    className="fixed z-[100] px-3 py-1.5 bg-gray-900 backdrop-blur-md text-white text-xs font-medium rounded-lg shadow-lg border border-gray-700 pointer-events-none whitespace-nowrap"
                    style={{
                        left: hoveredPart.x,
                        top: hoveredPart.y,
                        transform: 'translateX(-50%)'
                    }}
                >
                    {hoveredPart.name}
                </div>
            )}

            {selectedParts.length > 0 && !props.hideSelectedList && (
                <div className="mt-4 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-primary)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">{t('carOverlay.selectedPartsTitle', { defaultValue: 'Selected Parts' })}</h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedParts.map((partId) => (
                            <div key={partId} className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full">
                                <span className="text-xs font-medium">{t(`carParts.${partId}`, { defaultValue: partId })}</span>
                                {savedScreenshots[partId] && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewScreenshot(savedScreenshots[partId]);
                                        }}
                                        className="hover:text-red-600 transition-colors"
                                        title={t('common.viewScreenshot')}
                                    >
                                        <Eye size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
