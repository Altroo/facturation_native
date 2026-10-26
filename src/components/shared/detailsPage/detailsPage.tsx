import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { colors, listSpacing } from '@/utils/themes';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';

type Props = {
	children: ReactNode;
	onRefresh?: () => void;
	refreshing?: boolean;
	actions?: ReactNode;
	onEndReached?: () => void;
};

// All view pages use this parent. Page spacing, background and scrolling are
// defined here; each module only supplies its fields and refresh request.
const DetailsPage = (props: Props) => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<ScrollView
			testID="details-page"
			className="flex-1 bg-slate-50 dark:bg-night"
			keyboardShouldPersistTaps="handled"
			scrollEventThrottle={props.onEndReached ? 100 : undefined}
			onScroll={
				props.onEndReached
					? ({ nativeEvent }) => {
							if (
								nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
								nativeEvent.contentSize.height - 200
							)
								props.onEndReached?.();
						}
					: undefined
			}
			contentContainerStyle={{
				padding: listSpacing,
				paddingBottom: props.actions ? listSpacing : 48,
				gap: listSpacing,
				flexGrow: 1,
			}}
			refreshControl={
				props.onRefresh ? (
					<RefreshControl
						refreshing={props.refreshing ?? false}
						onRefresh={props.onRefresh}
						tintColor={colors.brand}
						colors={[colors.brand]}
					/>
				) : undefined
			}
		>
			{props.children}
		</ScrollView>
		{props.actions && <PageActionBar>{props.actions}</PageActionBar>}
	</View>
);

export default DetailsPage;
