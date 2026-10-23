import {
	UserClass,
	ModePaiementClass,
	DeviFactureLivraisonLineClass,
	DeviClass,
	FactureClass,
	GroupClass,
	CompanyClass,
	ArticleClass,
	MarqueClass,
	CategorieClass,
	UniteClass,
	EmplacementClass,
} from './classes';

describe('UserClass', () => {
	it('creates a user instance with given properties', () => {
		const user = new UserClass(
			1,
			'John',
			'Doe',
			'john@example.com',
			'M',
			null,
			null,
			true,
			true,
			false,
			'2023-01-01',
			'2023-01-02',
			'2023-01-02',
		);

		expect(user.id).toBe(1);
		expect(user.first_name).toBe('John');
		expect(user.last_name).toBe('Doe');
		expect(user.email).toBe('john@example.com');
		expect(user.gender).toBe('M');
		expect(user.is_staff).toBe(true);
		expect(user.is_active).toBe(true);
		expect(user.default_password_set).toBe(false);
		expect(user.date_joined).toBe('2023-01-01');
		expect(user.last_login).toBe('2023-01-02');
	});
});

describe('GroupClass', () => {
	it('creates a group instance with titles', () => {
		const group = new GroupClass(['Caissier', 'Lecture']);
		expect(group.group_titles).toEqual(['Caissier', 'Lecture']);
	});

	it('creates a group instance with null titles', () => {
		const group = new GroupClass([null]);
		expect(group.group_titles).toEqual([null]);
	});
});

describe('CompanyClass', () => {
	it('creates a company instance with given properties', () => {
		const company = new CompanyClass(
			1,
			'2023-01-01',
			'2023-01-01',
			'MyCompany',
			'company@example.com',
			null,
			null,
			null,
			null,
			'10 à 50',
			'M.',
			'Boss',
			'0600000000',
			'123 Street',
			'0500000000',
			'0500000001',
			'www.example.com',
			'ACC123',
			'ICE123',
			'RC123',
			'IF123',
			'TP123',
			'CNSS123',
			[{ pk: 1, role: 'Lecture' }],
			[{ id: 1, first_name: 'Jane', last_name: 'Doe', role: 'Caissier' }],
			false,
		);

		expect(company.id).toBe(1);
		expect(company.raison_sociale).toBe('MyCompany');
		expect(company.nbr_employe).toBe('10 à 50');
		expect(company.civilite_responsable).toBe('M.');
		expect(company.nom_responsable).toBe('Boss');
		expect(company.managed_by).toEqual([{ pk: 1, role: 'Lecture' }]);
		expect(company.admins).toEqual([{ id: 1, first_name: 'Jane', last_name: 'Doe', role: 'Caissier' }]);
	});
});

describe('ArticleClass', () => {
	it('keeps API field names, classification IDs and safe defaults for stock and sale price basis', () => {
		const article = new ArticleClass(
			7,
			'ART-007',
			'Produit',
			11,
			'Atlas',
			2,
			'HP',
			3,
			'Informatique',
			4,
			'Dépôt Casablanca',
			5,
			'Pièce',
			'Écran 27 pouces',
			null,
			1400,
			'MAD',
			2190,
			'EUR',
			20,
			'Livraison incluse',
			'2026-10-01',
			'2026-10-02',
			false,
		);
		expect(article.id).toBe(7);
		expect(article.reference).toBe('ART-007');
		expect(article.type_article).toBe('Produit');
		expect(article.company).toBe(11);
		expect(article.company_name).toBe('Atlas');
		expect(article.marque).toBe(2);
		expect(article.marque_name).toBe('HP');
		expect(article.categorie).toBe(3);
		expect(article.categorie_name).toBe('Informatique');
		expect(article.emplacement).toBe(4);
		expect(article.emplacement_name).toBe('Dépôt Casablanca');
		expect(article.unite).toBe(5);
		expect(article.unite_name).toBe('Pièce');
		expect(article.designation).toBe('Écran 27 pouces');
		expect(article.photo).toBeNull();
		expect(article.prix_achat).toBe(1400);
		expect(article.devise_prix_achat).toBe('MAD');
		expect(article.prix_vente).toBe(2190);
		expect(article.devise_prix_vente).toBe('EUR');
		expect(article.tva).toBe(20);
		expect(article.remarque).toBe('Livraison incluse');
		expect(article.date_created).toBe('2026-10-01');
		expect(article.date_updated).toBe('2026-10-02');
		expect(article.archived).toBe(false);
		expect(article.prix_vente_base).toBe('HT');
		expect(article.stock_minimum).toBe(0);
		expect(article.stock_management_enabled).toBe(false);
		expect(article.physical_quantity).toBe(0);
		expect(article.reserved_quantity).toBe(0);
		expect(article.available_quantity).toBe(0);
		expect(article.incoming_quantity).toBe(0);
		expect(article.projected_quantity).toBe(0);
		expect(article.stock_state).toBe('not_managed');
	});
});

