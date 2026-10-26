import { all, call, fork, put, race, select, take, takeLeading, takeLatest } from 'redux-saga/effects';
import type { AxiosInstance } from 'axios';
import type { SagaIterator } from 'redux-saga';
import { Platform } from 'react-native';
import * as Types from '@/store/actions';
import { accountLoginAction, accountSetProfilAction } from '@/store/actions/accountActions';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import {
	initToken,
	setInitState,
	emptyInitStateToken,
	setAuthenticated,
	setLoginError,
	setLogoutWarning,
	setSessionUnavailable,
} from '@/store/slices/_initSlice';
import { auth, InvalidSessionError } from '@/auth';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';
import { allowAnyInstance, isAuthenticatedInstance, normalizeApiError } from '@/utils/helpers';
import { getApi } from '@/utils/apiHelpers';
import { accountApi, profilApi, usersApi, groupApi } from '@/store/services/account';
import { companyApi } from '@/store/services/company';
import { clientApi } from '@/store/services/client';
import { articleApi } from '@/store/services/article';
import { deviApi } from '@/store/services/devi';
import { factureProFormaApi } from '@/store/services/factureProForma';
import { factureClientApi } from '@/store/services/factureClient';
import { factureAvoirApi } from '@/store/services/factureAvoir';
import { bonDeLivraisonApi } from '@/store/services/bonDeLivraison';
import { reglementApi } from '@/store/services/reglement';
import { stockApi } from '@/store/services/stock';
import { logistiqueApi } from '@/store/services/logistique';
import { aiAssistantApi } from '@/store/services/aiAssistant';
import {
	citiesApi,
	marqueApi,
	categorieApi,
	uniteApi,
	emplacementApi,
	modePaiementApi,
	livreParApi,
} from '@/store/services/parameter';
import { notificationApi } from '@/store/services/notification';
import { setWSMaintenance, setWSServerVersion } from '@/store/slices/wsSlice';
import { getInitState, getProfilState } from '@/store/selectors';
import { initAppSessionTokensAction, refreshAppTokenStatesAction } from '@/store/actions/_initActions';
import type {
	InitStateInterface,
	InitStateToken,
	MaintenanceGetRootResponseType,
	NativeSessionState,
} from '@/types/_initTypes';
import type { UserClass } from '@/models/classes';
import type { SessionResult } from '@/types/accountTypes';

export function* initAppSaga(): SagaIterator {
	// Native restores device storage before opening routes; InitEffects separately
	// refreshes public maintenance for guests and on foreground transitions.
	try {
		const restored: SessionResult<boolean> = yield call(auth.restore);
		if (!restored.success) {
			if (restored.error instanceof InvalidSessionError) yield put(initToken());
			else yield put(setSessionUnavailable(normalizeApiError(restored.error)));
			return;
		}
		if (restored.data) yield call(loadAccount);
		else yield put(initToken());
	} catch (error) {
		if (error instanceof InvalidSessionError) yield put(initToken());
		else yield put(setSessionUnavailable(normalizeApiError(error)));
	}
}

export function* initAppSessionTokensSaga(payload: ReturnType<typeof initAppSessionTokensAction>): SagaIterator {
	const { status }: NativeSessionState = yield select(getInitState);
	// Ignore an effect from a session that has since rotated or logged out.
	if (status !== 'authenticated' || payload.session !== auth.getSession()) return;
	const profile: UserClass = yield select(getProfilState);
	const stateToken = {
		user: profile?.id
			? { pk: profile.id, email: profile.email, first_name: profile.first_name, last_name: profile.last_name }
			: emptyInitStateToken.user,
		access: payload.session.access,
		refresh: payload.session.refresh,
		access_expiration: payload.session.access_expiration,
		refresh_expiration: payload.session.refresh_expiration,
	};
	const appToken = {
		initStateToken: stateToken,
	};
	yield put(setInitState(appToken));
}

export function* initMaintenanceSaga(): SagaIterator {
	const url = process.env.EXPO_PUBLIC_WS_MAINTENANCE_ROOT;

	if (!url) {
		return;
	}

	const controller = new AbortController();
	try {
		const instance: AxiosInstance = yield call(() => allowAnyInstance());
		// Foreground refreshes must not overwrite a newer live socket signal.
		const { response }: { response?: MaintenanceGetRootResponseType } = yield race({
			response: call(() => getApi(url, instance, undefined, { signal: controller.signal })),
			signal: take(Types.WS_MAINTENANCE),
		});
		if (response?.status === 200) {
			yield put(setWSMaintenance(response.data.maintenance));
			if (response.data.version !== undefined) yield put(setWSServerVersion(response.data.version));
		}
	} catch {
		return;
	} finally {
		controller.abort();
	}
}

export function* refreshAppTokenStatesSaga(payload: ReturnType<typeof refreshAppTokenStatesAction>): SagaIterator {
	const { status }: NativeSessionState = yield select(getInitState);
	if (status !== 'authenticated' || payload.session !== auth.getSession()) return;
	const accessToken: string = payload.session['access'];
	const refreshToken: string = payload.session['refresh'];
	const accessTokenExpiration = payload.session['access_expiration'];
	const refreshTokenExpiration = payload.session['refresh_expiration'];
	// The native session contains tokens; the profile is loaded separately.
	const profile: UserClass = yield select(getProfilState);
	const userObj = profile?.id
		? { pk: profile.id, email: profile.email, first_name: profile.first_name, last_name: profile.last_name }
		: emptyInitStateToken.user;
	const appToken: InitStateInterface<InitStateToken> = {
		initStateToken: {
			access: accessToken,
			refresh: refreshToken,
			user: {
				pk: userObj.pk,
				email: userObj.email,
				first_name: userObj.first_name,
				last_name: userObj.last_name,
			},
			refresh_expiration: refreshTokenExpiration,
			access_expiration: accessTokenExpiration,
		},
	};
	if (appToken) {
		yield put(setInitState(appToken));
	}
}

