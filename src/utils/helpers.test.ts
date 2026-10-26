import type { DeviFactureLineFormValues } from '@/types/devisTypes';
import { translations } from '@/translations';
import { reloadAppAsync } from 'expo';
import { APP_VERSION, NECTAR_RAISON_SOCIALE, remiseTypeItemsList } from '@/utils/rawData';
import {
	COMPANIES_VIEW,
	COMPANIES_EDIT,
	USERS_VIEW,
	USERS_EDIT,
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_PASSWORD,
	DASHBOARD,
	COMPANIES_LIST,
	COMPANIES_ADD,
	USERS_LIST,
	USERS_ADD,
	DASHBOARD_NOTIFICATIONS,
} from '@/utils/routes';

jest.mock('expo', () => ({
	...jest.requireActual<typeof import('expo')>('expo'),
	reloadAppAsync: jest.fn(),
}));

import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import {
	calculateDocumentTotals,
	getStatutLabel,
	getRemiseTypeItemsList,
	isAiTextField,
	calculateSalePriceHT,
	calculateSalePriceTTC,
	runWithCleanup,
	runWithErrorHandler,
	parseEntityId,
	isAppVersion,
	isNewerAppVersion,
	normalizeCompanyName,
	isNectarRaisonSociale,
	reloadApp,
	allowAnyInstance,
	isAuthenticatedInstance,
	normalizeApiError,
	setFormikAutoErrors,
	hexToRGB,
	formatDate,
	formatNumber,
	formatNumberWithSpaces,
	parseFormattedNumber,
	parseNumber,
	safeParseForInput,
	ValidatePricesHelper,
	getLabelForKey,
	getCompanyDocumentLabelForKey,
	getDjangoNextPageParam,
	getNotificationDestination,
} from '@/utils/helpers';
import { auth, publicInstance, InvalidSessionError } from '@/auth';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	const { createAuth } = jest.requireActual<typeof import('@/auth')>('@/auth');
	const publicInstance = create({ timeout: 15000, withCredentials: true });
	const tokens = {
		access: 'access-1',
		refresh: 'refresh-1',
		access_expiration: '2030-01-01T00:00:00Z',
		refresh_expiration: '2031-01-01T00:00:00Z',
	};
	const storage = { read: async () => tokens, write: async () => {} };
	return {
		...jest.requireActual<typeof import('@/auth')>('@/auth'),
		publicInstance,
		auth: createAuth(publicInstance, storage),
	};
});
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	headers: {},
	statusText: 'test',
});
const rejected = (config: InternalAxiosRequestConfig, status: number, data: unknown = {}) =>
	new AxiosError('Rejected', 'ERR_BAD_REQUEST', config, undefined, response(config, data, status));
const privateAdapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const publicAdapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const rotated = {
	access: 'access-2',
	refresh: 'refresh-2',
	access_expiration: '2030-01-01T00:00:00Z',
	refresh_expiration: '2031-01-01T00:00:00Z',
};
const onExpired = jest.fn();
let unsubscribe = () => {};
afterEach(() => unsubscribe());
beforeEach(async () => {
	await auth.clear();
	await auth.restore();
	privateAdapter.mockReset();
	publicAdapter.mockReset();
	auth.instance.defaults.adapter = privateAdapter;
	publicInstance.defaults.adapter = publicAdapter;
	publicAdapter.mockImplementation(async (config) => response(config, rotated));
	privateAdapter.mockImplementation(async (config) => response(config, { id: 7 }));
	onExpired.mockClear();
	unsubscribe = auth.subscribeExpired(onExpired);
});

