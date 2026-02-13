<script lang="ts">
	import { goto } from '$app/navigation';
	import { login, register, isLoggedIn } from '$lib/stores';
	import { onMount } from 'svelte';

	let mode = $state<'login' | 'register'>('login');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	onMount(() => {
		// Redirect if already logged in
		if ($isLoggedIn) {
			goto('/dashboard');
		}
	});

	const handleSubmit = async () => {
		error = '';

		if (!email || !password) {
			error = 'Please fill in all fields';
			return;
		}

		if (mode === 'register') {
			if (password.length < 8) {
				error = 'Password must be at least 8 characters';
				return;
			}
			if (password !== confirmPassword) {
				error = 'Passwords do not match';
				return;
			}
		}

		loading = true;

		const result = mode === 'login' 
			? await login(email, password)
			: await register(email, password);

		loading = false;

		if (result.success) {
			goto('/dashboard');
		} else {
			error = result.error || 'Something went wrong';
		}
	};

	const toggleMode = () => {
		mode = mode === 'login' ? 'register' : 'login';
		error = '';
	};
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Log In' : 'Create Account'} - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-12">
	<div class="mx-auto max-w-md">
		<div class="mb-8 text-center">
			<a href="/" class="inline-block text-4xl">💰</a>
			<h1 class="mt-4 font-serif text-2xl font-semibold">
				{mode === 'login' ? 'Welcome back' : 'Create your account'}
			</h1>
			<p class="mt-2 text-slate">
				{mode === 'login' 
					? 'Log in to sync your data across devices' 
					: 'Sign up to unlock cloud sync and more'}
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
							autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
							required
						/>
					</div>

					{#if mode === 'register'}
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
					{/if}

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
						{#if loading}
							{mode === 'login' ? 'Logging in...' : 'Creating account...'}
						{:else}
							{mode === 'login' ? 'Log In' : 'Create Account'}
						{/if}
					</button>
				</div>
			</form>

			<div class="mt-6 border-t border-gray-200 pt-6 text-center">
				<p class="text-sm text-slate">
					{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
					<button 
						type="button"
						class="ml-1 font-medium text-moss hover:underline"
						onclick={toggleMode}
					>
						{mode === 'login' ? 'Sign up' : 'Log in'}
					</button>
				</p>
			</div>
		</div>

		<div class="mt-6 text-center">
			<a href="/dashboard" class="text-sm text-slate hover:text-ink">
				← Continue without an account
			</a>
		</div>
	</div>
</main>
