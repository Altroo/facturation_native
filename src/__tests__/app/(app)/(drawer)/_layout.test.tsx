import { render } from '@testing-library/react-native';
import type { NativeStackNavigationOptions } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DrawerStackLayout from '@/app/(app)/(drawer)/_layout';
let mockOptions: NativeStackNavigationOptions;
let mockRouteName = 'users/form';
let mockReduceMotion = false;
jest.mock('react-native-reanimated', () => ({
	...jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated'),
	useReducedMotion: () => mockReduceMotion,
}));
jest.mock('expo-router', () => ({
	Stack: Object.assign(
		(props: { screenOptions: (args: { route: { name: string } }) => NativeStackNavigationOptions }) => {
			mockOptions = props.screenOptions({ route: { name: mockRouteName } });
			return null;
		},
		{ Screen: () => null },
	),
}));
jest.mock('expo-router/drawer', () => ({ DrawerToggleButton: () => null }));
const setup = async () => {
	await render(
		<SafeAreaProvider
			initialMetrics={{
				frame: { x: 0, y: 0, width: 390, height: 844 },
				insets: { top: 0, right: 0, bottom: 0, left: 0 },
			}}
		>
			<DrawerStackLayout />
		</SafeAreaProvider>,
	);
};
beforeEach(() => {
	mockRouteName = 'users/form';
	mockReduceMotion = false;
});

it('preserves the native navbar and original back icon', async () => {
	await setup();
	expect(mockOptions.header).toBeUndefined();
	expect(mockOptions.headerBackIcon).toBeUndefined();
	expect(mockOptions.headerBackImageSource).toBeUndefined();
	expect(mockOptions.headerStyle).not.toHaveProperty('height');
	expect(mockOptions.headerTitleAlign).toBe('left');
	expect(mockOptions.headerBackVisible).toBe(true);
});

it.each([
	['future-module/index', 'slide_from_right'],
	['notifications/index', 'slide_from_bottom'],
	['settings/index', 'slide_from_bottom'],
])('uses the shared transition for %s and respects Reduced Motion', async (route, animation) => {
	mockRouteName = route;
	await setup();
	expect(mockOptions.animation).toBe(animation);
	mockReduceMotion = true;
	await setup();
	expect(mockOptions.animation).toBe('none');
});
