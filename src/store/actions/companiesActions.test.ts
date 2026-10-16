import * as types from './index';
import { companiesSetUserCompaniesAction } from './companiesActions';
import type { CompaniesUserCompaniesType } from '@/types/companyTypes';

describe('companiesSetUserCompaniesAction', () => {
	it('creates an action with the correct type and data', () => {
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

		const action = companiesSetUserCompaniesAction(payload);

		expect(action).toEqual({
			type: types.COMPANIES_SET_USER_COMPANIES,
			data: payload,
		});
	});

	it('handles an empty array payload', () => {
		const payload: CompaniesUserCompaniesType[] = [];

		const action = companiesSetUserCompaniesAction(payload);

		expect(action.type).toBe(types.COMPANIES_SET_USER_COMPANIES);
		expect(action.data).toEqual([]);
	});

	it('preserves the exact payload reference', () => {
		const payload: CompaniesUserCompaniesType[] = [
			{
				id: 3,
				raison_sociale: 'Gamma Inc',
				role: 'Lecture',
				uses_foreign_currency: false,
			},
		];

		const action = companiesSetUserCompaniesAction(payload);

		// Ensure the data property is the same array reference
		expect(action.data).toBe(payload);
	});
});
