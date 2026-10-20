import { createContext, type FC, type PropsWithChildren, useContext } from 'react';
import { useAppSelector } from '@/utils/hooks';
import type { AppSession, InitStateInterface, InitStateToken } from '@/types/_initTypes';
import { emptyInitStateToken } from '@/store/slices/_initSlice';
import { getInitStateToken } from '@/store/selectors';
import { getAccessTokenFromSession } from '@/store/session';

const InitContext = createContext<InitStateInterface<InitStateToken>>({
	initStateToken: emptyInitStateToken,
});

export const InitContextProvider: FC<PropsWithChildren<Record<string, unknown>>> = (props) => {
	const initState = useAppSelector(getInitStateToken);

	const contextValue: InitStateInterface<InitStateToken> = {
		initStateToken: initState || emptyInitStateToken,
	};

	return <InitContext.Provider value={contextValue}>{props.children}</InitContext.Provider>;
};

export const useInitContext = (): InitStateInterface<InitStateToken> => useContext(InitContext);

export const useInitAccessToken = (session?: AppSession): string | undefined => {
	const { initStateToken } = useInitContext();
	return initStateToken.access ?? getAccessTokenFromSession(session);
};
