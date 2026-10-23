import { render, screen } from '@testing-library/react-native';
import ManagedByDetails from './managedByDetails';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
const t = translations.fr;

it('preserves the company identity, role and both permissions in the shared detail rows', async () => {
	const label = 'TEST Logistique fournisseur et prestations internationales';
	await render(
		<ManagedByDetails label={label} role="Commercial" can_validate_factures can_change_document_status={false} />,
	);
	expect(screen.getByText(label)).toBeOnTheScreen();
	expect(screen.getByText('Commercial')).toBeOnTheScreen();
	expect(screen.getByText(t.managedByTable.invoiceValidation)).toBeOnTheScreen();
	expect(screen.getByText(t.managedByTable.documentStatusChange)).toBeOnTheScreen();
	expect(screen.getByText(t.common.yes)).toBeOnTheScreen();
	expect(screen.getByText(t.common.no)).toBeOnTheScreen();
	expect(screen.queryByRole('button')).toBeNull();
});

it('supports a manager with no role and keeps absent permissions denied', async () => {
	await render(<ManagedByDetails label="Example Manager" icon="person-outline" avatar />);
	expect(screen.getByText(t.common.noData)).toBeOnTheScreen();
	expect(screen.getAllByText(t.common.no)).toHaveLength(2);
});

it('renders the actual logo supplied by the membership API', async () => {
	await render(
		<ManagedByDetails
			label="Atlas"
			image="https://example.invalid/media/logo-cropped.png"
			previewImage="https://example.invalid/media/logo.png"
			role="Caissier"
		/>,
	);
	const image = screen.container.queryAll((node) => node.type === 'Image')[0];
	expect(image).toHaveProp('source', {
		uri: 'https://example.invalid/media/logo-cropped.png',
	});
	expect(screen.getByRole('button', { name: 'Atlas' })).not.toBeDisabled();
});
