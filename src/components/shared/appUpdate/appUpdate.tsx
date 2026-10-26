import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Text } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ActionModals from '@/components/nativeElements/modals/actionModal/actionModals';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { getAccessToken, getAppVersions } from '@/store/selectors';
import { useGetChangelogQuery } from '@/store/services/changelog';
import { isNewerAppVersion, reloadApp } from '@/utils/helpers';
import { checkAppUpdate } from '@/utils/apiHelpers';
import { colors } from '@/utils/themes';

const AppUpdate = () => {
	const { localVersion, serverVersion, maintenance } = useAppSelector(getAppVersions);
	const accessToken = useAppSelector(getAccessToken);
	const installedNative = !__DEV__ && Platform.OS !== 'web';
	const history = useGetChangelogQuery(undefined, {
		skip: !installedNative || !accessToken,
		refetchOnMountOrArgChange: true,
	});
	// Shared version numbers do not mean every web-only release updates mobile.
	const mobileVersion =
		history.data?.reduce<string | null>(
			(latest, entry) =>
				(entry.platform === 'mobile' || entry.platform === 'both') && isNewerAppVersion(entry.version, latest)
					? entry.version
					: latest,
			localVersion,
		) ?? null;
	const availableVersion = installedNative ? mobileVersion : serverVersion;
	const { t } = useLanguage();
	const { onError } = useToast();
	const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
	const [updating, setUpdating] = useState(false);
	const inFlight = useRef(false);
	const mounted = useRef(true);
	const latestState = useRef({ serverVersion, maintenance });
	const lastAnnouncement = useRef(serverVersion);
	const { refetch, isUninitialized } = history;

	useEffect(() => {
		if (!installedNative || !accessToken || isUninitialized) return;
		const listener = AppState.addEventListener('change', (state) => {
			if (state === 'active') void refetch();
		});
		return () => listener.remove();
	}, [installedNative, accessToken, isUninitialized, refetch]);

	useEffect(() => {
		if (!installedNative || !accessToken || isUninitialized || lastAnnouncement.current === serverVersion) return;
		lastAnnouncement.current = serverVersion;
		void refetch();
	}, [installedNative, accessToken, isUninitialized, serverVersion, refetch]);

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
