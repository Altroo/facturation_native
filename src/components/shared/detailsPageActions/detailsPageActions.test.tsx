import { fireEvent, render, screen } from '@testing-library/react-native';
import { translations } from '@/translations';
import DetailsPageActions from './detailsPageActions';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations[mockLanguage],
	}),
}));

let mockLanguage: 'fr' | 'en';

beforeEach(() => {
	mockLanguage = 'fr';
});

it('does not reserve space when the page supplies no permitted actions', async () => {
	await render(<DetailsPageActions />);
	expect(screen.queryByTestId('details-page-actions')).toBeNull();
	expect(screen.queryByRole('button')).toBeNull();
});

it.each(['fr', 'en'] as const)('provides a compact delete icon and a labelled edit action in %s', async (language) => {
	mockLanguage = language;
	const t = translations[language];
	const onEdit = jest.fn();
	const onDelete = jest.fn();
	await render(<DetailsPageActions onEdit={onEdit} onDelete={onDelete} />);
	expect(screen.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
		t.common.delete,
		t.common.edit,
	]);
	expect(screen.queryByText(t.common.delete)).toBeNull();
	expect(screen.getByText(t.common.edit)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: t.common.delete })).toHaveProp(
		'className',
		expect.stringContaining('h-12 w-12 shrink-0 p-0'),
	);
	expect(screen.getByRole('button', { name: t.common.edit })).toHaveProp(
		'className',
		expect.stringContaining('flex-1'),
	);
	await fireEvent.press(screen.getByRole('button', { name: t.common.edit }));
	expect(onEdit).toHaveBeenCalledTimes(1);
	expect(onDelete).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
	expect(onDelete).toHaveBeenCalledTimes(1);
});

it('uses the company suspension action without offering deletion', async () => {
	const onSuspend = jest.fn();
	await render(<DetailsPageActions onEdit={jest.fn()} onSuspend={onSuspend} />);
	expect(screen.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
		translations.fr.companies.suspendBtn,
		translations.fr.common.edit,
	]);
	expect(screen.queryByRole('button', { name: translations.fr.common.delete })).toBeNull();
	expect(screen.queryByText(translations.fr.companies.suspendBtn)).toBeNull();
	expect(screen.getByRole('button', { name: translations.fr.companies.suspendBtn })).toHaveProp(
		'className',
		expect.stringContaining('h-12 w-12 shrink-0 p-0'),
	);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.suspendBtn }));
	expect(onSuspend).toHaveBeenCalledTimes(1);
});

it.each(['disabled', 'loading'] as const)('blocks all actions while %s', async (state) => {
	const onEdit = jest.fn();
	const onDelete = jest.fn();
	await render(<DetailsPageActions onEdit={onEdit} onDelete={onDelete} {...{ [state]: true }} />);
	for (const button of screen.getAllByRole('button')) {
		expect(button).toBeDisabled();
		await fireEvent.press(button);
	}
	expect(onEdit).not.toHaveBeenCalled();
	expect(onDelete).not.toHaveBeenCalled();
	expect(screen.getByRole('button', { name: translations.fr.common.delete })).toHaveProp('accessibilityState', {
		disabled: true,
		busy: state === 'loading',
	});
});

it('does not invent a destructive action for an edit-only page', async () => {
	await render(<DetailsPageActions onEdit={jest.fn()} />);
	expect(screen.getAllByRole('button')).toHaveLength(1);
	expect(screen.getByRole('button', { name: translations.fr.common.edit })).toBeOnTheScreen();
});
