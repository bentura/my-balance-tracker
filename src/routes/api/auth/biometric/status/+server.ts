import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// Check if user has biometric set up
export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) {
		return json({ enabled: false });
	}

	const [credential] = await sql`
		SELECT 1 FROM biometric_credentials WHERE user_id = ${user.id} LIMIT 1
	`;

	return json({ enabled: !!credential });
};

// Delete biometric credentials
export const DELETE: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	await sql`DELETE FROM biometric_credentials WHERE user_id = ${user.id}`;

	return json({ success: true });
};
