<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const steps = [
		{ path: '/onboarding', label: 'Accounts' },
		{ path: '/onboarding/outgoings', label: 'Outgoings' },
		{ path: '/onboarding/income', label: 'Income' },
	];

	const currentStep = $derived(
		steps.findIndex(s => s.path === $page.url.pathname) + 1 || 1
	);

	const isStepComplete = (i: number) => i + 1 <= currentStep;
	const isStepConnectorComplete = (i: number) => i + 1 < currentStep;
</script>

<svelte:head>
	<title>Setup - MyBalanceTracker</title>
</svelte:head>

<main class="min-h-screen bg-oat px-4 py-8">
	<div class="mx-auto max-w-lg">
		<!-- Progress indicator -->
		<div class="mb-8">
			<div class="flex items-center justify-between">
				{#each steps as step, i}
					{@const complete = isStepComplete(i)}
					<div class="flex items-center">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold {complete ? 'bg-moss text-white' : 'bg-slate/20 text-slate'}"
						>
							{i + 1}
						</div>
						{#if i < steps.length - 1}
							{@const connectorComplete = isStepConnectorComplete(i)}
							<div
								class="mx-2 h-0.5 w-12 sm:w-20 {connectorComplete ? 'bg-moss' : 'bg-slate/20'}"
							></div>
						{/if}
					</div>
				{/each}
			</div>
			<div class="mt-2 flex justify-between text-xs text-slate">
				{#each steps as step}
					<span>{step.label}</span>
				{/each}
			</div>
		</div>

		<!-- Content -->
		{@render children()}
	</div>
</main>
