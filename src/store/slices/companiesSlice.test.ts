import { initToken } from '@/store/slices/_initSlice';
import reducer, { setUserCompanies } from './companiesSlice';
import type { CompaniesStateInterface, CompaniesUserCompaniesType } from '@/types/companyTypes';

describe('companiesSlice reducer', () => {
	const initialState: CompaniesStateInterface = {
		user_companies: [],
	};

	it('should return the initial state when passed an empty action', () => {
		const result = reducer(undefined, { type: '' });
		expect(result).toEqual(initialState);
	});

	it('should handle setUserCompanies with a non-empty array', () => {
		const payload: CompaniesUserCompaniesType[] = [
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

		const action = setUserCompanies(payload);
		const result = reducer(initialState, action);

		expect(result.user_companies).toEqual(payload);
		expect(result.user_companies[0].raison_sociale).toBe('Alpha Corp');
		expect(result.user_companies[1].role).toBe('Lecture');
	});

	it('should handle setUserCompanies with an empty array', () => {
		const payload: CompaniesUserCompaniesType[] = [];
		const action = setUserCompanies(payload);
		const result = reducer(
			{
				user_companies: [
					{
						id: 99,
						raison_sociale: 'Old Co',
						role: 'Lecture',
						uses_foreign_currency: false,
					},
				],
			},
			action,
		);

		expect(result.user_companies).toEqual([]);
	});

	it('should replace existing state with new payload', () => {
		const initial: CompaniesStateInterface = {
			user_companies: [
				{
					id: 1,
					raison_sociale: 'Alpha Corp',
					role: 'Caissier',
					uses_foreign_currency: false,
				},
			],
		};

		const payload: CompaniesUserCompaniesType[] = [
			{
				id: 2,
				raison_sociale: 'Beta LLC',
				role: 'Lecture',
				uses_foreign_currency: false,
			},
		];

		const action = setUserCompanies(payload);
		const result = reducer(initial, action);

		expect(result.user_companies).toEqual(payload);
		expect(result.user_companies).toHaveLength(1);
		expect(result.user_companies[0].id).toBe(2);
	});
});

const memberships = [
	{ id: 4, raison_sociale: 'First', role: 'Commercial', uses_foreign_currency: false },
	{ id: 5, raison_sociale: 'Second', role: 'Lecture', uses_foreign_currency: false },
];
it('removes all company data when a session ends', () => {
	const state = reducer(undefined, setUserCompanies(memberships));
	expect(reducer(state, initToken())).toEqual({ user_companies: [] });
});
