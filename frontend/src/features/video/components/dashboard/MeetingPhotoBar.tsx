import React, { useState } from 'react';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Meeting photo bar (T7.8) — faithful port, unchanged. */
interface MeetingPhoto {
    id: string;
    name: string;
    filename: string;
}

interface MeetingPhotoBarProps {
    photos: MeetingPhoto[];
    roomId: string | undefined;
    onPhotoClick: (filename: string) => void;
    getScreenshotUrl: (roomId: string, fileData: string) => string;
}

const MeetingPhotoBar: React.FC<MeetingPhotoBarProps> = ({ photos, roomId, onPhotoClick, getScreenshotUrl }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    if (!photos || photos.length === 0) return null;

    return (
        <>
            {!isOpen && (
                <div className="absolute bottom-4 right-4 z-40 animate-fade-in">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 bg-[var(--color-primary-orange)] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[var(--color-primary-orange)]/90 transition-all hover:scale-105 active:scale-95"
                    >
                        <ImageIcon size={20} />
                        <span className="font-bold text-sm">{t('meetingSummary.showPhotos', { defaultValue: 'Show Photos' })}</span>
                        <div className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold text-white">
                            {photos.length}
                        </div>
                    </button>
                </div>
            )}

            <div
                className={`absolute bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-card)] border-t border-[var(--color-border-primary)] shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
            >
                <div className="flex justify-center -mt-3 pb-2 cursor-pointer group" onClick={() => setIsOpen(false)}>
                    <div className="bg-[var(--color-bg-card)] border border-t-[var(--color-border-primary)] border-b-0 rounded-t-xl px-4 py-1 flex items-center gap-2 shadow-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] transition-colors">
                        <ChevronDown size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">{t('common.hide', { defaultValue: 'Hide' })}</span>
                    </div>
                </div>

                <div className="px-4 pb-4 overflow-x-auto custom-scrollbar">
                    <div className="flex items-center gap-3 pb-2">
                        {photos.map((photo) => (
                            <div
                                key={photo.id}
                                onClick={() => onPhotoClick(photo.filename)}
                                className="relative group shrink-0 w-32 aspect-[4/3] rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-[var(--color-primary-orange)] transition-all bg-[var(--color-bg-secondary)]"
                            >
                                <img
                                    src={getScreenshotUrl(roomId || '', photo.filename)}
                                    alt={photo.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-200 bg-black/50 p-1.5 rounded-full text-white backdrop-blur-sm">
                                        <ImageIcon size={16} />
                                    </div>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-[10px] text-white truncate text-center font-medium">
                                        {photo.name}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default MeetingPhotoBar;
