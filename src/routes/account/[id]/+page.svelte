<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Modal } from '$lib/components';
	import {
		accounts,
		categories,
		recurringItems,
		updateAccount,
		deleteAccount,
		deleteTransaction,
		getStorage,
		getCategoryById,
		showFeedback,
		refreshAll
	} from '$lib/stores';
	import type { Transaction, RecurringItem, Frequency } from '$lib/types';

	const accountId = $derived(parseInt($page.params.id, 10));
	const account = $derived($accounts.find(a => a.id === accountId));
	
	// Recurring items for this account
	const accountIncome = $derived($recurringItems.filter(item => item.accountId === accountId && item.type === 'in' && item.isActive));
	const accountOutgoings = $derived($recurringItems.filter(item => item.accountId === accountId && item.type === 'out' && item.isActive));
	
	// Collapsible state for recurring section
	let showRecurring = $state(false);

	let transactions = $state<Transaction[]>([]);
	let showEditModal = $state(false);
	let showDeleteConfirm = $state(false);
	let showTxDeleteConfirm = $state(false);
	let txToDelete = $state<Transaction | null>(null);

	// Category breakdown
	const categoryBreakdown = $derived(() => {
		const breakdown: { categoryId: number | null; name: string; color: string; total: number; count: number }[] = [];
		const catTotals = new Map<number | null, { total: number; count: number }>();

		for (const tx of transactions) {
			if (tx.type !== 'out') continue;
			const key = tx.categoryId ?? null;
			const existing = catTotals.get(key) ?? { total: 0, count: 0 };
			catTotals.set(key, { total: existing.total + tx.amount, count: existing.count + 1 });
		}

		for (const [catId, data] of catTotals) {
			const cat = catId ? getCategoryById(catId) : null;
			breakdown.push({
				categoryId: catId,
				name: cat?.name ?? 'Uncategorized',
				color: cat?.color ?? '#5b6770',
				total: data.total,
				count: data.count
			});
		}

		return breakdown.sort((a, b) => b.total - a.total);
	});

	// Edit form state
	let editName = $state('');
	let editCurrency = $state('GBP');
	let editBalance = $state('');

	const currencies = [
		{ code: 'GBP', symbol: '£' },
		{ code: 'USD', symbol: '$' },
		{ code: 'EUR', symbol: '€' },
	];

	onMount(async () => {
		await loadTransactions();
	});

	// Reload transactions when account changes
	$effect(() => {
		if (accountId) {
			loadTransactions();
		}
	});

	const loadTransactions = async () => {
		const storage = getStorage();
		if (!storage) return;
		transactions = await storage.getTransactionsByAccount(accountId, 50);
	};

	const openEditModal = () => {
		if (!account) return;
		editName = account.name;
		editCurrency = account.currency;
		editBalance = account.balance.toString();
		showEditModal = true;
	};

	const saveEdit = async () => {
		if (!editName.trim()) {
			showFeedback('Please enter a name', 'error');
			return;
		}
		const balance = parseFloat(editBalance);
		if (isNaN(balance)) {
			showFeedback('Please enter a valid balance', 'error');
			return;
		}

		await updateAccount(accountId, {
			name: editName.trim(),
			currency: editCurrency,
			balance
		});

		showEditModal = false;
	};

	const confirmDelete = async () => {
		await deleteAccount(accountId);
		goto('/dashboard');
	};

	const confirmRemoveTx = (tx: Transaction) => {
		txToDelete = tx;
		showTxDeleteConfirm = true;
	};

	const removeTx = async () => {
		if (txToDelete?.id) {
			await deleteTransaction(txToDelete.id, true);
			await loadTransactions();
		}
		showTxDeleteConfirm = false;
		txToDelete = null;
	};

	const formatCurrency = (amount: number, currency = 'GBP') => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency
		}).format(amount);
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	};

	const formatFrequency = (freq: Frequency) => {
		const labels: Record<Frequency, string> = {
			daily: 'Daily',
			weekly: 'Weekly',
			monthly: 'Monthly',
			yearly: 'Yearly'
		};
		return labels[freq] ?? freq;
	};

	// Split transactions into upcoming and past
	const today = new Date().toISOString().slice(0, 10);
	const upcomingTransactions = $derived(transactions.filter(tx => tx.date > today));
	const pastTransactions = $derived(transactions.filter(tx => tx.date <= today));
</script>

