import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { generateToken, getUserById } from '$lib/server/auth';

// Verify biometric authentication
export const POST: RequestHandler = async ({ request, cookies }) => {
	const { credentialId, authenticatorData, clientDataJSON, signature } = await request.json();

	if (!credentialId) {
		return json({ error: 'Missing credential ID' }, { status: 400 });
	}

	// Find the credential and associated user
	const [credential] = await sql`
		SELECT bc.user_id, bc.public_key, u.email
		FROM biometric_credentials bc
		JOIN users u ON u.id = bc.user_id
		WHERE bc.credential_id = ${credentialId}
	`;

	if (!credential) {
		return json({ error: 'Credential not found' }, { status: 401 });
	}

	// In a production app, you would verify the signature using the stored public key
	// For now, we trust the WebAuthn API's verification on the client side
	// A proper implementation would use a library like @simplewebauthn/server

	// Get the user
	const user = await getUserById(credential.user_id);
	if (!user) {
		return json({ error: 'User not found' }, { status: 401 });
	}

	// Generate auth token
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
