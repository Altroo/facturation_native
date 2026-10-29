import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import ListCard from './listCard';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

describe('ListCard', () => {
	it('combines controlled selection, module content and actions inside the identified card', async () => {
		const onChange = jest.fn();
		const { rerender } = await render(
			<ListCard
				testID="record"
				selection={{ label: 'Select Atlas', checked: false, onChange }}
				actions={<Text>Actions</Text>}
			>
				<Text>Atlas</Text>
			</ListCard>,
		);
		const card = within(screen.getByTestId('record'));
		expect(card.getByText('Atlas')).toBeOnTheScreen();
		expect(card.getByText('Actions')).toBeOnTheScreen();
		await fireEvent.press(card.getByRole('checkbox'));
		expect(onChange).toHaveBeenCalledWith(true);
		await rerender(
			<ListCard testID="record">
				<Text>Atlas</Text>
			</ListCard>,
		);
		expect(screen.queryByRole('checkbox')).toBeNull();
		expect(screen.queryByText('Actions')).toBeNull();
		expect(screen.getByText('Atlas')).toBeOnTheScreen();
	});

	it('opens details from the card while selection and its menu remain independent', async () => {
		const onPress = jest.fn();
		const onSelect = jest.fn();
		const onActions = jest.fn();
		const props = {
			header: <Text>Atlas</Text>,
			onPress,
			accessibilityLabel: 'View Atlas',
			selection: { label: 'Select Atlas', checked: false, onChange: onSelect },
			actions: (
				<Pressable accessibilityRole="button" accessibilityLabel="Actions" onPress={onActions}>
					<Text>More</Text>
				</Pressable>
			),
		};
		const { rerender } = await render(
			<ListCard {...props}>
				<Text>Casablanca</Text>
			</ListCard>,
		);
		await fireEvent.press(screen.getByRole('checkbox', { name: 'Select Atlas' }));
		await fireEvent.press(screen.getByRole('button', { name: 'Actions' }));
		expect(onSelect).toHaveBeenCalledWith(true);
		expect(onActions).toHaveBeenCalledTimes(1);
		expect(onPress).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: 'View Atlas' }));
		expect(onPress).toHaveBeenCalledTimes(1);
		await fireEvent.press(screen.getByText('Casablanca'));
		expect(onPress).toHaveBeenCalledTimes(2);
		await rerender(
			<ListCard {...props} disabled>
				<Text>Casablanca</Text>
			</ListCard>,
		);
		await fireEvent.press(screen.getByRole('button', { name: 'View Atlas' }));
		expect(onPress).toHaveBeenCalledTimes(2);
	});
});
