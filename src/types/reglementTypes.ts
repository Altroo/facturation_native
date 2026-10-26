import type { PaginationResponseType } from '@/types/_initTypes';
import type { ReglementClass } from '@/models/classes';
import type { CurrencyStats } from '@/types/companyDocumentsTypes';

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

export interface ReglementListResponseType extends PaginationResponseType<ReglementClass> {
	stats_by_currency: Record<'MAD' | 'EUR' | 'USD', CurrencyStats>;
}
export type ReglementUnpaginatedResponseType = Pick<ReglementListResponseType, 'results' | 'stats_by_currency'>;
