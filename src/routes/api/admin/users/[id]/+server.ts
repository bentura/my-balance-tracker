import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { getUserFromRequest } from '$lib/server/auth';
import { stripe } from '$lib/server/stripe';

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = parseInt(params.id, 10);
	const body = await request.json();

	// Get target user
	const [targetUser] = await sql`SELECT * FROM users WHERE id = ${userId}`;
	if (!targetUser) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Handle subscription status change
	if (body.subscriptionStatus !== undefined) {
		// Create Stripe customer if not exists and granting Pro
		let stripeCustomerId = targetUser.stripe_customer_id;
		if (body.subscriptionStatus === 'active' && !stripeCustomerId) {
			const customer = await stripe.instance.customers.create({
				email: targetUser.email,
				metadata: { userId: userId.toString(), source: 'admin_grant' }
			});
			stripeCustomerId = customer.id;
		}

		await sql`
			UPDATE users
			SET 
				subscription_status = ${body.subscriptionStatus},
				stripe_customer_id = ${stripeCustomerId},
				updated_at = CURRENT_TIMESTAMP
			WHERE id = ${userId}
		`;
	}

	// Handle admin status change
	if (body.isAdmin !== undefined) {
		// Prevent removing own admin status
		if (userId === user.id && !body.isAdmin) {
			return json({ error: 'Cannot remove your own admin status' }, { status: 400 });
		}

		await sql`
			UPDATE users
			SET is_admin = ${body.isAdmin}, updated_at = CURRENT_TIMESTAMP
			WHERE id = ${userId}
		`;
	}

	return json({ success: true });
};
