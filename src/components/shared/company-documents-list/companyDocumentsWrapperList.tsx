import { type ComponentRef, type FC, type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useColorMode } from '@/providers/themeProvider';
import { useGetUserCompaniesQuery } from '@/store/services/company';
import { normalizeApiError } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { colors, surfaceStyles } from '@/utils/themes';

const SCROLL_BUTTON_WIDTH = 44;
const STORAGE_KEY = 'selectedCompanyIndex';

const saveCompanyIndex = async (index: number) => {
	try {
		await AsyncStorage.setItem(STORAGE_KEY, String(index));
	} catch {
		/* Company selection remains usable without device storage. */
	}
};

type Props = {
	children: (args: { company_id: number; role: string; raison_sociale: string; tabs: ReactNode }) => ReactNode;
};

const CompanyDocumentsWrapperList: FC<Props> = (props: Props) => {
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const query = useGetUserCompaniesQuery(undefined, { skip: !token });
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [ready, setReady] = useState(false);
	const [containerWidth, setContainerWidth] = useState(0);
	const [viewportWidth, setViewportWidth] = useState(0);
	const [contentWidth, setContentWidth] = useState(0);
	const [scrollOffset, setScrollOffset] = useState(0);
	const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
	const tabLayouts = useRef<Record<number, { x: number; width: number }>>({});
	const companies = query.currentData ?? [];
	const validIndex = selectedIndex < companies.length ? selectedIndex : 0;
	const selectedCompany = companies[validIndex] ?? null;
	const hasOverflow = containerWidth > 0 && contentWidth > containerWidth + 1;
	const maxOffset = Math.max(0, contentWidth - viewportWidth);

	useEffect(() => {
		let mounted = true;
		const restore = async () => {
			try {
				const saved = await AsyncStorage.getItem(STORAGE_KEY);
				const index = Number(saved);
				if (mounted && Number.isInteger(index) && index >= 0) setSelectedIndex(index);
			} catch {
				/* Use the first company when device storage is unavailable. */
			} finally {
				if (mounted) setReady(true);
			}
		};
		void restore();
		return () => {
			mounted = false;
		};
	}, []);

	const scrollToOffset = (offset: number) => {
		scrollRef.current?.scrollTo({ x: Math.max(0, Math.min(offset, maxOffset)), animated: true });
	};

	const revealTab = (layout: { x: number; width: number }) => {
		if (!viewportWidth) return;
		if (layout.x < scrollOffset) scrollRef.current?.scrollTo({ x: layout.x, animated: true });
		else if (layout.x + layout.width > scrollOffset + viewportWidth) {
			scrollRef.current?.scrollTo({ x: layout.x + layout.width - viewportWidth, animated: true });
		}
	};

	const revealSelectedTab = useEffectEvent(() => {
		const layout = selectedCompany && tabLayouts.current[selectedCompany.id];
		if (layout) revealTab(layout);
	});

	useEffect(() => {
		revealSelectedTab();
	}, [selectedCompany?.id, viewportWidth, contentWidth]);

	const handleChange = (newValue: number) => {
		if (!Number.isInteger(newValue) || !companies[newValue]) return;
		// Company pages remount their list when the company changes. Its horizontal
		// header starts at zero too; reveal the selected tab after that new layout.
		if (newValue !== validIndex) setScrollOffset(0);
		setSelectedIndex(newValue);
		void saveCompanyIndex(newValue);
		const layout = tabLayouts.current[companies[newValue].id];
		if (layout) revealTab(layout);
	};

	const renderScrollButton = (direction: -1 | 1) => {
		if (!hasOverflow) return null;
		const disabled = direction === -1 ? scrollOffset <= 1 : scrollOffset >= maxOffset - 1;
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={direction === -1 ? t.common.companiesScrollLeft : t.common.companiesScrollRight}
				accessibilityState={{ disabled }}
				disabled={disabled}
				onPress={() => scrollToOffset(scrollOffset + direction * viewportWidth * 0.8)}
				style={{ width: SCROLL_BUTTON_WIDTH }}
				className={`min-h-14 items-center justify-center ${disabled ? 'opacity-30' : 'active:bg-slate-100 dark:active:bg-slate-700'}`}
			>
				<MaterialIcons
					name={direction === -1 ? 'chevron-left' : 'chevron-right'}
					size={24}
					color={mode === 'dark' ? colors.slate[300] : colors.slate[600]}
				/>
			</Pressable>
		);
	};

	if (!ready || query.isLoading || query.isUninitialized) return <ApiProgress />;

	if (query.isError) {
		const axiosError = normalizeApiError(query.error);
		return <ApiAlert errorDetails={axiosError.status_code === 0 ? t.errors.networkError : axiosError.message} />;
	}

	if (!selectedCompany) {
		return (
			<View className="gap-2 rounded-2xl bg-white p-6 dark:bg-panel">
				<Text className="font-poppins-semibold text-ink dark:text-slate-100">{t.shared.noCompaniesFound}</Text>
				<Text className="font-sans text-slate-500 dark:text-slate-400">{t.shared.noCompaniesUserMessage}</Text>
			</View>
		);
	}

	const tabs = (
		<View
			testID="company-tabs"
			onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
			className="flex-row overflow-hidden"
			style={surfaceStyles[mode]}
		>
			{renderScrollButton(-1)}
			<ScrollView
				ref={scrollRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				bounces={false}
				onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
				onContentSizeChange={(width) => setContentWidth(width)}
				onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.x)}
				scrollEventThrottle={32}
				accessibilityLabel={t.common.companiesTabs}
				className="min-w-0 flex-1"
			>
				{companies.map((company, index) => (
					<Pressable
						key={company.id}
						accessibilityRole="tab"
						accessibilityLabel={company.raison_sociale}
						accessibilityState={{ selected: validIndex === index }}
						onPress={() => handleChange(index)}
						onLayout={(event) => {
							const { x, width } = event.nativeEvent.layout;
							tabLayouts.current[company.id] = { x, width };
							if (validIndex === index) revealTab({ x, width });
						}}
						style={
							containerWidth
								? { maxWidth: Math.max(0, containerWidth - (companies.length > 1 ? 2 * SCROLL_BUTTON_WIDTH : 0)) }
								: undefined
						}
						className={`min-h-14 justify-center border-b-[3px] px-4 py-3 active:bg-slate-100 dark:active:bg-slate-700 ${validIndex === index ? 'border-brand dark:border-blue-300' : 'border-transparent'}`}
					>
						<Text
							numberOfLines={1}
							className={
								validIndex === index
									? 'font-poppins-semibold text-brand dark:text-blue-300'
									: 'font-poppins-medium text-slate-600 dark:text-slate-300'
							}
						>
							{company.raison_sociale}
						</Text>
					</Pressable>
				))}
			</ScrollView>
			{renderScrollButton(1)}
		</View>
	);

	// The page places these tabs in its list header, so they share the cards' scroll.
	return props.children({
		company_id: selectedCompany.id,
		role: selectedCompany.role,
		raison_sociale: selectedCompany.raison_sociale,
		tabs,
	});
};

export default CompanyDocumentsWrapperList;
