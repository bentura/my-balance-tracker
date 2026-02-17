import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserFromRequest } from '$lib/server/auth';
import { sql } from '$lib/server/db';

// Register a biometric credential
export const POST: RequestHandler = async ({ request, cookies }) => {
	const user = await getUserFromRequest(cookies);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { credentialId, publicKey, attestation } = await request.json();

	if (!credentialId || !publicKey) {
		return json({ error: 'Missing credential data' }, { status: 400 });
	}

	// Verify challenge exists and hasn't expired
	const [challenge] = await sql`
		SELECT challenge FROM biometric_challenges
		WHERE user_id = ${user.id} AND expires_at > NOW()
	`;
	
	if (!challenge) {
		return json({ error: 'Challenge expired or not found' }, { status: 400 });
	}

	// Store the credential
	await sql`
		INSERT INTO biometric_credentials (user_id, credential_id, public_key, created_at)
		VALUES (${user.id}, ${credentialId}, ${publicKey}, NOW())
		ON CONFLICT (credential_id) DO UPDATE SET
			public_key = EXCLUDED.public_key
	`;

	// Clean up the challenge
	await sql`DELETE FROM biometric_challenges WHERE user_id = ${user.id}`;

	return json({ success: true });
};
