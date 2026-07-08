import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'ADMIN' | 'EXPERT' | 'DISPATCH' | 'ACCOUNTING';

interface AuthState {
  token: string | null;
  expertName: string | null;
  role: UserRole | null;
  isVideoxpert: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setAuth: (token: string, expertName: string, role: UserRole, isVideoxpert?: boolean) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      expertName: null,
      role: null,
      isVideoxpert: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setAuth: (token, expertName, role, isVideoxpert = false) =>
        set({ token, expertName, role, isVideoxpert }),
      logout: () => {
        set({ token: null, expertName: null, role: null, isVideoxpert: false });
        localStorage.removeItem('auth-storage');
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
