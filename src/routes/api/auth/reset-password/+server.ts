import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateResetToken, resetPassword } from '$lib/server/auth';

// GET - Validate token
export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return json({ valid: false, error: 'Token is required' }, { status: 400 });
	}

	const user = await validateResetToken(token);

	if (!user) {
		return json({ valid: false, error: 'Invalid or expired token' }, { status: 400 });
	}

	return json({ valid: true, email: user.email });
};

// POST - Reset password
export const POST: RequestHandler = async ({ request }) => {
	const { token, password } = await request.json();

	if (!token || !password) {
		return json({ error: 'Token and password are required' }, { status: 400 });
	}

	if (password.length < 8) {
		return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
	}

	const success = await resetPassword(token, password);

	if (!success) {
		return json({ error: 'Invalid or expired token' }, { status: 400 });
	}

	return json({ success: true, message: 'Password has been reset' });
};
