import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LanguageContext } from '@/contexts/languageContext';
import { translations } from '@/translations';
import SelectAllControl from './selectAllControl';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

it('lets a parent complete a partial selection and then clear it', async () => {
	const Selection = () => {
		const [checked, setChecked] = useState<boolean | 'mixed'>('mixed');
		return (
			<SelectAllControl
				accessibilityLabel="Sélectionner les utilisateurs chargés"
				description="3 éléments chargés"
				checked={checked}
				selectedCount={checked === 'mixed' ? 1 : checked ? 3 : 0}
				onPress={() => setChecked(checked !== true)}
			/>
		);
	};
	await render(<Selection />);
	const control = () => screen.getByRole('checkbox', { name: 'Sélectionner les utilisateurs chargés' });
	expect(control()).toHaveProp('accessibilityState', { checked: 'mixed', disabled: false, busy: false });
	await fireEvent.press(control());
	expect(control()).toBeChecked();
	expect(screen.getByLabelText('3 sélectionné(s)')).toBeOnTheScreen();
	await fireEvent.press(control());
	expect(control()).not.toBeChecked();
	expect(screen.queryByLabelText('3 sélectionné(s)')).toBeNull();
});

it.each([{ disabled: true }, { loading: true }, { compact: true, disabled: true }, { compact: true, loading: true }])(
	'blocks selection while unavailable: %j',
	async (state) => {
		const onPress = jest.fn();
		await render(
			<SelectAllControl
				accessibilityLabel="Sélectionner les entreprises"
				description="2 résultats selon les filtres"
				checked={false}
				selectedCount={0}
				onPress={onPress}
				{...state}
			/>,
		);
		const control = screen.getByRole('checkbox', { name: 'Sélectionner les entreprises' });
		expect(control).toBeDisabled();
		await fireEvent.press(control);
		expect(onPress).not.toHaveBeenCalled();
	},
);

it('keeps compact selection accessible, including partial state and the full count behind its badge', async () => {
	const onPress = jest.fn();
	await render(
		<SelectAllControl
			compact
			accessibilityLabel="Select all results"
			description="125 results matching the filters"
			checked="mixed"
			selectedCount={120}
			onPress={onPress}
		/>,
	);
	const control = screen.getByRole('checkbox', { name: 'Select all results' });
	expect(control).toHaveProp('accessibilityState', { checked: 'mixed', disabled: false, busy: false });
	expect(control).toHaveProp('accessibilityValue', { text: '120 sélectionné(s)' });
	expect(control).toHaveProp('accessibilityHint', '125 results matching the filters');
	expect(screen.getByText('99+')).toBeOnTheScreen();
	expect(screen.queryByText('Tout sélectionner')).toBeNull();
	expect(screen.queryByText('125 results matching the filters')).toBeNull();
	await fireEvent.press(control);
	expect(onPress).toHaveBeenCalledTimes(1);
});

it('keeps its heading and selection announcement in the active language', async () => {
	await render(
		<LanguageContext.Provider value={{ language: 'en', t: translations.en, setLanguage: jest.fn() }}>
			<SelectAllControl
				accessibilityLabel={translations.en.shared.selectAllMatching(2)}
				description={translations.en.shared.matchingItems(2)}
				checked
				selectedCount={2}
				onPress={jest.fn()}
			/>
		</LanguageContext.Provider>,
	);
	expect(screen.getByText('Select all')).toBeOnTheScreen();
	expect(screen.getByText('2 results matching the filters')).toBeOnTheScreen();
	expect(screen.getByLabelText('2 selected')).toBeOnTheScreen();
});
