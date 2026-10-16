import * as types from './index';
import {
	accountSetProfilAction,
	accountSetGroupesAction,
	accountEditProfilAction,
	accountLoginAction,
	accountLogoutAction,
} from './accountActions';
import { UserClass, GroupClass } from '@/models/classes';

describe('Account Actions', () => {
	it('accountSetProfilAction should create ACCOUNT_SET_PROFIL action with user data', () => {
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

		const action = accountSetProfilAction(user);
		expect(action).toEqual({
			type: types.ACCOUNT_SET_PROFIL,
			data: { ...user },
		});
	});

	it('accountSetGroupesAction should create ACCOUNT_SET_GROUPES action with group data', () => {
		const group = new GroupClass(['Caissier', 'User']);

		const action = accountSetGroupesAction(group);
		expect(action).toEqual({
			type: types.ACCOUNT_SET_GROUPES,
			data: group,
		});
	});

	it('accountEditProfilAction should create ACCOUNT_EDIT_PROFIL action with user data', () => {
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

		const action = accountEditProfilAction(user);
		expect(action).toEqual({
			type: types.ACCOUNT_EDIT_PROFIL,
			data: { ...user },
		});
	});
});

it('passes credentials under data and copies them before the form can change', () => {
	const credentials = { email: 'test@example.invalid', password: 'example-password' };
	const action = accountLoginAction(credentials);
	credentials.password = 'changed-in-form';
	expect(action).toEqual({
		type: 'ACCOUNT_LOGIN',
		data: { email: 'test@example.invalid', password: 'example-password' },
	});
});

it('keeps logout free of credentials and extra payload fields', () => {
	expect(accountLogoutAction()).toEqual({ type: 'ACCOUNT_LOGOUT' });
});

it.each([
	[accountSetProfilAction, 'ACCOUNT_SET_PROFIL'],
	[accountEditProfilAction, 'ACCOUNT_EDIT_PROFIL'],
] as const)('copies UserClass fields into the original data envelope for %s', (createAction, type) => {
	const profile = new UserClass(
		7,
		'Test',
		'User',
		'test@example.invalid',
		'Femme',
		'avatar.png',
		null,
		true,
		false,
		false,
		'2026-01-01',
		null,
		null,
	);
	const fields = { ...profile };
	const action = createAction(profile);
	profile.first_name = 'Changed';
	expect(action).toEqual({ type, data: fields });
	expect(action.data).not.toBe(profile);
	expect(Object.getPrototypeOf(action.data)).toBe(Object.prototype);
});

it('preserves the original group_titles payload, including an empty role list', () => {
	const groups = { group_titles: ['Caissier', 'Commercial'] };
	expect(accountSetGroupesAction(groups)).toEqual({ type: 'ACCOUNT_SET_GROUPES', data: groups });
	expect(accountSetGroupesAction(groups).data).toBe(groups);
	expect(accountSetGroupesAction({ group_titles: [] })).toEqual({
		type: 'ACCOUNT_SET_GROUPES',
		data: { group_titles: [] },
	});
});
