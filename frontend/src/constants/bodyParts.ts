export interface BodyPartDefinition {
    id: string;
    labelDe: string;
    labelEn: string;
    side: 'left' | 'right' | 'center' | 'front' | 'rear';
    svgX: number;
    svgY: number;
    svgWidth: number;
    svgHeight: number;
}

export const BODY_PARTS: BodyPartDefinition[] = [
    // Front
    { id: 'bumper_front', labelDe: 'Stoßfänger vorne', labelEn: 'Front bumper', side: 'front', svgX: 120, svgY: 10, svgWidth: 160, svgHeight: 40 },
    { id: 'hood', labelDe: 'Motorhaube', labelEn: 'Hood/Bonnet', side: 'center', svgX: 120, svgY: 50, svgWidth: 160, svgHeight: 80 },
    { id: 'windshield', labelDe: 'Frontscheibe', labelEn: 'Windshield', side: 'center', svgX: 140, svgY: 130, svgWidth: 120, svgHeight: 30 },

    // Left side
    { id: 'fender_front_left', labelDe: 'Kotflügel vorne links', labelEn: 'Left front fender', side: 'left', svgX: 40, svgY: 60, svgWidth: 80, svgHeight: 60 },
    { id: 'door_front_left', labelDe: 'Tür vorne links', labelEn: 'Left front door', side: 'left', svgX: 40, svgY: 160, svgWidth: 80, svgHeight: 80 },
    { id: 'door_rear_left', labelDe: 'Tür hinten links', labelEn: 'Left rear door', side: 'left', svgX: 40, svgY: 240, svgWidth: 80, svgHeight: 80 },
    { id: 'quarter_panel_left', labelDe: 'Seitenteil hinten links', labelEn: 'Left rear quarter panel', side: 'left', svgX: 40, svgY: 320, svgWidth: 80, svgHeight: 60 },
    { id: 'sill_left', labelDe: 'Schweller links', labelEn: 'Left sill/rocker panel', side: 'left', svgX: 20, svgY: 160, svgWidth: 20, svgHeight: 220 },
    { id: 'roof_frame_left', labelDe: 'Dachrahmen links', labelEn: 'Left roof frame', side: 'left', svgX: 110, svgY: 160, svgWidth: 10, svgHeight: 220 },

    // Right side
    { id: 'fender_front_right', labelDe: 'Kotflügel vorne rechts', labelEn: 'Right front fender', side: 'right', svgX: 280, svgY: 60, svgWidth: 80, svgHeight: 60 },
    { id: 'door_front_right', labelDe: 'Tür vorne rechts', labelEn: 'Right front door', side: 'right', svgX: 280, svgY: 160, svgWidth: 80, svgHeight: 80 },
    { id: 'door_rear_right', labelDe: 'Tür hinten rechts', labelEn: 'Right rear door', side: 'right', svgX: 280, svgY: 240, svgWidth: 80, svgHeight: 80 },
    { id: 'quarter_panel_right', labelDe: 'Seitenteil hinten rechts', labelEn: 'Right rear quarter panel', side: 'right', svgX: 280, svgY: 320, svgWidth: 80, svgHeight: 60 },
    { id: 'sill_right', labelDe: 'Schweller rechts', labelEn: 'Right sill/rocker panel', side: 'right', svgX: 360, svgY: 160, svgWidth: 20, svgHeight: 220 },
    { id: 'roof_frame_right', labelDe: 'Dachrahmen rechts', labelEn: 'Right roof frame', side: 'right', svgX: 280, svgY: 160, svgWidth: 10, svgHeight: 220 },

    // Mirrors
    { id: 'mirror_left', labelDe: 'Außenspiegel links', labelEn: 'Left wing mirror', side: 'left', svgX: 130, svgY: 130, svgWidth: 20, svgHeight: 20 },
    { id: 'mirror_right', labelDe: 'Außenspiegel rechts', labelEn: 'Right wing mirror', side: 'right', svgX: 250, svgY: 130, svgWidth: 20, svgHeight: 20 },

    // Top center
    { id: 'roof', labelDe: 'Dach', labelEn: 'Roof', side: 'center', svgX: 120, svgY: 160, svgWidth: 160, svgHeight: 220 },

    // Rear
    { id: 'tailgate', labelDe: 'Heckklappe', labelEn: 'Tailgate/Rear hatch', side: 'rear', svgX: 120, svgY: 390, svgWidth: 160, svgHeight: 60 },
    { id: 'bumper_rear', labelDe: 'Stoßfänger hinten', labelEn: 'Rear bumper', side: 'rear', svgX: 120, svgY: 450, svgWidth: 160, svgHeight: 40 },

    // Lights
    { id: 'headlight_left', labelDe: 'Scheinwerfer links', labelEn: 'Left headlight', side: 'left', svgX: 80, svgY: 30, svgWidth: 40, svgHeight: 20 },
    { id: 'headlight_right', labelDe: 'Scheinwerfer rechts', labelEn: 'Right headlight', side: 'right', svgX: 320, svgY: 30, svgWidth: 40, svgHeight: 20 },
    { id: 'rear_light_left', labelDe: 'Heckleuchte links', labelEn: 'Left rear light', side: 'left', svgX: 80, svgY: 430, svgWidth: 40, svgHeight: 20 },
    { id: 'rear_light_right', labelDe: 'Heckleuchte rechts', labelEn: 'Right rear light', side: 'right', svgX: 320, svgY: 430, svgWidth: 40, svgHeight: 20 },

];

