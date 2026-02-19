import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByEmail, verifyPassword, generateToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { email, password } = await request.json();

	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const user = await getUserByEmail(email);
	
	if (!user) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
	}

	const isValid = await verifyPassword(password, user.password_hash);
	
	if (!isValid) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
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
			subscription_status: user.subscription_status,
			is_admin: user.is_admin
		}
	});
};
