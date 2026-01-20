<script lang="ts">
	import { tuner } from '$stores/tuner.svelte';
	import { toasts } from '$stores/toast.svelte';
	import { instruments, type Instrument, type StringTuning } from '$stores/instruments';
	import { getPitchDetector } from '$audio/pitchDetector';
	
	interface Props {
		onClose: () => void;
	}
	
	let { onClose }: Props = $props();
	
	const detector = getPitchDetector();
	
	// Guardar estado inicial para detectar cambios
	const initialInstrument = tuner.state.selectedInstrument.id;
	const initialMode = tuner.state.targetString ? 'manual' : 'auto';
	
	let tuningMode = $state<'auto' | 'manual'>(tuner.state.targetString ? 'manual' : 'auto');
	let noiseThreshold = $state(detector.getNoiseGateThreshold());
	let showAdvanced = $state(false);
	
	function selectInstrument(instrument: Instrument) {
		tuner.setInstrument(instrument);
		if (tuningMode === 'auto') {
			tuner.setTargetString(null);
		}
	}
	
	function selectString(string: StringTuning | null) {
		tuner.setTargetString(string);
	}
	
	function setMode(mode: 'auto' | 'manual') {
		tuningMode = mode;
		if (mode === 'auto') {
			tuner.setTargetString(null);
		} else if (tuner.state.selectedInstrument.strings.length > 0) {
			tuner.setTargetString(tuner.state.selectedInstrument.strings[0]);
		}
	}
	
	function updateNoiseThreshold(value: number) {
		noiseThreshold = value;
		detector.setNoiseGateThreshold(value);
	}

	function toggleStrictMode(enabled: boolean) {
		tuner.setStrictModeEnabled(enabled);
	}

	
	function getInstrumentIcon(id: string): string {
		switch (id) {
			case 'cuatro': return '🪕';
			case 'guitarra': return '🎸';
			case 'bajo5': return '🎸';
			default: return '🎵';
		}
	}
	
	function getSensitivityLabel(value: number): string {
		if (value <= -60) return 'Muy alta';
		if (value <= -50) return 'Alta';
		if (value <= -40) return 'Media';
		if (value <= -30) return 'Baja';
		return 'Muy baja';
	}
	
	function handleClose() {
		// Detectar si hubo cambios
		const currentInstrument = tuner.state.selectedInstrument.id;
		const currentMode = tuner.state.targetString ? 'manual' : 'auto';
		
		if (currentInstrument !== initialInstrument) {
			toasts.success(`${tuner.state.selectedInstrument.name} seleccionado`);
		} else if (currentMode !== initialMode) {
			toasts.success(`Modo ${currentMode === 'auto' ? 'automatico' : 'manual'} activado`);
		}
		
		onClose();
	}
</script>

