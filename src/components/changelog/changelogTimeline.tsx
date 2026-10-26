import type { ReactNode } from 'react';
import { FlatList, Text, View } from 'react-native';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import type { ChangelogEntry } from '@/types/changelogTypes';
import type { Language } from '@/types/languageTypes';
import { colors, listSpacing } from '@/utils/themes';

type Props = {
	entries: ChangelogEntry[];
	language: Language;
	refreshing: boolean;
	onRefresh?: () => void;
	header?: ReactNode;
	empty?: ReactNode;
};

export const ChangelogTimeline = (props: Props) => {
	const dateFormat = new Intl.DateTimeFormat(props.language === 'fr' ? 'fr-FR' : 'en-US', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	});
	return (
		<FlatList
			testID="changelog-timeline"
			className="flex-1"
			data={props.entries}
			keyExtractor={(entry) => String(entry.id)}
			contentContainerStyle={{ padding: listSpacing, gap: listSpacing, flexGrow: 1 }}
			refreshing={props.refreshing}
			onRefresh={props.onRefresh}
			ListHeaderComponent={props.header ? <>{props.header}</> : undefined}
			ListEmptyComponent={props.empty ? <>{props.empty}</> : undefined}
			renderItem={({ item: entry }) => (
				<SectionCard title={entry[`title_${props.language}`]} icon="new-releases">
					<View className="flex-row flex-wrap items-center gap-2">
						<Text className="flex-1 font-poppins-medium text-xs text-slate-500 dark:text-slate-400">
							{dateFormat.format(new Date(`${entry.date}T00:00:00Z`))}
						</Text>
						{!!entry.version && (
							<Text className="rounded-full bg-blue-50 px-3 py-1 font-poppins-medium text-xs text-brand dark:bg-slate-800 dark:text-blue-300">
								Version {entry.version}
							</Text>
						)}
					</View>
					{entry[`changes_${props.language}`].map((change, index) => (
						<View key={index} className="flex-row items-start gap-3">
							<View className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.brand }} />
							<Text className="flex-1 font-sans text-sm leading-6 text-ink dark:text-slate-200">{change}</Text>
						</View>
					))}
				</SectionCard>
			)}
		/>
	);
};
