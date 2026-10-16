import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { auth } from '@/auth';
import type { Tokens } from '@/types/accountTypes';

// Same session check interval as the web provider; auth.refresh checks expiry.
const REFETCH_INTERVAL = 4 * 60; // seconds

// NextAuth's browser provider is replaced by the existing Django native session client.
const SessionContext = createContext<Tokens | null>(null);
export const useSession = () => useContext(SessionContext);
const SessionProvider = ({ children }: PropsWithChildren) => {
	const session = useSyncExternalStore(auth.subscribe, auth.getSession, () => null);
	const hasSession = session !== null;
	useEffect(() => {
		if (!hasSession) return;
		let timer: ReturnType<typeof setInterval> | undefined;
		const refreshSession = () => {
			// Expected failures are returned. Expiry emits the existing login/toast event;
			// transient failures retain the session and retry on the next check or request.
			void auth.refresh();
		};
		const update = (state: typeof AppState.currentState) => {
			clearInterval(timer);
			if (state !== 'active') return;
			refreshSession();
			timer = setInterval(refreshSession, REFETCH_INTERVAL * 1000);
		};
		update(AppState.currentState);
		const listener = AppState.addEventListener('change', update);
		return () => {
			clearInterval(timer);
			listener.remove();
		};
	}, [hasSession]);
	return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
};

export default SessionProvider;
