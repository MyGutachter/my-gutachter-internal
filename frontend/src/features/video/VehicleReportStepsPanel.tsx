import React, { useState } from 'react';
import { Camera, Eye, Trash2, CheckCircle, ChevronDown, ChevronUp, Car, FileText, ShieldCheck, Image, ClipboardCheck } from 'lucide-react';
import { API_BASE_URL } from './videoConfig';
import type { Order } from './videoTypes';

interface VehicleReportStepsPanelProps {
    order: Order | null;
    roomId: string;
    savedScreenshots: Record<string, string>;
    onCapture: (slotId: string) => void;
    onDelete: (filename: string) => void;
    onView: (filename: string) => void;
}

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
    {
        id: 'step1',
        label: 'Schritt 1 – Fahrzeugdaten',
        icon: Car,
        type: 'fields' as const,
    },
    {
        id: 'step2',
        label: 'Schritt 2 – Identifikation',
        icon: FileText,
        type: 'slots' as const,
        slots: [
            { id: 'vin_number', label: 'FIN / Typenschild', labelEn: 'VIN / Type plate' },
            { id: 'Meter_reading', label: 'Kilometerstand / Tacho', labelEn: 'Odometer' },
            { id: 'next_hu', label: 'Nächste HU Plakette', labelEn: 'Next HU Badge' },
            { id: 'keys_photo', label: 'Fahrzeugschlüssel', labelEn: 'Keys' },
        ],
    },
    {
        id: 'step3',
        label: 'Schritt 3 – Dokumente & Ausrüstung',
        icon: ShieldCheck,
        type: 'slots' as const,
        slots: [
            { id: 'docRegistration', label: 'Fahrzeugschein', labelEn: 'Registration Doc' },
            { id: 'docServiceBook', label: 'Serviceheft', labelEn: 'Service Book' },
            { id: 'docManual', label: 'Bedienungsanleitung', labelEn: 'Operating Manual' },
            { id: 'docBadge', label: 'Umweltplakette', labelEn: 'Environmental Badge' },
            { id: 'maintenance_images', label: 'Wartungsberichte', labelEn: 'Maintenance Docs' },
            { id: 'breakdown_kit', label: 'Pannenset', labelEn: 'Breakdown Kit' },
            { id: 'first_aid_kit', label: 'Verbandskasten', labelEn: 'First Aid Kit' },
            { id: 'warning_triangle', label: 'Warndreieck', labelEn: 'Warning Triangle' },
            { id: 'safety_vest', label: 'Warnweste', labelEn: 'Safety Vest' },
            { id: 'spare_tire', label: 'Ersatzrad', labelEn: 'Spare Tire' },
            { id: 'EV_charging_cover', label: 'Ladekabel (EV)', labelEn: 'Charging Cable' },
        ],
    },
    {
        id: 'step4',
        label: 'Schritt 4 – Pflichtaufnahmen',
        icon: Image,
        type: 'slots' as const,
        slots: [
            { id: 'Overview_diagonal_front_left', label: 'Übersicht Vorne Links', labelEn: 'Overview Front Left' },
            { id: 'Overview_diagonal_front_right', label: 'Übersicht Vorne Rechts', labelEn: 'Overview Front Right' },
            { id: 'Overview_diagonal_rear_left', label: 'Übersicht Hinten Links', labelEn: 'Overview Rear Left' },
            { id: 'Overview_diagonal_rear_right', label: 'Übersicht Hinten Rechts', labelEn: 'Overview Rear Right' },
            { id: 'left_sill', label: 'Schweller Links', labelEn: 'Sill Left' },
            { id: 'Right_sill', label: 'Schweller Rechts', labelEn: 'Sill Right' },
            { id: 'front_left_wheel', label: 'Reifen Vorne Links (VL)', labelEn: 'Tire Front Left' },
            { id: 'front_right_wheel', label: 'Reifen Vorne Rechts (VR)', labelEn: 'Tire Front Right' },
            { id: 'rear_right_wheel', label: 'Reifen Hinten Rechts (HR)', labelEn: 'Tire Rear Right' },
            { id: 'rear_left_wheel', label: 'Reifen Hinten Links (HL)', labelEn: 'Tire Rear Left' },
        ],
    },
    {
        id: 'step5',
        label: 'Schritt 5 – Ergebnis & Abschluss',
        icon: ClipboardCheck,
        type: 'summary' as const,
    },
];

