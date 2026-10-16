import * as types from './index';
import type { UserClass, GroupClass } from '@/models/classes';
import type { Credentials } from '@/types/accountTypes';

export const accountSetProfilAction = (props: UserClass) => {
	return {
		type: types.ACCOUNT_SET_PROFIL,
		data: { ...props },
	};
};

export const accountSetGroupesAction = (props: GroupClass) => {
	return {
		type: types.ACCOUNT_SET_GROUPES,
		data: props,
	};
};

export const accountEditProfilAction = (props: UserClass) => {
	return {
		type: types.ACCOUNT_EDIT_PROFIL,
		data: { ...props },
	};
};

export const accountLoginAction = (props: Credentials) => {
	return { type: types.ACCOUNT_LOGIN, data: { ...props } };
};

export const accountLogoutAction = () => {
	return { type: types.ACCOUNT_LOGOUT };
};
