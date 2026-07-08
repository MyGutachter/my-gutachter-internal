import React from 'react';
import { Camera, Trash2, Eye, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../videoConfig';

interface ReportSlotsPanelProps {
    order: any;
    savedScreenshots: Record<string, string>;
    onCapture: (slotId: string) => void;
    onDelete: (filename: string) => void;
    onView: (filename: string) => void;
}

const SLOTS_CONFIG = [
    {
        title: 'Step 2: Identifikation',
        slots: [
            { id: 'vin_number', label: 'FIN / Typenschild', labelEn: 'VIN / Type plate' },
            { id: 'Meter_reading', label: 'Kilometerstand / Tacho', labelEn: 'Odometer / Instrument cluster' },
            { id: 'next_hu', label: 'Nächste HU Plakette', labelEn: 'Next HU / Badge' },
            { id: 'keys_photo', label: 'Fahrzeugschlüssel', labelEn: 'Keys' }
        ]
    },
    {
        title: 'Step 3: Dokumentation',
        slots: [
            { id: 'docRegistration', label: 'Fahrzeugschein', labelEn: 'Registration Doc' },
            { id: 'docServiceBook', label: 'Serviceheft', labelEn: 'Service Book' },
            { id: 'docManual', label: 'Bedienungsanleitung', labelEn: 'Operating Manual' },
            { id: 'docBadge', label: 'Umweltplakette', labelEn: 'Environmental Badge' },
            { id: 'maintenance_images', label: 'Wartungsberichte', labelEn: 'Maintenance Docs' }
        ]
    },
    {
        title: 'Step 3: Ausrüstung & Reifen',
        slots: [
            { id: 'breakdown_kit', label: 'Pannenset', labelEn: 'Breakdown Kit' },
            { id: 'first_aid_kit', label: 'Verbandskasten', labelEn: 'First Aid Kit' },
            { id: 'warning_triangle', label: 'Warndreieck', labelEn: 'Warning Triangle' },
            { id: 'safety_vest', label: 'Warnweste', labelEn: 'Safety Vest' },
            { id: 'spare_tire', label: 'Ersatzrad', labelEn: 'Spare Tire' },
            { id: 'front_left_wheel', label: 'Reifen Vorne Links (VL)', labelEn: 'Tire Front Left' },
            { id: 'front_right_wheel', label: 'Reifen Vorne Rechts (VR)', labelEn: 'Tire Front Right' },
            { id: 'rear_right_wheel', label: 'Reifen Hinten Rechts (HR)', labelEn: 'Tire Rear Right' },
            { id: 'rear_left_wheel', label: 'Reifen Hinten Links (HL)', labelEn: 'Tire Rear Left' },
            { id: 'EV_charging_cover', label: 'Ladekabel (EV)', labelEn: 'Charging Cable' }
        ]
    },
    {
        title: 'Step 4: Pflichtaufnahmen & Übersichten',
        slots: [
            { id: 'Overview_diagonal_front_left', label: 'Übersicht Vorne Links', labelEn: 'Overview Front Left' },
            { id: 'Overview_diagonal_front_right', label: 'Übersicht Vorne Rechts', labelEn: 'Overview Front Right' },
            { id: 'Overview_diagonal_rear_left', label: 'Übersicht Hinten Links', labelEn: 'Overview Rear Left' },
            { id: 'Overview_diagonal_rear_right', label: 'Übersicht Hinten Rechts', labelEn: 'Overview Rear Right' },
            { id: 'left_sill', label: 'Schweller Links', labelEn: 'Sill Left' },
            { id: 'Right_sill', label: 'Schweller Rechts', labelEn: 'Sill Right' }
        ]
    }
];

export const ReportSlotsPanel: React.FC<ReportSlotsPanelProps> = ({
    order,
    savedScreenshots,
    onCapture,
    onDelete,
    onView
}) => {
    const getScreenshotFilename = (slotId: string): string | null => {
        const foundKey = Object.keys(savedScreenshots).find(
            key => key === slotId || key.startsWith(slotId + '_')
        );
        return foundKey ? savedScreenshots[foundKey] : null;
    };

    return (
        <div className="flex-1 flex flex-col p-4 pb-24 bg-dark-900 overflow-y-auto custom-scrollbar h-full space-y-5">
            <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-white tracking-wide">Fahrzeugbericht Foto-Slots</h4>
                <p className="text-[10px] text-gray-400">
                    Nehmen Sie Screenshots direkt für die spezifischen Abschnitte des Fahrzeugberichts auf.
                </p>
            </div>

            {SLOTS_CONFIG.map((group, groupIndex) => (
                <div key={groupIndex} className="flex flex-col gap-2 animate-fade-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                    <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-primary-orange)] border-b border-gray-800 pb-1">
                        {group.title}
                    </h5>
                    <div className="flex flex-col gap-2">
                        {group.slots.map((slot) => {
                            const filename = getScreenshotFilename(slot.id);
                            const hasImage = !!filename;

                            return (
                                <div
                                    key={slot.id}
                                    className="flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-dark-950/45 hover:bg-dark-950/90 transition-all gap-3 group"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {hasImage ? (
                                            <div className="relative w-12 h-9 rounded-lg overflow-hidden border border-gray-700 bg-black flex-shrink-0">
                                                <img
                                                    src={`${API_BASE_URL}/screenshots/${order.id}/${filename}`}
                                                    alt={slot.label}
                                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={() => onView(filename)}
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                                                    <Eye size={10} className="text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-12 h-9 rounded-lg border border-dashed border-gray-800 flex items-center justify-center text-gray-700 bg-dark-900/50 flex-shrink-0">
                                                <Camera size={14} />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-white truncate block">
                                                    {slot.label}
                                                </span>
                                                {hasImage && (
                                                    <CheckCircle size={10} className="text-green-500 flex-shrink-0 animate-scale-in" />
                                                )}
                                            </div>
                                            <span className="text-[9px] text-gray-500 truncate block">
                                                {slot.labelEn}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {hasImage ? (
                                            <>
                                                <button
                                                    onClick={() => onView(filename)}
                                                    className="p-1.5 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-lg transition-colors cursor-pointer"
                                                    title="Anzeigen"
                                                >
                                                    <Eye size={12} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(filename)}
                                                    className="p-1.5 bg-red-950/30 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all cursor-pointer border border-red-950/50 hover:border-red-600"
                                                    title="Löschen"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => onCapture(slot.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange)]/90 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm cursor-pointer"
                                            >
                                                <Camera size={12} />
                                                <span>Aufnehmen</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
