import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { createCheckoutSession } from '$lib/server/stripe';
import { serverFeatures } from '$lib/server/config';

export const POST: RequestHandler = async ({ cookies }) => {
	if (!serverFeatures.stripe) {
		return json({ error: 'Subscriptions are not available in standalone mode' }, { status: 404 });
	}

	const user = await getUserFromRequest(cookies);
	
	if (!user) {
		return json({ error: 'You must be logged in to subscribe' }, { status: 401 });
	}

	if (user.subscription_status === 'active') {
		return json({ error: 'You already have an active subscription' }, { status: 400 });
	}

	const session = await createCheckoutSession(
		user.id,
		user.email,
		user.stripe_customer_id || undefined
	);

	return json({ url: session.url });
};
