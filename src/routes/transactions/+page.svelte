<script lang="ts">
	import { onMount } from 'svelte';
	import { Modal } from '$lib/components';
	import {
		accounts,
		getStorage,
		getAccountById,
		deleteTransaction
	} from '$lib/stores';
	import type { Transaction } from '$lib/types';

	let transactions = $state<Transaction[]>([]);
	let isLoading = $state(true);
	let showDeleteConfirm = $state(false);
	let txToDelete = $state<Transaction | null>(null);

	// Filters
	let filterAccount = $state('');
	let filterType = $state('');
	let filterFrom = $state('');
	let filterTo = $state('');

	onMount(async () => {
		await loadTransactions();
	});

	const loadTransactions = async () => {
		isLoading = true;
		const storage = getStorage();
		if (!storage) return;

		// Get transactions for last 3 months by default
		const threeMonthsAgo = new Date();
		threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

		transactions = await storage.getTransactions({
			fromDate: filterFrom || threeMonthsAgo.toISOString().slice(0, 10),
			toDate: filterTo || undefined,
			accountId: filterAccount ? parseInt(filterAccount, 10) : undefined,
			type: filterType as 'in' | 'out' | undefined || undefined,
			includeUnApplied: true,
			limit: 200
		});

		isLoading = false;
	};

	const applyFilters = () => {
		loadTransactions();
	};

	const clearFilters = () => {
		filterAccount = '';
		filterType = '';
		filterFrom = '';
		filterTo = '';
		loadTransactions();
	};

	const confirmRemoveTx = (tx: Transaction) => {
		txToDelete = tx;
		showDeleteConfirm = true;
	};

	const removeTx = async () => {
		if (txToDelete?.id) {
			await deleteTransaction(txToDelete.id, true);
			await loadTransactions();
		}
		showDeleteConfirm = false;
		txToDelete = null;
	};

	const formatCurrency = (amount: number, accountId: number) => {
		const account = getAccountById(accountId);
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: account?.currency ?? 'GBP'
		}).format(amount);
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	};

	// Group transactions by date
	const groupedTransactions = $derived(() => {
		const groups: { date: string; transactions: Transaction[] }[] = [];
		let currentDate = '';
		let currentGroup: Transaction[] = [];

		for (const tx of transactions) {
			if (tx.date !== currentDate) {
				if (currentGroup.length > 0) {
					groups.push({ date: currentDate, transactions: currentGroup });
				}
				currentDate = tx.date;
				currentGroup = [tx];
			} else {
				currentGroup.push(tx);
			}
		}

		if (currentGroup.length > 0) {
			groups.push({ date: currentDate, transactions: currentGroup });
		}

		return groups;
	});
</script>

<svelte:head>
	<title>All Transactions - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-6 font-serif text-2xl font-semibold">All Transactions</h1>

		<!-- Filters -->
		<div class="card mb-6">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div>
					<label class="label" for="filter-account">Account</label>
					<select id="filter-account" class="input" bind:value={filterAccount}>
						<option value="">All accounts</option>
						{#each $accounts as account}
							<option value={account.id}>{account.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="label" for="filter-type">Type</label>
					<select id="filter-type" class="input" bind:value={filterType}>
						<option value="">All types</option>
						<option value="in">Incoming</option>
						<option value="out">Outgoing</option>
					</select>
				</div>

				<div>
					<label class="label" for="filter-from">From</label>
					<input id="filter-from" class="input" type="date" bind:value={filterFrom} />
				</div>

				<div>
					<label class="label" for="filter-to">To</label>
					<input id="filter-to" class="input" type="date" bind:value={filterTo} />
				</div>
			</div>

			<div class="mt-4 flex gap-2">
				<button class="button text-sm" onclick={applyFilters}>
					Apply Filters
				</button>
				<button class="button-secondary text-sm" onclick={clearFilters}>
					Clear
				</button>
			</div>
		</div>

		<!-- Transaction list -->
		{#if isLoading}
			<div class="card text-center">
				<p class="text-slate">Loading...</p>
			</div>
		{:else if transactions.length === 0}
			<div class="card text-center">
				<p class="text-slate">No transactions found.</p>
			</div>
		{:else}
			<p class="mb-4 text-sm text-slate">{transactions.length} transactions</p>

			{#each groupedTransactions() as group}
				<div class="mb-6">
					<h3 class="mb-2 text-sm font-semibold text-slate">{formatDate(group.date)}</h3>
					<div class="space-y-2">
						{#each group.transactions as tx}
							{@const account = getAccountById(tx.accountId)}
							<div
								class="card flex items-center gap-3 p-4"
								class:opacity-60={!tx.isApplied}
							>
								<!-- Icon -->
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full"
									class:bg-green-100={tx.type === 'in'}
									class:text-green-600={tx.type === 'in'}
									class:bg-red-100={tx.type === 'out'}
									class:text-red-600={tx.type === 'out'}
								>
									{#if tx.type === 'in'}
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
										</svg>
									{:else}
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
										</svg>
									{/if}
								</div>

								<!-- Details -->
								<div class="flex-1">
									<p class="font-medium">
										{tx.description}
										{#if !tx.isApplied}
											<span class="ml-1 text-xs text-amber-600">(upcoming)</span>
										{/if}
									</p>
									<p class="text-sm text-slate">{account?.name ?? 'Unknown'}</p>
								</div>

								<!-- Amount -->
								<div class="text-right">
									<p
										class="font-semibold"
										class:text-green-600={tx.type === 'in'}
										class:text-red-600={tx.type === 'out'}
									>
										{tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount, tx.accountId)}
									</p>
								</div>

								<!-- Delete -->
								<button
									class="ml-2 text-slate hover:text-red-600"
									onclick={() => confirmRemoveTx(tx)}
									aria-label="Delete"
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</main>

<!-- Delete Confirmation Modal -->
<Modal
	isOpen={showDeleteConfirm}
	title="Delete Transaction?"
	onClose={() => { showDeleteConfirm = false; txToDelete = null; }}
	size="sm"
>
	<div class="space-y-4">
		<p class="text-sm text-slate">
			Are you sure you want to delete <strong>{txToDelete?.description}</strong> ({txToDelete ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(txToDelete.amount) : ''})?
		</p>
		<p class="text-xs text-slate">This will adjust the account balance.</p>
		<div class="flex gap-3">
			<button class="button-secondary flex-1" onclick={() => { showDeleteConfirm = false; txToDelete = null; }}>
				Cancel
			</button>
			<button class="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" onclick={removeTx}>
				Delete
			</button>
		</div>
	</div>
</Modal>
