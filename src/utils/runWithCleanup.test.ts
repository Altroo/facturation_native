import { runWithCleanup, runWithErrorHandler } from './runWithCleanup';

describe('async handler cleanup', () => {
	it('returns the action result and runs cleanup afterward', async () => {
		const calls: string[] = [];
		const result = await runWithCleanup(
			async () => {
				calls.push('action');
				return 42;
			},
			() => calls.push('cleanup'),
		);

		expect(result).toBe(42);
		expect(calls).toEqual(['action', 'cleanup']);
	});

	it('runs cleanup and preserves a rejected action error', async () => {
		const error = new Error('request failed');
		const cleanup = jest.fn();

		await expect(runWithCleanup(async () => Promise.reject(error), cleanup)).rejects.toBe(error);
		expect(cleanup).toHaveBeenCalledTimes(1);
	});

	it('passes a rejected action error to its handler', async () => {
		const error = new Error('request failed');
		const onError = jest.fn();

		await runWithErrorHandler(async () => Promise.reject(error), onError);
		expect(onError).toHaveBeenCalledWith(error);
	});
});
