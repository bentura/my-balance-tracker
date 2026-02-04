<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		accounts,
		recurringOutgoings,
		createRecurringItem,
		deleteRecurringItem,
		showFeedback,
		getAccountById
	} from '$lib/stores';

	let name = $state('');
	let amount = $state('');
	let dayOfMonth = $state('1');
	let accountId = $state('');

	const addOutgoing = async () => {
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

		await createRecurringItem({
			name: name.trim(),
			amount: amountNum,
			type: 'out',
			frequency: 'monthly',
			dayOfMonth: day,
			accountId: accId,
			isActive: true
		});

		// Reset form
		name = '';
		amount = '';
		dayOfMonth = '1';
	};

	const removeOutgoing = async (id: number) => {
		await deleteRecurringItem(id);
	};

	const formatCurrency = (amt: number, accountId: number) => {
		const account = getAccountById(accountId);
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: account?.currency ?? 'GBP'
		}).format(amt);
	};
</script>

<div class="card">
	<h1 class="font-serif text-2xl font-semibold">Regular Outgoings</h1>
	<p class="mt-1 text-sm text-slate">
		Add your recurring bills and expenses — rent, utilities, subscriptions, etc.
	</p>

	<!-- Add outgoing form -->
	<div class="mt-6 space-y-4">
		<div>
			<label class="label" for="outgoing-name">Name</label>
			<input
				id="outgoing-name"
				class="input"
				placeholder="e.g. Rent, Netflix, Phone Bill"
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
				<option value="" disabled>Select account</option>
				{#each $accounts as account}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
		</div>

		<button class="button w-full" onclick={addOutgoing}>
			Add Outgoing
		</button>
	</div>

	<!-- Outgoings list -->
	{#if $recurringOutgoings.length > 0}
		<div class="mt-6">
			<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Your Outgoings</h3>
			<div class="space-y-2">
				{#each $recurringOutgoings as item}
					<div class="flex items-center justify-between rounded-lg border border-slate/20 bg-oat/50 p-3">
						<div>
							<p class="font-semibold">{item.name}</p>
							<p class="text-sm text-slate">
								{formatCurrency(item.amount, item.accountId)} · Day {item.dayOfMonth} · {getAccountById(item.accountId)?.name ?? 'Unknown'}
							</p>
						</div>
						<button
							class="text-slate hover:text-red-600"
							onclick={() => removeOutgoing(item.id!)}
							aria-label="Remove"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Navigation -->
<div class="mt-6 flex justify-between">
	<a href="/onboarding" class="button-secondary">
		← Back
	</a>
	<button class="button" onclick={() => goto('/onboarding/income')}>
		{$recurringOutgoings.length > 0 ? 'Next →' : 'Skip →'}
	</button>
</div>
