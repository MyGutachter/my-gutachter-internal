import { X, Download } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Full-screen image lightbox (T7.8) — faithful port, unchanged. */
interface ImagePopupProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    altText?: string;
    title?: string;
}

const ImagePopup: React.FC<ImagePopupProps> = ({ isOpen, onClose, imageUrl, altText, title }) => {
    const { t } = useTranslation();
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
                aria-label="Close modal overlay"
            ></div>

            <div className="relative bg-[var(--color-bg-card)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up z-10">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-sm z-20">
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] truncate pr-4">
                        {title || t('modals.imagePopup.title', { defaultValue: 'Image Preview' })}
                    </h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => window.open(imageUrl, '_blank')}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange)]/10 rounded-lg transition-colors cursor-pointer"
                            title={t('modals.imagePopup.openOriginal', { defaultValue: 'Open original' })}
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title={t('modals.imagePopup.close', { defaultValue: 'Close' })}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar bg-[var(--color-bg-secondary)] flex items-center justify-center p-4 relative min-h-[300px]">
                    <img
                        src={imageUrl}
                        alt={altText || t('modals.imagePopup.preview', { defaultValue: 'Preview' })}
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-sm"
                    />
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImagePopup;
