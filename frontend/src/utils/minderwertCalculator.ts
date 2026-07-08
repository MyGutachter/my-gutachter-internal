import type { DepreciationEntry, GlobalConfig, MinderwertType, VehicleCategoryType } from '../types/report.types';

export function calculateMinderwert(
    repairCost: number,
    type: MinderwertType,
    vehicleCategory: VehicleCategoryType | null,
    config: GlobalConfig | null,
    bodyPart?: string
): number {
    if (!config) return 0;

    switch (type) {
        case 1: // Dynamic Table or Proportional
            if (!vehicleCategory) return 0;

            // 0. Check for explicit percentage rule first
            if (bodyPart && config.percentageTables) {
                // We might need to store which table is used. For now, let's assume 'minderwert_damage' is the default for this case
                // or if percentageRule is passed explicitly (though it's not in the signature yet)
            }

            // 1. Try Component-based range table first
            if (bodyPart && config.componentMinderwertTables?.[bodyPart]?.[vehicleCategory]) {
                const ranges = config.componentMinderwertTables[bodyPart][vehicleCategory];
                const range = ranges.find(r => repairCost >= r.min && repairCost <= r.max);
                if (range) return range.value;
            }

            // 2. Fallback to category-wide percentage factor
            const factor = config.minderwertFactors?.[vehicleCategory] ?? 0.20;
            return repairCost * factor;

        case 2: // 100% — full repair cost
            return repairCost;
        case 3: // Text only — no monetary calculation
            return 0;
        default:
            return 0;
    }
}

/**
 * Calculate Minderwert using a specific percentage rule from the config.
 */
export function calculateMinderwertWithRule(
    repairCost: number,
    ruleKey: string, // e.g. 'minderwert_damage'
    ruleLabel: string, // e.g. 'Minor (Leicht)'
    config: GlobalConfig | null
): number {
    if (!config || !config.percentageTables?.[ruleKey]) return 0;

    const rule = config.percentageTables[ruleKey].find(r => r.label === ruleLabel);
    if (!rule) return 0;

    return repairCost * rule.value;
}

/**
 * Look up the depreciation matrix factor based on vehicle age (months) and mileage.
 * Returns the matched factor or null if no entry matches.
 */
export function lookupDepreciationMatrixFactor(
    ageMonths: number,
    mileage: number,
    matrix: DepreciationEntry[]
): number | null {
    if (!matrix || matrix.length === 0) return null;

    for (const entry of matrix) {
        const ageMatch =
            (entry.ageFrom === undefined || entry.ageFrom === null || ageMonths >= entry.ageFrom) &&
            (entry.ageTo === undefined || entry.ageTo === null || ageMonths <= entry.ageTo);

        const mileageMatch =
            (entry.mileageFrom === undefined || entry.mileageFrom === null || mileage >= entry.mileageFrom) &&
            (entry.mileageTo === undefined || entry.mileageTo === null || mileage <= entry.mileageTo);

        if (ageMatch && mileageMatch) {
            return entry.factor;
        }
    }

    return null; // No matching entry — caller should decide fallback
}

/**
 * Safely parse a German-formatted date string (DD.MM.YYYY or MM.YYYY) into a JS Date object.
 */
export function parseGermanDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (!clean) return null;

    // Check if it's DD.MM.YYYY or MM.YYYY
    const parts = clean.split('.');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed month
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
        }
    } else if (parts.length === 2) {
        const month = parseInt(parts[0], 10) - 1;
        const year = parseInt(parts[1], 10);
        if (!isNaN(month) && !isNaN(year)) {
            return new Date(year, month, 1);
        }
    }

    // Try standard JS Date parsing fallback
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    return null;
}

/**
 * Calculate Minderwert (pro-rata) using the depreciation matrix.
 * Factor is looked up from matrix based on vehicle age + mileage.
 * Depreciation = repairCost * matrixFactor.
 */
export function calculateMinderwertProRata(
    repairCost: number,
    firstRegistration: string,
    mileage: number,
    config: GlobalConfig | null
): number {
    if (!config || !config.depreciationMatrix || config.depreciationMatrix.length === 0) return 0;

    // Calculate vehicle age in months
    let ageMonths = 0;
    if (firstRegistration) {
        try {
            const regDate = parseGermanDate(firstRegistration);
            if (regDate) {
                const now = new Date();
                ageMonths = (now.getFullYear() - regDate.getFullYear()) * 12 +
                    (now.getMonth() - regDate.getMonth());
                if (now.getDate() < regDate.getDate()) {
                    ageMonths--;
                }
                if (ageMonths < 0) ageMonths = 0;
            }
        } catch { /* ignore */ }
    }

    const factor = lookupDepreciationMatrixFactor(
        ageMonths,
        mileage,
        config.depreciationMatrix
    );

    if (factor === null) return 0; // No matrix match — no pro-rata deduction

    // Pro-rata depreciation: factor is the deduction percentage (e.g. 0.9 = 90% of repair cost).
    // Depreciation amount = repairCost × factor
    return repairCost * factor;
}
