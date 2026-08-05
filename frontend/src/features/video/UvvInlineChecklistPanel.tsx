import React, { useMemo, useState } from 'react';
import { CheckCircle, XCircle, Loader2, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { completeUvv } from './videoApi';
import type { Order } from './videoTypes';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Status for normal items 1–51 */
type NormalStatus = 'OK' | 'DEFECT' | 'NA' | null;
/** Status for item 52 (Prüfentscheidung – betriebssicher) */
type Item52Status = 'YES' | 'NO' | 'CONDITIONAL' | null;
/** Status for item 53 (Wiedervorlage) */
type Item53Status = 'YES' | 'NO' | null;
/** Status for item 54 (Prüfperson) */
type Item54Status = 'OK' | 'DEFECT' | null;

type ItemState = Partial<Record<number, string | null>>;

// ─── Checklist Item Labels (DE) ──────────────────────────────────────────────

const CHECKLIST_ITEMS: Record<number, string> = {
    1: 'Fahrzeugdaten vollständig: Kennzeichen, FIN, Halter, Kilometerstand, Datum',
    2: 'Zulassungsbescheinigung / Fahrzeugpapiere vorhanden bzw. plausibel',
    3: 'HU gültig / Plakette geprüft',
    4: 'Kennzeichen vorne/hinten vorhanden, lesbar, fest',
    5: 'Allgemeiner Fahrzeugzustand ohne erkennbare sicherheitsrelevante Schäden',
    6: 'Karosserie ohne scharfe Kanten, lose Teile oder Unfallbeschädigungen',
    7: 'Türen, Hauben, Klappen, Scharniere und Schlösser funktionieren sicher',
    8: 'Scheiben ohne sicherheitsrelevante Risse/Steinschläge im Sichtfeld',
    9: 'Spiegel vorhanden, fest, unbeschädigt und einstellbar',
    10: 'Scheibenwischer funktionieren',
    11: 'Scheibenwaschanlage funktioniert, Waschflüssigkeit vorhanden',
    12: 'Beleuchtung vorne: Abblendlicht, Fernlicht, Standlicht',
    13: 'Beleuchtung hinten: Rücklicht, Bremslicht, Rückfahrscheinwerfer',
    14: 'Blinker und Warnblinkanlage funktionieren',
    15: 'Nebelschlussleuchte / Nebelscheinwerfer, soweit vorhanden',
    16: 'Reflektoren und Rückstrahler vorhanden und unbeschädigt',
    17: 'Hupe funktioniert',
    18: 'Bremsanlage funktional unauffällig, Pedalweg/Druckpunkt plausibel',
    19: 'Feststellbremse/Parkbremse funktioniert',
    20: 'Lenkung ohne auffälliges Spiel/Geräusche',
    21: 'Fahrwerk/Federung äußerlich ohne sicherheitsrelevante Auffälligkeiten',
    22: 'Reifen: Profiltiefe ausreichend',
    23: 'Reifen: keine Beschädigungen, Beulen, Risse, Fremdkörper',
    24: 'Reifen: richtige Dimension / Achsweise passend / Traglastplausibel',
    25: 'Reifendruck geprüft bzw. plausibel',
    26: 'Felgen/Räder ohne sichtbare Schäden, Radmuttern/Radschrauben unauffällig',
    27: 'Sicherheitsgurte vorhanden, funktionsfähig, keine Beschädigungen',
    28: 'Sitze, Sitzverstellung, Kopfstützen sicher und funktionsfähig',
    29: 'Airbag-/ABS-/ESP-/Bremskontrollleuchten ohne Fehleranzeige',
    30: 'Warndreieck vorhanden',
    31: 'Warnweste vorhanden',
    32: 'Verbandkasten vorhanden und nicht abgelaufen',
    33: 'Feuerlöscher vorhanden, soweit vorgeschrieben oder betrieblich gefordert',
    34: 'Ladungssicherungsmittel vorhanden und verwendbar, soweit Fahrzeug dafür genutzt wird',
    35: 'Zurrpunkte, Trennwände, Regaleinbauten, Verzurrschienen fest und unbeschädigt',
    36: 'Laderaum ohne lose, gefährliche oder ungesicherte Gegenstände',
    37: 'Anhängerkupplung, Steckdose, Sicherungseinrichtung geprüft, soweit vorhanden',
    38: 'Anhängerbetrieb: zulässige Anhänge-/Stützlast bekannt und Kennzeichnung plausibel',
    39: 'Elektrische Anlage/Batterie äußerlich sicher, keine losen Kabel oder Pole',
    40: 'Flüssigkeitsverluste: Motoröl, Kühlmittel, Bremsflüssigkeit, Kraftstoff, AdBlue',
    41: 'Motorraum ohne lose Teile, Undichtigkeiten oder Brandgefahr',
    42: 'Auspuffanlage fest, dicht, ohne gefährliche Beschädigung',
    43: 'Tankdeckel/Ladeanschluss sicher verschließbar',
    44: 'Bei Elektro-/Hybridfahrzeugen: Ladekabel vorhanden, unbeschädigt, korrekt gelagert',
    45: 'Bei Elektro-/Hybridfahrzeugen: Ladeanschluss/Klappe ohne Beschädigung',
    46: 'Fahrerassistenz-/Kamerasysteme äußerlich frei und funktionsfähig, soweit relevant',
    47: 'Rückfahrkamera/Parksensoren, soweit sicherheitsrelevant im Betrieb genutzt',
    48: 'Betriebliche Zusatzausstattung sicher befestigt, z. B. Werkzeug, Messgeräte, Regale',
    49: 'Sonderaufbauten, Hebebühnen, Ladebordwand, Kühlung etc. geprüft, soweit vorhanden',
    50: 'Probefahrt/Funktionsprüfung ohne sicherheitsrelevante Auffälligkeiten',
    51: 'Mängel dokumentiert und bewertet: gering / erheblich / verkehrsgefährdend',
    52: 'Prüfentscheidung: Fahrzeug betriebssicher',
    53: 'Wiedervorlage/Nachprüfung erforderlich',
    54: 'Prüfperson, Qualifikation, Datum, Unterschrift dokumentiert',
};

// ─── Item Blocks ─────────────────────────────────────────────────────────────

const BLOCKS = [
    { label: 'A – Fahrzeugdaten & Dokumente', items: [1, 2, 3, 4, 5] },
    { label: 'B – Karosserie & Verglasung', items: [6, 7, 8, 9, 10, 11] },
    { label: 'C – Beleuchtung & Signale', items: [12, 13, 14, 15, 16, 17] },
    { label: 'D – Bremsen, Lenkung, Fahrwerk', items: [18, 19, 20, 21] },
    { label: 'E – Reifen & Räder', items: [22, 23, 24, 25, 26] },
    { label: 'F – Innenraum & Sicherheit', items: [27, 28, 29] },
    { label: 'G – Ausrüstung & Zuladung', items: [30, 31, 32, 33, 34, 35, 36, 37, 38] },
    { label: 'H – Antrieb & Technik', items: [39, 40, 41, 42, 43, 44, 45] },
    { label: 'I – Assistenz & Sonderaufbauten', items: [46, 47, 48, 49, 50, 51] },
    { label: 'J – Prüfentscheid', items: [52, 53, 54] },
];

// ─── Summary Computation ─────────────────────────────────────────────────────

const CRITICAL_ITEMS = [18, 19, 20, 22, 23, 24, 25, 26];
const OCCUPATIONAL_ITEMS = [30, 31, 32, 33, 34, 35, 36, 48, 49];

function computeSummary(states: ItemState) {
    const getStatus = (n: number) => states[n] ?? null;

    const isDefect = (n: number) => getStatus(n) === 'DEFECT';

    const hasAnyDefect = Array.from({ length: 51 }, (_, i) => i + 1).some(isDefect);
    const hasCriticalDefect = CRITICAL_ITEMS.some(isDefect);
    const hasOccupationalDefect = OCCUPATIONAL_ITEMS.some(isDefect);
    const reinspection = states[53] === 'YES';

    const isSafe = !hasAnyDefect;
    const isRoad = !hasCriticalDefect;
    const isOccupational = !hasOccupationalDefect;
    const isDefectsFound = hasAnyDefect;
    const isContinued = !hasCriticalDefect;
    const isPassed = isSafe && !hasCriticalDefect;

    return { isSafe, isRoad, isOccupational, isDefectsFound, reinspection, isContinued, isPassed };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 3-state toggle for items 1–51: i.O. / Mangel / n.z. */
const NormalToggle = ({
    value, onChange
}: { value: NormalStatus; onChange: (v: NormalStatus) => void }) => {
    const options: { label: string; val: NormalStatus; active: string; inactive: string }[] = [
        {
            label: 'i.O.',
            val: 'OK',
            active: 'bg-green-600 text-white border-green-500',
            inactive: 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-primary)] hover:border-green-700 hover:text-green-400',
        },
        {
            label: 'Mangel',
            val: 'DEFECT',
            active: 'bg-red-600 text-white border-red-500',
            inactive: 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-primary)] hover:border-red-700 hover:text-red-400',
        },
        {
            label: 'n.z.',
            val: 'NA',
            active: 'bg-gray-600 text-white border-gray-500',
            inactive: 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-primary)] hover:border-gray-600 hover:text-gray-300',
        },
    ];

    return (
        <div className="flex gap-1 flex-shrink-0">
            {options.map(o => (
                <button
                    key={o.val}
                    type="button"
                    onClick={() => onChange(value === o.val ? null : o.val)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all cursor-pointer leading-tight ${value === o.val ? o.active : o.inactive}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
};

/** Toggle for item 52: Ja / Nein / mit Aufl. */
const Item52Toggle = ({
    value, onChange
}: { value: Item52Status; onChange: (v: Item52Status) => void }) => {
    const options: { label: string; val: Item52Status }[] = [
        { label: 'Ja', val: 'YES' },
        { label: 'Nein', val: 'NO' },
        { label: 'mit Aufl.', val: 'CONDITIONAL' },
    ];
    return (
        <div className="flex gap-1 flex-shrink-0 flex-wrap">
            {options.map(o => (
                <button
                    key={o.val}
                    type="button"
                    onClick={() => onChange(value === o.val ? null : o.val)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all cursor-pointer leading-tight ${
                        value === o.val
                            ? (o.val === 'YES' ? 'bg-green-600 text-white border-green-500' : o.val === 'CONDITIONAL' ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-red-600 text-white border-red-500')
                            : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-primary)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-secondary)]'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
};

/** Toggle for item 53: Ja / Nein */
const Item53Toggle = ({
    value, onChange
}: { value: Item53Status; onChange: (v: Item53Status) => void }) => {
    const options: { label: string; val: Item53Status }[] = [
        { label: 'Ja', val: 'YES' },
        { label: 'Nein', val: 'NO' },
    ];
    return (
        <div className="flex gap-1 flex-shrink-0">
            {options.map(o => (
                <button
                    key={o.val}
                    type="button"
                    onClick={() => onChange(value === o.val ? null : o.val)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all cursor-pointer leading-tight ${
                        value === o.val
                            ? (o.val === 'YES' ? 'bg-red-600 text-white border-red-500' : 'bg-green-600 text-white border-green-500')
                            : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-primary)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-secondary)]'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
};

/** Toggle for item 54: i.O. / Mangel */
const Item54Toggle = ({
    value, onChange
}: { value: Item54Status; onChange: (v: Item54Status) => void }) => {
    const options: { label: string; val: Item54Status }[] = [
        { label: 'i.O.', val: 'OK' },
        { label: 'Mangel', val: 'DEFECT' },
    ];
    return (
        <div className="flex gap-1 flex-shrink-0">
            {options.map(o => (
                <button
                    key={o.val}
                    type="button"
                    onClick={() => onChange(value === o.val ? null : o.val)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all cursor-pointer leading-tight ${
                        value === o.val
                            ? (o.val === 'OK' ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500')
                            : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-primary)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-secondary)]'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
};

// ─── Summary Table Row (read-only pill tabs) ─────────────────────────────────

interface SummaryRowProps {
    label: string;
    /** Each option label to display as a pill */
    options: string[];
    /** Index into options[] that is currently active/selected */
    activeIndex: number;
    /** Tailwind colour classes for the active pill: bg + text + border */
    activeColor: string;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, options, activeIndex, activeColor }) => (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-[var(--color-border-primary)] last:border-0">
        <span className="text-[10px] text-[var(--color-text-secondary)] flex-1 leading-snug min-w-0 pr-1">{label}</span>
        <div className="flex gap-1 flex-shrink-0">
            {options.map((opt, i) => (
                <span
                    key={opt}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border leading-tight select-none ${
                        i === activeIndex
                            ? activeColor
                            : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-primary)]'
                    }`}
                >
                    {opt}
                </span>
            ))}
        </div>
    </div>
);


// ─── Main Component ───────────────────────────────────────────────────────────

interface UvvInlineChecklistPanelProps {
    order: Order;
    roomId: string;
    onComplete: () => void;
}

export const UvvInlineChecklistPanel: React.FC<UvvInlineChecklistPanelProps> = ({
    order,
    roomId,
    onComplete,
}) => {
    const { t } = useTranslation();
    const [itemStates, setItemStates] = useState<ItemState>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setItem = (nr: number, val: string | null) => {
        setItemStates(prev => ({ ...prev, [nr]: val }));
    };

    const summary = useMemo(() => computeSummary(itemStates), [itemStates]);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const inspectorName = order.vehicleExpertName || t('uvv.checklist.inspector', { defaultValue: 'Sachverständiger' });
            const uvvResult = summary.isPassed ? 'PASSED' : 'FAILED';
            // Convert Partial<Record<number, string|null>> → Record<number, string|null>
            const checklistPayload = Object.fromEntries(
                Object.entries(itemStates)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => [Number(k), v as string | null])
            ) as Record<number, string | null>;
            await completeUvv(roomId, uvvResult, inspectorName, checklistPayload);

            if (typeof window !== 'undefined') {
                const channel = new BroadcastChannel('my-gutachter-sync');
                channel.postMessage({ type: 'UVV_COMPLETED', payload: { uvvResult } });
                channel.close();
            }
            onComplete();
        } catch (err) {
            console.error('[UVV] Submit failed:', err);
            alert(t('uvv.checklist.saveError', { defaultValue: 'Fehler beim Speichern. Bitte erneut versuchen.' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex-shrink-0">
                <ClipboardList size={16} className="text-[var(--color-primary-orange)] flex-shrink-0" />
                <div>
                    <h4 className="text-xs font-bold text-[var(--color-text-primary)]">UVV-Prüfliste</h4>
                    <p className="text-[9px] text-[var(--color-text-muted)] leading-tight">Prüfpunkte direkt im Video-Call erfassen</p>
                </div>
            </div>

            {/* Scrollable checklist */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-4">

                {BLOCKS.map(block => (
                    <div key={block.label}>
                        {/* Block header */}
                        <h5 className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--color-primary-orange)] border-b border-[var(--color-border-primary)] pb-1 mb-2">
                            {block.label}
                        </h5>

                        {/* Items in block */}
                        <div className="space-y-1.5">
                            {block.items.map(nr => {
                                const label = CHECKLIST_ITEMS[nr];
                                return (
                                    <div
                                        key={nr}
                                        className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${
                                            itemStates[nr] === 'DEFECT' || itemStates[nr] === 'NO'
                                                ? 'bg-red-50 border-red-200/50 dark:bg-red-950/20 dark:border-red-900/40'
                                                : itemStates[nr] === 'OK' || itemStates[nr] === 'YES'
                                                    ? 'bg-green-50 border-green-200/50 dark:bg-green-950/15 dark:border-green-900/30'
                                                    : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)]'
                                        }`}
                                    >
                                        {/* Item number */}
                                        <span className="text-[9px] font-bold text-[var(--color-text-muted)] w-4 flex-shrink-0 mt-0.5 text-right">
                                            {nr}.
                                        </span>
                                        {/* Label */}
                                        <span className="text-[10px] text-[var(--color-text-secondary)] flex-1 leading-snug min-w-0">
                                            {label}
                                        </span>
                                        {/* Toggle — render the correct variant */}
                                        {nr <= 51 && (
                                            <NormalToggle
                                                value={(itemStates[nr] as NormalStatus) ?? null}
                                                onChange={v => setItem(nr, v)}
                                            />
                                        )}
                                        {nr === 52 && (
                                            <Item52Toggle
                                                value={(itemStates[52] as Item52Status) ?? null}
                                                onChange={v => setItem(52, v)}
                                            />
                                        )}
                                        {nr === 53 && (
                                            <Item53Toggle
                                                value={(itemStates[53] as Item53Status) ?? null}
                                                onChange={v => setItem(53, v)}
                                            />
                                        )}
                                        {nr === 54 && (
                                            <Item54Toggle
                                                value={(itemStates[54] as Item54Status) ?? null}
                                                onChange={v => setItem(54, v)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* ── Inspection Summary (Table 3 mirror) ── */}
                <div className="mt-2">
                    <h5 className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--color-primary-orange)] border-b border-[var(--color-border-primary)] pb-1 mb-2">
                        Prüfergebnis (Zusammenfassung)
                    </h5>
                    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border-primary)] px-3 py-1 space-y-0">
                        <SummaryRow
                            label="Fahrzeug betriebssicher"
                            options={['Ja', 'Nein', 'mit Auflagen']}
                            activeIndex={summary.isSafe ? 0 : 1}
                            activeColor={summary.isSafe ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}
                        />
                        <SummaryRow
                            label="Verkehrssicherheit gegeben"
                            options={['Ja', 'Nein', 'n. prüfbar']}
                            activeIndex={summary.isRoad ? 0 : 1}
                            activeColor={summary.isRoad ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}
                        />
                        <SummaryRow
                            label="Arbeitssicherheit gegeben"
                            options={['Ja', 'Nein', 'n. prüfbar']}
                            activeIndex={summary.isOccupational ? 0 : 1}
                            activeColor={summary.isOccupational ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}
                        />
                        <SummaryRow
                            label="Mängel festgestellt"
                            options={['Nein', 'Ja, s. Mängelliste']}
                            activeIndex={summary.isDefectsFound ? 1 : 0}
                            activeColor={summary.isDefectsFound ? 'bg-red-600 text-white border-red-500' : 'bg-green-600 text-white border-green-500'}
                        />
                        <SummaryRow
                            label="Nachprüfung erforderlich"
                            options={['Nein', 'Ja']}
                            activeIndex={summary.reinspection ? 1 : 0}
                            activeColor={summary.reinspection ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-green-600 text-white border-green-500'}
                        />
                        <SummaryRow
                            label="Weiterbetrieb zulässig"
                            options={['Ja', 'Nein', 'eingeschränkt']}
                            activeIndex={summary.isContinued ? 0 : 1}
                            activeColor={summary.isContinued ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}
                        />
                    </div>
                </div>

                {/* ── Result Banner ── */}
                <div className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                    summary.isPassed
                        ? 'bg-green-100 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-700 dark:text-green-300'
                        : 'bg-red-100 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-700 dark:text-red-300'
                }`}>
                    {summary.isPassed
                        ? <CheckCircle size={20} className="flex-shrink-0" />
                        : <XCircle size={20} className="flex-shrink-0" />
                    }
                    <div>
                        <p className="text-xs font-extrabold tracking-wide">
                            {summary.isPassed ? '✅ BESTANDEN' : '❌ NICHT BESTANDEN'}
                        </p>
                        <p className="text-[9px] opacity-70 leading-tight">
                            {summary.isPassed
                                ? 'Fahrzeug ist betriebssicher – Zertifikat wird erstellt.'
                                : 'Mängel gefunden – Nachprüfung erforderlich.'}
                        </p>
                    </div>
                </div>

                {/* Spacer so submit button doesn't overlap last content */}
                <div className="h-4" />
            </div>

            {/* ── Submit Button (sticky at bottom) ── */}
            <div className="flex-shrink-0 p-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        summary.isPassed
                            ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
                    }`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Wird gespeichert…</span>
                        </>
                    ) : (
                        <>
                            {summary.isPassed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            <span>Prüfung abschließen</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
