import {
	loginSchema,
	emailSchema,
	passwordResetConfirmationSchema,
	passwordResetCodeSchema,
	profilSchema,
	changePasswordSchema,
	companySchema,
	userSchema,
	passwordResetStorageSchema,
	clientSchema,
} from './formValidationSchemas';

describe('clientSchema', () => {
	const pm = {
		company: 5,
		client_type: 'PM',
		code_client: 'CLT001',
		raison_sociale: 'Client Atlas',
		ville: 2,
		ICE: '123456789012345',
		registre_de_commerce: 'RC-123',
		delai_de_paiement: 60,
	};
	it('requires the company-client fields enforced by Django, including the trade register', () => {
		expect(clientSchema.safeParse(pm).success).toBe(true);
		const result = clientSchema.safeParse({ ...pm, registre_de_commerce: '' });
		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues.map((issue) => issue.path)).toContainEqual(['registre_de_commerce']);
	});
	it('requires a physical person name, first name, address, city and payment term', () => {
		const pp = {
			company: 5,
			client_type: 'PP',
			code_client: 'CLT002',
			nom: 'Amine',
			prenom: 'Benali',
			adresse: 'Casablanca',
			ville: 2,
			delai_de_paiement: 60,
		};
		expect(clientSchema.safeParse(pp).success).toBe(true);
		expect(clientSchema.safeParse({ ...pp, adresse: '' }).success).toBe(false);
	});
	it('keeps payment term zero valid and rejects negative days and malformed contact details', () => {
		expect(clientSchema.safeParse({ ...pm, delai_de_paiement: 0, tel: '+212612345678' }).success).toBe(true);
		expect(clientSchema.safeParse({ ...pm, delai_de_paiement: -1 }).success).toBe(false);
		expect(clientSchema.safeParse({ ...pm, tel: 'abcd' }).success).toBe(false);
		expect(clientSchema.safeParse({ ...pm, email: 'invalid' }).success).toBe(false);
	});
	it('allows the web Client Divers fields to be empty', () => {
		expect(clientSchema.safeParse({ company: 5, client_type: 'CD', code_client: 'DIV001' }).success).toBe(true);
	});
});

