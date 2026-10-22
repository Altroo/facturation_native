import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import ArticlesFormPage from '@/app/(app)/(drawer)/articles/form';
import { useGetArticleQuery, useGetCodeReferenceQuery } from '@/store/services/article';
import { useGetCategorieListQuery } from '@/store/services/parameter';
import { createQueryMock } from '@/store/setupQuery';
import { translations } from '@/translations';
import {
	AutocompleteDropdownContextProvider,
	toggleAutocomplete,
} from '@/components/nativeElements/customAutoCompleteSelect/setupAutocomplete';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, router: { dismissTo: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => mockToken }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		language: 'fr',
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/company', () => ({
	useGetUserCompaniesQuery: () => ({
		currentData: [{ id: 5, raison_sociale: mockCompany.raison_sociale, role: mockRole }],
	}),
	useGetCompanyQuery: () => ({ currentData: mockCompany }),
}));
jest.mock('@/store/services/article', () => ({
	useGetArticleQuery: jest.fn(() => mockArticleQuery.useResult()),
	useGetCodeReferenceQuery: jest.fn(() => mockCodeQuery.useResult()),
	useAddArticleMutation: () => [mockAdd, {}],
	useEditArticleMutation: () => [mockEdit, {}],
}));
jest.mock('@/store/services/parameter', () => ({
	useGetCategorieListQuery: () => mockCategorieQuery.useResult(),
	useGetEmplacementListQuery: () => ({ currentData: [{ id: 4, nom: 'Dépôt A', company: 5 }] }),
	useGetUniteListQuery: () => ({}),
	useGetMarqueListQuery: () => ({}),
	useAddCategorieMutation: () => [mockAddCategorie, {}],
	useEditCategorieMutation: () => [jest.fn(), {}],
	useDeleteCategorieMutation: () => [jest.fn(), {}],
	useAddEmplacementMutation: () => [jest.fn(), {}],
	useEditEmplacementMutation: () => [jest.fn(), {}],
	useDeleteEmplacementMutation: () => [jest.fn(), {}],
	useAddUniteMutation: () => [jest.fn(), {}],
	useEditUniteMutation: () => [jest.fn(), {}],
	useDeleteUniteMutation: () => [jest.fn(), {}],
	useAddMarqueMutation: () => [jest.fn(), {}],
	useEditMarqueMutation: () => [jest.fn(), {}],
	useDeleteMarqueMutation: () => [jest.fn(), {}],
}));
jest.mock('@/components/nativeElements/customSquareImageUploading/customSquareImageUploading', () => {
	const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
	return function ImagePicker(props: { onChange: (image: string) => void; onCrop: (image: string) => void }) {
		return (
			<Pressable
				onPress={() => {
					props.onChange('data:image/png;base64,original');
					props.onCrop('data:image/png;base64,cropped');
				}}
			>
				<Text>Pick photo</Text>
			</Pressable>
		);
	};
});

