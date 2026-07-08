/**
 * Configuration for automatic vehicle devaluation settings.
 * These are used to calculate the mandatory deductions for expired items (TÜV, missing keys, old/worn tires).
 * Values provided here are placeholders and can be adjusted dynamically later without touching the core logic.
 */
export const DEVALUATION_CONFIG = {
    KEYS: {
        REQUIRED_COUNT: 2,
        DEDUCTION_AMOUNT: 100 // Placeholder deduction for entirely missing second key
    },
    TUEV: {
        DEDUCTION_AMOUNT: 150 // Placeholder deduction for expired TÜV/HU
    },
    TIRES: {
        MIN_TREAD_DEPTH_MM: 4.0, // preset placeholder for what is considered 'worn'
        MAX_AGE_YEARS: 6, // preset placeholder for old DOT tires
        DEDUCTION_AMOUNT_PER_TIRE: 50 // Placeholder deduction per tire
    },
    DOCUMENTS: {
        REGISTRATION_CERTIFICATE: 50,
        SERVICE_BOOKLET: 150,
        OPERATING_MANUAL: 50,
        ENVIRONMENTAL_BADGE: 20
    }
};
