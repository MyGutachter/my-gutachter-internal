import { User, ChevronDown, Settings, Sun, Moon, Menu } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../useVideoAuth';
import { useTheme } from '../../ThemeContext';
import ukFlag from '../../assets/uk_flag.svg';
import deFlag from '../../assets/germany_flag.svg';
import logo from '../../assets/logo.png';

/**
 * Video Expert header (T7.8) — faithful port. Rewired to `useVideoAuth` and the
 * scoped `useTheme` (video shell only). Profile/Settings nav unchanged.
 */
interface HeaderProps {
    isSidebarOpen: boolean;
    onMenuClick: () => void;
}

const Header = ({ isSidebarOpen, onMenuClick }: HeaderProps) => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const getFlag = (lang: string) => (lang === 'de' ? deFlag : ukFlag);
    const getLabel = (lang: string) => (lang === 'de' ? 'Deutsch' : 'English');

    return (
        <header className="h-16 bg-[var(--color-bg-header)] border-b border-[var(--color-border-primary)] flex items-center px-4 md:px-6 shadow-sm z-10 sticky top-0">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-secondary)] md:hidden"
                >
                    <Menu size={24} />
                </button>

                {!isSidebarOpen && (
                    <div className="flex items-center">
                        <img src={logo} alt="MyGutachter" className="h-8 w-auto object-contain" />
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-4 ml-auto">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer text-[var(--color-text-secondary)]"
                    title={theme === 'light' ? t('common.darkMode', { defaultValue: 'Dark Mode' }) : t('common.lightMode', { defaultValue: 'Light Mode' })}
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="text-[var(--color-primary-orange)]" />}
                </button>

                <div className="relative">
                    <button
                        onClick={() => { setIsLangMenuOpen(!isLangMenuOpen); setIsUserMenuOpen(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer text-sm font-medium text-[var(--color-text-primary)]"
                    >
                        <img src={getFlag(i18n.language)} alt="Flag" className="h-4 w-6 object-cover rounded-sm shadow-sm" />
                        <span>{getLabel(i18n.language)}</span>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isLangMenuOpen && (
                        <div className="absolute top-full right-0 mt-1 w-40 bg-[var(--color-bg-card)] rounded-xl shadow-lg border border-[var(--color-border-primary)] py-1 overflow-hidden z-20">
                            <button
                                onClick={() => { i18n.changeLanguage('en'); setIsLangMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer ${i18n.language === 'en' ? 'bg-[var(--color-bg-hover)] text-[var(--color-primary-orange)] font-medium' : 'text-[var(--color-text-primary)]'}`}
                            >
                                <img src={ukFlag} alt="UK" className="h-4 w-6 object-cover rounded-sm shadow-sm" />
                                English
                            </button>
                            <button
                                onClick={() => { i18n.changeLanguage('de'); setIsLangMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer ${i18n.language === 'de' ? 'bg-[var(--color-bg-hover)] text-[var(--color-primary-orange)] font-medium' : 'text-[var(--color-text-primary)]'}`}
                            >
                                <img src={deFlag} alt="DE" className="h-4 w-6 object-cover rounded-sm shadow-sm" />
                                Deutsch
                            </button>
                        </div>
                    )}
                    {isLangMenuOpen && (
                        <div className="fixed inset-0 z-10" onClick={() => setIsLangMenuOpen(false)}></div>
                    )}
                </div>

                <div className="relative">
                    <button
                        onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); setIsLangMenuOpen(false); }}
                        className="flex items-center text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary-orange)] transition-colors cursor-pointer focus:outline-none"
                    >
                        <div className="h-8 w-8 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mr-3 text-[var(--color-text-secondary)] overflow-hidden border border-[var(--color-border-primary)]">
                            {user?.profilePicture ? (
                                <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <User size={16} />
                            )}
                        </div>
                        <span className="hidden md:inline-block mr-2">{user?.fullName || t('auth.guestUser', { defaultValue: 'User' })}</span>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                        <div className="absolute right-0 top-full pt-2 w-48 z-20">
                            <div className="bg-[var(--color-bg-card)] rounded-xl shadow-lg border border-[var(--color-border-primary)] py-1 overflow-hidden">
                                <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
                                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user?.fullName || t('auth.guestUser', { defaultValue: 'User' })}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] truncate">{user?.email || ''}</p>
                                </div>

                                <button
                                    onClick={() => { setIsUserMenuOpen(false); navigate('/profile'); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-primary-orange)] transition-colors cursor-pointer"
                                >
                                    <User size={16} />
                                    {t('common.profile', { defaultValue: 'Profile' })}
                                </button>

                                <button
                                    onClick={() => { setIsUserMenuOpen(false); navigate('/settings'); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-primary-orange)] transition-colors cursor-pointer"
                                >
                                    <Settings size={16} />
                                    {t('common.settings', { defaultValue: 'Settings' })}
                                </button>
                            </div>
                        </div>
                    )}
                    {isUserMenuOpen && (
                        <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)}></div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