let mockParams: { id?: string; company_id?: string };
let mockToken: string | undefined;
let mockRole: string;
let mockCompany: {
	id: number;
	raison_sociale: string;
	stock_management_enabled: boolean;
	uses_foreign_currency: boolean;
};
const mockArticleQuery = createQueryMock<ReturnType<typeof useGetArticleQuery>>({} as never);
const mockCodeQuery = createQueryMock<ReturnType<typeof useGetCodeReferenceQuery>>({} as never);
const mockCategorieQuery = createQueryMock<ReturnType<typeof useGetCategorieListQuery>>({} as never);
const mockAdd = jest.fn();
const mockEdit = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockAddCategorie = jest.fn();
const resetReference = jest.fn();
const t = translations.fr;
const article = {
	id: 7,
	company: 5,
	reference: 'ART007',
	designation: 'Article existant',
	type_article: 'Produit',
	prix_achat: 50,
	prix_vente: 100,
	prix_vente_base: 'TTC',
	tva: 20,
	stock_minimum: 3,
};
const setup = () => render(<ArticlesFormPage />, { wrapper: AutocompleteDropdownContextProvider });
const fill = async () => {
	await fireEvent.changeText(screen.getByLabelText(t.articles.colDesignation), 'Article Atlas');
	await fireEvent.changeText(screen.getByLabelText(t.articles.colPrixVente), '120');
};
beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { company_id: '5' };
	mockToken = 'access';
	mockRole = 'Caissier';
	mockCompany = { id: 5, raison_sociale: 'Atlas', stock_management_enabled: false, uses_foreign_currency: true };
	mockAdd.mockReturnValue({ unwrap: () => Promise.resolve({ id: 8 }) });
	mockEdit.mockReturnValue({ unwrap: () => Promise.resolve(article) });
	mockAddCategorie.mockReturnValue({ unwrap: () => Promise.resolve({ id: 3 }) });
	resetReference.mockReturnValue({ unwrap: () => Promise.resolve({ reference: 'ART011' }) });
	await mockArticleQuery.setResult({ currentData: undefined, refetch: jest.fn() } as never);
	await mockCodeQuery.setResult({ currentData: { reference: 'ART010' }, refetch: resetReference } as never);
	await mockCategorieQuery.setResult({
		currentData: [{ id: 2, nom: 'Matériel', company: 5 }],
		refetch: jest.fn(),
	} as never);
});

