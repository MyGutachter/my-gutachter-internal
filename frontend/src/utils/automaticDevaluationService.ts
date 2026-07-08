import { DEVALUATION_CONFIG } from '../constants/devaluationConfig';
import i18n from '../i18n/i18n';
import type { MinderwertRow, ReportData } from '../types/report.types';
import { formatMonthYear, parseMonthYear } from './dateFormatter';

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);

/**
 * Builds a MinderwertRow for automatic system deductions.
 * Using a helper avoids repeating the fixed fields (presetType, isCustom, etc.) everywhere.
 */
function makeSystemRow(
    id: string,
    bodyPart: string,
    damage: string,
    repairMethod: string,
    repairCost: number // gross amount
): MinderwertRow {
    const net = Math.round((repairCost / 1.19) * 100) / 100;
    return {
        id,
        bodyPart,
        damage,
        repairMethod: repairMethod as any,
        repairCost: net,
        repairCostBrutto: repairCost,
        minderwertBrutto: repairCost,
        minderwertNetto: net,
        anrechnung: 'voll',
        presetType: 2,
        isCustom: true,
        repairCodeIndex: 0,
        spareParts: 0,
        sparePartsBrutto: 0
    };
}

/**
 * Calculates generic Minderwert rows automatically based on vehicle conditions
 * like TÜV dates, keys, and tires.
 *
 * @param storeData Current state of the report
 * @returns An array of MinderwertRow items to append to existing deductions dynamically
 */