it('maps the Django exception envelope into a message and form field errors', () => {
	const error = new AxiosError('Bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
		status: 400,
		statusText: 'Bad Request',
		headers: {},
		config: { headers: new AxiosHeaders() },
		data: {
			message: 'Validation failed',
			details: { email: ['Invalid email.'], non_field_errors: ['Check this account.'] },
		},
	});
	expect(normalizeApiError(error)).toEqual({
		status_code: 400,
		message: 'Validation failed',
		details: { email: ['Invalid email.'], non_field_errors: ['Check this account.'] },
	});
});
it('keeps a transport failure distinct from a server permission response', () => {
	expect(normalizeApiError(new AxiosError('Network unavailable', 'ERR_NETWORK')).status_code).toBe(0);
	const denied = { status_code: 403, message: 'Forbidden', details: {} };
	expect(normalizeApiError(denied)).toEqual(denied);
});
it.each(['direct', 'legacy', 'rtk'] as const)('keeps original %s validation-envelope field mapping', (kind) => {
	const data = { status_code: 400, message: 'Invalid', details: { email: ['Already used'], error: ['Cannot save'] } };
	const e = kind === 'direct' ? data : kind === 'legacy' ? { error: data } : { status: 400, data };
	const setFieldError = jest.fn();
	setFormikAutoErrors({ e, setFieldError });
	expect(setFieldError.mock.calls).toEqual([
		['email', 'Already used'],
		['globalError', 'Cannot save'],
	]);
});
it.each([null, undefined])('ignores an absent API error (%p) without breaking the form error handler', (e) => {
	const setFieldError = jest.fn();
	expect(() => setFormikAutoErrors({ e, setFieldError })).not.toThrow();
	expect(setFieldError).not.toHaveBeenCalled();
});
it('preserves original combined-number and ordinary-array error precedence', () => {
	const setFieldError = jest.fn();
	setFormikAutoErrors({
		e: { details: { numero_facture: ['First', 'Second'], email: ['First', 'Second'] } },
		setFieldError,
	});
	expect(setFieldError.mock.calls).toEqual([
		['numero_part', 'First'],
		['year_part', 'First'],
		['email', 'First'],
		['email', 'Second'],
	]);
});
it.each([allowAnyInstance, isAuthenticatedInstance])('preserves structured API rejection from %s', async (factory) => {
	const data = { status_code: 400, message: 'Invalid', details: { email: ['Already used'] } };
	privateAdapter.mockImplementation(async (config) => {
		throw rejected(config, 400, data);
	});
	publicAdapter.mockImplementation(async (config) => {
		throw rejected(config, 400, data);
	});
	await expect(factory().post('/example', {})).rejects.toEqual({ error: data });
});
it.each([allowAnyInstance, isAuthenticatedInstance])(
	'preserves content-type and encodes a form exactly once through %s',
	async (factory) => {
		publicAdapter.mockImplementation(async (config) => response(config, '{"saved":true}'));
		privateAdapter.mockImplementation(async (config) => response(config, '{"saved":true}'));
		const api = factory('application/x-www-form-urlencoded');
		const result = await api.post('/example', { email: 'a+b@example.invalid', active: false });
		const config = (factory === allowAnyInstance ? publicAdapter : privateAdapter).mock.calls[0][0];
		expect(config.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
		expect(config.data).toBe('email=a%2Bb%40example.invalid&active=false');
		expect(result.data).toEqual({ saved: true });
		expect(config.withCredentials).toBe(true);
		expect(config.timeout).toBe(15000);
	},
);
it('preserves an explicit JSON string response instead of parsing it twice', async () => {
	privateAdapter.mockImplementation(async (config) => response(config, '"123"'));
	await expect(isAuthenticatedInstance().get('/example')).resolves.toMatchObject({ data: '123' });
});
it('forwards FormData without JSON serialization and supports per-request cancellation', async () => {
	const form = new FormData();
	form.append('name', 'Example');
	await isAuthenticatedInstance('multipart/form-data').post('/upload', form);
	expect(privateAdapter.mock.calls[0][0].data).toBe(form);
	const controller = new AbortController();
	controller.abort();
	await expect(isAuthenticatedInstance().get('/cancelled', { signal: controller.signal })).rejects.toMatchObject({
		code: 'ERR_CANCELED',
	});
	expect(privateAdapter).toHaveBeenCalledTimes(1);
});
it('refreshes before outward error mapping and does not call unauthorized on a successful retry', async () => {
	const onUnauthorized = jest.fn();
	privateAdapter.mockImplementation(async (config) => {
		if (config.headers.get('Authorization') === 'Bearer access-1') throw rejected(config, 401);
		return response(config, { id: 7 });
	});
	await expect(isAuthenticatedInstance('application/json', onUnauthorized).get('/example')).resolves.toMatchObject({
		data: { id: 7 },
	});
	expect(publicAdapter).toHaveBeenCalledTimes(1);
	expect(privateAdapter).toHaveBeenCalledTimes(2);
	expect(onUnauthorized).not.toHaveBeenCalled();
	expect(auth.getSession()?.refresh).toBe('refresh-2');
});
it('preserves terminal InvalidSessionError identity and calls the unauthorized callback once', async () => {
	const onUnauthorized = jest.fn();
	privateAdapter.mockImplementation(async (config) => {
		throw rejected(config, 401);
	});
	publicAdapter.mockImplementation(async (config) => {
		throw rejected(config, 401);
	});
	await expect(isAuthenticatedInstance('application/json', onUnauthorized).get('/example')).rejects.toBeInstanceOf(
		InvalidSessionError,
	);
	expect(onUnauthorized).toHaveBeenCalledTimes(1);
	expect(onExpired).toHaveBeenCalledTimes(1);
});
it('keeps raw transport errors available to refresh while normalizing outward network/server failures', async () => {
	privateAdapter.mockRejectedValue(new AxiosError('Offline', 'ERR_NETWORK'));
	await expect(auth.instance.get('/raw')).rejects.toBeInstanceOf(AxiosError);
	await expect(isAuthenticatedInstance().get('/outward')).rejects.toMatchObject({
		error: { status_code: 0, message: 'Offline' },
	});
	privateAdapter.mockImplementation(async (config) => {
		throw rejected(config, 503, { message: 'Unavailable' });
	});
	await expect(isAuthenticatedInstance().get('/server')).rejects.toMatchObject({
		error: { status_code: 503, message: 'Erreur serveur.' },
	});
});

it('preserves structured assistant failures like the web instead of masking them as network outages', async () => {
	const data = {
		status_code: 503,
		error: { code: 'ai_assistant_disabled' },
		message: "L'assistant IA n'est pas disponible.",
		details: {},
	};
	privateAdapter.mockImplementation(async (config) => {
		throw rejected(config, 503, data);
	});
	await expect(isAuthenticatedInstance().post('/ai/assist/', {})).rejects.toEqual({
		error: { status_code: 503, code: 'ai_assistant_disabled', message: data.message, details: {} },
	});
});
it('keeps a new login independent of an old outward request waiting for refresh', async () => {
	let finish!: (value: AxiosResponse) => void;
	publicAdapter.mockImplementationOnce(
		(config) =>
			new Promise((resolve) => {
				finish = (value) => resolve({ ...value, config });
			}),
	);
	privateAdapter.mockImplementation(async (config) => {
		if (config.headers.get('Authorization') === 'Bearer access-1') throw rejected(config, 401);
		return response(config, { id: 7 });
	});
	const oldInstance = isAuthenticatedInstance();
	const pending = oldInstance.get('/old');
	const oldRejected = expect(pending).rejects.toThrow('Session changed');
	while (!finish) await Promise.resolve();
	await auth.clear();
	await auth.signIn({ email: 'new@example.invalid', password: 'example-pass' });
	auth.instance.defaults.adapter = privateAdapter;
	await expect(isAuthenticatedInstance().get('/new')).resolves.toMatchObject({ data: { id: 7 } });
	finish(response({ headers: new AxiosHeaders() }, rotated));
	await oldRejected;
	await expect(oldInstance.get('/too-late')).rejects.toThrow('Session changed');
	expect(privateAdapter.mock.calls.some(([config]) => config.url === '/too-late')).toBe(false);
	expect(auth.getSession()?.access).toBe('access-2');
});

it('keeps a backend permission explanation visible in the original form global-error contract', async () => {
	privateAdapter.mockImplementation(async (config) => {
		throw rejected(config, 403, { detail: 'You cannot edit this company.' });
	});
	const setFieldError = jest.fn();
	try {
		await isAuthenticatedInstance().patch('/company/7/', {});
	} catch (e) {
		setFormikAutoErrors({ e, setFieldError });
	}
	expect(setFieldError).toHaveBeenCalledWith('globalError', 'You cannot edit this company.');
});

it.each([
	['https://example.invalid/api/company/?page=2&search=demo', 1, 2],
	['/api/account/users/?page=3', 2, 3],
	['?page=4', 3, 4],
	[null, 1, undefined],
	['?search=demo', 1, undefined],
	['?page=0', 1, undefined],
	['?page=1', 1, undefined],
	['?page=-2', 1, undefined],
	['?page=2.5', 1, undefined],
	['?page=9007199254740993', 1, undefined],
	['http://[', 1, undefined],
] as const)('extracts only a valid forward page from %s', (next, current, expected) => {
	expect(getDjangoNextPageParam(next, current)).toBe(expected);
});

describe('API Utilities', () => {
	describe('hexToRGB', () => {
		it('converts hex to rgb', () => {
			expect(hexToRGB('#ff0000')).toBe('rgb(255, 0, 0)');
		});

		it('converts hex to rgba with alpha', () => {
			expect(hexToRGB('#00ff00', 0.5)).toBe('rgba(0, 255, 0, 0.5)');
		});
	});

	describe('formatDate', () => {
		it('formats valid date string', () => {
			expect(formatDate('2025-11-20T16:03:00')).toMatch(/20 nov\. 2025/);
		});

		it.each(['15/10/2026', '08/09/2026', '29/02/2024'])(
			'preserves the Django company-detail date %s without reversing its day and month',
			(value) => expect(formatDate(value)).toBe(value),
		);

		it.each(['31/02/2026', '29/02/2025', '00/09/2026', '15/13/2026'])(
			'returns the placeholder for impossible backend date %s',
			(value) => expect(formatDate(value)).toBe('-'),
		);

		it('returns placeholder for null', () => {
			expect(formatDate(null)).toBe('-');
		});

		it('returns placeholder for invalid date', () => {
			expect(formatDate('invalid')).toBe('-');
		});
	});

	describe('price formatting', () => {
		it.each([
			[0, '0,00'],
			[999.5, '999,50'],
			[1000, '1\u00a0000,00'],
			[1149560, '1\u00a0149\u00a0560,00'],
			['2540390.00', '2\u00a0540\u00a0390,00'],
			[1000000000, '1\u00a0000\u00a0000\u00a0000,00'],
			[-1149560.5, '-1\u00a0149\u00a0560,50'],
		])('shows every three-digit group with readable nonbreaking spaces for %s', (value, expected) => {
			expect(formatNumberWithSpaces(value)).toBe(expected);
			expect(formatNumber(value)).toBe(expected);
		});

		it('preserves the requested precision for existing non-price callers', () => {
			expect(formatNumberWithSpaces(1234.125, 3)).toBe('1\u00a0234,125');
		});

		it.each([null, undefined, '', 'invalid'])('preserves empty-value fallbacks for %s', (value) => {
			expect(formatNumberWithSpaces(value)).toBe('');
			expect(formatNumber(value)).toBe('0,00');
		});
	});

	describe('parseFormattedNumber', () => {
		it.each([
			['300 000 000,25', 300000000.25],
			['1\u00a0234,125', 1234.125],
			['1\u202f234.50', 1234.5],
			['-1 234,5', -1234.5],
			[0, 0],
			['', null],
			['12,', null],
			['12.', null],
			['invalid', null],
			[Infinity, null],
		])('parses grouped input %p as %p', (value, expected) => {
			expect(parseFormattedNumber(value as string | number)).toBe(expected);
		});
	});

	describe('parseNumber', () => {
		it('parses numeric strings and numbers', () => {
			expect(parseNumber('123')).toBe(123);
			expect(parseNumber(' 12.3 ')).toBe(12.3);
			expect(parseNumber(45)).toBe(45);
		});

		it('returns null for non-finite or invalid values', () => {
			expect(parseNumber('')).toBeNull();
			expect(parseNumber('abc')).toBeNull();
			expect(parseNumber(NaN as unknown as string)).toBeNull();
		});
	});

	describe('safeParseForInput', () => {
		it('returns number when parseable, otherwise raw string', () => {
			expect(safeParseForInput('12')).toBe(12);
			expect(safeParseForInput('')).toBe('');
			expect(safeParseForInput('not-a-number')).toBe('not-a-number');
		});
	});

	describe('setFormikAutoErrors', () => {
		it('maps error fields to Formik', () => {
			const mockSetFieldError = jest.fn();
			const errorPayload = {
				error: {
					status_code: 400,
					message: 'Invalid',
					details: {
						email: ['Invalid email'],
						error: ['Something went wrong'],
					},
				},
			};

			setFormikAutoErrors({ e: errorPayload, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).toHaveBeenCalledWith('email', 'Invalid email');
			expect(mockSetFieldError).toHaveBeenCalledWith('globalError', 'Something went wrong');
		});

		it('maps numero_devis to numero_part and year_part', () => {
			const mockSetFieldError = jest.fn();
			const errorPayload = {
				error: {
					status_code: 400,
					message: 'Invalid',
					details: {
						numero_devis: ['Numéro de devis invalide'],
					},
				},
			};

			setFormikAutoErrors({ e: errorPayload, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).toHaveBeenCalledWith('numero_part', 'Numéro de devis invalide');
			expect(mockSetFieldError).toHaveBeenCalledWith('year_part', 'Numéro de devis invalide');
		});

		it('maps numero_facture to numero_part and year_part', () => {
			const mockSetFieldError = jest.fn();
			const errorPayload = {
				error: {
					status_code: 400,
					message: 'Invalid',
					details: {
						numero_facture: ['Numéro de facture invalide'],
					},
				},
			};

			setFormikAutoErrors({ e: errorPayload, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).toHaveBeenCalledWith('numero_part', 'Numéro de facture invalide');
			expect(mockSetFieldError).toHaveBeenCalledWith('year_part', 'Numéro de facture invalide');
		});

		it('maps detail field to globalError', () => {
			const mockSetFieldError = jest.fn();
			const errorPayload = {
				error: {
					status_code: 400,
					message: 'Invalid',
					details: {
						detail: ['Une erreur est survenue'],
					},
				},
			};

			setFormikAutoErrors({ e: errorPayload, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).toHaveBeenCalledWith('globalError', 'Une erreur est survenue');
		});

		it('reads payload from data property when error is not present', () => {
			const mockSetFieldError = jest.fn();
			const errorPayload = {
				data: {
					status_code: 400,
					message: 'Invalid',
					details: {
						name: ['Le nom est requis'],
					},
				},
			};

			setFormikAutoErrors({ e: errorPayload, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).toHaveBeenCalledWith('name', 'Le nom est requis');
		});

		it('reads payload directly when no error or data wrapper', () => {
			const mockSetFieldError = jest.fn();
			const errorPayload = {
				status_code: 400,
				message: 'Invalid',
				details: {
					field: ['Error message'],
				},
			};

			setFormikAutoErrors({ e: errorPayload, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).toHaveBeenCalledWith('field', 'Error message');
		});

		it('handles non-array error messages', () => {
			const mockSetFieldError = jest.fn();
			const errorPayload = {
				error: {
					status_code: 400,
					message: 'Invalid',
					details: {
						field: 'Single error message',
					},
				},
			};

			setFormikAutoErrors({ e: errorPayload, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).toHaveBeenCalledWith('field', 'Single error message');
		});

		it('does nothing when details is undefined', () => {
			const mockSetFieldError = jest.fn();
			const errorPayload = {
				error: {
					status_code: 400,
					message: 'Invalid',
				},
			};

			setFormikAutoErrors({ e: errorPayload, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).not.toHaveBeenCalled();
		});

		it('does nothing when payload is empty', () => {
			const mockSetFieldError = jest.fn();

			setFormikAutoErrors({ e: {}, setFieldError: mockSetFieldError });

			expect(mockSetFieldError).not.toHaveBeenCalled();
		});
	});

	describe('ValidatePricesHelper', () => {
		describe('validatePrixVente', () => {
			it('returns error when prixVente < prixAchat', () => {
				const msg = ValidatePricesHelper.validatePrixVente(50, 100);
				expect(msg).toBe("Le prix de vente (50,00 MAD) doit être supérieur ou égal au prix d'achat (100,00 MAD)");
			});

			it('returns null when prixVente >= prixAchat', () => {
				expect(ValidatePricesHelper.validatePrixVente(100, 50)).toBeNull();
				expect(ValidatePricesHelper.validatePrixVente(100, 100)).toBeNull();
			});
		});

		describe('validateRemise', () => {
			it('rejects negative remise', () => {
				expect(ValidatePricesHelper.validateRemise(-1, '', 100)).toBe('La remise doit être positive ou nulle');
			});

			it('rejects percentage > 100', () => {
				expect(ValidatePricesHelper.validateRemise(150, 'Pourcentage', 100)).toBe(
					'La remise en pourcentage doit être entre 0 et 100',
				);
			});

			it('rejects fixed remise larger than base amount', () => {
				const msg = ValidatePricesHelper.validateRemise(200, 'Fixe', 150);
				expect(msg).toBe('La remise fixe (200,00 MAD) ne peut pas dépasser le total (150,00 MAD)');
			});

			it('accepts valid remise values', () => {
				expect(ValidatePricesHelper.validateRemise(10, 'Pourcentage', 100)).toBeNull();
				expect(ValidatePricesHelper.validateRemise(50, 'Fixe', 100)).toBeNull();
				expect(ValidatePricesHelper.validateRemise(0, '', 100)).toBeNull();
			});
		});

		describe('validateGlobalRemise', () => {
			it('rejects negative global remise', () => {
				expect(ValidatePricesHelper.validateGlobalRemise(-5, '', 1000)).toBe('La remise doit être positive ou nulle');
			});

			it('rejects percentage >100', () => {
				expect(ValidatePricesHelper.validateGlobalRemise(150, 'Pourcentage', 1000)).toBe(
					'La remise en pourcentage doit être entre 0 et 100',
				);
			});

			it('rejects fixed global remise larger than totalHTBeforeGlobal', () => {
				expect(ValidatePricesHelper.validateGlobalRemise(1100, 'Fixe', 1000)).toBe(
					'La remise fixe globale (1\u00a0100,00 MAD) ne peut pas dépasser le total HT du devis (1\u00a0000,00 MAD)',
				);
			});

			it('accepts valid global remise values', () => {
				expect(ValidatePricesHelper.validateGlobalRemise(10, 'Pourcentage', 1000)).toBeNull();
				expect(ValidatePricesHelper.validateGlobalRemise(100, 'Fixe', 1000)).toBeNull();
			});
		});
	});

	describe('allowAnyInstance', () => {
		it('handles structured error response', async () => {
			const instance = allowAnyInstance();

			// Mock the adapter on THIS instance (no global axios mocking to avoid recursion)
			instance.defaults.adapter = jest.fn(() =>
				Promise.reject({
					response: {
						status: 400,
						data: {
							status_code: 400,
							message: 'Bad Request',
							details: { field: ['Invalid'] },
						},
					},
				}),
			);

			await expect(instance.get('/test')).rejects.toMatchObject({
				error: {
					status_code: 400,
					message: 'Bad Request',
					details: { field: ['Invalid'] },
				},
			});
		});

		it('handles network error fallback', async () => {
			const instance = allowAnyInstance();

			instance.defaults.adapter = jest.fn(() => Promise.reject(new Error('Erreur réseau')));

			await expect(instance.get('/test')).rejects.toMatchObject({
				error: {
					status_code: 0,
					message: 'Erreur réseau',
					details: { error: ['Impossible de se connecter au serveur'] },
				},
			});
		});
	});
});

describe('Label helpers', () => {
	describe('getLabelForKey', () => {
		it('returns mapped label when present', () => {
			const labels = { name: 'Nom', email_address: 'Adresse e-mail' };
			expect(getLabelForKey(labels, 'name')).toBe('Nom');
			expect(getLabelForKey(labels, 'email_address')).toBe('Adresse e-mail');
		});

		it('formats key when label missing', () => {
			const labels: Record<string, string> = {};
			expect(getLabelForKey(labels, 'missing_key')).toBe('Missing Key');
			expect(getLabelForKey(labels, 'another_field_here')).toBe('Another Field Here');
		});
	});

	describe('getCompanyDocumentLabelForKey', () => {
		it('formats line keys using field label when present', () => {
			const labels = { prix_vente: 'Prix de vente' };
			expect(getCompanyDocumentLabelForKey(labels, 'ligne_0_prix_vente')).toBe('Ligne 1 - Prix de vente');
		});

		it('formats line keys using fallback when label missing', () => {
			const labels: Record<string, string> = {};
			expect(getCompanyDocumentLabelForKey(labels, 'ligne_2_custom_field')).toBe('Ligne 3 - Custom Field');
		});

		it('returns known key label when present', () => {
			const labels = { global_remise: 'Remise globale' };
			expect(getCompanyDocumentLabelForKey(labels, 'global_remise')).toBe('Remise globale');
		});
	});
});

it('delegates an explicit reload to Expo', async () => {
	jest.mocked(reloadAppAsync).mockClear();
	await reloadApp();
	expect(reloadAppAsync).toHaveBeenCalledTimes(1);
});

describe('async handler cleanup', () => {
	it('returns the action result and runs cleanup afterward', async () => {
		const calls: string[] = [];
		const result = await runWithCleanup(
			async () => {
				calls.push('action');
				return 42;
			},
			() => calls.push('cleanup'),
		);

		expect(result).toBe(42);
		expect(calls).toEqual(['action', 'cleanup']);
	});

	it('runs cleanup and preserves a rejected action error', async () => {
		const error = new Error('request failed');
		const cleanup = jest.fn();

		await expect(runWithCleanup(async () => Promise.reject(error), cleanup)).rejects.toBe(error);
		expect(cleanup).toHaveBeenCalledTimes(1);
	});

	it('passes a rejected action error to its handler', async () => {
		const error = new Error('request failed');
		const onError = jest.fn();

		await runWithErrorHandler(async () => Promise.reject(error), onError);
		expect(onError).toHaveBeenCalledWith(error);
	});
});

it.each([
	[COMPANIES_VIEW, '/companies/[id]'],
	[COMPANIES_EDIT, '/companies/form'],
	[USERS_VIEW, '/users/[id]'],
	[USERS_EDIT, '/users/form'],
] as const)('keeps %s as a typed route with a separate string id parameter', (route, pathname) => {
	expect(route(17)).toEqual({ pathname, params: { id: '17' } });
	expect(parseEntityId(route(17).params.id)).toBe(17);
	expect(parseEntityId(route(Number.MAX_SAFE_INTEGER).params.id)).toBe(Number.MAX_SAFE_INTEGER);
});

it.each([
	'https://example.invalid/7',
	'../7',
	'7/../8',
	'7?is_staff=true',
	'7#edit',
	'1e3',
	'0x10',
	'+7',
	' 7 ',
	'７',
	'NaN',
	'Infinity',
])('rejects route input %s instead of interpreting it as an entity id', (value) => {
	expect(parseEntityId(value)).toBeNull();
});

it.each([NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
	'does not accept invalid numeric ids after a route round trip: %s',
	(id) => {
		expect(parseEntityId(USERS_VIEW(id).params.id)).toBeNull();
		expect(parseEntityId(COMPANIES_EDIT(id).params.id)).toBeNull();
	},
);

describe('entity id parameters', () => {
	it.each([undefined, ['7'], '0', '-1', '7x', '1.5', '01', '9007199254740993'])(
		'rejects malformed route id %s',
		(id) => {
			expect(parseEntityId(id)).toBeNull();
		},
	);
	it('accepts a valid entity id', () => expect(parseEntityId('17')).toBe(17));
});

it.each(['0.0.0', '1.2.3', '2026.10.6'])('accepts %s', (value) => expect(isAppVersion(value)).toBe(true));
it.each([null, undefined, 1, '', '1', '1.0', '01.0.0', '1.0.0-beta', '1.0.0\n', '1000000.0.0'])(
	'rejects %s',
	(value) => {
		expect(isAppVersion(value)).toBe(false);
		expect(isNewerAppVersion(value, APP_VERSION)).toBe(false);
	},
);
it.each([
	['1.10.0', '1.9.9', true],
	['1.2.1', '1.2.0', true],
	['2.0.0', '1.99.9', true],
	['1.2.0', '1.2.0', false],
	['1.2.0', '1.10.0', false],
	['1.0.0', 'invalid', false],
])('compares %s with %s numerically', (candidate, current, expected) => {
	expect(isNewerAppVersion(candidate, current)).toBe(expected);
});

it('normalizes company names before matching Nectar', () => {
	expect(normalizeCompanyName('  Immobiliere Nectar ')).toBe(NECTAR_RAISON_SOCIALE);
	expect(normalizeCompanyName(null)).toBe('');
	expect(normalizeCompanyName(undefined)).toBe('');
	expect(isNectarRaisonSociale(' immobiliere nectar ')).toBe(true);
	expect(isNectarRaisonSociale('Another company')).toBe(false);
});

it('maps credit-note notifications to implemented screens and requires a valid company', () => {
	expect(getNotificationDestination('/dashboard/facture-avoir')).toBe('/facture-avoir');
	expect(getNotificationDestination('/dashboard/facture-avoir/new?company_id=5')).toEqual({
		pathname: '/facture-avoir/form',
		params: { company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-avoir/7?company_id=5')).toEqual({
		pathname: '/facture-avoir/[id]',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-avoir/7/edit?company_id=5')).toEqual({
		pathname: '/facture-avoir/form',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-avoir/7')).toBe('/facture-avoir');
	expect(getNotificationDestination('/dashboard/facture-avoir/7?company_id=-1')).toBe('/facture-avoir');
	expect(getNotificationDestination('/dashboard/facture-avoir/0?company_id=5')).toBeNull();
});

it('converts article entry prices with consistent cent rounding', () => {
	expect(calculateSalePriceHT(120, 20, 'TTC')).toBe(100);
	expect(calculateSalePriceHT(100, 20, 'HT')).toBe(100);
	expect(calculateSalePriceTTC(100, 20)).toBe(120);
	expect(calculateSalePriceHT(1.01, 20, 'TTC')).toBe(0.84);
	expect(calculateSalePriceTTC(0.84, 20)).toBe(1.01);
});

it.each([
	['/dashboard', DASHBOARD],
	['/dashboard/?source=notification', DASHBOARD],
	['/dashboard/companies', COMPANIES_LIST],
	['/dashboard/companies/new', COMPANIES_ADD],
	['/dashboard/users', USERS_LIST],
	['/dashboard/users/new', USERS_ADD],
	['/dashboard/companies/7', COMPANIES_VIEW(7)],
	['/dashboard/companies/7/edit?company_id=2', COMPANIES_EDIT(7)],
	['/dashboard/users/8/', USERS_VIEW(8)],
	['/dashboard/users/8/edit', USERS_EDIT(8)],
	['/dashboard/settings/edit-profile', DASHBOARD_EDIT_PROFILE],
	['/dashboard/settings/password', DASHBOARD_PASSWORD],
	['/dashboard/settings/notifications', DASHBOARD_NOTIFICATIONS],
])('maps the implemented original destination %s', (target, expected) => {
	expect(getNotificationDestination(target as string)).toEqual(expected);
});
it.each([
	undefined,
	'',
	'https://example.invalid/dashboard/users/1',
	'//example.invalid/dashboard/users/1',
	'/dashboard/stock',
	'/dashboard/users/0',
	'/dashboard/users/01',
	'/dashboard/users/1.5',
	'/dashboard/users/9007199254740993',
	'/dashboard/users/4/delete',
])('does not invent a destination for %s', (target) => {
	expect(getNotificationDestination(target)).toBeNull();
});

it.each([
	['/dashboard/articles', '/articles'],
	['/dashboard/articles/archived', '/articles/archived'],
	['/dashboard/articles/new?company_id=5', { pathname: '/articles/form', params: { company_id: '5' } }],
	['/dashboard/articles/7?company_id=5', { pathname: '/articles/[id]', params: { id: '7', company_id: '5' } }],
	['/dashboard/articles/7/edit?company_id=5', { pathname: '/articles/form', params: { id: '7', company_id: '5' } }],
	['/dashboard/articles/7', '/articles'],
	['/dashboard/articles/7?company_id=bad', '/articles'],
])('maps the implemented Articles notification target %s', (url, expected) => {
	expect(getNotificationDestination(url as string)).toEqual(expected);
});

describe('document totals', () => {
	const line: DeviFactureLineFormValues = {
		article: 4,
		prix_achat: 30,
		devise_prix_achat: 'MAD',
		prix_vente: 100,
		devise_prix_vente: 'MAD',
		quantity: 2,
		designation: 'Desk',
		remise_type: 'Pourcentage',
		remise: 10,
	};
	it('applies line discounts and prorates a global discount across mixed VAT rates', () => {
		const totals = calculateDocumentTotals(
			[line, { ...line, article: 8, quantity: 1, remise_type: 'Fixe', remise: 20 }],
			[
				{ id: 4, tva: 20 },
				{ id: 8, tva: 10 },
			],
			'Fixe',
			26,
		);
		expect(totals.totalHT).toBe(260);
		expect(totals.totalTVA).toBeCloseTo(39.6);
		expect(totals.totalTTC).toBeCloseTo(273.6);
		expect(totals.totalPrixAchat).toBe(90);
		expect(totals.totalPrixAchatDevise).toBe('MAD');
	});
	it('returns finite zero totals for empty lines', () => {
		expect(calculateDocumentTotals([], [])).toEqual({
			totalHT: 0,
			totalTVA: 0,
			totalTTC: 0,
			totalTTCApresRemise: 0,
			totalPrixAchat: 0,
			totalPrixAchatDevise: null,
		});
	});
	it('translates the raw server statuses without changing their API values', () => {
		expect(getStatutLabel('Brouillon', translations.en)).toBe(translations.en.rawData.documentStatuses.draft);
		expect(getStatutLabel('Envoyé', translations.en)).toBe(translations.en.rawData.documentStatuses.sent);
		expect(getStatutLabel('Accepté', translations.en)).toBe(translations.en.rawData.documentStatuses.accepted);
		expect(getStatutLabel('Facturé', translations.en)).toBe(translations.en.rawData.documentStatuses.invoiced);
		expect(getStatutLabel('Refusé', translations.en)).toBe(translations.en.rawData.documentStatuses.refused);
		expect(getStatutLabel('Annulé', translations.en)).toBe(translations.en.rawData.documentStatuses.cancelled);
		expect(getStatutLabel('Expiré', translations.en)).toBe(translations.en.rawData.documentStatuses.expired);
		expect(getStatutLabel('Valide', translations.en)).toBe(translations.en.common.validShort);
		expect(getStatutLabel('Unknown', translations.fr)).toBe('Unknown');
	});
});

it('formats document calendar dates without inventing a midnight time', () => {
	expect(formatDate('2026-10-22', false)).toBe(
		new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' }).format(
			new Date(2026, 9, 22, 12),
		),
	);
});

it('maps Devis notification targets only to implemented tenant-scoped screens', () => {
	expect(getNotificationDestination('/dashboard/devis/7?company_id=5')).toEqual({
		pathname: '/devis/[id]',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/devis/7/edit?company_id=5')).toEqual({
		pathname: '/devis/form',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/devis/7')).toBe('/devis');
	expect(getNotificationDestination('/dashboard/devis/new?company_id=5')).toEqual({
		pathname: '/devis/form',
		params: { company_id: '5' },
	});
});

it('maps implemented Pro-forma notification links while retaining company scope', () => {
	expect(getNotificationDestination('/dashboard/facture-pro-forma/7?company_id=5')).toEqual({
		pathname: '/facture-pro-forma/[id]',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-pro-forma/7/edit?company_id=5')).toEqual({
		pathname: '/facture-pro-forma/form',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-pro-forma/new?company_id=5')).toEqual({
		pathname: '/facture-pro-forma/form',
		params: { company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-pro-forma/7')).toBe('/facture-pro-forma');
});

it('maps client notification screens only with a valid company scope', () => {
	expect(getNotificationDestination('/dashboard/clients/new?company_id=5')).toEqual({
		pathname: '/clients/form',
		params: { company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/clients/7?company_id=5')).toEqual({
		pathname: '/clients/[id]',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/clients/7/edit?company_id=5')).toEqual({
		pathname: '/clients/form',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/clients/7')).toBe('/clients');
	expect(getNotificationDestination('/dashboard/clients/7?company_id=-5')).toBe('/clients');
	expect(getNotificationDestination('/dashboard/clients/0?company_id=5')).toBeNull();
});

it('maps invoice notification URLs while retaining company scope', () => {
	expect(getNotificationDestination('/dashboard/facture-client/7?company_id=5')).toEqual({
		pathname: '/facture-client/[id]',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-client/7/edit?company_id=5')).toEqual({
		pathname: '/facture-client/form',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-client/new?company_id=5')).toEqual({
		pathname: '/facture-client/form',
		params: { company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/facture-client/unpaid')).toBe('/facture-client/unpaid');
	expect(getNotificationDestination('/dashboard/facture-client/7')).toBe('/facture-client');
});

describe('writing field eligibility', () => {
	it.each(['designation', 'remarque', 'description', 'libelle', 'observations', 'termes_paiement'])(
		'includes the reviewed web field %s',
		(name) => {
			expect(isAiTextField(name, 'text')).toBe(true);
			expect(isAiTextField(name, 'textarea')).toBe(true);
		},
	);
	it.each(['email', 'password', 'ICE', 'reference', 'raison_sociale', 'nom', 'prenom', 'unknown'])(
		'excludes %s',
		(name) => {
			expect(isAiTextField(name, 'text')).toBe(false);
		},
	);
	it('does not enable assistance for numeric or password fields', () => {
		expect(isAiTextField('designation', 'number')).toBe(false);
		expect(isAiTextField('remarque', 'password')).toBe(false);
	});
});

it('maps delivery notifications to tenant-scoped native screens', () => {
	expect(getNotificationDestination('/dashboard/bon-de-livraison')).toBe('/bon-de-livraison');
	expect(getNotificationDestination('/dashboard/bon-de-livraison/uninvoiced')).toBe('/bon-de-livraison/uninvoiced');
	expect(getNotificationDestination('/dashboard/bon-de-livraison/new?company_id=5')).toEqual({
		pathname: '/bon-de-livraison/form',
		params: { company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/bon-de-livraison/7?company_id=5')).toEqual({
		pathname: '/bon-de-livraison/[id]',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/bon-de-livraison/7/edit?company_id=5')).toEqual({
		pathname: '/bon-de-livraison/form',
		params: { id: '7', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/bon-de-livraison/7')).toBe('/bon-de-livraison');
	expect(getNotificationDestination('/dashboard/bon-de-livraison/7?company_id=-1')).toBe('/bon-de-livraison');
	expect(getNotificationDestination('/dashboard/bon-de-livraison/0?company_id=5')).toBeNull();
});

it('maps payment notification targets while validating their company and optional invoice', () => {
	expect(getNotificationDestination('/dashboard/reglements')).toBe('/reglements');
	expect(getNotificationDestination('/dashboard/reglements/new?company_id=5&facture_client_id=7')).toEqual({
		pathname: '/reglements/form',
		params: { company_id: '5', facture_client_id: '7' },
	});
	expect(getNotificationDestination('/dashboard/reglements/9?company_id=5')).toEqual({
		pathname: '/reglements/[id]',
		params: { id: '9', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/reglements/9/edit?company_id=5')).toEqual({
		pathname: '/reglements/form',
		params: { id: '9', company_id: '5' },
	});
	expect(getNotificationDestination('/dashboard/reglements/new?company_id=5&facture_client_id=-7')).toBe('/reglements');
	expect(getNotificationDestination('/dashboard/reglements/9')).toBe('/reglements');
	expect(getNotificationDestination('/dashboard/reglements/0?company_id=5')).toBeNull();
});

it.each(['fr', 'en'] as const)(
	'translates shared discount choices in %s without changing their API values',
	(language) => {
		const t = translations[language];
		const items = getRemiseTypeItemsList(t);
		expect(items.map((item) => item.value)).toEqual(remiseTypeItemsList.map((item) => item.value));
		expect(items.map((item) => item.code)).toEqual([
			t.globalRemiseModal.typeNone,
			t.rawData.remiseTypes.percentage,
			t.rawData.remiseTypes.fixed,
		]);
		expect(getRemiseTypeItemsList(t, 'EUR').map((item) => item.code)).toEqual([
			t.globalRemiseModal.typeNone,
			t.globalRemiseModal.typePercent,
			t.globalRemiseModal.typeFixed('EUR'),
		]);
		expect(remiseTypeItemsList[1]).toEqual({ code: 'Pourcentage', value: 'Pourcentage' });
	},
);
