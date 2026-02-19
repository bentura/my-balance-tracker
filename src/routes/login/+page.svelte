<script lang="ts">
	import { goto } from '$app/navigation';
	import { login, register, isLoggedIn, isPremium, isAdmin, switchToApiStorage, initStore, checkAuth } from '$lib/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { isBiometricAvailable, authenticateWithBiometric, hasBiometricSetup } from '$lib/biometric';

	let mode = $state<'login' | 'register'>('login');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);
	let biometricAvailable = $state(false);
	let biometricLoading = $state(false);

	onMount(async () => {
		// Redirect if already logged in
		if ($isLoggedIn) {
			goto('/dashboard');
			return;
		}

		// Check if biometric is available
		biometricAvailable = await isBiometricAvailable();
	});

	const handleBiometricLogin = async () => {
		biometricLoading = true;
		error = '';

		try {
			const success = await authenticateWithBiometric();
			if (success) {
				// Refresh auth state and reinitialize store
				await checkAuth();
				await initStore();
				goto('/dashboard');
			} else {
				error = 'Biometric authentication failed. Please use your password.';
			}
		} catch {
			error = 'Biometric authentication not available';
		} finally {
			biometricLoading = false;
		}
	};

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
			// Reinitialize store with correct storage adapter (API for premium, local for free)
			await initStore();
			
			// Redirect admins to admin panel, others to dashboard
			if (get(isAdmin)) {
				goto('/admin');
			} else {
				goto('/dashboard');
			}
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
						{#if mode === 'login'}
							<div class="mt-1 text-right">
								<a href="/forgot-password" class="text-xs text-moss hover:underline">
									Forgot password?
								</a>
							</div>
						{/if}
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

					{#if mode === 'login' && biometricAvailable}
						<div class="relative">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-gray-200"></div>
							</div>
							<div class="relative flex justify-center text-sm">
								<span class="bg-white px-2 text-slate">or</span>
							</div>
						</div>

						<button 
							type="button"
							class="button-secondary w-full flex items-center justify-center gap-2"
							onclick={handleBiometricLogin}
							disabled={biometricLoading}
						>
							<span class="text-lg">👆</span>
							{biometricLoading ? 'Authenticating...' : 'Use Fingerprint / Face ID'}
						</button>
					{/if}
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
