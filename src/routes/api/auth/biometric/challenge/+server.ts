import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';
import crypto from 'crypto';

// Generate a challenge for WebAuthn
export const POST: RequestHandler = async ({ request, cookies }) => {
	const { action } = await request.json();
	
	// Generate random challenge
	const challenge = crypto.randomBytes(32).toString('base64');
	
	if (action === 'register') {
		// User must be logged in to register biometric
		const user = await getUserFromRequest(cookies);
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		// Store challenge temporarily (expires in 5 minutes)
		await sql`
			INSERT INTO biometric_challenges (user_id, challenge, expires_at)
			VALUES (${user.id}, ${challenge}, NOW() + INTERVAL '5 minutes')
			ON CONFLICT (user_id) DO UPDATE SET
				challenge = EXCLUDED.challenge,
				expires_at = EXCLUDED.expires_at
		`;
		
		return json({ challenge });
	}
	
	if (action === 'authenticate') {
		// Get all credentials that can be used (for discoverable credentials)
		// In a real app, you might want to get this from a cookie or session
		const credentials = await sql`
			SELECT credential_id as id FROM biometric_credentials
		`;
		
		return json({ 
			challenge,
			allowCredentials: credentials
		});
	}
	
	return json({ error: 'Invalid action' }, { status: 400 });
};
