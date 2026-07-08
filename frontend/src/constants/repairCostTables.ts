import type { VehicleCategoryType } from '../types/report.types';

/**
 * Repair cost factor tables matching the XLS Reparaturkosten Karosserie / Kunststoff sheets.
 *
 * Structure: FACTORS[vehicleCategory][repairCodeIndex] = labor-hour factor
 * The factor is multiplied by the hourly rate to get the repair cost.
 *
 * Repair code indexes (Karosserie — 15 codes):
 *   0: – (no damage)
 *   1: POL 0,5 (polieren)
 *   2: L (lackieren, surface)
 *   3: LI (lackieren intensiv)
 *   4: D 0,5 (drücken leicht)
 *   5: D 1,0 (drücken stark)
 *   6: I 0,5 + LI (instandsetzen leicht + lackieren)
 *   7: I 1,0 + LI (instandsetzen stark + lackieren)
 *   8: Steinschlag LI (stone chip + paint)
 *   9: SMART 0,5 Steinschlag
 *  10: SMART 0,5 beschädigt
 *  11: SMART 1,0 beschädigt
 *  12: SMA 1 Stein (windscreen)
 *  13: SMA 2 Stein (windscreen)
 *  14: V (vermessen)
 *
 * L = 0.65 × LI
 * Paint rate = 1.3 × body rate
 * Lackvorbereitungskosten Karosserie = 200 EUR flat
 * Lackvorbereitungskosten Kunststoff = 100 EUR flat
 */

export const LACKVORBEREITUNG_KAROSSERIE = 200; // EUR flat
export const LACKVORBEREITUNG_KUNSTSTOFF = 100; // EUR flat

/** Karosserie repair factor table: [VehicleCategoryType][repairCode 0..14] */
export const KAROSSERIE_FACTORS: Record<VehicleCategoryType, number[]> = {
    'Subcompact': [0, 0.3, 0.65, 1.0, 0.5, 1.0, 1.5, 2.0, 1.0, 0.5, 0.5, 1.0, 1.0, 1.6, 0.5],
    'Compact': [0, 0.35, 0.75, 1.15, 0.6, 1.2, 1.75, 2.3, 1.15, 0.5, 0.5, 1.0, 1.0, 1.6, 0.6],
    'Mid-size': [0, 0.4, 0.85, 1.3, 0.7, 1.4, 2.0, 2.6, 1.3, 0.5, 0.5, 1.0, 1.0, 1.6, 0.7],
    'Full-size': [0, 0.45, 0.95, 1.45, 0.8, 1.6, 2.25, 2.9, 1.45, 0.5, 0.5, 1.0, 1.0, 1.6, 0.8],
    'Luxury': [0, 0.5, 1.05, 1.6, 0.9, 1.8, 2.5, 3.2, 1.6, 0.5, 0.5, 1.0, 1.0, 1.6, 0.9],
    'Super Luxury / Sports': [0, 0.55, 1.15, 1.75, 1.0, 2.0, 2.75, 3.5, 1.75, 0.5, 0.5, 1.0, 1.0, 1.6, 1.0],
};

/** Kunststoff repair factor table: [VehicleCategoryType][repairCode 0..12]
 *  Kunststoff has 13 codes (no D 0.5 and D 1.0 — plastic doesn't dent the same way) */
export const KUNSTSTOFF_FACTORS: Record<VehicleCategoryType, number[]> = {
    'Subcompact': [0, 0.25, 0.55, 0.85, 1.2, 1.6, 0.85, 0.5, 0.5, 1.0, 1.0, 1.6, 0.4],
    'Compact': [0, 0.3, 0.65, 1.0, 1.4, 1.85, 1.0, 0.5, 0.5, 1.0, 1.0, 1.6, 0.5],
    'Mid-size': [0, 0.35, 0.75, 1.15, 1.6, 2.1, 1.15, 0.5, 0.5, 1.0, 1.0, 1.6, 0.6],
    'Full-size': [0, 0.4, 0.85, 1.3, 1.8, 2.35, 1.3, 0.5, 0.5, 1.0, 1.0, 1.6, 0.7],
    'Luxury': [0, 0.45, 0.95, 1.45, 2.0, 2.6, 1.45, 0.5, 0.5, 1.0, 1.0, 1.6, 0.8],
    'Super Luxury / Sports': [0, 0.5, 1.05, 1.6, 2.2, 2.85, 1.6, 0.5, 0.5, 1.0, 1.0, 1.6, 0.9],
};

