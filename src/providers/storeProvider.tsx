import { useLayoutEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type SagaStore } from '@/store/store';
import { rootSaga } from '@/store/sagas';

const StoreProvider = ({ children }: { children: ReactNode }) => {
	// Use lazy initialization with useState to avoid accessing refs during render
	const [store] = useState<SagaStore>(() => makeStore());
	useLayoutEffect(() => {
		// Start after commit, before children dispatch initialization actions in effects.
		const sagaTask = store.runSaga(rootSaga);
		return () => sagaTask.cancel();
	}, [store]);
	return <Provider store={store}>{children}</Provider>;
};

export default StoreProvider;
