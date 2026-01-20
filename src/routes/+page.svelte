<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Tuner from '$components/Tuner.svelte';
	
	let isReady = $state(false);
	let isSupported = $state(true);
	
	onMount(() => {
		if (browser) {
			const hasGetUserMedia = typeof navigator.mediaDevices?.getUserMedia === 'function';
			const hasAudioContext = typeof window.AudioContext !== 'undefined';
			isSupported = hasGetUserMedia && hasAudioContext;
		}
		isReady = true;
	});
</script>

<div class="page">
	{#if !isReady}
		<div class="loading">
			<div class="spinner"></div>
		</div>
	{:else if !isSupported}
		<div class="error">
			<p><strong>Navegador no compatible</strong></p>
			<p>Usa Chrome, Firefox o Safari</p>
		</div>
	{:else}
		<Tuner />
	{/if}
</div>

<style>
	.page {
		width: 100%;
		display: flex;
		justify-content: center;
		padding: 16px;
	}
	
	.loading {
		padding: 48px;
	}
	
	.spinner {
		width: 32px;
		height: 32px;
		border: 2px solid #222;
		border-top-color: #0f0;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.error {
		padding: 24px;
		background: #1a1a1a;
		border: 1px solid #f33;
		border-radius: 8px;
		text-align: center;
		color: #888;
		font-size: 0.85rem;
	}
	
	.error strong {
		color: #f66;
	}
</style>
