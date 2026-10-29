import { render, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { expo } from '../../../../app.json';
import SplashLogo from '../../../../assets/facturation-logo.png';
import { colors } from '@/utils/themes';
import { translations } from '@/translations';
import AppSplash from './appSplash';
import { join } from 'node:path';

jest.mock('react-native-reanimated', () => {
	const Reanimated = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
	const { View, Image } = jest.requireActual<typeof import('react-native')>('react-native');
	return {
		...Reanimated,
		__esModule: true,
		useReducedMotion: jest.fn(() => false),
		default: { ...Reanimated.default, View, Image },
	};
});

describe('AppSplash', () => {
	it('shows the new branded lockup and loading feedback on the matching launch background', async () => {
		jest.mocked(useReducedMotion).mockReturnValue(false);
		await render(<AppSplash />);
		expect(screen.getByRole('image', { name: expo.name })).toHaveProp('source', SplashLogo);
		expect(screen.getByTestId('app-splash')).toHaveStyle({ backgroundColor: colors.splashBackground });
		expect(screen.getByLabelText(translations.fr.common.loading)).toBeOnTheScreen();
		expect(screen.getByRole('image', { name: expo.name }).props.entering).toBeDefined();
		expect(screen.getByTestId('app-splash').props.exiting).toBeDefined();
	});

	it('keeps the branding visible without entrance or exit motion when reduced motion is enabled', async () => {
		jest.mocked(useReducedMotion).mockReturnValue(true);
		await render(<AppSplash />);
		expect(screen.getByRole('image', { name: expo.name }).props.entering).toBeUndefined();
		expect(screen.getByTestId('app-splash').props.exiting).toBeUndefined();
	});
});

describe('Android launcher icon', () => {
	it('keeps the visible mark inside the adaptive-icon safe circle on a transparent foreground', async () => {
		const Jimp = jest.requireActual<{
			read: (path: string) => Promise<{ bitmap: { width: number; height: number; data: Uint8Array } }>;
		}>('jimp-compact');
		const { bitmap } = await Jimp.read(join(__dirname, '../../../..', expo.android.adaptiveIcon.foregroundImage));
		expect(bitmap.data[3]).toBe(0);
		let maxRadius = 0;
		for (let y = 0; y < bitmap.height; y++) {
			for (let x = 0; x < bitmap.width; x++) {
				if (bitmap.data[(y * bitmap.width + x) * 4 + 3] < 128) continue;
				maxRadius = Math.max(maxRadius, Math.hypot(x / bitmap.width - 0.5, y / bitmap.height - 0.5));
			}
		}
		expect(maxRadius).toBeGreaterThan(0);
		// Android reserves the central circle with a 66dp diameter in a 108dp layer.
		expect(maxRadius).toBeLessThanOrEqual(33 / 108);
	});
});
