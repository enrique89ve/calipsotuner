<script lang="ts">
	import { tuner } from '$stores/tuner.svelte';
	import type { StringTuning } from '$stores/instruments';
	
	function selectString(string: StringTuning | null) {
		tuner.setTargetString(string);
	}
	
	function isStringClose(string: StringTuning): boolean {
		const { currentFrequency, clarity } = tuner.state;
		if (clarity < 0.8 || currentFrequency <= 0) return false;
		
		const diff = Math.abs(currentFrequency - string.frequency);
		const tolerance = string.frequency * 0.1; // 10% de tolerancia
		return diff < tolerance;
	}
</script>

<div class="string-selector">
	<h3 class="selector-title">Cuerdas</h3>
	
	<div class="strings">
		<button
			class="string-btn string-btn--auto"
			class:active={tuner.state.targetString === null}
			onclick={() => selectString(null)}
		>
			<span class="string-note">AUTO</span>
			<span class="string-freq">Detectar</span>
		</button>
		
		{#each tuner.state.selectedInstrument.strings as string, index}
			{@const isClose = isStringClose(string)}
			<button
				class="string-btn"
				class:active={tuner.state.targetString?.note === string.note}
				class:highlight={isClose && tuner.state.targetString === null}
				onclick={() => selectString(string)}
			>
				<span class="string-number">{index + 1}</span>
				<span class="string-note">{string.note}</span>
				<span class="string-freq">{string.frequency.toFixed(1)} Hz</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.string-selector {
		width: 100%;
	}
	
	.selector-title {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.75rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.strings {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 0.5rem;
	}
	
	.string-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		background: var(--color-surface);
		border: 2px solid transparent;
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.string-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.string-btn.active {
		border-color: var(--color-accent);
		background: rgba(233, 69, 96, 0.1);
	}
	
	.string-btn.highlight {
		border-color: var(--color-success);
		background: rgba(74, 222, 128, 0.1);
	}
	
	.string-btn--auto {
		grid-column: span 2;
	}
	
	.string-number {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	
	.string-note {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text);
	}
	
	.string-freq {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
</style>
