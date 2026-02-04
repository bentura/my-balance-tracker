<script lang="ts">
	import { Modal } from '$lib/components';
	import {
		accounts,
		recurringOutgoings,
		createRecurringItem,
		updateRecurringItem,
		deleteRecurringItem,
		getAccountById,
		showFeedback
	} from '$lib/stores';
	import type { RecurringItem } from '$lib/types';

	let showAddModal = $state(false);
	let editingItem = $state<RecurringItem | null>(null);

	// Form state
	let name = $state('');
	let amount = $state('');
	let dayOfMonth = $state('1');
	let accountId = $state('');

	const openAddModal = () => {
		name = '';
		amount = '';
		dayOfMonth = '1';
		accountId = $accounts[0]?.id?.toString() ?? '';
		editingItem = null;
		showAddModal = true;
	};

	const openEditModal = (item: RecurringItem) => {
		name = item.name;
		amount = item.amount.toString();
		dayOfMonth = item.dayOfMonth?.toString() ?? '1';
		accountId = item.accountId.toString();
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

		if (editingItem) {
			await updateRecurringItem(editingItem.id!, {
				name: name.trim(),
				amount: amountNum,
				dayOfMonth: day,
				accountId: accId
			});
		} else {
			await createRecurringItem({
				name: name.trim(),
				amount: amountNum,
				type: 'out',
				frequency: 'monthly',
				dayOfMonth: day,
				accountId: accId,
				isActive: true
			});
		}

		closeModal();
	};

	const toggleActive = async (item: RecurringItem) => {
		await updateRecurringItem(item.id!, { isActive: !item.isActive });
	};

	const removeItem = async (id: number) => {
		await deleteRecurringItem(id);
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
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="font-serif text-2xl font-semibold">Regular Outgoings</h1>
				<p class="text-sm text-slate">Monthly: {formatCurrency(monthlyTotal, $accounts[0]?.id ?? 0)}</p>
			</div>
			<button class="button" onclick={openAddModal}>
				+ Add Outgoing
			</button>
		</div>

		{#if $recurringOutgoings.length === 0}
			<div class="card text-center">
				<p class="text-slate">No regular outgoings set up yet.</p>
				<button class="button mt-4" onclick={openAddModal}>Add your first outgoing</button>
			</div>
		{:else}
			<div class="space-y-2">
				{#each $recurringOutgoings as item}
					<div
						class="card flex items-center gap-3 p-4"
						class:opacity-50={!item.isActive}
					>
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
							📉
						</div>

						<div class="flex-1">
							<p class="font-medium">{item.name}</p>
							<p class="text-sm text-slate">
								Day {item.dayOfMonth} · {getAccountById(item.accountId)?.name ?? 'Unknown'}
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
								onclick={() => removeItem(item.id!)}
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

		<div>
			<label class="label" for="outgoing-account">From Account</label>
			<select id="outgoing-account" class="input" bind:value={accountId}>
				{#each $accounts as account}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
		</div>

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
