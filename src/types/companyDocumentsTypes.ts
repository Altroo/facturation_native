import type { DeviClass, FactureClass } from '@/models/classes';
import type { DevisFormSchema, DeviFactureLineFormValues } from '@/types/devisTypes';

// These contracts are shared by quotes and pro-formas. Component-only props
// remain beside their component, as in the other native modules.
export type DocumentType = 'devis' | 'facture-pro-forma';
export type DocumentData = Omit<DeviClass, 'numero_devis' | 'date_devis' | 'numero_demande_prix_client'> & {
	numero_devis?: string;
	date_devis?: string;
	numero_demande_prix_client?: string | null;
	numero_facture?: string;
	date_facture?: string;
	numero_bon_commande_client?: string | null;
	termes_paiement?: string | null;
	has_logistics_dossier?: boolean;
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
