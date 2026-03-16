import * as React from 'react';
import { ColorSchemeContext } from '../context/ColorSchemeContext';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import type {
  AccessOverrideState,
  AdminUserResponse,
  NotificationRecipientRule,
  PageKey,
  RolePageAccessRule,
  UserPageAccessOverview,
  UserRole,
} from '../types/api';
import {
  activateAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
  getAdminRolePageAccessRules,
  getAdminUserPageAccessOverview,
  getAdminNotificationRecipientRules,
  getAdminUsers,
  inviteAdminUser,
  resetAdminUserPassword,
  updateAdminRolePageAccessRules,
  updateAdminUserPageAccessOverrides,
  updateAdminNotificationRecipientRules,
  updateAdminUserEmail,
  updateAdminUserRole,
} from '../lib/api';

const ROLE_OPTIONS: UserRole[] = ['ADMIN', 'TECH', 'WORKER'];

const PAGE_KEY_ORDER: PageKey[] = [
  'DASHBOARD',
  'WORK_ORDERS',
  'URGENT_WORK_ORDERS',
  'MILEAGE',
  'ARCHIVE',
  'ANALYTICS',
  'USERS',
  'NOTIFICATIONS',
];

const FALLBACK_ALLOWED_BY_ROLE: Record<UserRole, PageKey[]> = {
  ADMIN: ['DASHBOARD', 'WORK_ORDERS', 'URGENT_WORK_ORDERS', 'MILEAGE', 'ARCHIVE', 'ANALYTICS', 'USERS', 'NOTIFICATIONS'],
  DEVELOPPER: ['DASHBOARD', 'WORK_ORDERS', 'URGENT_WORK_ORDERS', 'MILEAGE', 'ARCHIVE', 'ANALYTICS', 'USERS', 'NOTIFICATIONS'],
  TECH: ['DASHBOARD', 'WORK_ORDERS', 'URGENT_WORK_ORDERS', 'MILEAGE', 'NOTIFICATIONS'],
  WORKER: ['DASHBOARD', 'WORK_ORDERS', 'URGENT_WORK_ORDERS', 'MILEAGE', 'NOTIFICATIONS'],
};

