<script lang="ts">
	import { Modal } from '$lib/components';
	import {
		accounts,
		categories,
		recurringOutgoings,
		createRecurringItem,
		updateRecurringItem,
		deleteRecurringItem,
		getAccountById,
		getCategoryById,
		showFeedback
	} from '$lib/stores';
	import type { RecurringItem } from '$lib/types';

	let showAddModal = $state(false);
	let editingItem = $state<RecurringItem | null>(null);
	let showDeleteConfirm = $state(false);
	let itemToDelete = $state<RecurringItem | null>(null);

	// Form state
	let name = $state('');
	let amount = $state('');
	let dayOfMonth = $state('1');
	let accountId = $state('');
	let toAccountId = $state('');
	let categoryId = $state('');
	let isTransfer = $state(false);

	const openAddModal = () => {
		name = '';
		amount = '';
		dayOfMonth = '1';
		accountId = $accounts[0]?.id?.toString() ?? '';
		toAccountId = $accounts[1]?.id?.toString() ?? '';
		categoryId = '';
		isTransfer = false;
		editingItem = null;
		showAddModal = true;
	};

	const openEditModal = (item: RecurringItem) => {
		name = item.name;
		amount = item.amount.toString();
		dayOfMonth = item.dayOfMonth?.toString() ?? '1';
		accountId = item.accountId.toString();
		toAccountId = item.toAccountId?.toString() ?? ($accounts.find(a => a.id !== item.accountId)?.id?.toString() ?? '');
		categoryId = item.categoryId?.toString() ?? '';
		isTransfer = !!item.toAccountId;
		editingItem = item;
		showAddModal = true;
	};

	const closeModal = () => {
		showAddModal = false;
		editingItem = null;
	};

	const saveItem = async () => {
		const amountNum = parseFloat(amount);
		const day = parseInt(dayOfMonth, 10);
		const accId = parseInt(accountId, 10);
		const toAccId = toAccountId ? parseInt(toAccountId, 10) : undefined;
		const catId = categoryId ? parseInt(categoryId, 10) : undefined;

		if (!name.trim()) {
			showFeedback('Please enter a name', 'error');
			return;
		}
		if (isNaN(amountNum) || amountNum <= 0) {
			showFeedback('Please enter a valid amount', 'error');
			return;
		}
		if (isNaN(accId)) {
			showFeedback('Please select an account', 'error');
			return;
		}
		if (isTransfer) {
			if (!toAccId || isNaN(toAccId)) {
				showFeedback('Please select a destination account', 'error');
				return;
			}
			if (accId === toAccId) {
				showFeedback('From and To accounts must be different', 'error');
				return;
			}
		}

		if (editingItem) {
			await updateRecurringItem(editingItem.id!, {
				name: name.trim(),
				amount: amountNum,
				dayOfMonth: day,
				accountId: accId,
				toAccountId: isTransfer ? toAccId : undefined,
				categoryId: catId
			});
		} else {
			await createRecurringItem({
				name: name.trim(),
				amount: amountNum,
				type: 'out',
				frequency: 'monthly',
				dayOfMonth: day,
				accountId: accId,
				toAccountId: isTransfer ? toAccId : undefined,
				categoryId: catId,
				isActive: true
			});
		}

		closeModal();
	};

	const toggleActive = async (item: RecurringItem) => {
		await updateRecurringItem(item.id!, { isActive: !item.isActive });
	};

	const confirmRemoveItem = (item: RecurringItem) => {
		itemToDelete = item;
		showDeleteConfirm = true;
	};

	const removeItem = async () => {
		if (itemToDelete?.id) {
			await deleteRecurringItem(itemToDelete.id);
		}
		showDeleteConfirm = false;
		itemToDelete = null;
	};

	const formatCurrency = (amt: number, accountId: number) => {
		const account = getAccountById(accountId);
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: account?.currency ?? 'GBP'
		}).format(amt);
	};

	const monthlyTotal = $derived(
		$recurringOutgoings
			.filter(i => i.isActive)
			.reduce((sum, i) => sum + i.amount, 0)
	);
</script>

