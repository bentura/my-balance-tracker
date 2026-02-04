// Main application store - reactive state management

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { StorageAdapter } from '$lib/storage';
import { DexieAdapter } from '$lib/storage';
import type {
	Account,
	Category,
	RecurringItem,
	Transaction,
	AppSettings
} from '$lib/types';

// Storage adapter instance
let storage: StorageAdapter | null = null;

// Core data stores
export const accounts = writable<Account[]>([]);
export const categories = writable<Category[]>([]);
export const recurringItems = writable<RecurringItem[]>([]);
export const recentTransactions = writable<Transaction[]>([]);
export const pendingTransactions = writable<Transaction[]>([]);
export const settings = writable<AppSettings | null>(null);

// UI state
export const isLoading = writable(true);
export const isInitialized = writable(false);
export const feedback = writable<{ message: string; type: 'success' | 'error' } | null>(null);

// Derived stores
export const hasCompletedOnboarding = derived(
	settings,
	$settings => $settings?.hasCompletedOnboarding ?? false
);

export const recurringIncome = derived(
	recurringItems,
	$items => $items.filter(item => item.type === 'in' && item.isActive)
);

export const recurringOutgoings = derived(
	recurringItems,
	$items => $items.filter(item => item.type === 'out' && item.isActive)
);

// Get account by ID
export const getAccountById = (id: number): Account | undefined => {
	return get(accounts).find(a => a.id === id);
};

// Get category by ID
export const getCategoryById = (id: number): Category | undefined => {
	return get(categories).find(c => c.id === id);
};

// Calculate projected balance for an account
export const getProjectedBalance = (accountId: number): number => {
	const account = getAccountById(accountId);
	if (!account) return 0;

	const $settings = get(settings);
	const projectionDays = $settings?.projectionDays ?? 30;
	const today = new Date();
	const endDate = new Date(today);
	endDate.setDate(endDate.getDate() + projectionDays);

	const $recurringItems = get(recurringItems).filter(
		item => item.accountId === accountId && item.isActive
	);

	let projected = account.balance;

	// Add projected recurring items
	for (const item of $recurringItems) {
		const occurrences = countOccurrencesInPeriod(item, today, endDate);
		const amount = item.type === 'in' ? item.amount : -item.amount;
		projected += amount * occurrences;
	}

	// Add future manual transactions
	const $pendingTransactions = get(pendingTransactions);
	for (const tx of $pendingTransactions) {
		if (tx.accountId === accountId && tx.date) {
			const txDate = new Date(tx.date);
			if (txDate <= endDate) {
				const amount = tx.type === 'in' ? tx.amount : -tx.amount;
				projected += amount;
			}
		}
	}

	return projected;
};

// Helper: count how many times a recurring item occurs in a date range
function countOccurrencesInPeriod(item: RecurringItem, start: Date, end: Date): number {
	let count = 0;
	const current = new Date(start);

	while (current <= end) {
		if (item.frequency === 'monthly' && item.dayOfMonth !== undefined) {
			if (current.getDate() === item.dayOfMonth) {
				count++;
			}
		} else if (item.frequency === 'weekly' && item.dayOfWeek !== undefined) {
			if (current.getDay() === item.dayOfWeek) {
				count++;
			}
		} else if (item.frequency === 'daily') {
			count++;
		} else if (item.frequency === 'yearly') {
			// For yearly, check if it falls within the period
			// (simplified - assumes dayOfMonth is the day)
			if (item.dayOfMonth !== undefined && current.getDate() === item.dayOfMonth) {
				count++;
			}
		}
		current.setDate(current.getDate() + 1);
	}

	return count;
}

// Show feedback message
let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
export const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
	feedback.set({ message, type });
	if (feedbackTimer) clearTimeout(feedbackTimer);
	feedbackTimer = setTimeout(() => feedback.set(null), 4000);
};

