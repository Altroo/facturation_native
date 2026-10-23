import { version } from '../../package.json';
import type { AccountGenderCodeValueType, DropDownType, PasswordResetCodeField } from '@/types/accountTypes';

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
// Request the next page when the remaining distance is 30% of the visible list height.
export const INFINITE_SCROLL_THRESHOLD = 0.3;
export const EMAIL_MAX_LENGTH = 254;

export const valueLessFilterOperators = new Set(['isEmpty', 'isNotEmpty']);

export const NECTAR_RAISON_SOCIALE = 'IMMOBILIERE NECTAR';

export const pmRequired = ['raison_sociale', 'ville', 'ICE', 'registre_de_commerce', 'delai_de_paiement'] as const;
export const ppRequired = ['nom', 'prenom', 'adresse', 'ville', 'delai_de_paiement'] as const;
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
