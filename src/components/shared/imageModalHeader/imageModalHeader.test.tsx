import { fireEvent, render, screen } from '@testing-library/react-native';
import ImageModalHeader from './imageModalHeader';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));

it('labels the image modal and closes through the shared X button', async () => {
	const onClose = jest.fn();
	await render(<ImageModalHeader title="Logo" onClose={onClose} />);
	expect(screen.getByRole('header', { name: 'Logo' })).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
	expect(onClose).toHaveBeenCalledTimes(1);
});

it('prevents dismissal while an image is being saved', async () => {
	const onClose = jest.fn();
	await render(<ImageModalHeader title="Photo" onClose={onClose} disabled />);
	const button = screen.getByRole('button', { name: translations.fr.common.close });
	expect(button).toBeDisabled();
	await fireEvent.press(button);
	expect(onClose).not.toHaveBeenCalled();
});
