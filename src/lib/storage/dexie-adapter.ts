// Dexie (IndexedDB) storage adapter implementation

import Dexie, { type Table } from 'dexie';
import type {
	Account,
	Category,
	RecurringItem,
	Transaction,
	AppSettings,
	ExportData
} from '$lib/types';
import { type StorageAdapter, type TransactionQueryOptions, getDefaultSettings } from './adapter';

class MbtDatabase extends Dexie {
	accounts!: Table<Account, number>;
	categories!: Table<Category, number>;
	recurringItems!: Table<RecurringItem, number>;
	transactions!: Table<Transaction, number>;
	settings!: Table<AppSettings & { id: number }, number>;

	constructor() {
		super('mbt-db');
		this.version(2).stores({
			accounts: '++id, name, createdAt',
			categories: '++id, name',
			recurringItems: '++id, type, accountId, isActive, createdAt',
			transactions: '++id, accountId, categoryId, date, isApplied, recurringId',
			settings: 'id'
		});
		// Version 3: Add toAccountId and linkedTransactionId for transfers
		this.version(3).stores({
			accounts: '++id, name, createdAt',
			categories: '++id, name',
			recurringItems: '++id, type, accountId, isActive, createdAt',
			transactions: '++id, accountId, toAccountId, categoryId, date, isApplied, recurringId, linkedTransactionId',
			settings: 'id'
		});
	}
}

export class DexieAdapter implements StorageAdapter {
	private db: MbtDatabase;

	constructor() {
		this.db = new MbtDatabase();
	}

	async init(): Promise<void> {
		// Ensure default settings exist
		const existing = await this.db.settings.get(1);
		if (!existing) {
			await this.db.settings.put({ ...getDefaultSettings(), id: 1 });
		}
	}

	// === Accounts ===

	async getAccounts(): Promise<Account[]> {
		return this.db.accounts.orderBy('createdAt').toArray();
	}

	async getAccount(id: number): Promise<Account | undefined> {
		return this.db.accounts.get(id);
	}

