// Expo Router uses these typed destinations instead of Next.js URL helpers.
export const BACKEND_SITE_ADMIN = `${process.env.EXPO_PUBLIC_API_URL}/gestion-interne-x7k2/`;
// Auth
export const AUTH_LOGIN = '/login' as const;
// Auth forgot password
export const AUTH_RESET_PASSWORD = '/reset-password' as const;
export const AUTH_RESET_PASSWORD_ENTER_CODE = '/reset-password/enter-code' as const;
export const AUTH_RESET_PASSWORD_SET_PASSWORD = '/reset-password/set-password' as const;
export const AUTH_RESET_PASSWORD_COMPLETE = '/reset-password/set-password-complete' as const;
// dashboard
export const DASHBOARD = '/' as const;
export const DASHBOARD_SETTINGS = '/settings' as const;
export const NOTIFICATIONS_LIST = '/notifications' as const;
// Mon profil
export const DASHBOARD_EDIT_PROFILE = '/settings/edit-profile' as const;
export const DASHBOARD_PASSWORD = '/settings/password' as const;
export const DASHBOARD_NOTIFICATIONS = '/settings/notifications' as const;
// Companies
export const COMPANIES_LIST = '/companies' as const;
export const COMPANIES_ADD = '/companies/form' as const;
export const COMPANIES_VIEW = (id: number) => ({
	pathname: '/companies/[id]' as const,
	params: { id: String(id) },
});
export const COMPANIES_EDIT = (id: number) => ({
	pathname: '/companies/form' as const,
	params: { id: String(id) },
});
// Clients
export const CLIENTS_LIST = '/clients' as const;
export const CLIENTS_ARCHIVED = '/clients/archived' as const;
export const CLIENTS_ADD = '/clients/form' as const;
export const CLIENTS_VIEW = (id: number) => ({
	pathname: '/clients/[id]' as const,
	params: { id: String(id) },
});
export const CLIENTS_EDIT = (id: number) => ({
	pathname: '/clients/form' as const,
	params: { id: String(id) },
});

// Users
export const USERS_LIST = '/users' as const;
export const USERS_ADD = '/users/form' as const;
export const USERS_VIEW = (id: number) => ({
	pathname: '/users/[id]' as const,
	params: { id: String(id) },
});
export const USERS_EDIT = (id: number) => ({
	pathname: '/users/form' as const,
	params: { id: String(id) },
});

// Backend notification targets still use the web paths. Only map implemented mobile screens.
export const getNotificationDestination = (target?: string) => {
	if (!target || !/^\/dashboard(?:[/?]|$)/.test(target)) return null;
	const path = target.split('?')[0].replace(/\/$/, '');
	if (path === '/dashboard') return DASHBOARD;
	if (path === '/dashboard/companies') return COMPANIES_LIST;
	if (path === '/dashboard/companies/new') return COMPANIES_ADD;
	if (path === '/dashboard/clients') return CLIENTS_LIST;
	if (path === '/dashboard/clients/archived') return CLIENTS_ARCHIVED;
	if (path === '/dashboard/users') return USERS_LIST;
	if (path === '/dashboard/users/new') return USERS_ADD;
	if (path === '/dashboard/settings/edit-profile') return DASHBOARD_EDIT_PROFILE;
	if (path === '/dashboard/settings/password') return DASHBOARD_PASSWORD;
	if (path === '/dashboard/settings/notifications') return DASHBOARD_NOTIFICATIONS;
	const match = /^\/dashboard\/(companies|users)\/([1-9]\d*)(\/edit)?$/.exec(path);
	if (!match || !Number.isSafeInteger(Number(match[2]))) return null;
	const id = Number(match[2]);
	return match[1] === 'companies'
		? match[3]
			? COMPANIES_EDIT(id)
			: COMPANIES_VIEW(id)
		: match[3]
			? USERS_EDIT(id)
			: USERS_VIEW(id);
};
