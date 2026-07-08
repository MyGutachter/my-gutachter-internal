import api from '../../../utils/api';

/**
 * Profile/security service (T7.6c) — rewired from the VideoExpert source to the
 * merged backend's ProfileController (/api/users/**) and TwoFactorController
 * (/api/2fa/**). Unlike the source, profile updates are sent as JSON (avatar as
 * a URL or data URI string), not multipart.
 */

export const getProfile = async () => {
    const res = await api.get('/users/profile');
    return res.data;
};

export const updateProfile = async (
    fullName: string,
    profilePicture?: string,
    twoFactorCode?: string
) => {
    const res = await api.patch('/users/profile', {
        fullName,
        ...(profilePicture !== undefined ? { profilePicture } : {}),
        ...(twoFactorCode ? { twoFactorCode } : {}),
    });
    return res.data;
};

export const changePassword = async (
    currentPassword: string,
    newPassword: string,
    twoFactorCode?: string
) => {
    const res = await api.patch('/users/change-password', {
        currentPassword,
        newPassword,
        ...(twoFactorCode ? { twoFactorCode } : {}),
    });
    return res.data;
};

export const disableTwoFactor = async (code?: string) => {
    const res = await api.post('/2fa/disable', { code });
    return res.data;
};
