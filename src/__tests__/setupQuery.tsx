import { useSyncExternalStore } from 'react';
import { act } from '@testing-library/react-native';

// Mock query updates must notify their consumers, as RTK Query subscriptions do.
export const createQueryMock = <Result,>(initial: Result) => {
	let result = initial;
	const listeners = new Set<() => void>();
	const subscribe = (listener: () => void) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	};
	const getSnapshot = () => result;
	const useResult = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	const setResult = async (next: Result) => {
		await act(async () => {
			result = next;
			listeners.forEach((listener) => listener());
		});
	};
	return { useResult, setResult };
};
