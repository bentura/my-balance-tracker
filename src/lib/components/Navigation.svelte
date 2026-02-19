<script lang="ts">
	import { page } from '$app/stores';
	import { currentUser, isLoggedIn, isPremium, logout, switchToLocalStorage, features } from '$lib/stores';
	import { goto } from '$app/navigation';

	let isOpen = $state(false);

	const toggle = () => {
		isOpen = !isOpen;
	};

	const close = () => {
		isOpen = false;
	};

	const handleLogout = async () => {
		await logout();
		await switchToLocalStorage();
		close();
		goto('/');
	};

	const links = [
		{ href: '/dashboard', label: 'Accounts', icon: '💰' },
		{ href: '/recurring/income', label: 'Regular Income', icon: '📈' },
		{ href: '/recurring/outgoings', label: 'Regular Outgoings', icon: '📉' },
		{ href: '/categories', label: 'Categories', icon: '🏷️' },
		{ href: '/transactions', label: 'All Transactions', icon: '📋' },
		{ href: '/settings', label: 'Settings', icon: '⚙️' },
		{ href: '/about', label: 'About', icon: 'ℹ️' },
	];
</script>

<!-- Burger button -->
<button
	class="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md hover:bg-oat"
	onclick={toggle}
	aria-label="Toggle menu"
>
	{#if isOpen}
		<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
		</svg>
	{:else}
		<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
		</svg>
	{/if}
</button>

<!-- Backdrop -->
{#if isOpen}
	<button
		class="fixed inset-0 z-40 bg-black/30"
		onclick={close}
		aria-label="Close menu"
	></button>
{/if}

<!-- Slide-out menu -->
<nav
	class="fixed left-0 top-0 z-50 h-full w-64 transform bg-white shadow-xl transition-transform duration-200 ease-in-out"
	class:translate-x-0={isOpen}
	class:-translate-x-full={!isOpen}
>
	<div class="flex h-full flex-col">
		<!-- Header -->
		<div class="border-b border-slate/20 p-5">
			<h2 class="font-serif text-xl font-semibold">MyBalanceTracker</h2>
			{#if $isLoggedIn}
				<p class="text-sm text-slate truncate">{$currentUser?.email}</p>
				{#if $isPremium}
					<span class="inline-block mt-1 rounded-full bg-moss/10 px-2 py-0.5 text-xs font-medium text-moss">
						Pro
					</span>
				{/if}
			{:else}
				<p class="text-sm text-slate">Free (local only)</p>
			{/if}
		</div>

		<!-- Links -->
		<div class="flex-1 overflow-y-auto p-3">
			{#each links as link}
				<a
					href={link.href}
					class="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-oat"
					class:bg-moss={$page.url.pathname === link.href}
					class:text-white={$page.url.pathname === link.href}
					onclick={close}
				>
					<span>{link.icon}</span>
					<span>{link.label}</span>
				</a>
			{/each}
		</div>

		<!-- Footer -->
		<div class="border-t border-slate/20 p-4 space-y-2">
			{#if $features.userAuth}
				{#if $isLoggedIn}
					{#if !$isPremium && $features.showUpgradePrompts}
						<a
							href="/upgrade"
							class="flex items-center justify-center gap-2 rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-moss/90"
							onclick={close}
						>
							<span>⭐</span>
							<span>Upgrade to Pro</span>
						</a>
					{/if}
					<button
						class="w-full rounded-lg border border-slate/20 px-4 py-2 text-sm font-medium text-slate hover:bg-oat"
						onclick={handleLogout}
					>
						Log Out
					</button>
				{:else if $features.showUpgradePrompts}
					<!-- Free users only see upgrade option, no login button -->
					<a
						href="/upgrade"
						class="flex items-center justify-center gap-2 rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-moss/90"
						onclick={close}
					>
						<span>⭐</span>
						<span>Upgrade to Pro</span>
					</a>
				{/if}
			{/if}
		</div>
	</div>
</nav>
