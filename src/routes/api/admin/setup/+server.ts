import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';
import { env } from '$env/dynamic/private';

/**
 * One-time bootstrap endpoint to create the first admin user.
 * 
 * This endpoint ONLY works when no admin users exist in the database.
 * Once an admin exists, this endpoint is permanently disabled.
 * 
 * After the first admin is created, use the admin panel to:
 * - Grant admin status to other users
 * - Create voucher codes
 * - Manage subscriptions
 * 
 * Usage:
 *   curl -X POST https://your-domain/api/admin/setup \
 *     -H "Content-Type: application/json" \
 *     -d '{"email": "admin@example.com", "password": "secure-passphrase", "setupSecret": "YOUR_ADMIN_SECRET"}'
 */
export const POST: RequestHandler = async ({ request }) => {
	// Check if any admin users already exist
	const [existingAdmin] = await sql`SELECT id FROM users WHERE is_admin = true LIMIT 1`;
	
	if (existingAdmin) {
		return json({ 
			error: 'Setup already complete. An admin user already exists. Use the admin panel to manage users.' 
		}, { status: 403 });
	}

	const { email, password, setupSecret } = await request.json();

	// Require the ADMIN_SECRET to create the first admin
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

	// Check if user already exists (might be a regular user we're promoting)
	const [existing] = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
	
	if (existing) {
		// User exists - promote to admin
		await sql`UPDATE users SET is_admin = true, subscription_status = 'active' WHERE id = ${existing.id}`;
		return json({ 
			success: true, 
			message: 'Existing user promoted to admin',
			email: email.toLowerCase()
		});
	}

	// Create new admin user
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
		message: 'First admin user created. Setup complete.',
		email: user.email
	});
};

// GET - Check if setup is needed
export const GET: RequestHandler = async () => {
	const [existingAdmin] = await sql`SELECT id FROM users WHERE is_admin = true LIMIT 1`;
	
	return json({
		setupRequired: !existingAdmin,
		message: existingAdmin 
			? 'Setup complete. Admin user exists.' 
			: 'No admin users exist. POST to this endpoint to create the first admin.'
	});
};
