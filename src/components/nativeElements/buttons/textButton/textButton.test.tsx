import { fireEvent, render, screen } from '@testing-library/react-native';
import TextButton from './textButton';

describe('TextButton', () => {
	it('provides a wrapping, accessible link with the web button contract', async () => {
		const onClick = jest.fn();
		await render(<TextButton buttonText="Atlas Client" onClick={onClick} />);
		await fireEvent.press(screen.getByRole('link', { name: 'Atlas Client' }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('preserves the disabled state', async () => {
		const onClick = jest.fn();
		await render(<TextButton buttonText="Atlas Client" onClick={onClick} disabled />);
		await fireEvent.press(screen.getByRole('link', { name: 'Atlas Client' }));
		expect(onClick).not.toHaveBeenCalled();
	});
});