it('creates in the selected company, sends the crop, and converts a TTC input back to HT', async () => {
	await setup();
	await fill();
	await fireEvent.press(screen.getByText('Pick photo'));
	await fireEvent.press(screen.getByRole('button', { name: t.articles.fieldPrixVenteBase }));
	await fireEvent.press(screen.getByRole('radio', { name: 'TTC' }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
	expect(mockAdd).toHaveBeenCalledWith({
		data: expect.objectContaining({
			company: 5,
			reference: 'ART010',
			designation: 'Article Atlas',
			prix_vente: 100,
			prix_vente_base: 'TTC',
			tva: 20,
			photo: 'data:image/png;base64,cropped',
		}),
	});
	expect(mockAdd.mock.calls[0][0].data).not.toHaveProperty('globalError');
	expect(mockSuccess).toHaveBeenCalledWith(t.articles.addSuccess);
	expect(router.dismissTo).toHaveBeenCalledWith('/articles');
});

it('edits an article with its stored entry basis and leaves the user on the form', async () => {
	mockParams.id = '7';
	await mockArticleQuery.setResult({ currentData: article } as never);
	await setup();
	expect(screen.getByLabelText(t.articles.colPrixVente)).toHaveProp('value', '120');
	expect(screen.queryByLabelText(t.articles.stockMinimum)).toBeNull();
	expect(screen.queryByLabelText(t.articles.resetReference)).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	await waitFor(() =>
		expect(mockEdit).toHaveBeenCalledWith({
			id: 7,
			data: expect.objectContaining({ prix_vente: 100, prix_vente_base: 'TTC' }),
		}),
	);
	expect(router.dismissTo).not.toHaveBeenCalled();
});

it('refreshes the reference without erasing an entered designation', async () => {
	await setup();
	await fill();
	await fireEvent.press(screen.getByRole('button', { name: t.articles.resetReference }));
	await waitFor(() => expect(screen.getByLabelText(t.articles.colReference)).toHaveProp('value', 'ART011'));
	await mockCodeQuery.setResult({ currentData: { reference: 'ART012' }, refetch: resetReference } as never);
	expect(screen.getByLabelText(t.articles.colDesignation)).toHaveProp('value', 'Article Atlas');
	expect(screen.getByLabelText(t.articles.colReference)).toHaveProp('value', 'ART011');
});

it('keeps services free of stock fields and uses the selected category ID', async () => {
	await setup();
	await fill();
	await fireEvent.press(screen.getByRole('button', { name: t.articles.colType }));
	await fireEvent.press(screen.getByRole('radio', { name: t.articles.typeService }));
	expect(screen.queryByLabelText(t.articles.stockMinimum)).toBeNull();
	await toggleAutocomplete(t.articles.fieldCategorie);
	await fireEvent.press(screen.getByRole('radio', { name: 'Matériel' }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() =>
		expect(mockAdd).toHaveBeenCalledWith({ data: expect.objectContaining({ type_article: 'Service', categorie: 2 }) }),
	);
});

it('preserves Nectar pricing and synchronizes purchase currency with sale currency', async () => {
	// Use the actual configured name, so this test follows the web's company rule.
	mockCompany.raison_sociale =
		jest.requireActual<typeof import('@/utils/rawData')>('@/utils/rawData').NECTAR_RAISON_SOCIALE;
	await setup();
	expect(screen.queryByLabelText(t.articles.colPrixAchat)).toBeNull();
	await fireEvent.changeText(screen.getByLabelText(t.articles.colDesignation), 'Service Nectar');
	await fireEvent.changeText(screen.getByLabelText(t.articles.colPrixHT), '100');
	await fireEvent.press(screen.getByRole('button', { name: `${t.articles.currency} · ${t.articles.colPrixVente}` }));
	await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() =>
		expect(mockAdd).toHaveBeenCalledWith({
			data: expect.objectContaining({ prix_achat: 0, devise_prix_achat: 'EUR', devise_prix_vente: 'EUR' }),
		}),
	);
});

it('shows backend field errors without navigating or losing the draft', async () => {
	mockAdd.mockReturnValue({
		unwrap: () =>
			Promise.reject({
				status: 400,
				data: { message: 'Référence déjà utilisée', details: { reference: ['Référence déjà utilisée'] } },
			}),
	});
	await setup();
	await fill();
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(mockError).toHaveBeenCalled());
	expect(screen.getByLabelText(t.articles.colDesignation)).toHaveProp('value', 'Article Atlas');
	expect(router.dismissTo).not.toHaveBeenCalled();
});

it.each(['Lecture', 'Comptable', 'Logistique'])('denies form actions to %s', async (role) => {
	mockRole = role;
	await setup();
	expect(screen.getByRole('header', { name: t.noPermission.title })).toBeOnTheScreen();
	expect(mockAdd).not.toHaveBeenCalled();
});

it('rejects a mismatched company even for a valid article ID', async () => {
	mockParams.id = '7';
	mockParams.company_id = '11';
	await mockArticleQuery.setResult({ currentData: article } as never);
	await setup();
	expect(screen.getByRole('header', { name: t.noPermission.title })).toBeOnTheScreen();
});

it('does not query malformed route IDs', async () => {
	mockParams.id = 'bad';
	await setup();
	expect(screen.getByText(t.notFound.message)).toBeOnTheScreen();
	expect(useGetArticleQuery).toHaveBeenLastCalledWith({ id: 0 }, expect.objectContaining({ skip: true }));
});

it('prevents duplicate submissions while a save is pending', async () => {
	let resolve!: (value: unknown) => void;
	mockAdd.mockReturnValue({
		unwrap: () =>
			new Promise((done) => {
				resolve = done;
			}),
	});
	await setup();
	await fill();
	const add = screen.getByRole('button', { name: t.common.add });
	await fireEvent.press(add);
	await fireEvent.press(add);
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
	await act(() => resolve({ id: 8 }));
});

it('requires a location for stock-managed products, but not services', async () => {
	mockCompany.stock_management_enabled = true;
	await setup();
	await fill();
	expect(screen.getByLabelText(t.articles.stockMinimum)).toHaveProp('value', '0');
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.common.correctErrors));
	expect(mockAdd).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: t.articles.colType }));
	await fireEvent.press(screen.getByRole('radio', { name: t.articles.typeService }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
});

it('creates a stock-managed product with its location and minimum quantity', async () => {
	mockCompany.stock_management_enabled = true;
	await setup();
	await fill();
	await fireEvent.changeText(screen.getByLabelText(t.articles.stockMinimum), '2,5');
	await toggleAutocomplete(t.articles.fieldEmplacement);
	await fireEvent.press(screen.getByRole('radio', { name: 'Dépôt A' }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() =>
		expect(mockAdd).toHaveBeenCalledWith({
			data: expect.objectContaining({ type_article: 'Produit', emplacement: 4, stock_minimum: 2.5 }),
		}),
	);
});
