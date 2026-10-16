import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import type { CropZoomProps, CropZoomRefType } from 'react-native-zoom-toolkit';
import EditProfilClient from '@/app/(app)/settings/edit-profile';
import { makeStore } from '@/store/store';
import { rootSaga } from '@/store/sagas';
import { profilApi } from '@/store/services/account';
import { accountSetProfilAction } from '@/store/actions/accountActions';
import { getProfilState } from '@/store/selectors';
import { auth } from '@/auth';
import { translations } from '@/translations';
import type { UserClass } from '@/models/classes';
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'test-access' }));

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({
	File: jest.fn().mockImplementation(() => ({ type: 'image/jpeg', base64: async () => 'ZXhhbXBsZQ==' })),
}));
jest.mock('expo-image', () => ({
	Image: Object.assign(jest.requireActual<typeof import('react-native')>('react-native').Image, {
		loadAsync: jest.fn(async () => ({ width: 100, height: 100, scale: 1 })),
	}),
}));
jest.mock('react-native-gesture-handler', () => ({
	GestureHandlerRootView: jest.requireActual<typeof import('react-native')>('react-native').View,
}));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('react-native-zoom-toolkit', () => {
	const { createElement, forwardRef, useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
	return {
		CropZoom: forwardRef<Pick<CropZoomRefType, 'crop'>, CropZoomProps>((props, ref) => {
			useImperativeHandle(ref, () => ({
				crop: () => ({
					crop: { originX: 0, originY: 0, width: 100, height: 100 },
					context: { rotationAngle: 0, flipHorizontal: false, flipVertical: false },
				}),
			}));
			return createElement('Cropper', { ...props, testID: 'cropper' });
		}),
	};
});
jest.mock('expo-image-manipulator', () => ({
	SaveFormat: { PNG: 'png' },
	ImageManipulator: {
		manipulate: () => ({
			crop: jest.fn(),
			release: jest.fn(),
			renderAsync: async () => ({
				release: jest.fn(),
				saveAsync: async () => ({ uri: 'file:///crop.png', base64: 'cropped-image', width: 100, height: 100 }),
			}),
		}),
	},
}));
jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return {
		...jest.requireActual<typeof import('@/auth')>('@/auth'),
		auth: { instance: create() },
		publicInstance: create(),
	};
});
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		theme: 'light',
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
const t = translations.fr;
const profile: UserClass = {
	id: 7,
	email: 'profile@example.invalid',
	first_name: 'Example',
	last_name: 'User',
	gender: 'Homme',
	avatar: 'https://example.invalid/original.webp',
	avatar_cropped: 'https://example.invalid/crop.webp',
	is_staff: true,
	is_active: true,
	default_password_set: false,
	date_joined: '2026-01-01T00:00:00Z',
	date_updated: null,
	last_login: null,
};
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	statusText: 'OK',
	headers: {},
});
const reject = (config: InternalAxiosRequestConfig, details: Record<string, string[]>, status = 400): never => {
	throw new AxiosError('Request rejected', 'ERR_BAD_REQUEST', config, undefined, response(config, { details }, status));
};
let store: ReturnType<typeof makeStore>;
beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = makeStore();
	store.runSaga(rootSaga);
	store.dispatch(accountSetProfilAction(profile));
});
afterEach(async () => {
	await cleanup();
	store.sagaTask?.cancel();
	store.dispatch(profilApi.util.resetApiState());
	await act(async () => {
		await jest.runOnlyPendingTimersAsync();
	});
	jest.useRealTimers();
});
const setup = async () =>
	await render(
		<Provider store={store}>
			<EditProfilClient />
		</Provider>,
	);
const submit = async () => await fireEvent.press(screen.getByRole('button', { name: t.settings.updateBtn }));

it('preserves existing images and readonly account fields when merging the partial profile PATCH response', async () => {
	const partial = {
		first_name: 'Updated',
		last_name: 'User',
		gender: 'F',
		avatar: profile.avatar,
		avatar_cropped: profile.avatar_cropped,
	};
	let saved = false;
	adapter.mockImplementation(async (config) => {
		if (config.method === 'patch') {
			saved = true;
			return response(config, partial);
		}
		return response(config, saved ? { ...profile, ...partial, gender: 'Femme' } : profile);
	});
	await setup();
	expect(await screen.findByLabelText(t.settings.fieldEmail)).toHaveProp('editable', false);
	expect(screen.getByLabelText(t.users.fieldAvatar)).toHaveProp('source', { uri: profile.avatar_cropped });
	await fireEvent.changeText(screen.getByLabelText(t.settings.fieldNom), 'Updated');
	await fireEvent.press(screen.getByRole('button', { name: t.settings.fieldGenre }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Femme' }));
	await submit();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.settings.profileUpdateSuccess));
	const request = adapter.mock.calls.find(([config]) => config.method === 'patch')![0];
	expect(request.url).toBe('/account/profil/');
	expect(JSON.parse(request.data)).toEqual({
		first_name: 'Updated',
		last_name: 'User',
		gender: 'Femme',
		avatar: profile.avatar,
		avatar_cropped: profile.avatar_cropped,
	});
	expect(getProfilState(store.getState())).toEqual({ ...profile, ...partial, gender: 'Femme' });
	expect(screen.getByLabelText(t.settings.fieldNom)).toHaveProp('value', 'Updated');
	expect(mockError).not.toHaveBeenCalled();
});

