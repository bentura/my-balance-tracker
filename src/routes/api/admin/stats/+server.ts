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

	const [usersCount] = await sql`SELECT COUNT(*) as count FROM users`;
	const [activeCount] = await sql`SELECT COUNT(*) as count FROM users WHERE subscription_status = 'active'`;
	const [vouchersCount] = await sql`SELECT COUNT(*) as count FROM voucher_redemptions`;

	return json({
		totalUsers: parseInt(usersCount.count, 10),
		activeSubscriptions: parseInt(activeCount.count, 10),
		vouchersRedeemed: parseInt(vouchersCount.count, 10)
	});
};
