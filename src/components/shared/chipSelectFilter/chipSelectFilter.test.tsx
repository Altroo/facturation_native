import { useState, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ChipSelectFilter from './chipSelectFilter';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
jest.mock('@/components/nativeElements/modals/bottomSheet/bottomSheet', () => {
	const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
	return function Sheet(props: {
		visible: boolean;
		children: ReactNode;
		title: string;
		testID: string;
		onClose: () => void;
	}) {
		return props.visible ? (
			<View testID={props.testID}>
				<Text accessibilityRole="header">{props.title}</Text>
				<Pressable accessibilityRole="button" accessibilityLabel="Close filter" onPress={props.onClose} />
				{props.children}
			</View>
		) : null;
	};
});

const t = translations.fr;
const options = [
	{ id: 1, nom: 'Casablanca' },
	{ id: 2, nom: 'Rabat' },
	{ id: 3, nom: 'Tanger' },
];
const commonProps = { label: 'Ville', placeholder: 'Toutes les villes', options };

const ControlledFilter = (props: { onChange: (ids: number[]) => void }) => {
	const [ids, setIds] = useState<number[]>([]);
	return (
		<ChipSelectFilter
			{...commonProps}
			selectedIds={ids}
			onChange={(nextIds) => {
				props.onChange(nextIds);
				setIds(nextIds);
			}}
		/>
	);
};

it('selects several IDs, deselects one, and clears the controlled selection', async () => {
	const onChange = jest.fn();
	await render(<ControlledFilter onChange={onChange} />);
	expect(screen.getByText(commonProps.placeholder)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: 'Ville' }));
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Rabat' }));
	expect(onChange).toHaveBeenLastCalledWith([2]);
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Casablanca' }));
	expect(onChange).toHaveBeenLastCalledWith([2, 1]);
	expect(screen.getByRole('checkbox', { name: 'Rabat' })).toBeChecked();
	expect(screen.getByRole('checkbox', { name: 'Casablanca' })).toBeChecked();
	await fireEvent.press(screen.getByRole('button', { name: 'Close filter' }));
	expect(screen.getByText('Casablanca, Rabat')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: 'Ville' }));
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Rabat' }));
	expect(onChange).toHaveBeenLastCalledWith([1]);
	await fireEvent.press(screen.getByRole('button', { name: t.shared.clearSelection }));
	expect(onChange).toHaveBeenLastCalledWith([]);
	expect(screen.getByRole('checkbox', { name: 'Casablanca' })).not.toBeChecked();
	await fireEvent.press(screen.getByRole('button', { name: 'Close filter' }));
	expect(screen.getByText(commonProps.placeholder)).toBeOnTheScreen();
});

it('searches choices without changing selected IDs and resets search when reopened', async () => {
	const onChange = jest.fn();
	await render(<ChipSelectFilter {...commonProps} selectedIds={[1]} onChange={onChange} />);
	await fireEvent.press(screen.getByRole('button', { name: 'Ville' }));
	await fireEvent.changeText(screen.getByPlaceholderText(t.common.search), '  RAB  ');
	expect(screen.getByRole('checkbox', { name: 'Rabat' })).toBeOnTheScreen();
	expect(screen.queryByRole('checkbox', { name: 'Casablanca' })).toBeNull();
	expect(onChange).not.toHaveBeenCalled();
	await fireEvent.changeText(screen.getByPlaceholderText(t.common.search), 'Missing city');
	expect(screen.getByText(t.common.noOptions)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: 'Close filter' }));
	await fireEvent.press(screen.getByRole('button', { name: 'Ville' }));
	expect(screen.getByPlaceholderText(t.common.search)).toHaveProp('value', '');
	expect(screen.getAllByRole('checkbox')).toHaveLength(3);
	expect(screen.getByRole('checkbox', { name: 'Casablanca' })).toBeChecked();
});

it('prevents opening while disabled and hides an open sheet when disabled', async () => {
	const onChange = jest.fn();
	await render(<ChipSelectFilter {...commonProps} selectedIds={[]} onChange={onChange} disabled />);
	await fireEvent.press(screen.getByRole('button', { name: 'Ville' }));
	expect(screen.queryByTestId('chip-select-filter')).toBeNull();
	await screen.rerender(<ChipSelectFilter {...commonProps} selectedIds={[]} onChange={onChange} />);
	await fireEvent.press(screen.getByRole('button', { name: 'Ville' }));
	expect(screen.getByTestId('chip-select-filter')).toBeOnTheScreen();
	await screen.rerender(<ChipSelectFilter {...commonProps} selectedIds={[]} onChange={onChange} disabled />);
	expect(screen.queryByTestId('chip-select-filter')).toBeNull();
	expect(onChange).not.toHaveBeenCalled();
});

it('handles an empty options response without offering an empty clear action', async () => {
	await render(<ChipSelectFilter {...commonProps} options={[]} selectedIds={[]} onChange={jest.fn()} />);
	await fireEvent.press(screen.getByRole('button', { name: 'Ville' }));
	expect(screen.getByText(t.common.noOptions)).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: t.shared.clearSelection })).toBeNull();
});
