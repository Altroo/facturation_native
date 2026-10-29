import { render, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { InitContextProvider, useInitAccessToken, useInitContext } from './InitContext';
import { useAppSelector } from '@/utils/hooks';
import { getInitStateToken } from '@/store/selectors';
import { emptyInitStateToken } from '@/store/slices/_initSlice';
import type { InitStateToken } from '@/types/_initTypes';

jest.mock('@/utils/hooks', () => ({ useAppSelector: jest.fn() }));
const tokens: InitStateToken = {
	access: 'current-access',
	refresh: 'current-refresh',
	access_expiration: '2030-01-01T00:00:00Z',
	refresh_expiration: '2031-01-01T00:00:00Z',
	user: { pk: 7, email: 'example@example.invalid', first_name: 'Example', last_name: 'User' },
};
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(useAppSelector).mockReturnValue(null);
});

describe('Init Context', () => {
	it('reads the original Redux selector and falls back to the empty token context', async () => {
		const { result } = await renderHook(useInitContext, { wrapper: InitContextProvider });
		expect(result.current).toEqual({ initStateToken: emptyInitStateToken });
		expect(useAppSelector).toHaveBeenCalledWith(getInitStateToken);
	});

	it('exposes the current Redux tokens and follows rotation and session reset', async () => {
		jest.mocked(useAppSelector).mockReturnValue(tokens);
		const { result, rerender } = await renderHook(useInitContext, { wrapper: InitContextProvider });
		expect(result.current.initStateToken).toBe(tokens);
		const rotated = { ...tokens, access: 'rotated-access', refresh: 'rotated-refresh' };
		jest.mocked(useAppSelector).mockReturnValue(rotated);
		await rerender({});
		expect(result.current.initStateToken).toBe(rotated);
		jest.mocked(useAppSelector).mockReturnValue(emptyInitStateToken);
		await rerender({});
		expect(result.current.initStateToken).toBe(emptyInitStateToken);
	});

	it('keeps the session argument fallback and prefers the current context token', async () => {
		const fallback = { accessToken: 'fallback-access' };
		const { result, rerender } = await renderHook(() => useInitAccessToken(fallback), { wrapper: InitContextProvider });
		expect(result.current).toBe('fallback-access');
		jest.mocked(useAppSelector).mockReturnValue(tokens);
		await rerender({});
		expect(result.current).toBe('current-access');
	});

	it('uses the original default context when the hook is read without its provider', async () => {
		const { result } = await renderHook(useInitContext);
		expect(result.current.initStateToken).toEqual(emptyInitStateToken);
	});

	it('renders children while preserving the original empty user fields', async () => {
		jest.mocked(useAppSelector).mockReturnValue(emptyInitStateToken);
		const Probe = () => {
			const { initStateToken } = useInitContext();
			return <Text>{JSON.stringify(initStateToken.user)}</Text>;
		};
		await render(
			<InitContextProvider>
				<Probe />
				<Text>Child</Text>
			</InitContextProvider>,
		);
		expect(screen.getByText('Child')).toBeOnTheScreen();
		expect(screen.getByText(JSON.stringify(emptyInitStateToken.user))).toBeOnTheScreen();
	});

	it('returns no access token when neither context nor session supplies one', async () => {
		const { result } = await renderHook(useInitAccessToken, { wrapper: InitContextProvider });
		expect(result.current).toBeUndefined();
	});
});