describe('MarqueClass', () => {
	it('creates a company brand with an optional email', () => {
		const marque = new MarqueClass(2, 'HP', 11);
		expect(marque.id).toBe(2);
		expect(marque.nom).toBe('HP');
		expect(marque.company).toBe(11);
		expect(marque.email).toBeUndefined();
		marque.email = 'contact@example.com';
		expect(marque.email).toBe('contact@example.com');
	});
});

describe('CategorieClass', () => {
	it('keeps the category ID and company used in article filters', () => {
		const categorie = new CategorieClass(3, 'Informatique', 11);
		expect(categorie.id).toBe(3);
		expect(categorie.nom).toBe('Informatique');
		expect(categorie.company).toBe(11);
	});
});

describe('UniteClass', () => {
	it('keeps the unit ID and company used in article forms', () => {
		const unite = new UniteClass(5, 'Pièce', 11);
		expect(unite.id).toBe(5);
		expect(unite.nom).toBe('Pièce');
		expect(unite.company).toBe(11);
	});
});

describe('EmplacementClass', () => {
	it('keeps the location ID and company used in stock-enabled article forms', () => {
		const emplacement = new EmplacementClass(4, 'Dépôt Casablanca', 11);
		expect(emplacement.id).toBe(4);
		expect(emplacement.nom).toBe('Dépôt Casablanca');
		expect(emplacement.company).toBe(11);
	});
});

describe('ModePaiementClass', () => {
	it('creates a mode paiement instance with given properties', () => {
		const modePaiement = new ModePaiementClass(1, 'Cash', 1);
		expect(modePaiement.id).toBe(1);
		expect(modePaiement.nom).toBe('Cash');
		expect(modePaiement.company).toBe(1);
	});
});

describe('DeviFactureLineClass', () => {
	it('creates a devis line instance with given properties', () => {
		const line = new DeviFactureLivraisonLineClass(
			1,
			10,
			'Article name',
			'Line designation',
			50,
			'MAD',
			75,
			'MAD',
			3,
			'Pourcentage',
			10,
		);

		expect(line.id).toBe(1);
		expect(line.article).toBe(10);
		expect(line.article_designation).toBe('Article name');
		expect(line.designation).toBe('Line designation');
		expect(line.prix_achat).toBe(50);
		expect(line.prix_vente).toBe(75);
		expect(line.quantity).toBe(3);
		expect(line.remise_type).toBe('Pourcentage');
		expect(line.remise).toBe(10);
	});
});

