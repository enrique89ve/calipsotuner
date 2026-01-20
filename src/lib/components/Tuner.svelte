<script lang="ts">
	import { onMount } from 'svelte';
	import { tuner } from '$stores/tuner.svelte';
	import { toasts } from '$stores/toast.svelte';
	import { modal } from '$stores/modal.svelte';
	import { audioDevices } from '$stores/audioDevices.svelte';
	import { getPitchDetector, destroyPitchDetector, type PitchResult } from '$audio/pitchDetector';
	import { type StringTuning } from '$stores/instruments';
	import TunerNeedle from './TunerNeedle.svelte';
	import AudioDeviceSelector from './AudioDeviceSelector.svelte';
	import SettingsModal from './SettingsModal.svelte';
	
	let detector = getPitchDetector();
	let isInitialized = false;
	let closestString = $state<StringTuning | null>(null);
	let isStarting = $state(true);
	let dbLevel = $state(-20);
	let volumeInterval: ReturnType<typeof setInterval> | null = null;
	
	const DEFAULT_METER = {
		minDb: -20,
		maxDb: 0,
		hotDb: -6,
		clipDb: -3
	};

	const BASS_METER = {
		minDb: -45,
		maxDb: -6,
		hotDb: -14,
		clipDb: -8
	};

	function getMeterConfig() {
		return tuner.state.selectedInstrument.id === 'bajo5' ? BASS_METER : DEFAULT_METER;
	}

	// Convertir dB a porcentaje visual según instrumento
	function dbToPercent(db: number): number {
		const { minDb, maxDb } = getMeterConfig();
		const clamped = Math.max(minDb, Math.min(maxDb, db));
		return ((clamped - minDb) / (maxDb - minDb)) * 100;
	}

	function isMeterHot(db: number): boolean {
		return db > getMeterConfig().hotDb;
	}

	function isMeterClip(db: number): boolean {
		return db > getMeterConfig().clipDb;
	}
	
	$effect(() => {
		if (tuner.state.targetString) {
			closestString = tuner.state.targetString;
			return;
		}
		if (tuner.state.displayFrequency > 0 && tuner.state.isStable) {
			closestString = tuner.findClosestString(tuner.state.displayFrequency);
		} else {
			closestString = null;
		}
	});
	
	onMount(() => {
		// Iniciar automáticamente al cargar
		startListening();
		
		return () => {
			stopListening();
			destroyPitchDetector();
			if (volumeInterval) clearInterval(volumeInterval);
		};
	});
	
	// Actualizar nivel dB continuamente
	$effect(() => {
		if (tuner.state.isListening && isInitialized) {
			volumeInterval = setInterval(() => {
				dbLevel = detector.getDecibels();
			}, 50);
		} else {
			if (volumeInterval) {
				clearInterval(volumeInterval);
				volumeInterval = null;
			}
			dbLevel = -20;
		}
		
		return () => {
			if (volumeInterval) clearInterval(volumeInterval);
		};
	});
	

	
	async function startListening() {
		isStarting = true;
		try {
			if (!isInitialized) {
			await audioDevices.loadDevices();
			if (!audioDevices.hasPermission) {
				toasts.error(audioDevices.getErrorMessage() ?? 'Permite acceso al microfono');
				isStarting = false;
				return;
			}
			const success = await detector.init(audioDevices.selectedDeviceId);
				if (!success) {
					toasts.error('Permite acceso al microfono');
					isStarting = false;
					return;
				}
				isInitialized = true;
				const instrument = tuner.state.selectedInstrument;
				detector.updateConfig({
					minFrequency: instrument.minFrequency,
					maxFrequency: instrument.maxFrequency
				});
			}
			const started = await detector.start(handlePitchResult);
			if (!started) {
				toasts.error('Error al iniciar audio');
				isStarting = false;
				return;
			}
			tuner.setListening(true);
		} catch (e) {
			toasts.error('Error al iniciar microfono');
		}
		isStarting = false;
	}
	
	function stopListening() {
		detector.stop();
		tuner.setListening(false);
	}
	
	function toggleListening() {
		tuner.state.isListening ? stopListening() : startListening();
	}
	
	function handlePitchResult(result: PitchResult) {
		tuner.updatePitch(result.frequency, result.clarity, result.decibels);
		tuner.updateVolume(detector.getVolume());
	}
	
	function openSettings() {
		modal.open({
			title: 'Configuracion',
			component: SettingsModal,
			props: { onClose: () => modal.close() },
			size: 'md',
			closable: true
		});
	}
	
	
	function formatFrequency(freq: number): string {
		return freq <= 0 ? '---' : freq.toFixed(1);
	}
	
	function formatCents(cents: number): string {
		if (cents === 0) return '0';
		return cents > 0 ? `+${cents}` : `${cents}`;
	}
	
	function getInstrumentIcon(id: string): string {
		switch (id) {
			case 'cuatro': return '🪕';
			case 'guitarra': return '🎸';
			case 'bajo5': return '🎸';
			default: return '🎵';
		}
	}
