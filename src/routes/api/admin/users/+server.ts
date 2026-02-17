import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { getUserFromRequest } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const users = await sql`
		SELECT 
			id, email, 
			stripe_customer_id as "stripeCustomerId",
			subscription_status as "subscriptionStatus",
			subscription_id as "subscriptionId",
			is_admin as "isAdmin",
			created_at as "createdAt"
		FROM users
		ORDER BY created_at DESC
	`;

	return json({ users });
};
