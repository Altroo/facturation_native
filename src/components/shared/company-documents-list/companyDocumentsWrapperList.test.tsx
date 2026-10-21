import type { ComponentRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, Text, View } from 'react-native';
import { translations } from '@/translations';
import CompanyDocumentsWrapperList from './companyDocumentsWrapperList';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'test-token' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'light' }) }));
jest.mock('@/store/services/company', () => ({
	useGetUserCompaniesQuery: () => ({
		currentData: [
			{ id: 1, raison_sociale: 'Atlas', role: 'Caissier' },
			{ id: 2, raison_sociale: 'Horizon', role: 'Commercial' },
			{ id: 3, raison_sociale: 'Nova Services', role: 'Caissier' },
		],
	}),
}));

const t = translations.fr;
const renderTabs = () =>
	render(
		<CompanyDocumentsWrapperList>
			{(company) => (
				<View key={company.company_id}>
					{company.tabs}
					<Text>{`Company ${company.company_id}: ${company.role}`}</Text>
				</View>
			)}
		</CompanyDocumentsWrapperList>,
	);

beforeEach(async () => {
	await AsyncStorage.clear();
	jest.clearAllMocks();
});

const setup = async (contentWidth = 600) => {
	await renderTabs();
	await screen.findByRole('tab', { name: 'Atlas' });
	await fireEvent(screen.getByTestId('company-tabs'), 'layout', {
		nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 56 } },
	});
	await fireEvent(screen.getByLabelText(t.common.companiesTabs), 'contentSizeChange', contentWidth, 56);
	await fireEvent(screen.getByLabelText(t.common.companiesTabs), 'layout', {
		nativeEvent: { layout: { x: 0, y: 0, width: contentWidth > 300 ? 212 : 300, height: 56 } },
	});
	const scrollView = ScrollView.prototype as ComponentRef<typeof ScrollView>;
	jest.mocked(scrollView.scrollTo).mockClear();
	return scrollView;
};

const scrollTo = async (x: number) => {
	await fireEvent.scroll(screen.getByLabelText(t.common.companiesTabs), {
		nativeEvent: {
			contentOffset: { x, y: 0 },
			contentSize: { width: 600, height: 56 },
			layoutMeasurement: { width: 212, height: 56 },
		},
	});
};

it('does not show scroll buttons when the company tabs fit', async () => {
	await setup(280);
	expect(screen.getAllByRole('tab')).toHaveLength(3);
	expect(screen.queryByRole('button', { name: t.common.companiesScrollLeft })).toBeNull();
	expect(screen.queryByRole('button', { name: t.common.companiesScrollRight })).toBeNull();
});

it('scrolls through companies without changing the selected company and disables each end', async () => {
	const scrollView = await setup();
	expect(screen.getByRole('button', { name: t.common.companiesScrollLeft })).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.companiesScrollRight }));
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: expect.closeTo(169.6), animated: true });
	expect(screen.getByRole('tab', { name: 'Atlas', selected: true })).toBeOnTheScreen();
	expect(screen.getByText('Company 1: Caissier')).toBeOnTheScreen();

	await scrollTo(388);
	expect(screen.getByRole('button', { name: t.common.companiesScrollRight })).toBeDisabled();
	expect(screen.getByRole('button', { name: t.common.companiesScrollLeft })).toBeEnabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.companiesScrollLeft }));
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: expect.closeTo(218.4), animated: true });

	await scrollTo(350);
	await fireEvent.press(screen.getByRole('button', { name: t.common.companiesScrollRight }));
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 388, animated: true });
});

it('brings a partially hidden tab into view and passes its company and role to the page', async () => {
	const scrollView = await setup();
	const horizon = screen.getByRole('tab', { name: 'Horizon' });
	await fireEvent(horizon, 'layout', {
		nativeEvent: { layout: { x: 200, y: 0, width: 200, height: 56 } },
	});
	await fireEvent.press(horizon);
	expect(screen.getByRole('tab', { name: 'Horizon', selected: true })).toBeOnTheScreen();
	expect(screen.getByText('Company 2: Commercial')).toBeOnTheScreen();
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 188, animated: true });

	// The selected font can make the tab wider after the press.
	await fireEvent(screen.getByRole('tab', { name: 'Horizon' }), 'layout', {
		nativeEvent: { layout: { x: 200, y: 0, width: 212, height: 56 } },
	});
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 200, animated: true });

	await scrollTo(388);
	const atlas = screen.getByRole('tab', { name: 'Atlas' });
	await fireEvent(atlas, 'layout', {
		nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 56 } },
	});
	await fireEvent.press(atlas);
	expect(screen.getByText('Company 1: Caissier')).toBeOnTheScreen();
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: true });
});

it('restores the selected company after leaving the page and opening it again', async () => {
	const view = await renderTabs();
	await fireEvent.press(await screen.findByRole('tab', { name: 'Horizon' }));
	expect(AsyncStorage.setItem).toHaveBeenCalledWith('selectedCompanyIndex', '1');
	await view.unmount();

	await renderTabs();
	expect(await screen.findByRole('tab', { name: 'Horizon', selected: true })).toBeOnTheScreen();
	expect(screen.getByText('Company 2: Commercial')).toBeOnTheScreen();
});

it('waits for the saved selection before rendering company-specific content', async () => {
	let finishRestore: (value: string | null) => void = () => {};
	jest.mocked(AsyncStorage.getItem).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finishRestore = resolve;
			}),
	);
	await renderTabs();
	expect(screen.queryByText('Company 1: Caissier')).toBeNull();
	expect(screen.queryAllByRole('tab')).toHaveLength(0);

	await act(async () => finishRestore('2'));
	expect(await screen.findByRole('tab', { name: 'Nova Services', selected: true })).toBeOnTheScreen();
	expect(screen.getByText('Company 3: Caissier')).toBeOnTheScreen();
});

it('reveals the restored tab when its position arrives before the viewport measurement', async () => {
	await AsyncStorage.setItem('selectedCompanyIndex', '2');
	await renderTabs();
	const tab = await screen.findByRole('tab', { name: 'Nova Services', selected: true });
	await fireEvent(tab, 'layout', {
		nativeEvent: { layout: { x: 400, y: 0, width: 200, height: 56 } },
	});
	const scrollView = ScrollView.prototype as ComponentRef<typeof ScrollView>;
	jest.mocked(scrollView.scrollTo).mockClear();
	await fireEvent(screen.getByLabelText(t.common.companiesTabs), 'layout', {
		nativeEvent: { layout: { x: 0, y: 0, width: 212, height: 56 } },
	});
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 388, animated: true });
});

it.each(['-1', '1.5', 'invalid', '99'])(
	'falls back to the first company for an invalid saved index: %s',
	async (index) => {
		await AsyncStorage.setItem('selectedCompanyIndex', index);
		await renderTabs();
		expect(await screen.findByRole('tab', { name: 'Atlas', selected: true })).toBeOnTheScreen();
		expect(screen.getByText('Company 1: Caissier')).toBeOnTheScreen();
	},
);

it('keeps company selection usable when storage cannot be read or written', async () => {
	jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Storage unavailable'));
	await renderTabs();
	expect(await screen.findByRole('tab', { name: 'Atlas', selected: true })).toBeOnTheScreen();

	jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Storage unavailable'));
	await fireEvent.press(screen.getByRole('tab', { name: 'Horizon' }));
	expect(screen.getByText('Company 2: Commercial')).toBeOnTheScreen();
});
