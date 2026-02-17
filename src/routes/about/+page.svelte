<svelte:head>
	<title>About - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-lg">
		<div class="text-center">
			<div class="mb-4 text-6xl">💰</div>
			<h1 class="font-serif text-3xl font-semibold">MyBalanceTracker</h1>
			<p class="mt-2 text-slate">Version 1.0.0</p>
		</div>

		<div class="card mt-8">
			<h2 class="mb-3 font-semibold">What is MBT?</h2>
			<p class="text-sm text-slate">
				MyBalanceTracker is a simple, calm personal finance app designed to help you keep track
				of your money without the complexity and overwhelm of traditional budgeting apps.
			</p>
		</div>

		<div class="card mt-4">
			<h2 class="mb-3 font-semibold">Features</h2>
			<ul class="space-y-2 text-sm text-slate">
				<li class="flex gap-2">
					<span>✓</span>
					<span>Track multiple accounts with different currencies</span>
				</li>
				<li class="flex gap-2">
					<span>✓</span>
					<span>Set up recurring income and outgoings</span>
				</li>
				<li class="flex gap-2">
					<span>✓</span>
					<span>See projected balance based on upcoming transactions</span>
				</li>
				<li class="flex gap-2">
					<span>✓</span>
					<span>Add one-off transactions (past or future)</span>
				</li>
				<li class="flex gap-2">
					<span>✓</span>
					<span>Export and import your data</span>
				</li>
				<li class="flex gap-2">
					<span>✓</span>
					<span>100% private — data stays on your device</span>
				</li>
			</ul>
		</div>

		<div class="card mt-4">
			<h2 class="mb-3 font-semibold">Privacy</h2>
			<p class="text-sm text-slate">
				Your financial data never leaves your device. MBT uses your browser's local storage
				(IndexedDB) to store everything. No accounts, no cloud sync, no tracking — just you
				and your data.
			</p>
		</div>

		<div class="card mt-4">
			<h2 class="mb-3 font-semibold">Designed for Calm</h2>
			<p class="text-sm text-slate">
				MBT was designed with simplicity in mind. No complicated categories, no guilt-inducing
				budgets, no endless charts. Just clear visibility of where your money is and where
				it's going.
			</p>
		</div>

		<div class="mt-8 text-center text-sm text-slate">
			<p>Made with 💚</p>
			<p class="mt-2">
				<a href="mailto:contact@mybalancetracker.com" class="text-moss hover:underline">
					Contact Us
				</a>
			</p>
		</div>
	</div>
</main>
