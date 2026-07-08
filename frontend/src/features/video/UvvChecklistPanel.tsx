import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { completeUvv } from './videoApi';
import type { Order } from './videoTypes';

interface UvvChecklistPanelProps {
    order: Order;
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export const UvvChecklistPanel: React.FC<UvvChecklistPanelProps> = ({
    order,
    roomId,
    isOpen,
    onClose,
    onComplete,
}) => {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedResult, setSelectedResult] = useState<'PASSED' | 'FAILED' | null>(null);

    const handleResultSelect = async (result: 'PASSED' | 'FAILED') => {
        if (isSubmitting) return;

        setSelectedResult(result);
        setIsSubmitting(true);
        try {
            const inspectorName = order.vehicleExpertName || t('uvv.checklist.inspector');
            await completeUvv(roomId, result, inspectorName);

            // Broadcast UVV completion to other tabs in real-time
            if (typeof window !== 'undefined') {
                const channel = new BroadcastChannel('my-gutachter-sync');
                channel.postMessage({
                    type: 'UVV_COMPLETED',
                    payload: { uvvResult: result }
                });
                channel.close();
            }

            onComplete();
        } catch (error) {
            console.error('Failed to complete UVV inspection:', error);
            alert(t('uvv.checklist.saveError'));
            setSelectedResult(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col text-left">
                <div className="p-5 border-b border-[var(--color-border-primary)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
                    <div>
                        <h3 className="font-bold text-lg text-[var(--color-text-primary)]">{t('uvv.checklist.title')}</h3>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                            {t('uvv.checklist.subtitle')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-1 rounded-lg hover:bg-[var(--color-bg-hover)] cursor-pointer disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleResultSelect('PASSED')}
                            disabled={isSubmitting}
                            className={`p-5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-150 cursor-pointer ${
                                selectedResult === 'PASSED'
                                    ? 'bg-green-950/60 border-green-600 text-green-400 shadow-md shadow-green-950/20'
                                    : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border-primary)] hover:bg-green-950/30 hover:border-green-700 hover:text-green-400'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <CheckCircle size={28} />
                            <span className="font-bold text-base">{t('uvv.checklist.passed')}</span>
                            {isSubmitting && selectedResult === 'PASSED' && (
                                <span className="text-[10px] opacity-80">{t('uvv.checklist.creating')}</span>
                            )}
                            {!isSubmitting && (
                                <span className="text-[10px] opacity-80 leading-normal">{t('uvv.checklist.generating')}</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleResultSelect('FAILED')}
                            disabled={isSubmitting}
                            className={`p-5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-150 cursor-pointer ${
                                selectedResult === 'FAILED'
                                    ? 'bg-red-950/60 border-red-600 text-red-400 shadow-md shadow-red-950/20'
                                    : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border-primary)] hover:bg-red-950/30 hover:border-red-700 hover:text-red-400'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <AlertTriangle size={28} />
                            <span className="font-bold text-base">{t('uvv.checklist.failed')}</span>
                            {isSubmitting && selectedResult === 'FAILED' && (
                                <span className="text-[10px] opacity-80">{t('uvv.checklist.storing')}</span>
                            )}
                            {!isSubmitting && (
                                <span className="text-[10px] opacity-80 leading-normal">{t('uvv.checklist.noCertificate')}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
