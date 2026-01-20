<script lang="ts">
	import { toasts, type Toast } from '$stores/toast.svelte';
	import { flip } from 'svelte/animate';
	import { fly, fade } from 'svelte/transition';

	function getIcon(type: Toast['type']): string {
		switch (type) {
			case 'success': return '✓';
			case 'error': return '✕';
			case 'warning': return '⚠';
			case 'info': return 'ℹ';
			default: return '';
		}
	}
</script>

<div class="toast-container" aria-live="polite">
	{#each toasts.items as toast (toast.id)}
		<div
			class="toast toast--{toast.type}"
			role="alert"
			animate:flip={{ duration: 200 }}
			in:fly={{ y: -20, duration: 250 }}
			out:fade={{ duration: 150 }}
		>
			<span class="toast__icon">{getIcon(toast.type)}</span>
			<span class="toast__message">{toast.message}</span>
			<button
				class="toast__close"
				onclick={() => toasts.remove(toast.id)}
				aria-label="Cerrar"
			>
				✕
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 90vw;
		width: 280px;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		background: #1a1a1a;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		border: 1px solid #333;
	}

	.toast--success {
		border-color: #0a0;
		background: #0a1a0a;
	}

	.toast--error {
		border-color: #a00;
		background: #1a0a0a;
	}

	.toast--warning {
		border-color: #a80;
		background: #1a1a0a;
	}

	.toast--info {
		border-color: #08a;
		background: #0a1a1a;
	}

	.toast__icon {
		font-size: 1rem;
		flex-shrink: 0;
		font-weight: bold;
	}

	.toast--success .toast__icon {
		color: #0f0;
	}

	.toast--error .toast__icon {
		color: #f44;
	}

	.toast--warning .toast__icon {
		color: #fa0;
	}

	.toast--info .toast__icon {
		color: #0af;
	}

	.toast__message {
		flex: 1;
		font-size: 0.8rem;
		color: #ccc;
		line-height: 1.3;
	}

	.toast__close {
		background: none;
		border: none;
		color: #666;
		cursor: pointer;
		padding: 4px;
		font-size: 0.7rem;
		line-height: 1;
	}

	.toast__close:hover {
		color: #aaa;
	}
</style>
