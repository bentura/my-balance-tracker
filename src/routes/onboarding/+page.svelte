<script lang="ts">
	import { goto } from '$app/navigation';
	import { accounts, createAccount, deleteAccount, showFeedback } from '$lib/stores';

	let name = $state('');
	let balance = $state('');
	let currency = $state('GBP');

	const currencies = [
		{ code: 'GBP', symbol: '£', name: 'British Pound' },
		{ code: 'USD', symbol: '$', name: 'US Dollar' },
		{ code: 'EUR', symbol: '€', name: 'Euro' },
	];

	const addAccount = async () => {
		console.log('Add account clicked', { name, balance, currency });
		const balanceNum = parseFloat(balance);
		if (!name.trim()) {
			showFeedback('Please enter an account name', 'error');
			return;
		}
		if (isNaN(balanceNum)) {
			showFeedback('Please enter a valid balance', 'error');
			return;
		}

		try {
			await createAccount({
				name: name.trim(),
				balance: balanceNum,
				currency
			});
			console.log('Account created successfully');
			// Reset form
			name = '';
			balance = '';
		} catch (err) {
			console.error('Failed to create account:', err);
			showFeedback('Failed to create account', 'error');
		}
	};

	const removeAccount = async (id: number) => {
		await deleteAccount(id);
	};

	const goNext = () => {
		if ($accounts.length === 0) {
			showFeedback('Please add at least one account', 'error');
			return;
		}
		goto('/onboarding/outgoings');
	};

	const formatCurrency = (amount: number, currencyCode: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: currencyCode
		}).format(amount);
	};
</script>

<div class="card">
	<h1 class="font-serif text-2xl font-semibold">Add Your Accounts</h1>
	<p class="mt-1 text-sm text-slate">
		Start by adding at least one bank account, savings pot, or cash balance.
	</p>

	<!-- Add account form -->
	<div class="mt-6 space-y-4">
		<div>
			<label class="label" for="account-name">Account Name</label>
			<input
				id="account-name"
				class="input"
				placeholder="e.g. Current Account, Savings, Cash"
				bind:value={name}
			/>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="account-balance">Current Balance</label>
				<input
					id="account-balance"
					class="input"
					type="number"
					step="0.01"
					placeholder="0.00"
					bind:value={balance}
				/>
			</div>

			<div>
				<label class="label" for="account-currency">Currency</label>
				<select id="account-currency" class="input" bind:value={currency}>
					{#each currencies as c}
						<option value={c.code}>{c.symbol} {c.code}</option>
					{/each}
				</select>
			</div>
		</div>

		<button type="button" class="button w-full" onclick={addAccount}>
			Add Account
		</button>
	</div>

	<!-- Account list -->
	{#if $accounts.length > 0}
		<div class="mt-6">
			<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Your Accounts</h3>
			<div class="space-y-2">
				{#each $accounts as account}
					<div class="flex items-center justify-between rounded-lg border border-slate/20 bg-oat/50 p-3">
						<div>
							<p class="font-semibold">{account.name}</p>
							<p class="text-sm text-slate">{formatCurrency(account.balance, account.currency)}</p>
						</div>
						<button
							class="text-slate hover:text-red-600"
							onclick={() => removeAccount(account.id!)}
							aria-label="Remove account"
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
	<a href="/" class="button-secondary">
		← Back
	</a>
	<button
		class="button"
		onclick={goNext}
		disabled={$accounts.length === 0}
		class:opacity-50={$accounts.length === 0}
	>
		Next →
	</button>
</div>
