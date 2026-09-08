import React, { useMemo } from 'react';
import { Check, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ModalWrapper from './ModalWrapper';
import SecureImage from './SecureImage';
import PhotoPartAssigner from './PhotoPartAssigner';
import { useReportStore } from '../../store/reportStore';
import { getBodyPartLabel } from '../../constants/bodyParts';

interface AssignPhotosModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetComponentId: string;
    targetComponentName: string;
}

export const AssignPhotosModal: React.FC<AssignPhotosModalProps> = ({
    isOpen,
    onClose,
    targetComponentId,
    targetComponentName
}) => {
    const { t, i18n } = useTranslation();
    const lang = (i18n.language || 'de') as 'de' | 'en';
    const store = useReportStore();

    // Gather all candidate photos from the report (minderwert rows, damages, photos, external, etc.)
    const candidatePhotos = useMemo(() => {
        const list: Array<{ id: string; data: string; label: string }> = [];
        const seenData = new Set<string>();

        // Check if data is on target component
        const mwTargetRow = store.minderwertRows.find(
            r => r.id === targetComponentId || r.bodyPart === targetComponentId
        );
        const damageTarget = store.damages.find(d => d.id === targetComponentId || d.bodyPart === targetComponentId);
        const targetImages = new Set<string>([
            ...(mwTargetRow?.images || []),
            ...(damageTarget?.images || [])
        ]);

        // 1. Photos already on minderwertRows (standard body parts)
        store.minderwertRows.forEach(row => {
            const partName = getBodyPartLabel(row.bodyPart, lang) || row.bodyPart;
            (row.images || []).forEach((imgData, idx) => {
                if (!imgData || seenData.has(imgData)) return;
                seenData.add(imgData);
                const existing = store.photos.find(p => p.data === imgData);
                list.push({
                    id: existing?.id || `mw_${row.bodyPart || row.id}_${idx}`,
                    data: imgData,
                    label: existing?.label || `${partName} (${t('step4.photosAbbr', 'Foto')} ${idx + 1})`
                });
            });
        });

        // 2. Photos on custom damages
        (store.damages || []).forEach(d => {
            const damageName = d.bodyPart
                ? (getBodyPartLabel(d.bodyPart, lang) || d.bodyPart)
                : (d.description || d.id);
            (d.images || []).forEach((imgData, idx) => {
                if (!imgData || seenData.has(imgData)) return;
                seenData.add(imgData);
                const existing = store.photos.find(p => p.data === imgData);
                list.push({
                    id: existing?.id || `dmg_${d.id}_${idx}`,
                    data: imgData,
                    label: existing?.label || `${damageName} (${t('step4.photosAbbr', 'Foto')} ${idx + 1})`
                });
            });
        });

        // 3. Photos from store.photos
        store.photos.forEach(p => {
            if (!p.data || seenData.has(p.data)) return;
            seenData.add(p.data);
            list.push({
                id: p.id,
                data: p.data,
                label: p.label || t('step4.photosAbbr', 'Foto')
            });
        });

        // 4. Photos from videoExpertImages
        (store.videoExpertImages || []).forEach((data, idx) => {
            if (!seenData.has(data)) {
                seenData.add(data);
                list.push({
                    id: `ve_${idx}_${data.slice(-10)}`,
                    data,
                    label: `Screenshot ${idx + 1}`
                });
            }
        });

        // 5. Photos from identificationImages & mileageImages
        (store.identificationImages || []).forEach((data, idx) => {
            if (!seenData.has(data)) {
                seenData.add(data);
                list.push({
                    id: `vin_${idx}`,
                    data,
                    label: t('step4.vin_photo', 'Fahrzeug-Ident.-Nr. / Typschild')
                });
            }
        });
        (store.mileageImages || []).forEach((data, idx) => {
            if (!seenData.has(data)) {
                seenData.add(data);
                list.push({
                    id: `mil_${idx}`,
                    data,
                    label: t('step4.mileage_photo', 'Kilometerstand / Tacho')
                });
            }
        });

        // Sort: photos assigned to targetComponentId appear first!
        return list.sort((a, b) => {
            const aAssigned = targetImages.has(a.data) || store.getPhotoAssignments(a.data).some(x => x.id === targetComponentId || x.bodyPart === targetComponentId);
            const bAssigned = targetImages.has(b.data) || store.getPhotoAssignments(b.data).some(x => x.id === targetComponentId || x.bodyPart === targetComponentId);
            if (aAssigned && !bAssigned) return -1;
            if (!aAssigned && bAssigned) return 1;
            return 0;
        });
    }, [store.minderwertRows, store.damages, store.photos, store.videoExpertImages, store.identificationImages, store.mileageImages, targetComponentId, lang, t]);

    // Check which photos are currently assigned to targetComponentId
    const targetAssignedCount = useMemo(() => {
        const mwRow = store.minderwertRows.find(
            r => r.id === targetComponentId || r.bodyPart === targetComponentId
        );
        const damage = store.damages.find(d => d.id === targetComponentId || d.bodyPart === targetComponentId);

        const activeImages = new Set<string>([
            ...(mwRow?.images || []),
            ...(damage?.images || [])
        ]);

        let count = 0;
        candidatePhotos.forEach(p => {
            if (activeImages.has(p.data)) {
                count++;
            } else {
                const assignments = store.getPhotoAssignments(p.data || p.id);
                if (assignments.some(a => a.id === targetComponentId || a.bodyPart === targetComponentId)) {
                    count++;
                }
            }
        });
        return count;
    }, [candidatePhotos, store.minderwertRows, store.damages, store.getPhotoAssignments, targetComponentId]);

    // Direct toggle on click of card
    const handleDirectToggleTarget = (photoId: string, photoData: string) => {
        store.togglePhotoComponentAssignment(photoData || photoId, targetComponentId);

        const assignments = store.getPhotoAssignments(photoData || photoId);
        const isNowAssigned = assignments.some(a => a.id === targetComponentId || a.bodyPart === targetComponentId);

        if (isNowAssigned) {
            toast.success(t('step4.assignedToPart', { part: targetComponentName, defaultValue: `Zugewiesen an: ${targetComponentName}` }));
        } else {
            toast.success(t('step4.unassignedFromPart', { part: targetComponentName, defaultValue: `Zuweisung für ${targetComponentName} entfernt` }));
        }
    };

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={t('step4.assignPhotosTitle', { part: targetComponentName, defaultValue: `Fotos zuweisen: ${targetComponentName}` })}
            className="max-w-4xl"
        >
            <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-900 leading-relaxed">
                        {t('step4.selectPhotosForPart', { defaultValue: 'Wählen Sie Fotos aus, die diesem Bauteil zugeordnet werden sollen. Ein Foto kann mehreren Bauteilen gleichzeitig zugeordnet werden.' })}
                    </p>
                    <div className="flex-shrink-0 text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                        {targetAssignedCount} {t('step4.photosAbbr', 'Foto(s)')} {t('step4.assigned', 'zugewiesen')}
                    </div>
                </div>

                {candidatePhotos.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                        <ImageIcon className="w-10 h-10 stroke-1" />
                        <span className="text-xs font-semibold">{t('step4.noPhotosAvailable', { defaultValue: 'Keine Fotos vorhanden' })}</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[65vh] overflow-y-auto p-1 pb-8 items-start">
                        {candidatePhotos.map(photo => {
                            const assignments = store.getPhotoAssignments(photo.data || photo.id);
                            const isAssignedToThis = assignments.some(
                                a => a.id === targetComponentId || a.bodyPart === targetComponentId
                            );

                            return (
                                <div
                                    key={photo.id}
                                    className={`relative rounded-xl border-2 transition-all duration-200 bg-white flex flex-col p-2.5 gap-2 shadow-2xs hover:shadow-md ${
                                        isAssignedToThis
                                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {/* Image Thumbnail with click-to-toggle target */}
                                    <div
                                        onClick={() => handleDirectToggleTarget(photo.id, photo.data)}
                                        className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100 relative cursor-pointer group"
                                        title={`${photo.label} - ${isAssignedToThis ? t('step4.unassignPhoto', 'Klicken zum Abwählen') : t('step4.assignToPart', { part: targetComponentName, defaultValue: `Klicken zum Zuweisen an ${targetComponentName}` })}`}
                                    >
                                        <SecureImage
                                            src={photo.data}
                                            alt={photo.label}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />

                                        {/* Status Checkbox in top right */}
                                        <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm ${
                                            isAssignedToThis
                                                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                                                : 'bg-white/90 backdrop-blur-sm text-transparent border border-gray-300 hover:border-emerald-400'
                                        }`}>
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </div>

                                        {/* Label overlay on bottom of image */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-1.5 pt-4">
                                            <p className="text-[11px] font-bold text-white drop-shadow-xs line-clamp-1">
                                                {photo.label}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Direct Multi-Part Assigner Controls */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <PhotoPartAssigner
                                            photoId={photo.id}
                                            photoData={photo.data}
                                            targetComponentId={targetComponentId}
                                            targetComponentName={targetComponentName}
                                            compact={true}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Modal Footer */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        <strong className="text-gray-900">{targetAssignedCount}</strong> {t('step4.photosAbbr', 'Foto(s)')} {t('step4.assignedTo', { part: targetComponentName, defaultValue: `an ${targetComponentName} zugewiesen` })}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-primary text-xs px-6 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                        >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('common.done', 'Fertig')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default AssignPhotosModal;
