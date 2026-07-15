import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import CarInspectionLoader from '../../CarInspectionLoader';
import OrderCard from '../../components/dashboard/OrderCard';
import OrderDetailsPanel from '../../components/dashboard/OrderDetailsPanel';
import { getOrder, updateOrderStatus } from '../../services/orderService';
import type { Order } from '../../types';

const OrderDetailsPage: React.FC = () => {
    const { t } = useTranslation();
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!orderId) return;
            setLoading(true);
            try {
                const data = await getOrder(orderId);
                setOrder(data);
            } catch (err) {
                console.error('Failed to load order:', err);
                setError(t('orderDeepLink.loadFailed', { defaultValue: 'Failed to load order details. You might not have permission.' }));
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId, t]);

    const handleUpdateStatus = async (id: string, status: 'DONE' | 'PENDING') => {
        try {
            await updateOrderStatus(id, status);
            if (order) {
                setOrder({ ...order, status });
            }
        } catch (err) {
            console.error('Failed to update order status:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full py-12">
                <CarInspectionLoader />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-primary)] shadow-card m-4">
                <h2 className="text-lg font-bold text-red-500 mb-2">{t('common.error', { defaultValue: 'Error' })}</h2>
                <p className="text-gray-500 mb-4">{error || 'Order not found'}</p>
                <button
                    onClick={() => navigate('/video')}
                    className="px-4 py-2 bg-[var(--color-primary-orange)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm"
                >
                    {t('orderDeepLink.backToDashboard', { defaultValue: 'Back to Dashboard' })}
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col px-3 sm:pb-3 pb-1 gap-3 bg-[var(--color-bg-light)] overflow-hidden font-sans">
            {/* Header / Breadcrumb */}
            <div className="sticky top-0 z-20 bg-[var(--color-bg-light)] pt-3 pb-1 flex items-center justify-between shrink-0">
                <button
                    onClick={() => navigate('/video')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-all cursor-pointer"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{t('orderDeepLink.backToDashboard', { defaultValue: 'Back to Dashboard' })}</span>
                </button>
                <h1 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
                    {t('pageTitles.orderDetails', { defaultValue: 'Order Details' })}: {order.source && order.source !== 'MANUAL' && order.auftragsnummer ? `${order.source.replace('-', '_')}_${order.auftragsnummer}` : (order.auftragsnummer || order.dispatchOrOrderNo || order.id)}
                </h1>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
                <div className="flex flex-col md:flex-row gap-3 min-h-fit md:h-[350px]">
                    <div className="w-full md:w-[280px] lg:w-[300px] xl:w-[320px] shrink-0 md:h-full">
                        <OrderCard order={order} />
                    </div>
                    <div className="flex-1 md:h-full min-w-0">
                        <OrderDetailsPanel order={order} onUpdateStatus={handleUpdateStatus} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsPage;
