import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - Fetch all user data for syncing to client
export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.subscription_status !== 'active') {
		return json({ error: 'Premium subscription required' }, { status: 403 });
	}

	const [accounts, categories, recurringItems, transactions, settings] = await Promise.all([
		sql`SELECT * FROM accounts WHERE user_id = ${user.id} ORDER BY id`,
		sql`SELECT * FROM categories WHERE user_id = ${user.id} ORDER BY id`,
		sql`SELECT * FROM recurring_items WHERE user_id = ${user.id} ORDER BY id`,
		sql`SELECT * FROM transactions WHERE user_id = ${user.id} ORDER BY date DESC, id DESC LIMIT 500`,
		sql`SELECT * FROM user_settings WHERE user_id = ${user.id}`
	]);

	return json({
		accounts,
		categories,
		recurringItems,
		transactions,
		settings: settings[0] || null
	});
};

// POST - Upload local data to server (initial sync when upgrading)
export const POST: RequestHandler = async ({ request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.subscription_status !== 'active') {
		return json({ error: 'Premium subscription required' }, { status: 403 });
	}

	const data = await request.json();
	const { accounts, categories, recurringItems, transactions, settings } = data;

	// Use a transaction to ensure data integrity
	await sql.begin(async (sql) => {
		// Clear existing data (fresh sync)
		await sql`DELETE FROM transactions WHERE user_id = ${user.id}`;
		await sql`DELETE FROM recurring_items WHERE user_id = ${user.id}`;
		await sql`DELETE FROM categories WHERE user_id = ${user.id}`;
		await sql`DELETE FROM accounts WHERE user_id = ${user.id}`;

		// ID mapping for foreign keys
		const accountIdMap = new Map<number, number>();
		const categoryIdMap = new Map<number, number>();

		// Insert accounts
		for (const account of accounts || []) {
			const [inserted] = await sql`
				INSERT INTO accounts (user_id, name, balance, currency, created_at, updated_at)
				VALUES (${user.id}, ${account.name}, ${account.balance}, ${account.currency}, ${account.createdAt}, ${account.updatedAt})
				RETURNING id
			`;
			accountIdMap.set(account.id, inserted.id);
		}

		// Insert categories
		for (const category of categories || []) {
			const [inserted] = await sql`
				INSERT INTO categories (user_id, name, color, created_at)
				VALUES (${user.id}, ${category.name}, ${category.color}, ${category.createdAt})
				RETURNING id
			`;
			categoryIdMap.set(category.id, inserted.id);
		}

		// Insert recurring items
		for (const item of recurringItems || []) {
			await sql`
				INSERT INTO recurring_items (
					user_id, name, amount, type, frequency, day_of_month, day_of_week,
					account_id, to_account_id, category_id, is_active, last_applied, created_at, updated_at
				)
				VALUES (
					${user.id}, ${item.name}, ${item.amount}, ${item.type}, ${item.frequency},
					${item.dayOfMonth}, ${item.dayOfWeek},
					${accountIdMap.get(item.accountId) || null},
					${item.toAccountId ? accountIdMap.get(item.toAccountId) || null : null},
					${item.categoryId ? categoryIdMap.get(item.categoryId) || null : null},
					${item.isActive}, ${item.lastApplied}, ${item.createdAt}, ${item.updatedAt}
				)
			`;
		}

		// Insert transactions
		for (const tx of transactions || []) {
			await sql`
				INSERT INTO transactions (
					user_id, description, amount, type, account_id, to_account_id,
					category_id, date, is_applied, created_at
				)
				VALUES (
					${user.id}, ${tx.description}, ${tx.amount}, ${tx.type},
					${accountIdMap.get(tx.accountId) || null},
					${tx.toAccountId ? accountIdMap.get(tx.toAccountId) || null : null},
					${tx.categoryId ? categoryIdMap.get(tx.categoryId) || null : null},
					${tx.date}, ${tx.isApplied}, ${tx.createdAt}
				)
			`;
		}

		// Upsert settings
		if (settings) {
			await sql`
				INSERT INTO user_settings (user_id, default_currency, projection_days, last_daily_run)
				VALUES (${user.id}, ${settings.defaultCurrency || 'GBP'}, ${settings.projectionDays || 30}, ${settings.lastDailyRun})
				ON CONFLICT (user_id) DO UPDATE SET
					default_currency = EXCLUDED.default_currency,
					projection_days = EXCLUDED.projection_days,
					last_daily_run = EXCLUDED.last_daily_run
			`;
		}
	});

	return json({ success: true, message: 'Data synced successfully' });
};
