// Core data types for MBT

export type TransactionType = 'in' | 'out' | 'transfer';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Account {
	id?: number;
	name: string;
	balance: number;
	currency: string;
	createdAt: string;
	updatedAt: string;
}

export interface Category {
	id?: number;
	name: string;
	color?: string;
	createdAt: string;
}

export interface RecurringItem {
	id?: number;
	name: string;
	amount: number;
	type: TransactionType;
	frequency: Frequency;
	dayOfMonth?: number; // 1-31 for monthly
	dayOfWeek?: number;  // 0-6 for weekly (0 = Sunday)
	accountId: number;
	toAccountId?: number; // For transfers: destination account
	categoryId?: number;
	isActive: boolean;
	lastApplied?: string;
	createdAt: string;
	updatedAt: string;
}

export interface Transaction {
	id?: number;
	description: string;
	amount: number;
	type: TransactionType;
	accountId: number;
	toAccountId?: number;  // For transfers: destination account
	categoryId?: number;
	date: string;          // The date the transaction occurs/occurred
	isApplied: boolean;    // Has this affected the balance yet?
	recurringId?: number;  // If generated from a recurring item
	linkedTransactionId?: number; // For transfers: links the two transactions together
	createdAt: string;
}

export interface AppSettings {
	hasCompletedOnboarding: boolean;
	defaultCurrency: string;
	projectionDays: number; // How far ahead to project
	lastDailyRun?: string;  // Last time daily processing ran
}

// For import/export
export interface ExportData {
	version: number;
	exportedAt: string;
	accounts: Account[];
	categories: Category[];
	recurringItems: RecurringItem[];
	transactions: Transaction[];
	settings: AppSettings;
}
