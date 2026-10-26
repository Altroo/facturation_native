import { factureProformaAddSchema, factureProformaSchema } from './formValidationSchemas';
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
	articleSchema,
	deviAddSchema,
	bonDeLivraisonAddSchema,
	bonDeLivraisonSchema,
	deviSchema,
	devisLivraisonFactureLineSchema,
	reglementSchema,
	factureAvoirSchema,
	stockAdjustmentSchema,
	stockReceiptSchema,
	stockInventorySchema,
} from './formValidationSchemas';

describe('Stock form schemas', () => {
	const adjustment = {
		movement_type: 'adjustment',
		article: 7,
		emplacement: 2,
		quantity: '-1,250',
		reason: 'Correction',
		globalError: '',
	};
	const receipt = {
		logistics_order: 41,
		logistics_line: 61,
		emplacement: 2,
		quantity: '0,001',
		reference: '',
		note: '',
	};
	const inventory = { article: 7, emplacement: 2, counted_quantity: '0', reference: '', note: '' };
	it('accepts signed nonzero adjustments and decimal-comma receipt quantities', () => {
		expect(stockAdjustmentSchema.parse(adjustment).quantity).toBe(-1.25);
		expect(stockReceiptSchema.parse(receipt).quantity).toBe(0.001);
		expect(stockInventorySchema.parse(inventory).counted_quantity).toBe(0);
	});
	it.each(['', 'invalid', Infinity, NaN, 0])('rejects invalid or zero adjustment %s', (quantity) => {
		expect(stockAdjustmentSchema.safeParse({ ...adjustment, quantity }).success).toBe(false);
	});
	it('requires a reason, positive identifiers and a positive receipt quantity', () => {
		expect(stockAdjustmentSchema.safeParse({ ...adjustment, reason: '' }).success).toBe(false);
		expect(stockReceiptSchema.safeParse({ ...receipt, quantity: 0 }).success).toBe(false);
		expect(stockInventorySchema.safeParse({ ...inventory, counted_quantity: -1 }).success).toBe(false);
		expect(stockInventorySchema.safeParse({ ...inventory, article: null }).success).toBe(false);
	});
});

describe('factureAvoirSchema', () => {
	const credit = {
		date_avoir: '2026-10-24',
		facture_origine: 12,
		client: 3,
		motif_avoir: 'remise',
		remise: 0,
		lignes: [{ article: 4, prix_achat: 80, prix_vente: '55,50', quantity: '1,5', remise: '2,50', remise_type: 'Fixe' }],
	};
	it('allows refunds below cost and parses decimal commas without changing the web credit fields', () => {
		expect(factureAvoirSchema.parse(credit).lignes).toEqual([
			expect.objectContaining({ article: 4, prix_vente: 55.5, quantity: 1.5, remise: 2.5 }),
		]);
	});
	it.each([0, -1, 'invalid', Infinity])('rejects invalid credit quantities %s', (quantity) => {
		expect(factureAvoirSchema.safeParse({ ...credit, lignes: [{ ...credit.lignes[0], quantity }] }).success).toBe(
			false,
		);
	});
	it.each(['', '2026-02-30', 'not a date'])('requires a valid credit date %s', (date_avoir) => {
		expect(factureAvoirSchema.safeParse({ ...credit, date_avoir }).success).toBe(false);
	});
});

describe('reglementSchema', () => {
	const payment = {
		facture_client: 7,
		mode_reglement: null,
		montant: '100,50',
		date_reglement: '2026-10-23',
		libelle: '',
		observations: '',
	};
	it('normalizes decimal amounts and accepts the web payment fields', () => {
		expect(reglementSchema.parse(payment)).toMatchObject({ montant: 100.5, facture_client: 7, mode_reglement: null });
	});
	it.each([0, -1, Infinity, NaN, '', 'invalid'])('rejects invalid payment amount %s', (montant) => {
		expect(reglementSchema.safeParse({ ...payment, montant }).success).toBe(false);
	});
	it.each(['', '2026-02-30', 'not a date'])('requires a valid calendar date %s', (date_reglement) => {
		expect(reglementSchema.safeParse({ ...payment, date_reglement }).success).toBe(false);
	});
	it.each([0, -1, 1.5])('rejects invalid invoice identifier %s', (facture_client) => {
		expect(reglementSchema.safeParse({ ...payment, facture_client }).success).toBe(false);
	});
});

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

describe('articleSchema', () => {
	const article = {
		type_article: 'Produit',
		reference: 'ART001',
		designation: 'Article Atlas',
		company: 5,
		prix_achat: 50,
		prix_vente: 100,
		tva: 20,
		prix_vente_base: 'HT',
	};
	it('accepts an article without a photo and rejects missing required business fields', () => {
		expect(articleSchema.safeParse({ ...article, photo: null }).success).toBe(true);
		for (const field of ['reference', 'designation', 'company'] as const)
			expect(articleSchema.safeParse({ ...article, [field]: '' }).success).toBe(false);
	});
	it('compares prices using the stored HT value and currency rates, as on the web', () => {
		expect(
			articleSchema.safeParse({ ...article, prix_achat: 100, prix_vente: 120, prix_vente_base: 'TTC' }).success,
		).toBe(false);
		expect(
			articleSchema.safeParse({ ...article, prix_achat: 100, prix_vente: 121.2, prix_vente_base: 'TTC' }).success,
		).toBe(true);
		expect(
			articleSchema.safeParse({
				...article,
				prix_achat: 11,
				devise_prix_achat: 'EUR',
				prix_vente: 100,
				devise_prix_vente: 'MAD',
			}).success,
		).toBe(false);
	});
	it.each([-1, Infinity, NaN])('rejects invalid stock minimum %s', (stock_minimum) => {
		expect(articleSchema.safeParse({ ...article, stock_minimum }).success).toBe(false);
	});
});

