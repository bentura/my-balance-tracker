<script lang="ts">
	import { goto } from '$app/navigation';
	import { hasCompletedOnboarding, isInitialized } from '$lib/stores';
	import { Modal } from '$lib/components';

	let showHowItWorks = $state(false);

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
				Start Fresh
			</a>

			<a
				href="/login"
				class="button-secondary w-full py-3 text-base"
			>
				Log In
			</a>

			<button
				class="text-sm text-moss hover:underline mt-2"
				onclick={() => showHowItWorks = true}
			>
				How It Works
			</button>
		</div>

		<!-- Footer note -->
		<p class="mt-10 text-sm text-slate">
			Free version: data stays on your device.<br />
			Log in to sync across devices.
		</p>
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
