import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// GET - Get user settings
export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const [settings] = await sql`
		SELECT 
			default_currency as "defaultCurrency", 
			projection_days as "projectionDays",
			last_daily_run as "lastDailyRun"
		FROM user_settings 
		WHERE user_id = ${user.id}
	`;

	return json(settings || { defaultCurrency: 'GBP', projectionDays: 30 });
};

// PATCH - Update settings
export const PATCH: RequestHandler = async ({ request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();

	const [settings] = await sql`
		INSERT INTO user_settings (user_id, default_currency, projection_days, last_daily_run)
		VALUES (
			${user.id}, 
			${data.defaultCurrency || 'GBP'}, 
			${data.projectionDays || 30}, 
			${data.lastDailyRun || null}
		)
		ON CONFLICT (user_id) DO UPDATE SET
			default_currency = COALESCE(${data.defaultCurrency ?? null}, user_settings.default_currency),
			projection_days = COALESCE(${data.projectionDays ?? null}, user_settings.projection_days),
			last_daily_run = COALESCE(${data.lastDailyRun ?? null}, user_settings.last_daily_run)
		RETURNING 
			default_currency as "defaultCurrency", 
			projection_days as "projectionDays",
			last_daily_run as "lastDailyRun"
	`;

	return json(settings);
};