// Initialize the store
export const initStore = async (): Promise<void> => {
	if (!browser) return;
	if (storage) return; // Already initialized

	isLoading.set(true);

	try {
		storage = new DexieAdapter();
		await storage.init();
		await refreshAll();
		isInitialized.set(true);
	} catch (error) {
		console.error('Failed to initialize storage:', error);
		showFeedback('Failed to load data', 'error');
	} finally {
		isLoading.set(false);
	}
};

// Refresh all data from storage
export const refreshAll = async (): Promise<void> => {
	if (!storage) return;

	const [
		accountsData,
		categoriesData,
		recurringData,
		transactionsData,
		pendingData,
		settingsData
	] = await Promise.all([
		storage.getAccounts(),
		storage.getCategories(),
		storage.getRecurringItems(),
		storage.getRecentTransactions(10),
		storage.getPendingTransactions(),
		storage.getSettings()
	]);

	accounts.set(accountsData);
	categories.set(categoriesData);
	recurringItems.set(recurringData);
	recentTransactions.set(transactionsData);
	pendingTransactions.set(pendingData);
	settings.set(settingsData);
};

// === Account operations ===

export const createAccount = async (data: { name: string; balance: number; currency: string }): Promise<Account | null> => {
	if (!storage) return null;
	const account = await storage.createAccount(data);
	await refreshAll();
	showFeedback('Account created');
	return account;
};

export const updateAccount = async (id: number, data: Partial<Account>): Promise<void> => {
	if (!storage) return;
	await storage.updateAccount(id, data);
	await refreshAll();
	showFeedback('Account updated');
};

export const deleteAccount = async (id: number): Promise<void> => {
	if (!storage) return;
	await storage.deleteAccount(id);
	await refreshAll();
	showFeedback('Account deleted');
};

// === Category operations ===

export const createCategory = async (data: { name: string; color?: string }): Promise<Category | null> => {
	if (!storage) return null;
	const category = await storage.createCategory(data);
	await refreshAll();
	return category;
};

export const deleteCategory = async (id: number): Promise<void> => {
	if (!storage) return;
	await storage.deleteCategory(id);
	await refreshAll();
};

// === Recurring item operations ===

