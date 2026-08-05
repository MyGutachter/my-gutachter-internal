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

    // VideoXpert overview / general shots (no SVG coords needed, used for photo labelling)
    { id: 'vehicle_view_front', labelDe: 'Fahrzeugansicht vorne', labelEn: 'Vehicle view front', side: 'front', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'vehicle_view_from_the_rear', labelDe: 'Fahrzeugansicht von hinten', labelEn: 'Vehicle view from the rear', side: 'rear', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'vehicle_photo_right_side', labelDe: 'Fahrzeugfoto rechte Seite', labelEn: 'Vehicle picture right side', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'vehicle_photo_left_side', labelDe: 'Fahrzeugfoto linke Seite', labelEn: 'Vehicle picture left side', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'overview_diagonal_front_left', labelDe: 'Übersicht diagonal vorne links', labelEn: 'Overview diagonal front left', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'overview_diagonal_front_right', labelDe: 'Übersicht diagonal vorne rechts', labelEn: 'Overview diagonal front right', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'overview_diagonal_rear_left', labelDe: 'Übersicht diagonal hinten links', labelEn: 'Overview diagonal rear left', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'overview_diagonal_rear_right', labelDe: 'Übersicht diagonal hinten rechts', labelEn: 'Overview diagonal rear right', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'left_side_wall', labelDe: 'Seitenwand links', labelEn: 'Left side wall', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'right_side_wall', labelDe: 'Seitenwand rechts', labelEn: 'Right side wall', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'heck', labelDe: 'Heck', labelEn: 'Rear end', side: 'rear', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'front', labelDe: 'Front', labelEn: 'Front', side: 'front', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'rear_left_door_window', labelDe: 'Fenster hinten links', labelEn: 'Rear left door window', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'rear_right_door_window', labelDe: 'Fenster hinten rechts', labelEn: 'Rear right door window', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'front_left_door_window', labelDe: 'Fenster vorne links', labelEn: 'Front left door window', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'front_right_door_window', labelDe: 'Fenster vorne rechts', labelEn: 'Front right door window', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'rear_window', labelDe: 'Heckscheibe', labelEn: 'Rear window', side: 'rear', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'vin_number', labelDe: 'FIN / Typenschild', labelEn: 'VIN Number / Type plate', side: 'center', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'fuel_cap', labelDe: 'Tankdeckel', labelEn: 'Fuel cap', side: 'center', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'ev_charging_cover', labelDe: 'Ladeabdeckung (EV)', labelEn: 'EV charging cover', side: 'center', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'meter_reading', labelDe: 'Kilometerstand / Zählerstand', labelEn: 'Meter reading / Mileage', side: 'center', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'dachrahmen_links', labelDe: 'Dachrahmen links', labelEn: 'Roof frame left', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'front_left_wheel', labelDe: 'Rad vorne links', labelEn: 'Front left wheel', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'front_right_wheel', labelDe: 'Rad vorne rechts', labelEn: 'Front right wheel', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'rear_left_wheel', labelDe: 'Rad hinten links', labelEn: 'Rear left wheel', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'rear_right_wheel', labelDe: 'Rad hinten rechts', labelEn: 'Rear right wheel', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'left_sill_2', labelDe: 'Schweller links', labelEn: 'Left sill', side: 'left', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'right_sill_2', labelDe: 'Schweller rechts', labelEn: 'Right sill', side: 'right', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'additional_images', labelDe: 'Zusätzliche Bilder', labelEn: 'Additional images', side: 'center', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
    { id: 'vehicle_registration_document', labelDe: 'Fahrzeugschein', labelEn: 'Vehicle registration document', side: 'center', svgX: 0, svgY: 0, svgWidth: 0, svgHeight: 0 },
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
        // bumper / bonnet / trunk synonyms
        'front_bumper': 'bumper_front',
        'rear_bumper': 'bumper_rear',
        'bonnet': 'hood',
        'trunk': 'tailgate',
        'tailgate': 'tailgate',
        // fender synonyms
        'front_left_fender': 'fender_front_left',
        'front_right_fender': 'fender_front_right',
        'rear_left_fender': 'quarter_panel_left',
        'rear_right_fender': 'quarter_panel_right',
        // door synonyms
        'left_front_door': 'door_front_left',
        'right_front_door': 'door_front_right',
        'left_rear_door': 'door_rear_left',
        'right_rear_door': 'door_rear_right',
        'front_left_door': 'door_front_left',
        'front_right_door': 'door_front_right',
        'rear_left_door': 'door_rear_left',
        'rear_right_door': 'door_rear_right',
        // sill synonyms
        'left_sill': 'sill_left',
        'right_sill': 'sill_right',
        // roof frame synonyms
        'left_roof_frame': 'roof_frame_left',
        'right_roof_frame': 'roof_frame_right',
        'roof_frame_right': 'roof_frame_right',
        'dachrahmen_links': 'dachrahmen_links',
        // mirror synonyms
        'left_wing_mirror': 'mirror_left',
        'right_wing_mirror': 'mirror_right',
        'right_hand_exterior_mirror': 'mirror_right',
        'right-hand_exterior_mirror': 'mirror_right',
        // headlight synonyms
        'headlight_on_the_left': 'headlight_left',
        'headlight_on_the_right': 'headlight_right',
        // tail light synonyms
        'left_rear_light': 'rear_light_left',
        'taillights_right': 'rear_light_right',
        // VideoXpert overview shots -> direct BODY_PARTS entries
        'vehicle_view_from_the_rear': 'vehicle_view_from_the_rear',
        'vehicle_view_front': 'vehicle_view_front',
        'vehicle_photo_right_side': 'vehicle_photo_right_side',
        'vehicle_photo_left_side': 'vehicle_photo_left_side',
        'overview_diagonal_front_left': 'overview_diagonal_front_left',
        'overview_diagonal_front_right': 'overview_diagonal_front_right',
        'overview_diagonal_rear_left': 'overview_diagonal_rear_left',
        'overview_diagonal_rear_right': 'overview_diagonal_rear_right',
        'left_side_wall': 'left_side_wall',
        'right_side_wall': 'right_side_wall',
        'heck': 'heck',
        'front': 'front',
        'rear_left_door_window': 'rear_left_door_window',
        'rear_right_door_window': 'rear_right_door_window',
        'front_left_door_window': 'front_left_door_window',
        'front_right_door_window': 'front_right_door_window',
        'rear_window': 'rear_window',
        'vin_number': 'vin_number',
        'fuel_cap': 'fuel_cap',
        'ev_charging_cover': 'ev_charging_cover',
        'meter_reading': 'meter_reading',
        'roof': 'roof',
        'front_left_wheel': 'front_left_wheel',
        'front_right_wheel': 'front_right_wheel',
        'rear_left_wheel': 'rear_left_wheel',
        'rear_right_wheel': 'rear_right_wheel',
        'left_sill_2': 'sill_left',
        'right_sill_2': 'sill_right',
        'additional_images': 'additional_images',
        'vehicle_registration_document': 'vehicle_registration_document',
        'vin_photo': 'vin_number',
        'mileage_photo': 'meter_reading',
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
