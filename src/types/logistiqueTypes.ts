import type { PaginationResponseType } from '@/types/_initTypes';

// The receipt form uses these original logistics fields. The logistics module
// will extend the same contract when its screens are migrated.
export type LogistiqueLine = {
	id: number;
	article: number;
	type_article?: string;
	article_reference: string;
	designation: string;
	quantity: number | string;
	received_quantity: number | string;
	remaining_quantity: number | string;
	expected_emplacement: number | null;
	expected_emplacement_name: string | null;
	incoming_active: boolean;
};
export type LogistiqueOrder = {
	id: number;
	company: number;
	numero_commande: string;
	fournisseur: string;
	statut_commande_lancement: string;
	statut_global: string;
	statut: string;
	lignes: LogistiqueLine[];
};
export type LogistiqueListResponse = PaginationResponseType<LogistiqueOrder>;
