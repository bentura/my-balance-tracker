<script lang="ts">
	import { goto } from '$app/navigation';
	import { Modal } from '$lib/components';
	import {
		accounts,
		categories,
		recentTransactions,
		createTransaction,
		createAccount,
		getProjectedBalance,
		getAccountById,
		getCategoryById,
		hasCompletedOnboarding,
		isInitialized,
		showFeedback,
		isPremium,
		isLoggedIn,
		storageMode,
		features
	} from '$lib/stores';
	import type { TransactionType } from '$lib/types';

	// Redirect if not onboarded (but not for premium users - they have server data)
	$effect(() => {
		if ($isInitialized && !$hasCompletedOnboarding && !$isPremium) {
			goto('/');
		}
	});

	// Transaction modal state
	let showAddTransaction = $state(false);
	let txDescription = $state('');
	let txAmount = $state('');
	let txType = $state<TransactionType>('out');
	let txAccountId = $state('');
	let txToAccountId = $state('');
	let txCategoryId = $state('');
	let txDate = $state(new Date().toISOString().slice(0, 10));

	// Add Account modal state
	let showAddAccount = $state(false);
	let newAccountName = $state('');
	let newAccountBalance = $state('');
	let newAccountCurrency = $state('GBP');

	const currencies = [
		{ code: 'GBP', symbol: '£', name: 'British Pound' },
		{ code: 'USD', symbol: '$', name: 'US Dollar' },
		{ code: 'EUR', symbol: '€', name: 'Euro' },
	];

	const openAddTransaction = () => {
		// Reset form
		txDescription = '';
		txAmount = '';
		txType = 'out';
		txAccountId = $accounts[0]?.id?.toString() ?? '';
		txToAccountId = $accounts[1]?.id?.toString() ?? '';
		txCategoryId = '';
		txDate = new Date().toISOString().slice(0, 10);
		showAddTransaction = true;
	};

	const submitTransaction = async () => {
		const amount = parseFloat(txAmount);
		const accountId = parseInt(txAccountId, 10);
		const toAccountId = txToAccountId ? parseInt(txToAccountId, 10) : undefined;
		const categoryId = txCategoryId ? parseInt(txCategoryId, 10) : undefined;

		if (!txDescription.trim()) {
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
		if (txType === 'transfer') {
			if (!toAccountId || isNaN(toAccountId)) {
				showFeedback('Please select a destination account', 'error');
				return;
			}
			if (accountId === toAccountId) {
				showFeedback('From and To accounts must be different', 'error');
				return;
			}
		}

		await createTransaction({
			description: txDescription.trim(),
			amount,
			type: txType,
			accountId,
			toAccountId: txType === 'transfer' ? toAccountId : undefined,
			categoryId,
			date: txDate
		});

		showAddTransaction = false;
	};

	const submitNewAccount = async () => {
		const balance = parseFloat(newAccountBalance);
		if (!newAccountName.trim()) {
			showFeedback('Please enter an account name', 'error');
			return;
		}
		if (isNaN(balance)) {
			showFeedback('Please enter a valid balance', 'error');
			return;
		}

		await createAccount({
			name: newAccountName.trim(),
			balance,
			currency: newAccountCurrency
		});

		newAccountName = '';
		newAccountBalance = '';
		newAccountCurrency = 'GBP';
		showAddAccount = false;
	};

	const formatCurrency = (amount: number, currency = 'GBP') => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency
		}).format(amount);
	};

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (dateStr === today.toISOString().slice(0, 10)) return 'Today';
		if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Yesterday';

		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	};
</script>

