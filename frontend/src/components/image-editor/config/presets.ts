export type ShapeType =
    | 'rect'
    | 'rounded_rect'
    | 'circle'
    | 'ellipse'
    | 'line'
    | 'vert_line'
    | 'arrow_line'
    | 'triangle'
    | 'star'
    | 'diamond'
    | 'cross'
    | 'double_arrow'
    | 'callout'
    | 'hexagon'
    | 'dashed_rect'
    | 'dashed_circle'
    | 'dashed_line'
    | 'marker_pin';

export interface ShapePreset {
    id: string;
    type: ShapeType;
    label: string;
    labelKey?: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    rx?: number;
    ry?: number;
    strokeDashArray?: number[];
    category?: 'basic' | 'lines' | 'symbols';
}

export interface StickerPreset {
    id: string;
    name: string;
    color: string;
    fillColor: string;
    strokeColor: string;
    label: string;
}

export const ARROW_STICKERS: StickerPreset[] = [
    { id: 'arrow-yellow', name: 'Gelb', color: '#FACC15', fillColor: '#FACC15', strokeColor: '#CA8A04', label: 'Gelb' },
    { id: 'arrow-red', name: 'Rot', color: '#EF4444', fillColor: '#EF4444', strokeColor: '#B91C1C', label: 'Rot' },
    { id: 'arrow-white', name: 'Weiß', color: '#FFFFFF', fillColor: '#FFFFFF', strokeColor: '#9CA3AF', label: 'Weiß' },
    { id: 'arrow-black', name: 'Schwarz', color: '#18181B', fillColor: '#18181B', strokeColor: '#000000', label: 'Schwarz' },
];

export const SHAPE_COLORS = [
    { id: 'yellow', label: 'Gelb', hex: '#FACC15' },
    { id: 'red', label: 'Rot', hex: '#EF4444' },
    { id: 'orange', label: 'Orange', hex: '#F97316' },
    { id: 'green', label: 'Grün', hex: '#22C55E' },
    { id: 'blue', label: 'Blau', hex: '#3B82F6' },
    { id: 'white', label: 'Weiß', hex: '#FFFFFF' },
    { id: 'black', label: 'Schwarz', hex: '#18181B' },
    { id: 'purple', label: 'Lila', hex: '#A855F7' },
];

export const STROKE_WIDTH_OPTIONS = [1, 2, 3, 4, 6, 8, 10];

