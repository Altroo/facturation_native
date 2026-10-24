import * as routes from './routes';

describe('routes constants', () => {
	it('exports credit-note list, form and detail routes without backend PDF endpoints', () => {
		expect(routes.FACTURE_AVOIR_LIST).toBe('/facture-avoir');
		expect(routes.FACTURE_AVOIR_ADD).toBe('/facture-avoir/form');
		expect(routes.FACTURE_AVOIR_VIEW(7)).toEqual({ pathname: '/facture-avoir/[id]', params: { id: '7' } });
		expect(routes.FACTURE_AVOIR_EDIT(7)).toEqual({ pathname: '/facture-avoir/form', params: { id: '7' } });
		expect(routes).not.toHaveProperty('FACTURE_AVOIR_PDF');
	});
	it('exports auth routes', () => {
		expect(routes.AUTH_LOGIN).toBe('/login');
		expect(routes.AUTH_RESET_PASSWORD).toBe('/reset-password');
		expect(routes.AUTH_RESET_PASSWORD_ENTER_CODE).toBe('/reset-password/enter-code');
		expect(routes.AUTH_RESET_PASSWORD_SET_PASSWORD).toBe('/reset-password/set-password');
		expect(routes.AUTH_RESET_PASSWORD_COMPLETE).toBe('/reset-password/set-password-complete');
	});
	it('exports dashboard and profile routes', () => {
		expect(routes.DASHBOARD).toBe('/');
		expect(routes.DASHBOARD_EDIT_PROFILE).toBe('/settings/edit-profile');
		expect(routes.DASHBOARD_PASSWORD).toBe('/settings/password');
	});
	it('exports companies routes and functions', () => {
		expect(routes.COMPANIES_LIST).toBe('/companies');
		expect(routes.COMPANIES_ADD).toBe('/companies/form');
		expect(routes.COMPANIES_VIEW(5)).toEqual({ pathname: '/companies/[id]', params: { id: '5' } });
		expect(routes.COMPANIES_EDIT(12)).toEqual({ pathname: '/companies/form', params: { id: '12' } });
	});
	it('exports users routes and functions', () => {
		expect(routes.USERS_LIST).toBe('/users');
		expect(routes.USERS_ADD).toBe('/users/form');
		expect(routes.USERS_VIEW(3)).toEqual({ pathname: '/users/[id]', params: { id: '3' } });
		expect(routes.USERS_EDIT(7)).toEqual({ pathname: '/users/form', params: { id: '7' } });
	});
});

it('keeps Devis navigation routes separate from PDF endpoints', () => {
	expect(routes.DEVIS_LIST).toBe('/devis');
	expect(routes.DEVIS_ADD).toBe('/devis/form');
	expect(routes.DEVIS_VIEW(7)).toEqual({ pathname: '/devis/[id]', params: { id: '7' } });
	expect(routes.DEVIS_EDIT(7)).toEqual({ pathname: '/devis/form', params: { id: '7' } });
	expect(routes).not.toHaveProperty('DEVIS_PDF');
});

it('exports Pro-forma routes without treating PDF endpoints as app routes', () => {
	expect(routes.FACTURE_PRO_FORMA_LIST).toBe('/facture-pro-forma');
	expect(routes.FACTURE_PRO_FORMA_ADD).toBe('/facture-pro-forma/form');
	expect(routes.FACTURE_PRO_FORMA_VIEW(7)).toEqual({ pathname: '/facture-pro-forma/[id]', params: { id: '7' } });
	expect(routes.FACTURE_PRO_FORMA_EDIT(7)).toEqual({ pathname: '/facture-pro-forma/form', params: { id: '7' } });
	expect(routes).not.toHaveProperty('FACTURE_PRO_FORMA_PDF');
});

it('exports client invoice and unpaid routes while keeping PDF endpoints outside navigation', () => {
	expect(routes.FACTURE_CLIENT_LIST).toBe('/facture-client');
	expect(routes.FACTURE_CLIENT_UNPAID).toBe('/facture-client/unpaid');
	expect(routes.FACTURE_CLIENT_ADD).toBe('/facture-client/form');
	expect(routes.FACTURE_CLIENT_VIEW(7)).toEqual({ pathname: '/facture-client/[id]', params: { id: '7' } });
	expect(routes.FACTURE_CLIENT_EDIT(7)).toEqual({ pathname: '/facture-client/form', params: { id: '7' } });
	expect(routes).not.toHaveProperty('FACTURE_CLIENT_PDF');
});
