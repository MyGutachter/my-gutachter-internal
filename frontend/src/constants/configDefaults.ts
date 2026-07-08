import { buildDefaultEstimateConfig } from '../constants/estimateRepairCodes';
import { DEFAULT_KAROSSERIE_STUNDENSATZ, LACK_FACTOR, MINDERWERT_FACTORS } from '../constants/hourlyRates';
import { KAROSSERIE_FACTORS, KUNSTSTOFF_FACTORS } from '../constants/repairCostTables';
import type { GlobalConfig } from '../types/report.types';

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
    karosseriestundensatz: DEFAULT_KAROSSERIE_STUNDENSATZ,
    lackstundensatz: DEFAULT_KAROSSERIE_STUNDENSATZ * LACK_FACTOR,
    lackberechnungsart: 'AZT',
    vehicleCategories: [...Object.keys(KAROSSERIE_FACTORS), 'Transporter'],
    minderwertFactors: {
        ...MINDERWERT_FACTORS,
        'Transporter': 0.15
    },
    karosserieFactors: {
        ...KAROSSERIE_FACTORS,
        'Transporter': KAROSSERIE_FACTORS['Compact']
    },
    kunststoffFactors: {
        ...KUNSTSTOFF_FACTORS,
        'Transporter': KUNSTSTOFF_FACTORS['Compact']
    },
    equipmentPrices: {
        lackvorbereitung_karosserie: 200,
        lackvorbereitung_kunststoff: 100,
        breakdown_kit_missing: 50,
        breakdown_kit_expired: 30,
        first_aid_kit_missing: 25,
        first_aid_kit_expired: 20,
        safety_vest_missing: 10,
        warning_triangle_missing: 15
    },
    maintenanceRules: {
        overdueDayFactor: 1.0,
        overdueKmFactor: 0.05
    },
    repairSurcharges: {
        'L': 20,
        'LI': 10,
        'IL': 35
    },
    componentMinderwertTables: {},
    percentageTables: {
        'minderwert_damage': [
            { label: 'Minor (Leicht)', value: 0.05 },
            { label: 'Medium (Mittel)', value: 0.10 },
            { label: 'Heavy (Schwer)', value: 0.20 }
        ],
        'maintenance_penalty': [
            { label: 'No Service (Keine Wartung)', value: 0.15 },
            { label: 'Late Service (Wartung überfällig)', value: 0.05 }
        ]
    },
    systemSettings: {
        primaryKeyDeduction: 100.0,
        spareKeyDeduction: 50.0,
        requiredPrimaryKeys: 2,
        requiredSpareKeys: 1
    },
    repairPositions: [
        { id: 'pos_hood', name: 'Hood', active: true },
        { id: 'pos_door', name: 'Door', active: true },
        { id: 'pos_fender', name: 'Fender', active: true },
        { id: 'pos_bumper', name: 'Bumper', active: true },
        { id: 'pos_roof', name: 'Roof', active: true }
    ],
    repairTypes: [
        { id: 'L', name: 'Painting (L)', active: true },
        { id: 'LI', name: 'Paintless (LI)', active: true },
        { id: 'IL', name: 'Repair + Painting (IL)', active: true }
    ],
    repairTable: [
        { id: 'rt_1', vehicleCategory: 'Compact', positionId: 'pos_hood', typeId: 'L', defaultAmount: 350, calculationRule: 'fixed', active: true },
        { id: 'rt_2', vehicleCategory: 'Compact', positionId: 'pos_hood', typeId: 'IL', defaultAmount: 550, calculationRule: 'fixed', active: true },
        { id: 'rt_3', vehicleCategory: 'Compact', positionId: 'pos_door', typeId: 'L', defaultAmount: 300, calculationRule: 'fixed', active: true },
        { id: 'rt_4', vehicleCategory: 'Mid-size', positionId: 'pos_hood', typeId: 'L', defaultAmount: 450, calculationRule: 'fixed', active: true },
        { id: 'rt_5', vehicleCategory: 'Mid-size', positionId: 'pos_door', typeId: 'L', defaultAmount: 400, calculationRule: 'fixed', active: true }
    ],
    damageTypes: [
        { value: '', labelDe: 'Bitte auswählen...', labelEn: 'Please select...' },
        { value: 'zerkratzt', labelDe: 'zerkratzt', labelEn: 'scratched' },
        { value: 'verbeult', labelDe: 'verbeult', labelEn: 'dented' },
        { value: 'lackieren', labelDe: 'lackieren', labelEn: 'repaint' },
        { value: 'erneuern', labelDe: 'erneuern', labelEn: 'replace' },
        { value: 'instandsetzen', labelDe: 'instandsetzen', labelEn: 'repair' },
        { value: 'Smart Repair', labelDe: 'Smart Repair', labelEn: 'Smart Repair' },
        { value: 'Gebrauchsspuren', labelDe: 'Gebrauchsspuren', labelEn: 'Signs of use' },
        { value: 'custom', labelDe: 'Eigenen Schaden hinzufügen...', labelEn: 'Add custom damage...' },
    ],
    estimateConfig: buildDefaultEstimateConfig([
        'Subcompact', 'Compact', 'Mid-size', 'Full-size', 'Luxury', 'Super Luxury / Sports'
    ])
};