<svelte:head>
	<title>Regular Outgoings - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-2xl">
		<div class="mb-6">
			<h1 class="font-serif text-2xl font-semibold">Regular Outgoings</h1>
			<p class="text-sm text-slate">Monthly: {formatCurrency(monthlyTotal, $accounts[0]?.id ?? 0)}</p>
		</div>

		{#if $recurringOutgoings.length === 0}
			<div class="card text-center">
				<p class="text-slate">No regular outgoings set up yet.</p>
				<button class="button mt-4" onclick={openAddModal}>Add your first outgoing</button>
			</div>
		{:else}
			<button class="button mb-4 w-full" onclick={openAddModal}>
				+ Add Outgoing
			</button>
			<div class="space-y-2">
				{#each $recurringOutgoings as item}
					<div
						class="card flex items-center gap-3 p-4"
						class:opacity-50={!item.isActive}
					>
						<div class="flex h-10 w-10 items-center justify-center rounded-full" class:bg-red-100={!item.toAccountId} class:text-red-600={!item.toAccountId} class:bg-blue-100={!!item.toAccountId} class:text-blue-600={!!item.toAccountId}>
							{item.toAccountId ? '🔄' : '📉'}
						</div>

						<div class="flex-1">
							<p class="font-medium">{item.name}</p>
							<p class="text-sm text-slate">
								Day {item.dayOfMonth} · {getAccountById(item.accountId)?.name ?? 'Unknown'}
								{#if item.toAccountId}
									→ {getAccountById(item.toAccountId)?.name ?? 'Unknown'}
								{/if}
								{#if item.categoryId}
									{@const category = getCategoryById(item.categoryId)}
									{#if category}
										<span class="ml-1 rounded bg-slate/10 px-1.5 py-0.5 text-xs" style="color: {category.color ?? '#5b6770'}">{category.name}</span>
									{/if}
								{/if}
							</p>
						</div>

						<p class="font-semibold text-red-600">
							-{formatCurrency(item.amount, item.accountId)}
						</p>

						<div class="flex gap-1">
							<button
								class="rounded p-1 hover:bg-oat"
								onclick={() => toggleActive(item)}
								title={item.isActive ? 'Pause' : 'Resume'}
							>
								{item.isActive ? '⏸️' : '▶️'}
							</button>
							<button
								class="rounded p-1 hover:bg-oat"
								onclick={() => openEditModal(item)}
								title="Edit"
							>
								✏️
							</button>
							<button
								class="rounded p-1 hover:bg-oat"
								onclick={() => confirmRemoveItem(item)}
								title="Delete"
							>
								🗑️
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</main>

<Modal
	isOpen={showAddModal}
	title={editingItem ? 'Edit Outgoing' : 'Add Regular Outgoing'}
	onClose={closeModal}
>
	<div class="space-y-4">
		<div>
			<label class="label" for="outgoing-name">Name</label>
			<input
				id="outgoing-name"
				class="input"
				placeholder="e.g. Rent, Netflix, Phone"
				bind:value={name}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="outgoing-amount">Amount</label>
				<input
					id="outgoing-amount"
					class="input"
					type="number"
					step="0.01"
					placeholder="0.00"
					bind:value={amount}
				/>
			</div>

			<div>
				<label class="label" for="outgoing-day">Day of Month</label>
				<input
					id="outgoing-day"
					class="input"
					type="number"
					min="1"
					max="31"
					bind:value={dayOfMonth}
				/>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<input
				type="checkbox"
				id="outgoing-transfer"
				bind:checked={isTransfer}
				class="h-4 w-4 rounded border-slate/30"
			/>
			<label for="outgoing-transfer" class="text-sm">This is a transfer between accounts</label>
		</div>

		<div class="grid gap-4" class:grid-cols-1={!isTransfer} class:grid-cols-2={isTransfer}>
			<div>
				<label class="label" for="outgoing-account">{isTransfer ? 'From Account' : 'Account'}</label>
				<select id="outgoing-account" class="input" bind:value={accountId}>
					{#each $accounts as account}
						<option value={account.id?.toString()}>{account.name}</option>
					{/each}
				</select>
			</div>

			{#if isTransfer}
				<div>
					<label class="label" for="outgoing-to-account">To Account</label>
					<select id="outgoing-to-account" class="input" bind:value={toAccountId}>
						{#each $accounts.filter(a => a.id?.toString() !== accountId) as account}
							<option value={account.id?.toString()}>{account.name}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		{#if $categories.length > 0}
			<div>
				<label class="label" for="outgoing-category">Category (optional)</label>
				<select id="outgoing-category" class="input" bind:value={categoryId}>
					<option value="">No category</option>
					{#each $categories as category}
						<option value={category.id?.toString()}>{category.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class="flex gap-3 pt-2">
			<button class="button-secondary flex-1" onclick={closeModal}>
				Cancel
			</button>
			<button class="button flex-1" onclick={saveItem}>
				{editingItem ? 'Save Changes' : 'Add Outgoing'}
			</button>
		</div>
	</div>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal
	isOpen={showDeleteConfirm}
	title="Delete Outgoing?"
	onClose={() => { showDeleteConfirm = false; itemToDelete = null; }}
	size="sm"
>
	<div class="space-y-4">
		<p class="text-sm text-slate">
			Are you sure you want to delete <strong>{itemToDelete?.name}</strong>?
		</p>
		<div class="flex gap-3">
			<button class="button-secondary flex-1" onclick={() => { showDeleteConfirm = false; itemToDelete = null; }}>
				Cancel
			</button>
			<button class="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" onclick={removeItem}>
				Delete
			</button>
		</div>
	</div>
</Modal>