// ─── Field Row ────────────────────────────────────────────────────────────────

const FieldRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex items-start gap-2 py-2 border-b border-[var(--color-border-primary)] last:border-0">
        <span className="text-[10px] font-bold text-[var(--color-text-secondary)] w-28 flex-shrink-0 leading-snug">{label}</span>
        <span className="text-[10px] text-[var(--color-text-primary)] flex-1 leading-snug break-words">
            {value || <span className="text-[var(--color-text-secondary)] italic">—</span>}
        </span>
    </div>
);

// ─── Slot Row ─────────────────────────────────────────────────────────────────

const SlotRow = ({
    slot,
    filename,
    roomId,
    onCapture,
    onDelete,
    onView,
}: {
    slot: { id: string; label: string; labelEn: string };
    filename: string | null;
    roomId: string;
    onCapture: () => void;
    onDelete: (f: string) => void;
    onView: (f: string) => void;
}) => (
    <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]/30 hover:bg-[var(--color-bg-hover)] transition-all gap-2 group">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {filename ? (
                <div className="relative w-10 h-8 rounded-lg overflow-hidden border border-[var(--color-border-secondary)] bg-black flex-shrink-0">
                    <img
                        src={`${API_BASE_URL}/screenshots/${roomId}/${filename}`}
                        alt={slot.label}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => onView(filename)}
                    />
                </div>
            ) : (
                <div className="w-10 h-8 rounded-lg border border-dashed border-[var(--color-border-primary)] flex items-center justify-center text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] flex-shrink-0">
                    <Camera size={12} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[var(--color-text-primary)] truncate">{slot.label}</span>
                    {filename && <CheckCircle size={9} className="text-green-500 flex-shrink-0 animate-scale-in" />}
                </div>
                <span className="text-[9px] text-[var(--color-text-secondary)] truncate block">{slot.labelEn}</span>
            </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
            {filename ? (
                <>
                    <button
                        onClick={() => onView(filename)}
                        className="p-1.5 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] rounded-lg transition-colors cursor-pointer"
                        title="Anzeigen"
                    >
                        <Eye size={11} />
                    </button>
                    <button
                        onClick={() => onDelete(filename)}
                        className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white dark:bg-red-950/30 dark:hover:bg-red-600 dark:text-red-400 dark:hover:text-white rounded-lg transition-all cursor-pointer border border-red-100 hover:border-red-600 dark:border-red-950/50 dark:hover:border-red-600"
                        title="Löschen"
                    >
                        <Trash2 size={11} />
                    </button>
                </>
            ) : (
                <button
                    onClick={onCapture}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange)]/90 text-white rounded-lg text-[9px] font-bold transition-all shadow-sm cursor-pointer"
                >
                    <Camera size={11} />
                    <span>Aufnehmen</span>
                </button>
            )}
        </div>
    </div>
);

// ─── Step Accordion ───────────────────────────────────────────────────────────

