import { useEffect, useEffectEvent, useRef, type FC } from 'react';
import { AppState } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/utils/hooks';
import { useInitAccessToken } from '@/contexts/InitContext';
import { initAppAction, initAppSessionTokensAction } from '@/store/actions/_initActions';
import { useSession } from '@/providers/sessionProvider';
import { useGetGroupsQuery, useGetProfilQuery } from '@/store/services/account';
import { useGetUserCompaniesQuery } from '@/store/services/company';
import { notificationApi } from '@/store/services/notification';
import { accountSetGroupesAction, accountSetProfilAction } from '@/store/actions/accountActions';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import { initMaintenanceAction, startWSAction, stopWSAction } from '@/store/actions/wsActions';
import { getInitState, getProfilState } from '@/store/selectors';
import { initToken } from '@/store/slices/_initSlice';
import { auth } from '@/auth';

export const InitEffects: FC = () => {
	const session = useSession();
	const dispatch = useAppDispatch();
	const { status } = useAppSelector(getInitState);
	const profile = useAppSelector(getProfilState);
	const accessToken = useInitAccessToken();
	const skip = !accessToken || !session || status !== 'authenticated';
	const appInitializedRef = useRef(false);
	const { currentData: user, refetch: refetchProfile } = useGetProfilQuery(undefined, {
		skip,
		refetchOnMountOrArgChange: true,
	});
	const { currentData: groupes, refetch: refetchGroups } = useGetGroupsQuery(undefined, { skip });
	const { currentData: companies, refetch: refetchCompanies } = useGetUserCompaniesQuery(undefined, {
		skip,
		pollingInterval: 60000,
		refetchOnMountOrArgChange: true,
	});
	const handleSessionExpired = useEffectEvent(() => {
		// Logout owns the guest transition until recovery storage and API caches are cleared.
		if (status !== 'signingOut') dispatch(initToken());
	});
	useEffect(() => {
		const handler = () => {
			handleSessionExpired();
		};
		return auth.subscribeExpired(handler);
	}, []);
	useEffect(() => {
		if (!appInitializedRef.current) {
			dispatch(initAppAction());
			appInitializedRef.current = true;
		}
		return () => {
			appInitializedRef.current = false;
		};
	}, [dispatch]);
	// Same session -> action -> Saga -> Redux flow as the web. Native login
	// returns tokens separately from the profile, so profile edits also resync.
	useEffect(() => {
		if (status === 'authenticated' && session) {
			dispatch(initAppSessionTokensAction(session));
		}
		if (status === 'authenticated' && !session) dispatch(initToken());
	}, [status, session, profile, dispatch]);
	useEffect(() => {
		if (skip) return;
		if (user) dispatch(accountSetProfilAction(user));
		if (groupes) dispatch(accountSetGroupesAction(groupes));
		if (companies) dispatch(companiesSetUserCompaniesAction(companies));
	}, [dispatch, user, groupes, companies, skip]);
	useEffect(() => {
		const refreshMaintenance = () => dispatch(initMaintenanceAction());
		const updateSocket = (active: boolean) => dispatch(active && !skip ? startWSAction() : stopWSAction());
		refreshMaintenance();
		updateSocket(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
		const timer = setInterval(() => {
			if (AppState.currentState === 'active') refreshMaintenance();
		}, 30000);
		const listener = AppState.addEventListener('change', (state) => {
			updateSocket(state === 'active');
			if (state !== 'active') return;
			refreshMaintenance();
			if (!skip) {
				void refetchProfile();
				void refetchGroups();
				void refetchCompanies();
				dispatch(notificationApi.util.invalidateTags(['Notification']));
			}
		});
		return () => {
			clearInterval(timer);
			listener.remove();
			dispatch(stopWSAction());
		};
	}, [dispatch, skip, refetchProfile, refetchGroups, refetchCompanies]);
	return null;
};
