import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchUvvCertificateBlob } from '../../services/orderService';
import type { Order } from '../../types';

/** UVV certificate viewer (T7.8) — faithful port. Rewired to the merged order service. */
interface UvvCertificateViewerProps {
    order: Order;
    compact?: boolean;
}

export const UvvCertificateViewer = ({ order, compact = false }: UvvCertificateViewerProps) => {
    const { t } = useTranslation();
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const canShowCertificate = order.claimType === 'Digital UVV' && order.uvvResult === 'PASSED';

    useEffect(() => {
        if (!canShowCertificate || !order.id) {
            setPdfUrl(null);
            setLoadError(false);
            return;
        }

        let active = true;
        let objectUrl: string | null = null;

        const loadCertificate = async () => {
            setIsLoading(true);
            setLoadError(false);
            try {
                const blob = await fetchUvvCertificateBlob(order.id);
                objectUrl = URL.createObjectURL(blob);
                if (active) setPdfUrl(objectUrl);
            } catch (error) {
                console.error('Failed to load UVV certificate:', error);
                if (active) {
                    setLoadError(true);
                    setPdfUrl(null);
                }
            } finally {
                if (active) setIsLoading(false);
            }
        };

        loadCertificate();

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [canShowCertificate, order.id]);

    if (!canShowCertificate) return null;

    const certificateUrl = pdfUrl;
    const downloadName = `UVV_Zertifikat_${order.licensePlateNumber || order.dispatchOrOrderNo || order.id}.pdf`;

    const handleDownload = () => {
        if (!certificateUrl) return;
        const link = document.createElement('a');
        link.href = certificateUrl;
        link.download = downloadName;
        link.click();
    };

    const handleOpen = () => {
        if (!certificateUrl) return;
        window.open(certificateUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={`bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-2xl overflow-hidden shadow-sm ${compact ? '' : 'w-full'}`}>
            <div className="p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <FileText className="text-[var(--color-primary-orange)] shrink-0" size={compact ? 16 : 18} />
                    <div className="min-w-0">
                        <h4 className={`font-bold text-[var(--color-text-primary)] ${compact ? 'text-xs' : 'text-sm'}`}>
                            {t('uvv.certificate.title', { defaultValue: 'UVV Certificate' })}
                        </h4>
                        <p className={`text-[var(--color-text-secondary)] ${compact ? 'text-[10px]' : 'text-xs'}`}>
                            {t('uvv.certificate.subtitle', { defaultValue: 'Inspection certificate' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleOpen}
                        disabled={!certificateUrl || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ExternalLink size={14} />
                        <span>{t('uvv.certificate.open', { defaultValue: 'Open' })}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={!certificateUrl || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange)]/90 text-white transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={14} />
                        <span>{t('uvv.certificate.download', { defaultValue: 'Download' })}</span>
                    </button>
                </div>
            </div>

            <div className={`bg-[#525659] ${compact ? 'h-[420px]' : 'h-[min(72vh,820px)]'}`}>
                {isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-white/80 gap-3">
                        <Loader2 className="animate-spin" size={28} />
                        <span className="text-sm">{t('uvv.certificate.loading', { defaultValue: 'Loading certificate…' })}</span>
                    </div>
                )}

                {!isLoading && loadError && (
                    <div className="h-full flex flex-col items-center justify-center text-white/80 gap-2 px-6 text-center">
                        <FileText size={32} className="opacity-60" />
                        <p className="text-sm font-semibold">{t('uvv.certificate.loadErrorTitle', { defaultValue: 'Certificate unavailable' })}</p>
                        <p className="text-xs opacity-80">
                            {t('uvv.certificate.loadErrorSubtitle', { defaultValue: 'The certificate could not be loaded.' })}
                        </p>
                    </div>
                )}

                {!isLoading && pdfUrl && (
                    <iframe
                        title={t('uvv.certificate.title', { defaultValue: 'UVV Certificate' })}
                        src={pdfUrl}
                        className="w-full h-full border-0 bg-white"
                    />
                )}
            </div>
        </div>
    );
};
