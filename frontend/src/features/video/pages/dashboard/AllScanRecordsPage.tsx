import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Search, Car, Link as LinkIcon, X, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OrderDetailsPanel from '../../components/dashboard/OrderDetailsPanel';
import CarInspectionLoader from '../../CarInspectionLoader';
import type { Order } from '../../types';
import { getAllRecords, getExperts, updateOrderStatus, type ExpertOption } from '../../services/orderService';

/**
 * All scan records (T7.8) — faithful port of VideoExpert's AllScanRecordsPage.
 * Rewired onto the merged VideoOrderController (GET /orders/all-records, /orders/experts,
 * PATCH /orders/{id}/status).
 */
const AllScanRecordsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [records, setRecords] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [showArchive, setShowArchive] = useState(false);
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    const [experts, setExperts] = useState<ExpertOption[]>([]);

    useEffect(() => {
        getExperts().then(setExperts).catch(() => setExperts([]));
    }, [startDate, endDate, search, showArchive]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await getAllRecords({ page, size, startDate, endDate, search, userId: selectedUser, showArchive });
            setRecords(data.content);
            setTotalElements(data.totalElements);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Error fetching orders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchOrders();
        }, 500);
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, size, startDate, endDate, selectedUser, showArchive, search]);

    const handleReset = () => {
        setSearch('');
        setStartDate('');
        setEndDate('');
        setSelectedUser('');
        setShowArchive(false);
        setPage(0);
        setTimeout(fetchOrders, 0);
    };



    return (
        <div className="w-full min-h-full flex flex-col p-2 sm:p-3 bg-[var(--color-bg-secondary)] font-sans">
            <div className="bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-[var(--color-border-primary)] mb-3 transition-all duration-300">
                <div className="p-3 flex xl:hidden items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] whitespace-nowrap">{t('allScanRecordsPage.title', { defaultValue: 'Vin List' })}</h1>
                    </div>

                    <button
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        className={`h-9 px-3 flex items-center gap-2 rounded border transition-all text-sm font-medium ${isFilterExpanded ? 'bg-[var(--color-primary-orange)] text-white border-[var(--color-primary-orange)] shadow-lg shadow-orange-500/20' : 'border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'}`}
                    >
                        <Filter className="w-4 h-4" />
                        <span>{isFilterExpanded ? t('common.hideFilters', { defaultValue: 'Hide' }) : t('common.filters', { defaultValue: 'Filters' })}</span>
                    </button>
                </div>

                <div className={`p-3 xl:flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-0 ${isFilterExpanded ? 'flex' : 'hidden'} border-t xl:border-0 border-[var(--color-border-primary)]`}>
                    <div className="hidden xl:flex items-center gap-2 mr-4">
                        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t('allScanRecordsPage.title', { defaultValue: 'Vin List' })}</h1>
                    </div>

                    <div className="hidden xl:block h-6 w-px bg-[var(--color-border-primary)] mx-2"></div>

                    <div className="flex items-center gap-2 xl:mx-2">
                        <span className="xl:hidden text-sm text-[var(--color-text-secondary)]">{t('tables.entries', { defaultValue: 'Entries' })}:</span>
                        <select
                            value={size}
                            onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                            className="h-9 border border-[var(--color-border-secondary)] rounded px-2 text-sm bg-[var(--color-bg-card)] text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary-orange)] outline-none"
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="hidden xl:block h-6 w-px bg-[var(--color-border-primary)] mx-2"></div>

                    <div className="flex items-center gap-2 xl:mx-2">
                        <div className="relative flex-1 xl:w-auto">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-9 border border-[var(--color-border-secondary)] rounded px-2 text-sm bg-[var(--color-bg-card)] text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary-orange)] outline-none"
                            />
                        </div>
                        <span className="text-[var(--color-text-muted)]">-</span>
                        <div className="relative flex-1 xl:w-auto">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-9 border border-[var(--color-border-secondary)] rounded px-2 text-sm bg-[var(--color-bg-card)] text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary-orange)] outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 xl:mx-2">
                        <select
                            value={selectedUser}
                            onChange={(e) => { setSelectedUser(e.target.value); setPage(0); }}
                            className="flex-1 xl:w-auto xl:min-w-[150px] h-9 border border-[var(--color-border-secondary)] rounded px-2 text-sm bg-[var(--color-bg-card)] text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary-orange)] outline-none"
                        >
                            <option value="">{t('allScanRecordsPage.allExperts', { defaultValue: 'All Experts' })}</option>
                            {experts.map((expert) => (
                                <option key={expert.id || expert.email} value={expert.id}>
                                    {expert.fullName || expert.email}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleReset}
                            className="h-9 flex items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] px-2 whitespace-nowrap cursor-pointer"
                        >
                            × {t('allScanRecordsPage.reset', { defaultValue: 'Reset' })}
                        </button>
                    </div>

                    <div className="hidden xl:block flex-1"></div>

                    <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 xl:ml-2 cursor-pointer">
                        <label className="flex items-center gap-1 cursor-pointer select-none py-1">
                            <input
                                type="checkbox"
                                checked={showArchive}
                                onChange={(e) => { setShowArchive(e.target.checked); setPage(0); }}
                                className="form-checkbox text-[var(--color-primary-orange)] rounded w-3.5 h-3.5 accent-[var(--color-primary-orange)]"
                            />
                            <span className={`text-sm transition-colors ${showArchive ? 'text-[var(--color-primary-orange)] font-medium' : 'text-gray-600'}`}>
                                {t('common.archive', { defaultValue: 'Archive' })}
                            </span>
                        </label>

                        <div className="relative flex-1 xl:w-[200px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t('allScanRecordsPage.search', { defaultValue: 'Search...' })}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-9 border border-[var(--color-border-secondary)] rounded px-3 pl-9 text-sm bg-[var(--color-bg-card)] text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary-orange)] outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-[var(--color-border-primary)] overflow-hidden flex flex-col mb-4 sm:mb-0">
                <div className="overflow-x-auto custom-scrollbar flex-1 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-[var(--color-bg-card)]/80 z-20 flex items-center justify-center">
                            <CarInspectionLoader />
                        </div>
                    )}
                    <table className="w-full table-auto text-left text-sm text-[var(--color-text-secondary)]">
                        <thead className="bg-[var(--color-primary-orange)] text-white font-medium uppercase text-[10px] sm:text-xs sticky top-0 z-10">
                            <tr>
                                <th className="px-2 sm:px-4 py-3 text-center w-12 sm:w-16 hidden md:table-cell">{t('tables.srNo', { defaultValue: 'Sr. No.' })}</th>
                                <th className="px-2 sm:px-4 py-3">{t('tables.orderNo', { defaultValue: 'Order No.' })}</th>
                                <th className="px-2 sm:px-4 py-3">{t('tables.creator', { defaultValue: 'Creator' })}</th>
                                <th className="px-2 sm:px-4 py-3 hidden xl:table-cell">{t('tables.location', { defaultValue: 'Location' })}</th>
                                <th className="px-2 sm:px-4 py-3 hidden sm:table-cell">{t('tables.vin', { defaultValue: 'VIN Number' })}</th>
                                <th className="px-2 sm:px-4 py-3 text-center">{t('tables.createdDate', { defaultValue: 'Created Date' })}</th>
                                <th className="px-2 sm:px-4 py-3 text-center hidden lg:table-cell">{t('tables.completionDate', { defaultValue: 'Completion Date' })}</th>
                                <th className="px-2 sm:px-4 py-3 text-center hidden md:table-cell">{t('tables.images', { defaultValue: 'Images' })}</th>
                                <th className="px-2 sm:px-4 py-3 text-center w-20 sm:w-24">{t('tables.action', { defaultValue: 'Action' })}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-primary)]">
                            {(!records || records.length === 0) && !loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                                        {t('tables.noRecords', { defaultValue: 'No records found' })}
                                    </td>
                                </tr>
                            ) : (
                                (records || []).map((record: Order & { createdDate?: string; updatedDate?: string; location?: string }, index) => (
                                    <tr key={record.id || index} className="hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border-primary)] last:border-0">
                                        <td className="px-2 sm:px-4 py-3 text-center font-medium text-[var(--color-text-primary)] hidden md:table-cell">
                                            {(page * size) + index + 1}
                                        </td>
                                        <td
                                            onClick={() => { setSelectedOrder(record); setIsDetailsOpen(true); }}
                                            className="px-2 sm:px-4 py-3 font-medium text-[var(--color-primary-orange)] hover:underline cursor-pointer break-all sm:break-normal">
                                            {record.dispatchOrOrderNo || '-'}
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-[var(--color-text-primary)]">
                                            <div className="max-w-[120px] sm:max-w-none truncate sm:whitespace-normal">
                                                {record.vehicleExpertName || '-'}
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 hidden xl:table-cell">{record.location || '-'}</td>
                                        <td className="px-2 sm:px-4 py-3 hidden sm:table-cell text-center font-mono text-xs">{record.vinNumber || '-'}</td>
                                        <td className="px-2 sm:px-4 py-3 text-center">
                                            <div className="flex flex-col">
                                                <span className="whitespace-nowrap">{record.createdDate ? new Date(record.createdDate).toLocaleDateString() : '-'}</span>
                                                <span className="text-[10px] sm:text-xs text-[var(--color-text-muted)]">{record.createdDate ? new Date(record.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-center hidden lg:table-cell">
                                            <div className="flex flex-col">
                                                <span className="whitespace-nowrap">{record.updatedDate ? new Date(record.updatedDate).toLocaleDateString() : '-'}</span>
                                                <span className="text-[10px] sm:text-xs text-[var(--color-text-muted)]">{record.updatedDate ? new Date(record.updatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-center hidden md:table-cell">
                                            <div className="inline-flex items-center justify-center border border-[var(--color-primary-orange)]/30 text-[var(--color-primary-orange)] px-2 py-0.5 rounded text-xs font-semibold">
                                                {record.numberOfPhotos || 0}
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                <button
                                                    onClick={() => navigate(`/video/meeting-summary/${record.id}`)}
                                                    className="p-1.5 border border-[var(--color-primary-orange)]/30 text-[var(--color-primary-orange)] rounded hover:bg-[var(--color-primary-orange)]/10 transition-colors cursor-pointer" title={t('common.carDetails', { defaultValue: 'Car Details' })}>
                                                    <Car className="w-4 h-4" />
                                                </button>
                                                <button className="p-1.5 border border-[var(--color-primary-orange)]/30 text-[var(--color-primary-orange)] rounded hover:bg-[var(--color-primary-orange)]/10 transition-colors cursor-pointer" title={t('common.viewLinks', { defaultValue: 'View Links' })}>
                                                    <LinkIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-[var(--color-border-primary)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
                    <span className="text-center sm:text-left">{t('tables.showing', { start: (page * size) + 1, end: Math.min((page + 1) * size, totalElements), total: totalElements, defaultValue: `Showing ${(page * size) + 1} to ${Math.min((page + 1) * size, totalElements)} of ${totalElements} entries` })}</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-3 py-1.5 border border-[var(--color-border-secondary)] rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {t('tables.previous', { defaultValue: 'Previous' })}
                        </button>
                        <div className="flex items-center px-3 font-medium text-[var(--color-text-primary)]">
                            {t('tables.page', { current: page + 1, total: totalPages || 1, defaultValue: `Page ${page + 1} of ${totalPages || 1}` })}
                        </div>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="px-3 py-1.5 border border-[var(--color-border-secondary)] rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {t('tables.next', { defaultValue: 'Next' })}
                        </button>
                    </div>
                </div>
            </div>
            {isDetailsOpen && selectedOrder && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-[var(--color-bg-card)] rounded-xl sm:rounded-2xl w-full max-w-6xl h-[95vh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden relative animate-scale-up">
                        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-primary)] flex items-center justify-between bg-[var(--color-bg-card)] shrink-0">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="whitespace-nowrap">{t('order.tabs.details', { defaultValue: 'Order Details' })}</span>
                                    <span className="text-[var(--color-text-muted)] font-normal text-sm sm:text-base truncate">
                                        #{selectedOrder.dispatchOrOrderNo}
                                    </span>
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="p-2 hover:bg-[var(--color-bg-hover)] rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden bg-[var(--color-bg-light)] p-4">
                            <OrderDetailsPanel
                                order={selectedOrder}
                                onUpdateStatus={async (orderId, status) => {
                                    try {
                                        await updateOrderStatus(orderId, status);
                                        fetchOrders();
                                        setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
                                    } catch (error) {
                                        console.error('Error updating status:', error);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
};

export default AllScanRecordsPage;
