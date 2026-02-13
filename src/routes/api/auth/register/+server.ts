import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUser, generateToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { email, password } = await request.json();

	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	if (password.length < 8) {
		return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return json({ error: 'Invalid email address' }, { status: 400 });
	}

	const user = await createUser(email, password);
	
	if (!user) {
		return json({ error: 'An account with this email already exists' }, { status: 409 });
	}

	const token = generateToken(user);

	cookies.set('auth_token', token, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30 // 30 days
	});

	return json({
		user: {
			id: user.id,
			email: user.email,
			subscription_status: user.subscription_status
		}
	});
};
