<script lang="ts">
	import { feedback } from '$lib/stores';
</script>

{#if $feedback}
	<div
		class="fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg"
		class:bg-moss={$feedback.type === 'success'}
		class:text-white={$feedback.type === 'success'}
		class:bg-red-100={$feedback.type === 'error'}
		class:text-red-800={$feedback.type === 'error'}
		class:border={$feedback.type === 'error'}
		class:border-red-300={$feedback.type === 'error'}
	>
		<div class="flex items-center gap-2">
			{#if $feedback.type === 'success'}
				<span>✓</span>
			{:else}
				<span>⚠</span>
			{/if}
			<span class="text-sm font-medium">{$feedback.message}</span>
		</div>
	</div>
{/if}
