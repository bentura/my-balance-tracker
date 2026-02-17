import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest, updateUserSubscription } from '$lib/server/auth';
import { sql } from '$lib/server/db';
import { stripe } from '$lib/server/stripe';
import { serverFeatures } from '$lib/server/config';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Vouchers only work in SaaS mode
	if (!serverFeatures.vouchers) {
		return json({ error: 'Voucher codes are not available in standalone mode' }, { status: 404 });
	}

	const user = await getUserFromRequest(cookies);
	if (!user) {
		return json({ error: 'You must be logged in to redeem a voucher' }, { status: 401 });
	}

	const { code } = await request.json();

	if (!code || typeof code !== 'string') {
		return json({ error: 'Please enter a voucher code' }, { status: 400 });
	}

	const cleanCode = code.trim().toUpperCase();

	// Find the voucher
	const [voucher] = await sql`
		SELECT id, description, max_uses, times_used, duration_months, expires_at, is_active
		FROM voucher_codes
		WHERE UPPER(code) = ${cleanCode}
	`;

	if (!voucher) {
		return json({ error: 'Invalid voucher code' }, { status: 400 });
	}

	if (!voucher.is_active) {
		return json({ error: 'This voucher is no longer active' }, { status: 400 });
	}

	if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
		return json({ error: 'This voucher has expired' }, { status: 400 });
	}

	if (voucher.max_uses && voucher.times_used >= voucher.max_uses) {
		return json({ error: 'This voucher has been fully redeemed' }, { status: 400 });
	}

	// Check if user already redeemed this voucher
	const [existingRedemption] = await sql`
		SELECT id FROM voucher_redemptions
		WHERE voucher_id = ${voucher.id} AND user_id = ${user.id}
	`;

	if (existingRedemption) {
		return json({ error: 'You have already redeemed this voucher' }, { status: 400 });
	}

	// Calculate subscription expiry
	const now = new Date();
	const expiresAt = new Date(now);
	expiresAt.setMonth(expiresAt.getMonth() + (voucher.duration_months || 1));

	// Create redemption record
	await sql`
		INSERT INTO voucher_redemptions (voucher_id, user_id, subscription_expires_at)
		VALUES (${voucher.id}, ${user.id}, ${expiresAt.toISOString()})
	`;

	// Update voucher usage count
	await sql`
		UPDATE voucher_codes
		SET times_used = times_used + 1
		WHERE id = ${voucher.id}
	`;

	// Create Stripe customer if not exists (for future paid conversion)
	let stripeCustomerId = user.stripe_customer_id;
	if (!stripeCustomerId) {
		const customer = await stripe.instance.customers.create({
			email: user.email,
			metadata: { 
				userId: user.id.toString(),
				source: 'voucher',
				voucherCode: cleanCode
			}
		});
		stripeCustomerId = customer.id;
	}

	// Activate user's subscription
	await updateUserSubscription(user.id, {
		stripe_customer_id: stripeCustomerId,
		subscription_status: 'active'
	});

	return json({
		success: true,
		message: `Voucher redeemed! You have Pro access until ${expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
		expiresAt: expiresAt.toISOString()
	});
};
