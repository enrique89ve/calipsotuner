/**
 * Store principal del afinador
 * Con sistema de estabilización y filtrado de ruido por rango de instrumento
 */

import { instruments, type Instrument, type StringTuning, isFrequencyInRange, frequencyToNote } from './instruments';
import { getPitchDetector } from '$audio/pitchDetector';
import { getAudioEngine } from '$audio/audioEngine';

interface CalibrationOffsets {
	[instrumentId: string]: Record<string, number>;
}

interface PersistedTunerSettings {
	strictModeEnabled: boolean;
	calibrationOffsets: CalibrationOffsets;
}

export interface TunerState {
	isListening: boolean;
	currentFrequency: number;
	currentNote: string;
	currentOctave: number;
	cents: number;
	clarity: number;
	selectedInstrument: Instrument;
	targetString: StringTuning | null;
	volume: number;
	// Estados de visualización (suavizados)
	displayNote: string;
	displayOctave: number;
	displayCents: number;
	displayFrequency: number;
	isStable: boolean;
	// Estados de señal
	isInRange: boolean;
	hasValidSignal: boolean;  // True si hay señal válida en el rango del instrumento
	rawFrequency: number;
	// Ajustes
	strictModeEnabled: boolean;
	calibrationOffsets: CalibrationOffsets;
}

const SETTINGS_STORAGE_KEY = 'tuner.settings.v1';
const STRICT_MODE_INSTRUMENT_ID = 'cuatro';
const HARMONIC_TOLERANCE = 0.06;
const MAX_HARMONIC = 4;
const TARGET_CENTS_WINDOW = 50;

function buildDefaultCalibrationOffsets(): CalibrationOffsets {
	const offsets: CalibrationOffsets = {};
	instruments.forEach((instrument) => {
		offsets[instrument.id] = {};
		instrument.strings.forEach((string) => {
			offsets[instrument.id][string.note] = 0;
		});
	});
	return offsets;
}

function mergeCalibrationOffsets(
	base: CalibrationOffsets,
	incoming?: CalibrationOffsets
): CalibrationOffsets {
	if (!incoming) return base;
	const merged: CalibrationOffsets = {};
	Object.keys(base).forEach((instrumentId) => {
		merged[instrumentId] = { ...base[instrumentId], ...(incoming[instrumentId] ?? {}) };
	});
	return merged;
}

function loadPersistedSettings(): PersistedTunerSettings {
	const defaults: PersistedTunerSettings = {
		strictModeEnabled: true,
		calibrationOffsets: buildDefaultCalibrationOffsets()
	};

	if (typeof localStorage === 'undefined') {
		return defaults;
	}

	try {
		const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (!raw) return defaults;
		const parsed = JSON.parse(raw) as Partial<PersistedTunerSettings>;
		return {
			strictModeEnabled: typeof parsed.strictModeEnabled === 'boolean'
				? parsed.strictModeEnabled
				: defaults.strictModeEnabled,
			calibrationOffsets: mergeCalibrationOffsets(
				defaults.calibrationOffsets,
				parsed.calibrationOffsets
			)
		};
	} catch {
		return defaults;
	}
}

function persistSettings(settings: PersistedTunerSettings): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// Silenciar errores de almacenamiento
	}
}


// Configuración de estabilización y filtrado
const STABILITY_CONFIG = {
		historySize: 10,             // Aumentado para más estabilidad
		minConsistentSamples: 5,     // Aumentado - necesita más muestras consistentes
		clarityThreshold: 0.80,      // Aumentado - requiere señal más clara
		centsSmoothing: 0.12,        // Reducido - más suave
		frequencySmoothing: 0.08,    // Reducido - más suave
		noteChangeDelay: 200,        // Aumentado - más tiempo entre cambios
		minValidSamples: 3,          // Mínimo de muestras válidas antes de mostrar
		attackWindowMs: 120,         // Ventana de ataque para ponderar el pico
		peakHoldMs: 200,             // Tiempo máximo para mantener el pico de dB
		attackBoost: 1.4             // Peso extra para muestras del ataque
	};


