<script lang="ts">
	import { Modal } from '$lib/components';
	import { showDataRecoveryPrompt, wasPremium } from '$lib/stores/auth';
	import { downloadCloudDataToLocal, showFeedback } from '$lib/stores';

	let loading = $state(false);
	let error = $state('');

	const handleDownload = async () => {
		loading = true;
		error = '';

		const success = await downloadCloudDataToLocal();

		if (success) {
			showFeedback('Data downloaded successfully! You can continue using the app offline.');
			showDataRecoveryPrompt.set(false);
			wasPremium.set(false); // Reset so we don't show again
		} else {
			error = 'Failed to download data. Please try again or contact support.';
		}

		loading = false;
	};

	const handleSkip = () => {
		showDataRecoveryPrompt.set(false);
		wasPremium.set(false); // Reset so we don't show again
	};
</script>

<Modal
	isOpen={$showDataRecoveryPrompt}
	title="Your Pro subscription has ended"
	onClose={handleSkip}
>
	<div class="space-y-4">
		<p class="text-slate">
			Your data is still safely stored in the cloud, but you'll need to download it to continue using the app locally.
		</p>

		<div class="rounded-lg bg-amber-50 p-4 text-sm">
			<p class="font-medium text-amber-800">What happens next?</p>
			<ul class="mt-2 space-y-1 text-amber-700">
				<li>• Your data will be saved to this device</li>
				<li>• You can keep using the app offline</li>
				<li>• Changes won't sync to other devices</li>
				<li>• You can re-subscribe anytime to restore sync</li>
			</ul>
		</div>

		{#if error}
			<div class="rounded-md bg-red-50 p-3 text-sm text-red-600">
				{error}
			</div>
		{/if}

		<div class="flex gap-3">
			<button
				class="button-secondary flex-1"
				onclick={handleSkip}
				disabled={loading}
			>
				Skip for now
			</button>
			<button
				class="button flex-1"
				onclick={handleDownload}
				disabled={loading}
			>
				{loading ? 'Downloading...' : 'Download my data'}
			</button>
		</div>

		<p class="text-center text-xs text-slate">
			Your cloud data will be kept for 30 days after cancellation.
		</p>
	</div>
</Modal>
