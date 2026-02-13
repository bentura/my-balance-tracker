import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user) {
		return json({ user: null });
	}

	return json({
		user: {
			id: user.id,
			email: user.email,
			subscription_status: user.subscription_status
		}
	});
};
