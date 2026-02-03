import Dexie, { type Table } from 'dexie';

export type TransactionType = 'in' | 'out';

export interface Account {
	id?: number;
	name: string;
	balance: number;
	createdAt: string;
}

export interface RecurringIncome {
	id?: number;
	name: string;
	amount: number;
	dayOfMonth: number;
	accountId: number;
	createdAt: string;
}

export interface RecurringOutgoing {
	id?: number;
	name: string;
	amount: number;
	dayOfMonth: number;
	accountId: number;
	createdAt: string;
}

export interface Transaction {
	id?: number;
	description: string;
	amount: number;
	type: TransactionType;
	accountId: number;
	date: string;
	createdAt: string;
}

class FinDb extends Dexie {
	accounts!: Table<Account, number>;
	recurringIncomes!: Table<RecurringIncome, number>;
	recurringOutgoings!: Table<RecurringOutgoing, number>;
	transactions!: Table<Transaction, number>;

	constructor() {
		super('finapp-db');
		this.version(1).stores({
			accounts: '++id, name, createdAt',
			recurringIncomes: '++id, accountId, dayOfMonth, createdAt',
			recurringOutgoings: '++id, accountId, dayOfMonth, createdAt',
			transactions: '++id, accountId, date, createdAt'
		});
	}
}

export const db = new FinDb();
