import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { getUserFromRequest, updateUserPassword } from '$lib/server/auth';
import { sendEmail } from '$lib/server/email';
import crypto from 'crypto';

// Generate a random 12-character password
function generatePassword(): string {
	const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let password = '';
	const bytes = crypto.randomBytes(12);
	for (let i = 0; i < 12; i++) {
		password += chars[bytes[i] % chars.length];
	}
	return password;
}

export const POST: RequestHandler = async ({ params, cookies }) => {
	const user = await getUserFromRequest(cookies);
	
	if (!user || !user.is_admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = parseInt(params.id, 10);

	// Get target user
	const [targetUser] = await sql`SELECT * FROM users WHERE id = ${userId}`;
	if (!targetUser) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Generate new password
	const newPassword = generatePassword();

	// Update password
	await updateUserPassword(userId, newPassword);

	// Send email
	const emailSent = await sendEmail({
		to: targetUser.email,
		subject: 'Your MyBalanceTracker password has been reset',
		text: `Your password has been reset.\n\nYour new password is: ${newPassword}\n\nPlease log in at https://mybalancetracker.co.uk and consider changing it to something only you know.`,
		html: `
			<h2>Password Reset</h2>
			<p>Your password has been reset.</p>
			<p>Your new password is: <strong>${newPassword}</strong></p>
			<p>Please <a href="https://mybalancetracker.co.uk/login">log in</a> and consider changing it to something only you know.</p>
		`
	});

	if (!emailSent) {
		return json({ error: 'Password reset but failed to send email' }, { status: 500 });
	}

	return json({ success: true });
};
