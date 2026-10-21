import { render, screen } from '@testing-library/react-native';
import CustomBooleanBadge from './customBooleanBadge';
import { colors } from '@/utils/themes';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
const t = translations.fr;

it.each([
	{ value: true, icon: 'check-circle', color: colors.success, answer: t.common.yes },
	{ value: false, icon: 'cancel', color: colors.danger, answer: t.common.no },
])('shows the $icon for $value without visible yes/no text when requested', async ({ value, icon, color, answer }) => {
	await render(<CustomBooleanBadge label="Admin" value={value} showValue={false} />);
	expect(screen.getByText('Admin')).toBeOnTheScreen();
	expect(screen.queryByText(`Admin: ${answer}`)).toBeNull();
	expect(screen.getByLabelText(`Admin: ${answer}`)).toBeOnTheScreen();
	expect(screen.getByTestId('boolean-badge-icon')).toHaveProp('name', icon);
	expect(screen.getByTestId('boolean-badge-icon')).toHaveProp('color', color);
});

it('keeps visible yes/no text for active status and does not treat missing data as false', async () => {
	const { rerender } = await render(<CustomBooleanBadge label="Active" value={false} />);
	expect(screen.getByText(`Active: ${t.common.no}`)).toBeOnTheScreen();
	await rerender(<CustomBooleanBadge label="Active" />);
	expect(screen.getByText(`Active: ${t.common.noData}`)).toBeOnTheScreen();
	expect(screen.getByTestId('boolean-badge-icon')).toHaveProp('name', 'help-outline');
});
