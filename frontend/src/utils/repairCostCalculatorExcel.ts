/**
 * Excel-based repair cost calculator.
 *
 * Maps each body part to its correct Reparaturweg (Karosserie / Kunststoff / Glas)
 * and provides helpers to get valid repair codes plus auto-calculate costs.
 *
 * Uses the existing factor tables from repairCostTables.ts.
 */

import {
    KAROSSERIE_REPAIR_CODES,
    type ReparaturwegType
} from '../constants/repairCostTables';
import type { GlobalConfig, VehicleCategoryType } from '../types/report.types';
import { calculateRepairCost } from './repairCostCalculator';

// ---------------------------------------------------------------------------
// Body part → Reparaturweg mapping
// ---------------------------------------------------------------------------

/**
 * Default Reparaturweg for each body part.
 */
export const BODY_PART_REPARATURWEG: Record<string, ReparaturwegType> = {
    bumper_front: 'Karosserie',
    fender_front_left: 'Karosserie',
    fender_front_right: 'Karosserie',
    hood: 'Karosserie',
    door_front_left: 'Karosserie',
    door_front_right: 'Karosserie',
    door_rear_left: 'Karosserie',
    door_rear_right: 'Karosserie',
    roof: 'Karosserie',
    roof_frame_left: 'Karosserie',
    roof_frame_right: 'Karosserie',
    sill_left: 'Karosserie',
    sill_right: 'Karosserie',
    quarter_panel_left: 'Karosserie',
    quarter_panel_right: 'Karosserie',
    tailgate: 'Karosserie',
    bumper_rear: 'Karosserie',
    windshield: 'Karosserie',
};

// ---------------------------------------------------------------------------
// Repair code helpers
// ---------------------------------------------------------------------------

export interface RepairCodeOption {
    index: number;
    code: string;
    labelDe: string;
    labelEn: string;
}

/**
 * Returns the full repair code list for a body part, based on its Reparaturweg.
 */
export function getRepairCodesForPart(bodyPartId: string): RepairCodeOption[] {
    return KAROSSERIE_REPAIR_CODES;
}

/**
 * Returns repair code info for a specific bodyPart + repairCodeIndex.
 */
export function getRepairCodeInfo(bodyPartId: string, repairCodeIndex: number): RepairCodeOption | undefined {
    const codes = getRepairCodesForPart(bodyPartId);
    return codes.find(c => c.index === repairCodeIndex);
}

/**
 * Resolve damage description and repair method from a repair code.
 */
export function getDescriptionsFromCode(bodyPartId: string, repairCodeIndex: number, lang: 'de' | 'en' = 'de'): {
    damage: string;
    repairMethod: string;
} {
    const code = getRepairCodeInfo(bodyPartId, repairCodeIndex);
    if (!code || repairCodeIndex === 0) {
        return { damage: '', repairMethod: '' };
    }

    const label = lang === 'de' ? code.labelDe : code.labelEn;
    // Labels are formatted as "damage — repair" (e.g. "zerkratzt — polieren")
    const parts = label.split(' — ');
    return {
        damage: parts[0] || label,
        repairMethod: parts[1] || '',
    };
}

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

/**
 * Calculate repair cost for a specific body part and repair code.
 */
export function calculateRepairCostForPart(
    bodyPartId: string,
    repairCodeIndex: number,
    vehicleCategory: VehicleCategoryType | null,
    stundensatz: number,
    config: GlobalConfig | null
): number {
    if (repairCodeIndex === 0) return 0;

    const weg = BODY_PART_REPARATURWEG[bodyPartId] || 'Karosserie';
    const { repairMethod } = getDescriptionsFromCode(bodyPartId, repairCodeIndex);
    return calculateRepairCost(repairCodeIndex, vehicleCategory, stundensatz, weg, config, repairMethod);
}

/**
 * Get the Reparaturweg for a body part, with fallback to Karosserie.
 */
export function getReparaturwegForPart(bodyPartId: string): ReparaturwegType {
    return BODY_PART_REPARATURWEG[bodyPartId] || 'Karosserie';
}
