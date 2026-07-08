/** Always use DIVISION for VAT calculation, never multiply by 0.81 */
export function calcNetto(brutto: number): number {
    return brutto / 1.19;
}

export function calcBrutto(netto: number): number {
    return netto * 1.19;
}

export const VAT_RATE = 0.19;
export const VAT_DIVISOR = 1.19;
