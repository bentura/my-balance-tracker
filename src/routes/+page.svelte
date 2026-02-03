<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { db, type Account, type RecurringIncome, type RecurringOutgoing, type Transaction, type TransactionType } from '$lib/db';

	let accounts: Account[] = [];
	let recurringIncomes: RecurringIncome[] = [];
	let recurringOutgoings: RecurringOutgoing[] = [];
	let transactions: Transaction[] = [];

	let feedback = '';
	let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

	const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

	const setFeedback = (message: string) => {
		feedback = message;
		if (feedbackTimer) clearTimeout(feedbackTimer);
		feedbackTimer = setTimeout(() => {
			feedback = '';
		}, 4000);
	};

	const loadAll = async () => {
		accounts = await db.accounts.orderBy('createdAt').toArray();
		recurringIncomes = await db.recurringIncomes.orderBy('createdAt').toArray();
		recurringOutgoings = await db.recurringOutgoings.orderBy('createdAt').toArray();
		transactions = await db.transactions.orderBy('date').reverse().toArray();
	};

	onMount(async () => {
		if (!browser) return;
		await loadAll();
	});

	let accountName = '';
	let accountBalance = '';
	let resetBalances: Record<number, string> = {};

	const addAccount = async () => {
		const balance = Number.parseFloat(accountBalance);
		if (!accountName.trim() || Number.isNaN(balance)) return;
		await db.accounts.add({
			name: accountName.trim(),
			balance,
			createdAt: new Date().toISOString()
		});
		accountName = '';
		accountBalance = '';
		await loadAll();
		setFeedback('Account saved ✓');
	};

	const resetBalance = async (accountId: number) => {
		const value = resetBalances[accountId];
		const balance = Number.parseFloat(value);
		if (Number.isNaN(balance)) return;
		await db.accounts.update(accountId, { balance });
		await loadAll();
		setFeedback('Balance reset ✓');
	};

	let incomeName = '';
	let incomeAmount = '';
	let incomeDay = '1';
	let incomeAccountId = '';

	const addIncome = async () => {
		const amount = Number.parseFloat(incomeAmount);
		const dayOfMonth = Number.parseInt(incomeDay, 10);
		const accountId = Number.parseInt(incomeAccountId, 10);
		if (!incomeName.trim() || Number.isNaN(amount) || Number.isNaN(dayOfMonth) || Number.isNaN(accountId)) return;
		await db.recurringIncomes.add({
			name: incomeName.trim(),
			amount,
			dayOfMonth,
			accountId,
			createdAt: new Date().toISOString()
		});
		incomeName = '';
		incomeAmount = '';
		incomeDay = '1';
		incomeAccountId = '';
		await loadAll();
		setFeedback('Recurring income saved ✓');
	};

	let outgoingName = '';
	let outgoingAmount = '';
	let outgoingDay = '1';
	let outgoingAccountId = '';

	const addOutgoing = async () => {
		const amount = Number.parseFloat(outgoingAmount);
		const dayOfMonth = Number.parseInt(outgoingDay, 10);
		const accountId = Number.parseInt(outgoingAccountId, 10);
		if (!outgoingName.trim() || Number.isNaN(amount) || Number.isNaN(dayOfMonth) || Number.isNaN(accountId)) return;
		await db.recurringOutgoings.add({
			name: outgoingName.trim(),
			amount,
			dayOfMonth,
			accountId,
			createdAt: new Date().toISOString()
		});
		outgoingName = '';
		outgoingAmount = '';
		outgoingDay = '1';
		outgoingAccountId = '';
		await loadAll();
		setFeedback('Recurring outgoing saved ✓');
	};

	let showTransactionForm = false;
	let transactionDescription = '';
	let transactionAmount = '';
	let transactionType: TransactionType = 'out';
	let transactionAccountId = '';
	let transactionDate = new Date().toISOString().slice(0, 10);

	const addTransaction = async () => {
		const amount = Number.parseFloat(transactionAmount);
		const accountId = Number.parseInt(transactionAccountId, 10);
		if (!transactionDescription.trim() || Number.isNaN(amount) || Number.isNaN(accountId) || !transactionDate) return;

		await db.transactions.add({
			description: transactionDescription.trim(),
			amount,
			type: transactionType,
			accountId,
			date: transactionDate,
			createdAt: new Date().toISOString()
		});

		const account = accounts.find((item) => item.id === accountId) ?? (await db.accounts.get(accountId));
		if (account) {
			const delta = transactionType === 'in' ? amount : -amount;
			await db.accounts.update(accountId, { balance: account.balance + delta });
		}

		transactionDescription = '';
		transactionAmount = '';
		transactionType = 'out';
		transactionAccountId = '';
		transactionDate = new Date().toISOString().slice(0, 10);
		showTransactionForm = false;
		await loadAll();
		setFeedback('Transaction saved ✓');
	};

	const projectedBalance = (accountId: number) => {
		const account = accounts.find((item) => item.id === accountId);
		if (!account) return 0;
		const income = recurringIncomes
			.filter((item) => item.accountId === accountId)
			.reduce((sum, item) => sum + item.amount, 0);
		const outgoing = recurringOutgoings
			.filter((item) => item.accountId === accountId)
			.reduce((sum, item) => sum + item.amount, 0);
		return account.balance + income - outgoing;
	};

	const accountNameById = (accountId: number) => accounts.find((item) => item.id === accountId)?.name ?? 'Unknown';
