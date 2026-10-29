import { ActivityIndicator, StatusBar, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeOut, Keyframe, useReducedMotion } from 'react-native-reanimated';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';
import { expo } from '../../../../app.json';
import SplashLogo from '../../../../assets/facturation-logo.png';

const logoEntrance = new Keyframe({
	0: { transform: [{ scale: 0.96 }] },
	100: { transform: [{ scale: 1 }] },
}).duration(320);
const splashExit = FadeOut.duration(180);

// The OS launch screen is static. This shared screen continues the same
// branding while the session initializes, then fades away when the app is ready.
const AppSplash = () => {
	const reduceMotion = useReducedMotion();
	const { width } = useWindowDimensions();
	const { t } = useLanguage();
	const size = Math.min(320, width - 48);
	return (
		<Animated.View
			testID="app-splash"
			exiting={reduceMotion ? undefined : splashExit}
			style={[
				StyleSheet.absoluteFill,
				{ backgroundColor: colors.splashBackground, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
			]}
		>
			<StatusBar barStyle="light-content" />
			<Animated.Image
				source={SplashLogo}
				accessible
				accessibilityRole="image"
				accessibilityLabel={expo.name}
				entering={reduceMotion ? undefined : logoEntrance}
				resizeMode="contain"
				style={{ width: size, height: size }}
			/>
			<ActivityIndicator
				accessibilityLabel={t.common.loading}
				color={colors.splashForeground}
				style={{ position: 'absolute', bottom: 48 }}
			/>
		</Animated.View>
	);
};

export default AppSplash;
