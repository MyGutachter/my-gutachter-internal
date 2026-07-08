import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CarInspectionLoader from '../../CarInspectionLoader';
import OrderCard from '../../components/dashboard/OrderCard';
import OrderSearchPanel from '../../components/dashboard/OrderSearchPanel';
import OrderDetailsPanel from '../../components/dashboard/OrderDetailsPanel';
import CreateOrderModal from '../../components/modals/CreateOrderModal';
import type { Order } from '../../types';
import NoOrdersImage from '../../assets/no_orders_placeholder.png';
import { getDashboardOrders, updateOrderStatus } from '../../services/orderService';

/**
 * Video Expert dashboard / after-login page (T7.8) — faithful port. Rewired onto
 * the merged VideoOrderController: GET /orders/dashboard and PATCH /orders/{id}/status,
 * shaping the unified `orders` collection into the video Order DTO.
 */
const DashboardPage = () => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showArchive, setShowArchive] = useState(false);
    const [search, setSearch] = useState('');

    const fetchOrders = async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const data = await getDashboardOrders(search, showArchive, signal);
            setOrders(data);
        } catch (error) {
            if (error instanceof Error && error.name === 'CanceledError') return;
            console.error('Error fetching orders:', error);
        } finally {
            if (signal && signal.aborted) return;
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        // Debounce to prevent heavy API calls while typing.
        const timeoutId = setTimeout(() => {
            fetchOrders(controller.signal);
        }, 500);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showArchive, search]);

    const handleOrderCreated = () => {
        fetchOrders();
    };

    const handleUpdateStatus = async (orderId: string, status: 'DONE' | 'PENDING') => {
        try {
            await updateOrderStatus(orderId, status);
            fetchOrders();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="w-full h-full flex flex-col px-3 sm:pb-3 pb-1 gap-3 bg-[var(--color-bg-light)] overflow-hidden font-sans">

            {/* Global Header Actions - Sticky at top */}
            <div className="sticky top-0 z-20 bg-[var(--color-bg-light)] pt-3 sm:pb-2 pb-0 flex flex-col md:flex-row gap-3 shrink-0">
                <div className="w-full md:w-[280px] lg:w-[300px] xl:w-[320px] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-primary)] p-2.5 shadow-card flex items-center transition-all hover:shadow-lg">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full bg-gradient-to-r from-[var(--color-primary-orange)] to-[var(--color-primary-orange-dark)] text-white py-2 rounded-lg flex items-center justify-center font-bold text-[13px] uppercase tracking-wide hover:shadow-glow hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('dashboardPage.createOrder', { defaultValue: 'Create Order' })}
                    </button>
                </div>

                <div className="flex-1 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-primary)] shadow-card overflow-hidden flex flex-col sm:flex-row sm:items-center pr-0 sm:pr-4">
                    <div className="flex-1 min-w-0">
                        <OrderSearchPanel search={search} onSearchChange={setSearch} />
                    </div>
                    <div className="shrink-0 flex items-center px-3 pb-3 sm:pb-0 sm:px-0">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={showArchive}
                                    onChange={(e) => setShowArchive(e.target.checked)}
                                />
                                <div className="h-5 w-9 bg-[var(--color-bg-tertiary)] rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--color-primary-orange)] peer-checked:after:translate-x-full peer-checked:after:border-[var(--color-bg-primary)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-bg-primary)] after:border-[var(--color-border-secondary)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary-orange)]"></div>
                            </div>
                            <span className="text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] transition-colors whitespace-nowrap">{t('dashboardPage.showArchive', { defaultValue: 'Show Archive' })}</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area: List of Side-by-Side Order Rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 space-y-4 pb-2">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <CarInspectionLoader />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-70">
                        <img src={NoOrdersImage} alt="No Orders" className="w-[300px] mb-4" />
                        <p className="text-[var(--color-text-muted)] font-bold text-lg">{t('dashboardPage.noOrders', { defaultValue: 'No orders found' })}</p>
                        <p className="text-[var(--color-text-muted)] text-sm">{t('dashboardPage.createToStart', { defaultValue: 'Create a new order to get started' })}</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="flex flex-col md:flex-row gap-3 min-h-fit md:h-[350px]">
                            <div className="w-full md:w-[280px] lg:w-[300px] xl:w-[320px] shrink-0 md:h-full">
                                <OrderCard order={order} />
                            </div>
                            <div className="flex-1 md:h-full min-w-0">
                                <OrderDetailsPanel order={order} onUpdateStatus={handleUpdateStatus} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOrderCreated={handleOrderCreated}
            />
        </div>
    );
};

export default DashboardPage;