it('uploads a selected image and reuses the saved URLs on the next edit', async () => {
	const savedImages = {
		avatar: 'https://example.invalid/new.webp',
		avatar_cropped: 'https://example.invalid/new-crop.webp',
	};
	let saved = false;
	adapter.mockImplementation(async (config) => {
		if (config.method === 'patch') {
			saved = true;
			return response(config, { first_name: 'Example', last_name: 'User', gender: 'H', ...savedImages });
		}
		return response(config, saved ? { ...profile, ...savedImages } : profile);
	});
	jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
		canceled: false,
		assets: [{ uri: 'file:///selected.jpg', width: 100, height: 100, base64: 'ZXhhbXBsZQ==' }],
	});
	await setup();
	await fireEvent.press(await screen.findByRole('button', { name: t.common.editPhoto }));
	await screen.findByTestId('cropper');
	expect(adapter.mock.calls.some(([config]) => config.method === 'patch')).toBe(false);
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await waitFor(() =>
		expect(screen.getByLabelText(t.users.fieldAvatar)).toHaveProp('source', {
			uri: 'data:image/png;base64,cropped-image',
		}),
	);
	await submit();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
	const first = adapter.mock.calls.find(([config]) => config.method === 'patch')![0];
	expect(JSON.parse(first.data)).toMatchObject({
		avatar: 'data:image/jpeg;base64,ZXhhbXBsZQ==',
		avatar_cropped: 'data:image/png;base64,cropped-image',
	});
	expect(screen.getByLabelText(t.users.fieldAvatar)).toHaveProp('source', { uri: savedImages.avatar_cropped });
	await fireEvent.changeText(screen.getByLabelText(t.settings.fieldNom), 'Changed again');
	await submit();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(2));
	const second = adapter.mock.calls.filter(([config]) => config.method === 'patch')[1][0];
	expect(JSON.parse(second.data)).toMatchObject(savedImages);
});

it('clears both image fields in the submitted profile payload', async () => {
	let saved = false;
	adapter.mockImplementation(async (config) => {
		if (config.method === 'patch') saved = true;
		return response(config, saved ? { ...profile, avatar: null, avatar_cropped: null } : profile);
	});
	await setup();
	await fireEvent.press(await screen.findByTestId('clear-button'));
	expect(screen.getByRole('button', { name: t.common.addImage })).toBeOnTheScreen();
	await submit();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.settings.profileUpdateSuccess));
	const request = adapter.mock.calls.find(([config]) => config.method === 'patch')![0];
	expect(JSON.parse(request.data)).toMatchObject({ avatar: null, avatar_cropped: null });
	expect(getProfilState(store.getState())).toMatchObject({ avatar: null, avatar_cropped: null });
});

it('shows field errors and retains the unsaved edit without replacing the Redux profile', async () => {
	adapter.mockImplementation(async (config) =>
		config.method === 'patch' ? reject(config, { first_name: ['Server validation'] }) : response(config, profile),
	);
	await setup();
	await fireEvent.changeText(await screen.findByLabelText(t.settings.fieldNom), 'Unsaved name');
	await submit();
	await screen.findByText('Server validation');
	expect(screen.getByLabelText(t.settings.fieldNom)).toHaveProp('value', 'Unsaved name');
	expect(getProfilState(store.getState())).toEqual(profile);
	expect(mockError).toHaveBeenCalledWith(t.settings.profileUpdateError);
	expect(mockSuccess).not.toHaveBeenCalled();
});

it('displays an image validation error so the user can correct the rejected upload', async () => {
	adapter.mockImplementation(async (config) =>
		config.method === 'patch' ? reject(config, { avatar: ['Image too large'] }) : response(config, profile),
	);
	await setup();
	await screen.findByLabelText(t.settings.fieldNom);
	await submit();
	await screen.findByText('Image too large');
	expect(getProfilState(store.getState())).toEqual(profile);
	expect(mockError).toHaveBeenCalledWith(t.settings.profileUpdateError);
});

it('offers a retry after the initial profile request fails', async () => {
	adapter.mockImplementationOnce(async (config) => reject(config, { detail: ['Service unavailable'] }, 503));
	adapter.mockImplementation(async (config) => response(config, profile));
	await setup();
	await screen.findByText(t.errors.serverError);
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	await screen.findByLabelText(t.settings.fieldNom);
	expect(adapter).toHaveBeenCalledTimes(2);
});

