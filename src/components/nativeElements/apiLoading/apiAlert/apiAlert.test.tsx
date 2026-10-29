import { render, screen } from '@testing-library/react-native';
import ApiAlert, { type ApiAlertProps } from './apiAlert';
import { translations } from '@/translations';
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const emptyDetails: ApiAlertProps['errorDetails'][] = [undefined, null, '', '  ', {}, { detail: [' '] }];

describe('ApiAlert', () => {
	it('displays backend global errors without exposing their internal field names', async () => {
		await render(
			<ApiAlert errorDetails={{ detail: 'Compte indisponible', non_field_errors: ['Opération refusée'] }} />,
		);
		expect(screen.getByRole('alert')).toHaveTextContent(/Compte indisponible/);
		expect(screen.getByRole('alert')).toHaveTextContent(/Opération refusée/);
		expect(screen.getByRole('alert')).not.toHaveTextContent('non_field_errors');
	});

	it('labels each field error and preserves all messages', async () => {
		await render(<ApiAlert errorDetails={{ first_name: ['Obligatoire', 'Trop court'], email: 'Invalide' }} />);
		expect(screen.getByRole('alert')).toHaveTextContent(/First name : Obligatoire/);
		expect(screen.getByRole('alert')).toHaveTextContent(/First name : Trop court/);
		expect(screen.getByRole('alert')).toHaveTextContent(/Email : Invalide/);
	});

	it.each(emptyDetails)('uses the translated fallback for empty details: %j', async (errorDetails) => {
		await render(<ApiAlert errorDetails={errorDetails} />);
		expect(screen.getByRole('alert')).toHaveTextContent(translations.fr.common.genericError);
	});

	it('displays plain backend messages', async () => {
		await render(<ApiAlert errorDetails="Cette entreprise est introuvable." />);
		expect(screen.getByRole('alert')).toHaveTextContent('Cette entreprise est introuvable.');
	});

	it('renders error messages when errorDetails contains an "error" array', async () => {
		const errorDetails = { error: ['Invalid request', 'Missing fields'] };

		await render(<ApiAlert errorDetails={errorDetails} />);

		const alert = screen.getByRole('alert');
		expect(alert).not.toHaveTextContent(/error :/i);
		expect(alert).toHaveTextContent(/Invalid request/);
		expect(alert).toHaveTextContent(/Missing fields/);
	});

	it('renders detail messages without exposing the API field name', async () => {
		await render(
			<ApiAlert errorDetails={{ detail: "Cette facture client est introuvable ou n'est plus disponible." }} />,
		);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent("Cette facture client est introuvable ou n'est plus disponible.");
		expect(alert).not.toHaveTextContent(/detail :/i);
	});

	it('renders plain string details directly', async () => {
		await render(<ApiAlert errorDetails="Cette facture client est introuvable ou n'est plus disponible." />);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent("Cette facture client est introuvable ou n'est plus disponible.");
		expect(alert).not.toHaveTextContent(/detail :/i);
	});

	it('applies custom sx style to the Alert component', async () => {
		const customStyle = { backgroundColor: 'rgb(255, 0, 0)' };
		const errorDetails = { error: ['Something went wrong'] };

		await render(<ApiAlert errorDetails={errorDetails} cssStyle={customStyle} />);

		const alert = screen.getByRole('alert');
		expect(alert).toBeOnTheScreen();
		expect(alert).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
	});

	it('renders default message when errorDetails is null or undefined', async () => {
		await render(<ApiAlert />);

		const alert = screen.getByRole('alert');
		expect(alert).toBeOnTheScreen();

		// The message part should contain the default fallback text
		const message = screen.getByRole('alert');
		expect(message).toBeOnTheScreen();
		expect(message).toHaveTextContent('Une erreur est survenue. Veuillez réessayer plus tard.');
	});

	it('handles errorDetails with non-array string values', async () => {
		const errorDetails = { field1: 'Error message 1', field2: 'Error message 2' } as unknown as Record<
			string,
			string[]
		>;

		await render(<ApiAlert errorDetails={errorDetails} />);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent(/Field1/);
		expect(alert).toHaveTextContent(/Error message 1/);
	});

	it('handles errorDetails with mixed array and object values', async () => {
		const errorDetails: Record<string, string[]> = {
			username: ['Username is required', 'Username must be unique'],
		};

		await render(<ApiAlert errorDetails={errorDetails} />);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent(/Username/);
		expect(alert).toHaveTextContent(/Username is required/);
		expect(alert).toHaveTextContent(/Username must be unique/);
	});
});
