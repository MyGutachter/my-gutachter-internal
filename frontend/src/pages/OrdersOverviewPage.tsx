import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { FileText, Search, ArrowUpDown, Filter, Loader2, Video, ClipboardList } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import AppFooter from '../components/layout/AppFooter';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Card from '../components/ui/Card';
import { useReportStore } from '../store/reportStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import toast from 'react-hot-toast';

interface ReportSummary {
    caseNumber: string;
    licensePlate: string;
    clientName: string;
    orderDate: string;
    createdAt?: string;
    userEmail: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | null;
    expertAssessmentStatus: string | null;
    inspectorName?: string;
    claimType?: string;
}

// UVV Digital orders default-highlight the Video Expert mode; every order stays
// openable in BOTH modes (Decision Q7 — no rigid claimType routing).
const isVideoDefault = (claimType?: string): boolean => {
    const c = (claimType || '').toLowerCase();
    return c.includes('uvv');
};

const OrdersOverviewPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const caseNumberParam = searchParams.get('caseNumber');
    const resetReport = useReportStore(state => state.resetAll);

    const [reports, setReports] = useState<ReportSummary[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState(caseNumberParam || '');
    const [sortField, setSortField] = useState<keyof ReportSummary>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [skipCount, setSkipCount] = useState(0);
    const maxResultCount = 50;

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                const response = await api.get('/reports', {
                    params: {
                        skipCount,
                        maxResultCount
                    }
                });
                const newItems = response.data.items || [];
                setReports(prev => skipCount === 0 ? newItems : [...prev, ...newItems]);
                setTotalCount(response.data.totalCount || 0);
            } catch (err) {
                console.error('Failed to fetch reports', err);
                setError(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [t, skipCount]);

    const handleSort = (field: keyof ReportSummary) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const filteredAndSortedReports = useMemo(() => {
        const query = search.toLowerCase();
        let filtered = reports.filter(r =>
            (r.caseNumber || '').toLowerCase().includes(query) ||
            (r.licensePlate || '').toLowerCase().includes(query) ||
            (r.clientName || '').toLowerCase().includes(query) ||
            (r.inspectorName || '').toLowerCase().includes(query)
        );

        return filtered.sort((a, b) => {
            const valA = a[sortField] || '';
            const valB = b[sortField] || '';

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [reports, search, sortField, sortOrder]);


    const handleRowClick = (caseNumber: string) => {
        navigate(`/report/form?caseNumber=${caseNumber}`);
    };

    // Per-order dual-mode entry points (Decision Q7): the same order can be opened
    // in either mode; both work on the same document (keyed by caseNumber).
    const openReport = (caseNumber: string) => {
        navigate(`/report/form?caseNumber=${caseNumber}`);
    };
    const openVideo = (caseNumber: string) => {
        navigate(`/video/order/${encodeURIComponent(caseNumber)}`);
    };

    const StatusBadge: React.FC<{ report: ReportSummary }> = ({ report }) => {
        const role = useAuthStore(state => state.role);
        const status = report.status || 'OPEN';

        const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
            e.stopPropagation();
            const newStatus = e.target.value;
            try {
                await api.post('/reports', {
                    caseNumber: report.caseNumber,
                    userEmail: report.userEmail,
                    status: newStatus
                });
                setReports(prev => prev.map(r =>
                    r.caseNumber === report.caseNumber ? { ...r, status: newStatus as any } : r
                ));
                toast.success(t('common.saveSuccess'));
            } catch (err) {
                console.error('Failed to update status', err);
                toast.error(t('common.saveError'));
            }
        };

        if (role === 'ADMIN') {
            return (
                <select
                    value={status}
                    onChange={handleStatusChange}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-bold uppercase rounded-full px-2 py-1 bg-white border border-gray-200 outline-none focus:ring-1 focus:ring-primary transition-all"
                >
                    <option value="OPEN">{t('orders.statusValues.OPEN')}</option>
                    <option value="IN_PROGRESS">{t('orders.statusValues.IN_PROGRESS')}</option>
                    <option value="COMPLETED">{t('orders.statusValues.COMPLETED')}</option>
                    <option value="CANCELLED">{t('orders.statusValues.CANCELLED')}</option>
                </select>
            );
        }

        const isAccepted = report.expertAssessmentStatus === 'Gutachterausschuss-Einigung: GA akzeptiert' || report.expertAssessmentStatus === 'expertAccepted';

        return (
            <div className="flex flex-col gap-1">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase w-fit ${status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                    }`}>
                    {t(`orders.statusValues.${status}`, status)}
                </span>
                {report.expertAssessmentStatus && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium uppercase w-fit ${isAccepted ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                        {t(`step5.${report.expertAssessmentStatus}`, report.expertAssessmentStatus)}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-light-gray">
            <AppHeader />

            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-extrabold text-dark-gray flex items-center gap-3">
                                <FileText className="w-7 h-7 text-primary" />
                                {t('orders.title')}
                            </h1>
                            <p className="text-gray-500 mt-1">
                                {t('orders.subtitle')}
                            </p>
                        </div>


                    </div>

                    {/* Filters & Search */}
                    <div className="flex items-center bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex-1 flex items-center min-w-0">
                            <div className="flex-1 relative border-r border-gray-50">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('orders.searchPlaceholder')}
                                    className="w-full pl-11 pr-4 py-3.5 bg-transparent border-none focus:ring-0 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4 px-6 py-3.5 overflow-x-auto no-scrollbar flex-nowrap whitespace-nowrap border-r border-gray-50">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <Filter className="w-3.5 h-3.5" />
                                    <span>{totalCount} {t('vehicleList.results')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <LoadingSpinner text={t('common.loading')} />
                        </div>
                    ) : error ? (
                        <Card className="bg-red-50 border-red-100 text-center py-10">
                            <p className="text-red-600 font-medium">{error}</p>
                        </Card>
                    ) : filteredAndSortedReports.length === 0 ? (
                        <Card className="text-center py-20">
                            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-400">{t('orders.noOrders')}</h3>

                        </Card>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th
                                                className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => handleSort('licensePlate')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {t('orders.table.licensePlate')}
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </div>
                                            </th>
                                            <th
                                                className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => handleSort('caseNumber')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {t('orders.table.caseNumber')}
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                                {t('orders.table.client')}
                                            </th>
                                            <th
                                                className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => handleSort('createdAt')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {t('orders.table.date')}
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                                {t('orders.table.status')}
                                            </th>
                                            <th
                                                className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => handleSort('inspectorName')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {t('orders.table.expert')}
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                                {t('orders.table.actions')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredAndSortedReports.map((report) => (
                                            <tr
                                                key={report.caseNumber}
                                                className="hover:bg-primary/5 transition-colors cursor-pointer group"
                                                onClick={() => handleRowClick(report.caseNumber)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono text-sm font-bold border border-gray-200">
                                                        {report.licensePlate || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-gray">
                                                    {report.caseNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {report.clientName || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDateTime(report.createdAt || report.orderDate)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StatusBadge report={report} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {report.inspectorName || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(() => {
                                                            const videoDefault = isVideoDefault(report.claimType);
                                                            return (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        title={t('orders.openVideoExpert', 'Open in Video Expert')}
                                                                        onClick={(e) => { e.stopPropagation(); openVideo(report.caseNumber); }}
                                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${videoDefault
                                                                            ? 'bg-primary text-white hover:bg-orange-700'
                                                                            : 'border border-primary text-primary hover:bg-primary hover:text-white'}`}
                                                                    >
                                                                        <Video className="w-4 h-4" />
                                                                        <span className="hidden md:inline">{t('orders.videoExpert', 'Video Expert')}</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title={t('orders.openVehicleReport', 'Open in Vehicle Report')}
                                                                        onClick={(e) => { e.stopPropagation(); openReport(report.caseNumber); }}
                                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!videoDefault
                                                                            ? 'bg-primary text-white hover:bg-orange-700'
                                                                            : 'border border-primary text-primary hover:bg-primary hover:text-white'}`}
                                                                    >
                                                                        <ClipboardList className="w-4 h-4" />
                                                                        <span className="hidden md:inline">{t('orders.vehicleReport', 'Vehicle Report')}</span>
                                                                    </button>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {reports.length < totalCount && (
                                <div className="p-6 border-t border-gray-100 flex justify-center">
                                    <button
                                        onClick={() => setSkipCount(prev => prev + maxResultCount)}
                                        disabled={loading}
                                        className="btn-outline flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ArrowUpDown className="w-4 h-4" />
                                        )}
                                        {t('common.loadMore', 'Mehr laden')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <AppFooter />
        </div>
    );
};

export default OrdersOverviewPage;
