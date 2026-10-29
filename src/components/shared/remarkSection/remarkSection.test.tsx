import { fireEvent, render, screen } from '@testing-library/react-native';
import RemarkSection from './remarkSection';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));

describe('RemarkSection', () => {
	it('provides the shared card with one title icon and an accessible four-line field', async () => {
		const onChangeText = jest.fn();
		await render(<RemarkSection value="Draft note" onChangeText={onChangeText} />);
		const label = translations.fr.documentForm.remarqueLabel;
		expect(screen.getByRole('header', { name: label })).toBeOnTheScreen();
		expect(screen.getAllByText(label)).toHaveLength(1);
		const input = screen.getByLabelText(label);
		expect(input).toHaveProp('multiline', true);
		expect(input).toHaveProp('numberOfLines', 4);
		expect(screen.container.queryAll((node) => node.props.name === 'notes')).toHaveLength(1);
		await fireEvent.changeText(input, 'Updated note');
		expect(onChangeText).toHaveBeenCalledWith('Updated note');
	});

	it('preserves validation and disabled state supplied by any form', async () => {
		await render(<RemarkSection value="Saved" label="Note" error helperText="Invalid note" disabled />);
		expect(screen.getByRole('alert')).toHaveTextContent('Invalid note');
		expect(screen.getByLabelText('Note')).toBeDisabled();
		expect(screen.container.queryAll((node) => node.props.name === 'lock-outline')).toHaveLength(0);
	});
});
