import z from 'zod';
import { pmRequired, ppRequired } from '@/utils/rawData';
import {
	INPUT_MAX,
	INPUT_MIN,
	INPUT_PASSWORD_MIN,
	INPUT_PHONE,
	INPUT_REQUIRED,
	INPUT_URL_INVALID,
	MINI_INPUT_EMAIL,
	SHORT_INPUT_REQUIRED,
} from '@/utils/formValidationErrorMessages';

const base64ImageField = z.url().or(z.string().startsWith('data:image/')).nullable().optional();

const passwordField = z.preprocess(
	(val) => (val === undefined ? '' : val),
	z
		.string()
		.min(8, { error: INPUT_PASSWORD_MIN(8) })
		.nonempty({ error: INPUT_REQUIRED }),
);

const optionalEmailField = z.preprocess(
	(val) => (val === undefined || val === null || val === '' ? undefined : val),
	z.email({ error: MINI_INPUT_EMAIL }).optional(),
);

const optionalUrlField = z.preprocess(
	(val) => (val === undefined || val === null || val === '' ? undefined : val),
	z.url({ error: INPUT_URL_INVALID }).optional(),
);

const optionalPhoneField = z.preprocess(
	(val) => (val === undefined || val === null || val === '' ? undefined : val),
	z
		.string()
		.regex(/^\+?\d{7,15}$/, { error: INPUT_PHONE })
		.optional(),
);

const requiredTextField = (min: number, max: number) =>
	z.preprocess(
		(val) => (val === undefined ? '' : val),
		z
			.string()
			.min(min, { error: INPUT_MIN(min) })
			.max(max, { error: INPUT_MAX(max) })
			.nonempty({ error: INPUT_REQUIRED }),
	);

const requiredChoiceTextField = () =>
	z.preprocess((val) => (val === undefined ? '' : val), z.string().nonempty({ error: INPUT_REQUIRED }));

const optionalChoiceField = () =>
	z.preprocess((val) => (val === undefined || val === null || val === '' ? undefined : val), z.string().optional());

const optionalTextField = (min: number, max: number) =>
	z.preprocess(
		(val) => (val === undefined || val === null || val === '' ? undefined : val),
		z
			.string()
			.min(min, { error: INPUT_MIN(min) })
			.max(max, { error: INPUT_MAX(max) })
			.optional(),
	);

const requiredNumberField = (min: number = 1, max?: number) =>
	z.preprocess(
		(val) => (val === undefined || val === null ? NaN : Number(val)),
		z
			.number({ error: INPUT_REQUIRED })
			.refine((val) => !Number.isNaN(val), { error: INPUT_REQUIRED })
			.min(min, { error: INPUT_MIN(min) })
			.max(max ?? Number.MAX_SAFE_INTEGER, { error: INPUT_MAX(max ?? Number.MAX_SAFE_INTEGER) }),
	);

const optionalNumberField = (min: number = 1, max?: number) =>
	z.preprocess(
		(val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
		z
			.number()
			.min(min, { error: INPUT_MIN(min) })
			.max(max ?? Number.MAX_SAFE_INTEGER)
			.optional(),
	);

export const clientSchema = z
	.object({
		client_type: z.enum(['PM', 'PP', 'CD']),
		code_client: requiredTextField(1, 100),
		company: requiredNumberField(1),
		raison_sociale: optionalTextField(2, 255).nullable(),
		nom: optionalTextField(2, 255).nullable(),
		prenom: optionalTextField(2, 255).nullable(),
		adresse: optionalTextField(2, 255).nullable(),
		ville: optionalNumberField(1).nullable(),
		tel: optionalPhoneField.nullable(),
		email: optionalEmailField,
		delai_de_paiement: optionalNumberField(0).nullable(),
		remarque: optionalTextField(2, 2000).nullable(),
		numero_du_compte: optionalTextField(2, 100).nullable(),
		ICE: optionalTextField(2, 100).nullable(),
		registre_de_commerce: optionalTextField(2, 100).nullable(),
		identifiant_fiscal: optionalTextField(2, 100).nullable(),
		taxe_professionnelle: optionalTextField(2, 100).nullable(),
		CNSS: optionalTextField(2, 100).nullable(),
		globalError: optionalTextField(1, 500),
	})
	.superRefine((data, ctx) => {
		const required = data.client_type === 'PM' ? pmRequired : data.client_type === 'PP' ? ppRequired : [];
		for (const field of required) {
			const value = data[field];
			if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
				ctx.addIssue({ path: [field], code: 'custom', message: INPUT_REQUIRED });
			}
		}
	});

