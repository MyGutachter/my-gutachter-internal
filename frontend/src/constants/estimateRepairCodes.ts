import type { EstimateConfig, EstimateRepairCodeId } from '../types/report.types';

/** All available estimate repair code IDs */
export const ESTIMATE_REPAIR_CODE_IDS: EstimateRepairCodeId[] = [
    'Paint',
    'Repair and Paint',
    'Replace',
    'SMART Repair',
    'Polish',
    'Gentle Repair',
    'Inspect',
];

/** Human-readable labels for each repair code */
export const ESTIMATE_REPAIR_CODE_LABELS: Record<EstimateRepairCodeId, { de: string; en: string }> = {
    'Paint':           { de: 'Lackieren',               en: 'Paint' },
    'Repair and Paint':{ de: 'Instandsetzen & Lackieren', en: 'Repair and Paint' },
    'Replace':         { de: 'Erneuern',                en: 'Replace' },
    'SMART Repair':    { de: 'SMART Repair',            en: 'SMART Repair' },
    'Polish':          { de: 'Polieren',                en: 'Polish' },
    'Gentle Repair':   { de: 'Sanfte Reparatur',        en: 'Gentle Repair' },
    'Inspect':         { de: 'Prüfen / Schadensbewertung', en: 'Inspect (Assess Damage)' },
};

/**
 * Default flat prices (€) for each repair code per vehicle category.
 * These are used as seed data when creating a new estimate config.
 */
export const DEFAULT_ESTIMATE_PRICES: Record<EstimateRepairCodeId, Record<string, number>> = {
    'Paint':            { 'Subcompact': 120, 'Compact': 140, 'Mid-size': 160, 'Full-size': 200, 'Luxury': 260, 'Super Luxury / Sports': 350 },
    'Repair and Paint': { 'Subcompact': 250, 'Compact': 290, 'Mid-size': 340, 'Full-size': 400, 'Luxury': 520, 'Super Luxury / Sports': 700 },
    'Replace':          { 'Subcompact': 400, 'Compact': 480, 'Mid-size': 580, 'Full-size': 700, 'Luxury': 950, 'Super Luxury / Sports': 1400 },
    'SMART Repair':     { 'Subcompact': 80,  'Compact': 90,  'Mid-size': 100, 'Full-size': 110, 'Luxury': 130, 'Super Luxury / Sports': 160 },
    'Polish':           { 'Subcompact': 40,  'Compact': 50,  'Mid-size': 60,  'Full-size': 70,  'Luxury': 90,  'Super Luxury / Sports': 120 },
    'Gentle Repair':    { 'Subcompact': 70,  'Compact': 80,  'Mid-size': 90,  'Full-size': 110, 'Luxury': 140, 'Super Luxury / Sports': 180 },
    'Inspect':          { 'Subcompact': 20,  'Compact': 20,  'Mid-size': 25,  'Full-size': 25,  'Luxury': 30,  'Super Luxury / Sports': 40  },
};

/**
 * Build a default EstimateConfig pre-populated with all BODY_PARTS and all 7 repair codes.
 * Called when a new customer config is created.
 */