export interface InteriorPartDefinition {
    id: string;
    labelDe: string;
    labelEn: string;
}

export const INTERIOR_PARTS: InteriorPartDefinition[] = [
    { id: 'dashboard', labelDe: 'Armaturenbrett', labelEn: 'Dashboard' },
    { id: 'steering_wheel', labelDe: 'Lenkrad', labelEn: 'Steering Wheel' },
    { id: 'seat_driver', labelDe: 'Fahrersitz', labelEn: 'Driver Seat' },
    { id: 'seat_passenger', labelDe: 'Beifahrersitz', labelEn: 'Passenger Seat' },
    { id: 'center_console', labelDe: 'Mittelkonsole', labelEn: 'Center Console' },
    { id: 'door_panel_fl', labelDe: 'Türverkleidung vorne links', labelEn: 'Door Panel FL' },
    { id: 'roof_lining', labelDe: 'Dachhimmel', labelEn: 'Roof Lining' },
    { id: 'trunk_lining', labelDe: 'Kofferraumverkleidung', labelEn: 'Trunk Lining' },
    { id: 'einstieg_vorne_links', labelDe: 'Einstieg vorne links', labelEn: 'Front Left Entry Sill' },
    { id: 'einstieg_vorne_rechts', labelDe: 'Einstieg vorne rechts', labelEn: 'Front Right Entry Sill' },
    { id: 'einstieg_hinten_links', labelDe: 'Einstieg hinten links', labelEn: 'Rear Left Entry Sill' },
    { id: 'einstieg_hinten_rechts', labelDe: 'Einstieg hinten rechts', labelEn: 'Rear Right Entry Sill' },
];

const DYNAMIC_PARTS_LOCALIZATION: Record<string, { de: string; en: string }> = {
    pos_hood: { de: 'Motorhaube', en: 'Hood' },
    pos_door: { de: 'Tür', en: 'Door' },
    pos_fender: { de: 'Kotflügel', en: 'Fender' },
    pos_bumper: { de: 'Stoßfänger', en: 'Bumper' },
    pos_roof: { de: 'Dach', en: 'Roof' }
};

