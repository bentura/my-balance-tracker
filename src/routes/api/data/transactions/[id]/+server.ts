import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - Get single transaction
export const GET: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [tx] = await sql`
		SELECT id, description, amount, type, 
			account_id as "accountId", to_account_id as "toAccountId", 
			category_id as "categoryId", date, is_applied as "isApplied",
			recurring_id as "recurringId", linked_transaction_id as "linkedTransactionId",
			created_at as "createdAt"
		FROM transactions 
		WHERE id = ${params.id} AND user_id = ${user.id}
	`;

	if (!tx) return json({ error: 'Not found' }, { status: 404 });
	return json(tx);
};

// PATCH - Update transaction
export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();

	const [tx] = await sql`
		UPDATE transactions
		SET 
			description = COALESCE(${data.description ?? null}, description),
			amount = COALESCE(${data.amount ?? null}, amount),
			type = COALESCE(${data.type ?? null}, type),
			account_id = COALESCE(${data.accountId ?? null}, account_id),
			to_account_id = COALESCE(${data.toAccountId ?? null}, to_account_id),
			category_id = COALESCE(${data.categoryId ?? null}, category_id),
			date = COALESCE(${data.date ?? null}, date),
			is_applied = COALESCE(${data.isApplied ?? null}, is_applied),
			linked_transaction_id = COALESCE(${data.linkedTransactionId ?? null}, linked_transaction_id)
		WHERE id = ${params.id} AND user_id = ${user.id}
		RETURNING id, description, amount, type, 
			account_id as "accountId", to_account_id as "toAccountId", 
			category_id as "categoryId", date, is_applied as "isApplied",
			recurring_id as "recurringId", linked_transaction_id as "linkedTransactionId",
			created_at as "createdAt"
	`;

	if (!tx) return json({ error: 'Not found' }, { status: 404 });
	return json(tx);
};

// DELETE - Delete transaction
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	await sql`DELETE FROM transactions WHERE id = ${params.id} AND user_id = ${user.id}`;
	return json({ success: true });
};
