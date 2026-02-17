<script lang="ts">
	import { goto } from '$app/navigation';
	import { currentUser, isLoggedIn, isPremium, startCheckout, checkAuth, switchToApiStorage, features, isStandalone } from '$lib/stores';

	let loading = $state(false);
	let error = $state('');
	let showVoucher = $state(false);
	let voucherCode = $state('');
	let voucherLoading = $state(false);
	let voucherSuccess = $state('');

	const redeemVoucher = async () => {
		if (!$isLoggedIn) {
			goto('/login');
			return;
		}

		if (!voucherCode.trim()) {
			error = 'Please enter a voucher code';
			return;
		}

		voucherLoading = true;
		error = '';
		voucherSuccess = '';

		try {
			const res = await fetch('/api/voucher/redeem', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: voucherCode.trim() })
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error || 'Failed to redeem voucher';
				voucherLoading = false;
				return;
			}

			voucherSuccess = data.message;
			
			// Refresh auth and switch to API storage
			await checkAuth();
			await switchToApiStorage();
			
			// Redirect to success after a moment
			setTimeout(() => goto('/upgrade/success'), 2000);
		} catch {
			error = 'Network error';
		} finally {
			voucherLoading = false;
		}
	};

	const handleUpgrade = async () => {
		if (!$isLoggedIn) {
			goto('/login');
			return;
		}

		loading = true;
		error = '';

		const result = await startCheckout();

		if (!result.success) {
			error = result.error || 'Failed to start checkout';
			loading = false;
		}
		// If successful, user is redirected to Stripe
	};
</script>

<svelte:head>
	<title>{$isStandalone ? 'MyBalanceTracker' : 'Upgrade to Pro - MyBalanceTracker'}</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-lg">
		{#if $isStandalone}
			<!-- Standalone mode - no subscriptions needed -->
			<div class="text-center">
				<div class="mb-4 text-5xl">🏠</div>
				<h1 class="font-serif text-2xl font-semibold">Self-Hosted Edition</h1>
				<p class="mt-2 text-slate">You're running the standalone version</p>
			</div>

			<div class="card mt-8 text-center">
				<div class="text-4xl mb-4">✅</div>
				<h2 class="text-lg font-semibold">All Features Unlocked</h2>
				<p class="mt-2 text-slate">
					You have access to all MyBalanceTracker features. Your data is stored locally on this server.
				</p>
			</div>

			<div class="card mt-4">
				<h2 class="mb-3 font-semibold">Self-Hosting Benefits</h2>
				<ul class="space-y-2 text-sm text-slate">
					<li class="flex gap-2">✓ Complete control over your data</li>
					<li class="flex gap-2">✓ No subscription required</li>
					<li class="flex gap-2">✓ All features included</li>
					<li class="flex gap-2">✓ Run on your own hardware</li>
				</ul>
			</div>

			<div class="mt-8 text-center">
				<a href="/dashboard" class="text-sm text-moss hover:underline">
					← Back to Dashboard
				</a>
			</div>
		{:else if $isPremium}
			<!-- Already subscribed -->
			<div class="card mt-8 text-center">
				<div class="text-4xl mb-4">✅</div>
				<h2 class="text-lg font-semibold">You're on Pro!</h2>
				<p class="mt-2 text-slate">
					Thanks for supporting MyBalanceTracker. Your data syncs across all your devices.
				</p>
				<a href="/settings" class="button mt-6 inline-block">
					Manage Subscription
				</a>
			</div>
		{:else}
			<!-- Pricing card -->
			<div class="card mt-8">
				<div class="text-center border-b border-gray-200 pb-6">
					<h2 class="text-lg font-semibold">Pro Plan</h2>
					<div class="mt-3">
						<span class="text-4xl font-bold">£3</span>
						<span class="text-slate">/month</span>
					</div>
				</div>

				<div class="py-6">
					<ul class="space-y-3 text-sm">
						<li class="flex gap-3">
							<span class="text-green-600">✓</span>
							<span>Sync across all devices</span>
						</li>
						<li class="flex gap-3">
							<span class="text-green-600">✓</span>
							<span>Automatic cloud backup</span>
						</li>
						<li class="flex gap-3">
							<span class="text-green-600">✓</span>
							<span>Access from any browser</span>
						</li>
						<li class="flex gap-3">
							<span class="text-green-600">✓</span>
							<span>Priority support</span>
						</li>
						<li class="flex gap-3">
							<span class="text-green-600">✓</span>
							<span>Cancel anytime</span>
						</li>
					</ul>
				</div>

				{#if error}
					<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
						{error}
					</div>
				{/if}

				<button
					class="button w-full"
					onclick={handleUpgrade}
					disabled={loading}
				>
					{#if loading}
						Processing...
					{:else if $isLoggedIn}
						Subscribe for £3/month
					{:else}
						Sign up to Subscribe
					{/if}
				</button>

				{#if !$isLoggedIn}
					<p class="mt-3 text-center text-sm text-slate">
						Already have an account? <a href="/login" class="text-moss hover:underline">Log in</a>
					</p>
				{/if}
			</div>

			<!-- Voucher code section -->
			<div class="card mt-4">
				<button
					class="flex w-full items-center justify-between text-left"
					onclick={() => showVoucher = !showVoucher}
				>
					<span class="font-semibold">Have a voucher code?</span>
					<span class="text-slate transition-transform" class:rotate-180={showVoucher}>▼</span>
				</button>

				{#if showVoucher}
					<div class="mt-4 space-y-3">
						{#if voucherSuccess}
							<div class="rounded-md bg-green-50 p-3 text-sm text-green-600">
								{voucherSuccess}
							</div>
						{:else}
							<div class="flex gap-2">
								<input
									type="text"
									class="input flex-1 uppercase"
									placeholder="Enter code"
									bind:value={voucherCode}
									disabled={voucherLoading}
								/>
								<button
									class="button"
									onclick={redeemVoucher}
									disabled={voucherLoading || !voucherCode.trim()}
								>
									{voucherLoading ? '...' : 'Redeem'}
								</button>
							</div>
							{#if !$isLoggedIn}
								<p class="text-xs text-slate">You'll need to log in or create an account first.</p>
							{/if}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Free tier info -->
			<div class="card mt-4">
				<h2 class="mb-3 font-semibold">Free Forever</h2>
				<p class="text-sm text-slate">
					Don't need sync? The free version works completely offline on your device. 
					No account needed, no data leaves your browser.
				</p>
			</div>
		{/if}

		{#if !$isStandalone}
			<!-- Privacy info (SaaS only) -->
			<div class="card mt-4">
				<h2 class="mb-3 font-semibold">Data & Privacy</h2>
				<p class="text-sm text-slate mb-3">
					<strong>Free:</strong> All data stays on your device only. We never see it.
				</p>
				<p class="text-sm text-slate">
					<strong>Pro:</strong> Data encrypted and stored securely for syncing. 
					You can export or delete everything anytime.
				</p>
			</div>

			<div class="mt-8 text-center">
				<a href="/dashboard" class="text-sm text-moss hover:underline">
					← Back to Dashboard
				</a>
			</div>
		{/if}
	</div>
</main>
