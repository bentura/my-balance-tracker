// Server-side configuration
import { env } from '$env/dynamic/private';

export type AppMode = 'saas' | 'standalone';

export const APP_MODE: AppMode = (env.MBT_MODE as AppMode) || 'saas';

export const serverFeatures = {
	subscriptions: APP_MODE === 'saas',
	vouchers: APP_MODE === 'saas',
	cloudSync: APP_MODE === 'saas',
	stripe: APP_MODE === 'saas',
	userAuth: APP_MODE === 'saas',
};

export const isSaaS = APP_MODE === 'saas';
export const isStandalone = APP_MODE === 'standalone';
