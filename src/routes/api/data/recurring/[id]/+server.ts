import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - Get single recurring item
export const GET: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [item] = await sql`
		SELECT id, name, amount, type, frequency, 
			day_of_month as "dayOfMonth", day_of_week as "dayOfWeek",
			account_id as "accountId", to_account_id as "toAccountId", 
			category_id as "categoryId", is_active as "isActive",
			last_applied as "lastApplied",
			created_at as "createdAt", updated_at as "updatedAt"
		FROM recurring_items 
		WHERE id = ${params.id} AND user_id = ${user.id}
	`;

	if (!item) return json({ error: 'Not found' }, { status: 404 });
	return json(item);
};

// PATCH - Update recurring item
export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();
	const now = new Date().toISOString();

	const [item] = await sql`
		UPDATE recurring_items
		SET 
			name = COALESCE(${data.name ?? null}, name),
			amount = COALESCE(${data.amount ?? null}, amount),
			type = COALESCE(${data.type ?? null}, type),
			frequency = COALESCE(${data.frequency ?? null}, frequency),
			day_of_month = COALESCE(${data.dayOfMonth ?? null}, day_of_month),
			day_of_week = COALESCE(${data.dayOfWeek ?? null}, day_of_week),
			account_id = COALESCE(${data.accountId ?? null}, account_id),
			to_account_id = COALESCE(${data.toAccountId ?? null}, to_account_id),
			category_id = COALESCE(${data.categoryId ?? null}, category_id),
			is_active = COALESCE(${data.isActive ?? null}, is_active),
			last_applied = COALESCE(${data.lastApplied ?? null}, last_applied),
			updated_at = ${now}
		WHERE id = ${params.id} AND user_id = ${user.id}
		RETURNING id, name, amount, type, frequency, 
			day_of_month as "dayOfMonth", day_of_week as "dayOfWeek",
			account_id as "accountId", to_account_id as "toAccountId", 
			category_id as "categoryId", is_active as "isActive",
			last_applied as "lastApplied",
			created_at as "createdAt", updated_at as "updatedAt"
	`;

	if (!item) return json({ error: 'Not found' }, { status: 404 });
	return json(item);
};

// DELETE - Delete recurring item
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	await sql`DELETE FROM recurring_items WHERE id = ${params.id} AND user_id = ${user.id}`;
	return json({ success: true });
};
