import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { FileText, User, ChevronRight, Search } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';

interface ReportSummary {
    caseNumber: string;
    licensePlate: string;
    inspectionDate: string;
    userEmail: string;
    inspectorName: string;
    status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

const AdminReportList: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [reports, setReports] = useState<ReportSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const fetchedRef = useRef(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        report?: ReportSummary;
    }>({
        isOpen: false
    });

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await api.get('/reports');
                // The API now returns { items, totalCount }
                const data = response.data.items || response.data;
                setReports(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to fetch reports', err);
                setError(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [t]);

    const filteredReports = useMemo(() => {
        const query = search.toLowerCase();
        return reports.filter(r =>
            (r.caseNumber?.toLowerCase() || '').includes(query) ||
            (r.licensePlate?.toLowerCase() || '').includes(query) ||
            (r.inspectorName?.toLowerCase() || '').includes(query) ||
            (r.userEmail?.toLowerCase() || '').includes(query)
        );
    }, [reports, search]);

    const handleStatusChange = async (report: ReportSummary, newStatus: string) => {
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

    const groupedReports = useMemo(() => {
        const groups: Record<string, { name: string, reports: ReportSummary[] }> = {};

        filteredReports.forEach(report => {
            const key = report.userEmail;
            if (!groups[key]) {
                groups[key] = {
                    name: report.inspectorName || report.userEmail,
                    reports: []
                };
            }
            groups[key].reports.push(report);
        });

        return groups;
    }, [filteredReports]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('admin.searchReports')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-amber-600/20 focus:ring-4 focus:ring-amber-600/5 outline-none font-medium transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-2 h-2 bg-amber-600 rounded-full" />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        {reports.length} {t('admin.totalReports', 'Berichte insgesamt')}
                    </span>
                </div>
            </div>

            {Object.entries(groupedReports).map(([email, group]) => (
                <div key={email} className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="bg-slate-100 p-2 rounded-xl">
                            <User className="w-4 h-4 text-slate-600" />
                        </div>
                        <h3 className="font-black text-slate-800 tracking-tight">{group.name}</h3>
                        <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{email}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {group.reports.map((report) => (
                            <div key={report.caseNumber} className="group relative bg-white border border-slate-100 rounded-3xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:border-amber-600/20">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                        <div className="bg-slate-50 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-amber-600/10 transition-colors shrink-0">
                                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-amber-600 transition-colors" />
                                        </div>
                                        <div className="space-y-0.5 sm:space-y-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono font-black text-slate-900 group-hover:text-amber-600 transition-colors truncate">{report.caseNumber}</span>
                                                <span className="text-[10px] sm:text-xs font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase tracking-wider">{report.licensePlate}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                                                <span>{formatDateTime(report.inspectionDate)}</span>
                                                <span className="hidden sm:block w-1 h-1 bg-slate-200 rounded-full" />
                                                <span className="group-hover:text-slate-600 truncate">{report.inspectorName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                                        <div className="relative w-full sm:w-auto">
                                            <select
                                                value={report.status || 'OPEN'}
                                                onChange={(e) => handleStatusChange(report, e.target.value)}
                                                className={`w-full sm:w-auto appearance-none pl-4 pr-10 py-2 sm:py-2.5 rounded-[1rem] sm:rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer outline-none
                                                    ${report.status === 'COMPLETED'
                                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 focus:border-emerald-300'
                                                        : report.status === 'CANCELLED'
                                                            ? 'bg-red-50 border-red-100 text-red-600 focus:border-red-300'
                                                            : 'bg-amber-50 border-amber-100 text-amber-600 focus:border-amber-300'
                                                    }
                                                `}
                                            >
                                                <option value="OPEN">{t('orders.statusValues.OPEN')}</option>
                                                <option value="IN_PROGRESS">{t('orders.statusValues.IN_PROGRESS')}</option>
                                                <option value="COMPLETED">{t('orders.statusValues.COMPLETED')}</option>
                                                <option value="CANCELLED">{t('orders.statusValues.CANCELLED')}</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                                <ChevronRight className="w-4 h-4 rotate-90" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-50 rounded-[1.25rem] border border-slate-100 w-full sm:w-auto justify-between sm:justify-start">
                                            <button
                                                onClick={() => navigate(`/report/form?caseNumber=${report.caseNumber}`)}
                                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white text-[10px] font-black text-slate-700 uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                                            >
                                                {t('common.edit')}
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await api.get(`/reports/${report.userEmail}/${report.caseNumber}/pdf`, { responseType: 'blob' });
                                                        const url = window.URL.createObjectURL(new Blob([res.data]));
                                                        window.open(url);
                                                    } catch (err) {
                                                        toast.error(t('common.error'));
                                                    }
                                                }}
                                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white text-[10px] font-black text-slate-700 uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                                            >
                                                {t('common.viewPdf')}
                                            </button>
                                            <button
                                                onClick={() => setConfirmModal({ isOpen: true, report })}
                                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-50 text-[10px] font-black text-red-600 uppercase tracking-widest rounded-xl border border-red-100 shadow-sm transition-all hover:bg-red-100 hover:border-red-200 active:scale-95"
                                            >
                                                {t('common.delete')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {reports.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <FileText className="w-16 h-16 mb-4 opacity-10" />
                    <p className="font-black uppercase tracking-widest text-xs">{t('admin.noReportsFound')}</p>
                </div>
            )}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false })}
                onConfirm={async () => {
                    if (!confirmModal.report) return;
                    const { userEmail, caseNumber } = confirmModal.report;
                    try {
                        await api.delete(`/reports/${userEmail}/${caseNumber}`);
                        setReports(prev => prev.filter(r => r.caseNumber !== caseNumber));
                        toast.success(t('common.deleteSuccess'));
                    } catch (err) {
                        toast.error(t('common.error'));
                    }
                }}
                title={t('common.confirmDelete')}
                message={t('admin.deleteReportConfirm', 'Are you sure you want to delete this report? This action cannot be undone.')}
                type="danger"
            />
        </div>
    );
};

export default AdminReportList;
