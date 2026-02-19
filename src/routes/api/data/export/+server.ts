import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - Export all user data
export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [accounts, categories, recurringItems, transactions, settings] = await Promise.all([
		sql`SELECT * FROM accounts WHERE user_id = ${user.id} ORDER BY id`,
		sql`SELECT * FROM categories WHERE user_id = ${user.id} ORDER BY id`,
		sql`SELECT * FROM recurring_items WHERE user_id = ${user.id} ORDER BY id`,
		sql`SELECT * FROM transactions WHERE user_id = ${user.id} ORDER BY date DESC, id DESC`,
		sql`SELECT * FROM user_settings WHERE user_id = ${user.id}`
	]);

	return json({
		version: 1,
		exportedAt: new Date().toISOString(),
		accounts,
		categories,
		recurringItems,
		transactions,
		settings: settings[0] || null
	});
};
