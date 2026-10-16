import * as Types from '@/store/actions';
import { put, takeLatest } from 'redux-saga/effects';
import type { setCompaniesUserSagatype } from '@/types/companyTypes';
import { setUserCompanies } from '@/store/slices/companiesSlice';

export function* companiesSetUserCompaniesSaga(payload: setCompaniesUserSagatype) {
	yield put(setUserCompanies(payload.data));
}

export function* watchCompanies() {
	yield takeLatest(Types.COMPANIES_SET_USER_COMPANIES, companiesSetUserCompaniesSaga);
}
