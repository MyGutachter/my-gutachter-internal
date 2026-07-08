export interface Debtor {
    number: string;
    name: string;
    address: string;
    netRate: number;       // EUR/h netto
    grossRate: number;     // EUR/h brutto (net × 1.19)
    lackberechnungsart: 'AZT' | 'Hersteller';
}

/**
 * Sample debtor database matching the XLS Debitoren sheet structure.
 * Sorted ascending by debtor number as required by the spec.
 */
export const DEBTORS: Debtor[] = [
    { number: '10001', name: 'LeasePlan Deutschland GmbH', address: 'Lippestraße 4, 40221 Düsseldorf', netRate: 112.50, grossRate: 133.88, lackberechnungsart: 'AZT' },
    { number: '10002', name: 'ALD Automotive', address: 'Nedderfeld 95, 22529 Hamburg', netRate: 115.00, grossRate: 136.85, lackberechnungsart: 'AZT' },
    { number: '10003', name: 'Arval Deutschland GmbH', address: 'Ammerthalstraße 7, 85551 Kirchheim', netRate: 118.00, grossRate: 140.42, lackberechnungsart: 'Hersteller' },
    { number: '10004', name: 'Alphabet Fuhrparkmanagement GmbH', address: 'Lilienthalallee 26, 80939 München', netRate: 120.00, grossRate: 142.80, lackberechnungsart: 'Hersteller' },
    { number: '10005', name: 'Athlon Germany GmbH', address: 'Theodor-Heuss-Ring 1, 50668 Köln', netRate: 110.00, grossRate: 130.90, lackberechnungsart: 'AZT' },
    { number: '10006', name: 'Deutsche Leasing Fleet GmbH', address: 'Frölingstraße 15-31, 61352 Bad Homburg', netRate: 125.00, grossRate: 148.75, lackberechnungsart: 'AZT' },
    { number: '10007', name: 'Sixt Leasing SE', address: 'Zugspitzstraße 1, 82049 Pullach', netRate: 130.00, grossRate: 154.70, lackberechnungsart: 'Hersteller' },
    { number: '10008', name: 'Volkswagen Leasing GmbH', address: 'Gifhorner Straße 57, 38112 Braunschweig', netRate: 135.00, grossRate: 160.65, lackberechnungsart: 'Hersteller' },
    { number: '10009', name: 'BMW Financial Services', address: 'Lilienthalallee 26, 80939 München', netRate: 140.00, grossRate: 166.60, lackberechnungsart: 'Hersteller' },
    { number: '10010', name: 'Mercedes-Benz Leasing', address: 'Siemensstraße 7, 70469 Stuttgart', netRate: 149.90, grossRate: 178.38, lackberechnungsart: 'Hersteller' },
];

export function findDebtor(number: string): Debtor | undefined {
    return DEBTORS.find(d => d.number === number);
}

export function getDebtorOptions(): { value: string; label: string }[] {
    return [
        { value: '', label: '–' },
        ...DEBTORS.map(d => ({
            value: d.number,
            label: `${d.number} — ${d.name}`,
        })),
    ];
}
