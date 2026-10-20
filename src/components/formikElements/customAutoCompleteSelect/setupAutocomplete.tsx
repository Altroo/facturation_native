import { beforeEach, afterEach } from '@jest/globals';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react-native';
export { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';

// Native measurements are unavailable in Jest. Keep the real dropdown and provider.
const nativeMethods = jest.requireActual<{
	default: { measure: jest.Mock; measureInWindow: jest.Mock; focus: jest.Mock; blur: jest.Mock };
}>('@react-native/jest-preset/jest/MockNativeMethods').default;
const inputMethods = jest.requireActual<{
	default: { prototype: { isFocused: jest.Mock } };
}>('@react-native/jest-preset/jest/mocks/TextInput').default.prototype;
const focusedInputs = new Set<object>();

beforeEach(() => {
	jest.useFakeTimers();
	focusedInputs.clear();
	nativeMethods.focus.mockImplementation(function (this: object) {
		focusedInputs.clear();
		focusedInputs.add(this);
	});
	nativeMethods.blur.mockImplementation(function (this: object) {
		focusedInputs.delete(this);
	});
	inputMethods.isFocused.mockImplementation(function (this: object) {
		return focusedInputs.has(this);
	});
	nativeMethods.measure.mockImplementation((callback: (...values: number[]) => void) => callback(0, 0, 360, 800, 0, 0));
	nativeMethods.measureInWindow.mockImplementation((callback: (...values: number[]) => void) =>
		callback(0, 400, 360, 48),
	);
});

export const flushAutocomplete = async () => {
	for (let elapsed = 0; elapsed < 650; elapsed += 50) {
		await act(async () => await jest.advanceTimersByTimeAsync(50));
	}
};

export const toggleAutocomplete = async (label: string, index = 0) => {
	const button = screen.getAllByRole('button', { name: label }).at(index)!;
	const expanded = !!button.props.accessibilityState?.expanded;
	await fireEvent.press(button);
	await flushAutocomplete();
	await waitFor(() =>
		expect(screen.getAllByRole('button', { name: label }).at(index)!).toHaveProp(
			'accessibilityState',
			expect.objectContaining({
				disabled: false,
				expanded: !expanded,
			}),
		),
	);
};

afterEach(async () => {
	await cleanup();
	await act(async () => await jest.runOnlyPendingTimersAsync());
	jest.useRealTimers();
});
