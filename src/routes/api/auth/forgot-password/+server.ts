import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPasswordResetToken } from '$lib/server/auth';
import { sendPasswordResetEmail } from '$lib/server/email';

export const POST: RequestHandler = async ({ request, url }) => {
	const { email } = await request.json();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	// Generate reset token (returns null if user not found)
	const token = await createPasswordResetToken(email.toLowerCase());

	// Always return success to prevent email enumeration
	if (token) {
		const baseUrl = `${url.protocol}//${url.host}`;
		await sendPasswordResetEmail(email.toLowerCase(), token, baseUrl);
	}

	return json({ 
		success: true, 
		message: 'If an account exists with that email, a reset link has been sent.' 
	});
};