export const getAutomaticDevaluations = (storeData: Partial<ReportData>): MinderwertRow[] => {
    const rows: MinderwertRow[] = [];

    // ── 1. Keys Mismatch — actual vs target ──────────────────────────────────
    const target = storeData.targetKeysCount ?? 2;
    const actual = storeData.actualKeysCount ?? 0;

    if (actual > 0 && actual !== target) {
        const missingKeys = Math.max(0, target - actual);
        if (missingKeys > 0) {
            const deduction = missingKeys * DEVALUATION_CONFIG.KEYS.DEDUCTION_AMOUNT;
            rows.push(makeSystemRow(
                'sys-keys-mismatch',
                t('step3.keys'),
                `${t('step2.actualKeysCount')}: ${actual} / ${t('step2.targetKeysCount')}: ${target}`,
                t('step5.obtain'),
                deduction
            ));
        }
    }

    // ── 2. TÜV Expired (nextHU format: MM.YYYY) ──────────────────────────────
    if (storeData.nextHU) {
        const huDate = parseMonthYear(storeData.nextHU);
        if (huDate) {
            const now = new Date();
            const isExpired =
                huDate.getFullYear() < now.getFullYear() ||
                (huDate.getFullYear() === now.getFullYear() && huDate.getMonth() < now.getMonth());

            if (isExpired) {
                rows.push(makeSystemRow(
                    'sys-tuev-expired',
                    t('step2.nextHU'),
                    `${t('common.expired')} (${formatMonthYear(storeData.nextHU)})`,
                    t('common.renew'),
                    DEVALUATION_CONFIG.TUEV.DEDUCTION_AMOUNT
                ));
            }
        }
    }

    // ── 3. Tires — tread depth < min or DOT age > max ────────────────────────
    if (storeData.tires && storeData.tires.length > 0) {
        storeData.tires.forEach((tire, idx) => {
            let isExpired = false;
            const reasons: string[] = [];

            // Tread depth check
            if (tire.treadDepth) {
                const treadFloat = parseFloat(tire.treadDepth.replace(',', '.'));
                if (!isNaN(treadFloat) && treadFloat < DEVALUATION_CONFIG.TIRES.MIN_TREAD_DEPTH_MM) {
                    isExpired = true;
                    reasons.push(`${t('common.tread')} < ${DEVALUATION_CONFIG.TIRES.MIN_TREAD_DEPTH_MM}mm`);
                }
            }

            // DOT age check
            if (tire.dotNumber) {
                const dotClean = tire.dotNumber.replace(/\D/g, '');
                if (dotClean.length >= 4) {
                    const yearPart = parseInt(dotClean.substring(dotClean.length - 2), 10);
                    const year = 2000 + yearPart;
                    const maxAllowedYear = new Date().getFullYear() - DEVALUATION_CONFIG.TIRES.MAX_AGE_YEARS;
                    if (year <= maxAllowedYear) {
                        isExpired = true;
                        reasons.push(`${t('common.age')} > ${DEVALUATION_CONFIG.TIRES.MAX_AGE_YEARS} ${t('common.years')}`);
                    }
                }
            }

            if (isExpired) {
                const tireLocation = t('step5.tireAxle', {
                    axle: tire.axle,
                    side: tire.side === 'links' ? 'L' : 'R',
                });
                rows.push(makeSystemRow(
                    `sys-tire-expired-${idx}`,
                    tireLocation,
                    reasons.join(', '),
                    t('common.renew'),
                    DEVALUATION_CONFIG.TIRES.DEDUCTION_AMOUNT_PER_TIRE
                ));
            }
        });
    }

    // ── 3.5 Second Tire Set ───────────────────────────────────────────────────
    if (storeData.hasSecondTireSet && storeData.secondTires) {
        storeData.secondTires.forEach((tire, idx) => {
            const tireLocation = t('step5.secondTireSetAxle', {
                axle: tire.axle,
                side: tire.side === 'links' ? 'L' : 'R',
            });

            // Tread depth check (< 4.0 mm)
            const tread = parseFloat(tire.treadDepth);
            if (!isNaN(tread) && tread < 4.0) {
                rows.push(makeSystemRow(
                    `sys-second-tire-tread-${idx}`,
                    tireLocation,
                    t('step5.treadDepthLow'),
                    t('damage.erneuern'),
                    50
                ));
            }

            // DOT age check (> 6 years)
            if (tire.dotNumber && tire.dotNumber.length === 4) {
                const week = parseInt(tire.dotNumber.substring(0, 2), 10);
                const year = 2000 + parseInt(tire.dotNumber.substring(2, 4), 10);
                const dotDate = new Date(year, 0, week * 7);
                const sixYearsAgo = new Date();
                sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

                if (dotDate < sixYearsAgo) {
                    rows.push(makeSystemRow(
                        `sys-second-tire-age-${idx}`,
                        tireLocation,
                        t('step5.tireAgeHigh'),
                        t('damage.erneuern'),
                        0
                    ));
                }
            }
        });
    }

    // ── 4. Missing Documents ──────────────────────────────────────────────────
    const addDocRow = (
        id: string,
        label: string,
        status: string | undefined,
        submittedLater: boolean | undefined,
        deduction: number
    ) => {
        if (status === 'Not Available') {
            const damageLabel = submittedLater
                ? `${t('common.notAvailable')} (${t('step3.willBeSubmittedLater')})`
                : t('common.notAvailable');

            rows.push(makeSystemRow(
                `sys-doc-${id}`,
                label,
                damageLabel,
                t('step5.obtain'),
                deduction
            ));
        }
    };

    addDocRow('reg-cert',    t('step3.docRegistration'), storeData.registrationCertificateStatus, storeData.registrationCertificateSubmittedLater, DEVALUATION_CONFIG.DOCUMENTS.REGISTRATION_CERTIFICATE);
    addDocRow('service-book', t('step3.docServiceBook'), storeData.serviceBookletStatus,          storeData.serviceBookletSubmittedLater,          DEVALUATION_CONFIG.DOCUMENTS.SERVICE_BOOKLET);
    addDocRow('manual',      t('step3.docManual'),       storeData.operatingManualStatus,         storeData.operatingManualSubmittedLater,         DEVALUATION_CONFIG.DOCUMENTS.OPERATING_MANUAL);
    addDocRow('env-badge',   t('step3.docBadge'),        storeData.environmentalBadgeStatus,      storeData.environmentalBadgeSubmittedLater,      DEVALUATION_CONFIG.DOCUMENTS.ENVIRONMENTAL_BADGE);

    return rows;
};