const AdminUsersPage: React.FC = () => {
  const { t } = useLang();
  const { userId } = useAuth();
  const { colorScheme } = React.useContext(ColorSchemeContext);
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [users, setUsers] = React.useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<UserRole>('WORKER');
  const [inviting, setInviting] = React.useState(false);

  const [busyUserId, setBusyUserId] = React.useState<number | null>(null);

  const [rules, setRules] = React.useState<NotificationRecipientRule[]>([]);
  const [rulesLoading, setRulesLoading] = React.useState(true);
  const [rulesSaving, setRulesSaving] = React.useState(false);
  const [rulesDirty, setRulesDirty] = React.useState(false);

  const [pageRoleRules, setPageRoleRules] = React.useState<RolePageAccessRule[]>([]);
  const [pageRoleRulesLoading, setPageRoleRulesLoading] = React.useState(true);
  const [pageRoleRulesSaving, setPageRoleRulesSaving] = React.useState(false);
  const [pageRoleRulesDirty, setPageRoleRulesDirty] = React.useState(false);

  const [userAccessOverview, setUserAccessOverview] = React.useState<UserPageAccessOverview[]>([]);
  const [userAccessLoading, setUserAccessLoading] = React.useState(true);
  const [savingAccessUserId, setSavingAccessUserId] = React.useState<number | null>(null);
  const [dirtyUserOverrideIds, setDirtyUserOverrideIds] = React.useState<Set<number>>(new Set());
  const [expandedAccessUserId, setExpandedAccessUserId] = React.useState<number | null>(null);

  const isDark = colorScheme === 'dark';

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminUsersErrorLoad || 'Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, t.adminUsersErrorLoad]);

  const loadRules = React.useCallback(async () => {
    setRulesLoading(true);
    try {
      const data = await getAdminNotificationRecipientRules();
      setRules(data);
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminNotifRulesLoadError || 'Failed to load notification recipient rules.', 'error');
    } finally {
      setRulesLoading(false);
    }
  }, [addToast, t.adminNotifRulesLoadError]);

  const loadPageRoleRules = React.useCallback(async () => {
    setPageRoleRulesLoading(true);
    try {
      const data = await getAdminRolePageAccessRules();
      setPageRoleRules(data);
      setPageRoleRulesDirty(false);
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminPageAccessLoadError || 'Failed to load page access rules.', 'error');
    } finally {
      setPageRoleRulesLoading(false);
    }
  }, [addToast, t.adminPageAccessLoadError]);

  const loadUserAccessOverview = React.useCallback(async () => {
    setUserAccessLoading(true);
    try {
      const data = await getAdminUserPageAccessOverview();
      setUserAccessOverview(data);
      setDirtyUserOverrideIds(new Set());
      setExpandedAccessUserId((prev) => (prev != null && data.some((it) => it.userId === prev) ? prev : null));
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminPageAccessLoadError || 'Failed to load page access rules.', 'error');
    } finally {
      setUserAccessLoading(false);
    }
  }, [addToast, t.adminPageAccessLoadError]);

  React.useEffect(() => {
    loadUsers();
    loadRules();
    loadPageRoleRules();
    loadUserAccessOverview();
  }, [loadUsers, loadRules, loadPageRoleRules, loadUserAccessOverview]);

  const roleLabel = React.useCallback((role: UserRole): string => {
    if (role === 'ADMIN') return t.adminUsersRoleAdmin || 'Admin';
    if (role === 'DEVELOPPER') return t.adminUsersRoleDevelopper || 'Developper';
    if (role === 'TECH') return t.adminUsersRoleTech || 'Technician';
    return t.adminUsersRoleWorker || 'Worker';
  }, [t.adminUsersRoleAdmin, t.adminUsersRoleDevelopper, t.adminUsersRoleTech, t.adminUsersRoleWorker]);

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviting(true);
    try {
      await inviteAdminUser(inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('WORKER');
      addToast(t.adminUsersInvitedSuccess || 'User invited successfully.', 'success');
      await Promise.all([loadUsers(), loadUserAccessOverview()]);
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminUsersInviteFailed || 'Failed to invite user.', 'error');
    } finally {
      setInviting(false);
    }
  };

  const runUserAction = async (targetUserId: number, action: () => Promise<void>, successText: string) => {
    setBusyUserId(targetUserId);
    try {
      await action();
      addToast(successText, 'success');
      await Promise.all([loadUsers(), loadUserAccessOverview()]);
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminUsersActionFailed || 'Action failed.', 'error');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleEnabled = async (user: AdminUserResponse) => {
    if (user.enabled) {
      await runUserAction(
        user.id,
        async () => {
          await deactivateAdminUser(user.id);
        },
        t.adminUsersUpdated || 'User updated.'
      );
      return;
    }

    await runUserAction(
      user.id,
      async () => {
        await activateAdminUser(user.id);
      },
      t.adminUsersUpdated || 'User updated.'
    );
  };

  const handleRoleChange = async (targetUserId: number, role: UserRole) => {
    await runUserAction(
      targetUserId,
      async () => {
        await updateAdminUserRole(targetUserId, role);
      },
      t.adminUsersUpdated || 'User updated.'
    );
  };

  const handleResetPassword = async (targetUserId: number) => {
    const ok = await confirm({
      message: t.adminUsersResetConfirm || 'Reset this user password to Horizon?',
      confirmLabel: 'Reset',
    });
    if (!ok) return;

    await runUserAction(
      targetUserId,
      async () => {
        await resetAdminUserPassword(targetUserId);
      },
      t.adminUsersResetSuccess || 'Password reset to Horizon.'
    );
  };

  const handleDeleteUser = async (targetUserId: number) => {
    if (targetUserId === userId) {
      addToast(t.adminUsersCannotDeleteSelf || 'You cannot delete your own account.', 'error');
      return;
    }

    const ok = await confirm({
      message: t.adminUsersDeleteConfirm || 'Delete this user permanently?',
      title: 'Delete User',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    await runUserAction(
      targetUserId,
      () => deleteAdminUser(targetUserId),
      t.adminUsersUpdated || 'User updated.'
    );
  };

  const handleEmailChange = async (user: AdminUserResponse) => {
    const promptText = t.adminUsersChangeEmailPrompt || 'Enter the new email for this user:';
    const input = window.prompt(promptText, user.email);
    if (input == null) return;

    const nextEmail = input.trim().toLowerCase();
    if (!nextEmail || nextEmail === user.email.toLowerCase()) {
      return;
    }

    await runUserAction(
      user.id,
      async () => {
        await updateAdminUserEmail(user.id, nextEmail);
      },
      t.adminUsersEmailUpdated || 'User email updated.'
    );
  };

  const sourceLabel = React.useCallback((source: string): string => {
    switch (source) {
      case 'workorder-create':
        return t.adminNotifSourceWorkOrderCreate || 'Work Order Created';
      case 'urgent-create':
        return t.adminNotifSourceUrgentCreate || 'Urgent Work Order Created';
      case 'mileage-create':
        return t.adminNotifSourceMileageCreate || 'Mileage Entry Created';
      case 'REMINDER':
        return t.adminNotifSourceReminder || 'Reminders';
      case 'user-invite':
        return t.adminNotifSourceUserInvite || 'User Invited';
      case 'user-welcome':
        return t.adminNotifSourceUserWelcome || 'User Welcome';
      case 'user-reset-password':
        return t.adminNotifSourceUserResetPassword || 'User Password Reset';
      case 'user-email-change':
        return t.adminNotifSourceUserEmailChange || 'User Email Changed';
      case 'user-delete':
        return t.adminNotifSourceUserDelete || 'User Deleted';
      case 'user-activate':
        return t.adminNotifSourceUserActivate || 'User Activated';
      case 'user-deactivate':
        return t.adminNotifSourceUserDeactivate || 'User Deactivated';
      default:
        return source;
    }
  }, [
    t.adminNotifSourceMileageCreate,
    t.adminNotifSourceReminder,
    t.adminNotifSourceUrgentCreate,
    t.adminNotifSourceUserActivate,
    t.adminNotifSourceUserDeactivate,
    t.adminNotifSourceUserDelete,
    t.adminNotifSourceUserEmailChange,
    t.adminNotifSourceUserInvite,
    t.adminNotifSourceUserResetPassword,
    t.adminNotifSourceUserWelcome,
    t.adminNotifSourceWorkOrderCreate,
  ]);

  const roleDefaultAllowed = React.useCallback((role: UserRole, pageKey: PageKey): boolean => {
    const rule = pageRoleRules.find((it) => it.pageKey === pageKey);
    if (!rule) {
      return FALLBACK_ALLOWED_BY_ROLE[role].includes(pageKey);
    }

    if (role === 'ADMIN' || role === 'DEVELOPPER') return rule.admin;
    if (role === 'TECH') return rule.tech;
    return rule.worker;
  }, [pageRoleRules]);

  const pageLabel = React.useCallback((pageKey: PageKey): string => {
    switch (pageKey) {
      case 'DASHBOARD':
        return t.pageAccessDashboard || 'Dashboard';
      case 'WORK_ORDERS':
        return t.pageAccessWorkOrders || 'Work Orders';
      case 'URGENT_WORK_ORDERS':
        return t.pageAccessUrgentWorkOrders || 'Urgent Work Orders';
      case 'MILEAGE':
        return t.pageAccessMileage || 'Mileage';
      case 'ARCHIVE':
        return t.pageAccessArchive || 'Archive';
      case 'ANALYTICS':
        return t.pageAccessAnalytics || 'Analytics';
      case 'USERS':
        return t.pageAccessUsers || 'Users';
      case 'NOTIFICATIONS':
        return t.pageAccessNotifications || 'Notifications';
      default:
        return pageKey;
    }
  }, [
    t.pageAccessAnalytics,
    t.pageAccessArchive,
    t.pageAccessDashboard,
    t.pageAccessMileage,
    t.pageAccessNotifications,
    t.pageAccessUrgentWorkOrders,
    t.pageAccessUsers,
    t.pageAccessWorkOrders,
  ]);

  const updatePageRoleRule = (pageKey: PageKey, field: 'admin' | 'tech' | 'worker', value: boolean) => {
    setPageRoleRules((prev) => prev.map((rule) => {
      if (rule.pageKey !== pageKey) return rule;
      return { ...rule, [field]: value };
    }));
    setPageRoleRulesDirty(true);
  };

  const updateUserOverride = (targetUserId: number, pageKey: PageKey, state: AccessOverrideState) => {
    setUserAccessOverview((prev) => prev.map((user) => {
      if (user.userId !== targetUserId) return user;
      return {
        ...user,
        pages: user.pages.map((page) => {
          if (page.pageKey !== pageKey) return page;
          const effectiveAllowed = state === 'ALLOW'
            ? true
            : state === 'DENY'
              ? false
              : roleDefaultAllowed(user.role, pageKey);
          return { ...page, state, effectiveAllowed };
        }),
      };
    }));
    setDirtyUserOverrideIds((prev) => {
      const next = new Set(prev);
      next.add(targetUserId);
      return next;
    });
  };

  const handleSavePageRoleRules = async () => {
    setPageRoleRulesSaving(true);
    try {
      const saved = await updateAdminRolePageAccessRules(pageRoleRules);
      setPageRoleRules(saved);
      setPageRoleRulesDirty(false);
      addToast(t.adminPageAccessSaved || 'Page access rules saved.', 'success');
      await loadUserAccessOverview();
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminPageAccessSaveError || 'Failed to save page access rules.', 'error');
    } finally {
      setPageRoleRulesSaving(false);
    }
  };

  const handleSaveUserOverrides = async (overview: UserPageAccessOverview) => {
    setSavingAccessUserId(overview.userId);
    try {
      const saved = await updateAdminUserPageAccessOverrides(
        overview.userId,
        overview.pages.map((page) => ({ pageKey: page.pageKey, state: page.state }))
      );

      setUserAccessOverview((prev) => prev.map((user) => user.userId === saved.userId ? saved : user));
      setDirtyUserOverrideIds((prev) => {
        const next = new Set(prev);
        next.delete(overview.userId);
        return next;
      });
      addToast(t.adminPageAccessUserSaved || 'User page overrides saved.', 'success');
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminPageAccessSaveError || 'Failed to save page access rules.', 'error');
    } finally {
      setSavingAccessUserId(null);
    }
  };

  const updateRule = (source: string, field: 'admin' | 'tech' | 'worker', value: boolean) => {
    setRules((prev) => prev.map((rule) => {
      if (rule.source !== source) return rule;
      return { ...rule, [field]: value };
    }));
    setRulesDirty(true);
  };

  const handleSaveRules = async () => {
    setRulesSaving(true);
    try {
      const saved = await updateAdminNotificationRecipientRules(rules);
      setRules(saved);
      setRulesDirty(false);
      addToast(t.adminNotifRulesSaved || 'Notification recipient rules saved.', 'success');
    } catch (err: any) {
      addToast(err?.response?.data?.message || t.adminNotifRulesSaveError || 'Failed to save notification recipient rules.', 'error');
    } finally {
      setRulesSaving(false);
    }
  };

  return (
    <div className={`p-6 min-h-screen ${isDark ? 'bg-surface-950' : 'bg-surface-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className={`rounded-2xl border p-4 ${isDark ? 'bg-surface-900 border-surface-800 text-surface-200' : 'bg-white border-surface-200 text-surface-700'}`}>
          <p className="text-sm font-medium">
            {t.adminUsersDefaultPassword || 'Default password for invited and reset accounts: Horizon'}
          </p>
        </div>

        <section className={`rounded-2xl border p-5 ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
            {t.adminUsersInviteTitle || 'Invite User'}
          </h2>
          <p className={`text-sm mb-4 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
            {t.adminUsersInviteDescription || 'Register a user with email and role. They can log in with Horizon and change their own password in settings.'}
          </p>

          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder={t.adminUsersEmailPlaceholder || 'name@company.com'}
              className={`md:col-span-2 px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-500 ${isDark ? 'bg-surface-950 border-surface-700 text-surface-100' : 'bg-white border-surface-200 text-surface-900'}`}
            />

            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className={`px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-500 ${isDark ? 'bg-surface-950 border-surface-700 text-surface-100' : 'bg-white border-surface-200 text-surface-900'}`}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>{roleLabel(role)}</option>
              ))}
            </select>

            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {inviting ? (t.loading || 'Loading...') : (t.adminUsersInviteButton || 'Invite User')}
            </button>
          </form>
        </section>

        <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
            <h2 className={`text-lg font-bold ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
              {t.adminUsersListTitle || 'All Users'}
            </h2>
          </div>

          {loading ? (
            <div className={`px-5 py-8 text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
              {t.adminUsersLoading || t.loading || 'Loading...'}
            </div>
          ) : users.length === 0 ? (
            <div className={`px-5 py-8 text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
              {t.adminUsersNoUsers || 'No users found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className={isDark ? 'bg-surface-800/60' : 'bg-surface-50'}>
                    <th className={`text-left px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.adminUsersEmail || 'Email'}</th>
                    <th className={`text-left px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.adminUsersRole || 'Role'}</th>
                    <th className={`text-left px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.adminUsersStatus || 'Status'}</th>
                    <th className={`text-left px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>{t.adminUsersActions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = user.id === userId;
                    const rowBusy = busyUserId === user.id;
                    const isLockedDevelopper = user.role === 'DEVELOPPER';

                    return (
                      <tr key={user.id} className={`border-t ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
                        <td className={`px-5 py-4 font-medium ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
                          <div className="flex items-center gap-2">
                            <span>{user.email}</span>
                            {isSelf && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-brand-900/40 text-brand-300' : 'bg-brand-50 text-brand-700'}`}>
                                {t.adminUsersSelfLabel || 'You'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {isLockedDevelopper ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                              {roleLabel(user.role)}
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              disabled={rowBusy}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                              className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isDark ? 'bg-surface-950 border-surface-700 text-surface-100' : 'bg-white border-surface-200 text-surface-900'} ${rowBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>{roleLabel(role)}</option>
                              ))}
                            </select>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${user.enabled ? (isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700')}`}>
                            {user.enabled
                              ? (t.adminUsersStatusActive || 'Active')
                              : (t.adminUsersStatusInactive || 'Inactive')}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleToggleEnabled(user)}
                              disabled={rowBusy || isLockedDevelopper}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${user.enabled ? (isDark ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50' : 'bg-red-50 text-red-700 hover:bg-red-100') : (isDark ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')} ${(rowBusy || isLockedDevelopper) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {user.enabled
                                ? (t.adminUsersDeactivate || 'Deactivate')
                                : (t.adminUsersActivate || 'Activate')}
                            </button>

                            <button
                              onClick={() => handleEmailChange(user)}
                              disabled={rowBusy || isLockedDevelopper}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} ${(rowBusy || isLockedDevelopper) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {t.adminUsersChangeEmail || 'Change Email'}
                            </button>

                            <button
                              onClick={() => handleResetPassword(user.id)}
                              disabled={rowBusy}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-surface-800 text-surface-200 hover:bg-surface-700' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'} ${rowBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {t.adminUsersResetPassword || 'Reset Password'}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={rowBusy || isSelf || isLockedDevelopper}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50' : 'bg-red-50 text-red-700 hover:bg-red-100'} ${(rowBusy || isSelf || isLockedDevelopper) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {t.adminUsersDeleteUser || 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
                {t.adminPageAccessTitle || 'Page Access Rules'}
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                {t.adminPageAccessDescription || 'Configure default page access by role.'}
              </p>
            </div>

            <button
              onClick={handleSavePageRoleRules}
              disabled={pageRoleRulesSaving || !pageRoleRulesDirty || pageRoleRulesLoading}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pageRoleRulesSaving ? (t.loading || 'Loading...') : (t.adminPageAccessSave || 'Save Rules')}
            </button>
          </div>

          {pageRoleRulesLoading ? (
            <div className={`px-5 py-8 text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
              {t.loading || 'Loading...'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className={isDark ? 'bg-surface-800/60' : 'bg-surface-50'}>
                    <th className={`text-left px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {t.adminPageAccessPage || 'Page'}
                    </th>
                    <th className={`text-center px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {t.adminUsersRoleAdmin || 'Admin'}
                    </th>
                    <th className={`text-center px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {t.adminUsersRoleTech || 'Technician'}
                    </th>
                    <th className={`text-center px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {t.adminUsersRoleWorker || 'Worker'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRoleRules.map((rule) => (
                    <tr key={rule.pageKey} className={`border-t ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
                      <td className={`px-5 py-4 text-sm font-medium ${isDark ? 'text-surface-200' : 'text-surface-800'}`}>
                        {pageLabel(rule.pageKey)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.admin}
                          onChange={(e) => updatePageRoleRule(rule.pageKey, 'admin', e.target.checked)}
                          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.tech}
                          onChange={(e) => updatePageRoleRule(rule.pageKey, 'tech', e.target.checked)}
                          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.worker}
                          onChange={(e) => updatePageRoleRule(rule.pageKey, 'worker', e.target.checked)}
                          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
            <h2 className={`text-lg font-bold ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
              {t.adminPageAccessUserOverridesTitle || 'User-specific Page Overrides'}
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
              {t.adminPageAccessUserOverridesDescription || 'Set per-user page access overrides and review effective allow/deny status.'}
            </p>
          </div>

          {userAccessLoading ? (
            <div className={`px-5 py-8 text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
              {t.loading || 'Loading...'}
            </div>
          ) : userAccessOverview.length === 0 ? (
            <div className={`px-5 py-8 text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
              {t.adminUsersNoUsers || 'No users found.'}
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {userAccessOverview.map((overview) => {
                const rowBusy = savingAccessUserId === overview.userId;
                const rowDirty = dirtyUserOverrideIds.has(overview.userId);
                const rowExpanded = expandedAccessUserId === overview.userId;

                return (
                  <div key={overview.userId} className={`rounded-xl border p-4 ${isDark ? 'border-surface-800 bg-surface-950/40' : 'border-surface-200 bg-surface-50/70'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedAccessUserId((prev) => (prev === overview.userId ? null : overview.userId))}
                        className={`flex-1 min-w-[220px] text-left rounded-lg px-2 py-1 transition-colors ${isDark ? 'hover:bg-surface-900/60' : 'hover:bg-white/80'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className={`font-semibold ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>{overview.email}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-brand-900/40 text-brand-300' : 'bg-brand-50 text-brand-700'}`}>
                                {roleLabel(overview.role)}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${overview.enabled ? (isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700')}`}>
                                {overview.enabled
                                  ? (t.adminUsersStatusActive || 'Active')
                                  : (t.adminUsersStatusInactive || 'Inactive')}
                              </span>
                              {rowDirty && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                                  {t.adminPageAccessPending || 'Pending'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${isDark ? 'text-surface-300' : 'text-surface-600'}`}>
                            {rowExpanded ? '▴' : '▾'}
                          </span>
                        </div>
                      </button>

                      {rowExpanded && (
                        <button
                          onClick={() => handleSaveUserOverrides(overview)}
                          disabled={rowBusy || !rowDirty}
                          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {rowBusy ? (t.loading || 'Loading...') : (t.adminPageAccessSaveUser || 'Save User Overrides')}
                        </button>
                      )}
                    </div>

                    {rowExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                        {PAGE_KEY_ORDER.map((pageKey) => {
                          const page = overview.pages.find((item) => item.pageKey === pageKey);
                          if (!page) return null;

                          const effectiveAllowed = page.state === 'DEFAULT'
                            ? roleDefaultAllowed(overview.role, page.pageKey)
                            : page.effectiveAllowed;

                          return (
                            <div key={page.pageKey} className={`rounded-lg border p-3 ${isDark ? 'border-surface-800 bg-surface-900/60' : 'border-surface-200 bg-white'}`}>
                              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                                {pageLabel(page.pageKey)}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <select
                                  value={page.state}
                                  disabled={rowBusy}
                                  onChange={(e) => updateUserOverride(overview.userId, page.pageKey, e.target.value as AccessOverrideState)}
                                  className={`flex-1 px-2 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isDark ? 'bg-surface-950 border-surface-700 text-surface-100' : 'bg-white border-surface-200 text-surface-900'} ${rowBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                  <option value="DEFAULT">{t.pageAccessDefault || 'Default'}</option>
                                  <option value="ALLOW">{t.pageAccessAllow || 'Allow'}</option>
                                  <option value="DENY">{t.pageAccessDeny || 'Deny'}</option>
                                </select>

                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${effectiveAllowed ? (isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700')}`}>
                                  {effectiveAllowed
                                    ? (t.pageAccessAllowed || 'Allowed')
                                    : (t.pageAccessDenied || 'Denied')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-surface-100' : 'text-surface-900'}`}>
                {t.adminNotifRulesTitle || 'Notification Recipient Rules'}
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                {t.adminNotifRulesDescription || 'Choose which roles receive each notification type.'}
              </p>
            </div>

            <button
              onClick={handleSaveRules}
              disabled={rulesSaving || !rulesDirty || rulesLoading}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {rulesSaving ? (t.loading || 'Loading...') : (t.adminNotifRulesSave || 'Save Rules')}
            </button>
          </div>

          {rulesLoading ? (
            <div className={`px-5 py-8 text-sm ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
              {t.loading || 'Loading...'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className={isDark ? 'bg-surface-800/60' : 'bg-surface-50'}>
                    <th className={`text-left px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {t.adminNotifRulesEvent || 'Event'}
                    </th>
                    <th className={`text-center px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {t.adminUsersRoleAdmin || 'Admin'}
                    </th>
                    <th className={`text-center px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {t.adminUsersRoleTech || 'Technician'}
                    </th>
                    <th className={`text-center px-5 py-3 text-xs uppercase tracking-wide ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                      {t.adminUsersRoleWorker || 'Worker'}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.source} className={`border-t ${isDark ? 'border-surface-800' : 'border-surface-100'}`}>
                      <td className={`px-5 py-4 text-sm font-medium ${isDark ? 'text-surface-200' : 'text-surface-800'}`}>
                        {sourceLabel(rule.source)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.admin}
                          onChange={(e) => updateRule(rule.source, 'admin', e.target.checked)}
                          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.tech}
                          onChange={(e) => updateRule(rule.source, 'tech', e.target.checked)}
                          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.worker}
                          onChange={(e) => updateRule(rule.source, 'worker', e.target.checked)}
                          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className={`text-center text-sm opacity-70 ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
          {t.pageExplanationUsers}
        </p>
      </div>
    </div>
  );
};

export default AdminUsersPage;