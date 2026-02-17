<script lang="ts">
	import { goto } from '$app/navigation';
	import { hasCompletedOnboarding, isInitialized, features, isStandalone } from '$lib/stores';
	import { Modal } from '$lib/components';

	let showHowItWorks = $state(false);
	let showWhyLogin = $state(false);

	// Redirect to dashboard if already onboarded
	$effect(() => {
		if ($isInitialized && $hasCompletedOnboarding) {
			goto('/dashboard');
		}
	});
</script>

<svelte:head>
	<title>My Balance Tracker - Simple Personal Finance</title>
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center bg-oat px-6 py-12">
	<div class="w-full max-w-md text-center">
		<!-- Logo / Icon -->
		<div class="mb-6 text-6xl">💰</div>

		<!-- Title -->
		<h1 class="font-serif text-4xl font-semibold text-ink">MyBalanceTracker</h1>

		<!-- Subtitle -->
		<p class="mt-3 text-lg text-slate">
			A calm, simple way to track your money.<br />
			No stress. No complexity. Just clarity.
		</p>

		<!-- CTA Buttons -->
		<div class="mt-10 flex flex-col gap-3">
			<a
				href="/onboarding"
				class="button w-full py-3 text-base"
			>
				{$isStandalone ? 'Get Started' : 'Start Fresh'}
			</a>

			{#if $features.userAuth}
				<a
					href="/login"
					class="button-secondary w-full py-3 text-base"
				>
					Log In
				</a>
			{/if}

			<button
				class="text-sm text-moss hover:underline mt-2"
				onclick={() => showHowItWorks = true}
			>
				How It Works
			</button>
		</div>

		<!-- Footer note with info button (SaaS only) -->
		{#if $features.userAuth}
			<div class="mt-10 flex items-center justify-center gap-2">
				<p class="text-sm text-slate">
					No account needed to get started
				</p>
				<button
					class="flex h-5 w-5 items-center justify-center rounded-full bg-slate/20 text-xs text-slate hover:bg-slate/30"
					onclick={() => showWhyLogin = true}
					aria-label="Learn more about accounts"
				>
					?
				</button>
			</div>
		{/if}
	</div>
</main>

<!-- How It Works Modal -->
<Modal
	isOpen={showHowItWorks}
	title="How It Works"
	onClose={() => showHowItWorks = false}
	size="md"
>
	<div class="space-y-4 text-sm text-ink">
		<div class="flex gap-3">
			<span class="text-xl">1️⃣</span>
			<div>
				<p class="font-semibold">Add your accounts</p>
				<p class="text-slate">Add your bank accounts, savings pots, or cash with their current balances.</p>
			</div>
		</div>

		<div class="flex gap-3">
			<span class="text-xl">2️⃣</span>
			<div>
				<p class="font-semibold">Set up regular income & bills</p>
				<p class="text-slate">Tell us about your salary, rent, subscriptions — anything that repeats.</p>
			</div>
		</div>

		<div class="flex gap-3">
			<span class="text-xl">3️⃣</span>
			<div>
				<p class="font-semibold">See your projected balance</p>
				<p class="text-slate">We'll show you what your balance will look like after upcoming transactions.</p>
			</div>
		</div>

		<div class="flex gap-3">
			<span class="text-xl">4️⃣</span>
			<div>
				<p class="font-semibold">Track as you go</p>
				<p class="text-slate">Add one-off expenses and income as they happen. Plan ahead with future transactions.</p>
			</div>
		</div>

		<hr class="my-4 border-slate/20" />

		<div class="rounded-lg bg-oat p-3">
			<p class="font-semibold">🔒 Your data is private</p>
			<p class="text-slate">Everything is stored locally on your device. We never see your financial data.</p>
		</div>

		<button
			class="button mt-4 w-full"
			onclick={() => showHowItWorks = false}
		>
			Got it!
		</button>
	</div>
</Modal>

<!-- Why Log In Modal -->
<Modal
	isOpen={showWhyLogin}
	title="Free vs Pro"
	onClose={() => showWhyLogin = false}
	size="md"
>
	<div class="space-y-4 text-sm text-ink">
		<div class="rounded-lg border border-slate/20 p-4">
			<div class="flex items-center gap-2 mb-2">
				<span class="text-lg">🆓</span>
				<p class="font-semibold">Free (No Account)</p>
			</div>
			<ul class="space-y-1 text-slate">
				<li>✓ All features included</li>
				<li>✓ Data stays on your device only</li>
				<li>✓ Completely private — we never see your data</li>
				<li>✗ No sync between devices</li>
				<li>✗ Data lost if you clear browser</li>
			</ul>
		</div>

		<div class="rounded-lg border-2 border-moss/30 bg-moss/5 p-4">
			<div class="flex items-center gap-2 mb-2">
				<span class="text-lg">⭐</span>
				<p class="font-semibold">Pro (£3/month)</p>
			</div>
			<ul class="space-y-1 text-slate">
				<li>✓ All features included</li>
				<li>✓ Sync across all your devices</li>
				<li>✓ Access from any browser</li>
				<li>✓ Automatic cloud backup</li>
				<li>✓ Cancel anytime</li>
			</ul>
		</div>

		<div class="rounded-lg bg-amber-50 p-3 text-amber-800">
			<p class="font-semibold">📤 Data & Privacy</p>
			<p class="mt-1 text-sm">
				<strong>Free:</strong> Your financial data never leaves your device. We can't see it.
			</p>
			<p class="mt-1 text-sm">
				<strong>Pro:</strong> Your data is encrypted and stored on our servers to enable syncing. 
				You can export or delete your data at any time. We never sell or share your information.
			</p>
		</div>

		<div class="flex gap-3 pt-2">
			<button
				class="button-secondary flex-1"
				onclick={() => showWhyLogin = false}
			>
				Stay Free
			</button>
			<a
				href="/login"
				class="button flex-1 text-center"
			>
				Log In / Sign Up
			</a>
		</div>
	</div>
</Modal>
