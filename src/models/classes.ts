import type { NbrEmployeType, CiviliteType, ManagedByWriteOnlyType } from '@/types/companyTypes';
import { type ManagedByType } from '@/components/shared/addManagedByTable/addManagedByTable';
import type { TypeClientType } from '@/types/clientTypes';

export class UserClass {
	constructor(
		public readonly id: number,
		public first_name: string,
		public last_name: string,
		public email: string,
		public gender: string,
		public avatar: string | ArrayBuffer | null,
		public avatar_cropped: string | ArrayBuffer | null,
		public is_staff: boolean,
		public is_active: boolean,
		public default_password_set: boolean,
		public date_joined: string | null,
		public date_updated: string | null,
		public last_login: string | null,
	) {}
}

export class GroupClass {
	constructor(public group_titles: Array<string> | Array<null>) {}
}

export class ClientClass {
	constructor(
		public readonly id: number,
		public code_client: string,
		public client_type: TypeClientType | string,
		public company: number,
		public readonly company_name: string | null,
		public adresse: string | null,
		public ville: number | null,
		public readonly ville_name: string | null,
		public tel: string | null,
		public email: string | null,
		public delai_de_paiement: number | null,
		public remarque: string | null,
		public date_created: string | null,
		public date_updated: string | null,
		public archived: boolean,
		public raison_sociale: string | null,
		public numero_du_compte: string | null,
		public ICE: string | null,
		public registre_de_commerce: string | null,
		public identifiant_fiscal: string | null,
		public taxe_professionnelle: string | null,
		public CNSS: string | null,
		public fax: string | null,
		public nom: string | null,
		public prenom: string | null,
	) {}
}

export class CitiesClass {
	constructor(
		public readonly id: number,
		public nom: string,
		public company: number,
	) {}
}

export class CompanyClass {
	public stock_management_enabled = false;
	public inventory_management_enabled = false;

	constructor(
		public readonly id: number,
		public date_created: string | null,
		public date_updated: string | null,
		public raison_sociale: string,
		public email: string | null,
		public logo: string | ArrayBuffer | null,
		public logo_cropped: string | ArrayBuffer | null,
		public cachet: string | ArrayBuffer | null,
		public cachet_cropped: string | ArrayBuffer | null,
		public nbr_employe: NbrEmployeType | string,
		public civilite_responsable: CiviliteType | string,
		public nom_responsable: string | null,
		public gsm_responsable: string | null,
		public adresse: string | null,
		public telephone: string | null,
		public fax: string | null,
		public site_web: string | null,
		public numero_du_compte: string | null,
		public ICE: string | null,
		public registre_de_commerce: string | null,
		public identifiant_fiscal: string | null,
		public tax_professionnelle: string | null,
		public CNSS: string | null,
		public managed_by: Array<ManagedByWriteOnlyType>,
		public admins: Array<ManagedByType>,
		public uses_foreign_currency: boolean,
		public can_validate_factures?: boolean,
		public can_change_document_status?: boolean,
	) {}
}
