/** @jest-environment node */
import { GET } from '@/app/api/app-version+api';
import { APP_VERSION } from '@/utils/rawData';

it('serves the native project version without caching through the Expo API route', async () => {
	const response = GET();
	expect(response.status).toBe(200);
	expect(response.headers.get('Cache-Control')).toBe('no-store');
	await expect(response.json()).resolves.toEqual({ version: APP_VERSION });
});
