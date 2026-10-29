import type { CompaniesUserCompaniesType } from '@/types/companyTypes';
import {
	getAppVersions,
	getGroupesState,
	getInitState,
	getProfilState,
	getInitStateToken,
	getAccessToken,
	getUnreadNotificationCount,
	getUserCompaniesState,
	getWSMaintenanceState,
} from '@/store/selectors';
import { makeStore, type RootState } from '@/store/store';
import accountReducer from '@/store/slices/accountSlice';
import companiesReducer from '@/store/slices/companiesSlice';
import notificationReducer from '@/store/slices/notificationSlice';
import initReducer, { initToken, emptyInitStateToken } from '@/store/slices/_initSlice';
import { UserClass } from '@/models/classes';

const store = makeStore();

const populatedState = (): RootState => {
	const initial = store.getState();
	const profil: UserClass = {
		id: 7,
		first_name: 'Test',
		last_name: 'User',
		email: 'test@example.invalid',
		gender: 'Femme',
		avatar: null,
		avatar_cropped: null,
		is_staff: true,
		is_active: true,
		default_password_set: false,
		date_joined: '2026-01-01',
		date_updated: null,
		last_login: null,
	};
	return {
		...initial,
		_init: { ...initial._init, status: 'authenticated', error: null },
		account: { profil, groupes: ['Caissier', 'Commercial'] },
		companies: {
			user_companies: [
				{
					id: 4,
					raison_sociale: 'First',
					role: 'Caissier',
					uses_foreign_currency: false,
					can_validate_factures: false,
				},
				{
					id: 5,
					raison_sociale: 'Second',
					role: 'Lecture',
					uses_foreign_currency: false,
					can_change_document_status: true,
				},
			],
		},
		ws: { ...initial.ws, maintenance: true, serverVersion: '3.6.3' },
		notification: { unreadCount: 12, latestNotification: null },
	};
};

describe('Redux selectors', () => {
	it('reads the original named branches without cloning profile, groups or membership data', () => {
		const state = populatedState();
		expect(getInitState(state)).toBe(state._init);
		expect(getInitStateToken(state)).toBe(state._init.initStateToken);
		expect(getAccessToken(state)).toBe(state._init.initStateToken.access);
		expect(getProfilState(state)).toBe(state.account.profil);
		expect(getGroupesState(state)).toBe(state.account.groupes);
		expect(getUserCompaniesState(state)).toBe(state.companies.user_companies);
		expect(getUserCompaniesState(state)[0].can_validate_factures).toBe(false);
	});

	it('keeps maintenance, version and unread-count selectors on their separate state branches', () => {
		const state = populatedState();
		expect(getAppVersions(state)).toBe(state.ws);
		expect(getAppVersions(state).serverVersion).toBe('3.6.3');
		expect(getWSMaintenanceState(state)).toBe(true);
		expect(getUnreadNotificationCount(state)).toBe(12);
	});

	it('reads cleared private state after session reset while retaining public maintenance information', () => {
		const state = populatedState();
		const reset = initToken();
		const guest: RootState = {
			...state,
			_init: initReducer(state._init, reset),
			account: accountReducer(state.account, reset),
			companies: companiesReducer(state.companies, reset),
			notification: notificationReducer(state.notification, reset),
		};
		expect(getInitState(guest)).toEqual({ initStateToken: emptyInitStateToken, status: 'guest', error: null });
		expect(getProfilState(guest)).toEqual({});
		expect(getGroupesState(guest)).toEqual([]);
		expect(getUserCompaniesState(guest)).toEqual([]);
		expect(getUnreadNotificationCount(guest)).toBe(0);
		expect(getWSMaintenanceState(guest)).toBe(true);
	});

	describe('Redux selectors', () => {
		const mockCompanies: CompaniesUserCompaniesType[] = [
			{
				id: 1,
				raison_sociale: 'Alpha Corp',
				role: 'Caissier',
				uses_foreign_currency: false,
			},
			{
				id: 2,
				raison_sociale: 'Beta LLC',
				role: 'Lecture',
				uses_foreign_currency: false,
			},
		];
		const mockState: RootState = {
			...store.getState(),
			_init: {
				...store.getState()._init,
				status: 'authenticated',
				error: null,
			},
			account: {
				profil: new UserClass(
					1,
					'John',
					'Doe',
					'john.doe@example.com',
					'male',
					null,
					null,
					true,
					true,
					false,
					'2023-01-01T12:00:00Z',
					'2023-12-01T08:30:00Z',
					'2023-12-01T08:30:00Z',
				),
				groupes: ['Caissier', 'Lecture'],
			},
			companies: {
				user_companies: mockCompanies,
			},
			ws: {
				...store.getState().ws,
				maintenance: true,
			},
		};

		it('getProfilState should return a UserClass instance', () => {
			const profil = getProfilState(mockState);
			expect(profil).toBeInstanceOf(UserClass);
			expect(profil.email).toBe('john.doe@example.com');
			expect(profil.is_staff).toBe(true);
		});

		it('getGroupesState should return the groupes array', () => {
			expect(getGroupesState(mockState)).toEqual(['Caissier', 'Lecture']);
		});

		it('getUserCompaniesState should return the user_companies array', () => {
			const companies = getUserCompaniesState(mockState);
			expect(Array.isArray(companies)).toBe(true);
			expect(companies).toEqual(mockCompanies);
			expect(companies[0].raison_sociale).toBe('Alpha Corp');
			expect(companies[1].role).toBe('Lecture');
		});

		it('getWSMaintenanceState should return the maintenance flag', () => {
			expect(getWSMaintenanceState(mockState)).toBe(true);
		});
	});
});
