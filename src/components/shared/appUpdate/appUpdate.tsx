import { useEffect, useRef, useState } from 'react';
import { Platform, Text } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ActionModals from '@/components/nativeElements/modals/actionModal/actionModals';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { getAppVersions } from '@/store/selectors';
import { isNewerAppVersion, reloadApp } from '@/utils/helpers';
import { checkAppUpdate } from '@/utils/apiHelpers';
import { colors } from '@/utils/themes';

const AppUpdate = () => {
	const { localVersion, serverVersion, maintenance } = useAppSelector(getAppVersions);
	const installedNative = !__DEV__ && Platform.OS !== 'web';
	// HTTP bootstrap and live announcements both read Django's version_mobile.
	const availableVersion = serverVersion;
	const { t } = useLanguage();
	const { onError } = useToast();
	const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
	const [updating, setUpdating] = useState(false);
	const inFlight = useRef(false);
	const mounted = useRef(true);
	const latestState = useRef({ serverVersion, maintenance });

	useEffect(() => {
		latestState.current = { serverVersion, maintenance };
	}, [serverVersion, maintenance]);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	if (maintenance || !isNewerAppVersion(availableVersion, localVersion) || dismissedVersion === availableVersion)
		return null;
	const dismiss = () => {
		if (!inFlight.current) setDismissedVersion(availableVersion);
	};
	const update = async () => {
		if (installedNative || !serverVersion || inFlight.current) return;
		inFlight.current = true;
		setUpdating(true);
		try {
			const available = await checkAppUpdate(serverVersion);
			if (!mounted.current) return;
			if (!available || latestState.current.maintenance || latestState.current.serverVersion !== serverVersion) {
				onError(t.appUpdate.error);
				return;
			}
			await reloadApp();
		} catch {
			if (mounted.current) onError(t.appUpdate.error);
		} finally {
			inFlight.current = false;
			if (mounted.current) setUpdating(false);
		}
	};

	return (
		<ActionModals
			maxWidth="xs"
			fullWidth
			compact={installedNative}
			title={t.appUpdate.title}
			body={installedNative ? t.appUpdate.nativeBody : t.appUpdate.body}
			titleIcon={
				<MaterialIcons name={installedNative ? 'system-update-alt' : 'refresh'} size={24} color={colors.white} />
			}
			titleIconColor={colors.brand}
			onClose={dismiss}
			actions={
				installedNative
					? [{ active: true, text: t.common.close, onClick: dismiss, color: colors.brand }]
					: [
							{ active: false, text: t.appUpdate.later, onClick: dismiss, disabled: updating },
							{
								active: true,
								text: updating ? t.appUpdate.updating : t.appUpdate.update,
								onClick: () => void update(),
								disabled: updating,
								color: colors.brand,
							},
						]
			}
		>
			<Text className="mt-2 font-sans text-sm text-slate-500 dark:text-slate-300">
				{t.appUpdate.version} {availableVersion}
			</Text>
		</ActionModals>
	);
};

export default AppUpdate;