export function buildDefaultEstimateConfig(vehicleCategories: string[]): EstimateConfig {
    // Import BODY_PARTS inline to avoid circular deps
    const BODY_PART_IDS: { id: string; labelEn: string }[] = [
        { id: 'bumper_front',        labelEn: 'Front Bumper' },
        { id: 'hood',                labelEn: 'Hood / Bonnet' },
        { id: 'windshield',          labelEn: 'Windshield' },
        { id: 'fender_front_left',   labelEn: 'Left Front Fender' },
        { id: 'fender_front_right',  labelEn: 'Right Front Fender' },
        { id: 'door_front_left',     labelEn: 'Left Front Door' },
        { id: 'door_front_right',    labelEn: 'Right Front Door' },
        { id: 'door_rear_left',      labelEn: 'Left Rear Door' },
        { id: 'door_rear_right',     labelEn: 'Right Rear Door' },
        { id: 'quarter_panel_left',  labelEn: 'Left Rear Quarter Panel' },
        { id: 'quarter_panel_right', labelEn: 'Right Rear Quarter Panel' },
        { id: 'sill_left',           labelEn: 'Left Sill' },
        { id: 'sill_right',          labelEn: 'Right Sill' },
        { id: 'roof',                labelEn: 'Roof' },
        { id: 'roof_frame_left',     labelEn: 'Left Roof Frame' },
        { id: 'roof_frame_right',    labelEn: 'Right Roof Frame' },
        { id: 'tailgate',            labelEn: 'Tailgate / Trunk' },
        { id: 'bumper_rear',         labelEn: 'Rear Bumper' },
        { id: 'mirror_left',         labelEn: 'Left Wing Mirror' },
        { id: 'mirror_right',        labelEn: 'Right Wing Mirror' },
        { id: 'dashboard',           labelEn: 'Dashboard' },
        { id: 'steering_wheel',      labelEn: 'Steering Wheel' },
        { id: 'seat_driver',         labelEn: 'Driver Seat' },
        { id: 'seat_passenger',      labelEn: 'Passenger Seat' },
        { id: 'center_console',      labelEn: 'Center Console' },
        { id: 'door_panel_fl',       labelEn: 'Door Panel FL' },
        { id: 'roof_lining',         labelEn: 'Roof Lining' },
        { id: 'trunk_lining',        labelEn: 'Trunk Lining' },
    ];

    return {
        components: BODY_PART_IDS.map(part => ({
            componentId: part.id,
            description: part.labelEn,
            repairCodes: ESTIMATE_REPAIR_CODE_IDS.map(codeId => ({
                repairCodeId: codeId,
                priceByCategory: Object.fromEntries(
                    vehicleCategories.map(cat => [
                        cat,
                        (DEFAULT_ESTIMATE_PRICES[codeId]?.[cat]) ?? (DEFAULT_ESTIMATE_PRICES[codeId]?.['Compact'] ?? 0)
                    ])
                )
            }))
        }))
    };
}

/**
 * Lookup the flat price for a given component + repair code + vehicle category.
 * Returns 0 if not found.
 */
export function lookupEstimatePrice(
    estimateConfig: EstimateConfig | undefined,
    componentId: string,
    repairCodeId: EstimateRepairCodeId,
    vehicleCategory: string
): number {
    if (!estimateConfig) return 0;
    const comp = estimateConfig.components.find(c => c.componentId === componentId);
    if (!comp) {
        if (vehicleCategory === 'Transporter') {
            return (DEFAULT_ESTIMATE_PRICES[repairCodeId]?.[vehicleCategory])
                ?? (DEFAULT_ESTIMATE_PRICES[repairCodeId]?.['Compact']
                ?? 0);
        }
        return DEFAULT_ESTIMATE_PRICES[repairCodeId]?.[vehicleCategory] ?? 0;
    }
    const code = comp.repairCodes.find(r => r.repairCodeId === repairCodeId);
    if (!code) return 0;
    const price = code.priceByCategory[vehicleCategory];
    // Use stored value when explicitly set (even 0 = "no charge"); only fall to default when undefined
    if (price !== undefined) return price;
    if (vehicleCategory === 'Transporter') {
        return (DEFAULT_ESTIMATE_PRICES[repairCodeId]?.[vehicleCategory])
            ?? (DEFAULT_ESTIMATE_PRICES[repairCodeId]?.['Compact']
            ?? 0);
    }
    return DEFAULT_ESTIMATE_PRICES[repairCodeId]?.[vehicleCategory] ?? 0;
}

/**
 * Maps a DAT / legacy repair code string to an EstimateRepairCodeId.
 */
export function mapRepairCodeStringToEstimateId(code: string | undefined): EstimateRepairCodeId | undefined {
    if (!code || code === '–') return undefined;
    const upper = code.toUpperCase();
    if (upper.startsWith('POL')) return 'Polish';
    if (upper === 'L' || upper === 'LI' || upper.includes('STEINSCHLAG LI')) return 'Paint';
    if (upper.startsWith('D ')) return 'Gentle Repair';
    if (upper.includes('I 0,5 + LI') || upper.includes('I 1,0 + LI')) return 'Repair and Paint';
    if (upper.startsWith('SMART') || upper.startsWith('SMA ')) return 'SMART Repair';
    if (upper === 'V') return 'Inspect';
    return undefined;
}