const StepAccordion: React.FC<{
    step: typeof STEPS[number];
    order: Order | null;
    roomId: string;
    savedScreenshots: Record<string, string>;
    onCapture: (slotId: string) => void;
    onDelete: (filename: string) => void;
    onView: (filename: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}> = ({ step, order, roomId, savedScreenshots, onCapture, onDelete, onView, isOpen, onToggle }) => {
    const Icon = step.icon;

    const getFilename = (slotId: string): string | null => {
        const key = Object.keys(savedScreenshots).find(
            k => k === slotId || k.startsWith(slotId + '_')
        );
        return key ? savedScreenshots[key] : null;
    };

    // Count captured slots for badge
    let capturedCount = 0;
    let totalSlots = 0;
    if (step.type === 'slots') {
        totalSlots = step.slots.length;
        capturedCount = step.slots.filter(s => getFilename(s.id) !== null).length;
    }

    return (
        <div className="border border-[var(--color-border-primary)] rounded-xl overflow-hidden">
            {/* Step Header */}
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer text-left"
            >
                <Icon size={14} className="text-[var(--color-primary-orange)] flex-shrink-0" />
                <span className="text-[11px] font-bold text-[var(--color-text-primary)] flex-1">{step.label}</span>
                {step.type === 'slots' && totalSlots > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        capturedCount === totalSlots
                            ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30'
                            : capturedCount > 0
                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30'
                                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-transparent'
                    }`}>
                        {capturedCount}/{totalSlots}
                    </span>
                )}
                {isOpen ? (
                    <ChevronUp size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                ) : (
                    <ChevronDown size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                )}
            </button>

            {/* Step Content */}
            {isOpen && (
                <div className="p-3 bg-[var(--color-bg-card)] space-y-2">
                    {step.type === 'fields' && (
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg px-3 py-1">
                            <FieldRow label="Kennzeichen" value={order?.licensePlateNumber} />
                            <FieldRow label="FIN / VIN" value={order?.vinNumber} />
                            <FieldRow label="Marke" value={order?.vehicleMake} />
                            <FieldRow label="Modell" value={order?.vehicleModel} />
                            <FieldRow label="Kilometerstand" value={order?.mileage ? `${order.mileage.toLocaleString('de-DE')} km` : null} />
                            <FieldRow label="Erstzulassung" value={order?.lastVehicleInspectionDate} />
                            <FieldRow label="Firmenname" value={order?.companyName} />
                            <FieldRow label="Ansprechpartner" value={order?.contactPersonName} />
                            <FieldRow label="Auftragsnummer" value={order?.auftragsnummer || order?.caseNumber} />
                        </div>
                    )}

                    {step.type === 'slots' && (
                        <div className="space-y-1.5">
                            {(step as { slots: { id: string; label: string; labelEn: string }[] }).slots.map(slot => (
                                <SlotRow
                                    key={slot.id}
                                    slot={slot}
                                    filename={getFilename(slot.id)}
                                    roomId={roomId}
                                    onCapture={() => onCapture(slot.id)}
                                    onDelete={onDelete}
                                    onView={onView}
                                />
                            ))}
                        </div>
                    )}

                    {step.type === 'summary' && (
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg px-3 py-2 space-y-0">
                            <FieldRow label="UVV Ergebnis" value={
                                order?.uvvResult === 'PASSED' ? '✅ Bestanden'
                                : order?.uvvResult === 'FAILED' ? '❌ Nicht bestanden'
                                : 'Noch nicht abgeschlossen'
                            } />
                            <FieldRow label="Prüfdatum" value={order?.uvvInspectionDate} />
                            <FieldRow label="Sachverständiger" value={order?.vehicleExpertName} />
                            <FieldRow label="Status" value={
                                order?.uvvCertificateAvailable ? '📄 Zertifikat verfügbar' : 'Kein Zertifikat'
                            } />
                            {!order?.uvvResult && (
                                <p className="text-[9px] text-[var(--color-text-secondary)] italic pt-2">
                                    Wechseln Sie zum Tab „UVV Liste" um die Prüfung abzuschließen.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const VehicleReportStepsPanel: React.FC<VehicleReportStepsPanelProps> = ({
    order,
    roomId,
    savedScreenshots,
    onCapture,
    onDelete,
    onView,
}) => {
    // Start with first two steps open
    const [openSteps, setOpenSteps] = useState<Set<string>>(new Set(['step1', 'step2']));

    const toggleStep = (id: string) => {
        setOpenSteps(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Total photo progress
    const allSlots = STEPS.filter(s => s.type === 'slots').flatMap(s => (s as any).slots);
    const totalPhotos = allSlots.length;
    const capturedPhotos = allSlots.filter((slot: { id: string }) => {
        const key = Object.keys(savedScreenshots).find(k => k === slot.id || k.startsWith(slot.id + '_'));
        return !!key;
    }).length;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex-shrink-0">
                <div>
                    <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Fahrzeugbericht</h4>
                    <p className="text-[9px] text-[var(--color-text-secondary)] leading-tight">5-Schritte Bericht parallel zum Video-Call</p>
                </div>
                {/* Photo progress badge */}
                <div className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border ${
                    capturedPhotos === totalPhotos && totalPhotos > 0
                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-transparent'
                }`}>
                    <Camera size={10} />
                    <span>{capturedPhotos}/{totalPhotos} Fotos</span>
                </div>
            </div>

            {/* Accordion steps */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {STEPS.map(step => (
                    <StepAccordion
                        key={step.id}
                        step={step}
                        order={order}
                        roomId={roomId}
                        savedScreenshots={savedScreenshots}
                        onCapture={onCapture}
                        onDelete={onDelete}
                        onView={onView}
                        isOpen={openSteps.has(step.id)}
                        onToggle={() => toggleStep(step.id)}
                    />
                ))}
                <div className="h-4" />
            </div>
        </div>
    );
};
