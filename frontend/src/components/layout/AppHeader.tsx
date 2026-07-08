import React from 'react';
import { useTranslation } from 'react-i18next';
// import { useUIStore } from '../../store/uiStore';
// import { Menu, X } from 'lucide-react';
// import LanguageToggle from '../ui/LanguageToggle';
import { LayoutDashboard, ListChecks, LogOut, Receipt, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import fullLogo from '../../assets/full_logo.png';
import { useAuthStore } from '../../store/authStore';
import { useReportStore } from '../../store/reportStore';
import OpenOtherAppTab from '../OpenOtherAppTab';

const AppHeader: React.FC = () => {
    const { t } = useTranslation();
    const role = useAuthStore(state => state.role);
    const logout = useAuthStore(state => state.logout);
    const location = useLocation();
    const navigate = useNavigate();
    const isAdminPage = location.pathname === '/report/admin';
    // Only expose the "open video call" affordance on the wizard, where a real
    // order is loaded (elsewhere reportStore.caseNumber is a fresh placeholder).
    const storeCaseNumber = useReportStore(state => state.caseNumber);
    const reportCaseNumber = location.pathname === '/report/form' ? storeCaseNumber : null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // const handleLangChange = (lang: 'de' | 'en') => {
    //     setLanguage(lang);
    //     i18n.changeLanguage(lang);
    // };

    return (
        <header className={`${isAdminPage ? 'bg-amber-600' : 'bg-primary'} text-white shadow-xl sticky top-0 z-50 no-print`}>
            <div className="container mx-auto px-2 sm:px-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between py-2 gap-2">
                    {/* Top Row: Logo & Mobile Logout */}
                    <div className="flex items-center justify-between min-w-0">
                        <div className="flex items-center min-w-0">
                            {/* Interactive Logo Container */}
                            <Link to="/hub" className="bg-white p-1 rounded-lg sm:rounded-xl shadow-inner transform transition-transform hover:scale-105 duration-200 shrink-0">
                                <img src={fullLogo} alt="MyGutachter Logo" className="h-7 w-auto sm:h-9 object-contain" />
                            </Link>

                            {/* Vertical Separator and Title */}
                            <div className="ml-2 pl-2 border-l border-white/20 min-w-0">
                                <h1 className="text-xs sm:text-sm md:text-lg font-black leading-none text-white drop-shadow-sm italic truncate">
                                    {t('app.subtitle')}
                                </h1>
                            </div>
                        </div>

                        {/* Mobile Logout - visible only on smallest screens if needed, but we show all below */}
                        <div className="lg:hidden flex items-center">
                             <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-red-600/20 transition-colors"
                                title={t('auth.logout')}
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Links Area - Always Visible */}
                    <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0 lg:overflow-visible">
                        {role === 'ADMIN' && !isAdminPage && (
                            <Link to="/report/admin" className="flex items-center gap-1.5 text-[14px] font-mediumtracking-wider hover:text-white transition-colors bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 whitespace-nowrap">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{t('nav.admin')}</span>
                            </Link>
                        )}
                        {['EXPERT', 'DISPATCH', 'ADMIN'].includes(role || '') && location.pathname !== '/report' && (
                            <Link to="/report" className="flex items-center gap-1.5 text-[14px] font-mediumtracking-wider hover:text-white transition-colors bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 whitespace-nowrap">
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                <span>{t('orders.title')}</span>
                            </Link>
                        )}
                        {['EXPERT', 'ADMIN'].includes(role || '') && location.pathname !== '/report/list' && (
                            <Link to="/report/list" className="flex items-center gap-1.5 text-[14px] font-mediumtracking-wider hover:text-white transition-colors bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 whitespace-nowrap">
                                <ListChecks className="w-3.5 h-3.5" />
                                <span>{t('vehicleList.title')}</span>
                            </Link>
                        )}
                        {['ACCOUNTING', 'ADMIN'].includes(role || '') && location.pathname !== '/report/billing' && (
                            <Link to="/report/billing" className="flex items-center gap-1.5 text-[14px] font-mediumtracking-wider hover:text-white transition-colors bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 whitespace-nowrap">
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Billing</span>
                            </Link>
                        )}

                        {/* Two-tab workflow: open the live video call for this order (T7.7) */}
                        <OpenOtherAppTab target="video" caseNumber={reportCaseNumber} />

                        {/* Profile link */}
                        {/* {location.pathname !== '/profile' && (
                            <Link to="/profile" className="flex items-center gap-1.5 text-[14px] font-mediumtracking-wider hover:text-white transition-colors bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 whitespace-nowrap">
                                <UserRound className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('profilePage.title')}</span>
                            </Link>
                        )} */}

                        {/* Desktop Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="hidden lg:flex items-center gap-1.5 text-[14px] font-mediumtracking-wider hover:bg-red-600/20 hover:text-red-100 transition-all bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 ml-1 whitespace-nowrap"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>{t('auth.logout')}</span>
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
