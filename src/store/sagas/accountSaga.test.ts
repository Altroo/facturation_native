import { runSaga } from 'redux-saga';
import { takeLatest } from 'redux-saga/effects';
import * as Types from '../actions';
import {
	accountEditProfilSaga,
	accountSetGroupesSaga,
	accountSetProfilSaga,
	watchAccount,
	wsUserAvatarSaga,
} from './accountSaga';
import { setGroupes, setProfil, setWSUserAvatar } from '../slices/accountSlice';
import type { setGroupesPayloadType, setProfilPayloadType } from '@/types/accountTypes';
import { GroupClass, UserClass } from '@/models/classes';

describe('account sagas', () => {
	it('accountSetProfilSaga should dispatch setProfil with correct payload', async () => {
		const user = new UserClass(
			1,
			'John',
			'Doe',
			'john@example.com',
			'M',
			null,
			null,
			true,
			true,
			false,
			'2023-01-01',
			'2023-01-02',
			'2023-01-02',
		);

		const payload: setProfilPayloadType = {
			type: Types.ACCOUNT_SET_PROFIL,
			data: user,
		};

		const dispatched: unknown[] = [];
		await runSaga(
			{ dispatch: (action: unknown) => dispatched.push(action) },
			accountSetProfilSaga,
			payload,
		).toPromise();

		expect(dispatched).toEqual([setProfil(user)]);
	});

	it('accountEditProfilSaga should dispatch setProfil with correct payload', async () => {
		const user = new UserClass(
			2,
			'Jane',
			'Smith',
			'jane@example.com',
			'F',
			null,
			null,
			false,
			true,
			false,
			'2023-02-01',
			'2023-02-02',
			'2023-02-02',
		);

		const payload: setProfilPayloadType = {
			type: Types.ACCOUNT_EDIT_PROFIL,
			data: user,
		};

		const dispatched: unknown[] = [];
		await runSaga(
			{ dispatch: (action: unknown) => dispatched.push(action) },
			accountEditProfilSaga,
			payload,
		).toPromise();

		expect(dispatched).toEqual([setProfil(user)]);
	});

	it('accountSetGroupesSaga should dispatch setGroupes with correct payload', async () => {
		const group = new GroupClass(['Caissier', 'Lecture']);

		const payload: setGroupesPayloadType = {
			type: Types.ACCOUNT_SET_GROUPES,
			data: group,
		};

		const dispatched: unknown[] = [];
		await runSaga(
			{ dispatch: (action: unknown) => dispatched.push(action) },
			accountSetGroupesSaga,
			payload,
		).toPromise();

		expect(dispatched).toEqual([setGroupes(group)]);
	});

	it('wsUserAvatarSaga should dispatch setWSUserAvatar with correct payload', async () => {
		const payload = {
			type: Types.WS_USER_AVATAR,
			pk: 123,
			avatar: 'avatar.png',
		};

		const dispatched: unknown[] = [];
		await runSaga({ dispatch: (action: unknown) => dispatched.push(action) }, wsUserAvatarSaga, payload).toPromise();

		expect(dispatched).toEqual([setWSUserAvatar({ avatar: payload.avatar })]);
	});

	it('watchAccount should register sagas with takeLatest', () => {
		const gen = watchAccount();
		expect(gen.next().value).toEqual(takeLatest(Types.ACCOUNT_SET_PROFIL, accountSetProfilSaga));
		expect(gen.next().value).toEqual(takeLatest(Types.ACCOUNT_SET_GROUPES, accountSetGroupesSaga));
		expect(gen.next().value).toEqual(takeLatest(Types.ACCOUNT_EDIT_PROFIL, accountEditProfilSaga));
		expect(gen.next().value).toEqual(takeLatest(Types.WS_USER_AVATAR, wsUserAvatarSaga));
	});
});
