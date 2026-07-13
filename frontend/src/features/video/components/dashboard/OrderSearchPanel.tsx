import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Video Expert order search box (T7.8) — faithful port, unchanged. */
interface OrderSearchPanelProps {
    search: string;
    onSearchChange: (value: string) => void;
}

const OrderSearchPanel = ({ search, onSearchChange }: OrderSearchPanelProps) => {
    const { t } = useTranslation();
    return (
        <div className="p-3 sm:p-4 flex flex-col justify-center">
            <div className="hidden sm:flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{t('order.searchLabel', { defaultValue: 'Dispatch No. / Order No. / Claim Type' })}</span>
            </div>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary-orange)] transition-colors w-3.5 h-3.5" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('order.searchPlaceholder', { defaultValue: 'Search orders…' })}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-xs text-[var(--color-text-primary)] focus:bg-[var(--color-bg-primary)] focus:border-[var(--color-primary-orange)] focus:ring-4 focus:ring-[var(--color-primary-orange)]/10 focus:outline-none transition-all duration-300 placeholder-[var(--color-text-muted)] font-medium hover:border-[var(--color-border-secondary)] hover:bg-[var(--color-bg-tertiary)]/30"
                />
            </div>
        </div>
    );
};

export default OrderSearchPanel;
