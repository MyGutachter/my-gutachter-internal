import { UserCog, Users, Eye } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { UserRole } from '../../store/authStore';
import { useReportStore } from '../../store/reportStore';
import api from '../../utils/api';

interface User {
    email: string;
    username: string;
    role: UserRole;
    canViewAllOrders?: boolean;
}

const AdminUserManagement: React.FC = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const store = useReportStore();
    const globalConfig = store.globalConfig;
    const setGlobalConfig = store.setGlobalConfig;

    const fetchUsers = async () => {
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
            toast.error(t('admin.users.failedLoad'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (email: string, newRole: UserRole) => {
        try {
            await api.put(`/admin/users/${encodeURIComponent(email)}/role`, { role: newRole });
            toast.success(t('admin.users.roleUpdated'));
            setUsers(users.map(u => u.email === email ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Failed to update role', error);
            toast.error(t('admin.users.failedUpdate'));
            fetchUsers();
        }
    };

    const handleToggleCanViewAllOrders = async (email: string, currentVal: boolean) => {
        try {
            await api.put(`/admin/users/${encodeURIComponent(email)}/can-view-all-orders`, { canViewAllOrders: !currentVal });
            toast.success(t('admin.users.permissionUpdated', 'Berechtigungen aktualisiert'));
            setUsers(users.map(u => u.email === email ? { ...u, canViewAllOrders: !currentVal } : u));
        } catch (error) {
            console.error('Failed to update permission', error);
            toast.error(t('admin.users.failedUpdatePermission', 'Fehler beim Aktualisieren der Berechtigungen'));
        }
    };

    const handleRoleVisibilityChange = async (roleKey: string, checked: boolean) => {
        if (!globalConfig) return;

        const currentRoles = globalConfig.allowedRolesToViewAllOrders || [];
        let newRoles = [...currentRoles];
        if (checked) {
            if (!newRoles.includes(roleKey)) {
                newRoles.push(roleKey);
            }
        } else {
            newRoles = newRoles.filter(r => r !== roleKey);
        }

        const updatedConfig = {
            ...globalConfig,
            allowedRolesToViewAllOrders: newRoles
        };

        try {
            await api.post('/config', updatedConfig);
            setGlobalConfig(updatedConfig as any);
            toast.success(t('admin.saveSuccess'));
        } catch (error) {
            console.error('Failed to save config', error);
            toast.error(t('admin.saveError'));
        }
    };

    const allowedRoles = globalConfig?.allowedRolesToViewAllOrders || [];
    const rolesList = [
        { key: 'ADMIN', label: t('admin.users.roles.admin') },
        { key: 'EXPERT', label: t('admin.users.roles.expert') },
        { key: 'DISPATCH', label: t('admin.users.roles.dispatch') },
        { key: 'ACCOUNTING', label: t('admin.users.roles.accounting') }
    ];

    return (
        <div className="space-y-6">
            {/* Global Visibility Options */}
            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2 tracking-tight">
                    <div className="bg-amber-600/20 p-2 rounded-xl">
                        <Eye className="w-5 h-5 text-amber-600" />
                    </div>
                    {t('admin.users.visibilityTitle', 'Sichtbarkeitsrechte nach Rolle')}
                </h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                    {t('admin.users.visibilitySubtitle', 'Wählen Sie aus, welche Benutzerrollen standardmäßig Zugriff auf alle Berichte haben sollen.')}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    {rolesList.map((role) => (
                        <label key={role.key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <input
                                type="checkbox"
                                checked={role.key === 'ADMIN' || allowedRoles.includes(role.key)}
                                disabled={role.key === 'ADMIN'}
                                onChange={(e) => handleRoleVisibilityChange(role.key, e.target.checked)}
                                className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 disabled:opacity-50"
                            />
                            <span className="text-sm font-bold text-slate-700">{role.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* User Roles Table */}
            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 tracking-tight">
                    <div className="bg-amber-600/20 p-2 rounded-xl">
                        <Users className="w-5 h-5 text-amber-600" />
                    </div>
                    {t('admin.roleManagement')}
                </h3>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('admin.users.user')}</th>
                                        <th className="hidden md:table-cell px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('admin.users.email')}</th>
                                        <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('admin.users.role')}</th>
                                        <th className="px-3 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('admin.users.viewAllOrders', 'Alle Berichte ansehen')}</th>
                                        <th className="px-3 sm:px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('admin.users.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.map((user) => (
                                        <tr key={user.email} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-3 sm:px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase shrink-0">
                                                        {user.username.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-slate-800 truncate">{user.username}</span>
                                                        <span className="md:hidden text-[10px] text-slate-400 font-medium truncate">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-6 py-4 text-slate-500 font-medium">
                                                {user.email}
                                            </td>
                                            <td className="px-3 sm:px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    user.role === 'ADMIN' ? 'bg-red-100 text-red-600' :
                                                    user.role === 'EXPERT' ? 'bg-amber-600/10 text-amber-600' :
                                                    user.role === 'DISPATCH' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-purple-100 text-purple-600'
                                                }`}>
                                                    {t(`admin.users.roles.${user.role.toLowerCase()}`)}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={user.role === 'ADMIN' || allowedRoles.includes(user.role) || !!user.canViewAllOrders}
                                                    disabled={user.role === 'ADMIN' || allowedRoles.includes(user.role)}
                                                    onChange={() => handleToggleCanViewAllOrders(user.email, !!user.canViewAllOrders)}
                                                    className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 disabled:opacity-50 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 text-right">
                                                <div className="flex justify-end relative group">
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => handleRoleChange(user.email, e.target.value as UserRole)}
                                                        className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] sm:text-sm rounded-xl px-3 sm:px-4 py-2 pr-7 sm:pr-8 cursor-pointer outline-none focus:ring-2 focus:ring-amber-600/20 transition-all"
                                                    >
                                                        <option value="ADMIN">{t('admin.users.roles.admin')}</option>
                                                        <option value="EXPERT">{t('admin.users.roles.expert')}</option>
                                                        <option value="DISPATCH">{t('admin.users.roles.dispatch')}</option>
                                                        <option value="ACCOUNTING">{t('admin.users.roles.accounting')}</option>
                                                    </select>
                                                    <UserCog className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                                                {t('admin.users.noUsers')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminUserManagement;