<svelte:head>
	<title>{account?.name ?? 'Account'} - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-2xl">
		<!-- Back link -->
		<a href="/dashboard" class="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink">
			← Back to Dashboard
		</a>

		{#if !account}
			<div class="card text-center">
				<p class="text-slate">Account not found.</p>
				<a href="/dashboard" class="button mt-4">Go to Dashboard</a>
			</div>
		{:else}
			<!-- Account header card -->
			<div class="card">
				<div class="flex items-start justify-between">
					<div>
						<h1 class="font-serif text-2xl font-semibold">{account.name}</h1>
						<p class="text-sm text-slate">{account.currency}</p>
					</div>
					<button
						class="button-secondary text-sm"
						onclick={openEditModal}
					>
						Edit
					</button>
				</div>

				<div class="mt-4 grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-slate">Current Balance</p>
						<p class="text-3xl font-semibold">
							{formatCurrency(account.balance, account.currency)}
						</p>
					</div>
				</div>

				<!-- Regular incoming/outgoing (collapsible) -->
				{#if accountIncome.length > 0 || accountOutgoings.length > 0}
					{@const incomeTotal = accountIncome.reduce((sum, i) => sum + i.amount, 0)}
					{@const outgoingsTotal = accountOutgoings.reduce((sum, i) => sum + i.amount, 0)}
					{@const netAmount = incomeTotal - outgoingsTotal}
					<div class="mt-4 border-t border-gray-200 pt-4">
						<button
							class="flex w-full items-center justify-between text-left"
							onclick={() => showRecurring = !showRecurring}
						>
							<div class="flex items-center gap-2">
								<span class="text-slate transition-transform" class:rotate-180={showRecurring}>▼</span>
								<span class="font-medium">Regular Income & Outgoings</span>
								<span class="text-xs text-slate">
									({accountIncome.length + accountOutgoings.length} items)
								</span>
							</div>
							<span class="text-sm font-semibold" class:text-green-600={netAmount >= 0} class:text-red-600={netAmount < 0}>
								{netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount, account.currency)}/mo
							</span>
						</button>

						{#if showRecurring}
							<div class="mt-3 space-y-2">
								<!-- Income items -->
								{#each accountIncome as item}
									{@const category = item.categoryId ? getCategoryById(item.categoryId) : null}
									<div class="flex items-center gap-3 rounded-lg bg-green-50 px-3 py-2">
										<div class="flex-1">
											<p class="text-sm font-medium">{item.name}</p>
											<p class="text-xs text-slate">
												{formatFrequency(item.frequency)}
												{#if item.dayOfMonth} · Day {item.dayOfMonth}{/if}
												{#if category}
													<span class="ml-1 rounded bg-slate/10 px-1 py-0.5" style="color: {category.color ?? '#5b6770'}">{category.name}</span>
												{/if}
											</p>
										</div>
										<p class="text-sm font-semibold text-green-600">+{formatCurrency(item.amount, account.currency)}</p>
									</div>
								{/each}

								<!-- Outgoing items -->
								{#each accountOutgoings as item}
									{@const category = item.categoryId ? getCategoryById(item.categoryId) : null}
									<div class="flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2">
										<div class="flex-1">
											<p class="text-sm font-medium">{item.name}</p>
											<p class="text-xs text-slate">
												{formatFrequency(item.frequency)}
												{#if item.dayOfMonth} · Day {item.dayOfMonth}{/if}
												{#if category}
													<span class="ml-1 rounded bg-slate/10 px-1 py-0.5" style="color: {category.color ?? '#5b6770'}">{category.name}</span>
												{/if}
											</p>
										</div>
										<p class="text-sm font-semibold text-red-600">-{formatCurrency(item.amount, account.currency)}</p>
									</div>
								{/each}

								<!-- Summary -->
								<div class="mt-2 flex items-center justify-between border-t border-slate/10 pt-2 text-sm">
									<span class="font-medium">Monthly Net</span>
									<span class="font-semibold" class:text-green-600={netAmount >= 0} class:text-red-600={netAmount < 0}>
										{netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount, account.currency)}/mo
									</span>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Category breakdown -->
			{#if categoryBreakdown().length > 0}
				<div class="card mt-4">
					<h2 class="mb-3 font-semibold">Spending by Category</h2>
					<div class="space-y-2">
						{#each categoryBreakdown() as cat}
							<div class="flex items-center gap-3">
								<div
									class="h-3 w-3 rounded-full"
									style="background-color: {cat.color}"
								></div>
								<div class="flex-1">
									<p class="text-sm font-medium">{cat.name}</p>
								</div>
								<div class="text-right">
									<p class="text-sm font-semibold">{formatCurrency(cat.total, account.currency)}</p>
									<p class="text-xs text-slate">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Transactions for this account -->
			<div class="mt-6">
				<h2 class="mb-4 font-serif text-xl font-semibold">Transactions</h2>

				{#if transactions.length === 0}
					<div class="card text-center">
						<p class="text-slate">No transactions for this account.</p>
					</div>
				{:else}
					<!-- Upcoming Transactions -->
					{#if upcomingTransactions.length > 0}
						<div class="mb-6">
							<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Upcoming</h3>
							<div class="space-y-2">
								{#each upcomingTransactions as tx}
									<div class="card flex items-center gap-3 p-4">
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
											<p class="font-medium">{tx.description}</p>
											<p class="text-sm text-slate">{formatDate(tx.date)}</p>
										</div>

										<!-- Amount -->
										<div class="text-right">
											<p
												class="font-semibold"
												class:text-green-600={tx.type === 'in'}
												class:text-red-600={tx.type === 'out'}
											>
												{tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount, account.currency)}
											</p>
										</div>

										<!-- Delete button -->
										<button
											class="ml-2 text-slate hover:text-red-600"
											onclick={() => confirmRemoveTx(tx)}
											aria-label="Delete transaction"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Past Transactions -->
					{#if pastTransactions.length > 0}
						<div>
							<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">History</h3>
							<div class="space-y-2">
								{#each pastTransactions as tx}
									<div class="card flex items-center gap-3 p-4">
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
											<p class="font-medium">{tx.description}</p>
											<p class="text-sm text-slate">{formatDate(tx.date)}</p>
										</div>

										<!-- Amount -->
										<div class="text-right">
											<p
												class="font-semibold"
												class:text-green-600={tx.type === 'in'}
												class:text-red-600={tx.type === 'out'}
											>
												{tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount, account.currency)}
											</p>
										</div>

										<!-- Delete button -->
										<button
											class="ml-2 text-slate hover:text-red-600"
											onclick={() => confirmRemoveTx(tx)}
											aria-label="Delete transaction"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Danger zone -->
			<div class="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
				<h3 class="font-semibold text-red-800">Danger Zone</h3>
				<p class="mt-1 text-sm text-red-700">
					Deleting this account will also delete all its transactions.
				</p>
				<button
					class="mt-3 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
					onclick={() => showDeleteConfirm = true}
				>
					Delete Account
				</button>
			</div>
		{/if}
	</div>
</main>

<!-- Edit Account Modal -->
<Modal
	isOpen={showEditModal}
	title="Edit Account"
	onClose={() => showEditModal = false}
>
	<div class="space-y-4">
		<div>
			<label class="label" for="edit-name">Account Name</label>
			<input
				id="edit-name"
				class="input"
				bind:value={editName}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="edit-balance">Balance</label>
				<input
					id="edit-balance"
					class="input"
					type="number"
					step="0.01"
					bind:value={editBalance}
				/>
			</div>

			<div>
				<label class="label" for="edit-currency">Currency</label>
				<select id="edit-currency" class="input" bind:value={editCurrency}>
					{#each currencies as c}
						<option value={c.code}>{c.symbol} {c.code}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex gap-3 pt-2">
			<button class="button-secondary flex-1" onclick={() => showEditModal = false}>
				Cancel
			</button>
			<button class="button flex-1" onclick={saveEdit}>
				Save Changes
			</button>
		</div>
	</div>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal
	isOpen={showDeleteConfirm}
	title="Delete Account?"
	onClose={() => showDeleteConfirm = false}
	size="sm"
>
	<div class="space-y-4">
		<p class="text-sm text-slate">
			Are you sure you want to delete <strong>{account?.name}</strong>? This will also delete all transactions for this account. This cannot be undone.
		</p>

		<div class="flex gap-3">
			<button class="button-secondary flex-1" onclick={() => showDeleteConfirm = false}>
				Cancel
			</button>
			<button
				class="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
				onclick={confirmDelete}
			>
				Delete
			</button>
		</div>
	</div>
</Modal>

<!-- Delete Transaction Confirmation Modal -->
<Modal
	isOpen={showTxDeleteConfirm}
	title="Delete Transaction?"
	onClose={() => { showTxDeleteConfirm = false; txToDelete = null; }}
	size="sm"
>
	<div class="space-y-4">
		<p class="text-sm text-slate">
			Are you sure you want to delete <strong>{txToDelete?.description}</strong>?
		</p>
		<p class="text-xs text-slate">This will adjust the account balance.</p>
		<div class="flex gap-3">
			<button class="button-secondary flex-1" onclick={() => { showTxDeleteConfirm = false; txToDelete = null; }}>
				Cancel
			</button>
			<button
				class="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
				onclick={removeTx}
			>
				Delete
			</button>
		</div>
	</div>
</Modal>
