import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import {
	AutocompleteDropdownContextProvider,
	flushAutocomplete,
} from '@/components/formikElements/customAutoCompleteSelect/setupAutocomplete';
import CustomAutoCompleteSelect from '@/components/formikElements/customAutoCompleteSelect/customAutoCompleteSelect';
import KeyboardAwareScrollView from './keyboardAwareScrollView';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));

it('reserves suggestion space on focus, preserves the scroll ref, and restores caller offsets on blur', async () => {
	const ref = createRef<KeyboardAwareScrollViewRef>();
	const items = Array.from({ length: 10 }, (_, index) => ({ value: String(index), code: 'Company ' + index }));
	await render(
		<KeyboardAwareScrollView ref={ref} testID="form-scroll" bottomOffset={40} extraKeyboardSpace={12}>
			<CustomAutoCompleteSelect label="Company" items={items} value={null} noOptionsText="None" />
		</KeyboardAwareScrollView>,
		{ wrapper: AutocompleteDropdownContextProvider },
	);
	expect(ref.current?.scrollTo).toBeDefined();
	expect(screen.getByTestId('form-scroll')).toHaveProp('bottomOffset', 40);
	expect(screen.getByTestId('form-scroll')).toHaveProp('extraKeyboardSpace', 12);
	const input = screen.getByRole('combobox', { name: 'Company' });
	await fireEvent(input, 'focus');
	expect(screen.getByTestId('form-scroll').props.bottomOffset).toBeGreaterThan(40);
	expect(screen.getByTestId('form-scroll').props.extraKeyboardSpace).toBeGreaterThan(12);
	await flushAutocomplete();
	expect(screen.getAllByRole('radio')).toHaveLength(items.length);
	await fireEvent.changeText(input, 'Company 1');
	expect(input).toHaveProp('value', 'Company 1');
	expect(screen.getAllByRole('radio')).toHaveLength(1);
	await fireEvent(input, 'blur', { nativeEvent: { target: 1 } });
	expect(screen.getByTestId('form-scroll')).toHaveProp('bottomOffset', 40);
	expect(screen.getByTestId('form-scroll')).toHaveProp('extraKeyboardSpace', 12);
	expect(screen.queryByRole('radio')).toBeNull();
});
