import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { getUserFromRequest } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
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
