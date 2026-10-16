import * as routes from './routes';
import { COMPANIES_EDIT, COMPANIES_VIEW, USERS_EDIT, USERS_VIEW, parseEntityId } from '@/utils/routes';

it.each([
	[COMPANIES_VIEW, '/companies/[id]'],
	[COMPANIES_EDIT, '/companies/form'],
	[USERS_VIEW, '/users/[id]'],
	[USERS_EDIT, '/users/form'],
] as const)('keeps %s as a typed route with a separate string id parameter', (route, pathname) => {
	expect(route(17)).toEqual({ pathname, params: { id: '17' } });
	expect(parseEntityId(route(17).params.id)).toBe(17);
	expect(parseEntityId(route(Number.MAX_SAFE_INTEGER).params.id)).toBe(Number.MAX_SAFE_INTEGER);
});

it.each([
	'https://example.invalid/7',
	'../7',
	'7/../8',
	'7?is_staff=true',
	'7#edit',
	'1e3',
	'0x10',
	'+7',
	' 7 ',
	'７',
	'NaN',
	'Infinity',
])('rejects route input %s instead of interpreting it as an entity id', (value) => {
	expect(parseEntityId(value)).toBeNull();
});

it.each([NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
	'does not accept invalid numeric ids after a route round trip: %s',
	(id) => {
		expect(parseEntityId(USERS_VIEW(id).params.id)).toBeNull();
		expect(parseEntityId(COMPANIES_EDIT(id).params.id)).toBeNull();
	},
);

describe('entity id parameters', () => {
	it.each([undefined, ['7'], '0', '-1', '7x', '1.5', '01', '9007199254740993'])(
		'rejects malformed route id %s',
		(id) => {
			expect(parseEntityId(id)).toBeNull();
		},
	);
	it('accepts a valid entity id', () => expect(parseEntityId('17')).toBe(17));
});

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
