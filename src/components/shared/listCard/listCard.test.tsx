import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import ListCard from './listCard';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

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
