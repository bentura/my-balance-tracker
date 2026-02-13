import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { env } from '$env/dynamic/private';

const ADMIN_SECRET = env.ADMIN_SECRET || 'mbt_admin_secret_2026';

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');
	
	if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const users = await sql`
		SELECT 
			id, email, 
			stripe_customer_id as "stripeCustomerId",
			subscription_status as "subscriptionStatus",
			subscription_id as "subscriptionId",
			created_at as "createdAt"
		FROM users
		ORDER BY created_at DESC
	`;

	return json({ users });
};