export const createRecurringItem = async (data: Omit<RecurringItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringItem | null> => {
	if (!storage) return null;
	const item = await storage.createRecurringItem(data);
	await refreshAll();
	showFeedback(`Recurring ${data.type === 'in' ? 'income' : 'outgoing'} added`);
	return item;
};

export const updateRecurringItem = async (id: number, data: Partial<RecurringItem>): Promise<void> => {
	if (!storage) return;
	await storage.updateRecurringItem(id, data);
	await refreshAll();
	showFeedback('Updated');
};

export const deleteRecurringItem = async (id: number): Promise<void> => {
	if (!storage) return;
	await storage.deleteRecurringItem(id);
	await refreshAll();
	showFeedback('Deleted');
};

// === Transaction operations ===

export const createTransaction = async (data: {
	description: string;
	amount: number;
	type: 'in' | 'out';
	accountId: number;
	categoryId?: number;
	date: string;
}): Promise<Transaction | null> => {
	if (!storage) return null;

	const today = new Date().toISOString().slice(0, 10);
	const isFuture = data.date > today;

	const tx = await storage.createTransaction({
		...data,
		isApplied: !isFuture
	});

	// If not future-dated, update account balance immediately
	if (!isFuture) {
		const account = await storage.getAccount(data.accountId);
		if (account) {
			const delta = data.type === 'in' ? data.amount : -data.amount;
			await storage.updateAccount(data.accountId, {
				balance: account.balance + delta
			});
		}
	}

	await refreshAll();
	showFeedback(isFuture ? 'Upcoming transaction added' : 'Transaction added');
	return tx;
};

export const deleteTransaction = async (id: number, adjustBalance = true): Promise<void> => {
	if (!storage) return;

	if (adjustBalance) {
		const tx = await storage.getTransaction(id);
		if (tx && tx.isApplied) {
			const account = await storage.getAccount(tx.accountId);
			if (account) {
				// Reverse the transaction effect
				const delta = tx.type === 'in' ? -tx.amount : tx.amount;
				await storage.updateAccount(tx.accountId, {
					balance: account.balance + delta
				});
			}
		}
	}

	await storage.deleteTransaction(id);
	await refreshAll();
	showFeedback('Transaction deleted');
};

// === Settings operations ===

export const updateSettings = async (data: Partial<AppSettings>): Promise<void> => {
	if (!storage) return;
	await storage.updateSettings(data);
	await refreshAll();
};

export const completeOnboarding = async (): Promise<void> => {
	await updateSettings({ hasCompletedOnboarding: true });
};

// === Import/Export ===

export const exportData = async (): Promise<string | null> => {
	if (!storage) return null;
	const data = await storage.exportData();
	return JSON.stringify(data, null, 2);
};

export const importData = async (jsonString: string): Promise<boolean> => {
	if (!storage) return false;
	try {
		const data = JSON.parse(jsonString);
		await storage.importData(data);
		await refreshAll();
		showFeedback('Data imported successfully');
		return true;
	} catch (error) {
		showFeedback('Failed to import data', 'error');
		return false;
	}
};

// === Daily processing ===

export const runDailyProcessing = async (): Promise<void> => {
	if (!storage) return;

	const today = new Date();
	const todayStr = today.toISOString().slice(0, 10);
	const $settings = get(settings);

	// Check if already run today
	if ($settings?.lastDailyRun === todayStr) return;

	console.log('[MBT] Running daily processing for', todayStr);

	// 1. Apply pending future transactions that are now due
	const pending = await storage.getPendingTransactions();
	for (const tx of pending) {
		if (tx.date <= todayStr) {
			const account = await storage.getAccount(tx.accountId);
			if (account) {
				const delta = tx.type === 'in' ? tx.amount : -tx.amount;
				await storage.updateAccount(tx.accountId, {
					balance: account.balance + delta
				});
				await storage.updateTransaction(tx.id!, { isApplied: true });
				console.log('[MBT] Applied pending transaction:', tx.description);
			}
		}
	}

	// 2. Process recurring items due today
	const recurringItems = await storage.getRecurringItems();
	const todayDayOfMonth = today.getDate();
	const todayDayOfWeek = today.getDay();

	for (const item of recurringItems) {
		if (!item.isActive) continue;

		// Check if already applied today
		if (item.lastApplied === todayStr) continue;

		// Check if due today based on frequency
		let isDue = false;
		if (item.frequency === 'daily') {
			isDue = true;
		} else if (item.frequency === 'weekly' && item.dayOfWeek === todayDayOfWeek) {
			isDue = true;
		} else if (item.frequency === 'monthly' && item.dayOfMonth === todayDayOfMonth) {
			isDue = true;
		} else if (item.frequency === 'yearly') {
			// For yearly, check if it's the right day and month
			// (simplified: just checks day of month for now)
			if (item.dayOfMonth === todayDayOfMonth) {
				// Check if it hasn't been applied this year
				const lastAppliedYear = item.lastApplied ? new Date(item.lastApplied).getFullYear() : 0;
				if (lastAppliedYear < today.getFullYear()) {
					isDue = true;
				}
			}
		}

		if (isDue) {
			// Create a transaction for this recurring item
			const tx = await storage.createTransaction({
				description: item.name,
				amount: item.amount,
				type: item.type,
				accountId: item.accountId,
				categoryId: item.categoryId,
				date: todayStr,
				isApplied: true,
				recurringId: item.id
			});

			// Update account balance
			const account = await storage.getAccount(item.accountId);
			if (account) {
				const delta = item.type === 'in' ? item.amount : -item.amount;
				await storage.updateAccount(item.accountId, {
					balance: account.balance + delta
				});
			}

			// Mark the recurring item as applied today
			await storage.updateRecurringItem(item.id!, { lastApplied: todayStr });
			console.log('[MBT] Applied recurring item:', item.name);
		}
	}

	// Update last run date
	await storage.updateSettings({ lastDailyRun: todayStr });
	await refreshAll();
	console.log('[MBT] Daily processing complete');
};

// Get storage adapter (for advanced operations)
export const getStorage = (): StorageAdapter | null => storage;
