import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - List transactions with filters
export const GET: RequestHandler = async ({ url, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const accountId = url.searchParams.get('accountId');
	const categoryId = url.searchParams.get('categoryId');
	const type = url.searchParams.get('type');
	const fromDate = url.searchParams.get('fromDate');
	const toDate = url.searchParams.get('toDate');
	const limit = parseInt(url.searchParams.get('limit') || '100', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	const includeUnApplied = url.searchParams.get('includeUnApplied') === 'true';
	const pending = url.searchParams.get('pending') === 'true';

	// Build dynamic query
	let query = sql`
		SELECT id, description, amount, type, 
			account_id as "accountId", to_account_id as "toAccountId", 
			category_id as "categoryId", date, is_applied as "isApplied",
			recurring_id as "recurringId", linked_transaction_id as "linkedTransactionId",
			created_at as "createdAt"
		FROM transactions 
		WHERE user_id = ${user.id}
	`;

	// For pending transactions only
	if (pending) {
		const today = new Date().toISOString().slice(0, 10);
		query = sql`
			SELECT id, description, amount, type, 
				account_id as "accountId", to_account_id as "toAccountId", 
				category_id as "categoryId", date, is_applied as "isApplied",
				recurring_id as "recurringId", linked_transaction_id as "linkedTransactionId",
				created_at as "createdAt"
			FROM transactions 
			WHERE user_id = ${user.id} AND date > ${today}
			ORDER BY date ASC
		`;
		const transactions = await query;
		return json(transactions);
	}

	// Build conditions array for complex filtering
	const conditions: string[] = [`user_id = ${user.id}`];
	
	// For now, use a simpler approach with multiple queries based on params
	let transactions;
	
	if (accountId && !type && !categoryId && !fromDate && !toDate) {
		// Simple account filter
		transactions = await sql`
			SELECT id, description, amount, type, 
				account_id as "accountId", to_account_id as "toAccountId", 
				category_id as "categoryId", date, is_applied as "isApplied",
				recurring_id as "recurringId", linked_transaction_id as "linkedTransactionId",
				created_at as "createdAt"
			FROM transactions 
			WHERE user_id = ${user.id} AND account_id = ${parseInt(accountId, 10)}
			${includeUnApplied ? sql`` : sql`AND is_applied = true`}
			ORDER BY date DESC, id DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
	} else if (fromDate) {
		// Date range filter
		transactions = await sql`
			SELECT id, description, amount, type, 
				account_id as "accountId", to_account_id as "toAccountId", 
				category_id as "categoryId", date, is_applied as "isApplied",
				recurring_id as "recurringId", linked_transaction_id as "linkedTransactionId",
				created_at as "createdAt"
			FROM transactions 
			WHERE user_id = ${user.id} 
				AND date >= ${fromDate}
				${toDate ? sql`AND date <= ${toDate}` : sql``}
				${accountId ? sql`AND account_id = ${parseInt(accountId, 10)}` : sql``}
				${type ? sql`AND type = ${type}` : sql``}
				${includeUnApplied ? sql`` : sql`AND is_applied = true`}
			ORDER BY date DESC, id DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
	} else {
		// Default - recent transactions
		transactions = await sql`
			SELECT id, description, amount, type, 
				account_id as "accountId", to_account_id as "toAccountId", 
				category_id as "categoryId", date, is_applied as "isApplied",
				recurring_id as "recurringId", linked_transaction_id as "linkedTransactionId",
				created_at as "createdAt"
			FROM transactions 
			WHERE user_id = ${user.id}
			${includeUnApplied ? sql`` : sql`AND is_applied = true`}
			ORDER BY date DESC, id DESC
			LIMIT ${limit} OFFSET ${offset}
		`;
	}

	return json(transactions);
};

// POST - Create transaction
export const POST: RequestHandler = async ({ request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();
	const now = new Date().toISOString();

	const [tx] = await sql`
		INSERT INTO transactions (
			user_id, description, amount, type, account_id, to_account_id,
			category_id, date, is_applied, recurring_id, linked_transaction_id, created_at
		)
		VALUES (
			${user.id}, ${data.description}, ${data.amount}, ${data.type}, ${data.accountId},
			${data.toAccountId || null}, ${data.categoryId || null}, ${data.date},
			${data.isApplied !== false}, ${data.recurringId || null}, ${data.linkedTransactionId || null}, ${now}
		)
		RETURNING id, description, amount, type, 
			account_id as "accountId", to_account_id as "toAccountId", 
			category_id as "categoryId", date, is_applied as "isApplied",
			recurring_id as "recurringId", linked_transaction_id as "linkedTransactionId",
			created_at as "createdAt"
	`;

	return json(tx, { status: 201 });
};
