<script lang="ts">
	import { modal } from '$stores/modal.svelte';
	import { fade, scale } from 'svelte/transition';

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && modal.config.closable) modal.close();
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && modal.config.closable) {
			e.preventDefault();
			modal.close();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && modal.config.closable) modal.close();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if modal.isOpen}
	<div
		class="backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		transition:fade={{ duration: 150 }}
	>
		<div class="modal modal--{modal.config.size}" transition:scale={{ duration: 150, start: 0.95 }}>
			{#if modal.config.title}
				<header class="header">
					<h2>{modal.config.title}</h2>
					{#if modal.config.closable}
						<button class="close" onclick={() => modal.close()}>X</button>
					{/if}
				</header>
			{/if}

			<div class="body">
				{#if modal.config.component}
					<modal.config.component {...modal.config.props} />
				{:else if modal.config.content}
					<p>{modal.config.content}</p>
				{/if}
			</div>

			{#if modal.config.onConfirm || modal.config.cancelText}
				<footer class="footer">
					{#if modal.config.cancelText}
						<button onclick={() => modal.close()}>{modal.config.cancelText}</button>
					{/if}
					{#if modal.config.onConfirm}
						<button class="primary" onclick={() => modal.confirm()}>{modal.config.confirmText}</button>
					{/if}
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		z-index: 9998;
	}

	.modal {
		background: #141414;
		border: 1px solid #333;
		border-radius: 12px;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
	}

	.modal--sm { width: 100%; max-width: 300px; }
	.modal--md { width: 100%; max-width: 400px; }
	.modal--lg { width: 100%; max-width: 500px; }

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid #222;
	}

	.header h2 {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: #aaa;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.close {
		padding: 4px 8px;
		font-size: 0.7rem;
		font-weight: bold;
		background: #1a1a1a;
	}

	.close:hover {
		background: #f33;
		color: #fff;
		border-color: #f33;
	}

	.body {
		padding: 16px;
		overflow-y: auto;
	}

	.body p {
		margin: 0;
		color: #888;
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid #222;
	}

	.primary {
		background: #0a1a0a;
		border-color: #1a3a1a;
		color: #8f8;
	}

	.primary:hover {
		background: #0f2a0f;
		color: #0f0;
	}
</style>
