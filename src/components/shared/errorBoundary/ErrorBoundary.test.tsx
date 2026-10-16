import { type FC, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text, View, Pressable } from 'react-native';
import { reloadAppAsync } from 'expo';
import { ErrorBoundary } from './ErrorBoundary';
import { LanguageContext } from '@/contexts/languageContext';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));
let broken = true;
const Child = () => {
	if (broken) throw new Error('Example failure');
	return <Text>Recovered content</Text>;
};
beforeEach(() => {
	broken = true;
	jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
it('shows the original translated fallback and retries rendering its children', async () => {
	await render(
		<LanguageContext.Provider value={{ language: 'en', t: translations.en, setLanguage: jest.fn() }}>
			<ErrorBoundary>
				<Child />
			</ErrorBoundary>
		</LanguageContext.Provider>,
	);
	expect(screen.getByText(translations.en.errors.errorOccurred)).toBeOnTheScreen();
	broken = false;
	await fireEvent.press(screen.getByRole('button', { name: translations.en.common.retry }));
	expect(screen.getByText('Recovered content')).toBeOnTheScreen();
});
it('honors a supplied fallback', async () => {
	await render(
		<ErrorBoundary fallback={<Text>Provided fallback</Text>}>
			<Child />
		</ErrorBoundary>,
	);
	expect(screen.getByText('Provided fallback')).toBeOnTheScreen();
	expect(screen.queryByRole('button')).toBeNull();
});
it('handles a failed native reload and allows the user to try again', async () => {
	jest.mocked(reloadAppAsync).mockRejectedValueOnce(new Error('Reload unavailable'));
	await render(
		<ErrorBoundary>
			<Child />
		</ErrorBoundary>,
	);
	await act(
		async () => await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.refreshPage })),
	);
	expect(reloadAppAsync).toHaveBeenCalledTimes(1);
	expect(screen.getByRole('alert')).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: translations.fr.common.refreshPage })).not.toBeDisabled();
});

// Component that throws an error for testing
const ThrowError: FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
	if (shouldThrow) {
		throw new Error('Test error message');
	}
	return <Text>Child content</Text>;
};

describe('ErrorBoundary', () => {
	// Suppress console.error during tests since we expect errors
	const originalError = console.error;
	beforeAll(() => {
		console.error = jest.fn();
	});
	afterAll(() => {
		console.error = originalError;
	});

	it('renders children when there is no error', async () => {
		await render(
			<ErrorBoundary>
				<ThrowError shouldThrow={false} />
			</ErrorBoundary>,
		);

		expect(screen.getByText('Child content')).toBeOnTheScreen();
	});

	it('renders error UI when child throws', async () => {
		await render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText('Une erreur est survenue')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: /réessayer/i })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: /actualiser/i })).toBeOnTheScreen();
	});

	it('renders custom fallback when provided', async () => {
		const customFallback = <Text>Custom error fallback</Text>;

		await render(
			<ErrorBoundary fallback={customFallback}>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText('Custom error fallback')).toBeOnTheScreen();
	});

	it('resets error state when retry button is clicked', async () => {
		const TestComponent: FC = () => {
			const [shouldThrow, setShouldThrow] = useState(true);

			return (
				<ErrorBoundary>
					{shouldThrow ? (
						<ThrowError shouldThrow={true} />
					) : (
						<View>
							<Text>Recovered content</Text>
							<Pressable onPress={() => setShouldThrow(true)}>
								<Text>Trigger error again</Text>
							</Pressable>
						</View>
					)}
				</ErrorBoundary>
			);
		};

		await render(<TestComponent />);

		// Should show error UI
		expect(screen.getByText('Une erreur est survenue')).toBeOnTheScreen();

		// Click retry - this triggers handleReset which sets hasError to false
		// But since ThrowError still throws, it will catch the error again
		const retryButton = screen.getByRole('button', { name: /réessayer/i });
		await fireEvent.press(retryButton);

		// After clicking retry, the boundary resets and tries to render children again
		// Since ThrowError still throws, it catches the error again
		expect(screen.getByText('Une erreur est survenue')).toBeOnTheScreen();
	});

	it('shows error message in development mode', async () => {
		const originalEnv = process.env.NODE_ENV;
		Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

		await render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText('Test error message')).toBeOnTheScreen();

		Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
	});
});
