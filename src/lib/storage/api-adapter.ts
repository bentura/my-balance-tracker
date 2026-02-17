// API storage adapter - for Pro users, syncs with server

import type {
	Account,
	Category,
	RecurringItem,
	Transaction,
	AppSettings,
	ExportData
} from '$lib/types';
import type { StorageAdapter, TransactionQueryOptions } from './adapter';
import { getDefaultSettings } from './adapter';

export class ApiAdapter implements StorageAdapter {
	private baseUrl = '/api/data';
	
	async init(): Promise<void> {
		// No initialization needed for API adapter
	}

	private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
		const res = await fetch(`${this.baseUrl}${path}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options?.headers
			}
		});
		
		if (!res.ok) {
			const error = await res.json().catch(() => ({ error: 'Request failed' }));
			throw new Error(error.error || 'Request failed');
		}
		
		return res.json();
	}

	// Accounts
	async getAccounts(): Promise<Account[]> {
		return this.fetch<Account[]>('/accounts');
	}

	async getAccount(id: number): Promise<Account | undefined> {
		try {
			return await this.fetch<Account>(`/accounts/${id}`);
		} catch {
			return undefined;
		}
	}

	async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
		return this.fetch<Account>('/accounts', {
			method: 'POST',
			body: JSON.stringify(account)
		});
	}

	async updateAccount(id: number, data: Partial<Account>): Promise<Account | undefined> {
		try {
			return await this.fetch<Account>(`/accounts/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data)
			});
		} catch {
			return undefined;
		}
	}

	async deleteAccount(id: number): Promise<void> {
		await this.fetch(`/accounts/${id}`, { method: 'DELETE' });
	}

	// Categories
	async getCategories(): Promise<Category[]> {
		return this.fetch<Category[]>('/categories');
	}

	async getCategory(id: number): Promise<Category | undefined> {
		try {
			return await this.fetch<Category>(`/categories/${id}`);
		} catch {
			return undefined;
		}
	}

	async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
		return this.fetch<Category>('/categories', {
			method: 'POST',
			body: JSON.stringify(category)
		});
	}

	async updateCategory(id: number, data: Partial<Category>): Promise<Category | undefined> {
		try {
			return await this.fetch<Category>(`/categories/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data)
			});
		} catch {
			return undefined;
		}
	}

	async deleteCategory(id: number): Promise<void> {
		await this.fetch(`/categories/${id}`, { method: 'DELETE' });
	}

	// Recurring Items
	async getRecurringItems(): Promise<RecurringItem[]> {
		return this.fetch<RecurringItem[]>('/recurring');
	}

	async getRecurringItem(id: number): Promise<RecurringItem | undefined> {
		try {
			return await this.fetch<RecurringItem>(`/recurring/${id}`);
		} catch {
			return undefined;
		}
	}

	async getRecurringByType(type: 'in' | 'out'): Promise<RecurringItem[]> {
		return this.fetch<RecurringItem[]>(`/recurring?type=${type}`);
	}

	async createRecurringItem(item: Omit<RecurringItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringItem> {
		return this.fetch<RecurringItem>('/recurring', {
			method: 'POST',
			body: JSON.stringify(item)
		});
	}

	async updateRecurringItem(id: number, data: Partial<RecurringItem>): Promise<RecurringItem | undefined> {
		try {
			return await this.fetch<RecurringItem>(`/recurring/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data)
			});
		} catch {
			return undefined;
		}
	}

	async deleteRecurringItem(id: number): Promise<void> {
		await this.fetch(`/recurring/${id}`, { method: 'DELETE' });
	}

	// Transactions
	async getTransactions(options?: TransactionQueryOptions): Promise<Transaction[]> {
		const params = new URLSearchParams();
		if (options?.accountId) params.set('accountId', options.accountId.toString());
		if (options?.categoryId) params.set('categoryId', options.categoryId.toString());
		if (options?.type) params.set('type', options.type);
		if (options?.fromDate) params.set('fromDate', options.fromDate);
		if (options?.toDate) params.set('toDate', options.toDate);
		if (options?.limit) params.set('limit', options.limit.toString());
		if (options?.offset) params.set('offset', options.offset.toString());
		if (options?.includeUnApplied) params.set('includeUnApplied', 'true');
		
		const query = params.toString();
		return this.fetch<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
	}

	async getTransaction(id: number): Promise<Transaction | undefined> {
		try {
			return await this.fetch<Transaction>(`/transactions/${id}`);
		} catch {
			return undefined;
		}
	}

	async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
		return this.fetch<Transaction>('/transactions', {
			method: 'POST',
			body: JSON.stringify(tx)
		});
	}

	async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction | undefined> {
		try {
			return await this.fetch<Transaction>(`/transactions/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data)
			});
		} catch {
			return undefined;
		}
	}

	async deleteTransaction(id: number): Promise<void> {
		await this.fetch(`/transactions/${id}`, { method: 'DELETE' });
	}

	async getRecentTransactions(limit = 10): Promise<Transaction[]> {
		return this.fetch<Transaction[]>(`/transactions?limit=${limit}&includeUnApplied=true`);
	}

	async getTransactionsByAccount(accountId: number, limit = 50): Promise<Transaction[]> {
		return this.fetch<Transaction[]>(`/transactions?accountId=${accountId}&limit=${limit}&includeUnApplied=true`);
	}

	async getPendingTransactions(): Promise<Transaction[]> {
		return this.fetch<Transaction[]>('/transactions?pending=true');
	}

	// Settings
	async getSettings(): Promise<AppSettings> {
		try {
			const settings = await this.fetch<AppSettings>('/settings');
			return { ...getDefaultSettings(), ...settings, hasCompletedOnboarding: true };
		} catch {
			return { ...getDefaultSettings(), hasCompletedOnboarding: true };
		}
	}

	async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
		return this.fetch<AppSettings>('/settings', {
			method: 'PATCH',
			body: JSON.stringify(settings)
		});
	}

	// Bulk operations
	async exportData(): Promise<ExportData> {
		return this.fetch<ExportData>('/export');
	}

	async importData(data: ExportData): Promise<void> {
		await this.fetch('/import', {
			method: 'POST',
			body: JSON.stringify(data)
		});
	}

	async clearAll(): Promise<void> {
		await this.fetch('/clear', { method: 'POST' });
	}
}