export function getBodyPartLabel(id: string, lang: 'de' | 'en' = 'de'): string {
    if (!id) return '';
    
    // Normalize ID: lowercase, replace spaces/dashes with underscores
    let normId = id.trim().toLowerCase().replace(/[\s-]+/g, '_');

    // Synonym mappings (e.g. lf -> fl, rf -> fr, lr -> rl, rr -> rr, and generic names)
    const synonymMap: Record<string, string> = {
        'door_panel_lf': 'door_panel_fl',
        'door_panel_vl': 'door_panel_fl',
        'door_panel_rf': 'door_panel_fr',
        'door_panel_vr': 'door_panel_fr',
        'door_panel_lr': 'door_panel_rl',
        'door_panel_hl': 'door_panel_rl',
        'door_panel_rr': 'door_panel_rr',
        'door_panel_hr': 'door_panel_rr',
        'steeringwheel': 'steering_wheel',
        'steering_wheel_label': 'steering_wheel',
        'dashboard_label': 'dashboard',
        'front_bumper': 'bumper_front',
        'rear_bumper': 'bumper_rear',
        'bonnet': 'hood',
        'trunk': 'tailgate',
        'front_left_fender': 'fender_front_left',
        'front_right_fender': 'fender_front_right',
        'rear_left_fender': 'quarter_panel_left',
        'rear_right_fender': 'quarter_panel_right',
        'left_front_door': 'door_front_left',
        'right_front_door': 'door_front_right',
        'left_rear_door': 'door_rear_left',
        'right_rear_door': 'door_rear_right',
        'left_sill': 'sill_left',
        'right_sill': 'sill_right',
        'left_roof_frame': 'roof_frame_left',
        'right_roof_frame': 'roof_frame_right',
        'left_wing_mirror': 'mirror_left',
        'right_wing_mirror': 'mirror_right',
        'headlight_on_the_left': 'headlight_left',
        'headlight_on_the_right': 'headlight_right',
        'left_rear_light': 'rear_light_left',
        'taillights_right': 'rear_light_right',
    };

    if (synonymMap[normId]) {
        normId = synonymMap[normId];
    }

    // Now find in BODY_PARTS
    const part = BODY_PARTS.find(p => p.id === normId || p.id === id);
    if (part) {
        return lang === 'de' ? part.labelDe : part.labelEn;
    }

    // Find in INTERIOR_PARTS
    const interior = INTERIOR_PARTS.find(p => p.id === normId || p.id === id);
    if (interior) {
        return lang === 'de' ? interior.labelDe : interior.labelEn;
    }

    // Find in DYNAMIC_PARTS_LOCALIZATION
    const dynamicPart = DYNAMIC_PARTS_LOCALIZATION[normId] || DYNAMIC_PARTS_LOCALIZATION[id];
    if (dynamicPart) {
        return lang === 'de' ? dynamicPart.de : dynamicPart.en;
    }

    // Dynamic translation for door panels not explicitly in INTERIOR_PARTS
    if (normId.startsWith('door_panel_')) {
        const suffix = normId.substring('door_panel_'.length);
        if (suffix === 'fl' || suffix === 'lf' || suffix === 'vl') {
            return lang === 'de' ? 'Türverkleidung vorne links' : 'Door Panel FL';
        }
        if (suffix === 'fr' || suffix === 'rf' || suffix === 'vr') {
            return lang === 'de' ? 'Türverkleidung vorne rechts' : 'Door Panel FR';
        }
        if (suffix === 'rl' || suffix === 'lr' || suffix === 'hl') {
            return lang === 'de' ? 'Türverkleidung hinten links' : 'Door Panel RL';
        }
        if (suffix === 'rr' || suffix === 'hr') {
            return lang === 'de' ? 'Türverkleidung hinten rechts' : 'Door Panel RR';
        }
    }

    // Capitalize formatting fallback if the id has underscores or dashes
    if (id.includes('_') || id.includes('-')) {
        return id.split(/[_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    return id;
}

export const PAINT_PART_ORDER: Record<string, number> = {
    'bumper_front': 10,
    'hood': 20,
    'windshield': 30,
    'fender_front_left': 40,
    'door_front_left': 50,
    'mirror_left': 55,
    'door_rear_left': 60,
    'sill_left': 70,
    'roof_frame_left': 80,
    'quarter_panel_left': 90,
    'tailgate': 100,
    'bumper_rear': 110,
    'quarter_panel_right': 120,
    'sill_right': 130,
    'door_rear_right': 140,
    'door_front_right': 150,
    'mirror_right': 155,
    'roof_frame_right': 160,
    'fender_front_right': 170,
    'roof': 180
};

export function sortPaintMeasurements<T extends { bodyPart: string }>(measurements: T[]): T[] {
    if (!measurements) return [];
    return [...measurements].sort((a, b) => {
        const orderA = PAINT_PART_ORDER[a.bodyPart] ?? 999;
        const orderB = PAINT_PART_ORDER[b.bodyPart] ?? 999;
        return orderA - orderB;
    });
}
