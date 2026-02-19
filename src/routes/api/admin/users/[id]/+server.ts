import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { getUserFromRequest } from '$lib/server/auth';
import { stripe } from '$lib/server/stripe';

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = parseInt(params.id, 10);

	// Prevent deleting yourself
	if (userId === user.id) {
		return json({ error: 'Cannot delete your own account' }, { status: 400 });
	}

	// Get target user
	const [targetUser] = await sql`SELECT * FROM users WHERE id = ${userId}`;
	if (!targetUser) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Delete from Stripe if customer exists
	if (targetUser.stripe_customer_id) {
		try {
			// Cancel any active subscriptions first
			const subscriptions = await stripe.instance.subscriptions.list({
				customer: targetUser.stripe_customer_id,
				status: 'active'
			});
			
			for (const sub of subscriptions.data) {
				await stripe.instance.subscriptions.cancel(sub.id);
			}

			// Delete the customer (this also removes payment methods, etc.)
			await stripe.instance.customers.del(targetUser.stripe_customer_id);
		} catch (err: any) {
			// Log but continue - customer might already be deleted in Stripe
			console.error('Stripe deletion error:', err.message);
		}
	}

	// Delete user data from our database (cascade should handle related records)
	// Delete in order: settings, accounts/transactions, then user
	await sql`DELETE FROM user_settings WHERE user_id = ${userId}`;
	await sql`DELETE FROM transactions WHERE user_id = ${userId}`;
	await sql`DELETE FROM accounts WHERE user_id = ${userId}`;
	await sql`DELETE FROM recurring_items WHERE user_id = ${userId}`;
	await sql`DELETE FROM categories WHERE user_id = ${userId}`;
	await sql`DELETE FROM users WHERE id = ${userId}`;

	return json({ success: true, message: 'User deleted' });
};

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
