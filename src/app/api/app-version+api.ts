import { APP_VERSION } from '@/utils/rawData';

export const GET = () => Response.json({ version: APP_VERSION }, { headers: { 'Cache-Control': 'no-store' } });
