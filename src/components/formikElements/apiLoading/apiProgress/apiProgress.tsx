import { type FC } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useColorMode } from '@/providers/themeProvider';
import { useLanguage } from '@/utils/hooks';
import type { ApiProgressProps as Props } from '@/types/uiTypes';

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
								props.backdropColor.toUpperCase() === '#FFFFFF' && mode === 'dark' ? '#121722' : props.backdropColor,
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
					props.circularColor?.toUpperCase() === '#0D070B' && mode === 'dark'
						? '#f1f5f9'
						: (props.circularColor ?? '#0274d7')
				}
			/>
			<Text className="font-sans text-ink dark:text-slate-100">{t.common.loading}</Text>
		</View>
	);
};

export default ApiProgress;
