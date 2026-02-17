<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Navigation, Feedback } from '$lib/components';
	import { initStore, isLoading, hasCompletedOnboarding, runDailyProcessing, checkAuth, initConfig } from '$lib/stores';

	let { children, data } = $props();

	// Initialize config from server data
	$effect(() => {
		if (data?.appMode) {
			initConfig(data.appMode, data.features || {});
		}
	});

	// Pages that don't show the navigation
	const noNavPages = ['/', '/onboarding'];
	const showNav = $derived(
		$hasCompletedOnboarding && !noNavPages.some(p => $page.url.pathname === p || $page.url.pathname.startsWith('/onboarding'))
	);

	onMount(async () => {
		// Check auth status
		await checkAuth();
		// Initialize local store
		await initStore();
		// Run daily processing on app load
		await runDailyProcessing();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
	/>
</svelte:head>

{#if $isLoading}
	<div class="flex min-h-screen items-center justify-center bg-oat">
		<div class="text-center">
			<div class="mb-4 text-4xl">💰</div>
			<p class="text-slate">Loading...</p>
		</div>
	</div>
{:else}
	{#if showNav}
		<Navigation />
	{/if}

	<div class:pl-0={!showNav} class:md:pl-0={showNav}>
		{@render children()}
	</div>

	<Feedback />
{/if}
