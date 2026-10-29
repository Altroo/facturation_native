import { version } from '../../package.json';
import type { AccountGenderCodeValueType, DropDownType, PasswordResetCodeField } from '@/types/accountTypes';
import type { LogistiqueStatut, LogistiquePaymentStatus, LogistiqueImportTitleStatus } from '@/types/logistiqueTypes';

export const genderItemsList: Array<AccountGenderCodeValueType> = [
	{
		code: 'H',
		value: 'Homme',
	},
	{
		code: 'F',
		value: 'Femme',
	},
];

export const nbrEmployeItemsList: Array<DropDownType> = [
	{ code: '1 à 5', value: '1 à 5' },
	{ code: '5 à 10', value: '5 à 10' },
	{ code: '10 à 50', value: '10 à 50' },
	{ code: '50 à 100', value: '50 à 100' },
	{ code: 'plus que 100', value: 'plus que 100' },
];

export const civiliteItemsList: Array<DropDownType> = [
	{ code: '', value: '' },
	{ code: 'M.', value: 'M.' },
	{ code: 'Mme', value: 'Mme' },
	{ code: 'Mlle', value: 'Mlle' },
];

export const passwordResetCodeFields: PasswordResetCodeField[] = ['one', 'two', 'three', 'four', 'five', 'six'];
export const PASSWORD_RESET_STORAGE_KEY = 'facturation-password-reset';
// Original cookiesPoster maxAge. Django verifies the shorter code lifetime.
export const PASSWORD_RESET_MAX_AGE_MS = 86400 * 1000;
export const globalErrorKeys = new Set(['detail', 'error', 'globalError', 'message', 'non_field_errors']);

export const SESSION_STORAGE_KEY = 'facturation-native-session';

export const MODULES_PAGE_SIZE = 10;

export const stockAdjustmentMovementItems: DropDownType[] = [
	{ value: 'adjustment', code: 'Ajustement' },
	{ value: 'opening', code: 'Stock initial' },
];

export const stockMovementOptions = [
	{ id: 'opening', nom: 'Stock initial', value: 'opening', label: 'Stock initial' },
	{ id: 'adjustment', nom: 'Ajustement', value: 'adjustment', label: 'Ajustement' },
	{ id: 'receipt', nom: 'Réception', value: 'receipt', label: 'Réception' },
	{ id: 'delivery', nom: 'Livraison', value: 'delivery', label: 'Livraison' },
	{ id: 'inventory', nom: 'Inventaire', value: 'inventory', label: 'Inventaire' },
	{ id: 'reversal', nom: 'Annulation', value: 'reversal', label: 'Annulation' },
] as const;

export const stockStateOptions = [
	{ id: 'disponible', nom: 'Disponible' },
	{ id: 'minimum', nom: 'Stock minimum' },
	{ id: 'a_approvisionner', nom: 'À approvisionner' },
] as const;

export const stockInventoryStatusOptions = [
	{ id: 'draft', nom: 'Brouillon', value: 'draft', label: 'Brouillon' },
	{ id: 'validated', nom: 'Validé', value: 'validated', label: 'Validé' },
	{ id: 'cancelled', nom: 'Annulé', value: 'cancelled', label: 'Annulé' },
] as const;

export const stockReceiptStatusOptions = [
	{ id: 'draft', nom: 'Brouillon', value: 'draft', label: 'Brouillon' },
	{ id: 'validated', nom: 'Validée', value: 'validated', label: 'Validée' },
	{ id: 'cancelled', nom: 'Annulée', value: 'cancelled', label: 'Annulée' },
] as const;
// Request the next page when the remaining distance is 30% of the visible list height.
export const INFINITE_SCROLL_THRESHOLD = 0.3;
export const EMAIL_MAX_LENGTH = 254;

export const valueLessFilterOperators = new Set(['isEmpty', 'isNotEmpty']);

export const NECTAR_RAISON_SOCIALE = 'IMMOBILIERE NECTAR';

export const pmRequired = ['raison_sociale', 'ville', 'ICE', 'delai_de_paiement'] as const;
export const ppRequired = ['nom', 'prenom', 'adresse', 'ville', 'delai_de_paiement'] as const;

// Match the web's reviewed writing fields. Identifiers and personal details stay excluded.
export const aiWritingFields = new Set([
	'designation',
	'remarque',
	'description',
	'nature_marchandise',
	'process_remark',
	'conditions_paiement_proforma',
	'notes_ecarts_proforma',
	'commentaire_paiement',
	'reject_note',
	'libelle',
	'observations',
	'termes_paiement',
	'reason',
	'note',
]);
// Bundled with the running code, never copied from the server announcement.
export const APP_VERSION = version;

export const devisFactureStatusItemsList: Array<DropDownType> = [
	{ code: '', value: '' },
	{ code: 'Brouillon', value: 'Brouillon' },
	{ code: 'Envoyé', value: 'Envoyé' },
	{ code: 'Accepté', value: 'Accepté' },
	{ code: 'Refusé', value: 'Refusé' },
	{ code: 'Annulé', value: 'Annulé' },
	{ code: 'Expiré', value: 'Expiré' },
];

export const remiseTypeItemsList: Array<DropDownType> = [
	{ code: '', value: '' },
	{ code: 'Pourcentage', value: 'Pourcentage' },
	{ code: 'Fixe', value: 'Fixe' },
];

export const bonDeLivraisonStatusItemsList: Array<DropDownType> = [
	...devisFactureStatusItemsList,
	{ code: 'Facturé', value: 'Facturé' },
];

export const logistiqueGlobalStatusItemsList: LogistiqueStatut[] = [
	'Brouillon',
	'À lancer',
	'En cours',
	'En attente externe',
	'Bloqué',
	'En retard',
	'À clôturer',
	'Clôturé',
	'Annulé',
	'Rouvert',
];
export const logistiquePaymentStatusItemsList: LogistiquePaymentStatus[] = ['Non demandé', 'En attente', 'Validé'];
export const logistiqueManagerRoles = new Set(['Caissier', 'Commercial', 'Logistique']);
export const logistiqueImportTitleStatusItemsList: LogistiqueImportTitleStatus[] = [
	'À préparer',
	"Titre d'import validé – En attente de paiement",
];
