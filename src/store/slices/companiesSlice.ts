import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CompaniesStateInterface, CompaniesUserCompaniesType } from '@/types/companyTypes';
import { initToken } from '@/store/slices/_initSlice';

const initialState: CompaniesStateInterface = {
	user_companies: [],
};

const companiesSlice = createSlice({
	name: 'companies',
	initialState: initialState,
	reducers: {
		setUserCompanies: (state, action: PayloadAction<Array<CompaniesUserCompaniesType>>) => {
			state.user_companies = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(initToken, () => initialState);
	},
});

export const { setUserCompanies } = companiesSlice.actions;

export default companiesSlice.reducer;