</script>

<div class="tuner">
	<!-- Logo -->
	<div class="logo">
		<span class="logo-text">CALIPSO</span>
		<span class="logo-sub">TUNER</span>
	</div>

	<!-- Header -->
	<header class="tuner-header">
		<AudioDeviceSelector />
		<div class="header-actions">
			<button class="icon-btn" onclick={openSettings} title="Ajustes">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm9.5-3h-1.8a7.5 7.5 0 0 0-.6-1.5l1.3-1.3a.5.5 0 0 0 0-.7l-1.4-1.4a.5.5 0 0 0-.7 0l-1.3 1.3a7.5 7.5 0 0 0-1.5-.6V5a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5v1.8a7.5 7.5 0 0 0-1.5.6L9.2 6.1a.5.5 0 0 0-.7 0L7.1 7.5a.5.5 0 0 0 0 .7l1.3 1.3a7.5 7.5 0 0 0-.6 1.5H6a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h1.8a7.5 7.5 0 0 0 .6 1.5l-1.3 1.3a.5.5 0 0 0 0 .7l1.4 1.4a.5.5 0 0 0 .7 0l1.3-1.3a7.5 7.5 0 0 0 1.5.6V21a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1.8a7.5 7.5 0 0 0 1.5-.6l1.3 1.3a.5.5 0 0 0 .7 0l1.4-1.4a.5.5 0 0 0 0-.7l-1.3-1.3a7.5 7.5 0 0 0 .6-1.5h1.8a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5Z"/>
				</svg>
			</button>
		</div>
	</header>

	<!-- Barra de nivel dB -->
	<div class="db-meter">
		<div
			class="db-level"
			class:hot={isMeterHot(dbLevel)}
			class:clip={isMeterClip(dbLevel)}
			style="width: {dbToPercent(dbLevel)}%"
		></div>
	</div>

	<!-- Medidor principal -->
	<div class="meter-section">
		<TunerNeedle
			cents={tuner.state.displayCents}
			isInTune={tuner.isInTune()}
			isActive={tuner.state.isStable}
			note={tuner.state.displayNote}
			octave={tuner.state.displayOctave}
		/>
	</div>

	<!-- Info vertical -->
	<div class="info-column">
		<!-- Indicador de accion -->
		<div class="action-indicator" class:active={tuner.state.isStable}>
			{#if !tuner.state.isListening}
				<span class="action-icon off">○</span>
				<span class="action-text">OFF</span>
			{:else if !tuner.state.isStable}
				<span class="action-icon waiting">◎</span>
				<span class="action-text">ESCUCHANDO</span>
			{:else if tuner.isInTune()}
				<span class="action-icon tuned">✓</span>
				<span class="action-text">AFINADO</span>
			{:else if tuner.state.displayCents > 0}
				<span class="action-icon flat">↓</span>
				<span class="action-text">AFLOJAR</span>
			{:else}
				<span class="action-icon sharp">↑</span>
				<span class="action-text">APRETAR</span>
			{/if}
		</div>
		
		<!-- Datos Hz y Cents -->
		<div class="data-group">
			<div class="data-item">
				<span class="data-value">{formatFrequency(tuner.state.displayFrequency)}</span>
				<span class="data-label">Hz</span>
			</div>
			<div class="data-divider"></div>
			<div class="data-item">
				<span class="data-value" class:tuned={tuner.isInTune()}>{formatCents(tuner.state.displayCents)}</span>
				<span class="data-label">cents</span>
			</div>
		</div>
		
		<!-- Boton ON/OFF -->
		<button 
			class="power-btn"
			class:on={tuner.state.isListening}
			onclick={toggleListening}
			disabled={isStarting}
		>
			<span class="power-led" class:active={tuner.state.isListening} class:blink={isStarting}></span>
			<span class="power-text">{isStarting ? '...' : tuner.state.isListening ? 'ON' : 'OFF'}</span>
		</button>
	</div>

	<!-- Footer con selector de instrumento -->
	<footer class="tuner-footer">
		<button class="instrument-btn" onclick={openSettings}>
			<span class="instrument-icon">{getInstrumentIcon(tuner.state.selectedInstrument.id)}</span>
			<span class="instrument-name">{tuner.state.selectedInstrument.name}</span>
			<span class="instrument-arrow">▼</span>
		</button>
		<span class="mode-tag">{tuner.state.targetString ? 'MANUAL' : 'AUTO'}</span>
	</footer>

	<!-- Credits -->
	<div class="credits">
		Creado por <a href="https://instagram.com/enriquevee" target="_blank" rel="noopener">EnriqueVee</a>
	</div>
</div>

<style>
	.tuner {
		width: 100%;
		max-width: 360px;
		background: #141414;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-shadow: 
			0 0 0 1px #2a2a2a,
			0 20px 40px rgba(0,0,0,0.5);
	}

	/* Logo */
	.logo {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 10px;
		padding-bottom: 4px;
	}

	.logo-text {
		font-family: 'Righteous', cursive;
		font-size: 1.6rem;
		font-weight: 400;
		letter-spacing: 2px;
		color: #e0e0e0;
		text-shadow: 
			0 0 10px rgba(90, 255, 90, 0.3),
			0 2px 0 #000;
	}

	.logo-sub {
		font-family: 'Righteous', cursive;
		font-size: 0.7rem;
		font-weight: 400;
		letter-spacing: 2px;
		color: #5a5;
	}

	/* Header */
	.tuner-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.header-actions {
		display: flex;
		gap: 6px;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
		border: none;
		border-radius: 6px;
		color: #666;
		cursor: pointer;
		box-shadow: 
			0 1px 0 0 #2a2a2a inset,
			0 -1px 0 0 #080808 inset,
			0 2px 4px rgba(0,0,0,0.3);
	}

	.icon-btn:hover {
		background: linear-gradient(180deg, #1e1e1e 0%, #121212 100%);
		color: #888;
	}

	.icon-btn:active {
		background: linear-gradient(180deg, #0f0f0f 0%, #141414 100%);
		box-shadow: 
			0 1px 0 0 #0a0a0a inset,
			0 -1px 0 0 #1a1a1a inset;
	}

	.icon-btn svg {
		width: 18px;
		height: 18px;
	}

	/* dB Meter - barra simple */
	.db-meter {
		width: 100%;
		height: 4px;
		background: #111;
		border-radius: 2px;
		overflow: hidden;
	}

	.db-level {
		height: 100%;
		background: linear-gradient(90deg, #0a0 0%, #0f0 60%, #ff0 80%, #f00 100%);
		border-radius: 2px;
		transition: width 0.06s ease-out;
	}

	.db-level.hot {
		box-shadow: 0 0 4px rgba(255,200,0,0.4);
	}

	.db-level.clip {
		box-shadow: 0 0 6px rgba(255,0,0,0.6);
	}

	/* Meter */
	.meter-section {
		background: #0a0a0a;
		border-radius: 8px;
		padding: 8px;
		border: 1px solid #222;
	}

	/* Info column - vertical layout */
	.info-column {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
		width: 180px;
		margin: 0 auto;
	}

	/* Data group - Hz y Cents */
	.data-group {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		background: #0a0a0a;
		border-radius: 6px;
		border: 1px solid #1a1a1a;
	}

	.data-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 50%;
		padding: 0 8px;
	}

	.data-value {
		font-family: 'Courier New', monospace;
		font-size: 0.88rem;
		font-weight: bold;
		color: #5a5;
		line-height: 1;
	}

	.data-value.tuned {
		color: #0f0;
		text-shadow: 0 0 10px rgba(0,255,0,0.5);
	}

	.data-label {
		font-size: 0.5rem;
		color: #444;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-top: 2px;
	}

	.data-divider {
		width: 1px;
		height: 100%;
		background: #1a1a1a;
		flex-shrink: 0;
	}

	/* Action indicator - arriba */
	.action-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		height: 60px;
		background: #111;
		border-radius: 6px;
		border: 1px solid #222;
	}

	.action-indicator.active {
		border-color: #2a2a2a;
	}

	.action-icon {
		font-size: 1.6rem;
		line-height: 1;
	}

	.action-icon.off {
		color: #333;
	}

	.action-icon.waiting {
		color: #444;
		animation: pulse 1s ease-in-out infinite;
	}

	.action-icon.tuned {
		color: #0f0;
		text-shadow: 0 0 12px rgba(0,255,0,0.6);
	}

	.action-icon.flat {
		color: #f80;
		text-shadow: 0 0 10px rgba(255,136,0,0.5);
	}

	.action-icon.sharp {
		color: #08f;
		text-shadow: 0 0 10px rgba(0,136,255,0.5);
	}

	.action-text {
		font-size: 0.65rem;
		font-weight: 600;
		color: #555;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.action-indicator.active .action-text {
		color: #777;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}

	/* Power button */
	.power-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		height: 40px;
		background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		box-shadow: 
			0 1px 0 0 #2a2a2a inset,
			0 -1px 0 0 #080808 inset,
			0 2px 4px rgba(0,0,0,0.4);
	}

	.power-btn:hover {
		background: linear-gradient(180deg, #1e1e1e 0%, #121212 100%);
		box-shadow: 
			0 1px 0 0 #333 inset,
			0 -1px 0 0 #0a0a0a inset,
			0 2px 4px rgba(0,0,0,0.5);
	}

	.power-btn:active {
		background: linear-gradient(180deg, #0f0f0f 0%, #141414 100%);
		box-shadow: 
			0 1px 0 0 #0a0a0a inset,
			0 -1px 0 0 #1a1a1a inset,
			0 1px 2px rgba(0,0,0,0.3);
	}

	.power-btn.on {
		background: linear-gradient(180deg, #0f1a0f 0%, #081208 100%);
		box-shadow: 
			0 1px 0 0 #1a2a1a inset,
			0 -1px 0 0 #050805 inset,
			0 2px 4px rgba(0,0,0,0.4);
	}

	.power-btn.on:hover {
		background: linear-gradient(180deg, #122012 0%, #0a150a 100%);
	}

	.power-btn:disabled {
		opacity: 0.7;
		cursor: wait;
	}

	.power-led {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #300;
		box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
		flex-shrink: 0;
	}

	.power-led.active {
		background: radial-gradient(circle at 30% 30%, #0f0, #080);
		box-shadow: 0 0 10px rgba(0,255,0,0.6);
	}

	.power-led.blink {
		animation: blink 0.5s ease-in-out infinite;
	}

	.power-text {
		font-size: 0.7rem;
		font-weight: 600;
		color: #555;
		letter-spacing: 1px;
	}

	.power-btn.on .power-text {
		color: #6a6;
	}

	@keyframes blink {
		0%, 100% { background: #330; }
		50% { background: #aa0; box-shadow: 0 0 6px rgba(255,200,0,0.5); }
	}

	/* Footer */
	.tuner-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.instrument-btn {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		font-size: 0.75rem;
		background: linear-gradient(180deg, #1e1e1e 0%, #161616 100%);
		border: 1px solid #333;
		color: #aaa;
		border-radius: 6px;
		text-align: left;
	}

	.instrument-btn:hover {
		background: linear-gradient(180deg, #252525 0%, #1a1a1a 100%);
		border-color: #444;
		color: #ddd;
	}

	.instrument-icon {
		font-size: 1rem;
		color: #0a0;
	}

	.instrument-name {
		flex: 1;
		font-weight: 500;
	}

	.instrument-arrow {
		font-size: 0.6rem;
		color: #555;
		transition: transform 0.2s;
	}

	.instrument-btn:hover .instrument-arrow {
		color: #888;
	}

	.mode-tag {
		font-size: 0.6rem;
		color: #555;
		padding: 6px 10px;
		background: #111;
		border: 1px solid #222;
		border-radius: 4px;
		letter-spacing: 0.5px;
	}

	/* Credits */
	.credits {
		text-align: center;
		font-size: 0.6rem;
		color: #444;
		padding-top: 4px;
	}

	.credits a {
		color: #5a5;
		text-decoration: none;
		transition: color 0.15s;
	}

	.credits a:hover {
		color: #7c7;
	}

	/* Responsive - tablets y desktop */
	@media (min-width: 480px) {
		.tuner {
			max-width: 400px;
			padding: 20px;
			gap: 16px;
		}
	}
</style>
