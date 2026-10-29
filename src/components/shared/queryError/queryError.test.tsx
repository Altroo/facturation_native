import { fireEvent, render, screen } from '@testing-library/react-native';
import QueryError from './queryError';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

describe('QueryError', () => {
	it.each([
		[0, translations.fr.errors.networkError],
		[403, translations.fr.noPermission.description],
		[404, translations.fr.notFound.message],
		[500, 'Server unavailable'],
	])('renders the existing translated message for status %s', async (status, message) => {
		await render(
			<QueryError error={{ status_code: status, message: 'Server unavailable', details: {} }} onRetry={jest.fn()} />,
		);
		expect(screen.getByRole('alert')).toHaveTextContent(message);
	});

	it('preserves detailed backend errors and prevents retry during loading', async () => {
		const onRetry = jest.fn();
		const error = { status_code: 400, message: 'Invalid request', details: { city: ['Unavailable'] } };
		const { rerender } = await render(
			<QueryError error={error} onRetry={onRetry} showDetails variant="banner" loading />,
		);
		expect(screen.getByRole('alert')).toHaveTextContent('City : Unavailable');
		expect(screen.getByRole('button')).toBeDisabled();
		await fireEvent.press(screen.getByRole('button'));
		expect(onRetry).not.toHaveBeenCalled();
		await rerender(<QueryError error={error} onRetry={onRetry} />);
		await fireEvent.press(screen.getByRole('button'));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});
});