// Same getApi -> Saga action -> slice -> selector flow as Facturation.
// An AbortController stops account requests when logout cancels initialization.
export function* loadAccount(): SagaIterator {
	const epoch = auth.epoch;
	const controller = new AbortController();
	const instance = isAuthenticatedInstance();
	try {
		const [profile, companies] = yield all([
			call(() => getApi(process.env.EXPO_PUBLIC_ACCOUNT_PROFIL, instance, undefined, { signal: controller.signal })),
			call(() =>
				getApi(process.env.EXPO_PUBLIC_USER_COMPANIES_LIST, instance, undefined, { signal: controller.signal }),
			),
		]);
		if (auth.epoch !== epoch) {
			// A previous account's response must not clear the current session.
			return;
		}
		if (!profile.data || !Array.isArray(companies.data)) {
			// Keep the same generic, retryable state without manufacturing an exception.
			yield put(setSessionUnavailable(normalizeApiError(null)));
			return;
		}
		yield put(accountSetProfilAction(profile.data));
		yield put(companiesSetUserCompaniesAction(companies.data));
		yield put(setAuthenticated());
	} finally {
		controller.abort();
	}
}

export function* accountLoginSaga(action: ReturnType<typeof accountLoginAction>): SagaIterator {
	let loggedIn = false;
	try {
		const result: SessionResult = yield call(auth.signIn, action.data);
		if (!result.success) {
			yield put(setLoginError(normalizeApiError(result.error)));
			return;
		}
		loggedIn = true;
		yield call(loadAccount);
		const { status }: NativeSessionState = yield select(getInitState);
		const session = auth.getSession();
		if (status === 'authenticated' && session) yield put(refreshAppTokenStatesAction(session));
	} catch (error) {
		if (error instanceof InvalidSessionError) yield put(initToken());
		else
			yield put(loggedIn ? setSessionUnavailable(normalizeApiError(error)) : setLoginError(normalizeApiError(error)));
	}
}
export function* resetApiState(): SagaIterator {
	yield put(accountApi.util.resetApiState());
	yield put(profilApi.util.resetApiState());
	yield put(usersApi.util.resetApiState());
	yield put(groupApi.util.resetApiState());
	yield put(companyApi.util.resetApiState());
	yield put(clientApi.util.resetApiState());
	yield put(articleApi.util.resetApiState());
	yield put(deviApi.util.resetApiState());
	yield put(factureProFormaApi.util.resetApiState());
	yield put(factureClientApi.util.resetApiState());
	yield put(factureAvoirApi.util.resetApiState());
	yield put(bonDeLivraisonApi.util.resetApiState());
	yield put(reglementApi.util.resetApiState());
	yield put(stockApi.util.resetApiState());
	yield put(logistiqueApi.util.resetApiState());
	yield put(aiAssistantApi.util.resetApiState());
	yield put(modePaiementApi.util.resetApiState());
	yield put(livreParApi.util.resetApiState());
	yield put(marqueApi.util.resetApiState());
	yield put(categorieApi.util.resetApiState());
	yield put(uniteApi.util.resetApiState());
	yield put(emplacementApi.util.resetApiState());
	yield put(citiesApi.util.resetApiState());
	yield put(notificationApi.util.resetApiState());
}
export function* accountLogoutSaga(): SagaIterator {
	const warnings: ReturnType<typeof normalizeApiError>[] = [];
	try {
		const result: SessionResult = yield call(auth.signOut, Platform.OS !== 'web');
		if (!result.success) warnings.push(normalizeApiError(result.error));
	} catch (error) {
		warnings.push(normalizeApiError(error));
	} finally {
		try {
			yield call(passwordResetStorage.write, null);
		} catch (error) {
			warnings.push(normalizeApiError(error));
		} finally {
			yield call(passwordResetStorage.resetCompletion);
			yield call(resetApiState);
			// Keep guest routes closed until pending cleanup cannot erase a new recovery flow.
			yield put(initToken());
			for (const warning of warnings) yield put(setLogoutWarning(warning));
		}
	}
}
function* cancellableInit(): SagaIterator {
	yield race({ restore: call(initAppSaga), ended: take([Types.ACCOUNT_LOGOUT, initToken.type]) });
}
function* cancellableLogin(action: ReturnType<typeof accountLoginAction>): SagaIterator {
	yield race({ login: call(accountLoginSaga, action), ended: take([Types.ACCOUNT_LOGOUT, initToken.type]) });
}
export function* watchInit(): SagaIterator {
	yield all([
		takeLatest(Types.INIT_APP_SESSION_TOKENS, initAppSessionTokensSaga),
		takeLatest(Types.REFRESH_APP_TOKEN_STATES, refreshAppTokenStatesSaga),
		takeLatest(Types.INIT_MAINTENANCE, initMaintenanceSaga),
		takeLeading(Types.INIT_APP, cancellableInit),
		takeLeading(Types.ACCOUNT_LOGIN, cancellableLogin),
		takeLeading(Types.ACCOUNT_LOGOUT, accountLogoutSaga),
		fork(function* (): SagaIterator {
			while (true) {
				yield take(initToken.type);
				yield call(resetApiState);
			}
		}),
	]);
}
