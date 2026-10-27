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
export const CHANGELOG = '/changelog' as const;
export const DASHBOARD_OBJECTIFS_MENSUELS = (company_id?: number) =>
	company_id
		? (`/settings/monthly-objectives?company_id=${company_id}` as const)
		: ('/settings/monthly-objectives' as const);
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

// Logistique
export const LOGISTIQUE_DASHBOARD = '/logistique/dashboard' as const;
export const LOGISTIQUE_LIST = '/logistique' as const;
export const LOGISTIQUE_SUPPLIERS = '/logistique/fournisseurs' as const;
export const LOGISTIQUE_SUPPLIER_ADD = (company_id: number) => ({
	pathname: '/logistique/fournisseurs/form' as const,
	params: { company_id: String(company_id) },
});
export const LOGISTIQUE_SUPPLIER_EDIT = (id: number, company_id: number) => ({
	pathname: '/logistique/fournisseurs/form' as const,
	params: { id: String(id), company_id: String(company_id) },
});
export const LOGISTIQUE_SUPPLIER_VIEW = (id: number, company_id: number) => ({
	pathname: '/logistique/fournisseurs/[id]' as const,
	params: { id: String(id), company_id: String(company_id) },
});

// Stock
export const STOCK_LIST = '/stock' as const;
export const STOCK_ADD = (company_id: number, balance_id?: number) => ({
	pathname: '/stock/form' as const,
	params: { company_id: String(company_id), ...(balance_id ? { balance_id: String(balance_id) } : {}) },
});
export const STOCK_VIEW = (id: number, company_id: number) => ({
	pathname: '/stock/[id]' as const,
	params: { id: String(id), company_id: String(company_id) },
});
export const STOCK_MOVEMENTS = '/stock/movements' as const;
export const STOCK_MOVEMENT_VIEW = (id: number, company_id: number) => ({
	pathname: '/stock/movements/[id]' as const,
	params: { id: String(id), company_id: String(company_id) },
});
export const STOCK_RECEIPTS = '/stock/receipts' as const;
export const STOCK_RECEIPTS_ADD = (company_id: number) => ({
	pathname: '/stock/receipts/form' as const,
	params: { company_id: String(company_id) },
});
export const STOCK_RECEIPT_VIEW = (id: number, company_id: number) => ({
	pathname: '/stock/receipts/[id]' as const,
	params: { id: String(id), company_id: String(company_id) },
});
export const STOCK_INVENTORIES = '/stock/inventories' as const;
export const STOCK_INVENTORIES_ADD = (company_id: number) => ({
	pathname: '/stock/inventories/form' as const,
	params: { company_id: String(company_id) },
});
export const STOCK_INVENTORY_VIEW = (id: number, company_id: number) => ({
	pathname: '/stock/inventories/[id]' as const,
	params: { id: String(id), company_id: String(company_id) },
});

// Règlements
export const REGLEMENTS_LIST = '/reglements' as const;
export const REGLEMENTS_VIEW = (id: number) => ({ pathname: '/reglements/[id]' as const, params: { id: String(id) } });
export const REGLEMENTS_EDIT = (id: number) => ({ pathname: '/reglements/form' as const, params: { id: String(id) } });
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
