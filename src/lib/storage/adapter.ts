// Storage adapter interface - all storage backends implement this

import type {
	Account,
	Category,
	RecurringItem,
	Transaction,
	AppSettings,
	ExportData
} from '$lib/types';

export interface StorageAdapter {
	// Initialization
	init(): Promise<void>;

	// Accounts
	getAccounts(): Promise<Account[]>;
	getAccount(id: number): Promise<Account | undefined>;
	createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account>;
	updateAccount(id: number, data: Partial<Account>): Promise<Account | undefined>;
	deleteAccount(id: number): Promise<void>;

	// Categories
	getCategories(): Promise<Category[]>;
	getCategory(id: number): Promise<Category | undefined>;
	createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category>;
	updateCategory(id: number, data: Partial<Category>): Promise<Category | undefined>;
	deleteCategory(id: number): Promise<void>;

	// Recurring Items
	getRecurringItems(): Promise<RecurringItem[]>;
	getRecurringItem(id: number): Promise<RecurringItem | undefined>;
	getRecurringByType(type: 'in' | 'out'): Promise<RecurringItem[]>;
	createRecurringItem(item: Omit<RecurringItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringItem>;
	updateRecurringItem(id: number, data: Partial<RecurringItem>): Promise<RecurringItem | undefined>;
	deleteRecurringItem(id: number): Promise<void>;

	// Transactions
	getTransactions(options?: TransactionQueryOptions): Promise<Transaction[]>;
	getTransaction(id: number): Promise<Transaction | undefined>;
	createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
	updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction | undefined>;
	deleteTransaction(id: number): Promise<void>;
	getRecentTransactions(limit?: number): Promise<Transaction[]>;
	getTransactionsByAccount(accountId: number, limit?: number): Promise<Transaction[]>;
	getPendingTransactions(): Promise<Transaction[]>; // Future dated, not yet applied

	// Settings
	getSettings(): Promise<AppSettings>;
	updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

	// Bulk operations
	exportData(): Promise<ExportData>;
	importData(data: ExportData): Promise<void>;
	clearAll(): Promise<void>;
}

export interface TransactionQueryOptions {
	accountId?: number;
	categoryId?: number;
	type?: 'in' | 'out';
	fromDate?: string;
	toDate?: string;
	limit?: number;
	offset?: number;
	includeUnApplied?: boolean;
}

// Default settings
export const getDefaultSettings = (): AppSettings => {
	// Calculate days until end of current month
	const today = new Date();
	const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
	const daysUntilEnd = Math.ceil((lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
	
	return {
		hasCompletedOnboarding: false,
		defaultCurrency: 'GBP',
		projectionDays: daysUntilEnd
	};
};