it('replaces untouched cached profile fields and images after a same-ID refresh', async () => {
	await store.dispatch(profilApi.util.upsertQueryData('getProfil', undefined, profile));
	const fresh = {
		...profile,
		first_name: 'Fresh name',
		avatar: 'https://example.invalid/fresh.webp',
		avatar_cropped: 'https://example.invalid/fresh-crop.webp',
	};
	let finishGet!: () => void;
	adapter.mockImplementationOnce(
		(config) =>
			new Promise((resolve) => {
				finishGet = () => resolve(response(config, fresh));
			}),
	);
	adapter.mockImplementation(async (config) => response(config, fresh));
	await setup();
	await act(() => {
		void store.dispatch(profilApi.endpoints.getProfil.initiate(undefined, { forceRefetch: true, subscribe: false }));
	});
	expect(await screen.findByLabelText(t.settings.fieldNom)).toHaveProp('value', profile.first_name);
	await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));
	await act(async () => finishGet());
	await waitFor(() => expect(screen.getByLabelText(t.settings.fieldNom)).toHaveProp('value', 'Fresh name'));
	expect(screen.getByLabelText(t.users.fieldAvatar)).toHaveProp('source', { uri: fresh.avatar_cropped });
	await submit();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.settings.profileUpdateSuccess));
	const request = adapter.mock.calls.find(([config]) => config.method === 'patch')![0];
	expect(JSON.parse(request.data)).toMatchObject({
		first_name: fresh.first_name,
		avatar: fresh.avatar,
		avatar_cropped: fresh.avatar_cropped,
	});
});

it('reinitializes profile fields and images when the same account refreshes, matching web', async () => {
	await store.dispatch(profilApi.util.upsertQueryData('getProfil', undefined, profile));
	const fresh = { ...profile, first_name: 'Server name', avatar: null, avatar_cropped: null };
	let finishGet!: () => void;
	adapter.mockImplementationOnce(
		(config) =>
			new Promise((resolve) => {
				finishGet = () => resolve(response(config, fresh));
			}),
	);
	adapter.mockImplementation(async (config) => response(config, { ...profile, first_name: 'Unsaved name' }));
	await setup();
	await act(() => {
		void store.dispatch(profilApi.endpoints.getProfil.initiate(undefined, { forceRefetch: true, subscribe: false }));
	});
	await fireEvent.changeText(await screen.findByLabelText(t.settings.fieldNom), 'Unsaved name');
	await waitFor(() => expect(screen.getByLabelText(t.settings.fieldNom)).toHaveProp('value', 'Unsaved name'));
	await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));
	await act(async () => finishGet());
	await waitFor(() => expect(screen.getByLabelText(t.settings.fieldNom)).toHaveProp('value', 'Server name'));
	expect(screen.getByRole('button', { name: t.common.addImage })).toBeOnTheScreen();
	await submit();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.settings.profileUpdateSuccess));
	const request = adapter.mock.calls.find(([config]) => config.method === 'patch')![0];
	expect(JSON.parse(request.data)).toMatchObject({
		first_name: 'Server name',
		avatar: '',
		avatar_cropped: '',
	});
});

it('retains dirty profile fields and cleared images when a background refresh fails', async () => {
	await store.dispatch(profilApi.util.upsertQueryData('getProfil', undefined, profile));
	let failGet!: () => void;
	adapter.mockImplementationOnce(
		(config) =>
			new Promise((_resolve, rejectRequest) => {
				failGet = () => rejectRequest(new AxiosError('Offline', 'ERR_NETWORK', config));
			}),
	);
	adapter.mockImplementation(async (config) => response(config, profile));
	await setup();
	await act(() => {
		void store.dispatch(profilApi.endpoints.getProfil.initiate(undefined, { forceRefetch: true, subscribe: false }));
	});
	await fireEvent.changeText(await screen.findByLabelText(t.settings.fieldNom), 'Unsaved name');
	await fireEvent.press(screen.getByTestId('clear-button'));
	await waitFor(() => expect(screen.getByLabelText(t.settings.fieldNom)).toHaveProp('value', 'Unsaved name'));
	expect(screen.getByRole('button', { name: t.common.addImage })).toBeOnTheScreen();
	await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));
	await act(async () => failGet());
	await waitFor(() => expect(profilApi.endpoints.getProfil.select()(store.getState()).isError).toBe(true));
	expect(screen.getByLabelText(t.settings.fieldNom)).toHaveProp('value', 'Unsaved name');
	expect(screen.getByRole('button', { name: t.common.addImage })).toBeOnTheScreen();
	expect(getProfilState(store.getState())).toEqual(profile);
	expect(adapter.mock.calls.some(([config]) => config.method === 'patch')).toBe(false);
});