export const SHAPE_PRESETS: ShapePreset[] = [
    // Standard / Basic Shapes
    { id: 'rect-filled', type: 'rect', label: 'Rechteck gefüllt', labelKey: 'imageEditor.shapes.rectFilled', fill: '#FACC15', stroke: '#000000', strokeWidth: 0, category: 'basic' },
    { id: 'rect-outline', type: 'rect', label: 'Rechteck Kontur', labelKey: 'imageEditor.shapes.rectOutline', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, category: 'basic' },
    { id: 'rounded-rect-filled', type: 'rounded_rect', label: 'Abgerundetes Rechteck', labelKey: 'imageEditor.shapes.roundedRectFilled', fill: '#FACC15', stroke: '#000000', strokeWidth: 0, rx: 15, ry: 15, category: 'basic' },
    { id: 'rounded-rect-outline', type: 'rounded_rect', label: 'Abgerundetes Rechteck Kontur', labelKey: 'imageEditor.shapes.roundedRectOutline', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, rx: 15, ry: 15, category: 'basic' },
    { id: 'circle-filled', type: 'circle', label: 'Kreis gefüllt', labelKey: 'imageEditor.shapes.circleFilled', fill: '#FACC15', stroke: '#000000', strokeWidth: 0, category: 'basic' },
    { id: 'circle-outline', type: 'circle', label: 'Kreis Kontur', labelKey: 'imageEditor.shapes.circleOutline', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, category: 'basic' },
    { id: 'ellipse-filled', type: 'ellipse', label: 'Ellipse gefüllt', labelKey: 'imageEditor.shapes.ellipseFilled', fill: '#FACC15', stroke: '#000000', strokeWidth: 0, category: 'basic' },
    { id: 'ellipse-outline', type: 'ellipse', label: 'Ellipse Kontur', labelKey: 'imageEditor.shapes.ellipseOutline', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, category: 'basic' },
    { id: 'triangle-filled', type: 'triangle', label: 'Dreieck gefüllt', labelKey: 'imageEditor.shapes.triangleFilled', fill: '#FACC15', stroke: '#000000', strokeWidth: 0, category: 'basic' },
    { id: 'triangle-outline', type: 'triangle', label: 'Dreieck Kontur', labelKey: 'imageEditor.shapes.triangleOutline', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, category: 'basic' },

    // Lines & Arrows
    { id: 'line', type: 'line', label: 'Horizontale Linie', labelKey: 'imageEditor.shapes.line', fill: 'transparent', stroke: '#FACC15', strokeWidth: 5, category: 'lines' },
    { id: 'vert-line', type: 'vert_line', label: 'Vertikale Linie', labelKey: 'imageEditor.shapes.vertLine', fill: 'transparent', stroke: '#FACC15', strokeWidth: 5, category: 'lines' },
    { id: 'arrow-line', type: 'arrow_line', label: 'Pfeil', labelKey: 'imageEditor.shapes.arrowLine', fill: '#FACC15', stroke: '#FACC15', strokeWidth: 4, category: 'lines' },
    { id: 'double-arrow', type: 'double_arrow', label: 'Doppelpfeil / Maßlinie', labelKey: 'imageEditor.shapes.doubleArrow', fill: '#FACC15', stroke: '#FACC15', strokeWidth: 2, category: 'lines' },
    { id: 'dashed-rect', type: 'dashed_rect', label: 'Gestricheltes Rechteck', labelKey: 'imageEditor.shapes.dashedRect', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, strokeDashArray: [8, 6], category: 'lines' },
    { id: 'dashed-circle', type: 'dashed_circle', label: 'Gestrichelter Kreis', labelKey: 'imageEditor.shapes.dashedCircle', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, strokeDashArray: [8, 6], category: 'lines' },
    { id: 'dashed-line', type: 'dashed_line', label: 'Gestrichelte Linie', labelKey: 'imageEditor.shapes.dashedLine', fill: 'transparent', stroke: '#FACC15', strokeWidth: 5, strokeDashArray: [8, 6], category: 'lines' },

    // Symbols & Damage Markers
    { id: 'marker-pin', type: 'marker_pin', label: 'Schadens-Pin', labelKey: 'imageEditor.shapes.markerPin', fill: '#EF4444', stroke: '#B91C1C', strokeWidth: 2, category: 'symbols' },
    { id: 'cross', type: 'cross', label: 'Schadenskreuz / Plus', labelKey: 'imageEditor.shapes.cross', fill: '#EF4444', stroke: '#B91C1C', strokeWidth: 2, category: 'symbols' },
    { id: 'star-filled', type: 'star', label: 'Stern gefüllt', labelKey: 'imageEditor.shapes.starFilled', fill: '#FACC15', stroke: '#CA8A04', strokeWidth: 1.5, category: 'symbols' },
    { id: 'star-outline', type: 'star', label: 'Stern Kontur', labelKey: 'imageEditor.shapes.starOutline', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, category: 'symbols' },
    { id: 'diamond-filled', type: 'diamond', label: 'Raute gefüllt', labelKey: 'imageEditor.shapes.diamondFilled', fill: '#FACC15', stroke: '#CA8A04', strokeWidth: 1.5, category: 'symbols' },
    { id: 'diamond-outline', type: 'diamond', label: 'Raute Kontur', labelKey: 'imageEditor.shapes.diamondOutline', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, category: 'symbols' },
    { id: 'hexagon-filled', type: 'hexagon', label: 'Sechseck gefüllt', labelKey: 'imageEditor.shapes.hexagonFilled', fill: '#FACC15', stroke: '#CA8A04', strokeWidth: 1.5, category: 'symbols' },
    { id: 'hexagon-outline', type: 'hexagon', label: 'Sechseck Kontur', labelKey: 'imageEditor.shapes.hexagonOutline', fill: 'transparent', stroke: '#FACC15', strokeWidth: 4, category: 'symbols' },
    { id: 'callout', type: 'callout', label: 'Hinweis / Sprechblase', labelKey: 'imageEditor.shapes.callout', fill: '#FACC15', stroke: '#CA8A04', strokeWidth: 2, category: 'symbols' },
];

export interface SubFilterPreset {
    id: string;
    label: string;
    previewGradient?: string;
}

export interface FilterCategory {
    id: string;
    label: string;
    coverGradient: string;
    subFilters: SubFilterPreset[];
}

