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
			is_admin BOOLEAN DEFAULT false,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	// Add is_admin column if it doesn't exist (for existing databases)
	await sql`
		DO $$ 
		BEGIN 
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
				ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
			END IF;
		END $$;
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

	// Voucher codes
	await sql`
		CREATE TABLE IF NOT EXISTS voucher_codes (
			id SERIAL PRIMARY KEY,
			code VARCHAR(50) UNIQUE NOT NULL,
			description VARCHAR(255),
			max_uses INTEGER DEFAULT 1,
			times_used INTEGER DEFAULT 0,
			duration_months INTEGER DEFAULT 1,
			expires_at TIMESTAMP,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS voucher_redemptions (
			id SERIAL PRIMARY KEY,
			voucher_id INTEGER REFERENCES voucher_codes(id) ON DELETE CASCADE,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			subscription_expires_at TIMESTAMP NOT NULL,
			UNIQUE(voucher_id, user_id)
		)
	`;

	// Biometric auth tables
	await sql`
		CREATE TABLE IF NOT EXISTS biometric_credentials (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			credential_id VARCHAR(512) UNIQUE NOT NULL,
			public_key TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`
		CREATE TABLE IF NOT EXISTS biometric_challenges (
			user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			challenge VARCHAR(255) NOT NULL,
			expires_at TIMESTAMP NOT NULL
		)
	`;

	console.log('[MBT] Database schema initialized');
}
