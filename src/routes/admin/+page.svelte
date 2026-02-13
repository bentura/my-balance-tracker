<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Modal } from '$lib/components';

	let authenticated = $state(false);
	let adminSecret = $state('');
	let authError = $state('');
	let loading = $state(true);

	// Data
	let stats = $state<any>(null);
	let users = $state<any[]>([]);
	let vouchers = $state<any[]>([]);

	// Modals
	let showCreateVoucher = $state(false);
	let newVoucher = $state({ code: '', description: '', maxUses: 10, durationMonths: 1 });
	let createError = $state('');

	// Tab
	let activeTab = $state<'stats' | 'users' | 'vouchers'>('stats');

	onMount(() => {
		// Check if admin secret is stored
		const stored = localStorage.getItem('mbt_admin_secret');
		if (stored) {
			adminSecret = stored;
			authenticate();
		} else {
			loading = false;
		}
	});

	const authenticate = async () => {
		loading = true;
		authError = '';

		try {
			const res = await fetch('/api/admin/stats', {
				headers: { 'Authorization': `Bearer ${adminSecret}` }
			});

			if (!res.ok) {
				authError = 'Invalid admin secret';
				localStorage.removeItem('mbt_admin_secret');
				authenticated = false;
				loading = false;
				return;
			}

			localStorage.setItem('mbt_admin_secret', adminSecret);
			authenticated = true;
			await loadData();
		} catch {
			authError = 'Connection error';
		} finally {
			loading = false;
		}
	};

	const loadData = async () => {
		const headers = { 'Authorization': `Bearer ${adminSecret}` };

		const [statsRes, usersRes, vouchersRes] = await Promise.all([
			fetch('/api/admin/stats', { headers }),
			fetch('/api/admin/users', { headers }),
			fetch('/api/voucher/create', { headers })
		]);

		if (statsRes.ok) stats = await statsRes.json();
		if (usersRes.ok) users = (await usersRes.json()).users || [];
		if (vouchersRes.ok) vouchers = (await vouchersRes.json()).vouchers || [];
	};

	const createVoucher = async () => {
		createError = '';

		if (!newVoucher.code.trim()) {
			createError = 'Code is required';
			return;
		}

		const res = await fetch('/api/voucher/create', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${adminSecret}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(newVoucher)
		});

		const data = await res.json();

		if (!res.ok) {
			createError = data.error || 'Failed to create voucher';
			return;
		}

		vouchers = [data.voucher, ...vouchers];
		showCreateVoucher = false;
		newVoucher = { code: '', description: '', maxUses: 10, durationMonths: 1 };
	};

	const toggleVoucher = async (id: number, isActive: boolean) => {
		await fetch('/api/admin/voucher/' + id, {
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${adminSecret}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ isActive: !isActive })
		});
		await loadData();
	};

	const toggleUserPro = async (userId: number, currentStatus: string) => {
		const newStatus = currentStatus === 'active' ? 'free' : 'active';
		await fetch('/api/admin/users/' + userId, {
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${adminSecret}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ subscriptionStatus: newStatus })
		});
		await loadData();
	};

	const logout = () => {
		localStorage.removeItem('mbt_admin_secret');
		authenticated = false;
		adminSecret = '';
	};

	const formatDate = (dateStr: string) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric', month: 'short', year: 'numeric'
		});
	};
</script>

