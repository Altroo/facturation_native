import { UserClass, GroupClass, CompanyClass } from './classes';

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
