import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import FactureClientListContent from './factureClientListContent';
import type CompanyDocumentsListContent from '@/components/shared/company-documents-list/companyDocumentsListContent';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/components/shared/company-documents-list/companyDocumentsListContent', () => {
	return function List(props: ComponentProps<typeof CompanyDocumentsListContent>) {
		return props.header;
	};
});

type Props = ComponentProps<typeof FactureClientListContent>;
const t = translations.fr;
const createProps = (): Props => ({
	company_id: 5,
	role: 'Caissier',
	tabs: null,
	queryArgs: { company_id: 5 },
	query: {
		isLoading: false,
		isFetching: false,
		isFetchingNextPage: false,
		isFetchNextPageError: false,
		hasNextPage: false,
		refetch: jest.fn(),
		fetchNextPage: jest.fn(),
	},
	fetchAllIds: jest.fn(() => ({ unwrap: async () => [], abort: jest.fn(), unsubscribe: jest.fn() })),
	deleteRecord: jest.fn(() => ({ unwrap: async () => undefined })),
	bulkDeleteRecords: jest.fn(() => ({ unwrap: async () => undefined })),
	busy: false,
	searchTerm: '',
	setSearchTerm: jest.fn(),
	sortModel: [],
	setSortModel: jest.fn(),
	filterModel: { items: [], logicOperator: 'and' },
	setFilterModel: jest.fn(),
	openPdf: jest.fn(async () => true),
	usesForeignCurrency: true,
	statsByCurrency: {
		MAD: { chiffre_affaire_total: '12000', total_reglements: '5000', total_impayes: '7000' },
		EUR: { chiffre_affaire_total: '100', total_reglements: '25', total_impayes: '75' },
		USD: { chiffre_affaire_total: '0', total_reglements: '0', total_impayes: '0' },
	},
	onRetryCompany: jest.fn(),
});

describe('FactureClientListContent', () => {
	it('displays the supplied financial totals and switches their currency without a duplicate visible label', async () => {
		await render(<FactureClientListContent {...createProps()} />);
		expect(screen.queryByText(t.documentForm.deviseLabel)).not.toBeOnTheScreen();
		expect(screen.getByRole('radio', { name: 'MAD' })).toHaveProp('accessibilityHint', t.documentForm.deviseLabel);
		expect(screen.getByText('12 000,00 MAD')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
		expect(screen.getByText('100,00 EUR')).toBeOnTheScreen();
		expect(screen.getByText('25,00 EUR')).toBeOnTheScreen();
		expect(screen.getByText('75,00 EUR')).toBeOnTheScreen();
	});

	it('shows MAD statistics without currency choices when foreign currency is disabled', async () => {
		await render(<FactureClientListContent {...createProps()} usesForeignCurrency={false} />);
		expect(screen.queryByRole('radio')).toBeNull();
		expect(screen.getByText('12 000,00 MAD')).toBeOnTheScreen();
	});

	it('lets the owning page retry a failed company request without losing its financial totals', async () => {
		const props = createProps();
		await render(
			<FactureClientListContent {...props} companyError={{ status: 503, message: 'Company unavailable' }} />,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
		expect(props.onRetryCompany).toHaveBeenCalledTimes(1);
		expect(screen.getByText('12 000,00 MAD')).toBeOnTheScreen();
	});
});
