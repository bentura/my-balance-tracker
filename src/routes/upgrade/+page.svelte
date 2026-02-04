<svelte:head>
	<title>Upgrade - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-lg">
		<div class="text-center">
			<div class="mb-4 text-5xl">⭐</div>
			<h1 class="font-serif text-2xl font-semibold">Upgrade to Sync</h1>
			<p class="mt-2 text-slate">Access your finances from anywhere</p>
		</div>

		<div class="card mt-8">
			<h2 class="mb-4 text-lg font-semibold">Coming Soon</h2>
			<p class="text-sm text-slate">
				We're working on a sync feature that will let you access your financial data
				across all your devices — phone, tablet, and computer.
			</p>

			<div class="mt-6 rounded-lg bg-oat p-4">
				<h3 class="font-semibold">What you'll get:</h3>
				<ul class="mt-3 space-y-2 text-sm text-slate">
					<li class="flex gap-2">
						<span>✓</span>
						<span>Sync across all devices</span>
					</li>
					<li class="flex gap-2">
						<span>✓</span>
						<span>Automatic cloud backup</span>
					</li>
					<li class="flex gap-2">
						<span>✓</span>
						<span>Access from any browser</span>
					</li>
					<li class="flex gap-2">
						<span>✓</span>
						<span>Share with family members</span>
					</li>
				</ul>
			</div>

			<div class="mt-6">
				<p class="text-sm text-slate">
					Want to be notified when sync is available?
				</p>
				<div class="mt-3 flex gap-2">
					<input
						type="email"
						class="input flex-1"
						placeholder="your@email.com"
						disabled
					/>
					<button class="button opacity-50" disabled>
						Notify Me
					</button>
				</div>
				<p class="mt-2 text-xs text-slate italic">
					(Email notification coming soon)
				</p>
			</div>
		</div>

		<div class="card mt-4">
			<h2 class="mb-3 font-semibold">Self-Hosted Option</h2>
			<p class="text-sm text-slate">
				Prefer to host your own data? We'll also be releasing a Docker version
				you can run on your own server or home lab.
			</p>
		</div>

		<div class="mt-8 text-center">
			<a href="/dashboard" class="text-sm text-moss hover:underline">
				← Back to Dashboard
			</a>
		</div>
	</div>
</main>
