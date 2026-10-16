import { put, takeLatest } from 'redux-saga/effects';
import * as Types from '../actions';
import { setGroupes, setProfil, setWSUserAvatar } from '../slices/accountSlice';
import type { setGroupesPayloadType, setProfilPayloadType } from '@/types/accountTypes';

export function* accountSetProfilSaga(payload: setProfilPayloadType) {
	yield put(setProfil(payload.data));
}

export function* accountEditProfilSaga(payload: setProfilPayloadType) {
	yield put(setProfil(payload.data));
}

export function* accountSetGroupesSaga(payload: setGroupesPayloadType) {
	yield put(setGroupes(payload.data));
}

export function* wsUserAvatarSaga(payload: { type: string; pk: number; avatar: string }) {
	yield put(setWSUserAvatar({ avatar: payload.avatar }));
}

export function* watchAccount() {
	yield takeLatest(Types.ACCOUNT_SET_PROFIL, accountSetProfilSaga);
	yield takeLatest(Types.ACCOUNT_SET_GROUPES, accountSetGroupesSaga);
	yield takeLatest(Types.ACCOUNT_EDIT_PROFIL, accountEditProfilSaga);
	yield takeLatest(Types.WS_USER_AVATAR, wsUserAvatarSaga);
}
