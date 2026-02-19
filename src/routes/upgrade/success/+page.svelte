<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { checkAuth, currentUser, isPremium, switchToApiStorage, clearLocalStorage } from '$lib/stores';
	import { DexieAdapter } from '$lib/storage';
	import { page } from '$app/stores';

	let syncing = $state(false);
	let syncComplete = $state(false);
	let error = $state('');

	onMount(async () => {
		// Check if we came from Stripe checkout (has session_id in URL)
		const sessionId = $page.url.searchParams.get('session_id');
		
		if (sessionId) {
			// We came from Stripe - sync data and wait for webhook to update status
			await syncLocalData();
		} else {
			// Direct visit - check if already premium
			await checkAuth();
			if ($isPremium) {
				syncComplete = true;
			}
		}
	});

	const syncLocalData = async () => {
		syncing = true;
		error = '';

		try {
			// IMPORTANT: Export directly from local IndexedDB, not the current storage adapter
			// (which might already be ApiAdapter if user was logged in)
			const localAdapter = new DexieAdapter();
			await localAdapter.init();
			const localExport = await localAdapter.exportData();
			
			console.log('[MBT] Local data to sync:', localExport);
			
			// Check if there's any data to sync
			const hasData = localExport.accounts?.length > 0 || 
				localExport.categories?.length > 0 || 
				localExport.recurringItems?.length > 0 || 
				localExport.transactions?.length > 0;

			if (hasData) {
				// Upload to server (include session_id so sync works even if webhook is delayed)
				const sessionId = $page.url.searchParams.get('session_id');
				const syncUrl = sessionId ? `/api/sync?session_id=${sessionId}` : '/api/sync';
				
				const res = await fetch(syncUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(localExport)
				});

				if (!res.ok) {
					const errData = await res.json();
					throw new Error(errData.error || 'Sync failed');
				}
				
				console.log('[MBT] Data synced to cloud');
			} else {
				console.log('[MBT] No local data to sync');
			}

			// Refresh auth to get updated subscription status
			await checkAuth();
			
			// Switch to API storage now that we're premium
			await switchToApiStorage();
			
			// Clear local storage to prevent stale data issues
			await clearLocalStorage();
			
			syncComplete = true;
		} catch (err: any) {
			console.error('[MBT] Sync error:', err);
			error = err.message || 'Failed to sync data';
		} finally {
			syncing = false;
		}
	};

	const goToDashboard = () => {
		goto('/dashboard');
	};
</script>

<svelte:head>
	<title>Welcome to Pro! - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-12">
	<div class="mx-auto max-w-md text-center">
		{#if syncing}
			<div class="text-6xl mb-6">🔄</div>
			<h1 class="font-serif text-2xl font-semibold">Syncing your data...</h1>
			<p class="mt-3 text-slate">
				We're uploading your local data to the cloud. This only takes a moment.
			</p>
		{:else if error}
			<div class="text-6xl mb-6">⚠️</div>
			<h1 class="font-serif text-2xl font-semibold">Something went wrong</h1>
			<p class="mt-3 text-slate">{error}</p>
			<div class="mt-6 space-y-3">
				<button class="button" onclick={syncLocalData}>
					Try Again
				</button>
				<button class="button-secondary block w-full" onclick={goToDashboard}>
					Skip for now
				</button>
			</div>
		{:else if syncComplete}
			<div class="text-6xl mb-6">🎉</div>
			<h1 class="font-serif text-2xl font-semibold">You're all set!</h1>
			<p class="mt-3 text-slate">
				Your subscription is active and your data is synced to the cloud.
			</p>
			<div class="card mt-8 text-left">
				<h2 class="font-semibold mb-3">What's next?</h2>
				<ul class="space-y-2 text-sm text-slate">
					<li class="flex gap-2">
						<span>📱</span>
						<span>Access your data from any device</span>
					</li>
					<li class="flex gap-2">
						<span>☁️</span>
						<span>Automatic cloud backups</span>
					</li>
					<li class="flex gap-2">
						<span>🔄</span>
						<span>Changes sync instantly</span>
					</li>
				</ul>
			</div>
			<button class="button mt-6" onclick={goToDashboard}>
				Go to Dashboard
			</button>
		{:else}
			<div class="text-6xl mb-6">✅</div>
			<h1 class="font-serif text-2xl font-semibold">Payment successful!</h1>
			<p class="mt-3 text-slate">
				Welcome to MyBalanceTracker Pro.
			</p>
			<button class="button mt-6" onclick={goToDashboard}>
				Go to Dashboard
			</button>
		{/if}
	</div>
</main>
