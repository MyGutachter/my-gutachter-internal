import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
    language: 'de' | 'en';
    currentStep: number;
    sidebarCollapsed: boolean;
    mobileMenuOpen: boolean;
    showValidationErrors: boolean;
    setLanguage: (lang: 'de' | 'en') => void;
    setCurrentStep: (step: number) => void;
    setShowValidationErrors: (show: boolean) => void;
    toggleSidebar: () => void;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            language: 'de',
            currentStep: 1,
            sidebarCollapsed: false,
            mobileMenuOpen: false,
            showValidationErrors: false,
            _hasHydrated: false,
            setLanguage: (lang) => set({ language: lang }),
            setCurrentStep: (step) => set({ currentStep: step, showValidationErrors: false }),
            setShowValidationErrors: (show) => set({ showValidationErrors: show }),
            toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
            toggleMobileMenu: () => set(s => ({ mobileMenuOpen: !s.mobileMenuOpen })),
            closeMobileMenu: () => set({ mobileMenuOpen: false }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'ui-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
