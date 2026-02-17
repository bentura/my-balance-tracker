// Client-side config store - populated from server
import { writable } from 'svelte/store';

export type AppMode = 'saas' | 'standalone';

export interface AppFeatures {
	subscriptions: boolean;
	vouchers: boolean;
	cloudSync: boolean;
	stripe: boolean;
	userAuth: boolean;
	showUpgradePrompts: boolean;
}

export const appMode = writable<AppMode>('saas');
export const features = writable<AppFeatures>({
	subscriptions: true,
	vouchers: true,
	cloudSync: true,
	stripe: true,
	userAuth: true,
	showUpgradePrompts: true
});

export const isSaaS = writable(true);
export const isStandalone = writable(false);

export function initConfig(mode: AppMode, feats: Partial<AppFeatures>) {
	appMode.set(mode);
	features.set({
		subscriptions: feats.subscriptions ?? mode === 'saas',
		vouchers: feats.vouchers ?? mode === 'saas',
		cloudSync: feats.cloudSync ?? mode === 'saas',
		stripe: feats.stripe ?? mode === 'saas',
		userAuth: feats.userAuth ?? mode === 'saas',
		showUpgradePrompts: feats.subscriptions ?? mode === 'saas'
	});
	isSaaS.set(mode === 'saas');
	isStandalone.set(mode === 'standalone');
}