describe('Zod Schema Validation', () => {
	describe('loginSchema', () => {
		it('validates correct input', () => {
			expect(() => loginSchema.parse({ email: 'test@example.com', password: 'password123' })).not.toThrow();
		});
		it('fails with missing password', () => {
			expect(() => loginSchema.parse({ email: 'test@example.com' })).toThrow();
		});
		it('fails with invalid email format', () => {
			expect(() => loginSchema.parse({ email: 'bad-email', password: 'password123' })).toThrow();
		});
	});

	describe('emailSchema', () => {
		it('validates correct email', () => {
			expect(() => emailSchema.parse({ email: 'user@example.com' })).not.toThrow();
		});
		it('fails with invalid email', () => {
			expect(() => emailSchema.parse({ email: 'not-an-email' })).toThrow();
		});
		it('fails with missing email', () => {
			expect(() => emailSchema.parse({})).toThrow();
		});
	});

	describe('passwordResetConfirmationSchema', () => {
		it('validates matching passwords', () => {
			expect(() =>
				passwordResetConfirmationSchema.parse({
					new_password: 'securePass123',
					new_password2: 'securePass123',
				}),
			).not.toThrow();
		});
		it('fails with short password', () => {
			expect(() =>
				passwordResetConfirmationSchema.parse({
					new_password: '123',
					new_password2: '123',
				}),
			).toThrow();
		});
		it('accepts different new_password values (no match enforcement)', () => {
			expect(() =>
				passwordResetConfirmationSchema.parse({
					new_password: 'securePass123',
					new_password2: 'differentPass',
				}),
			).not.toThrow();
		});
	});

	describe('passwordResetCodeSchema', () => {
		it('validates 6 digits', () => {
			expect(() =>
				passwordResetCodeSchema.parse({ one: '1', two: '2', three: '3', four: '4', five: '5', six: '6' }),
			).not.toThrow();
		});
		it('fails with non-digit input', () => {
			expect(() =>
				passwordResetCodeSchema.parse({ one: 'a', two: '2', three: '3', four: '4', five: '5', six: '6' }),
			).toThrow();
		});
		it('fails with missing digit', () => {
			expect(() => passwordResetCodeSchema.parse({ one: '1', two: '2', three: '3', four: '4', five: '5' })).toThrow();
		});
	});

	describe('profilSchema', () => {
		it('validates minimal profile', () => {
			expect(() => profilSchema.parse({ first_name: 'Al', last_name: 'User' })).not.toThrow();
		});
		it('fails with short first name', () => {
			expect(() => profilSchema.parse({ first_name: 'A', last_name: 'User' })).toThrow();
		});
		it('fails with missing last name', () => {
			expect(() => profilSchema.parse({ first_name: 'Al' })).toThrow();
		});
	});

	describe('changePasswordSchema', () => {
		it('validates all password fields', () => {
			expect(() =>
				changePasswordSchema.parse({
					old_password: 'oldPass123',
					new_password: 'newPass123',
					new_password2: 'newPass123',
				}),
			).not.toThrow();
		});
		it('fails with empty new password', () => {
			expect(() =>
				changePasswordSchema.parse({
					old_password: 'oldPass123',
					new_password: '',
					new_password2: '',
				}),
			).toThrow();
		});
	});

	describe('companySchema', () => {
		it('validates required fields only', () => {
			expect(() =>
				companySchema.parse({ raison_sociale: 'My Company', ICE: '123456', nbr_employe: '10' }),
			).not.toThrow();
		});
		it('fails with missing ICE', () => {
			expect(() => companySchema.parse({ raison_sociale: 'My Company', nbr_employe: '10' })).toThrow();
		});
		it('fails with missing raison_sociale', () => {
			expect(() => companySchema.parse({ ICE: '123456', nbr_employe: '10' })).toThrow();
		});
	});

	describe('userSchema', () => {
		it('validates required fields', () => {
			expect(() =>
				userSchema.parse({
					first_name: 'Al',
					last_name: 'User',
					email: 'al@example.com',
					gender: 'M',
					is_active: true,
					is_staff: false,
				}),
			).not.toThrow();
		});
		it('fails with invalid email', () => {
			expect(() =>
				userSchema.parse({
					first_name: 'Al',
					last_name: 'User',
					email: 'invalid-email',
					gender: 'M',
					is_active: true,
					is_staff: false,
				}),
			).toThrow();
		});
	});

	describe('companySchema branches', () => {
		it('accepts optional email, phone, fax, site_web fields', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					email: 'company@example.com',
					telephone: '+212600000000',
					fax: '+212500000000',
					site_web: 'https://example.com',
				}),
			).not.toThrow();
		});

		it('accepts empty strings for optional fields (preprocessed to undefined)', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					email: '',
					telephone: '',
					fax: '',
					site_web: '',
				}),
			).not.toThrow();
		});

		it('accepts null for optional fields', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					email: null,
					telephone: null,
					fax: null,
					site_web: null,
				}),
			).not.toThrow();
		});

		it('fails with invalid email format', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					email: 'not-email',
				}),
			).toThrow();
		});

		it('fails with invalid phone format', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					telephone: 'abc',
				}),
			).toThrow();
		});

		it('fails with invalid URL format', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					site_web: 'not-a-url',
				}),
			).toThrow();
		});

		it('accepts managed_by array', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					managed_by: [{ pk: 1, role: 'Admin' }],
				}),
			).not.toThrow();
		});

		it('accepts uses_foreign_currency boolean', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					uses_foreign_currency: true,
				}),
			).not.toThrow();
		});

		it('accepts logo and cachet base64 image fields', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					logo: 'data:image/png;base64,abc123',
					cachet: 'data:image/png;base64,xyz789',
				}),
			).not.toThrow();
		});

		it('accepts logo and cachet URL fields', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					logo: 'https://example.com/logo.png',
					cachet: 'https://example.com/cachet.png',
				}),
			).not.toThrow();
		});

		it('accepts logo as null', () => {
			expect(() =>
				companySchema.parse({
					raison_sociale: 'My Company',
					ICE: '123456',
					nbr_employe: '10',
					logo: null,
					logo_cropped: null,
					cachet: null,
					cachet_cropped: null,
				}),
			).not.toThrow();
		});
	});

	describe('userSchema branches', () => {
		it('accepts optional companies array', () => {
			expect(() =>
				userSchema.parse({
					first_name: 'Al',
					last_name: 'User',
					email: 'al@example.com',
					gender: 'M',
					is_active: true,
					is_staff: false,
					companies: [{ membership_id: 1, company_id: 1, raison_sociale: 'Co', role: 'Admin' }],
				}),
			).not.toThrow();
		});

		it('accepts avatar fields', () => {
			expect(() =>
				userSchema.parse({
					first_name: 'Al',
					last_name: 'User',
					email: 'al@example.com',
					gender: 'M',
					is_active: true,
					is_staff: false,
					avatar: 'data:image/png;base64,abc',
					avatar_cropped: 'https://example.com/avatar.png',
				}),
			).not.toThrow();
		});

		it('accepts null avatar fields', () => {
			expect(() =>
				userSchema.parse({
					first_name: 'Al',
					last_name: 'User',
					email: 'al@example.com',
					gender: 'M',
					is_active: true,
					is_staff: false,
					avatar: null,
					avatar_cropped: null,
				}),
			).not.toThrow();
		});

		it('fails with short first_name', () => {
			expect(() =>
				userSchema.parse({
					first_name: 'A',
					last_name: 'User',
					email: 'al@example.com',
					gender: 'M',
					is_active: true,
					is_staff: false,
				}),
			).toThrow();
		});
	});

	describe('profilSchema branches', () => {
		it('accepts gender and avatar fields', () => {
			expect(() =>
				profilSchema.parse({
					first_name: 'Al',
					last_name: 'User',
					gender: 'M',
					avatar: 'data:image/png;base64,abc',
					avatar_cropped: 'https://example.com/avatar.png',
				}),
			).not.toThrow();
		});

		it('accepts null avatar fields', () => {
			expect(() =>
				profilSchema.parse({
					first_name: 'Al',
					last_name: 'User',
					avatar: null,
					avatar_cropped: null,
				}),
			).not.toThrow();
		});
	});

	describe('passwordResetCodeSchema additional branches', () => {
		it('fails with multi-digit input', () => {
			expect(() =>
				passwordResetCodeSchema.parse({ one: '12', two: '2', three: '3', four: '4', five: '5', six: '6' }),
			).toThrow();
		});

		it('fails with empty string', () => {
			expect(() =>
				passwordResetCodeSchema.parse({ one: '', two: '2', three: '3', four: '4', five: '5', six: '6' }),
			).toThrow();
		});
	});

	describe('loginSchema additional branches', () => {
		it('fails with short password', () => {
			expect(() => loginSchema.parse({ email: 'test@example.com', password: 'short' })).toThrow();
		});

		it('fails with empty email', () => {
			expect(() => loginSchema.parse({ email: '', password: 'password123' })).toThrow();
		});
	});

	describe('changePasswordSchema additional branches', () => {
		it('fails with short old_password', () => {
			expect(() =>
				changePasswordSchema.parse({
					old_password: 'short',
					new_password: 'newPass123',
					new_password2: 'newPass123',
				}),
			).toThrow();
		});

		it('fails with undefined old_password (preprocessed to empty)', () => {
			expect(() =>
				changePasswordSchema.parse({
					new_password: 'newPass123',
					new_password2: 'newPass123',
				}),
			).toThrow();
		});
	});
});

it.each([NaN, Infinity, -Infinity])('rejects a non-finite persisted recovery expiration %s', (expiresAt) => {
	expect(
		passwordResetStorageSchema.safeParse({ email: 'test@example.invalid', code: '123456', expiresAt }).success,
	).toBe(false);
});
it('accepts a finite persisted recovery expiration', () => {
	const expiresAt = Date.now() + 86400000;
	expect(passwordResetStorageSchema.parse({ email: 'test@example.invalid', code: '123456', expiresAt }).expiresAt).toBe(
		expiresAt,
	);
});
