import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { env } from '$env/dynamic/private';

const ADMIN_SECRET = env.ADMIN_SECRET || 'mbt_admin_secret_2026';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const authHeader = request.headers.get('Authorization');
	
	if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const voucherId = parseInt(params.id, 10);
	const { isActive } = await request.json();

	await sql`
		UPDATE voucher_codes
		SET is_active = ${isActive}
		WHERE id = ${voucherId}
	`;

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const authHeader = request.headers.get('Authorization');
	
	if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const voucherId = parseInt(params.id, 10);

	await sql`DELETE FROM voucher_codes WHERE id = ${voucherId}`;

	return json({ success: true });
};
