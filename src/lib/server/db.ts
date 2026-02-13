import postgres from 'postgres';
import { env } from '$env/dynamic/private';

export const sql = postgres(env.DATABASE_URL || 'postgresql://mbt:mbt_secret_2026@db:5432/mbt');

// Initialize database schema
export async function initDb() {
	await sql`
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			stripe_customer_id VARCHAR(255),
			subscription_status VARCHAR(50) DEFAULT 'free',
			subscription_id VARCHAR(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS sessions (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			token VARCHAR(255) UNIQUE NOT NULL,
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS accounts (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			balance DECIMAL(15,2) DEFAULT 0,
			currency VARCHAR(10) DEFAULT 'GBP',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS categories (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			color VARCHAR(20),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS recurring_items (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			amount DECIMAL(15,2) NOT NULL,
			type VARCHAR(20) NOT NULL,
			frequency VARCHAR(20) NOT NULL,
			day_of_month INTEGER,
			day_of_week INTEGER,
			account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
			to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
			category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
			is_active BOOLEAN DEFAULT true,
			last_applied DATE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS transactions (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			description VARCHAR(255) NOT NULL,
			amount DECIMAL(15,2) NOT NULL,
			type VARCHAR(20) NOT NULL,
			account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
			to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
			category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
			date DATE NOT NULL,
			is_applied BOOLEAN DEFAULT true,
			recurring_id INTEGER REFERENCES recurring_items(id) ON DELETE SET NULL,
			linked_transaction_id INTEGER,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS user_settings (
			id SERIAL PRIMARY KEY,
			user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
			default_currency VARCHAR(10) DEFAULT 'GBP',
			projection_days INTEGER DEFAULT 30,
			last_daily_run DATE
		)
	`;

	console.log('[MBT] Database schema initialized');
}
