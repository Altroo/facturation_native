import type { PaginationResponseType } from '@/types/_initTypes';

export type LogistiqueStatut =
	| 'Brouillon'
	| 'À lancer'
	| 'En cours'
	| 'En attente externe'
	| 'Bloqué'
	| 'En retard'
	| 'À clôturer'
	| 'Clôturé'
	| 'Annulé'
	| 'Rouvert';
export type LogistiquePaymentStatus = 'Non demandé' | 'En attente' | 'Validé';
export type LogistiqueImportTitleStatus = 'À préparer' | "Titre d'import validé – En attente de paiement";

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
	responsable?: number | null;
	devise: string;
	date_prevue: string | null;
	statut_paiement: LogistiquePaymentStatus;
	statut_titre_importation: LogistiqueImportTitleStatus;
	cout_total: number | string;
	alerts: string[];
	statut_commande_lancement: string;
	statut_global: string;
	statut: string;
	lignes?: LogistiqueLine[];
};
export type LogistiqueStats = {
	total_commandes: number;
	commandes_en_cours: number;
	retards: number;
	paiements_en_attente: number;
	livraisons: number;
	couts_logistiques: number | string;
	swift_manquant: number;
	documents_non_recus: number;
	transit_non_lance: number;
	fournisseurs: { fournisseur: string }[];
	kpi_fournisseurs: { fournisseur: string; total_commandes: number; cout_total: number | string }[];
	statuts_workflow: { statut: LogistiqueStatut; total: number }[];
	statuts_paiement: { statut_paiement: LogistiquePaymentStatus; total: number }[];
	couts_detail: {
		achat: number | string;
		transport: number | string;
		transit: number | string;
		douane: number | string;
		tva: number | string;
		livraison_locale: number | string;
		autres: number | string;
		total: number | string;
	};
	monthly_flow: {
		month: string;
		commandes: number;
		livraisons: number;
		paiements: number;
		cout_total: number | string;
	}[];
};
export type LogistiqueListResponse = PaginationResponseType<LogistiqueOrder> & { stats: LogistiqueStats };
export type LogistiqueSupplier = {
	id: number;
	company: number;
	nom: string;
	email: string;
	marques?: number[];
	marques_names?: string[];
	date_created?: string;
	date_updated?: string;
	total_dossiers: number;
	derniere_activite: string | null;
};

export type LogistiqueSupplierFormValues = {
	nom: string;
	email: string;
	marques: number[];
	globalError?: string;
};
