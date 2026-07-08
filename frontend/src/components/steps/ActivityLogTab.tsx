import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useReportStore } from '../../store/reportStore';
import api from '../../utils/api';
import Card from '../ui/Card';
import { History, ChevronLeft, ChevronRight, User as UserIcon, Tag } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';

const ActivityLogTab: React.FC = () => {
    const { t } = useTranslation();
    const caseNumber = useReportStore((s: any) => s.caseNumber);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [category, setCategory] = useState('');
    const [user, setUser] = useState('');

    const pageSize = 20;

    const fetchLogs = useCallback(async () => {
        if (!caseNumber) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                size: pageSize.toString(),
            });
            if (category) params.append('category', category);
            if (user) params.append('user', user);

            const response = await api.get(`/activity-log/by-order/${caseNumber}?${params.toString()}`);
            setLogs(response.data.items);
            setTotalItems(response.data.totalItems);
            setTotalPages(response.data.totalPages);
        } catch (err) {
            console.error('Failed to fetch activity logs', err);
        } finally {
            setLoading(false);
        }
    }, [caseNumber, currentPage, category, user]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const categories = ['General', 'Update', 'Calculation', 'Mission', 'Shipping', 'PrintConfig'];

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-dark-gray flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    {t('activityLog.title')}
                </h2>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            className="form-input pl-9 h-10 text-sm py-1"
                            value={category}
                            onChange={(e) => { setCategory(e.target.value); setCurrentPage(0); }}
                        >
                            <option value="">{t('activityLog.allCategories')}</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{t(`activityLog.categories.${cat}`, { defaultValue: cat })}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('activityLog.search')}
                            className="form-input pl-9 h-10 text-sm py-1 w-48"
                            value={user}
                            onChange={(e) => { setUser(e.target.value); setCurrentPage(0); }}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <Card className="flex justify-center py-20">
                    <LoadingSpinner />
                </Card>
            ) : logs.length === 0 ? (
                <Card className="text-center py-20 bg-gray-50">
                    <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">{t('activityLog.noLogs')}</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-4 py-3 font-bold text-gray-600">{t('activityLog.date')}</th>
                                        <th className="px-4 py-3 font-bold text-gray-600">{t('activityLog.user')}</th>
                                        <th className="px-4 py-3 font-bold text-gray-600">{t('activityLog.category')}</th>
                                        <th className="px-4 py-3 font-bold text-gray-600">{t('activityLog.action')}</th>
                                        <th className="px-4 py-3 font-bold text-gray-600">{t('activityLog.info')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {logs.map((log, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{log.creationTime}</td>
                                            <td className="px-4 py-3 whitespace-nowrap font-medium text-dark-gray">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <UserIcon className="w-3 h-3 text-primary" />
                                                    </div>
                                                    {log.userName || log.userId}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${log.category === 'Update' ? 'bg-blue-100 text-blue-700' :
                                                    log.category === 'Shipping' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {t(`activityLog.categories.${log.category}`, { defaultValue: log.category })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-800">
                                                    {t(`activityLog.actions.${log.action}`, { defaultValue: log.action })}
                                                    {log.fieldName && (
                                                        <span className="ml-2 text-xs font-normal text-gray-500">
                                                            ({t(`step1.${log.fieldName}`, { 
                                                                defaultValue: t(`step2.${log.fieldName}`, {
                                                                    defaultValue: t(`step3.${log.fieldName}`, {
                                                                        defaultValue: t(`step4.${log.fieldName}`, {
                                                                            defaultValue: log.fieldName
                                                                        })
                                                                    })
                                                                })
                                                            })})
                                                        </span>
                                                    )}
                                                </div>
                                                {log.fieldName && (
                                                    <div className="mt-1 text-xs">
                                                        <span className="text-red-500 line-through mr-2">
                                                            {log.oldValue === 'N/A' ? t('common.notSpecified') : 
                                                             log.oldValue === 'YES' ? t('common.yes') :
                                                             log.oldValue === 'NO' ? t('common.no') :
                                                             log.oldValue}
                                                        </span>
                                                        <span className="text-gray-400 mr-2">→</span>
                                                        <span className="text-green-600 font-medium">
                                                            {log.newValue === 'YES' ? t('common.yes') :
                                                             log.newValue === 'NO' ? t('common.no') :
                                                             log.newValue}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 italic">
                                                {log.additionalInfo || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2">
                            <div className="text-xs text-gray-500">
                                {t('vehicleList.results')}: {totalItems}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                    disabled={currentPage === 0}
                                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-medium">
                                    {currentPage + 1} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                    disabled={currentPage === totalPages - 1}
                                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityLogTab;
