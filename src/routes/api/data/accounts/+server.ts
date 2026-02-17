import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - List all accounts
export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const accounts = await sql`
		SELECT id, name, balance, currency, created_at as "createdAt", updated_at as "updatedAt"
		FROM accounts 
		WHERE user_id = ${user.id}
		ORDER BY id
	`;

	return json(accounts);
};

// POST - Create account
export const POST: RequestHandler = async ({ request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();
	const now = new Date().toISOString();

	const [account] = await sql`
		INSERT INTO accounts (user_id, name, balance, currency, created_at, updated_at)
		VALUES (${user.id}, ${data.name}, ${data.balance || 0}, ${data.currency || 'GBP'}, ${now}, ${now})
		RETURNING id, name, balance, currency, created_at as "createdAt", updated_at as "updatedAt"
	`;

	return json(account, { status: 201 });
};
