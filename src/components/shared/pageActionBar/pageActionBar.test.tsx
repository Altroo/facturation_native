import { Platform, Pressable, Text, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PageActionBar from './pageActionBar';
import { colors } from '@/utils/themes';

jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
let mockMode: 'light' | 'dark' = 'light';
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: mockMode }) }));
afterEach(() => jest.restoreAllMocks());

describe.each(['ios', 'android'] as const)('%s action bar', (platform) => {
	it.each(['light', 'dark'] as const)(
		'reserves layout space, protects the safe area, and keeps actions usable in %s mode',
		async (mode) => {
			jest.replaceProperty(Platform, 'OS', platform);
			mockMode = mode;
			const save = jest.fn();
			await render(
				<PageActionBar>
					<Pressable accessibilityRole="button" onPress={save}>
						<Text>Save</Text>
					</Pressable>
				</PageActionBar>,
			);
			const bar = screen.getByTestId('page-action-bar');
			expect(bar).toHaveProp('edges', { bottom: 'additive', left: 'additive', right: 'additive', top: 'off' });
			expect(bar).toHaveStyle({ flexShrink: 0, backgroundColor: mode === 'dark' ? colors.panel : colors.white });
			expect(StyleSheet.flatten(bar.props.style).position).not.toBe('absolute');
			await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
			expect(save).toHaveBeenCalledTimes(1);
		},
	);
});
