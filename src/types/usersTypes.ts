import type { UserClass } from '@/models/classes';
import type { ReactNode } from 'react';

export type UserCompaniesType = {
	membership_id: number;
	company_id: number;
	raison_sociale: string;
	role: string;
	can_validate_factures?: boolean;
	can_change_document_status?: boolean;
};

export interface UserWithCompaniesResponseType extends UserClass {
	companies: Array<UserCompaniesType>;
}

export type UsersFormValuesType = {
	first_name: string;
	last_name: string;
	email: string;
	gender: string;
	is_active: boolean;
	is_staff: boolean;
	avatar: string | ArrayBuffer;
	avatar_cropped: string | ArrayBuffer;
	companies: Array<UserCompaniesType>;
	globalError: string;
};

export type UsersFormFormikContentProps = { id?: number };

export interface UsersViewInfoRowProps {
	icon: ReactNode;
	label: string;
	value: string | number | null | undefined | ReactNode;
}

export interface UsersViewProps {
	id: number;
}

export type UsersQueryParams = {
	with_pagination?: boolean;
	page?: number;
	pageSize?: number;
	search?: string;
	date_joined_after?: string;
	date_joined_before?: string;
	last_login_after?: string;
	last_login_before?: string;
	[key: string]: string | number | boolean | undefined;
};
