import { genderItemsList, nbrEmployeItemsList, civiliteItemsList } from './rawData';

describe('items lists', () => {
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
