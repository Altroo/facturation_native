import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import ListCardActions from './listCardActions';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

it('only exposes edit when supplied and forwards each navigation callback', async () => {
	const onView = jest.fn();
	const onEdit = jest.fn();
	const { rerender } = await render(
		<ListCardActions onView={onView}>
			<Text>Module actions</Text>
		</ListCardActions>,
	);
	expect(screen.queryByRole('button', { name: translations.fr.common.edit })).toBeNull();
	expect(screen.getByText('Module actions')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.view }));
	expect(onView).toHaveBeenCalledTimes(1);
	await rerender(<ListCardActions onView={onView} onEdit={onEdit} />);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.edit }));
	expect(onEdit).toHaveBeenCalledTimes(1);
});

it('blocks navigation while the page is busy', async () => {
	const onView = jest.fn();
	const onEdit = jest.fn();
	await render(<ListCardActions onView={onView} onEdit={onEdit} disabled />);
	for (const button of screen.getAllByRole('button')) {
		expect(button).toBeDisabled();
		await fireEvent.press(button);
	}
	expect(onView).not.toHaveBeenCalled();
	expect(onEdit).not.toHaveBeenCalled();
});
