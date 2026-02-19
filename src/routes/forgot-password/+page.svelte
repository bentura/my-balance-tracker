<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let loading = $state(false);
	let success = $state(false);
	let error = $state('');

	const handleSubmit = async () => {
		if (!email) {
			error = 'Please enter your email';
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await res.json();

			if (res.ok) {
				success = true;
			} else {
				error = data.error || 'Something went wrong';
			}
		} catch {
			error = 'Network error';
		} finally {
			loading = false;
		}
	};
</script>

<svelte:head>
	<title>Forgot Password - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-12">
	<div class="mx-auto max-w-md">
		<div class="mb-8 text-center">
			<a href="/" class="inline-block text-4xl">💰</a>
			<h1 class="mt-4 font-serif text-2xl font-semibold">Forgot your password?</h1>
			<p class="mt-2 text-slate">
				Enter your email and we'll send you a reset link
			</p>
		</div>

		<div class="card">
			{#if success}
				<div class="text-center">
					<div class="text-4xl mb-4">📧</div>
					<h2 class="text-lg font-semibold">Check your email</h2>
					<p class="mt-2 text-slate">
						If an account exists with that email, we've sent a password reset link.
					</p>
					<p class="mt-4 text-sm text-slate">
						Didn't receive it? Check your spam folder or 
						<button class="text-moss hover:underline" onclick={() => success = false}>
							try again
						</button>
					</p>
				</div>
			{:else}
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
							{loading ? 'Sending...' : 'Send Reset Link'}
						</button>
					</div>
				</form>
			{/if}
		</div>

		<div class="mt-6 text-center">
			<a href="/login" class="text-sm text-slate hover:text-ink">
				← Back to login
			</a>
		</div>
	</div>
</main>
