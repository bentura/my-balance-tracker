<script lang="ts">
	import { goto } from '$app/navigation';
	import { register, isLoggedIn, isPremium, switchToApiStorage } from '$lib/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	// Where to redirect after registration (default to upgrade flow)
	const redirectTo = '/upgrade';

	onMount(async () => {
		// If already logged in, go straight to upgrade
		if ($isLoggedIn) {
			goto(redirectTo);
			return;
		}
	});

	const handleSubmit = async () => {
		error = '';

		if (!email || !password) {
			error = 'Please fill in all fields';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;

		const result = await register(email, password);

		loading = false;

		if (result.success) {
			// Account created, now continue to upgrade/checkout
			goto(redirectTo);
		} else {
			error = result.error || 'Something went wrong';
		}
	};
</script>

<svelte:head>
	<title>Create Account - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-12">
	<div class="mx-auto max-w-md">
		<div class="mb-8 text-center">
			<a href="/" class="inline-block text-4xl">💰</a>
			<h1 class="mt-4 font-serif text-2xl font-semibold">Create your account</h1>
			<p class="mt-2 text-slate">
				Sign up to unlock cloud sync and Pro features
			</p>
		</div>

		<div class="card">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="space-y-4">
					<div>
						<label class="label" for="email">Email</label>
						<input
							id="email"
							type="email"
							class="input"
							bind:value={email}
							autocomplete="email"
							required
						/>
					</div>

					<div>
						<label class="label" for="password">Password</label>
						<input
							id="password"
							type="password"
							class="input"
							bind:value={password}
							autocomplete="new-password"
							required
						/>
						<p class="mt-1 text-xs text-slate">At least 8 characters</p>
					</div>

					<div>
						<label class="label" for="confirm-password">Confirm Password</label>
						<input
							id="confirm-password"
							type="password"
							class="input"
							bind:value={confirmPassword}
							autocomplete="new-password"
							required
						/>
					</div>

					{#if error}
						<div class="rounded-md bg-red-50 p-3 text-sm text-red-600">
							{error}
						</div>
					{/if}

					<button 
						type="submit" 
						class="button w-full"
						disabled={loading}
					>
						{loading ? 'Creating account...' : 'Create Account'}
					</button>
				</div>
			</form>
		</div>

		<div class="mt-6 text-center">
			<a href="/dashboard" class="text-sm text-slate hover:text-ink">
				← Continue without an account
			</a>
		</div>
	</div>
</main>
