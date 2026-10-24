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
// Articles
export const ARTICLES_LIST = '/articles' as const;
export const ARTICLES_ARCHIVED = '/articles/archived' as const;
export const ARTICLES_ADD = '/articles/form' as const;
export const ARTICLES_VIEW = (id: number) => ({ pathname: '/articles/[id]' as const, params: { id: String(id) } });
export const ARTICLES_EDIT = (id: number) => ({ pathname: '/articles/form' as const, params: { id: String(id) } });

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

// Devis
export const DEVIS_LIST = '/devis' as const;
export const DEVIS_ADD = '/devis/form' as const;
export const DEVIS_VIEW = (id: number) => ({ pathname: '/devis/[id]' as const, params: { id: String(id) } });
export const DEVIS_EDIT = (id: number) => ({ pathname: '/devis/form' as const, params: { id: String(id) } });

// Factures pro-forma
export const FACTURE_PRO_FORMA_LIST = '/facture-pro-forma' as const;
export const FACTURE_PRO_FORMA_ADD = '/facture-pro-forma/form' as const;
export const FACTURE_PRO_FORMA_VIEW = (id: number) => ({
	pathname: '/facture-pro-forma/[id]' as const,
	params: { id: String(id) },
});
export const FACTURE_PRO_FORMA_EDIT = (id: number) => ({
	pathname: '/facture-pro-forma/form' as const,
	params: { id: String(id) },
});

// Factures clients
export const FACTURE_CLIENT_LIST = '/facture-client' as const;
export const FACTURE_CLIENT_UNPAID = '/facture-client/unpaid' as const;
export const FACTURE_CLIENT_ADD = '/facture-client/form' as const;
export const FACTURE_CLIENT_VIEW = (id: number) => ({
	pathname: '/facture-client/[id]' as const,
	params: { id: String(id) },
});
export const FACTURE_CLIENT_EDIT = (id: number) => ({
	pathname: '/facture-client/form' as const,
	params: { id: String(id) },
});

// Factures d'avoir
export const FACTURE_AVOIR_LIST = '/facture-avoir' as const;
export const FACTURE_AVOIR_ADD = '/facture-avoir/form' as const;
export const FACTURE_AVOIR_VIEW = (id: number) => ({
	pathname: '/facture-avoir/[id]' as const,
	params: { id: String(id) },
});
export const FACTURE_AVOIR_EDIT = (id: number) => ({
	pathname: '/facture-avoir/form' as const,
	params: { id: String(id) },
});

// Règlements
export const REGLEMENTS_ADD = (company_id: number, facture_client_id?: number) => ({
	pathname: '/reglements/form' as const,
	params: {
		company_id: String(company_id),
		...(facture_client_id !== undefined ? { facture_client_id: String(facture_client_id) } : {}),
	},
});

export const BON_DE_LIVRAISON_LIST = '/bon-de-livraison' as const;
export const BON_DE_LIVRAISON_UNINVOICED = '/bon-de-livraison/uninvoiced' as const;
export const BON_DE_LIVRAISON_ADD = '/bon-de-livraison/form' as const;
export const BON_DE_LIVRAISON_VIEW = (id: number) => ({
	pathname: '/bon-de-livraison/[id]' as const,
	params: { id: String(id) },
});
export const BON_DE_LIVRAISON_EDIT = (id: number) => ({
	pathname: '/bon-de-livraison/form' as const,
	params: { id: String(id) },
});
