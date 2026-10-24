import type { DeviClass, FactureClass, FactureAvoirClass, BonDeLivraisonClass } from '@/models/classes';
import type {
	DevisFormSchema,
	DeviFactureLineFormValues,
	TypeFactureLivraisonDevisStatus,
	TypeRemiseType,
} from '@/types/devisTypes';
import type { PaginationResponseType } from '@/types/_initTypes';

// These contracts are shared by quotes, pro-formas, client invoices and credit notes. Component-only props
// remain beside their component, as in the other native modules.
export type DocumentType = 'devis' | 'facture-pro-forma' | 'facture-client' | 'facture-avoir' | 'bon-de-livraison';
export type DocumentData = Omit<
	DeviClass,
	'numero_devis' | 'date_devis' | 'numero_demande_prix_client' | 'date_echeance'
> & {
	date_echeance?: string | null;
	numero_bon_livraison?: string;
	date_bon_livraison?: string;
	livre_par?: number | null;
	livre_par_name?: string | null;
	source_facture_client?: number | null;
	source_facture_client_numero?: string | null;
	numero_avoir?: string;
	date_avoir?: string;
	facture_origine?: number | null;
	facture_origine_numero?: string | null;
	facture_origine_date?: string | null;
	motif_avoir?: string;
	motif_avoir_label?: string | null;
	numero_devis?: string;
	date_devis?: string;
	numero_demande_prix_client?: string | null;
	numero_facture?: string;
	date_facture?: string;
	numero_bon_commande_client?: string | null;
	termes_paiement?: string | null;
	has_logistics_dossier?: boolean;
	converted_facture_client?: number | null;
	converted_facture_client_numero?: string | null;
	source_devis?: number | null;
	source_proforma?: number | null;
	nombre_paiements?: number;
	total_paye?: number | string;
	reste_a_payer?: number | string;
	statut_paiement?: string;
};
export type DocumentFormSchema = Omit<DevisFormSchema, 'date_devis' | 'numero_demande_prix_client'> & {
	date_devis?: string;
	numero_demande_prix_client?: string | null;
	date_facture?: string;
	date_bon_livraison?: string;
	livre_par?: number | null;
	numero_bon_commande_client?: string | null;
	termes_paiement?: string | null;
};
export type DocumentWriteData = Omit<Partial<DeviClass & FactureClass & BonDeLivraisonClass>, 'lignes'> & {
	lignes?: DeviFactureLineFormValues[];
};

export interface CurrencyStats {
	chiffre_affaire_total: string;
	total_reglements: string;
	total_impayes: string;
	total_avoirs?: string;
	total_tva?: string;
}

export interface FactureClientListResponseType extends PaginationResponseType<FactureClass> {
	stats_by_currency: Record<'MAD' | 'EUR' | 'USD', CurrencyStats>;
}

export type FactureClientUnpaginatedResponseType = Pick<FactureClientListResponseType, 'results' | 'stats_by_currency'>;

export interface FactureAvoirListResponseType extends PaginationResponseType<FactureAvoirClass> {
	stats_by_currency: Record<'MAD' | 'EUR' | 'USD', { total_avoirs: string; total_tva: string }>;
}

export type FactureAvoirMotif = 'retour_marchandise' | 'erreur_facturation' | 'remise' | 'annulation' | 'autre';
export type FactureAvoirFormValues = {
	numero_part: string;
	year_part: string;
	date_avoir: string;
	facture_origine: number | null;
	client: number | null;
	mode_paiement: number | null;
	motif_avoir: FactureAvoirMotif | '';
	numero_bon_commande_client: string;
	remarque: string;
	fournisseur: string;
	fournisseur_email: string;
	statut: TypeFactureLivraisonDevisStatus;
	remise_type: TypeRemiseType;
	remise: number;
	devise: string;
	lignes: DeviFactureLineFormValues[];
	globalError?: string;
};

export type FactureAvoirFromFactureResponse = Partial<FactureAvoirClass> & {
	facture_total?: string;
	already_credited_total?: string;
};

export type FactureAvoirWriteData = Omit<Partial<FactureAvoirClass>, 'lignes'> & {
	lignes?: DeviFactureLineFormValues[];
};

export interface FactureForPayment {
	id: number;
	numero_facture: string;
	client_name: string;
	date_facture: string;
	total_ttc_apres_remise: string;
	total_paid: string;
	total_avoirs?: string;
	remaining_amount: string;
	statut: string;
	devise: string;
}
