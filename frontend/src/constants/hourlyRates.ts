import type { VehicleCategoryType } from '../types/report.types';

export const DEFAULT_KAROSSERIE_STUNDENSATZ = 133.88;
export const LACK_FACTOR = 1.30;

// Minderwert factors by Vehicle Category (Type 1 — proportional)
export const MINDERWERT_FACTORS: Record<VehicleCategoryType, number> = {
    'Subcompact': 0.10,
    'Compact': 0.15,
    'Mid-size': 0.20,
    'Full-size': 0.25,
    'Luxury': 0.30,
    'Super Luxury / Sports': 0.35,
};

export function calcLackstundensatz(karosserie: number): number {
    return karosserie * LACK_FACTOR;
}

export function getMinderwertFactor(vehicleCategory: VehicleCategoryType | null): number {
    if (!vehicleCategory) return 0;
    return MINDERWERT_FACTORS[vehicleCategory] || 0.20;
}
