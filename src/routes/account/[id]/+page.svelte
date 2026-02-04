<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Modal } from '$lib/components';
	import {
		accounts,
		updateAccount,
		deleteAccount,
		deleteTransaction,
		getStorage,
		showFeedback,
		refreshAll
	} from '$lib/stores';
	import type { Transaction } from '$lib/types';

	const accountId = $derived(parseInt($page.params.id, 10));
	const account = $derived($accounts.find(a => a.id === accountId));

	let transactions = $state<Transaction[]>([]);
	let showEditModal = $state(false);
	let showDeleteConfirm = $state(false);

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

	const removeTx = async (txId: number) => {
		await deleteTransaction(txId, true);
		await loadTransactions();
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
			</div>

			<!-- Transactions for this account -->
			<div class="mt-6">
				<h2 class="mb-4 font-serif text-xl font-semibold">Transactions</h2>

				{#if transactions.length === 0}
					<div class="card text-center">
						<p class="text-slate">No transactions for this account.</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each transactions as tx}
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
									onclick={() => removeTx(tx.id!)}
									aria-label="Delete transaction"
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
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
