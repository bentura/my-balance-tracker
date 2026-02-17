import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { env } from '$env/dynamic/private';
import { updateUserSubscription } from '$lib/server/auth';
import { sql } from '$lib/server/db';

const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		return json({ error: 'No signature' }, { status: 400 });
	}

	let event;

	try {
		// If webhook secret is not set, skip verification (for testing)
		if (STRIPE_WEBHOOK_SECRET) {
			event = stripe.instance.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
		} else {
			event = JSON.parse(body);
			console.warn('[Stripe] Webhook signature verification skipped - no secret configured');
		}
	} catch (err: any) {
		console.error('[Stripe] Webhook signature verification failed:', err.message);
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	console.log('[Stripe] Received event:', event.type);

	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object;
			const userId = parseInt(session.metadata?.userId || '0', 10);
			
			if (userId) {
				await updateUserSubscription(userId, {
					stripe_customer_id: session.customer as string,
					subscription_status: 'active',
					subscription_id: session.subscription as string
				});
				console.log(`[Stripe] User ${userId} subscription activated`);
			}
			break;
		}

		case 'customer.subscription.updated': {
			const subscription = event.data.object;
			const userId = parseInt(subscription.metadata?.userId || '0', 10);
			
			if (userId) {
				const status = subscription.status === 'active' ? 'active' : subscription.status;
				await updateUserSubscription(userId, {
					subscription_status: status
				});
				console.log(`[Stripe] User ${userId} subscription updated to ${status}`);
			}
			break;
		}

		case 'customer.subscription.deleted': {
			const subscription = event.data.object;
			const userId = parseInt(subscription.metadata?.userId || '0', 10);
			
			if (userId) {
				await updateUserSubscription(userId, {
					subscription_status: 'cancelled',
					subscription_id: undefined
				});
				console.log(`[Stripe] User ${userId} subscription cancelled`);
			}
			break;
		}

		case 'invoice.payment_failed': {
			const invoice = event.data.object;
			// Find user by customer ID
			const [user] = await sql`
				SELECT id FROM users WHERE stripe_customer_id = ${invoice.customer as string}
			`;
			
			if (user) {
				await updateUserSubscription(user.id, {
					subscription_status: 'past_due'
				});
				console.log(`[Stripe] User ${user.id} payment failed`);
			}
			break;
		}
	}

	return json({ received: true });
};