describe('Devis validation', () => {
	const header = {
		numero_part: '001',
		year_part: '26',
		client: 3,
		date_devis: '2026-10-22',
		date_echeance: null,
		mode_paiement: null,
		numero_demande_prix_client: '',
		fournisseur: '',
		fournisseur_email: '',
		remarque: '',
	};
	const line = { article: 4, prix_achat: 50, prix_vente: 100, quantity: 2, remise_type: '', remise: 0 };
	it('accepts header-only creation and empty optional supplier/payment fields', () => {
		expect(deviAddSchema.safeParse(header).success).toBe(true);
		expect(deviSchema.safeParse({ ...header, lignes: [line], remise_type: '', remise: 0 }).success).toBe(true);
	});
	it('normalizes decimal commas for quantity, unit price and discounts', () => {
		const result = devisLivraisonFactureLineSchema.parse({
			...line,
			quantity: '1,5',
			prix_vente: '100,25',
			remise_type: 'Pourcentage',
			remise: '2,5',
		});
		expect(result.quantity).toBe(1.5);
		expect(result.prix_vente).toBe(100.25);
		expect(result.remise).toBe(2.5);
	});
	it.each([
		{ client: null },
		{ year_part: 'abc' },
		{ year_part: '19' },
		{ numero_part: '' },
		{ fournisseur_email: 'broken' },
	])('rejects an invalid header: %j', (value) => {
		expect(deviAddSchema.safeParse({ ...header, ...value }).success).toBe(false);
	});
	it.each([
		{ quantity: 0 },
		{ prix_vente: 25 },
		{ remise_type: 'Pourcentage', remise: 101 },
		{ remise_type: 'Fixe', remise: -1 },
	])('rejects invalid line values: %j', (value) => {
		expect(devisLivraisonFactureLineSchema.safeParse({ ...line, ...value }).success).toBe(false);
	});
});

describe('Pro-forma validation', () => {
	const header = {
		numero_part: 'P001',
		year_part: '26',
		client: 3,
		date_facture: '2026-10-23',
		date_echeance: null,
		numero_bon_commande_client: 'BC-2026',
		termes_paiement: '30 jours',
		mode_paiement: null,
		fournisseur: '',
		fournisseur_email: '',
		remarque: '',
	};
	it('accepts the web pro-forma header, payment terms and a header-only creation', () => {
		expect(factureProformaAddSchema.safeParse(header).success).toBe(true);
		expect(factureProformaAddSchema.parse(header)).toMatchObject({
			date_facture: '2026-10-23',
			numero_bon_commande_client: 'BC-2026',
			termes_paiement: '30 jours',
		});
	});
	it('requires the invoice date and caps payment terms at the web limit', () => {
		expect(factureProformaAddSchema.safeParse({ ...header, date_facture: '' }).success).toBe(false);
		expect(factureProformaAddSchema.safeParse({ ...header, termes_paiement: 'a'.repeat(2001) }).success).toBe(false);
	});
	it('accepts no discount and rejects percentage discounts above 100', () => {
		expect(factureProformaSchema.safeParse({ ...header, lignes: [], remise_type: '', remise: 0 }).success).toBe(true);
		expect(factureProformaSchema.safeParse({ ...header, remise_type: 'Pourcentage', remise: 101 }).success).toBe(false);
	});
});

describe('bonDeLivraison schemas', () => {
	const header = {
		numero_part: '0001',
		year_part: '26',
		client: 3,
		date_bon_livraison: '2026-10-24',
		livre_par: 6,
		numero_bon_commande_client: 'BC-1',
	};
	it('creates headers with a delivery person and no required invoice payment terms', () => {
		expect(bonDeLivraisonAddSchema.parse(header)).toMatchObject({ livre_par: 6, date_bon_livraison: '2026-10-24' });
		expect(bonDeLivraisonAddSchema.parse(header)).not.toHaveProperty('termes_paiement');
	});
	it('accepts decimal-comma quantities and rejects excessive percentage discounts', () => {
		const data = {
			...header,
			remise_type: 'Pourcentage',
			remise: 10,
			lignes: [{ article: 4, prix_achat: 50, prix_vente: 100, quantity: '1,5', remise_type: '', remise: 0 }],
		};
		expect(bonDeLivraisonSchema.parse(data).lignes?.[0]?.quantity).toBe(1.5);
		expect(bonDeLivraisonSchema.safeParse({ ...data, remise: 101 }).success).toBe(false);
		expect(bonDeLivraisonSchema.safeParse({ ...data, livre_par: -1 }).success).toBe(false);
	});
});
