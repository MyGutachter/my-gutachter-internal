import React from 'react';
import { useTranslation } from 'react-i18next';
import { Video, ClipboardCheck, ExternalLink } from 'lucide-react';

/**
 * "Open this order in the other app, in a new tab" affordance (T7.7).
 *
 * Enables the simultaneous two-tab workflow: run the live video call in one
 * tab and fill the vehicle report in another, both on the same order
 * (keyed by caseNumber == roomId). Concurrent writes are safe — the report
 * save is a partial $set over report fields and screenshots write disjoint
 * meetingData.* keys, so neither clobbers the other on the one order doc.
 */
interface Props {
    /** Which app to open. 'video' opens the call; 'report' opens the wizard. */
    target: 'video' | 'report';
    /** The order's caseNumber (== video roomId). Button hides when absent. */
    caseNumber?: string | null;
    className?: string;
}

const OpenOtherAppTab: React.FC<Props> = ({ target, caseNumber, className }) => {
    const { t } = useTranslation();
    if (!caseNumber) return null;

    const url =
        target === 'video'
            ? `/video/order/${encodeURIComponent(caseNumber)}`
            : `/report/form?caseNumber=${encodeURIComponent(caseNumber)}`;

    const label =
        target === 'video'
            ? t('twoTab.openVideoCall', { defaultValue: 'Open Video Call' })
            : t('twoTab.openReport', { defaultValue: 'Open Vehicle Report' });

    const Icon = target === 'video' ? Video : ClipboardCheck;

    return (
        <button
            type="button"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            title={t('twoTab.opensNewTab', { defaultValue: 'Opens in a new tab' })}
            className={
                className ||
                'flex items-center gap-1.5 text-[14px] font-medium tracking-wider hover:text-white transition-colors bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 whitespace-nowrap'
            }
        >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
        </button>
    );
};

export default OpenOtherAppTab;
