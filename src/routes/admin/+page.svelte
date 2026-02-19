<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Modal } from '$lib/components';

	let authenticated = $state(false);
	let adminEmail = $state('');
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

	onMount(async () => {
		// Check if user is logged in and is admin
		try {
			const res = await fetch('/api/admin/auth');
			if (res.ok) {
				const data = await res.json();
				authenticated = true;
				adminEmail = data.email;
				await loadData();
			} else {
				authenticated = false;
			}
		} catch {
			authenticated = false;
		}
		loading = false;
	});

	const loadData = async () => {
		const [statsRes, usersRes, vouchersRes] = await Promise.all([
			fetch('/api/admin/stats'),
			fetch('/api/admin/users'),
			fetch('/api/voucher/create')
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
			headers: { 'Content-Type': 'application/json' },
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
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isActive: !isActive })
		});
		await loadData();
	};

	const toggleUserPro = async (userId: number, currentStatus: string) => {
		const newStatus = currentStatus === 'active' ? 'free' : 'active';
		await fetch('/api/admin/users/' + userId, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ subscriptionStatus: newStatus })
		});
		await loadData();
	};

	const toggleUserAdmin = async (userId: number, currentIsAdmin: boolean) => {
		await fetch('/api/admin/users/' + userId, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isAdmin: !currentIsAdmin })
		});
		await loadData();
	};

	const deleteUser = async (userId: number, email: string) => {
		if (!confirm(`Are you sure you want to delete ${email}?\n\nThis will:\n- Delete their account and all data\n- Cancel any Stripe subscriptions\n- Delete their Stripe customer record\n\nThis cannot be undone.`)) {
			return;
		}

		const res = await fetch('/api/admin/users/' + userId, {
			method: 'DELETE'
		});

		if (res.ok) {
			await loadData();
		} else {
			const data = await res.json();
			alert(data.error || 'Failed to delete user');
		}
	};

	const resetUserPassword = async (userId: number, email: string) => {
		if (!confirm(`Reset password for ${email}?\n\nA new password will be generated and emailed to them.`)) {
			return;
		}

		const res = await fetch('/api/admin/users/' + userId + '/reset-password', {
			method: 'POST'
		});

		if (res.ok) {
			alert('Password reset and emailed to user');
		} else {
			const data = await res.json();
			alert(data.error || 'Failed to reset password');
		}
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
				<span class="text-sm text-slate">{adminEmail}</span>
			{/if}
		</div>

		{#if loading}
			<div class="card text-center">
				<p class="text-slate">Loading...</p>
			</div>
		{:else if !authenticated}
			<!-- Not logged in or not admin -->
			<div class="card mx-auto max-w-sm text-center">
				<h2 class="mb-4 text-lg font-semibold">Admin Access Required</h2>
				<p class="mb-4 text-slate">You need to be logged in with an admin account to access this page.</p>
				<a href="/login" class="button inline-block">Log In</a>
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
								<th class="pb-2">Admin</th>
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
										{#if user.isAdmin}
											<span class="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Admin</span>
										{:else}
											<span class="text-xs text-slate">-</span>
										{/if}
									</td>
									<td class="py-2 text-slate">{formatDate(user.createdAt)}</td>
									<td class="py-2 space-x-2">
										<button
											class="text-xs text-moss hover:underline"
											onclick={() => toggleUserPro(user.id, user.subscriptionStatus)}
										>
											{user.subscriptionStatus === 'active' ? 'Revoke Pro' : 'Grant Pro'}
										</button>
										<button
											class="text-xs text-purple-600 hover:underline"
											onclick={() => toggleUserAdmin(user.id, user.isAdmin)}
										>
											{user.isAdmin ? 'Remove Admin' : 'Make Admin'}
										</button>
										<button
											class="text-xs text-blue-600 hover:underline"
											onclick={() => resetUserPassword(user.id, user.email)}
										>
											Reset PW
										</button>
										<button
											class="text-xs text-red-600 hover:underline"
											onclick={() => deleteUser(user.id, user.email)}
										>
											Delete
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
