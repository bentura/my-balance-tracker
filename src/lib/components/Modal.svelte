<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		isOpen: boolean;
		title?: string;
		onClose: () => void;
		size?: 'sm' | 'md' | 'lg';
		children?: import('svelte').Snippet;
	}

	let { isOpen, title, onClose, size = 'md', children }: Props = $props();

	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg'
	};

	// Close on escape key
	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	};

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	// Prevent body scroll when modal is open
	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	});
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 bg-black/50"
			onclick={onClose}
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div
			class="relative z-10 w-full {sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
		>
			{#if title}
				<div class="mb-4 flex items-center justify-between">
					<h2 class="font-serif text-xl font-semibold">{title}</h2>
					<button
						class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-oat"
						onclick={onClose}
						aria-label="Close"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}

			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}
