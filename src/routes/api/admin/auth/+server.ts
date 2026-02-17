import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';

// Check if current user is admin
export const GET: RequestHandler = async ({ cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user) {
		return json({ error: 'Not logged in' }, { status: 401 });
	}
	
	if (!user.is_admin) {
		return json({ error: 'Not an admin' }, { status: 403 });
	}
	
	return json({ 
		isAdmin: true,
		email: user.email 
	});
};
