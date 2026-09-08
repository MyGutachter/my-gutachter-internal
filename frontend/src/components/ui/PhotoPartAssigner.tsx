import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, MapPin, Plus, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useReportStore } from '../../store/reportStore';
import { BODY_PARTS, INTERIOR_PARTS, getBodyPartLabel } from '../../constants/bodyParts';

export interface PhotoPartAssignerProps {
    photoId: string;
    photoData: string;
    targetComponentId?: string;
    targetComponentName?: string;
    compact?: boolean;
    className?: string;
}

export const PhotoPartAssigner: React.FC<PhotoPartAssignerProps> = ({
    photoId,
    photoData,
    targetComponentId,
    targetComponentName,
    compact = false,
    className = ''
}) => {
    const { t, i18n } = useTranslation();
    const lang = (i18n.language || 'de') as 'de' | 'en';
    const store = useReportStore();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownCoords, setDropdownCoords] = useState<{
        top?: number;
        bottom?: number;
        left: number;
        width: number;
    } | null>(null);

    // Calculate popover coords so it opens outside the card, floating above/below
    const updateCoords = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
            setIsDropdownOpen(false);
            return;
        }
        const popoverWidth = Math.max(280, rect.width);
        const popoverHeight = 340;
        const spaceBelow = window.innerHeight - rect.bottom;
        const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

        let left = rect.left;
        if (left + popoverWidth > window.innerWidth - 12) {
            left = window.innerWidth - popoverWidth - 12;
        }
        if (left < 12) left = 12;

        if (placeAbove) {
            setDropdownCoords({
                bottom: window.innerHeight - rect.top + 6,
                left,
                width: popoverWidth,
            });
        } else {
            setDropdownCoords({
                top: rect.bottom + 6,
                left,
                width: popoverWidth,
            });
        }
    };

    // Close dropdown on outside click or reposition on scroll/resize
    useEffect(() => {
        if (!isDropdownOpen) {
            setDropdownCoords(null);
            return;
        }

        updateCoords();

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (buttonRef.current && buttonRef.current.contains(target)) return;
            if (dropdownRef.current && dropdownRef.current.contains(target)) return;
            setIsDropdownOpen(false);
        };

        const handleScrollOrResize = () => {
            updateCoords();
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isDropdownOpen]);

    // Get current assignments for this photo - always prefer photoData as it matches minderwertRows/damages images array
    const assignments = useMemo(() => {
        return store.getPhotoAssignments(photoData || photoId);
    }, [store.getPhotoAssignments, store.minderwertRows, store.damages, store.photos, photoId, photoData]);

    const assignedKeys = useMemo(() => {
        const set = new Set<string>();
        assignments.forEach(a => {
            if (a.id) set.add(a.id);
            if (a.bodyPart) set.add(a.bodyPart);
        });
        return set;
    }, [assignments]);

    const isAssignedToTarget = useMemo(() => {
        if (!targetComponentId) return false;
        return assignedKeys.has(targetComponentId);
    }, [assignedKeys, targetComponentId]);

    // Handle toggle for any part
    const handleTogglePart = (partId: string, partName: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        store.togglePhotoComponentAssignment(photoData || photoId, partId);

        const wasAssigned = assignedKeys.has(partId);
        if (wasAssigned) {
            toast.success(t('step4.unassignedFromPart', { part: partName, defaultValue: `Zuweisung für ${partName} entfernt` }));
        } else {
            toast.success(t('step4.assignedToPart', { part: partName, defaultValue: `Zugewiesen an: ${partName}` }));
        }
    };

    // Handle quick remove for a specific assignment badge
    const handleRemoveBadge = (assignmentKey: string, partName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        store.unassignPhotoFromComponent(photoData || photoId, assignmentKey);
        toast.success(t('step4.unassignedFromPart', { part: partName, defaultValue: `Zuweisung für ${partName} entfernt` }));
    };

    // 1. Filter standard body parts (Karosserieteile)
    const filteredBodyParts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return BODY_PARTS.map(part => {
            const label = t(`bodyParts.${part.id}`, lang === 'de' ? part.labelDe : part.labelEn);
            return { id: part.id, label };
        }).filter(item => !query || item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
    }, [searchQuery, lang, t]);

    // 2. Filter dynamic positions (Zusätzliche Positionen)
    const filteredDynamicPositions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const positions = typeof store.getEffectiveRepairPositions === 'function'
            ? store.getEffectiveRepairPositions().filter(p => p.active)
            : [];
        return positions.map(p => {
            const label = t(`bodyParts.${p.id}`, p.name);
            return { id: p.id, label };
        }).filter(item => !query || item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
    }, [store, searchQuery, t]);

    // 3. Filter interior parts (Innenraum)
    const filteredInteriorParts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return INTERIOR_PARTS.map(p => {
            const label = lang === 'de' ? p.labelDe : p.labelEn;
            return { id: p.id, label };
        }).filter(item => !query || item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
    }, [searchQuery, lang]);

    // 4. Filter custom damages (Schäden)
    const filteredDamages = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return (store.damages || []).map((d, index) => {
            let label = '';
            if (d.bodyPart) {
                label = t(`bodyParts.${d.bodyPart}`, getBodyPartLabel(d.bodyPart, lang) || d.bodyPart);
            } else if (d.description && d.description.trim()) {
                label = d.description.trim();
            } else {
                label = `${t('step4.damageDesc', 'Schaden')} ${index + 1}`;
            }
            return { id: d.id, label };
        }).filter(item => !query || item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
    }, [store.damages, searchQuery, lang, t]);

    return (
        <div className={`relative flex flex-col gap-1.5 ${className}`}>
            {/* Quick Toggle Button for Target Component if provided */}
            {targetComponentId && targetComponentName && (
                <button
                    type="button"
                    onClick={(e) => handleTogglePart(targetComponentId, targetComponentName, e)}
                    className={`w-full text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs ${isAssignedToTarget
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                            : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 active:scale-95'
                        }`}
                >
                    {isAssignedToTarget ? (
                        <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span className="truncate">{t('step4.assignedToPart', { part: targetComponentName, defaultValue: `✓ ${targetComponentName}` })}</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-3 h-3 stroke-[3]" />
                            <span className="truncate">{t('step4.assignToPart', { part: targetComponentName, defaultValue: `+ An ${targetComponentName}` })}</span>
                        </>
                    )}
                </button>
            )}

            {/* List of currently assigned badges */}
            <div className="flex flex-wrap items-center gap-1">
                {assignments.length > 0 ? (
                    assignments.map((a, idx) => {
                        const partKey = a.id || a.bodyPart;
                        const partName = a.bodyPart
                            ? t(`bodyParts.${a.bodyPart}`, getBodyPartLabel(a.bodyPart, lang) || a.bodyPart)
                            : (a.label && !a.label.includes('-') ? a.label : t('step4.damageDesc', 'Schaden'));
                        const isTarget = targetComponentId && (a.id === targetComponentId || a.bodyPart === targetComponentId);

                        return (
                            <span
                                key={`${partKey}_${idx}`}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${isTarget
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-primary/10 text-primary border-primary/25'
                                    }`}
                                title={partName}
                            >
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate max-w-[110px]">{partName}</span>
                                <button
                                    type="button"
                                    onClick={(e) => handleRemoveBadge(partKey, partName, e)}
                                    className="p-0.5 hover:bg-black/10 rounded-full transition-colors flex-shrink-0"
                                    title={t('step4.removeAssignment', 'Zuweisung entfernen')}
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        );
                    })
                ) : (
                    <span className="text-[9px] text-gray-400 italic">
                        {t('step4.unassigned', '— Nicht zugewiesen —')}
                    </span>
                )}
            </div>

            {/* Trigger Button to show parts dropdown */}
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(prev => !prev);
                }}
                className={`flex items-center justify-between gap-1 px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-lg text-gray-700 text-[10px] font-semibold transition-all shadow-2xs ${isDropdownOpen ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''
                    }`}
                title={t('step4.assignToParts', 'Bauteile zuweisen')}
            >
                <span className="flex items-center gap-1 truncate">
                    <Plus className="w-3 h-3 text-primary" />
                    <span>{t('step4.assignToParts', 'Bauteile zuweisen')}</span>
                    {assignments.length > 0 && (
                        <span className="ml-1 text-[9px] font-bold bg-primary text-white rounded-full px-1.5 py-0.2">
                            {assignments.length}
                        </span>
                    )}
                </span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Popover rendered outside the card using createPortal */}
            {isDropdownOpen && dropdownCoords && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        top: dropdownCoords.top !== undefined ? `${dropdownCoords.top}px` : 'auto',
                        bottom: dropdownCoords.bottom !== undefined ? `${dropdownCoords.bottom}px` : 'auto',
                        left: `${dropdownCoords.left}px`,
                        width: `${dropdownCoords.width}px`,
                        zIndex: 10005,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/10"
                >
                    {/* Header & Search */}
                    <div className="flex items-center justify-between gap-1 pb-1 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-primary" />
                            {t('step4.assignToParts', 'Bauteile zuweisen')}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDropdownOpen(false);
                            }}
                            className="text-xs font-bold text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-400" />
                        <input
                            type="text"
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('step4.searchParts', 'Bauteil suchen...')}
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-primary text-gray-800 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 p-0.5 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Scrollable list of parts grouped matching Step4 dropdown */}
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-gray-100 custom-scrollbar">
                        {/* 1. Karosserieteile (Standard Body Parts) */}
                        {filteredBodyParts.length > 0 && (
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 py-0.5">
                                    {t('step4.bodyParts', 'Karosserieteile')}
                                </div>
                                {filteredBodyParts.map(part => {
                                    const isAssigned = assignedKeys.has(part.id);
                                    return (
                                        <div
                                            key={part.id}
                                            onClick={(e) => handleTogglePart(part.id, part.label, e)}
                                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all ${isAssigned
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <span className="truncate pr-2">{part.label}</span>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${isAssigned
                                                    ? 'bg-primary border-primary text-white shadow-xs'
                                                    : 'border-gray-300 bg-white'
                                                }`}>
                                                {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. Zusätzliche Positionen (Dynamic Positions) */}
                        {filteredDynamicPositions.length > 0 && (
                            <div className="pt-2 space-y-1">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 py-0.5">
                                    {t('step4.dynamicPositions', 'Zusätzliche Positionen')}
                                </div>
                                {filteredDynamicPositions.map(p => {
                                    const isAssigned = assignedKeys.has(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={(e) => handleTogglePart(p.id, p.label, e)}
                                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all ${isAssigned
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <span className="truncate pr-2">{p.label}</span>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${isAssigned
                                                    ? 'bg-primary border-primary text-white shadow-xs'
                                                    : 'border-gray-300 bg-white'
                                                }`}>
                                                {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 3. Innenraum (Interior Parts) */}
                        {filteredInteriorParts.length > 0 && (
                            <div className="pt-2 space-y-1">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 py-0.5">
                                    {t('step4.interiorParts', 'Innenraum')}
                                </div>
                                {filteredInteriorParts.map(p => {
                                    const isAssigned = assignedKeys.has(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={(e) => handleTogglePart(p.id, p.label, e)}
                                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all ${isAssigned
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <span className="truncate pr-2">{p.label}</span>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${isAssigned
                                                    ? 'bg-primary border-primary text-white shadow-xs'
                                                    : 'border-gray-300 bg-white'
                                                }`}>
                                                {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 4. Schäden (Custom Damages) */}
                        {filteredDamages.length > 0 && (
                            <div className="pt-2 space-y-1">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 py-0.5">
                                    {t('step4.addDamage', 'Schäden')}
                                </div>
                                {filteredDamages.map(d => {
                                    const isAssigned = assignedKeys.has(d.id);
                                    return (
                                        <div
                                            key={d.id}
                                            onClick={(e) => handleTogglePart(d.id, d.label, e)}
                                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all ${isAssigned
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <span className="truncate pr-2">{d.label}</span>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${isAssigned
                                                    ? 'bg-primary border-primary text-white shadow-xs'
                                                    : 'border-gray-300 bg-white'
                                                }`}>
                                                {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {filteredBodyParts.length === 0 &&
                            filteredDynamicPositions.length === 0 &&
                            filteredInteriorParts.length === 0 &&
                            filteredDamages.length === 0 && (
                                <p className="text-xs text-gray-400 px-2 py-3 text-center">Keine Bauteile gefunden</p>
                            )}
                    </div>

                    {/* Footer with Part count & Done button */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 font-medium">
                            <strong className="text-gray-900">{assignments.length}</strong> {t('step4.assignedPartsCount', { count: assignments.length, defaultValue: `${assignments.length} Bauteil(e)` })}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDropdownOpen(false);
                            }}
                            className="bg-gray-900 hover:bg-black text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{t('common.done', 'Fertig')}</span>
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PhotoPartAssigner;
