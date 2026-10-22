import * as routes from './routes';
import {
	getNotificationDestination,
	COMPANIES_VIEW,
	COMPANIES_EDIT,
	USERS_VIEW,
	USERS_EDIT,
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_PASSWORD,
	DASHBOARD,
	COMPANIES_LIST,
	COMPANIES_ADD,
	USERS_LIST,
	USERS_ADD,
	DASHBOARD_NOTIFICATIONS,
} from './routes';

describe('routes constants', () => {
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
it.each([
	['/dashboard', DASHBOARD],
	['/dashboard/?source=notification', DASHBOARD],
	['/dashboard/companies', COMPANIES_LIST],
	['/dashboard/companies/new', COMPANIES_ADD],
	['/dashboard/users', USERS_LIST],
	['/dashboard/users/new', USERS_ADD],
	['/dashboard/companies/7', COMPANIES_VIEW(7)],
	['/dashboard/companies/7/edit?company_id=2', COMPANIES_EDIT(7)],
	['/dashboard/users/8/', USERS_VIEW(8)],
	['/dashboard/users/8/edit', USERS_EDIT(8)],
	['/dashboard/settings/edit-profile', DASHBOARD_EDIT_PROFILE],
	['/dashboard/settings/password', DASHBOARD_PASSWORD],
	['/dashboard/settings/notifications', DASHBOARD_NOTIFICATIONS],
])('maps the implemented original destination %s', (target, expected) => {
	expect(getNotificationDestination(target as string)).toEqual(expected);
});
it.each([
	undefined,
	'',
	'https://example.invalid/dashboard/users/1',
	'//example.invalid/dashboard/users/1',
	'/dashboard/clients/4',
	'/dashboard/stock',
	'/dashboard/users/0',
	'/dashboard/users/01',
	'/dashboard/users/1.5',
	'/dashboard/users/9007199254740993',
	'/dashboard/users/4/delete',
])('does not invent a destination for %s', (target) => {
	expect(getNotificationDestination(target)).toBeNull();
});
