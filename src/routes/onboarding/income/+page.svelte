<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		accounts,
		recurringIncome,
		createRecurringItem,
		deleteRecurringItem,
		completeOnboarding,
		showFeedback,
		getAccountById
	} from '$lib/stores';

	let name = $state('');
	let amount = $state('');
	let dayOfMonth = $state('1');
	let accountId = $state('');

	const addIncome = async () => {
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
			type: 'in',
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

	const removeIncome = async (id: number) => {
		await deleteRecurringItem(id);
	};

	const finish = async () => {
		await completeOnboarding();
		goto('/dashboard');
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
	<h1 class="font-serif text-2xl font-semibold">Regular Income</h1>
	<p class="mt-1 text-sm text-slate">
		Add your recurring income — salary, freelance payments, benefits, etc.
	</p>

	<!-- Add income form -->
	<div class="mt-6 space-y-4">
		<div>
			<label class="label" for="income-name">Name</label>
			<input
				id="income-name"
				class="input"
				placeholder="e.g. Salary, Freelance, Benefits"
				bind:value={name}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="income-amount">Amount</label>
				<input
					id="income-amount"
					class="input"
					type="number"
					step="0.01"
					placeholder="0.00"
					bind:value={amount}
				/>
			</div>

			<div>
				<label class="label" for="income-day">Day of Month</label>
				<input
					id="income-day"
					class="input"
					type="number"
					min="1"
					max="31"
					bind:value={dayOfMonth}
				/>
			</div>
		</div>

		<div>
			<label class="label" for="income-account">To Account</label>
			<select id="income-account" class="input" bind:value={accountId}>
				<option value="" disabled>Select account</option>
				{#each $accounts as account}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
		</div>

		<button class="button w-full" onclick={addIncome}>
			Add Income
		</button>
	</div>

	<!-- Income list -->
	{#if $recurringIncome.length > 0}
		<div class="mt-6">
			<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Your Income</h3>
			<div class="space-y-2">
				{#each $recurringIncome as item}
					<div class="flex items-center justify-between rounded-lg border border-slate/20 bg-oat/50 p-3">
						<div>
							<p class="font-semibold">{item.name}</p>
							<p class="text-sm text-slate">
								{formatCurrency(item.amount, item.accountId)} · Day {item.dayOfMonth} · {getAccountById(item.accountId)?.name ?? 'Unknown'}
							</p>
						</div>
						<button
							class="text-slate hover:text-red-600"
							onclick={() => removeIncome(item.id!)}
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
	<a href="/onboarding/outgoings" class="button-secondary">
		← Back
	</a>
	<button class="button bg-moss hover:bg-moss/90" onclick={finish}>
		Finish Setup ✓
	</button>
</div>
