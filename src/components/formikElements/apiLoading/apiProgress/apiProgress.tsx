import { type FC, type ReactNode } from 'react';
import { ActivityIndicator, type StyleProp, Text, View, type ViewStyle } from 'react-native';
import { useColorMode } from '@/providers/themeProvider';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	cssStyle?: StyleProp<ViewStyle>;
	children?: ReactNode;
	backdropColor?: string;
	circularColor?: string;
};

const ApiProgress: FC<Props> = (props: Props) => {
	const { t } = useLanguage();
	const { mode } = useColorMode();
	return (
		<View
			testID="api-backdrop"
			className="flex-1 items-center justify-center gap-3 bg-slate-50 p-8 dark:bg-night"
			style={[
				props.backdropColor
					? {
							backgroundColor:
								props.backdropColor.toLowerCase() === colors.white && mode === 'dark'
									? colors.night
									: props.backdropColor,
						}
					: undefined,
				props.cssStyle,
			]}
		>
			<ActivityIndicator
				accessible
				testID="api-loader"
				accessibilityRole="progressbar"
				accessibilityLabel={t.common.loading}
				color={
					props.circularColor?.toLowerCase() === colors.ink && mode === 'dark'
						? colors.slate[100]
						: (props.circularColor ?? colors.brand)
				}
			/>
			<Text className="font-sans text-ink dark:text-slate-100">{t.common.loading}</Text>
		</View>
	);
};

export default ApiProgress;
