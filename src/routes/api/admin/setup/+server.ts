import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { createUser, hashPassword } from '$lib/server/auth';
import { env } from '$env/dynamic/private';

// One-time setup endpoint to create the first admin user
// Protected by ADMIN_SECRET environment variable
export const POST: RequestHandler = async ({ request }) => {
	const { email, password, setupSecret } = await request.json();

	// Require the ADMIN_SECRET to create admin users
	const adminSecret = env.ADMIN_SECRET;
	if (!adminSecret || setupSecret !== adminSecret) {
		return json({ error: 'Invalid setup secret' }, { status: 401 });
	}

	if (!email || !password) {
		return json({ error: 'Email and password required' }, { status: 400 });
	}

	if (password.length < 8) {
		return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
	}

	// Check if user already exists
	const [existing] = await sql`SELECT id, is_admin FROM users WHERE email = ${email.toLowerCase()}`;
	
	if (existing) {
		// User exists - just make them admin
		await sql`UPDATE users SET is_admin = true WHERE id = ${existing.id}`;
		return json({ 
			success: true, 
			message: existing.is_admin ? 'User is already an admin' : 'Existing user promoted to admin'
		});
	}

	// Create new user
	const passwordHash = await hashPassword(password);
	
	const [user] = await sql`
		INSERT INTO users (email, password_hash, is_admin, subscription_status)
		VALUES (${email.toLowerCase()}, ${passwordHash}, true, 'active')
		RETURNING id, email
	`;

	// Create default settings
	await sql`INSERT INTO user_settings (user_id) VALUES (${user.id})`;

	return json({ 
		success: true, 
		message: 'Admin user created',
		email: user.email
	});
};
