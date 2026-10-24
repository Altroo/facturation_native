export type TypeFactureLivraisonDevisStatus =
	'Brouillon' | 'Envoyé' | 'Accepté' | 'Refusé' | 'Annulé' | 'Expiré' | 'Facturé';

export type TypeRemiseType = '' | 'Pourcentage' | 'Fixe';

export type DeviLineSchemaType = {
	id: number;
	article: number;
	article_designation: string | null;
	designation: string | null;
	prix_achat: number;
	devise_prix_achat: string;
	prix_vente: number;
	devise_prix_vente: string;
	quantity: number;
	remise_type: TypeRemiseType;
	remise: number;
};

export interface DeviFactureLineFormValues {
	id?: string | number;
	article: number;
	reference?: string;
	designation: string;
	prix_achat: number;
	devise_prix_achat: string;
	prix_vente: number;
	devise_prix_vente: string;
	quantity: number;
	remise_type?: TypeRemiseType;
	remise?: number;
}

export type ValidateArticleLinesErrorType = { [key: string]: string };

export type DevisQueryParams = {
	company_id: number;
	with_pagination?: boolean;
	page?: number;
	pageSize?: number;
	search?: string;
	[key: string]: string | number | boolean | undefined;
};

export interface DevisFormSchema {
	numero_part: string;
	year_part: string;
	numero_devis?: string;
	client: number | null;
	date_devis: string;
	date_echeance: string | null;
	numero_demande_prix_client: string | null;
	mode_paiement: number | null;
	fournisseur: string;
	fournisseur_email: string;
	remarque: string | null;
	remise_type: TypeRemiseType;
	remise: number;
	devise: string;
	lignes: DeviFactureLineFormValues[];
	globalError?: string;
}

export type DocumentPdfType =
	'normal' | 'avec_remise' | 'sans_remise' | 'avec_unite_sans_remise' | 'avec_unite_avec_remise';

export type Totals = {
	totalHT: number;
	totalPrixAchat: number;
	totalPrixAchatDevise: string | null;
	totalTVA: number;
	totalTTC: number;
	totalTTCApresRemise: number;
};
