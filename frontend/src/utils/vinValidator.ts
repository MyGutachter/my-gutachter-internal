export function validateVIN(vin: string): boolean {
    if (!vin || vin.length !== 17) return false;
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}
