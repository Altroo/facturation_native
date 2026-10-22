import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import PrimaryLoadingButton from './primaryLoadingButton';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/utils/themes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

it.each([false, true])('keeps the add icon and text in the shared foreground, inverted=%s', async (inverted) => {
	await render(
		<PrimaryLoadingButton
			buttonText="Ajouter"
			loading={false}
			active
			inverted={inverted}
			startIcon={<MaterialIcons name="add" size={20} color={colors.slate[400]} />}
		/>,
	);
	const icon = screen.container.queryAll((node) => node.props.name === 'add')[0];
	expect(icon).toHaveProp('color', inverted ? colors.brand : colors.white);
	expect(screen.getByRole('button')).toHaveProp(
		'className',
		expect.stringContaining(inverted ? 'bg-white' : 'bg-brand'),
	);
});

it('uses original buttonText/onClick/startIcon props and keeps its native test ID', async () => {
	const onClick = jest.fn();
	await render(
		<PrimaryLoadingButton
			buttonText="Enregistrer"
			active
			loading={false}
			onClick={onClick}
			startIcon={<Text>Save icon</Text>}
			testID="save-record"
		/>,
	);
	const button = screen.getByRole('button', { name: 'Enregistrer' });
	expect(screen.getByTestId('save-record')).toBe(button);
	expect(screen.getByText('Save icon')).toBeOnTheScreen();
	await fireEvent.press(button);
	expect(onClick).toHaveBeenCalledTimes(1);
});

it('keeps an icon-only action labelled for accessibility without rendering its text', async () => {
	const onClick = jest.fn();
	await render(
		<PrimaryLoadingButton
			buttonText="Supprimer"
			active
			loading={false}
			onClick={onClick}
			iconOnly
			danger
			inverted
			startIcon={<MaterialIcons name="delete-outline" size={20} color={colors.danger} />}
		/>,
	);
	const button = screen.getByRole('button', { name: 'Supprimer' });
	expect(screen.queryByText('Supprimer')).toBeNull();
	expect(screen.container.queryAll((node) => node.props.name === 'delete-outline')).toHaveLength(1);
	expect(button).toHaveProp('className', expect.stringContaining('h-12 w-12 shrink-0 p-0'));
	await fireEvent.press(button);
	expect(onClick).toHaveBeenCalledTimes(1);
});

it.each([
	{ active: false, loading: false },
	{ active: undefined, loading: false },
	{ active: true, loading: true },
])('blocks presses with the original active contract %o', async (state) => {
	const onClick = jest.fn();
	await render(<PrimaryLoadingButton buttonText="Enregistrer" onClick={onClick} {...state} />);
	const button = screen.getByRole('button', { name: 'Enregistrer' });
	expect(button).toBeDisabled();
	expect(button).toHaveProp('accessibilityState', { disabled: true, busy: state.loading });
	await fireEvent.press(button);
	expect(onClick).not.toHaveBeenCalled();
});
it('preserves the label and icon layout under a centered loader, then restores presses', async () => {
	const onClick = jest.fn();
	const view = await render(
		<PrimaryLoadingButton
			buttonText="Supprimer"
			active
			loading
			onClick={onClick}
			danger
			inverted
			startIcon={<Text>Delete icon</Text>}
			cssClass="self-end"
		/>,
	);
	expect(screen.getByText('Supprimer')).toBeOnTheScreen();
	expect(screen.getByText('Delete icon')).toBeOnTheScreen();
	expect(screen.container.queryAll((node) => /ActivityIndicator/.test(node.type))[0]).toHaveStyle({
		position: 'absolute',
	});
	expect(screen.getByRole('button')).toHaveProp('className', expect.stringContaining('self-end'));
	await view.rerender(
		<PrimaryLoadingButton
			buttonText="Supprimer"
			active
			loading={false}
			onClick={onClick}
			danger
			inverted
			startIcon={<Text>Delete icon</Text>}
		/>,
	);
	expect(screen.container.queryAll((node) => /ActivityIndicator/.test(node.type))[0] ?? null).toBeNull();
	expect(screen.getByText('Delete icon')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: 'Supprimer' }));
	expect(onClick).toHaveBeenCalledTimes(1);
});

describe('PrimaryLoadingButton', () => {
	const mockClick = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders button with correct text', async () => {
		await render(<PrimaryLoadingButton buttonText="Load" loading={false} active={true} />);
		expect(screen.getByRole('button', { name: 'Load' })).toBeOnTheScreen();
	});

	it('renders as disabled when active is false', async () => {
		await render(<PrimaryLoadingButton buttonText="Load" loading={false} active={false} />);
		expect(screen.getByRole('button', { name: 'Load' })).toBeDisabled();
	});

	it('calls onClick when button is clicked and active is true', async () => {
		await render(<PrimaryLoadingButton buttonText="Load" loading={false} active={true} onClick={mockClick} />);
		await fireEvent.press(screen.getByRole('button', { name: 'Load' }));
		expect(mockClick).toHaveBeenCalled();
	});

	it('does not call onClick when button is disabled', async () => {
		await render(<PrimaryLoadingButton buttonText="Load" loading={false} active={false} onClick={mockClick} />);
		await fireEvent.press(screen.getByRole('button', { name: 'Load' }));
		expect(mockClick).not.toHaveBeenCalled();
	});

	it('applies custom class when cssClass is provided', async () => {
		await render(<PrimaryLoadingButton buttonText="Load" loading={false} active={true} cssClass="custom-class" />);
		const button = screen.getByRole('button', { name: 'Load' });
		expect(button).toHaveProp('className', expect.stringContaining('custom-class'));
	});

	it('applies the inverse primary style when requested', async () => {
		await render(<PrimaryLoadingButton buttonText="Inverse" loading={false} active inverted />);
		expect(screen.getByRole('button', { name: 'Inverse' })).toHaveProp(
			'className',
			expect.stringContaining('bg-white'),
		);
	});
});
