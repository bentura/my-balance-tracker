import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - Get single account
export const GET: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [account] = await sql`
		SELECT id, name, balance, currency, created_at as "createdAt", updated_at as "updatedAt"
		FROM accounts 
		WHERE id = ${params.id} AND user_id = ${user.id}
	`;

	if (!account) return json({ error: 'Not found' }, { status: 404 });
	return json(account);
};

// PATCH - Update account
export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();
	const now = new Date().toISOString();

	const [account] = await sql`
		UPDATE accounts
		SET 
			name = COALESCE(${data.name ?? null}, name),
			balance = COALESCE(${data.balance ?? null}, balance),
			currency = COALESCE(${data.currency ?? null}, currency),
			updated_at = ${now}
		WHERE id = ${params.id} AND user_id = ${user.id}
		RETURNING id, name, balance, currency, created_at as "createdAt", updated_at as "updatedAt"
	`;

	if (!account) return json({ error: 'Not found' }, { status: 404 });
	return json(account);
};

// DELETE - Delete account
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	await sql`DELETE FROM accounts WHERE id = ${params.id} AND user_id = ${user.id}`;
	return json({ success: true });
};
