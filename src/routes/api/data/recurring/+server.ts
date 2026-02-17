import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - List all recurring items
export const GET: RequestHandler = async ({ url, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const type = url.searchParams.get('type');
	
	let items;
	if (type) {
		items = await sql`
			SELECT id, name, amount, type, frequency, 
				day_of_month as "dayOfMonth", day_of_week as "dayOfWeek",
				account_id as "accountId", to_account_id as "toAccountId", 
				category_id as "categoryId", is_active as "isActive",
				last_applied as "lastApplied",
				created_at as "createdAt", updated_at as "updatedAt"
			FROM recurring_items 
			WHERE user_id = ${user.id} AND type = ${type}
			ORDER BY id
		`;
	} else {
		items = await sql`
			SELECT id, name, amount, type, frequency, 
				day_of_month as "dayOfMonth", day_of_week as "dayOfWeek",
				account_id as "accountId", to_account_id as "toAccountId", 
				category_id as "categoryId", is_active as "isActive",
				last_applied as "lastApplied",
				created_at as "createdAt", updated_at as "updatedAt"
			FROM recurring_items 
			WHERE user_id = ${user.id}
			ORDER BY id
		`;
	}

	return json(items);
};

// POST - Create recurring item
export const POST: RequestHandler = async ({ request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();
	const now = new Date().toISOString();

	const [item] = await sql`
		INSERT INTO recurring_items (
			user_id, name, amount, type, frequency, day_of_month, day_of_week,
			account_id, to_account_id, category_id, is_active, last_applied, created_at, updated_at
		)
		VALUES (
			${user.id}, ${data.name}, ${data.amount}, ${data.type}, ${data.frequency},
			${data.dayOfMonth || null}, ${data.dayOfWeek || null},
			${data.accountId}, ${data.toAccountId || null}, ${data.categoryId || null},
			${data.isActive !== false}, ${data.lastApplied || null}, ${now}, ${now}
		)
		RETURNING id, name, amount, type, frequency, 
			day_of_month as "dayOfMonth", day_of_week as "dayOfWeek",
			account_id as "accountId", to_account_id as "toAccountId", 
			category_id as "categoryId", is_active as "isActive",
			last_applied as "lastApplied",
			created_at as "createdAt", updated_at as "updatedAt"
	`;

	return json(item, { status: 201 });
};
