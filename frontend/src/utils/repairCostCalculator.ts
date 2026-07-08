import {
    type ReparaturwegType,
} from '../constants/repairCostTables';
import type { VehicleCategoryType, GlobalConfig } from '../types/report.types';

/**
 * Calculate repair cost from repair code, vehicle category, and hourly rate.
 * Uses dynamic configuration instead of hardcoded constants.
 */
export function calculateRepairCost(
    repairCodeIndex: number,
    vehicleCategory: VehicleCategoryType | null,
    stundensatz: number,
    reparaturweg: ReparaturwegType,
    config: GlobalConfig | null,
    repairMethod?: string
): number {
    if (!vehicleCategory || !config) return 0;

    const table = config.karosserieFactors;
    if (!table) return 0;

    const factors = table[vehicleCategory];
    if (!factors) return 0;

    const factor = factors[repairCodeIndex] ?? 0;
    let cost = factor * stundensatz;

    return cost;
}

/**
 * Get the Lackvorbereitungskosten (paint preparation flat lump sum)
 * These should ideally be in the config too.
 */
export function getLackvorbereitung(reparaturweg: ReparaturwegType, config: GlobalConfig | null): number {
    if (!config) {
        return 200;
    }

    const ep = config?.equipmentPrices || {};
    return ep['lackvorbereitung_karosserie'] ?? 200;
}

/**
 * Check if a repair code involves paint (needs Lackvorbereitung)
 */
export function needsLackvorbereitung(repairCodeIndex: number, reparaturweg: ReparaturwegType): boolean {
    return [2, 3, 6, 7, 8].includes(repairCodeIndex);
}
