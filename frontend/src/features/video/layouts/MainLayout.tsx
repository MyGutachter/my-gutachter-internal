import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import { ThemeProvider } from '../ThemeContext';

/**
 * Video Expert app shell (T7.8) — faithful port of VideoExpert's MainLayout
 * (Sidebar + Header + Footer). The root carries `video-app` so the scoped video
 * accent/dark CSS variables (index.css) apply only here, not to report pages.
 * The app-level <Toaster> (App.tsx) is reused, so this port omits its own.
 */
interface MainLayoutProps {
    children: ReactNode;
}

const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer className="h-12 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-footer)] flex items-center justify-between px-6 text-xs text-[var(--color-text-muted)] mt-auto">
            <div className="flex items-center">
                <span className="font-bold text-[var(--color-text-primary)] mr-2">VX</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{t('common.autoDamageInspection', { defaultValue: 'Auto Damage Inspection' })}</span>
            </div>

            <div className="flex items-center space-x-4">
                <span>Ver. 1.0.0.0</span>
                <span>&copy; 2025 Video Expert</span>
            </div>
        </footer>
    );
};

const MainLayout = ({ children }: MainLayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const sidebarWidth = isSidebarOpen ? '288px' : '80px';

    return (
        <ThemeProvider>
            <div
                className="video-app flex h-screen w-full bg-[var(--color-bg-primary)] overflow-hidden font-sans"
                style={{ '--sidebar-width': sidebarWidth } as React.CSSProperties}
            >
                {/* Left Sidebar - Fixed width */}
                <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />

                {/* Main Content Wrapper - Flex column */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
                    <Header isSidebarOpen={isSidebarOpen} onMenuClick={toggleSidebar} />

                    {/* Main Workspace - Content Only */}
                    <div className="flex flex-col flex-1 overflow-hidden relative bg-[var(--color-bg-secondary)]">
                        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative z-0">
                            {children}
                        </main>

                        <Footer />
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
};

export default MainLayout;
