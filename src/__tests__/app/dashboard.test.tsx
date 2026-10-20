import { configureStore } from '@reduxjs/toolkit';
import _initReducer from '@/store/slices/_initSlice';
import accountReducer from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import DashboardPage from '@/app/(app)/(drawer)';

jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const memberships = [
	{ id: 3, raison_sociale: 'First company', role: 'Admin', uses_foreign_currency: false },
	{ id: 8, raison_sociale: 'Second company', role: 'Employee', uses_foreign_currency: false },
];
const setup = async (empty = false) => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	store.dispatch(setUserCompanies(empty ? [] : memberships));
	return {
		...(await render(
			<Provider store={store}>
				<DashboardPage />
			</Provider>,
		)),
		store,
	};
};
it('renders the home skeleton without an empty company selector when no company is assigned', async () => {
	const view = await setup(true);
	expect(view.getByText('Facturation')).toBeOnTheScreen();
	expect(view.queryByRole('button')).toBeNull();
});
it('does not introduce a dashboard company selector before the dashboard module is ported', async () => {
	const view = await setup();
	expect(view.getByText('Facturation')).toBeOnTheScreen();
	expect(view.queryByRole('button')).toBeNull();
	expect(view.store.getState().companies.user_companies).toEqual(memberships);
});
