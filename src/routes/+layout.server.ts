import type { LayoutServerLoad } from './$types';
import { APP_MODE, serverFeatures } from '$lib/server/config';

export const load: LayoutServerLoad = async () => {
	return {
		appMode: APP_MODE,
		features: serverFeatures
	};
};
