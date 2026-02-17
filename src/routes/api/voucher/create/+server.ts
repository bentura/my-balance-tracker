import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { serverFeatures } from '$lib/server/config';
import { getUserFromRequest } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!serverFeatures.vouchers) {
		return json({ error: 'Not available in standalone mode' }, { status: 404 });
	}

	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { 
		code, 
		description, 
		maxUses = 1, 
		durationMonths = 1,
		expiresAt 
	} = await request.json();

	if (!code) {
		return json({ error: 'Code is required' }, { status: 400 });
	}

	const cleanCode = code.trim().toUpperCase();

	try {
		const [voucher] = await sql`
			INSERT INTO voucher_codes (code, description, max_uses, duration_months, expires_at)
			VALUES (${cleanCode}, ${description || null}, ${maxUses}, ${durationMonths}, ${expiresAt || null})
			RETURNING id, code, description, max_uses as "maxUses", duration_months as "durationMonths", expires_at as "expiresAt", is_active as "isActive"
		`;

		return json({ success: true, voucher });
	} catch (err: any) {
		if (err.code === '23505') {
			return json({ error: 'Voucher code already exists' }, { status: 400 });
		}
		throw err;
	}
};

// GET - List all vouchers (admin only)
export const GET: RequestHandler = async ({ cookies }) => {
	if (!serverFeatures.vouchers) {
		return json({ error: 'Not available in standalone mode' }, { status: 404 });
	}

	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const vouchers = await sql`
		SELECT 
			id, code, description, 
			max_uses as "maxUses", 
			times_used as "timesUsed",
			duration_months as "durationMonths", 
			expires_at as "expiresAt", 
			is_active as "isActive",
			created_at as "createdAt"
		FROM voucher_codes
		ORDER BY created_at DESC
	`;

	return json({ vouchers });
};
