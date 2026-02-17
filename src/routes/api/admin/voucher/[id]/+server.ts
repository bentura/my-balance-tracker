import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { getUserFromRequest } from '$lib/server/auth';

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
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

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const voucherId = parseInt(params.id, 10);

	await sql`DELETE FROM voucher_codes WHERE id = ${voucherId}`;

	return json({ success: true });
};
