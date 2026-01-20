<script lang="ts">
	import { instruments, type Instrument } from '$stores/instruments';
	import { tuner } from '$stores/tuner.svelte';
	
	function selectInstrument(instrument: Instrument) {
		tuner.setInstrument(instrument);
	}
	
	function getInstrumentIcon(id: string): string {
		switch (id) {
			case 'cuatro': return '🎸';
			case 'guitarra': return '🎸';
			case 'bajo5': return '🎸';
			default: return '🎵';
		}
	}
</script>

<div class="instrument-selector">
	<h3 class="selector-title">Instrumento</h3>
	
	<div class="instruments">
		{#each instruments as instrument}
			<button
				class="instrument-btn"
				class:active={tuner.state.selectedInstrument.id === instrument.id}
				onclick={() => selectInstrument(instrument)}
			>
				<span class="instrument-icon">{getInstrumentIcon(instrument.id)}</span>
				<span class="instrument-name">{instrument.name}</span>
				<span class="instrument-strings">{instrument.strings.length} cuerdas</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.instrument-selector {
		width: 100%;
	}
	
	.selector-title {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.75rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.instruments {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.instrument-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.875rem 1rem;
		background: var(--color-surface);
		border: 2px solid transparent;
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}
	
	.instrument-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.instrument-btn.active {
		border-color: var(--color-accent);
		background: rgba(233, 69, 96, 0.1);
	}
	
	.instrument-icon {
		font-size: 1.5rem;
	}
	
	.instrument-name {
		flex: 1;
		font-weight: 500;
		color: var(--color-text);
	}
	
	.instrument-strings {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
</style>
