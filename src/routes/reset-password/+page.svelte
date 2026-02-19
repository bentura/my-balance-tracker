<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let token = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(true);
	let submitting = $state(false);
	let success = $state(false);
	let error = $state('');
	let tokenValid = $state(false);

	onMount(async () => {
		token = $page.url.searchParams.get('token') || '';

		if (!token) {
			error = 'No reset token provided';
			loading = false;
			return;
		}

		// Validate token
		try {
			const res = await fetch(`/api/auth/reset-password?token=${token}`);
			const data = await res.json();

			if (data.valid) {
				tokenValid = true;
				email = data.email;
			} else {
				error = data.error || 'Invalid or expired reset link';
			}
		} catch {
			error = 'Failed to validate reset link';
		} finally {
			loading = false;
		}
	});

	const handleSubmit = async () => {
		error = '';

		if (!password) {
			error = 'Please enter a new password';
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

		submitting = true;

		try {
			const res = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password })
			});

			const data = await res.json();

			if (res.ok) {
				success = true;
			} else {
				error = data.error || 'Failed to reset password';
			}
		} catch {
			error = 'Network error';
		} finally {
			submitting = false;
		}
	};
</script>

<svelte:head>
	<title>Reset Password - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-12">
	<div class="mx-auto max-w-md">
		<div class="mb-8 text-center">
			<a href="/" class="inline-block text-4xl">💰</a>
			<h1 class="mt-4 font-serif text-2xl font-semibold">Reset your password</h1>
		</div>

		<div class="card">
			{#if loading}
				<div class="text-center py-8">
					<p class="text-slate">Validating reset link...</p>
				</div>
			{:else if success}
				<div class="text-center">
					<div class="text-4xl mb-4">✅</div>
					<h2 class="text-lg font-semibold">Password reset!</h2>
					<p class="mt-2 text-slate">
						Your password has been changed successfully.
					</p>
					<a href="/login" class="button mt-6 inline-block">
						Log in
					</a>
				</div>
			{:else if tokenValid}
				<p class="mb-4 text-sm text-slate">
					Resetting password for <strong>{email}</strong>
				</p>

				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					<div class="space-y-4">
						<div>
							<label class="label" for="password">New Password</label>
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
							disabled={submitting}
						>
							{submitting ? 'Resetting...' : 'Reset Password'}
						</button>
					</div>
				</form>
			{:else}
				<div class="text-center">
					<div class="text-4xl mb-4">⚠️</div>
					<h2 class="text-lg font-semibold">Invalid reset link</h2>
					<p class="mt-2 text-slate">{error}</p>
					<a href="/forgot-password" class="button mt-6 inline-block">
						Request new link
					</a>
				</div>
			{/if}
		</div>

		<div class="mt-6 text-center">
			<a href="/login" class="text-sm text-slate hover:text-ink">
				← Back to login
			</a>
		</div>
	</div>
</main>