interface PitchSample {
	note: string;
	octave: number;
	cents: number;
	frequency: number;
	clarity: number;
	decibels: number;
	timestamp: number;
}


function createTunerStore() {
	const persistedSettings = loadPersistedSettings();

	let state = $state<TunerState>({
		isListening: false,
		currentFrequency: 0,
		currentNote: '-',
		currentOctave: 0,
		cents: 0,
		clarity: 0,
		selectedInstrument: instruments[0],
		targetString: null,
		volume: 0,
		displayNote: '-',
		displayOctave: 0,
		displayCents: 0,
		displayFrequency: 0,
		isStable: false,
		isInRange: false,
		hasValidSignal: false,
		rawFrequency: 0,
		strictModeEnabled: persistedSettings.strictModeEnabled,
		calibrationOffsets: persistedSettings.calibrationOffsets
	});

	applyInstrumentAudioConfig(state.selectedInstrument);

	// Historial de muestras para estabilización
	let sampleHistory: PitchSample[] = [];
	let lastNoteChangeTime = 0;
	let smoothedCents = 0;
	let smoothedFrequency = 0;
	let validSampleCount = 0;
	let peakDecibels = -Infinity;
	let peakTimestamp = 0;

	function persistCurrentSettings() {
		persistSettings({
			strictModeEnabled: state.strictModeEnabled,
			calibrationOffsets: state.calibrationOffsets
		});
	}

function isStrictModeEnabledForInstrument(): boolean {
	return (
		state.strictModeEnabled &&
		state.selectedInstrument.id === STRICT_MODE_INSTRUMENT_ID
	);
}

function normalizeToTargetFrequency(
	frequency: number,
	targetFrequency: number
): number {
		if (frequency <= 0 || targetFrequency <= 0) return frequency;
		const ratio = frequency / targetFrequency;
		const nearest = Math.round(ratio);
		if (nearest >= 2 && nearest <= MAX_HARMONIC) {
			if (Math.abs(ratio - nearest) <= HARMONIC_TOLERANCE) {
				return frequency / nearest;
			}
		}
		return frequency;
}

function getCalibrationOffsetForString(string: StringTuning | null): number {
	if (!string) return 0;
	return state.calibrationOffsets[state.selectedInstrument.id]?.[string.note] ?? 0;
}

function getCalibratedFrequency(string: StringTuning): number {
	const offset = getCalibrationOffsetForString(string);
	return string.frequency * Math.pow(2, offset / 1200);
}

function resolveReferenceString(
	frequency: number
): { string: StringTuning; normalizedFrequency: number; cents: number } | null {
	if (frequency <= 0) return null;
	let bestMatch: { string: StringTuning; normalizedFrequency: number; cents: number } | null = null;

	for (const string of state.selectedInstrument.strings) {
		const calibratedFrequency = getCalibratedFrequency(string);
		const ratio = frequency / calibratedFrequency;
		const nearest = Math.round(ratio);
		const harmonic =
			nearest >= 2 &&
			nearest <= MAX_HARMONIC &&
			Math.abs(ratio - nearest) <= HARMONIC_TOLERANCE
				? nearest
				: 1;
		const normalizedFrequency = frequency / harmonic;
		if (!isFrequencyInRange(normalizedFrequency, state.selectedInstrument)) continue;
		const cents = 1200 * Math.log2(normalizedFrequency / calibratedFrequency);
		if (Math.abs(cents) > TARGET_CENTS_WINDOW) continue;
		if (!bestMatch || Math.abs(cents) < Math.abs(bestMatch.cents)) {
			bestMatch = { string, normalizedFrequency, cents };
		}
	}

	return bestMatch;
}

	function parseStringNote(string: StringTuning): { note: string; octave: number } {
		const match = string.note.match(/^([A-G]#?)(\d+)$/);
		if (match) {
			return { note: match[1], octave: parseInt(match[2], 10) };
		}
		return { note: string.note, octave: string.octave };
	}

	function setInstrument(instrument: Instrument) {
		state.selectedInstrument = instrument;
		state.targetString = null;
		state.isStable = false;
		sampleHistory = [];
		validSampleCount = 0;

		applyInstrumentAudioConfig(instrument);
	}

	function applyInstrumentAudioConfig(instrument: Instrument): void {
		const audioConfig = instrument.audioConfig;
		if (!audioConfig) return;

		const audioEngine = getAudioEngine();
		const pitchDetector = getPitchDetector();

		audioEngine.updateAudioConfig({
			fftSize: audioConfig.fftSize,
			highpassFrequency: audioConfig.highpassFrequency,
			lowpassFrequency: audioConfig.lowpassFrequency
		});

		pitchDetector.updateBufferSize(audioConfig.bufferSize);
		pitchDetector.updateConfig({
			clarityThreshold: audioConfig.clarityThreshold,
			minFrequency: instrument.minFrequency,
			maxFrequency: instrument.maxFrequency
		});
	}

	function setTargetString(string: StringTuning | null) {
		state.targetString = string;
		state.isStable = false;
		sampleHistory = [];
		validSampleCount = 0;
		lastNoteChangeTime = 0;
	}

	function setStrictModeEnabled(enabled: boolean) {
		state.strictModeEnabled = enabled;
		persistCurrentSettings();
	}

	function setCalibrationOffset(
		instrumentId: string,
		stringNote: string,
		offsetCents: number
	) {
		const instrumentOffsets = state.calibrationOffsets[instrumentId] ?? {};
		state.calibrationOffsets = {
			...state.calibrationOffsets,
			[instrumentId]: {
				...instrumentOffsets,
				[stringNote]: offsetCents
			}
		};
		persistCurrentSettings();
	}

	function resetCalibrationOffsets(instrumentId: string) {
		const defaults = buildDefaultCalibrationOffsets();
		state.calibrationOffsets = {
			...state.calibrationOffsets,
			[instrumentId]: defaults[instrumentId] ?? {}
		};
		persistCurrentSettings();
	}

	function updatePitch(frequency: number, clarity: number, decibels: number) {
		const now = Date.now();
		state.rawFrequency = frequency;
		state.clarity = clarity;

		updateAttackWindow(decibels, now);

		const strictModeEnabled = isStrictModeEnabledForInstrument();
		const manualTarget = strictModeEnabled ? state.targetString : null;
		const autoMatch = !manualTarget && strictModeEnabled
			? resolveReferenceString(frequency)
			: null;
		const effectiveTarget = manualTarget ?? autoMatch?.string ?? null;
		const calibratedTargetFrequency = effectiveTarget
			? getCalibratedFrequency(effectiveTarget)
			: null;
		const normalizedFrequency = manualTarget
			? normalizeToTargetFrequency(
				frequency,
				calibratedTargetFrequency ?? manualTarget.frequency
			)
			: autoMatch?.normalizedFrequency ?? frequency;

		const frequencyForRange = normalizedFrequency;

		// FILTRO 1: Verificar que la frecuencia está en el rango del instrumento
		const inRange =
			frequencyForRange > 0 &&
			isFrequencyInRange(frequencyForRange, state.selectedInstrument);
		state.isInRange = inRange;

		// FILTRO 2: Verificar claridad mínima
		const hasGoodClarity = clarity >= STABILITY_CONFIG.clarityThreshold;

		const hasStrictReference = !strictModeEnabled || !!effectiveTarget;

		if (!hasStrictReference) {
			clearInvalidSignal(now);
			return;
		}

		// Solo procesar si pasa ambos filtros
		if (inRange && hasGoodClarity) {
			state.hasValidSignal = true;  // Señal válida en rango
			state.currentFrequency = frequencyForRange;

			let detectedNote = '';
			let detectedOctave = 0;
			let detectedCents = 0;

			if (effectiveTarget) {
				const targetNote = parseStringNote(effectiveTarget);
				const rawCents = autoMatch
					? autoMatch.cents
					: 1200 * Math.log2(
						frequencyForRange / (calibratedTargetFrequency ?? effectiveTarget.frequency)
					);

				if (manualTarget && Math.abs(rawCents) > TARGET_CENTS_WINDOW) {
					clearInvalidSignal(now);
					return;
				}

				const clampedCents = Math.max(
					-TARGET_CENTS_WINDOW,
					Math.min(TARGET_CENTS_WINDOW, rawCents)
				);

				detectedNote = targetNote.note;
				detectedOctave = targetNote.octave;
				detectedCents = clampedCents;
			} else {
				const detected = frequencyToNote(frequencyForRange);
				detectedNote = detected.note;
				detectedOctave = detected.octave;
				detectedCents = detected.cents;
			}

			state.currentNote = detectedNote;
			state.currentOctave = detectedOctave;
			state.cents = detectedCents;

			const attackWeight = getAttackWeight(now);

			// Agregar muestra al historial
			const sample: PitchSample = {
				note: detectedNote,
				octave: detectedOctave,
				cents: detectedCents,
				frequency: frequencyForRange * attackWeight,
				clarity,
				decibels,
				timestamp: now
			};

			sampleHistory.push(sample);
			validSampleCount++;
			
			// Mantener solo las últimas N muestras
			if (sampleHistory.length > STABILITY_CONFIG.historySize) {
				sampleHistory.shift();
			}

			// Solo actualizar display si tenemos suficientes muestras válidas
			if (validSampleCount >= STABILITY_CONFIG.minValidSamples) {
				updateDisplayValues(now);
			}
		} else {
			clearInvalidSignal(now);
		}
	}

	function updateAttackWindow(decibels: number, now: number) {
		const isAttackWindow = now - peakTimestamp <= STABILITY_CONFIG.attackWindowMs;
		if (!isAttackWindow || decibels > peakDecibels) {
			peakDecibels = decibels;
			peakTimestamp = now;
		}
	}

	function getAttackWeight(now: number): number {
		return now - peakTimestamp <= STABILITY_CONFIG.peakHoldMs
			? STABILITY_CONFIG.attackBoost
			: 1;
	}

	function clearInvalidSignal(now: number) {
		// Frecuencia fuera de rango o claridad baja = NO HAY SEÑAL VÁLIDA
		state.hasValidSignal = false;
		
		// Decrementar contador de muestras válidas
		if (validSampleCount > 0) {
			validSampleCount = Math.max(0, validSampleCount - 0.5);
		}
		
		// Limpiar muestras antiguas (más de 600ms)
		const cutoff = now - 600;
		sampleHistory = sampleHistory.filter(s => s.timestamp > cutoff);
		
		// Solo resetear display si NO hay muestras recientes válidas
		if (sampleHistory.length === 0 && validSampleCount < 1) {
			state.currentFrequency = 0;
			state.isStable = false;
			
			// Desvanecer suavemente los valores numéricos
			smoothedCents *= 0.8;
			smoothedFrequency *= 0.8;
			
			// Resetear nota cuando los valores son muy bajos
			if (Math.abs(smoothedCents) < 1 && smoothedFrequency < 10) {
				state.displayNote = '-';
				state.displayOctave = 0;
				state.displayCents = 0;
				state.displayFrequency = 0;
			} else {
				state.displayCents = Math.round(smoothedCents);
				state.displayFrequency = smoothedFrequency;
			}
		}
	}

	function updateDisplayValues(now: number) {
		if (sampleHistory.length < STABILITY_CONFIG.minValidSamples) return;

		// Contar cuántas muestras recientes tienen la misma nota
		const recentSamples = sampleHistory.slice(-STABILITY_CONFIG.historySize);
		const noteCount = new Map<string, number>();
		
		recentSamples.forEach(s => {
			const key = `${s.note}${s.octave}`;
			noteCount.set(key, (noteCount.get(key) || 0) + 1);
		});

		// Encontrar la nota más frecuente
		let dominantNote = '';
		let dominantOctave = 0;
		let maxCount = 0;

		noteCount.forEach((count, key) => {
			if (count > maxCount) {
				maxCount = count;
				// Extraer nota y octava correctamente (manejar notas con #)
				const match = key.match(/^([A-G]#?)(\d+)$/);
				if (match) {
					dominantNote = match[1];
					dominantOctave = parseInt(match[2]);
				}
			}
		});

		// Verificar si hay suficiente consistencia
		const isConsistent = maxCount >= STABILITY_CONFIG.minConsistentSamples;
		const timeSinceLastChange = now - lastNoteChangeTime;
		const canChangeNote = timeSinceLastChange >= STABILITY_CONFIG.noteChangeDelay;

		// Actualizar nota solo si es consistente y ha pasado suficiente tiempo
		if (isConsistent && canChangeNote && dominantNote) {
			if (state.displayNote !== dominantNote || state.displayOctave !== dominantOctave) {
				state.displayNote = dominantNote;
				state.displayOctave = dominantOctave;
				lastNoteChangeTime = now;
			}
			state.isStable = true;
		}

		// Calcular promedio de cents para muestras de la nota dominante
		const relevantSamples = recentSamples.filter(
			s => s.note === dominantNote && s.octave === dominantOctave
		);

		if (relevantSamples.length > 0) {
			const avgCents = relevantSamples.reduce((sum, s) => sum + s.cents, 0) / relevantSamples.length;
			const avgFrequency = relevantSamples.reduce((sum, s) => sum + s.frequency, 0) / relevantSamples.length;

			// Suavizar valores
			smoothedCents += (avgCents - smoothedCents) * STABILITY_CONFIG.centsSmoothing;
			smoothedFrequency += (avgFrequency - smoothedFrequency) * STABILITY_CONFIG.frequencySmoothing;

			state.displayCents = Math.round(smoothedCents);
			state.displayFrequency = smoothedFrequency;
		}
	}

	function updateVolume(volume: number) {
		state.volume = Math.min(1, Math.max(0, volume));
	}

	function setListening(listening: boolean) {
		state.isListening = listening;
		if (!listening) {
			// Reset completo al parar
			state.currentFrequency = 0;
			state.currentNote = '-';
			state.currentOctave = 0;
			state.cents = 0;
			state.clarity = 0;
			state.volume = 0;
			state.displayNote = '-';
			state.displayOctave = 0;
			state.displayCents = 0;
			state.displayFrequency = 0;
			state.isStable = false;
			state.isInRange = false;
			state.hasValidSignal = false;
			state.rawFrequency = 0;
			sampleHistory = [];
			smoothedCents = 0;
			smoothedFrequency = 0;
			validSampleCount = 0;
			peakDecibels = -Infinity;
			peakTimestamp = 0;
		}
	}


	function findClosestString(frequency: number): StringTuning | null {
		if (!state.selectedInstrument || frequency <= 0) return null;
		if (!isFrequencyInRange(frequency, state.selectedInstrument)) return null;

		let closest: StringTuning | null = null;
		let minDiff = Infinity;

		for (const string of state.selectedInstrument.strings) {
			const offset = getCalibrationOffsetForString(string);
			const calibratedFrequency = string.frequency * Math.pow(2, offset / 1200);
			const diff = Math.abs(frequency - calibratedFrequency);
			// Solo considerar si está dentro del 15% de la frecuencia
			const tolerance = calibratedFrequency * 0.15;
			if (diff < minDiff && diff < tolerance) {
				minDiff = diff;
				closest = string;
			}
		}

		return closest;
	}

	function isInTune(): boolean {
		return Math.abs(state.displayCents) <= 5 && state.isStable;
	}

	return {
		get state() {
			return state;
		},
		setInstrument,
		setTargetString,
		setStrictModeEnabled,
		setCalibrationOffset,
		resetCalibrationOffsets,
		getCalibrationOffsetForString,
		updatePitch,
		updateVolume,
		setListening,
		findClosestString,
		isInTune
	};
}

export const tuner = createTunerStore();