<svelte:head>
	<title>Admin - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6">
	<div class="mx-auto max-w-4xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="font-serif text-2xl font-semibold">Admin Dashboard</h1>
			{#if authenticated}
				<button class="text-sm text-slate hover:text-ink" onclick={logout}>Log out</button>
			{/if}
		</div>

		{#if loading}
			<div class="card text-center">
				<p class="text-slate">Loading...</p>
			</div>
		{:else if !authenticated}
			<!-- Login -->
			<div class="card mx-auto max-w-sm">
				<h2 class="mb-4 text-lg font-semibold">Admin Login</h2>
				<form onsubmit={(e) => { e.preventDefault(); authenticate(); }}>
					<div class="space-y-4">
						<div>
							<label class="label" for="secret">Admin Secret</label>
							<input
								id="secret"
								type="password"
								class="input"
								bind:value={adminSecret}
								placeholder="Enter admin secret"
							/>
						</div>
						{#if authError}
							<p class="text-sm text-red-600">{authError}</p>
						{/if}
						<button type="submit" class="button w-full">Login</button>
					</div>
				</form>
			</div>
		{:else}
			<!-- Tabs -->
			<div class="mb-6 flex gap-2">
				<button
					class="rounded-lg px-4 py-2 text-sm font-medium"
					class:bg-moss={activeTab === 'stats'}
					class:text-white={activeTab === 'stats'}
					class:bg-white={activeTab !== 'stats'}
					onclick={() => activeTab = 'stats'}
				>
					Stats
				</button>
				<button
					class="rounded-lg px-4 py-2 text-sm font-medium"
					class:bg-moss={activeTab === 'users'}
					class:text-white={activeTab === 'users'}
					class:bg-white={activeTab !== 'users'}
					onclick={() => activeTab = 'users'}
				>
					Users ({users.length})
				</button>
				<button
					class="rounded-lg px-4 py-2 text-sm font-medium"
					class:bg-moss={activeTab === 'vouchers'}
					class:text-white={activeTab === 'vouchers'}
					class:bg-white={activeTab !== 'vouchers'}
					onclick={() => activeTab = 'vouchers'}
				>
					Vouchers ({vouchers.length})
				</button>
			</div>

			<!-- Stats Tab -->
			{#if activeTab === 'stats'}
				<div class="grid gap-4 sm:grid-cols-3">
					<div class="card text-center">
						<p class="text-3xl font-bold">{stats?.totalUsers || 0}</p>
						<p class="text-sm text-slate">Total Users</p>
					</div>
					<div class="card text-center">
						<p class="text-3xl font-bold text-green-600">{stats?.activeSubscriptions || 0}</p>
						<p class="text-sm text-slate">Active Pro</p>
					</div>
					<div class="card text-center">
						<p class="text-3xl font-bold text-moss">{stats?.vouchersRedeemed || 0}</p>
						<p class="text-sm text-slate">Vouchers Redeemed</p>
					</div>
				</div>
			{/if}

			<!-- Users Tab -->
			{#if activeTab === 'users'}
				<div class="card overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b text-left">
								<th class="pb-2">Email</th>
								<th class="pb-2">Status</th>
								<th class="pb-2">Stripe</th>
								<th class="pb-2">Joined</th>
								<th class="pb-2">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each users as user}
								<tr class="border-b last:border-0">
									<td class="py-2">{user.email}</td>
									<td class="py-2">
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium"
											class:bg-green-100={user.subscriptionStatus === 'active'}
											class:text-green-700={user.subscriptionStatus === 'active'}
											class:bg-gray-100={user.subscriptionStatus !== 'active'}
											class:text-gray-700={user.subscriptionStatus !== 'active'}
										>
											{user.subscriptionStatus}
										</span>
									</td>
									<td class="py-2">
										{#if user.stripeCustomerId}
											<span class="text-xs text-slate">{user.stripeCustomerId.slice(-8)}</span>
										{:else}
											<span class="text-xs text-slate">-</span>
										{/if}
									</td>
									<td class="py-2 text-slate">{formatDate(user.createdAt)}</td>
									<td class="py-2">
										<button
											class="text-xs text-moss hover:underline"
											onclick={() => toggleUserPro(user.id, user.subscriptionStatus)}
										>
											{user.subscriptionStatus === 'active' ? 'Revoke Pro' : 'Grant Pro'}
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Vouchers Tab -->
			{#if activeTab === 'vouchers'}
				<div class="mb-4">
					<button class="button" onclick={() => showCreateVoucher = true}>
						+ Create Voucher
					</button>
				</div>

				<div class="card overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b text-left">
								<th class="pb-2">Code</th>
								<th class="pb-2">Description</th>
								<th class="pb-2">Uses</th>
								<th class="pb-2">Duration</th>
								<th class="pb-2">Status</th>
								<th class="pb-2">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each vouchers as v}
								<tr class="border-b last:border-0">
									<td class="py-2 font-mono font-medium">{v.code}</td>
									<td class="py-2 text-slate">{v.description || '-'}</td>
									<td class="py-2">{v.timesUsed} / {v.maxUses}</td>
									<td class="py-2">{v.durationMonths} mo</td>
									<td class="py-2">
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium"
											class:bg-green-100={v.isActive}
											class:text-green-700={v.isActive}
											class:bg-red-100={!v.isActive}
											class:text-red-700={!v.isActive}
										>
											{v.isActive ? 'Active' : 'Disabled'}
										</span>
									</td>
									<td class="py-2">
										<button
											class="text-xs text-moss hover:underline"
											onclick={() => toggleVoucher(v.id, v.isActive)}
										>
											{v.isActive ? 'Disable' : 'Enable'}
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}
	</div>
</main>

<!-- Create Voucher Modal -->
<Modal
	isOpen={showCreateVoucher}
	title="Create Voucher"
	onClose={() => showCreateVoucher = false}
>
	<div class="space-y-4">
		<div>
			<label class="label" for="v-code">Code</label>
			<input
				id="v-code"
				class="input uppercase"
				placeholder="e.g. BETATESTER"
				bind:value={newVoucher.code}
			/>
		</div>
		<div>
			<label class="label" for="v-desc">Description (optional)</label>
			<input
				id="v-desc"
				class="input"
				placeholder="e.g. Beta tester access"
				bind:value={newVoucher.description}
			/>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="label" for="v-uses">Max Uses</label>
				<input
					id="v-uses"
					class="input"
					type="number"
					min="1"
					bind:value={newVoucher.maxUses}
				/>
			</div>
			<div>
				<label class="label" for="v-months">Duration (months)</label>
				<input
					id="v-months"
					class="input"
					type="number"
					min="1"
					bind:value={newVoucher.durationMonths}
				/>
			</div>
		</div>
		{#if createError}
			<p class="text-sm text-red-600">{createError}</p>
		{/if}
		<div class="flex gap-3">
			<button class="button-secondary flex-1" onclick={() => showCreateVoucher = false}>
				Cancel
			</button>
			<button class="button flex-1" onclick={createVoucher}>
				Create
			</button>
		</div>
	</div>
</Modal>