<svelte:head>
	<title>Dashboard - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-2xl">
		<!-- Header -->
		<div class="mb-6">
			<h1 class="font-serif text-2xl font-semibold">Your Accounts</h1>
			<p class="text-sm text-slate">
				{#if $isPremium}
					Synced to cloud ☁️
				{:else}
					Current and projected balances
				{/if}
			</p>
		</div>

		<!-- Account cards -->
		<div class="grid gap-4">
			{#if $accounts.length === 0}
				<div class="card text-center">
					<p class="text-slate">No accounts yet.</p>
					<a href="/onboarding" class="button mt-4">Add Account</a>
				</div>
			{:else}
				{#each $accounts as account}
					{@const projected = getProjectedBalance(account.id!)}
					{@const diff = projected - account.balance}
					<a
						href="/account/{account.id}"
						class="card block transition-shadow hover:shadow-md"
					>
						<div class="flex items-start justify-between">
							<div>
								<h2 class="text-lg font-semibold">{account.name}</h2>
								<p class="text-sm text-slate">Current Balance</p>
								<p class="text-2xl font-semibold">
									{formatCurrency(account.balance, account.currency)}
								</p>
							</div>
							<div class="text-right">
								<p class="text-sm font-medium text-moss">Projected</p>
								<p class="text-xl font-semibold text-moss">
									{formatCurrency(projected, account.currency)}
								</p>
								{#if diff !== 0}
									<p class="text-xs" class:text-moss={diff > 0} class:text-red-600={diff < 0}>
										{diff > 0 ? '+' : ''}{formatCurrency(diff, account.currency)}
									</p>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			{/if}
		</div>

		<!-- Action buttons -->
		<div class="mt-4 grid grid-cols-2 gap-3">
			<button class="button" onclick={openAddTransaction}>
				+ Add Transaction
			</button>
			<button class="button-secondary" onclick={() => showAddAccount = true}>
				+ Add Account
			</button>
		</div>

		<!-- Recent transactions -->
		<div class="mt-8">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-serif text-xl font-semibold">Recent Transactions</h2>
				<a href="/transactions" class="text-sm text-moss hover:underline">View all →</a>
			</div>

			{#if $recentTransactions.length === 0}
				<div class="card text-center">
					<p class="text-slate">No transactions yet.</p>
					<button class="button mt-4" onclick={openAddTransaction}>Add your first transaction</button>
				</div>
			{:else}
				<div class="space-y-2">
					{#each $recentTransactions as tx}
						{@const account = getAccountById(tx.accountId)}
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
								<p class="text-sm text-slate">
									{formatDate(tx.date)} · {account?.name ?? 'Unknown'}
									{#if tx.categoryId}
										{@const category = getCategoryById(tx.categoryId)}
										{#if category}
											<span class="ml-1 rounded bg-slate/10 px-1.5 py-0.5 text-xs" style="color: {category.color ?? '#5b6770'}">{category.name}</span>
										{/if}
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
									{tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount, account?.currency)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</main>

<!-- Add Transaction Modal -->
<Modal
	isOpen={showAddTransaction}
	title="Add Transaction"
	onClose={() => showAddTransaction = false}
>
	<div class="space-y-4">
		<div>
			<label class="label" for="tx-desc">Description</label>
			<input
				id="tx-desc"
				class="input"
				placeholder="e.g. Groceries, Coffee, Refund"
				bind:value={txDescription}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="tx-amount">Amount</label>
				<input
					id="tx-amount"
					class="input"
					type="number"
					step="0.01"
					placeholder="0.00"
					bind:value={txAmount}
				/>
			</div>

			<div>
				<label class="label" for="tx-type">Type</label>
				<select id="tx-type" class="input" bind:value={txType}>
					<option value="out">Outgoing (expense)</option>
					<option value="in">Incoming (income)</option>
					<option value="transfer">Transfer between accounts</option>
				</select>
			</div>
		</div>

		<div class="grid gap-4" class:grid-cols-2={txType !== 'transfer'} class:grid-cols-3={txType === 'transfer'}>
			<div>
				<label class="label" for="tx-account">{txType === 'transfer' ? 'From Account' : 'Account'}</label>
				<select id="tx-account" class="input" bind:value={txAccountId}>
					{#each $accounts as account}
						<option value={account.id?.toString()}>{account.name}</option>
					{/each}
				</select>
			</div>

			{#if txType === 'transfer'}
				<div>
					<label class="label" for="tx-to-account">To Account</label>
					<select id="tx-to-account" class="input" bind:value={txToAccountId}>
						{#each $accounts.filter(a => a.id?.toString() !== txAccountId) as account}
							<option value={account.id?.toString()}>{account.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div>
				<label class="label" for="tx-date">Date</label>
				<input
					id="tx-date"
					class="input"
					type="date"
					bind:value={txDate}
				/>
			</div>
		</div>

		{#if $categories.length > 0}
			<div>
				<label class="label" for="tx-category">Category (optional)</label>
				<select id="tx-category" class="input" bind:value={txCategoryId}>
					<option value="">No category</option>
					{#each $categories as category}
						<option value={category.id?.toString()}>{category.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<p class="text-xs text-slate">
			💡 Future dates create upcoming transactions that won't affect your balance until that date.
		</p>

		<div class="flex gap-3 pt-2">
			<button class="button-secondary flex-1" onclick={() => showAddTransaction = false}>
				Cancel
			</button>
			<button class="button flex-1" onclick={submitTransaction}>
				Add Transaction
			</button>
		</div>
	</div>
</Modal>

<!-- Add Account Modal -->
<Modal
	isOpen={showAddAccount}
	title="Add Account"
	onClose={() => showAddAccount = false}
>
	<div class="space-y-4">
		<div>
			<label class="label" for="new-account-name">Account Name</label>
			<input
				id="new-account-name"
				class="input"
				placeholder="e.g. Savings, Cash"
				bind:value={newAccountName}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="new-account-balance">Current Balance</label>
				<input
					id="new-account-balance"
					class="input"
					type="number"
					step="0.01"
					placeholder="0.00"
					bind:value={newAccountBalance}
				/>
			</div>

			<div>
				<label class="label" for="new-account-currency">Currency</label>
				<select id="new-account-currency" class="input" bind:value={newAccountCurrency}>
					{#each currencies as c}
						<option value={c.code}>{c.symbol} {c.code}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex gap-3 pt-2">
			<button class="button-secondary flex-1" onclick={() => showAddAccount = false}>
				Cancel
			</button>
			<button class="button flex-1" onclick={submitNewAccount}>
				Add Account
			</button>
		</div>
	</div>
</Modal>