<div class="settings">
	<!-- Modo de afinacion -->
	<section class="section">
		<h3 class="section-title">Modo de Afinacion</h3>
		<div class="mode-buttons">
			<button
				class="mode-btn"
				class:active={tuningMode === 'auto'}
				onclick={() => setMode('auto')}
			>
				<span class="mode-icon">🎯</span>
				<span class="mode-info">
					<span class="mode-name">Automatico</span>
					<span class="mode-desc">Detecta cualquier nota</span>
				</span>
			</button>
			<button
				class="mode-btn"
				class:active={tuningMode === 'manual'}
				onclick={() => setMode('manual')}
			>
				<span class="mode-icon">🎚️</span>
				<span class="mode-info">
					<span class="mode-name">Por Cuerda</span>
					<span class="mode-desc">Selecciona cuerda</span>
				</span>
			</button>
		</div>
	</section>
	
	<!-- Selector de instrumento -->
	<section class="section">
		<h3 class="section-title">Instrumento</h3>
		<div class="instruments">
			{#each instruments as instrument}
				<button
					class="instrument-btn"
					class:active={tuner.state.selectedInstrument.id === instrument.id}
					onclick={() => selectInstrument(instrument)}
				>
					<span class="instrument-icon">{getInstrumentIcon(instrument.id)}</span>
					<span class="instrument-info">
						<span class="instrument-name">{instrument.name}</span>
						<span class="instrument-strings">{instrument.strings.length} cuerdas</span>
					</span>
				</button>
			{/each}
		</div>
	</section>
	
	<!-- Selector de cuerdas (solo en modo manual) -->
	{#if tuningMode === 'manual'}
		<section class="section">
			<h3 class="section-title">Cuerda a Afinar</h3>
			<div class="strings-grid">
				{#each tuner.state.selectedInstrument.strings as string, index}
					<button
						class="string-btn"
						class:active={tuner.state.targetString?.note === string.note}
						onclick={() => selectString(string)}
					>
						<span class="string-number">{index + 1}ª</span>
						<span class="string-note">{string.note}</span>
						<span class="string-freq">{string.frequency.toFixed(0)} Hz</span>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#if tuner.state.selectedInstrument.id === 'cuatro'}
		<section class="section">
			<h3 class="section-title">Modo Cuatro Avanzado</h3>
			<div class="toggle-row">
				<label class="toggle-label">
					<input
						type="checkbox"
						checked={tuner.state.strictModeEnabled}
						onchange={(e) => toggleStrictMode(e.currentTarget.checked)}
					/>
					<span>Modo estricto por cuerda</span>
				</label>
				<p class="toggle-desc">
					En auto prioriza la cuerda correcta y en manual fija la referencia.
				</p>
			</div>

		</section>
	{/if}
	
	<!-- Sensibilidad -->
	<section class="section">
		<button class="section-header" onclick={() => showAdvanced = !showAdvanced}>
			<h3 class="section-title">Sensibilidad</h3>
			<span class="toggle-icon">{showAdvanced ? '▼' : '▶'}</span>
		</button>
		
		{#if showAdvanced}
			<div class="sensitivity-controls">
				<div class="slider-group">
					<div class="slider-header">
						<span class="slider-label">Umbral de ruido</span>
						<span class="slider-value">{noiseThreshold} dB</span>
					</div>
					<input
						type="range"
						min="-70"
						max="-20"
						step="1"
						value={noiseThreshold}
						oninput={(e) => updateNoiseThreshold(parseInt(e.currentTarget.value))}
						class="slider"
					/>
					<div class="slider-hints">
						<span>+ sensible</span>
						<span>- sensible</span>
					</div>
				</div>
				
				<div class="presets">
					<div class="preset-buttons">
						<button 
							class="preset-btn" 
							class:active={noiseThreshold === -55}
							onclick={() => updateNoiseThreshold(-55)}
						>Silencioso</button>
						<button 
							class="preset-btn"
							class:active={noiseThreshold === -45}
							onclick={() => updateNoiseThreshold(-45)}
						>Normal</button>
						<button 
							class="preset-btn"
							class:active={noiseThreshold === -35}
							onclick={() => updateNoiseThreshold(-35)}
						>Ruidoso</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="sensitivity-preview">
				<span class="preview-label">Sensibilidad: {getSensitivityLabel(noiseThreshold)}</span>
				<span class="preview-hint">Toca para ajustar</span>
			</div>
		{/if}
	</section>
	
	<!-- Boton cerrar -->
	<button class="close-btn" onclick={handleClose}>Listo</button>
</div>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	
	.section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		width: 100%;
	}
	
	.section-title {
		font-size: 0.7rem;
		font-weight: 600;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}
	
	.toggle-icon {
		font-size: 0.6rem;
		color: #555;
	}
	
	/* Mode buttons */
	.mode-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
	}
	
	.mode-btn {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.75rem;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
	}
	
	.mode-btn:hover {
		background: #222;
		border-color: #444;
	}
	
	.mode-btn.active {
		border-color: #0a0;
		background: #0a1a0a;
	}
	
	.mode-icon {
		font-size: 1.25rem;
	}
	
	.mode-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	
	.mode-name {
		font-weight: 500;
		color: #ccc;
		font-size: 0.8rem;
	}
	
	.mode-desc {
		font-size: 0.65rem;
		color: #666;
	}
	
	/* Instruments */
	.instruments {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	
	.instrument-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 0.9rem;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
	}
	
	.instrument-btn:hover {
		background: #222;
		border-color: #444;
	}
	
	.instrument-btn.active {
		border-color: #0a0;
		background: #0a1a0a;
	}
	
	.instrument-icon {
		font-size: 1.1rem;
	}
	
	.instrument-info {
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	
	.instrument-name {
		font-weight: 500;
		color: #ccc;
		font-size: 0.85rem;
	}
	
	.instrument-strings {
		font-size: 0.7rem;
		color: #666;
	}
	
	/* Strings grid */
	.strings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
		gap: 0.4rem;
	}
	
	.string-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 0.6rem 0.4rem;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 8px;
		cursor: pointer;
	}
	
	.string-btn:hover {
		background: #222;
		border-color: #444;
	}
	
	.string-btn.active {
		border-color: #0a0;
		background: #0a1a0a;
	}
	
	.string-number {
		font-size: 0.6rem;
		color: #555;
	}
	
	.string-note {
		font-size: 1rem;
		font-weight: 600;
		color: #ccc;
	}
	
	.string-btn.active .string-note {
		color: #0f0;
	}
	
	.string-freq {
		font-size: 0.6rem;
		color: #555;
	}

	/* Cuatro advanced */
	.toggle-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.6rem 0.75rem;
		background: #111;
		border-radius: 8px;
		border: 1px solid #222;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: #ccc;
	}

	.toggle-label input {
		accent-color: #0f0;
	}

	.toggle-desc {
		margin: 0;
		font-size: 0.65rem;
		color: #666;
		line-height: 1.4;
	}

	
	/* Sensitivity controls */
	.sensitivity-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem;
		background: #111;
		border-radius: 8px;
	}
	
	.slider-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	
	.slider-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.slider-label {
		font-size: 0.75rem;
		color: #888;
	}
	
	.slider-value {
		font-size: 0.7rem;
		color: #0f0;
		font-weight: 600;
		font-family: monospace;
	}
	
	.slider {
		width: 100%;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: #333;
		border-radius: 2px;
		outline: none;
	}
	
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #0f0;
		cursor: pointer;
	}
	
	.slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #0f0;
		cursor: pointer;
		border: none;
	}
	
	.slider-hints {
		display: flex;
		justify-content: space-between;
		font-size: 0.6rem;
		color: #555;
	}
	
	.presets {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	
	.preset-buttons {
		display: flex;
		gap: 0.4rem;
	}
	
	.preset-btn {
		flex: 1;
		padding: 0.5rem;
		font-size: 0.7rem;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 4px;
		color: #888;
		cursor: pointer;
	}
	
	.preset-btn:hover {
		background: #222;
		color: #aaa;
	}
	
	.preset-btn.active {
		background: #0a1a0a;
		border-color: #0a0;
		color: #0f0;
	}
	
	.sensitivity-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.6rem 0.8rem;
		background: #111;
		border-radius: 6px;
		cursor: pointer;
	}
	
	.preview-label {
		font-size: 0.75rem;
		color: #888;
	}
	
	.preview-hint {
		font-size: 0.65rem;
		color: #555;
	}
	
	/* Close button */
	.close-btn {
		width: 100%;
		padding: 0.8rem;
		background: #0a1a0a;
		border: 1px solid #0a0;
		border-radius: 8px;
		color: #0f0;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		margin-top: 0.25rem;
	}
	
	.close-btn:hover {
		background: #0f2a0f;
	}
</style>
