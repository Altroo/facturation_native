import type { SagaPayloadType } from '@/types/_initTypes';

export type NbrEmployeType = '' | '1 à 5' | '5 à 10' | '10 à 50' | '50 à 100' | 'plus que 100';

export type CiviliteType = '' | 'Mme' | 'Mlle' | 'M.';

//!- Companies State

export interface CompaniesStateInterface {
	user_companies: Array<CompaniesUserCompaniesType>;
}

export type ManagedByWriteOnlyType = {
	pk: number;
	role: string | null;
	can_validate_factures?: boolean;
	can_change_document_status?: boolean;
};

type ManagedByEntry = {
	pk: number;
	first_name: string | null;
	last_name: string | null;
	role: string | null;
	can_validate_factures?: boolean;
	can_change_document_status?: boolean;
};

export type CompanyFormValuesType = {
	raison_sociale: string;
	email: string;
	nbr_employe: string;
	civilite_responsable: string;
	nom_responsable: string;
	gsm_responsable: string;
	adresse: string;
	telephone: string;
	fax: string;
	site_web: string;
	numero_du_compte: string;
	ICE: string;
	registre_de_commerce: string;
	identifiant_fiscal: string;
	tax_professionnelle: string;
	CNSS: string;
	logo: string | ArrayBuffer;
	logo_cropped: string | ArrayBuffer;
	cachet: string | ArrayBuffer;
	cachet_cropped: string | ArrayBuffer;
	managed_by: Array<ManagedByEntry>;
	uses_foreign_currency: boolean;
	stock_management_enabled: boolean;
	inventory_management_enabled: boolean;
	globalError?: string;
};

export type CompaniesUserCompaniesType = {
	id: number;
	raison_sociale: string;
	role: string;
	uses_foreign_currency: boolean;
	stock_management_enabled?: boolean;
	inventory_management_enabled?: boolean;
	can_validate_factures?: boolean;
	can_change_document_status?: boolean;
};

export type setCompaniesUserSagatype = SagaPayloadType<Array<CompaniesUserCompaniesType>>;

export type CompaniesQueryParams = {
	with_pagination?: boolean;
	page?: number;
	pageSize?: number;
	search?: string;
	date_created_after?: string;
	date_created_before?: string;
	[key: string]: string | number | boolean | undefined;
};
