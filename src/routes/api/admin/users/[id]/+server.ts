import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { stripe } from '$lib/server/stripe';

const ADMIN_SECRET = env.ADMIN_SECRET || 'mbt_admin_secret_2026';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const authHeader = request.headers.get('Authorization');
	
	if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = parseInt(params.id, 10);
	const { subscriptionStatus } = await request.json();

	// Get user
	const [user] = await sql`SELECT * FROM users WHERE id = ${userId}`;
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Create Stripe customer if not exists and granting Pro
	let stripeCustomerId = user.stripe_customer_id;
	if (subscriptionStatus === 'active' && !stripeCustomerId) {
		const customer = await stripe.instance.customers.create({
			email: user.email,
			metadata: { userId: userId.toString(), source: 'admin_grant' }
		});
		stripeCustomerId = customer.id;
	}

	// Update user
	await sql`
		UPDATE users
		SET 
			subscription_status = ${subscriptionStatus},
			stripe_customer_id = ${stripeCustomerId}
		WHERE id = ${userId}
	`;

	return json({ success: true });
};
