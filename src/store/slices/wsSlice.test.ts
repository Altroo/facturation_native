import { APP_VERSION } from '@/utils/rawData';
import reducer, { setWSMaintenance, setWSServerVersion } from './wsSlice';

describe('wsSlice reducer', () => {
	it('should return the initial state when passed an empty action', () => {
		const result = reducer(undefined, { type: '' });
		expect(result).toEqual({
			maintenance: false,
			localVersion: APP_VERSION,
			serverVersion: null,
		});
	});

	it('should handle setWSMaintenance', () => {
		const result = reducer(undefined, setWSMaintenance(true));
		expect(result).toEqual({
			maintenance: true,
			localVersion: APP_VERSION,
			serverVersion: null,
		});
	});

	it('keeps the bundled version separate from the announced mobile release', () => {
		const initial = reducer(undefined, { type: 'test' });
		const announced = reducer(initial, setWSServerVersion('3.6.2'));
		expect(announced.localVersion).toBe(APP_VERSION);
		expect(announced.serverVersion).toBe('3.6.2');
		expect(reducer(announced, setWSServerVersion('invalid')).serverVersion).toBe('3.6.2');
	});
});
