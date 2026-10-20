// Expo Router uses these typed destinations instead of Next.js URL helpers.
export const BACKEND_SITE_ADMIN = `${process.env.EXPO_PUBLIC_API_URL}/gestion-interne-x7k2/`;

export const AUTH_LOGIN = '/login' as const;
export const AUTH_RESET_PASSWORD = '/reset-password' as const;
export const AUTH_RESET_PASSWORD_ENTER_CODE = '/reset-password/enter-code' as const;
export const AUTH_RESET_PASSWORD_SET_PASSWORD = '/reset-password/set-password' as const;
export const AUTH_RESET_PASSWORD_COMPLETE = '/reset-password/set-password-complete' as const;
export const DASHBOARD = '/' as const;

export const COMPANIES_LIST = '/companies' as const;
export const COMPANIES_ADD = '/companies/form' as const;
export const COMPANIES_VIEW = (id: number) => ({ pathname: '/companies/[id]' as const, params: { id: String(id) } });
export const COMPANIES_EDIT = (id: number) => ({
	pathname: '/companies/form' as const,
	params: { id: String(id) },
});
export const USERS_LIST = '/users' as const;
export const USERS_ADD = '/users/form' as const;
export const USERS_VIEW = (id: number) => ({ pathname: '/users/[id]' as const, params: { id: String(id) } });
export const USERS_EDIT = (id: number) => ({ pathname: '/users/form' as const, params: { id: String(id) } });
export const DASHBOARD_EDIT_PROFILE = '/settings/edit-profile' as const;
export const DASHBOARD_PASSWORD = '/settings/password' as const;
export const DASHBOARD_NOTIFICATIONS = '/settings/notifications' as const;