</script>

<svelte:head>
	<title>FinApp MVP</title>
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-5 py-10">
	<section class="flex flex-col gap-2">
		<h1 class="text-3xl font-semibold">FinApp</h1>
		<p class="muted">A calm, local-first personal finance tracker.</p>
		{#if feedback}
			<div class="rounded-md border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">
				{feedback}
			</div>
		{/if}
	</section>

	<section class="card">
		<h2 class="text-xl font-semibold">Dashboard</h2>
		<p class="muted">Current balances with simple monthly projection.</p>

		<div class="mt-4 grid gap-4 md:grid-cols-2">
			{#if accounts.length === 0}
				<p class="muted">Add your first account to see balances.</p>
			{:else}
				{#each accounts as account}
					<div class="rounded-lg border border-slate/20 bg-oat/40 p-4">
						<div class="flex items-start justify-between">
							<div>
								<p class="text-lg font-semibold">{account.name}</p>
								<p class="muted">Current: {currency.format(account.balance)}</p>
							</div>
							<div class="text-right">
								<p class="text-sm font-semibold text-moss">Projected</p>
								<p class="text-lg font-semibold">{currency.format(projectedBalance(account.id ?? 0))}</p>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>

	<section class="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
		<div class="card">
			<h2 class="text-xl font-semibold">Accounts</h2>
			<p class="muted">Add accounts and correct balances when needed.</p>

			<div class="mt-4 grid gap-3">
				<div>
					<label class="label" for="account-name">Account name</label>
					<input id="account-name" class="input" placeholder="Checking" bind:value={accountName} />
				</div>
				<div>
					<label class="label" for="account-balance">Current balance</label>
					<input id="account-balance" class="input" type="number" step="0.01" placeholder="0.00" bind:value={accountBalance} />
				</div>
				<button class="button" on:click={addAccount}>Add account</button>
			</div>

			<div class="mt-6 grid gap-3">
				{#each accounts as account}
					<div class="rounded-lg border border-slate/20 bg-white p-3">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-semibold">{account.name}</p>
								<p class="muted">{currency.format(account.balance)}</p>
							</div>
						</div>
						<div class="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
							<input
								class="input"
								type="number"
								step="0.01"
								placeholder="Reset balance"
								bind:value={resetBalances[account.id ?? 0]}
							/>
							<button class="button-secondary" on:click={() => resetBalance(account.id ?? 0)}>
								Reset balance
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="card">
			<h2 class="text-xl font-semibold">Ad-hoc transaction</h2>
			<p class="muted">One-off income or expense.</p>

			<button class="button mt-4" on:click={() => (showTransactionForm = !showTransactionForm)}>
				{showTransactionForm ? 'Close form' : 'Add transaction'}
			</button>

			{#if showTransactionForm}
				<div class="mt-4 grid gap-3">
					<div>
						<label class="label" for="tx-desc">Description</label>
						<input id="tx-desc" class="input" placeholder="Groceries" bind:value={transactionDescription} />
					</div>
					<div>
						<label class="label" for="tx-amount">Amount</label>
						<input id="tx-amount" class="input" type="number" step="0.01" placeholder="0.00" bind:value={transactionAmount} />
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label class="label" for="tx-type">Type</label>
							<select id="tx-type" class="input" bind:value={transactionType}>
								<option value="in">Incoming</option>
								<option value="out">Outgoing</option>
							</select>
						</div>
						<div>
							<label class="label" for="tx-date">Date</label>
							<input id="tx-date" class="input" type="date" bind:value={transactionDate} />
						</div>
					</div>
					<div>
						<label class="label" for="tx-account">Account</label>
						<select id="tx-account" class="input" bind:value={transactionAccountId}>
							<option value="" disabled>Select account</option>
							{#each accounts as account}
								<option value={account.id}>{account.name}</option>
							{/each}
						</select>
					</div>
					<button class="button" on:click={addTransaction}>Save transaction</button>
				</div>
			{/if}

			<div class="mt-6">
				<h3 class="text-sm font-semibold uppercase tracking-wide text-slate">Recent transactions</h3>
				{#if transactions.length === 0}
					<p class="muted">No transactions yet.</p>
				{:else}
					<ul class="mt-3 grid gap-2">
						{#each transactions.slice(0, 5) as tx}
							<li class="rounded-lg border border-slate/20 bg-white p-3">
								<p class="font-semibold">{tx.description}</p>
								<p class="muted">
									{tx.date} · {accountNameById(tx.accountId)} ·
									{tx.type === 'in' ? 'Incoming' : 'Outgoing'} {currency.format(tx.amount)}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</section>

	<section class="grid gap-6 lg:grid-cols-2">
		<div class="card">
			<h2 class="text-xl font-semibold">Recurring income</h2>
			<p class="muted">Monthly income sources.</p>

			<div class="mt-4 grid gap-3">
				<div>
					<label class="label" for="income-name">Name</label>
					<input id="income-name" class="input" placeholder="Paycheck" bind:value={incomeName} />
				</div>
				<div>
					<label class="label" for="income-amount">Amount</label>
					<input id="income-amount" class="input" type="number" step="0.01" placeholder="0.00" bind:value={incomeAmount} />
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label class="label" for="income-day">Day of month</label>
						<input id="income-day" class="input" type="number" min="1" max="31" bind:value={incomeDay} />
					</div>
					<div>
						<label class="label" for="income-account">Target account</label>
						<select id="income-account" class="input" bind:value={incomeAccountId}>
							<option value="" disabled>Select account</option>
							{#each accounts as account}
								<option value={account.id}>{account.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<button class="button" on:click={addIncome}>Save recurring income</button>
			</div>

			<div class="mt-6 grid gap-2">
				{#if recurringIncomes.length === 0}
					<p class="muted">No recurring income added.</p>
				{:else}
					{#each recurringIncomes as item}
						<div class="rounded-lg border border-slate/20 bg-white p-3">
							<p class="font-semibold">{item.name}</p>
							<p class="muted">
								Day {item.dayOfMonth} · {accountNameById(item.accountId)} · {currency.format(item.amount)}
							</p>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<div class="card">
			<h2 class="text-xl font-semibold">Recurring outgoings</h2>
			<p class="muted">Monthly bills and subscriptions.</p>

			<div class="mt-4 grid gap-3">
				<div>
					<label class="label" for="outgoing-name">Name</label>
					<input id="outgoing-name" class="input" placeholder="Rent" bind:value={outgoingName} />
				</div>
				<div>
					<label class="label" for="outgoing-amount">Amount</label>
					<input id="outgoing-amount" class="input" type="number" step="0.01" placeholder="0.00" bind:value={outgoingAmount} />
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label class="label" for="outgoing-day">Day of month</label>
						<input id="outgoing-day" class="input" type="number" min="1" max="31" bind:value={outgoingDay} />
					</div>
					<div>
						<label class="label" for="outgoing-account">Source account</label>
						<select id="outgoing-account" class="input" bind:value={outgoingAccountId}>
							<option value="" disabled>Select account</option>
							{#each accounts as account}
								<option value={account.id}>{account.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<button class="button" on:click={addOutgoing}>Save recurring outgoing</button>
			</div>

			<div class="mt-6 grid gap-2">
				{#if recurringOutgoings.length === 0}
					<p class="muted">No recurring outgoings added.</p>
				{:else}
					{#each recurringOutgoings as item}
						<div class="rounded-lg border border-slate/20 bg-white p-3">
							<p class="font-semibold">{item.name}</p>
							<p class="muted">
								Day {item.dayOfMonth} · {accountNameById(item.accountId)} · {currency.format(item.amount)}
							</p>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<footer class="muted">Data is saved locally in your browser (IndexedDB).</footer>
</main>
