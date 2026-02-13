<script lang="ts">
	import { onMount } from 'svelte';
	import { Modal } from '$lib/components';
	import {
		accounts,
		categories,
		recurringIncome,
		recurringOutgoings,
		getStorage,
		getAccountById,
		getCategoryById,
		deleteTransaction,
		showFeedback,
		refreshAll
	} from '$lib/stores';
	import type { Transaction } from '$lib/types';

	// Recurring items section
	let showRecurring = $state(false);
	let expandedAccounts = $state<Set<number>>(new Set());

	const toggleAccountExpanded = (accountId: number) => {
		const newSet = new Set(expandedAccounts);
		if (newSet.has(accountId)) {
			newSet.delete(accountId);
		} else {
			newSet.add(accountId);
		}
		expandedAccounts = newSet;
	};

	// Group recurring items by account
	const recurringByAccount = $derived(() => {
		type CategoryTotal = { name: string; color: string; amount: number };
		const groups: Map<number, { 
			account: typeof $accounts[0], 
			income: typeof $recurringIncome, 
			outgoings: typeof $recurringOutgoings, 
			incomeTotal: number, 
			outgoingsTotal: number,
			categoryBreakdown: CategoryTotal[]
		}> = new Map();
		
		// Process income
		for (const item of $recurringIncome) {
			if (!groups.has(item.accountId)) {
				const account = getAccountById(item.accountId);
				if (account) {
					groups.set(item.accountId, { account, income: [], outgoings: [], incomeTotal: 0, outgoingsTotal: 0, categoryBreakdown: [] });
				}
			}
			const group = groups.get(item.accountId);
			if (group) {
				group.income.push(item);
				if (item.isActive) group.incomeTotal += item.amount;
			}
		}
		
		// Process outgoings
		for (const item of $recurringOutgoings) {
			if (!groups.has(item.accountId)) {
				const account = getAccountById(item.accountId);
				if (account) {
					groups.set(item.accountId, { account, income: [], outgoings: [], incomeTotal: 0, outgoingsTotal: 0, categoryBreakdown: [] });
				}
			}
			const group = groups.get(item.accountId);
			if (group) {
				group.outgoings.push(item);
				if (item.isActive) group.outgoingsTotal += item.amount;
			}
		}
		
		// Calculate category breakdown for each account
		for (const group of groups.values()) {
			const totals = new Map<string, CategoryTotal>();
			
			// Add income
			const incomeTotal = group.income.filter(i => i.isActive).reduce((sum, i) => sum + i.amount, 0);
			if (incomeTotal > 0) {
				totals.set('_income', { name: 'Income', color: '#16a34a', amount: incomeTotal });
			}
			
			// Group outgoings by category
			for (const item of group.outgoings) {
				if (!item.isActive) continue;
				const catKey = item.categoryId?.toString() ?? '_uncategorized';
				const cat = item.categoryId ? getCategoryById(item.categoryId) : null;
				const existing = totals.get(catKey);
				if (existing) {
					existing.amount -= item.amount;
				} else {
					totals.set(catKey, {
						name: cat?.name ?? 'Uncategorized',
						color: cat?.color ?? '#5b6770',
						amount: -item.amount
					});
				}
			}
			
			group.categoryBreakdown = Array.from(totals.values()).sort((a, b) => {
				if (a.name === 'Income') return -1;
				if (b.name === 'Income') return 1;
				return a.name.localeCompare(b.name);
			});
		}
		
		return Array.from(groups.values()).sort((a, b) => a.account.name.localeCompare(b.account.name));
	});

	const recurringIncomeTotal = $derived(
		$recurringIncome.filter(i => i.isActive).reduce((sum, i) => sum + i.amount, 0)
	);
	const recurringOutgoingsTotal = $derived(
		$recurringOutgoings.filter(i => i.isActive).reduce((sum, i) => sum + i.amount, 0)
	);

	const formatCurrencySimple = (amount: number, currency = 'GBP') => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency
		}).format(amount);
	};

	let transactions = $state<Transaction[]>([]);
	let isLoading = $state(true);
	let showDeleteConfirm = $state(false);
	let txToDelete = $state<Transaction | null>(null);

	// Edit modal state
	let showEditModal = $state(false);
	let editingTx = $state<Transaction | null>(null);
	let editDescription = $state('');
	let editAmount = $state('');
	let editType = $state<'in' | 'out' | 'transfer'>('out');
	let editAccountId = $state('');
	let editToAccountId = $state('');
	let editCategoryId = $state('');
	let editDate = $state('');

	// Filters
	let filterAccount = $state('');
	let filterType = $state('');
	let filterCategory = $state('');
	let filterFrom = $state('');
	let filterTo = $state('');

	// Grouping
	let groupBy = $state<'date' | 'category'>('date');

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

		let txs = await storage.getTransactions({
			fromDate: filterFrom || threeMonthsAgo.toISOString().slice(0, 10),
			toDate: filterTo || undefined,
			accountId: filterAccount ? parseInt(filterAccount, 10) : undefined,
			type: filterType as 'in' | 'out' | undefined || undefined,
			includeUnApplied: true,
			limit: 200
		});

		// Filter by category client-side
		if (filterCategory) {
			if (filterCategory === 'none') {
				txs = txs.filter(tx => !tx.categoryId);
			} else {
				const catId = parseInt(filterCategory, 10);
				txs = txs.filter(tx => tx.categoryId === catId);
			}
		}

		transactions = txs;
		isLoading = false;
	};

	const applyFilters = () => {
		loadTransactions();
	};

	const clearFilters = () => {
		filterAccount = '';
		filterType = '';
		filterCategory = '';
		filterFrom = '';
		filterTo = '';
		loadTransactions();
	};

	// Edit transaction
	const openEditModal = (tx: Transaction) => {
		editingTx = tx;
		editDescription = tx.description;
		editAmount = tx.amount.toString();
		editType = tx.toAccountId ? 'transfer' : tx.type;
		editAccountId = tx.accountId.toString();
		editToAccountId = tx.toAccountId?.toString() ?? ($accounts.find(a => a.id !== tx.accountId)?.id?.toString() ?? '');
		editCategoryId = tx.categoryId?.toString() ?? '';
		editDate = tx.date;
		showEditModal = true;
	};

	const saveEdit = async () => {
		if (!editingTx?.id) return;
		const storage = getStorage();
		if (!storage) return;

		const amount = parseFloat(editAmount);
		const accountId = parseInt(editAccountId, 10);
		const toAccountId = editToAccountId ? parseInt(editToAccountId, 10) : undefined;
		const categoryId = editCategoryId ? parseInt(editCategoryId, 10) : undefined;

		if (!editDescription.trim()) {
			showFeedback('Please enter a description', 'error');
			return;
		}
		if (isNaN(amount) || amount <= 0) {
			showFeedback('Please enter a valid amount', 'error');
			return;
		}
		if (isNaN(accountId)) {
			showFeedback('Please select an account', 'error');
			return;
		}
		if (editType === 'transfer') {
			if (!toAccountId || isNaN(toAccountId)) {
				showFeedback('Please select a destination account', 'error');
				return;
			}
			if (accountId === toAccountId) {
				showFeedback('From and To accounts must be different', 'error');
				return;
			}
		}

		const oldTx = editingTx;
		const wasTransfer = !!oldTx.toAccountId;
		const isNowTransfer = editType === 'transfer';

		// For simplicity, if changing to/from transfer, show a message
		if (wasTransfer !== isNowTransfer) {
			showFeedback('Cannot convert between transfer and regular transaction. Delete and create new.', 'error');
			return;
		}

		// If the transaction was applied and amount/type/account changed, adjust balances
		if (oldTx.isApplied) {
			// Reverse old effect on old account
			const oldAccount = await storage.getAccount(oldTx.accountId);
			if (oldAccount) {
				const oldDelta = oldTx.type === 'in' ? -oldTx.amount : oldTx.amount;
				await storage.updateAccount(oldTx.accountId, {
					balance: oldAccount.balance + oldDelta
				});
			}

			// If it was a transfer, also reverse the effect on the old toAccount
			if (oldTx.toAccountId) {
				const oldToAccount = await storage.getAccount(oldTx.toAccountId);
				if (oldToAccount) {
					// The toAccount had received money (type was 'in' on linked tx)
					const oldToDelta = oldTx.type === 'out' ? oldTx.amount : -oldTx.amount;
					await storage.updateAccount(oldTx.toAccountId, {
						balance: oldToAccount.balance - oldToDelta
					});
				}
			}

			// Apply new effect on new account
			const newAccount = await storage.getAccount(accountId);
			if (newAccount) {
				const currentBalance = (await storage.getAccount(accountId))!.balance;
				const newDelta = editType === 'in' ? amount : (editType === 'transfer' ? -amount : -amount);
				await storage.updateAccount(accountId, {
					balance: currentBalance + newDelta
				});
			}

			// If it's a transfer, apply effect to new toAccount
			if (isNowTransfer && toAccountId) {
				const newToAccount = await storage.getAccount(toAccountId);
				if (newToAccount) {
					const currentBalance = (await storage.getAccount(toAccountId))!.balance;
					await storage.updateAccount(toAccountId, {
						balance: currentBalance + amount
					});
				}
			}
		}

		// For transfers, keep original type (out for source, in for destination)
		// For regular transactions, use editType (but not 'transfer')
		const saveType = isNowTransfer ? oldTx.type : (editType === 'transfer' ? 'out' : editType);

		await storage.updateTransaction(oldTx.id!, {
			description: editDescription.trim(),
			amount,
			toAccountId: isNowTransfer ? toAccountId : undefined,
			type: saveType,
			accountId,
			categoryId,
			date: editDate
		});

		await refreshAll();
		await loadTransactions();
		showEditModal = false;
		editingTx = null;
		showFeedback('Transaction updated');
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
	const groupedByDate = $derived(() => {
		const groups: { label: string; sortKey: string; transactions: Transaction[] }[] = [];
		let currentDate = '';
		let currentGroup: Transaction[] = [];

		for (const tx of transactions) {
			if (tx.date !== currentDate) {
				if (currentGroup.length > 0) {
					groups.push({ label: formatDate(currentDate), sortKey: currentDate, transactions: currentGroup });
				}
				currentDate = tx.date;
				currentGroup = [tx];
			} else {
				currentGroup.push(tx);
			}
		}

		if (currentGroup.length > 0) {
			groups.push({ label: formatDate(currentDate), sortKey: currentDate, transactions: currentGroup });
		}

		return groups;
	});

	// Group transactions by category
	const groupedByCategory = $derived(() => {
		const catMap = new Map<string, { label: string; color: string; transactions: Transaction[] }>();

		for (const tx of transactions) {
			const catId = tx.categoryId?.toString() ?? 'none';
			if (!catMap.has(catId)) {
				const cat = tx.categoryId ? getCategoryById(tx.categoryId) : null;
				catMap.set(catId, {
					label: cat?.name ?? 'Uncategorized',
					color: cat?.color ?? '#5b6770',
					transactions: []
				});
			}
			catMap.get(catId)!.transactions.push(tx);
		}

		// Sort: named categories first (alphabetically), then Uncategorized last
		return Array.from(catMap.entries())
			.sort(([aKey, a], [bKey, b]) => {
				if (aKey === 'none') return 1;
				if (bKey === 'none') return -1;
				return a.label.localeCompare(b.label);
			})
			.map(([_, group]) => group);
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
							<option value={account.id?.toString()}>{account.name}</option>
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
					<label class="label" for="filter-category">Category</label>
					<select id="filter-category" class="input" bind:value={filterCategory}>
						<option value="">All categories</option>
						<option value="none">Uncategorized</option>
						{#each $categories as category}
							<option value={category.id?.toString()}>{category.name}</option>
						{/each}
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

				<div>
					<label class="label" for="group-by">Group by</label>
					<select id="group-by" class="input" bind:value={groupBy}>
						<option value="date">Date</option>
						<option value="category">Category</option>
					</select>
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

		<!-- Recurring Income & Outgoings -->
		{#if $recurringIncome.length > 0 || $recurringOutgoings.length > 0}
			<div class="card mb-6">
				<button
					class="flex w-full items-center justify-between text-left"
					onclick={() => showRecurring = !showRecurring}
				>
					<h2 class="font-serif text-lg font-semibold">Regular Income & Outgoings</h2>
					<span class="text-slate transition-transform" class:rotate-180={showRecurring}>▼</span>
				</button>

				{#if showRecurring}
					<div class="mt-4 space-y-3">
						<!-- Grouped by account -->
						{#each recurringByAccount() as group}
							{@const isExpanded = expandedAccounts.has(group.account.id!)}
							{@const netAmount = group.incomeTotal - group.outgoingsTotal}
							<div class="rounded-lg border border-slate/20 bg-white">
								<button
									class="flex w-full items-center justify-between p-3 text-left hover:bg-slate/5"
									onclick={() => toggleAccountExpanded(group.account.id!)}
								>
									<div class="flex items-center gap-2">
										<span class="text-slate transition-transform" class:rotate-180={isExpanded}>▼</span>
										<span class="font-medium">{group.account.name}</span>
										<span class="text-xs text-slate">
											({group.income.length + group.outgoings.length} items)
										</span>
									</div>
									<div class="text-right">
										<span class="text-sm font-semibold" class:text-green-600={netAmount >= 0} class:text-red-600={netAmount < 0}>
											{netAmount >= 0 ? '+' : ''}{formatCurrencySimple(netAmount)}/mo
										</span>
									</div>
								</button>

								{#if isExpanded}
									<div class="space-y-1 border-t border-slate/10 p-3 pt-2">
										<!-- Income for this account -->
										{#each group.income as item}
											{@const category = item.categoryId ? getCategoryById(item.categoryId) : null}
											<div class="flex items-center gap-3 rounded-lg bg-green-50 px-3 py-2" class:opacity-50={!item.isActive}>
												<div class="flex-1">
													<p class="text-sm font-medium">
														{item.name}
														{#if !item.isActive}
															<span class="ml-1 text-xs text-amber-600">(paused)</span>
														{/if}
													</p>
													<p class="text-xs text-slate">
														Day {item.dayOfMonth}
														{#if category}
															<span class="ml-1 rounded bg-slate/10 px-1 py-0.5" style="color: {category.color ?? '#5b6770'}">{category.name}</span>
														{/if}
													</p>
												</div>
												<p class="text-sm font-semibold text-green-600">+{formatCurrencySimple(item.amount)}</p>
											</div>
										{/each}

										<!-- Outgoings for this account -->
										{#each group.outgoings as item}
											{@const category = item.categoryId ? getCategoryById(item.categoryId) : null}
											{@const toAccount = item.toAccountId ? getAccountById(item.toAccountId) : null}
											<div class="flex items-center gap-3 rounded-lg px-3 py-2" class:bg-red-50={!item.toAccountId} class:bg-blue-50={!!item.toAccountId} class:opacity-50={!item.isActive}>
												<div class="flex-1">
													<p class="text-sm font-medium">
														{item.name}
														{#if !item.isActive}
															<span class="ml-1 text-xs text-amber-600">(paused)</span>
														{/if}
													</p>
													<p class="text-xs text-slate">
														Day {item.dayOfMonth}
														{#if toAccount}
															→ {toAccount.name}
														{/if}
														{#if category}
															<span class="ml-1 rounded bg-slate/10 px-1 py-0.5" style="color: {category.color ?? '#5b6770'}">{category.name}</span>
														{/if}
													</p>
												</div>
												<p class="text-sm font-semibold" class:text-red-600={!item.toAccountId} class:text-blue-600={!!item.toAccountId}>
													-{formatCurrencySimple(item.amount)}
												</p>
											</div>
										{/each}

										<!-- Category breakdown -->
										<div class="mt-2 space-y-1 border-t border-slate/10 pt-2">
											{#each group.categoryBreakdown as cat}
												<div class="flex items-center justify-between text-sm">
													<div class="flex items-center gap-2">
														<span class="h-2 w-2 rounded-full" style="background-color: {cat.color}"></span>
														<span class="text-slate">{cat.name}</span>
													</div>
													<span class="font-medium" class:text-green-600={cat.amount > 0} class:text-red-600={cat.amount < 0}>
														{cat.amount >= 0 ? '+' : ''}{formatCurrencySimple(cat.amount)}/mo
													</span>
												</div>
											{/each}
											<!-- Account net -->
											<div class="flex items-center justify-between border-t border-slate/10 pt-1 text-sm">
												<span class="font-medium">Net</span>
												<span class="font-semibold" class:text-green-600={netAmount >= 0} class:text-red-600={netAmount < 0}>
													{netAmount >= 0 ? '+' : ''}{formatCurrencySimple(netAmount)}/mo
												</span>
											</div>
										</div>
									</div>
								{/if}
							</div>
						{/each}

					</div>
				{/if}
			</div>
		{/if}

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

			{#if groupBy === 'date'}
				{#each groupedByDate() as group}
					<div class="mb-6">
						<h3 class="mb-2 text-sm font-semibold text-slate">{group.label}</h3>
						<div class="space-y-2">
							{#each group.transactions as tx}
								{@const account = getAccountById(tx.accountId)}
								{@const category = tx.categoryId ? getCategoryById(tx.categoryId) : null}
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
										<p class="text-sm text-slate">
											{account?.name ?? 'Unknown'}
											{#if category}
												<span class="ml-1 rounded bg-slate/10 px-1.5 py-0.5 text-xs" style="color: {category.color ?? '#5b6770'}">{category.name}</span>
											{/if}
										</p>
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

									<!-- Edit -->
									<button
										class="ml-1 text-slate hover:text-moss"
										onclick={() => openEditModal(tx)}
										aria-label="Edit"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>

									<!-- Delete -->
									<button
										class="text-slate hover:text-red-600"
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
			{:else}
				<!-- Grouped by category -->
				{#each groupedByCategory() as group}
					<div class="mb-6">
						<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate">
							<span class="inline-block h-3 w-3 rounded-full" style="background-color: {group.color}"></span>
							{group.label}
							<span class="font-normal">({group.transactions.length})</span>
						</h3>
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
										<p class="text-sm text-slate">
											{formatDate(tx.date)} · {account?.name ?? 'Unknown'}
										</p>
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

									<!-- Edit -->
									<button
										class="ml-1 text-slate hover:text-moss"
										onclick={() => openEditModal(tx)}
										aria-label="Edit"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>

									<!-- Delete -->
									<button
										class="text-slate hover:text-red-600"
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
		{/if}
	</div>
</main>

<!-- Edit Transaction Modal -->
<Modal
	isOpen={showEditModal}
	title="Edit Transaction"
	onClose={() => { showEditModal = false; editingTx = null; }}
>
	<div class="space-y-4">
		<div>
			<label class="label" for="edit-tx-desc">Description</label>
			<input
				id="edit-tx-desc"
				class="input"
				bind:value={editDescription}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="edit-tx-amount">Amount</label>
				<input
					id="edit-tx-amount"
					class="input"
					type="number"
					step="0.01"
					bind:value={editAmount}
				/>
			</div>

			<div>
				<label class="label" for="edit-tx-type">Type</label>
				<select id="edit-tx-type" class="input" bind:value={editType}>
					<option value="out">Outgoing (expense)</option>
					<option value="in">Incoming (income)</option>
					<option value="transfer">Transfer between accounts</option>
				</select>
			</div>
		</div>

		<div class="grid gap-4" class:grid-cols-2={editType !== 'transfer'} class:grid-cols-3={editType === 'transfer'}>
			<div>
				<label class="label" for="edit-tx-account">{editType === 'transfer' ? 'From Account' : 'Account'}</label>
				<select id="edit-tx-account" class="input" bind:value={editAccountId}>
					{#each $accounts as account}
						<option value={account.id?.toString()}>{account.name}</option>
					{/each}
				</select>
			</div>

			{#if editType === 'transfer'}
				<div>
					<label class="label" for="edit-tx-to-account">To Account</label>
					<select id="edit-tx-to-account" class="input" bind:value={editToAccountId}>
						{#each $accounts.filter(a => a.id?.toString() !== editAccountId) as account}
							<option value={account.id?.toString()}>{account.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div>
				<label class="label" for="edit-tx-date">Date</label>
				<input
					id="edit-tx-date"
					class="input"
					type="date"
					bind:value={editDate}
				/>
			</div>
		</div>

		{#if $categories.length > 0}
			<div>
				<label class="label" for="edit-tx-category">Category</label>
				<select id="edit-tx-category" class="input" bind:value={editCategoryId}>
					<option value="">No category</option>
					{#each $categories as category}
						<option value={category.id?.toString()}>{category.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class="flex gap-3 pt-2">
			<button class="button-secondary flex-1" onclick={() => { showEditModal = false; editingTx = null; }}>
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
