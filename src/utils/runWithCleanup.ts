export const runWithCleanup = async <T>(action: () => Promise<T>, cleanup: () => void): Promise<T> => {
	try {
		return await action();
	} finally {
		cleanup();
	}
};

export const runWithErrorHandler = async (
	action: () => Promise<void>,
	onError: (error: unknown) => void,
): Promise<void> => {
	try {
		await action();
	} catch (error) {
		onError(error);
	}
};
