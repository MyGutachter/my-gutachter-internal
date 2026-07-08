import { useEffect } from 'react';
import { create } from 'zustand';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';

/**
 * Auth adapter (T7.6c) that bridges the ported Video Expert pages — written
 * against a React-Context `useAuth()` returning a rich `user` object — to the
 * merged app's Zustand `authStore` (which only holds token/expertName/role) plus
 * a self-profile fetch (GET /api/users/profile). Ported Settings/Profile/2FA
 * pages import `useAuth` from here instead of the old context.
 */
export interface VideoUser {
    fullName?: string;
    email?: string;
    profilePicture?: string;
    twoFactorEnabled?: boolean;
    role?: string;
    token?: string;
}

interface VideoAuthState {
    user: VideoUser | null;
    loaded: boolean;
    setUser: (user: VideoUser | null) => void;
    fetchProfile: () => Promise<void>;
}

const useVideoAuthStore = create<VideoAuthState>((set) => ({
    user: null,
    loaded: false,
    setUser: (user) => set({ user, loaded: true }),
    fetchProfile: async () => {
        try {
            const res = await api.get('/users/profile');
            const token = useAuthStore.getState().token || undefined;
            set({ user: { ...res.data, token }, loaded: true });
        } catch (err) {
            console.error('Failed to load profile', err);
            set({ loaded: true });
        }
    },
}));

/**
 * Drop-in replacement for the video app's `useAuth()`. Auto-fetches the profile
 * once when a session exists. `login` locally patches the cached user (the
 * ported pages call it after a profile/2FA change to reflect the new state).
 */
export const useAuth = () => {
    const user = useVideoAuthStore((s) => s.user);
    const loaded = useVideoAuthStore((s) => s.loaded);
    const setUser = useVideoAuthStore((s) => s.setUser);
    const fetchProfile = useVideoAuthStore((s) => s.fetchProfile);
    const token = useAuthStore((s) => s.token);
    const logout = useAuthStore((s) => s.logout);

    useEffect(() => {
        if (token && !loaded) {
            fetchProfile();
        }
    }, [token, loaded, fetchProfile]);

    return {
        user,
        loaded,
        login: (u: VideoUser) => setUser(u),
        logout,
        refresh: fetchProfile,
    };
};
