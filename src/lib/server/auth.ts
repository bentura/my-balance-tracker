import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from './db';
import { env } from '$env/dynamic/private';

const JWT_SECRET = env.JWT_SECRET || 'dev-secret-change-me';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '30d';

export interface User {
	id: number;
	email: string;
	stripe_customer_id: string | null;
	subscription_status: string;
	subscription_id: string | null;
	is_admin: boolean;
	created_at: Date;
}

export interface JwtPayload {
	userId: number;
	email: string;
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
	return jwt.sign(
		{ userId: user.id, email: user.email } as JwtPayload,
		JWT_SECRET,
		{ expiresIn: TOKEN_EXPIRY }
	);
}

export function verifyToken(token: string): JwtPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as JwtPayload;
	} catch {
		return null;
	}
}

export async function createUser(email: string, password: string): Promise<User | null> {
	const passwordHash = await hashPassword(password);
	
	try {
		const [user] = await sql<User[]>`
			INSERT INTO users (email, password_hash)
			VALUES (${email.toLowerCase()}, ${passwordHash})
			RETURNING id, email, stripe_customer_id, subscription_status, subscription_id, created_at
		`;
		
		// Create default settings
		await sql`
			INSERT INTO user_settings (user_id)
			VALUES (${user.id})
		`;
		
		return user;
	} catch (err: any) {
		if (err.code === '23505') {
			// Unique constraint violation - email exists
			return null;
		}
		throw err;
	}
}

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
	const [user] = await sql<(User & { password_hash: string })[]>`
		SELECT id, email, password_hash, stripe_customer_id, subscription_status, subscription_id, is_admin, created_at
		FROM users
		WHERE email = ${email.toLowerCase()}
	`;
	return user || null;
}

export async function getUserById(id: number): Promise<User | null> {
	const [user] = await sql<User[]>`
		SELECT id, email, stripe_customer_id, subscription_status, subscription_id, is_admin, created_at
		FROM users
		WHERE id = ${id}
	`;
	return user || null;
}

export async function setUserAdmin(userId: number, isAdmin: boolean): Promise<void> {
	await sql`
		UPDATE users
		SET is_admin = ${isAdmin}, updated_at = CURRENT_TIMESTAMP
		WHERE id = ${userId}
	`;
}

export async function updateUserSubscription(
	userId: number,
	data: { 
		stripe_customer_id?: string;
		subscription_status?: string;
		subscription_id?: string;
	}
): Promise<void> {
	const sets: string[] = [];
	const values: any[] = [];
	
	if (data.stripe_customer_id !== undefined) {
		sets.push('stripe_customer_id');
		values.push(data.stripe_customer_id);
	}
	if (data.subscription_status !== undefined) {
		sets.push('subscription_status');
		values.push(data.subscription_status);
	}
	if (data.subscription_id !== undefined) {
		sets.push('subscription_id');
		values.push(data.subscription_id);
	}
	
	if (sets.length === 0) return;
	
	await sql`
		UPDATE users
		SET 
			stripe_customer_id = COALESCE(${data.stripe_customer_id ?? null}, stripe_customer_id),
			subscription_status = COALESCE(${data.subscription_status ?? null}, subscription_status),
			subscription_id = COALESCE(${data.subscription_id ?? null}, subscription_id),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ${userId}
	`;
}

// Get user from request cookies
export async function getUserFromRequest(cookies: { get: (name: string) => string | undefined }): Promise<User | null> {
	const token = cookies.get('auth_token');
	if (!token) return null;
	
	const payload = verifyToken(token);
	if (!payload) return null;
	
	return getUserById(payload.userId);
}
