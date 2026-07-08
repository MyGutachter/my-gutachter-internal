import { LayoutDashboard, FileText, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../useVideoAuth';
import logo from '../../assets/logo.png';

/**
 * Video Expert sidebar (T7.8) — faithful port. Rewired to the merged routes
 * (`/video`, `/video/scan-records`) and the `useVideoAuth` shim.
 */
interface SidebarProps {
    isOpen: boolean;
    toggle: () => void;
}

const Sidebar = ({ isOpen, toggle }: SidebarProps) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const menuItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard', { defaultValue: 'Dashboard' }), path: '/video', active: location.pathname === '/video' },
        { icon: FileText, label: t('nav.allScanRecords', { defaultValue: 'All Scan Records' }), path: '/video/scan-records', active: location.pathname === '/video/scan-records' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                    onClick={toggle}
                />
            )}

            <aside
                className={`
                    ${isOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:translate-x-0 md:w-20'}
                    bg-[var(--color-bg-sidebar)] text-[var(--color-text-primary)]
                    flex flex-col h-full shadow-2xl z-50 transition-all duration-300 ease-in-out
                    fixed md:relative inset-y-0 left-0
                `}
            >
                <div className={`h-20 flex items-center ${isOpen ? 'justify-between px-6' : 'justify-center'} border-b border-[var(--color-primary-orange)]`}>
                    {isOpen && (
                        <div className="flex items-center justify-center">
                            <img src={logo} alt="GutachterPanel" className="h-12 w-auto object-contain" />
                        </div>
                    )}
                </div>

                <nav className="flex-1 py-8 overflow-hidden px-3">
                    <ul className="space-y-1">
                        {menuItems.map((item) => (
                            <li key={item.label}>
                                <div
                                    onClick={() => {
                                        navigate(item.path);
                                        if (window.innerWidth < 768) toggle();
                                    }}
                                    className={`flex items-center ${isOpen ? 'px-4' : 'px-0 md:justify-center'} py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden cursor-pointer ${item.active
                                        ? 'bg-[var(--color-bg-active)] text-[var(--color-text-active)] shadow-[0_0_15px_rgba(255,107,53,0.1)]'
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-hover)]'
                                        }`}
                                    title={!isOpen ? item.label : ''}
                                >
                                    {item.active && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary-orange)] rounded-full"></div>
                                    )}
                                    <item.icon
                                        className={`h-5 w-5 ${isOpen ? 'mr-3' : 'md:mr-0'} transition-all duration-300 ${item.active ? 'text-[var(--color-primary-orange)] scale-110 drop-shadow-[0_0_8px_rgba(255,107,53,0.4)]' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary-orange)]'}`}
                                        strokeWidth={item.active ? 2.5 : 2}
                                    />
                                    {isOpen ? (
                                        <span className="whitespace-nowrap tracking-wide">{item.label}</span>
                                    ) : (
                                        <span className="whitespace-nowrap tracking-wide md:hidden">{item.label}</span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className={`p-4 border-t border-[var(--color-primary-orange)] bg-[var(--color-bg-sidebar)] flex flex-col gap-2 ${!isOpen ? 'md:items-center' : ''}`}>
                    {/* User Info */}
                    <div className="flex items-center justify-between overflow-hidden group p-2 rounded-xl hover:bg-[var(--color-primary-orange)]/10 transition-colors cursor-pointer w-full">
                        <div className={`flex flex-col overflow-hidden mr-2 ${!isOpen ? 'md:hidden' : ''}`}>
                            <span className="text-sm text-[var(--color-text-primary)] font-semibold truncate group-hover:text-[var(--color-primary-orange)] transition-colors">{user?.fullName || t('auth.expertUser', { defaultValue: 'Expert User' })}</span>
                            <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">{user?.role || t('nav.admin', { defaultValue: 'Admin' })}</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                            className="p-2 text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 cursor-pointer"
                            title={t('auth.logout', { defaultValue: 'Logout' })}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Toggle button - only visible on desktop */}
                <button
                    onClick={toggle}
                    className="hidden md:flex absolute -right-3 top-9 bg-[var(--color-bg-sidebar)] border border-[var(--color-primary-orange)] text-[var(--color-primary-orange)] p-1.5 rounded-full shadow-lg z-50 hover:scale-110 transition-transform duration-200 items-center justify-center cursor-pointer"
                >
                    {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </aside>
        </>
    );
};

export default Sidebar;
