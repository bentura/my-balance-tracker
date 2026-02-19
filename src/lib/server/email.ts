// Email service using Nodemailer
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

// Create transporter (lazy init)
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
	if (!_transporter) {
		const host = env.SMTP_HOST || 'smtp.gmail.com';
		const port = parseInt(env.SMTP_PORT || '587', 10);
		const user = env.SMTP_USER;
		const pass = env.SMTP_PASS;

		if (!user || !pass) {
			throw new Error('SMTP_USER and SMTP_PASS must be configured');
		}

		_transporter = nodemailer.createTransport({
			host,
			port,
			secure: port === 465, // true for 465, false for other ports
			auth: {
				user,
				pass
			}
		});
	}
	return _transporter;
}

export interface EmailOptions {
	to: string;
	subject: string;
	text?: string;
	html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
	try {
		const transporter = getTransporter();
		const from = env.SMTP_FROM || env.SMTP_USER;

		await transporter.sendMail({
			from: `MyBalanceTracker <${from}>`,
			to: options.to,
			subject: options.subject,
			text: options.text,
			html: options.html
		});

		console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
		return true;
	} catch (error) {
		console.error('[Email] Failed to send:', error);
		return false;
	}
}

// Password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
	const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

	return sendEmail({
		to: email,
		subject: 'Reset your MyBalanceTracker password',
		text: `
You requested a password reset for your MyBalanceTracker account.

Click this link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.
		`.trim(),
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 480px; margin: 0 auto; padding: 20px; }
		.button { display: inline-block; background: #4a7c59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
		.footer { margin-top: 30px; font-size: 12px; color: #888; }
	</style>
</head>
<body>
	<div class="container">
		<h2>Reset your password</h2>
		<p>You requested a password reset for your MyBalanceTracker account.</p>
		<p>Click the button below to reset your password:</p>
		<a href="${resetLink}" class="button">Reset Password</a>
		<p>Or copy this link: <br><a href="${resetLink}">${resetLink}</a></p>
		<p><strong>This link will expire in 1 hour.</strong></p>
		<div class="footer">
			<p>If you didn't request this, you can safely ignore this email.</p>
		</div>
	</div>
</body>
</html>
		`.trim()
	});
}
