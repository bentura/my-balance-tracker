<script lang="ts">
	import { Modal } from '$lib/components';
	import {
		categories,
		createCategory,
		deleteCategory,
		showFeedback,
		getStorage
	} from '$lib/stores';
	import type { Category, Transaction, RecurringItem } from '$lib/types';
	import { onMount } from 'svelte';

	let showAddModal = $state(false);
	let name = $state('');
	let color = $state('#3f5d50'); // moss color default

	// Stats for each category
	let categoryStats = $state<Record<number, { transactionCount: number; recurringCount: number; totalAmount: number }>>({});

	const colors = [
		{ value: '#3f5d50', name: 'Moss' },
		{ value: '#5b6770', name: 'Slate' },
		{ value: '#e74c3c', name: 'Red' },
		{ value: '#3498db', name: 'Blue' },
		{ value: '#9b59b6', name: 'Purple' },
		{ value: '#f39c12', name: 'Orange' },
		{ value: '#1abc9c', name: 'Teal' },
		{ value: '#e91e63', name: 'Pink' },
	];

	onMount(async () => {
		await loadStats();
	});

	const loadStats = async () => {
		const storage = getStorage();
		if (!storage) return;

		const [transactions, recurringItems] = await Promise.all([
			storage.getTransactions({ includeUnApplied: true, limit: 1000 }),
			storage.getRecurringItems()
		]);

		const stats: typeof categoryStats = {};

		for (const cat of $categories) {
			if (cat.id === undefined) continue;
			const catTx = transactions.filter(t => t.categoryId === cat.id);
			const catRecurring = recurringItems.filter(r => r.categoryId === cat.id);
			
			stats[cat.id] = {
				transactionCount: catTx.length,
				recurringCount: catRecurring.length,
				totalAmount: catTx.reduce((sum, t) => sum + (t.type === 'out' ? t.amount : 0), 0)
			};
		}

		categoryStats = stats;
	};

	// Reload stats when categories change
	$effect(() => {
		if ($categories.length > 0) {
			loadStats();
		}
	});

	const openAddModal = () => {
		name = '';
		color = '#3f5d50';
		showAddModal = true;
	};

	const saveCategory = async () => {
		if (!name.trim()) {
			showFeedback('Please enter a category name', 'error');
			return;
		}

		await createCategory({ name: name.trim(), color });
		showAddModal = false;
		showFeedback('Category created');
		await loadStats();
	};

	const removeCategory = async (id: number) => {
		if (!confirm('Delete this category? Items using it will become uncategorized.')) return;
		await deleteCategory(id);
		showFeedback('Category deleted');
		await loadStats();
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP'
		}).format(amount);
	};
</script>

<svelte:head>
	<title>Categories - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-2xl">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="font-serif text-2xl font-semibold">Categories</h1>
				<p class="text-sm text-slate">Organize your transactions</p>
			</div>
			<button class="button" onclick={openAddModal}>
				+ Add Category
			</button>
		</div>

		{#if $categories.length === 0}
			<div class="card text-center">
				<p class="text-slate">No categories yet.</p>
				<p class="mt-2 text-sm text-slate">
					Categories help you group similar transactions (e.g., "Bills", "Groceries", "Entertainment").
				</p>
				<button class="button mt-4" onclick={openAddModal}>Create your first category</button>
			</div>
		{:else}
			<div class="space-y-2">
				{#each $categories as category}
					{@const stats = categoryStats[category.id!] ?? { transactionCount: 0, recurringCount: 0, totalAmount: 0 }}
					<div class="card flex items-center gap-4 p-4">
						<!-- Color dot -->
						<div
							class="h-4 w-4 rounded-full"
							style="background-color: {category.color ?? '#3f5d50'}"
						></div>

						<!-- Name and stats -->
						<div class="flex-1">
							<p class="font-medium">{category.name}</p>
							<p class="text-sm text-slate">
								{stats.transactionCount} transaction{stats.transactionCount !== 1 ? 's' : ''}
								{#if stats.recurringCount > 0}
									· {stats.recurringCount} recurring
								{/if}
								{#if stats.totalAmount > 0}
									· {formatCurrency(stats.totalAmount)} spent
								{/if}
							</p>
						</div>

						<!-- Delete button -->
						<button
							class="text-slate hover:text-red-600"
							onclick={() => removeCategory(category.id!)}
							aria-label="Delete category"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Tips -->
		<div class="mt-8 rounded-lg bg-moss/10 p-4">
			<h3 class="font-semibold">💡 Category Tips</h3>
			<ul class="mt-2 space-y-1 text-sm text-slate">
				<li>• Use categories to group expenses like "Bills", "Groceries", "Entertainment"</li>
				<li>• You can assign categories to both one-off transactions and recurring items</li>
				<li>• View category totals on each account's detail page</li>
			</ul>
		</div>
	</div>
</main>

<Modal
	isOpen={showAddModal}
	title="Add Category"
	onClose={() => showAddModal = false}
>
	<div class="space-y-4">
		<div>
			<label class="label" for="cat-name">Category Name</label>
			<input
				id="cat-name"
				class="input"
				placeholder="e.g. Bills, Groceries, Entertainment"
				bind:value={name}
			/>
		</div>

		<div>
			<label class="label">Color</label>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each colors as c}
					<button
						class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
						style="background-color: {c.value}"
						class:border-ink={color === c.value}
						class:border-transparent={color !== c.value}
						onclick={() => color = c.value}
						title={c.name}
					></button>
				{/each}
			</div>
		</div>

		<div class="flex gap-3 pt-2">
			<button class="button-secondary flex-1" onclick={() => showAddModal = false}>
				Cancel
			</button>
			<button class="button flex-1" onclick={saveCategory}>
				Add Category
			</button>
		</div>
	</div>
</Modal>
