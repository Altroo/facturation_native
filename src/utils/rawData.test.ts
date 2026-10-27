import {
	APP_VERSION,
	genderItemsList,
	nbrEmployeItemsList,
	civiliteItemsList,
	devisFactureStatusItemsList,
	bonDeLivraisonStatusItemsList,
	remiseTypeItemsList,
	logistiqueGlobalStatusItemsList,
	logistiquePaymentStatusItemsList,
	logistiqueImportTitleStatusItemsList,
	logistiqueManagerRoles,
} from './rawData';
import { version } from '../../package.json';
import { expo } from '../../app.json';

describe('items lists', () => {
	it('keeps the same stored discount choices as the web', () => {
		expect(remiseTypeItemsList).toEqual([
			{ code: '', value: '' },
			{ code: 'Pourcentage', value: 'Pourcentage' },
			{ code: 'Fixe', value: 'Fixe' },
		]);
	});
	describe('genderItemsList', () => {
		it('has two entries with correct codes and values', () => {
			expect(genderItemsList).toHaveLength(2);

			expect(genderItemsList[0]).toEqual({ code: 'H', value: 'Homme' });
			expect(genderItemsList[1]).toEqual({ code: 'F', value: 'Femme' });

			const codes = genderItemsList.map((i) => i.code);
			expect(codes).toEqual(['H', 'F']);

			const values = genderItemsList.map((i) => i.value);
			expect(values).toEqual(['Homme', 'Femme']);
		});

		it('contains unique codes', () => {
			const codes = genderItemsList.map((i) => i.code);
			const unique = Array.from(new Set(codes));
			expect(unique).toHaveLength(codes.length);
		});
	});

	describe('nbrEmployeItemsList', () => {
		it('has expected options and preserves order', () => {
			const expected = [
				{ code: '1 à 5', value: '1 à 5' },
				{ code: '5 à 10', value: '5 à 10' },
				{ code: '10 à 50', value: '10 à 50' },
				{ code: '50 à 100', value: '50 à 100' },
				{ code: 'plus que 100', value: 'plus que 100' },
			];

			expect(nbrEmployeItemsList).toEqual(expected);
			expect(nbrEmployeItemsList.map((i) => i.code)).toEqual(expected.map((e) => e.code));
		});

		it('all entries have non-empty code and value strings', () => {
			for (const it of nbrEmployeItemsList) {
				expect(typeof it.code).toBe('string');
				expect(it.code.length).toBeGreaterThan(0);
				expect(typeof it.value).toBe('string');
				expect(it.value.length).toBeGreaterThan(0);
			}
		});
	});

	describe('civiliteItemsList', () => {
		it('includes empty option and common salutations in expected order', () => {
			const expected = [
				{ code: '', value: '' },
				{ code: 'M.', value: 'M.' },
				{ code: 'Mme', value: 'Mme' },
				{ code: 'Mlle', value: 'Mlle' },
			];

			expect(civiliteItemsList).toEqual(expected);
		});

		it('first item is the empty placeholder', () => {
			expect(civiliteItemsList[0]).toEqual({ code: '', value: '' });
		});
	});
});

it('uses the bundled package version in JavaScript and Expo config', () => {
	expect(APP_VERSION).toBe(version);
	expect(expo.version).toBe(version);
});

describe('logistics contracts', () => {
	it('keeps the workflow filter values accepted by the web and Django', () => {
		expect(logistiqueGlobalStatusItemsList).toEqual([
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
		]);
		expect(logistiquePaymentStatusItemsList).toEqual(['Non demandé', 'En attente', 'Validé']);
		expect(logistiqueImportTitleStatusItemsList).toEqual([
			'À préparer',
			"Titre d'import validé – En attente de paiement",
		]);
	});

	it('permits supplier management only for the three web manager roles', () => {
		expect(logistiqueManagerRoles.has('Caissier')).toBe(true);
		expect(logistiqueManagerRoles.has('Commercial')).toBe(true);
		expect(logistiqueManagerRoles.has('Logistique')).toBe(true);
		expect(logistiqueManagerRoles.has('Lecture')).toBe(false);
		expect(logistiqueManagerRoles.has('')).toBe(false);
		expect(logistiqueManagerRoles.size).toBe(3);
	});
});

it('includes the invoiced state for delivery notes without exposing it to quotes or invoices', () => {
	expect(bonDeLivraisonStatusItemsList.map((item) => item.value)).toEqual([
		'',
		'Brouillon',
		'Envoyé',
		'Accepté',
		'Refusé',
		'Annulé',
		'Expiré',
		'Facturé',
	]);
	expect(devisFactureStatusItemsList.map((item) => item.value)).not.toContain('Facturé');
	expect(new Set(bonDeLivraisonStatusItemsList.map((item) => item.value)).size).toBe(
		bonDeLivraisonStatusItemsList.length,
	);
});
