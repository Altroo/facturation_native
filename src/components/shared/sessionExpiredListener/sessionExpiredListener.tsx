import { useContext, useEffect, useEffectEvent, type FC } from 'react';
import { ToastContext } from '@/contexts/toastContext';
import { useLanguage } from '@/utils/hooks';
import { auth } from '@/auth';

const SessionExpiredListener: FC = () => {
	const { t } = useLanguage();
	const toast = useContext(ToastContext);
	const onSessionExpired = useEffectEvent(() => {
		toast?.onError(t.shared.sessionExpired);
	});

	useEffect(() => {
		const handler = () => {
			onSessionExpired();
		};
		return auth.subscribeExpired(handler);
	}, []);

	return null;
};

export default SessionExpiredListener;
