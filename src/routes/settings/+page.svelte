<script lang="ts">
	import { settings, updateSettings, exportData, importData, showFeedback } from '$lib/stores';

	let projectionDays = $state('30');
	let defaultCurrency = $state('GBP');

	// Sync form with settings
	$effect(() => {
		if ($settings) {
			projectionDays = $settings.projectionDays.toString();
			defaultCurrency = $settings.defaultCurrency;
		}
	});

	const currencies = [
		{ code: 'GBP', name: 'British Pound (£)' },
		{ code: 'USD', name: 'US Dollar ($)' },
		{ code: 'EUR', name: 'Euro (€)' },
	];

	const saveSettings = async () => {
		const days = parseInt(projectionDays, 10);
		if (isNaN(days) || days < 1 || days > 365) {
			showFeedback('Projection days must be between 1 and 365', 'error');
			return;
		}

		await updateSettings({
			projectionDays: days,
			defaultCurrency
		});
		showFeedback('Settings saved');
	};

	const handleExport = async () => {
		const data = await exportData();
		if (!data) return;

		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `mbt-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		showFeedback('Data exported');
	};

	let fileInput: HTMLInputElement;

	const handleImport = () => {
		fileInput?.click();
	};

	const onFileSelected = async (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const text = await file.text();
		const success = await importData(text);
		if (success) {
			showFeedback('Data imported successfully');
		}
		target.value = '';
	};
</script>

<svelte:head>
	<title>Settings - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-6 pt-16">
	<div class="mx-auto max-w-lg">
		<h1 class="mb-6 font-serif text-2xl font-semibold">Settings</h1>

		<!-- General settings -->
		<div class="card mb-6">
			<h2 class="mb-4 font-semibold">General</h2>

			<div class="space-y-4">
				<div>
					<label class="label" for="default-currency">Default Currency</label>
					<select id="default-currency" class="input" bind:value={defaultCurrency}>
						{#each currencies as c}
							<option value={c.code}>{c.name}</option>
						{/each}
					</select>
					<p class="mt-1 text-xs text-slate">Used for new accounts</p>
				</div>

				<div>
					<label class="label" for="projection-days">Projection Days</label>
					<input
						id="projection-days"
						class="input"
						type="number"
						min="1"
						max="365"
						bind:value={projectionDays}
					/>
					<p class="mt-1 text-xs text-slate">How far ahead to calculate projected balance (1-365 days)</p>
				</div>

				<button class="button w-full" onclick={saveSettings}>
					Save Settings
				</button>
			</div>
		</div>

		<!-- Data management -->
		<div class="card mb-6">
			<h2 class="mb-4 font-semibold">Data Management</h2>

			<div class="space-y-3">
				<button class="button-secondary w-full" onclick={handleExport}>
					📥 Export Data
				</button>
				<p class="text-xs text-slate">Download all your data as a JSON file</p>

				<hr class="my-4 border-slate/20" />

				<button class="button-secondary w-full" onclick={handleImport}>
					📤 Import Data
				</button>
				<p class="text-xs text-slate">⚠️ This will replace all existing data</p>
				<input
					type="file"
					accept=".json"
					class="hidden"
					bind:this={fileInput}
					onchange={onFileSelected}
				/>
			</div>
		</div>

		<!-- Privacy note -->
		<div class="rounded-lg bg-moss/10 p-4">
			<p class="text-sm">
				<span class="font-semibold">🔒 Your data is private</span><br />
				All data is stored locally on your device using IndexedDB. Nothing is sent to any server.
			</p>
		</div>
	</div>
</main>