describe('DeviClass', () => {
	it('creates a devis instance with lines, totals and metadata', () => {
		const line1 = new DeviFactureLivraisonLineClass(1, 1, 'A', 'Desc A', 20, 'MAD', 30, 'MAD', 1, 'Fixe', 0);
		const line2 = new DeviFactureLivraisonLineClass(2, 2, 'B', 'Desc B', 40, 'MAD', 60, 'MAD', 2, 'Pourcentage', 10);

		const devi = new DeviClass(
			1,
			'DEV-1',
			5,
			'ClientName',
			'2023-01-01',
			'2023-01-15',
			null,
			1,
			'Cash',
			'Some remark',
			'Brouillon',
			'2023-01-01',
			'2023-01-02',
			10,
			'Creator',
			2,
			'Pourcentage',
			5,
			18,
			50,
			480,
			456,
			'MAD',
			[line1, line2],
		);

		expect(devi.id).toBe(1);
		expect(devi.numero_devis).toBe('DEV-1');
		expect(devi.client).toBe(5);
		expect(devi.client_name).toBe('ClientName');
		expect(devi.date_devis).toBe('2023-01-01');
		expect(devi.date_echeance).toBe('2023-01-15');
		expect(devi.mode_paiement).toBe(1);
		expect(devi.mode_paiement_name).toBe('Cash');
		expect(devi.remarque).toBe('Some remark');
		expect(devi.statut).toBe('Brouillon');
		expect(devi.date_created).toBe('2023-01-01');
		expect(devi.date_updated).toBe('2023-01-02');
		expect(devi.created_by_user_id).toBe(10);
		expect(devi.created_by_user_name).toBe('Creator');
		expect(devi.lignes_count).toBe(2);
		expect(devi.remise_type).toBe('Pourcentage');
		expect(devi.remise).toBe(5);
		expect(devi.total_ht).toBe(18);
		expect(devi.total_tva).toBe(50);
		expect(devi.total_ttc).toBe(480);
		expect(devi.total_ttc_apres_remise).toBe(456);
		expect(Array.isArray(devi.lignes)).toBe(true);
		expect(devi.lignes.length).toBe(2);
		expect(devi.lignes[0].id).toBe(1);
		expect(devi.lignes[1].id).toBe(2);
	});
});

describe('FactureClass', () => {
	it('creates a devis instance with lines, totals and metadata', () => {
		const line1 = new DeviFactureLivraisonLineClass(1, 1, 'A', 'Desc A', 20, 'MAD', 30, 'MAD', 1, 'Fixe', 0);
		const line2 = new DeviFactureLivraisonLineClass(2, 2, 'B', 'Desc B', 40, 'MAD', 60, 'MAD', 2, 'Pourcentage', 10);

		const facture = new FactureClass(
			1,
			'P001/26',
			5,
			'ClientName',
			'2023-01-01',
			'2023-01-15',
			'BC-2026',
			'30 jours',
			1,
			'Cash',
			'Some remark',
			'Brouillon',
			'2023-01-01',
			'2023-01-02',
			10,
			'Creator',
			2,
			'Pourcentage',
			5,
			18,
			50,
			480,
			456,
			'MAD',
			[line1, line2],
		);

		expect(facture.id).toBe(1);
		expect(facture.numero_facture).toBe('P001/26');
		expect(facture.client).toBe(5);
		expect(facture.client_name).toBe('ClientName');
		expect(facture.date_facture).toBe('2023-01-01');
		expect(facture.date_echeance).toBe('2023-01-15');
		expect(facture.numero_bon_commande_client).toBe('BC-2026');
		expect(facture.termes_paiement).toBe('30 jours');
		expect(facture.has_logistics_dossier).toBe(false);
		expect(facture.mode_paiement).toBe(1);
		expect(facture.mode_paiement_name).toBe('Cash');
		expect(facture.remarque).toBe('Some remark');
		expect(facture.statut).toBe('Brouillon');
		expect(facture.date_created).toBe('2023-01-01');
		expect(facture.date_updated).toBe('2023-01-02');
		expect(facture.created_by_user_id).toBe(10);
		expect(facture.created_by_user_name).toBe('Creator');
		expect(facture.lignes_count).toBe(2);
		expect(facture.remise_type).toBe('Pourcentage');
		expect(facture.remise).toBe(5);
		expect(facture.total_ht).toBe(18);
		expect(facture.total_tva).toBe(50);
		expect(facture.total_ttc).toBe(480);
		expect(facture.total_ttc_apres_remise).toBe(456);
		expect(Array.isArray(facture.lignes)).toBe(true);
		expect(facture.lignes.length).toBe(2);
		expect(facture.lignes[0].id).toBe(1);
		expect(facture.lignes[1].id).toBe(2);
	});
});