/** Human-readable repair code labels for Karosserie (15 codes) */
export const KAROSSERIE_REPAIR_CODES = [
    { index: 0, code: '–', labelDe: '– (kein Schaden)', labelEn: '– (no damage)' },
    { index: 1, code: 'POL 0,5', labelDe: 'zerkratzt — polieren', labelEn: 'scratched — polish' },
    { index: 2, code: 'L', labelDe: 'zerkratzt — lackieren', labelEn: 'scratched — repaint' },
    { index: 3, code: 'LI', labelDe: 'zerkratzt — lackieren (LI)', labelEn: 'scratched — repaint (LI)' },
    { index: 4, code: 'D 0,5', labelDe: 'eingedellt — drücken (leicht)', labelEn: 'dented — push (light)' },
    { index: 5, code: 'D 1,0', labelDe: 'eingedellt — drücken (stark)', labelEn: 'dented — push (heavy)' },
    { index: 6, code: 'I 0,5 + LI', labelDe: 'deformiert — instandsetzen + lack', labelEn: 'deformed — repair + paint' },
    { index: 7, code: 'I 1,0 + LI', labelDe: 'deformiert — instandsetzen + lack', labelEn: 'deformed — repair + paint (heavy)' },
    { index: 8, code: 'Steinschlag LI', labelDe: 'Steinschlag — lackieren (LI)', labelEn: 'stone chip — repaint (LI)' },
    { index: 9, code: 'SMART 0,5 S', labelDe: 'Steinschlag — SMART', labelEn: 'stone chip — SMART' },
    { index: 10, code: 'SMART 0,5 B', labelDe: 'beschädigt — SMART', labelEn: 'damaged — SMART' },
    { index: 11, code: 'SMART 1,0', labelDe: 'beschädigt — SMART (stark)', labelEn: 'damaged — SMART (heavy)' },
    { index: 12, code: 'SMA 1 Stein', labelDe: 'Frontscheibe — SMART 1 Stein', labelEn: 'windshield — SMART 1 stone' },
    { index: 13, code: 'SMA 2 Stein', labelDe: 'Frontscheibe — SMART 2 Stein', labelEn: 'windshield — SMART 2 stones' },
    { index: 14, code: 'V', labelDe: 'vermessen', labelEn: 'measure / align' },
];

/** Human-readable repair code labels for Kunststoff (13 codes) */
export const KUNSTSTOFF_REPAIR_CODES = [
    { index: 0, code: '–', labelDe: '– (kein Schaden)', labelEn: '– (no damage)' },
    { index: 1, code: 'POL 0,5', labelDe: 'zerkratzt — polieren', labelEn: 'scratched — polish' },
    { index: 2, code: 'L', labelDe: 'zerkratzt — lackieren', labelEn: 'scratched — repaint' },
    { index: 3, code: 'LI', labelDe: 'zerkratzt — lackieren (LI)', labelEn: 'scratched — repaint (LI)' },
    { index: 4, code: 'I 0,5 + LI', labelDe: 'deformiert — instandsetzen + lack', labelEn: 'deformed — repair + paint' },
    { index: 5, code: 'I 1,0 + LI', labelDe: 'deformiert — instandsetzen + lack', labelEn: 'deformed — repair + paint (heavy)' },
    { index: 6, code: 'Steinschlag LI', labelDe: 'Steinschlag — lackieren (LI)', labelEn: 'stone chip — repaint (LI)' },
    { index: 7, code: 'SMART 0,5 S', labelDe: 'Steinschlag — SMART', labelEn: 'stone chip — SMART' },
    { index: 8, code: 'SMART 0,5 B', labelDe: 'beschädigt — SMART', labelEn: 'damaged — SMART' },
    { index: 9, code: 'SMART 1,0', labelDe: 'beschädigt — SMART (stark)', labelEn: 'damaged — SMART (heavy)' },
    { index: 10, code: 'SMA 1 Stein', labelDe: 'Frontscheibe — SMART 1 Stein', labelEn: 'windshield — SMART 1 stone' },
    { index: 11, code: 'SMA 2 Stein', labelDe: 'Frontscheibe — SMART 2 Stein', labelEn: 'windshield — SMART 2 stones' },
    { index: 12, code: 'V', labelDe: 'vermessen', labelEn: 'measure / align' },
];

/** Glas repair codes (3 codes) */
export const GLAS_REPAIR_CODES = [
    { index: 0, code: '–', labelDe: '– (kein Schaden)', labelEn: '– (no damage)' },
    { index: 1, code: 'SMA 1 Stein', labelDe: 'SMART 1 Stein', labelEn: 'SMART 1 stone' },
    { index: 2, code: 'SMA 2 Stein', labelDe: 'SMART 2 Steine', labelEn: 'SMART 2 stones' },
];

export type ReparaturwegType = 'Karosserie' | 'Kunststoff' | 'Glas';
