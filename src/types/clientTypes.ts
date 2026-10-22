export type TypeClientType = 'PM' | 'PP' | 'CD';

export type ClientSchemaType = {
	client_type: TypeClientType;
	code_client: string;
	company: number;
	raison_sociale?: string | null;
	nom?: string | null;
	prenom?: string | null;
	adresse?: string | null;
	ville?: number | null;
	tel?: string | null;
	email?: string | null;
	delai_de_paiement?: number | null;
	remarque?: string | null;
	numero_du_compte?: string | null;
	ICE?: string | null;
	registre_de_commerce?: string | null;
	identifiant_fiscal?: string | null;
	taxe_professionnelle?: string | null;
	CNSS?: string | null;
	globalError?: string;
};

// The history endpoint returns document summaries. Keep this API contract here
// until those modules bring their complete models, rather than adding unused classes.
export type ClientHistoryResponseType = {
	devis: Array<{
		id: number;
		numero_devis: string;
		date_devis: string;
		statut: string;
		total_ttc_apres_remise: string | number | null;
		devise: string;
	}>;
	factures: Array<{
		id: number;
		numero_facture: string;
		date_facture: string;
		date_echeance: string | null;
		statut: string;
		statut_paiement: string | null;
		total_ttc_apres_remise: string | number | null;
		devise: string;
	}>;
	avoirs: Array<{
		id: number;
		numero_avoir: string;
		facture_origine_numero: string | null;
		date_avoir: string;
		statut: string;
		total_ttc_apres_remise: string | number | null;
		devise: string;
	}>;
	reglements: Array<{
		id: number;
		libelle: string | null;
		facture_client_numero: string | null;
		date_reglement: string;
		date_echeance: string | null;
		statut: string;
		mode_reglement_name: string | null;
		montant: string | number | null;
		devise: string;
	}>;
};

export type StatementEntryType = 'invoice' | 'credit_note' | 'payment' | 'opening';
export type StatementType = 'all' | Exclude<StatementEntryType, 'opening'>;
export type AccountStatementRow = {
	id: string;
	type: StatementEntryType;
	date: string;
	dueDate: string;
	piece: string;
	label: string;
	devise: string;
	debit: number;
	credit: number;
};

export type ClientsQueryParams = {
	company_id: number;
	with_pagination?: boolean;
	page?: number;
	pageSize?: number;
	search?: string;
	archived?: boolean;
	[key: string]: string | number | boolean | undefined;
};
