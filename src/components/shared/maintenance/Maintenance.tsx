import { type FC } from 'react';
import { Image, Text, Modal, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getWSMaintenanceState } from '@/store/selectors';
import Logo from '../../../../assets/facturation-logo.png';
import { brandLogoStyle, colors } from '@/utils/themes';

const Maintenance: FC = () => {
	const maintenance = useAppSelector(getWSMaintenanceState);
	const { t } = useLanguage();

	if (!maintenance) {
		return null;
	}
	return (
		<Modal visible animationType="fade" onRequestClose={() => {}}>
			<View
				testID="maintenance-gate"
				accessibilityViewIsModal
				className="flex-1 justify-center bg-slate-50 p-6 dark:bg-night"
			>
				<Image
					source={Logo}
					accessible
					accessibilityRole="image"
					accessibilityLabel={t.maintenance.logoAlt}
					className="mb-8"
					style={brandLogoStyle}
					resizeMode="contain"
				/>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="flex-row items-center gap-2 self-start rounded-full bg-orange-50 px-3 py-2 dark:bg-panel">
						<MaterialIcons name="build-circle" size={20} color={colors.maintenance} />
						<Text className="font-poppins-semibold text-orange-700 dark:text-orange-300">
							{t.maintenance.chipLabel}
						</Text>
					</View>
					<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">{t.maintenance.title}</Text>
					<Text className="font-sans text-ink dark:text-slate-100">{t.maintenance.description}</Text>
					<Text className="font-sans text-ink dark:text-slate-100">{t.maintenance.suspended}</Text>
					<Text className="font-sans text-ink dark:text-slate-100">{t.maintenance.comeBack}</Text>
				</View>
			</View>
		</Modal>
	);
};

export default Maintenance;
