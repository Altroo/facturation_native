export type ReglementStatutType = 'Valide' | 'Annulé';

export type ReglementSchemaType = {
	facture_client: number;
	mode_reglement: number | null;
	libelle?: string;
	observations?: string;
	montant: number | string;
	date_reglement: string;
	globalError?: string;
};
