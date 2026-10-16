import type { InternalAxiosRequestConfig } from 'axios';
import type { SagaPayloadType, TokenType } from '@/types/_initTypes';
import type { GroupClass, UserClass } from '@/models/classes';

export type PasswordResetCodeField = 'one' | 'two' | 'three' | 'four' | 'five' | 'six';

//!- Account State
export interface AccountStateInterface {
	profil: UserClass | Record<string, unknown>;
	groupes: Array<string> | Array<null>;
}

export type AccountGenderCodeValueType = {
	code: 'H' | 'F';
	value: string;
};

export type DropDownType = {
	code: string;
	value: string;
	archived?: boolean;
};

export type setProfilPayloadType = SagaPayloadType<UserClass>;
export type setGroupesPayloadType = SagaPayloadType<GroupClass>;

export interface EditProfilResponse extends TokenType {
	data: Partial<UserClass>;
}

export interface PasswordResetResponse extends TokenType {
	data: {
		old_password: string;
		new_password: string;
		new_password2: string;
	};
}

export type EnterCodePageContentProps = {
	email: string;
};

export type EnterCodeProps = {
	email: string;
};

export type SetPasswordPageContentProps = {
	email: string;
	code: string;
};

export type SetPasswordProps = {
	email: string;
	code: string;
};

export type Tokens = {
	access: string;
	refresh: string;
	access_expiration: string;
	refresh_expiration: string;
};

export type Credentials = { email: string; password: string };

export type SessionResult<T = undefined> = { success: true; data: T } | { success: false; error: unknown };

export type TokenStorage = { read: () => Promise<unknown>; write: (tokens: Tokens | null) => Promise<void> };

export type SessionRequest = InternalAxiosRequestConfig & { sessionEpoch?: number; nativeLogout?: boolean };

export type PasswordResetData = { email: string; code: string };
