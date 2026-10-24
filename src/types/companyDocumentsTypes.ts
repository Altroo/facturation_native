import type { DeviClass, FactureClass } from '@/models/classes';
import type { DevisFormSchema, DeviFactureLineFormValues } from '@/types/devisTypes';
import type { PaginationResponseType } from '@/types/_initTypes';

// These contracts are shared by quotes, pro-formas and client invoices. Component-only props
// remain beside their component, as in the other native modules.
export type DocumentType = 'devis' | 'facture-pro-forma' | 'facture-client';
export type DocumentData = Omit<DeviClass, 'numero_devis' | 'date_devis' | 'numero_demande_prix_client'> & {
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
	numero_bon_commande_client?: string | null;
	termes_paiement?: string | null;
};
export type DocumentWriteData = Omit<Partial<DeviClass & FactureClass>, 'lignes'> & {
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
