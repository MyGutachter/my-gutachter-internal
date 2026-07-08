export interface DamageTypeOption {
    value: string;
    labelDe: string;
    labelEn: string;
}

export const DAMAGE_TYPES: DamageTypeOption[] = [
    { value: '', labelDe: 'Bitte auswählen...', labelEn: 'Please select...' },
    { value: 'custom', labelDe: 'Eigenen Schaden hinzufügen...', labelEn: 'Add custom damage...' },
];

export const REPAIR_METHODS: DamageTypeOption[] = [
    { value: '', labelDe: 'Bitte auswählen...', labelEn: 'Please select...' },
    { value: 'lackieren', labelDe: 'lackieren', labelEn: 'repaint' },
    { value: 'reparieren', labelDe: 'reparieren', labelEn: 'repair' },
    { value: 'ersetzen', labelDe: 'ersetzen', labelEn: 'replace' },
    { value: 'polieren', labelDe: 'polieren', labelEn: 'polish' },
    { value: 'Lackvorbereitung', labelDe: 'Lackvorbereitung', labelEn: 'paint preparation' },
    { value: 'ausbeulen', labelDe: 'ausbeulen', labelEn: 'dent removal' },
    { value: 'Smart Repair', labelDe: 'Smart Repair', labelEn: 'Smart Repair' },
    { value: 'erneuern', labelDe: 'erneuern', labelEn: 'replace/renew' },
    { value: 'instandsetzen', labelDe: 'instandsetzen', labelEn: 'restore' },
    { value: 'prüfen', labelDe: 'prüfen und Befund', labelEn: 'inspect and assess' },
    { value: 'reinigen', labelDe: 'reinigen', labelEn: 'clean' },
    { value: 'Scheibe erneuern', labelDe: 'Scheibe erneuern', labelEn: 'Replace windshield' },
];

export const ANRECHNUNG_OPTIONS = [
    { value: 'voll', labelDe: 'voll', labelEn: 'full' },
    { value: 'anteilig', labelDe: 'anteilig', labelEn: 'proportional' },
    { value: 'keine', labelDe: 'Keine Kosten', labelEn: 'No costs' },
    { value: 'informational', labelDe: 'Nur Info (Altschaden)', labelEn: 'Info only (Known damage)' },
];

export const CONCERN_TYPES = [
    { value: 'Unfallschaden', labelDe: 'Unfallschaden', labelEn: 'Accident damage' },
    { value: 'Wertermittlung', labelDe: 'Wertermittlung', labelEn: 'Valuation' },
    { value: 'Händlerauftrag', labelDe: 'Händlerauftrag', labelEn: 'Dealer order' },
];
