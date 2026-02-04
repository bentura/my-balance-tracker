<script lang="ts">
	import { goto } from '$app/navigation';
	import { Modal } from '$lib/components';
	import {
		accounts,
		recentTransactions,
		createTransaction,
		getProjectedBalance,
		getAccountById,
		getCategoryById,
		hasCompletedOnboarding,
		isInitialized,
		showFeedback
	} from '$lib/stores';
	import type { TransactionType } from '$lib/types';

	// Redirect if not onboarded
	$effect(() => {
		if ($isInitialized && !$hasCompletedOnboarding) {
			goto('/');
		}
	});

	// Transaction modal state
	let showAddTransaction = $state(false);
	let txDescription = $state('');
	let txAmount = $state('');
	let txType = $state<TransactionType>('out');
	let txAccountId = $state('');
	let txDate = $state(new Date().toISOString().slice(0, 10));

	const openAddTransaction = () => {
		// Reset form
		txDescription = '';
		txAmount = '';
		txType = 'out';
		txAccountId = $accounts[0]?.id?.toString() ?? '';
		txDate = new Date().toISOString().slice(0, 10);
		showAddTransaction = true;
	};

	const submitTransaction = async () => {
		const amount = parseFloat(txAmount);
		const accountId = parseInt(txAccountId, 10);

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

		await createTransaction({
			description: txDescription.trim(),
			amount,
			type: txType,
			accountId,
			date: txDate
		});

		showAddTransaction = false;
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
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="font-serif text-2xl font-semibold">Your Accounts</h1>
				<p class="text-sm text-slate">Current and projected balances</p>
			</div>
			<button class="button" onclick={openAddTransaction}>
				+ Add Transaction
			</button>
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
				</select>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="tx-account">Account</label>
				<select id="tx-account" class="input" bind:value={txAccountId}>
					{#each $accounts as account}
						<option value={account.id}>{account.name}</option>
					{/each}
				</select>
			</div>

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