// Formik normalizes an empty native code field to undefined before validation.
// Restore the empty string so the original required message remains visible.
const singleDigit = z.preprocess(
	(value) => (value === undefined ? '' : value),
	z
		.string()
		.min(1, { error: SHORT_INPUT_REQUIRED })
		.regex(/^\d$/, { error: SHORT_INPUT_REQUIRED })
		.transform((val) => Number(val)),
);

export const loginSchema = z.object({
	email: z.email({ error: MINI_INPUT_EMAIL }),
	password: passwordField,
	globalError: optionalTextField(1, 500),
});

export const emailSchema = z.object({
	email: z.email({ error: MINI_INPUT_EMAIL }),
	globalError: optionalTextField(1, 500),
});

export const passwordResetConfirmationSchema = z.object({
	new_password: passwordField,
	new_password2: passwordField,
	globalError: optionalTextField(1, 500),
});

export const passwordResetCodeSchema = z.object({
	one: singleDigit,
	two: singleDigit,
	three: singleDigit,
	four: singleDigit,
	five: singleDigit,
	six: singleDigit,
	globalError: optionalTextField(1, 500),
});

export const profilSchema = z.object({
	first_name: requiredTextField(2, 30),
	last_name: requiredTextField(2, 30),
	gender: optionalChoiceField(),
	avatar: base64ImageField,
	avatar_cropped: base64ImageField,
});

export const changePasswordSchema = z.object({
	old_password: passwordField,
	new_password: passwordField,
	new_password2: passwordField,
});

export const companySchema = z.object({
	// REQUIRED FIELDS
	raison_sociale: requiredTextField(2, 255),
	ICE: requiredTextField(2, 100),
	nbr_employe: requiredChoiceTextField(),

	// OPTIONAL FIELDS
	email: optionalEmailField,
	civilite_responsable: optionalChoiceField(),
	nom_responsable: optionalTextField(2, 255),
	gsm_responsable: optionalPhoneField,
	adresse: optionalTextField(2, 255),
	telephone: optionalPhoneField,
	fax: optionalPhoneField,
	site_web: optionalUrlField,
	numero_du_compte: optionalTextField(2, 100),
	registre_de_commerce: optionalTextField(2, 100),
	identifiant_fiscal: optionalTextField(2, 100),
	tax_professionnelle: optionalTextField(2, 100),
	CNSS: optionalTextField(2, 100),
	managed_by: z
		.array(
			z.object({
				pk: requiredNumberField(1),
				role: requiredTextField(1, 50),
				can_validate_factures: z.boolean().optional(),
			}),
		)
		.optional(),
	logo: base64ImageField,
	logo_cropped: base64ImageField,
	cachet: base64ImageField,
	cachet_cropped: base64ImageField,
	uses_foreign_currency: z.boolean().default(false),
	stock_management_enabled: z.boolean().default(false),
	inventory_management_enabled: z.boolean().default(false),
	globalError: optionalTextField(1, 500),
});

export const userSchema = z.object({
	// REQUIRED FIELDS
	first_name: requiredTextField(2, 255),
	last_name: requiredTextField(2, 255),
	email: z.email({ error: MINI_INPUT_EMAIL }),
	gender: requiredChoiceTextField(),
	is_active: z.boolean(),
	is_staff: z.boolean(),
	// OPTIONAL FIELDS
	companies: z
		.array(
			z.object({
				membership_id: z.number(),
				company_id: z.number(),
				raison_sociale: z.string(),
				role: z.string(),
				can_validate_factures: z.boolean().optional(),
			}),
		)
		.optional(),
	avatar: base64ImageField,
	avatar_cropped: base64ImageField,
	globalError: optionalTextField(1, 500),
});

export const tokenSchema = z.object({
	access: z.string().min(1),
	refresh: z.string().min(1),
	access_expiration: z.string().refine((v) => Number.isFinite(Date.parse(v))),
	refresh_expiration: z.string().refine((v) => Number.isFinite(Date.parse(v))),
});
export const passwordResetStorageSchema = z.object({
	email: z.email(),
	code: z.string().regex(/^(\d{6})?$/),
	expiresAt: z.number(),
});
