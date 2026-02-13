import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY || '';
const PUBLIC_APP_URL = publicEnv.PUBLIC_APP_URL || 'https://mybalancetracker.co.uk';

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2025-01-27.acacia'
});

// Price ID for £3/month subscription - you'll create this in Stripe Dashboard
// For now we'll create it dynamically in checkout
const MONTHLY_PRICE = 300; // £3.00 in pence

export async function createCheckoutSession(userId: number, email: string, customerId?: string) {
	const session = await stripe.checkout.sessions.create({
		customer: customerId,
		customer_email: customerId ? undefined : email,
		mode: 'subscription',
		payment_method_types: ['card'],
		line_items: [
			{
				price_data: {
					currency: 'gbp',
					product_data: {
						name: 'MyBalanceTracker Pro',
						description: 'Sync across devices, cloud backup, priority support'
					},
					unit_amount: MONTHLY_PRICE,
					recurring: {
						interval: 'month'
					}
				},
				quantity: 1
			}
		],
		success_url: `${PUBLIC_APP_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${PUBLIC_APP_URL}/upgrade`,
		metadata: {
			userId: userId.toString()
		},
		subscription_data: {
			metadata: {
				userId: userId.toString()
			}
		}
	});

	return session;
}

export async function createCustomerPortalSession(customerId: string) {
	const session = await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: `${PUBLIC_APP_URL}/settings`
	});

	return session;
}

export async function getSubscription(subscriptionId: string) {
	return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
	return stripe.subscriptions.cancel(subscriptionId);
}
