// App configuration - controls SaaS vs Standalone mode
import { browser } from '$app/environment';

export type AppMode = 'saas' | 'standalone';

// This is set via environment variable at build/runtime
// SaaS mode: hosted version with subscriptions, vouchers, cloud sync
// Standalone mode: self-hosted, all features included, no cloud connection
export const APP_MODE: AppMode = (
	typeof process !== 'undefined' 
		? process.env.MBT_MODE as AppMode
		: 'saas'
) || 'saas';

// Feature flags based on mode
export const features = {
	// Subscriptions & payments
	subscriptions: APP_MODE === 'saas',
	
	// Voucher/promo codes
	vouchers: APP_MODE === 'saas',
	
	// Cloud sync (Pro feature in SaaS, always available in standalone)
	cloudSync: APP_MODE === 'saas',
	
	// Show upgrade prompts
	showUpgradePrompts: APP_MODE === 'saas',
	
	// Admin panel (available in both, but different capabilities)
	admin: true,
	
	// User registration (SaaS needs it, standalone optional)
	userAuth: APP_MODE === 'saas',
	
	// Stripe integration
	stripe: APP_MODE === 'saas',
};

// App info
export const appInfo = {
	name: 'MyBalanceTracker',
	mode: APP_MODE,
	isSaaS: APP_MODE === 'saas',
	isStandalone: APP_MODE === 'standalone',
};