	async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
		const now = new Date().toISOString();
		const newAccount: Account = {
			...account,
			createdAt: now,
			updatedAt: now
		};
		const id = await this.db.accounts.add(newAccount);
		return { ...newAccount, id };
	}

	async updateAccount(id: number, data: Partial<Account>): Promise<Account | undefined> {
		await this.db.accounts.update(id, { ...data, updatedAt: new Date().toISOString() });
		return this.db.accounts.get(id);
	}

	async deleteAccount(id: number): Promise<void> {
		await this.db.accounts.delete(id);
		// Also delete related transactions and recurring items
		await this.db.transactions.where('accountId').equals(id).delete();
		await this.db.recurringItems.where('accountId').equals(id).delete();
	}

	// === Categories ===

	async getCategories(): Promise<Category[]> {
		return this.db.categories.orderBy('name').toArray();
	}

	async getCategory(id: number): Promise<Category | undefined> {
		return this.db.categories.get(id);
	}

	async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
		const newCategory: Category = {
			...category,
			createdAt: new Date().toISOString()
		};
		const id = await this.db.categories.add(newCategory);
		return { ...newCategory, id };
	}

	async updateCategory(id: number, data: Partial<Category>): Promise<Category | undefined> {
		await this.db.categories.update(id, data);
		return this.db.categories.get(id);
	}

	async deleteCategory(id: number): Promise<void> {
		await this.db.categories.delete(id);
		// Remove category from transactions and recurring items (don't delete them)
		await this.db.transactions.where('categoryId').equals(id).modify({ categoryId: undefined });
		await this.db.recurringItems.where('categoryId').equals(id).modify({ categoryId: undefined });
	}

	// === Recurring Items ===

	async getRecurringItems(): Promise<RecurringItem[]> {
		return this.db.recurringItems.orderBy('createdAt').toArray();
	}

	async getRecurringItem(id: number): Promise<RecurringItem | undefined> {
		return this.db.recurringItems.get(id);
	}

	async getRecurringByType(type: 'in' | 'out'): Promise<RecurringItem[]> {
		return this.db.recurringItems.where('type').equals(type).toArray();
	}

	async createRecurringItem(item: Omit<RecurringItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringItem> {
		const now = new Date().toISOString();
		const newItem: RecurringItem = {
			...item,
			createdAt: now,
			updatedAt: now
		};
		const id = await this.db.recurringItems.add(newItem);
		return { ...newItem, id };
	}

	async updateRecurringItem(id: number, data: Partial<RecurringItem>): Promise<RecurringItem | undefined> {
		await this.db.recurringItems.update(id, { ...data, updatedAt: new Date().toISOString() });
		return this.db.recurringItems.get(id);
	}

	async deleteRecurringItem(id: number): Promise<void> {
		await this.db.recurringItems.delete(id);
	}

	// === Transactions ===

	async getTransactions(options: TransactionQueryOptions = {}): Promise<Transaction[]> {
		let collection = this.db.transactions.orderBy('date').reverse();

		// Apply filters using filter() since Dexie doesn't support compound queries easily
		let results = await collection.toArray();

		if (options.accountId !== undefined) {
			results = results.filter(t => t.accountId === options.accountId);
		}
		if (options.categoryId !== undefined) {
			results = results.filter(t => t.categoryId === options.categoryId);
		}
		if (options.type) {
			results = results.filter(t => t.type === options.type);
		}
		if (options.fromDate) {
			results = results.filter(t => t.date >= options.fromDate!);
		}
		if (options.toDate) {
			results = results.filter(t => t.date <= options.toDate!);
		}
		if (!options.includeUnApplied) {
			results = results.filter(t => t.isApplied);
		}

		// Apply pagination
		if (options.offset) {
			results = results.slice(options.offset);
		}
		if (options.limit) {
			results = results.slice(0, options.limit);
		}

		return results;
	}

	async getTransaction(id: number): Promise<Transaction | undefined> {
		return this.db.transactions.get(id);
	}

	async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
		const newTx: Transaction = {
			...tx,
			createdAt: new Date().toISOString()
		};
		const id = await this.db.transactions.add(newTx);
		return { ...newTx, id };
	}

	async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction | undefined> {
		await this.db.transactions.update(id, data);
		return this.db.transactions.get(id);
	}

	async deleteTransaction(id: number): Promise<void> {
		await this.db.transactions.delete(id);
	}

	async getRecentTransactions(limit = 10): Promise<Transaction[]> {
		return this.db.transactions
			.orderBy('date')
			.reverse()
			.filter(t => t.isApplied)
			.limit(limit)
			.toArray();
	}

	async getTransactionsByAccount(accountId: number, limit?: number): Promise<Transaction[]> {
		let query = this.db.transactions
			.where('accountId')
			.equals(accountId)
			.reverse();
		
		const results = await query.toArray();
		return limit ? results.slice(0, limit) : results;
	}

	async getPendingTransactions(): Promise<Transaction[]> {
		return this.db.transactions
			.filter(t => !t.isApplied)
			.toArray();
	}

	// === Settings ===

	async getSettings(): Promise<AppSettings> {
		const settings = await this.db.settings.get(1);
		return settings ?? defaultSettings;
	}

	async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
		const current = await this.getSettings();
		const newSettings = { ...current, ...updates, id: 1 };
		await this.db.settings.put(newSettings);
		return newSettings;
	}

	// === Bulk Operations ===

	async exportData(): Promise<ExportData> {
		const [accounts, categories, recurringItems, transactions, settings] = await Promise.all([
			this.getAccounts(),
			this.getCategories(),
			this.getRecurringItems(),
			this.db.transactions.toArray(),
			this.getSettings()
		]);

		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			accounts,
			categories,
			recurringItems,
			transactions,
			settings
		};
	}

	async importData(data: ExportData): Promise<void> {
		await this.clearAll();

		// Import in order to maintain relationships
		for (const account of data.accounts) {
			await this.db.accounts.add(account);
		}
		for (const category of data.categories) {
			await this.db.categories.add(category);
		}
		for (const item of data.recurringItems) {
			await this.db.recurringItems.add(item);
		}
		for (const tx of data.transactions) {
			await this.db.transactions.add(tx);
		}
		await this.db.settings.put({ ...data.settings, id: 1 });
	}

	async clearAll(): Promise<void> {
		await Promise.all([
			this.db.accounts.clear(),
			this.db.categories.clear(),
			this.db.recurringItems.clear(),
			this.db.transactions.clear(),
			this.db.settings.clear()
		]);
	}
}