export const FILTER_CATEGORIES: FilterCategory[] = [
    {
        id: 'none',
        label: 'Kein Filter',
        coverGradient: 'from-slate-700 via-slate-800 to-slate-900',
        subFilters: [
            { id: 'none', label: 'Original' },
        ],
    },
    {
        id: 'duotone',
        label: 'DuoTone',
        coverGradient: 'from-purple-700 via-amber-600 to-yellow-500',
        subFilters: [
            { id: 'duotone_purple_yellow', label: 'Violett-Gelb', previewGradient: 'from-purple-600 via-pink-500 to-yellow-400' },
            { id: 'duotone_blue_red', label: 'Blau-Rot', previewGradient: 'from-blue-700 via-purple-600 to-red-500' },
            { id: 'duotone_magenta_cyan', label: 'Magenta-Cyan', previewGradient: 'from-fuchsia-600 via-teal-500 to-cyan-400' },
            { id: 'duotone_dark_gold', label: 'Dunkelgold', previewGradient: 'from-yellow-700 via-amber-800 to-stone-900' },
        ],
    },
    {
        id: 'bw',
        label: 'Schwarz & Weiß',
        coverGradient: 'from-gray-900 via-gray-600 to-gray-400',
        subFilters: [
            { id: 'bw_grayscale', label: 'Graustufen', previewGradient: 'from-gray-800 to-gray-400' },
            { id: 'bw_high_contrast', label: 'Hoher Kontrast S/W', previewGradient: 'from-black to-white' },
            { id: 'bw_noir', label: 'Film Noir', previewGradient: 'from-gray-950 via-slate-800 to-gray-500' },
            { id: 'bw_sepia_mono', label: 'Sepia Mono', previewGradient: 'from-stone-900 via-amber-900 to-amber-200' },
            { id: 'bw_silvertone', label: 'Silberton', previewGradient: 'from-slate-800 via-zinc-500 to-slate-200' },
        ],
    },
    {
        id: 'vintage',
        label: 'Vintage',
        coverGradient: 'from-rose-600 via-amber-600 to-orange-500',
        subFilters: [
            { id: 'vintage_polaroid', label: 'Polaroid', previewGradient: 'from-amber-700 via-orange-600 to-yellow-500' },
            { id: 'vintage_sunny70s', label: 'Sonnige 70er', previewGradient: 'from-yellow-500 via-amber-600 to-orange-600' },
            { id: 'vintage_oldtimer', label: 'Oldtimer', previewGradient: 'from-amber-800 via-stone-700 to-yellow-700' },
            { id: 'vintage_inferno', label: 'Inferno', previewGradient: 'from-red-700 via-orange-600 to-yellow-500' },
            { id: 'vintage_snappy', label: 'Snappy', previewGradient: 'from-orange-600 via-pink-600 to-amber-400' },
        ],
    },
    {
        id: 'smooth',
        label: 'Sanft & Weich',
        coverGradient: 'from-emerald-700 via-teal-800 to-slate-900',
        subFilters: [
            { id: 'smooth_soft', label: 'Soft-Fokus', previewGradient: 'from-teal-600 via-emerald-500 to-teal-300' },
            { id: 'smooth_glamour', label: 'Glamour', previewGradient: 'from-pink-500 via-purple-600 to-indigo-500' },
            { id: 'smooth_matte', label: 'Matt', previewGradient: 'from-slate-600 via-zinc-600 to-stone-400' },
            { id: 'smooth_faded', label: 'Ausgebleicht', previewGradient: 'from-stone-700 via-slate-600 to-slate-400' },
        ],
    },
    {
        id: 'cold',
        label: 'Kalt',
        coverGradient: 'from-sky-700 via-blue-900 to-indigo-950',
        subFilters: [
            { id: 'cold_ice', label: 'Eiskalt', previewGradient: 'from-sky-400 via-blue-600 to-indigo-800' },
            { id: 'cold_cyan', label: 'Cyan-Tönung', previewGradient: 'from-cyan-400 via-teal-600 to-blue-800' },
            { id: 'cold_deep_blue', label: 'Tiefblau', previewGradient: 'from-blue-900 via-slate-900 to-indigo-950' },
            { id: 'cold_nordic', label: 'Nordisch', previewGradient: 'from-slate-700 via-sky-800 to-blue-900' },
        ],
    },
    {
        id: 'warm',
        label: 'Warm',
        coverGradient: 'from-amber-700 via-orange-800 to-yellow-900',
        subFilters: [
            { id: 'warm_sunset', label: 'Sonnenuntergang', previewGradient: 'from-orange-600 via-amber-700 to-yellow-500' },
            { id: 'warm_amber', label: 'Bernstein-Wärme', previewGradient: 'from-amber-600 via-orange-700 to-yellow-700' },
            { id: 'warm_golden', label: 'Goldene Stunde', previewGradient: 'from-yellow-500 via-amber-500 to-orange-600' },
            { id: 'warm_summer', label: 'Warmer Sommer', previewGradient: 'from-rose-500 via-orange-500 to-amber-400' },
        ],
    },
    {
        id: 'legacy',
        label: 'Klassik & Effekt',
        coverGradient: 'from-stone-800 via-neutral-900 to-stone-950',
        subFilters: [
            { id: 'legacy_invert', label: 'Invertieren', previewGradient: 'from-violet-600 via-purple-700 to-fuchsia-500' },
            { id: 'legacy_technicolor', label: 'Technicolor', previewGradient: 'from-red-600 via-yellow-500 to-green-500' },
            { id: 'legacy_kodachrome', label: 'Kodachrome', previewGradient: 'from-amber-700 via-rose-700 to-orange-600' },
            { id: 'legacy_techno', label: 'Techno', previewGradient: 'from-emerald-500 via-teal-600 to-cyan-500' },
        ],
    },
];

export const FILTER_PRESETS = [
    { id: 'none', label: 'Original' },
    { id: 'grayscale', label: 'Schwarz-Weiß' },
    { id: 'sepia', label: 'Sepia' },
    { id: 'invert', label: 'Invertieren' },
    { id: 'brightness_high', label: 'Hell' },
    { id: 'contrast_high', label: 'Kontrastreich' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'cold', label: 'Kalt' },
];
