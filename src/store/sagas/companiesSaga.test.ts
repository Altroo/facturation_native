import { put, takeLatest } from 'redux-saga/effects';
import * as Types from '@/store/actions';
import { companiesSetUserCompaniesSaga, watchCompanies } from './companiesSaga';
import { setUserCompanies } from '@/store/slices/companiesSlice';
import type { setCompaniesUserSagatype } from '@/types/companyTypes';

describe('companiesSetUserCompaniesSaga', () => {
	it('dispatches setUserCompanies with the provided data', () => {
		const mockPayload: setCompaniesUserSagatype = {
			type: Types.COMPANIES_SET_USER_COMPANIES,
			data: [
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
			],
		};

		const gen = companiesSetUserCompaniesSaga(mockPayload);

		// First yield should be a put effect
		const next = gen.next();
		expect(next.value).toEqual(put(setUserCompanies(mockPayload.data)));

		// Saga should be done
		expect(gen.next().done).toBe(true);
	});
});

describe('watchCompanies', () => {
	it('watches for COMPANIES_SET_USER_COMPANIES and runs companiesSetUserCompaniesSaga', () => {
		const gen = watchCompanies();

		const next = gen.next();
		expect(next.value).toEqual(takeLatest(Types.COMPANIES_SET_USER_COMPANIES, companiesSetUserCompaniesSaga));

		expect(gen.next().done).toBe(true);
	});
});
