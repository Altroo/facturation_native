import { type FC, type ReactNode, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import CustomTabs from '@/components/nativeElements/customTabs/customTabs';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useGetUserCompaniesQuery } from '@/store/services/company';
import { normalizeApiError } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';

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
	const query = useGetUserCompaniesQuery(undefined, { skip: !token });
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [ready, setReady] = useState(false);
	const companies = query.currentData ?? [];
	const validIndex = selectedIndex < companies.length ? selectedIndex : 0;
	const selectedCompany = companies[validIndex] ?? null;

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

	const handleChange = (newValue: number) => {
		if (!Number.isInteger(newValue) || !companies[newValue]) return;
		setSelectedIndex(newValue);
		void saveCompanyIndex(newValue);
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
		<CustomTabs
			testID="company-tabs"
			label={t.common.companiesTabs}
			scrollLeftLabel={t.common.companiesScrollLeft}
			scrollRightLabel={t.common.companiesScrollRight}
			items={companies.map((company, index) => ({ value: index, label: company.raison_sociale }))}
			value={validIndex}
			onChange={handleChange}
		/>
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
