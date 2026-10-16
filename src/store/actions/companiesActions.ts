import * as types from './index';
import type { CompaniesUserCompaniesType } from '@/types/companyTypes';

export const companiesSetUserCompaniesAction = (props: Array<CompaniesUserCompaniesType>) => {
	return {
		type: types.COMPANIES_SET_USER_COMPANIES,
		data: props,
	};
};
