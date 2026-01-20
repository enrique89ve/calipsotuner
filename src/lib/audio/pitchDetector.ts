/**
 * Pitch Detector - Detecta la frecuencia fundamental usando Pitchy
 * Con soporte para noise gate y filtrado
 */

import { PitchDetector } from 'pitchy';
import { getAudioEngine, type AudioEngine } from './audioEngine';
import { frequencyToNote } from '$stores/instruments';

export interface PitchResult {
	frequency: number;
	clarity: number;
	note: string;
	octave: number;
	cents: number;
	decibels: number;      // Nivel en dB
	isSignalDetected: boolean;  // Si el noise gate está abierto
}

export interface PitchDetectorConfig {
	minFrequency?: number;
	maxFrequency?: number;
	clarityThreshold?: number;
}

const DEFAULT_CONFIG: PitchDetectorConfig = {
	minFrequency: 27.5,    // A0
	maxFrequency: 2000,    // Limitado para instrumentos de cuerda
	clarityThreshold: 0.7  // Reducido porque el filtrado mejora la señal
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

class TunerPitchDetector {
	private audioEngine: AudioEngine;
	private detector: PitchDetector<Float32Array> | null = null;
	private config: PitchDetectorConfig;
	private animationFrameId: number | null = null;
	private onPitchDetected: ((result: PitchResult) => void) | null = null;
	private isRunning = false;
	private bufferSize = 0;

	constructor(config: PitchDetectorConfig = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.audioEngine = getAudioEngine();
	}

	async init(deviceId?: string): Promise<boolean> {
		const success = await this.audioEngine.init(deviceId);
		if (!success) return false;

		const bufferSize = this.audioEngine.getBufferSize();
		this.updateBufferSize(bufferSize);

		return true;
	}

	async setInputDevice(deviceId: string): Promise<boolean> {
		return await this.audioEngine.setInputDevice(deviceId);
	}

	async start(callback: (result: PitchResult) => void): Promise<boolean> {
		if (!this.detector) {
			console.error('PitchDetector no inicializado');
			return false;
		}

		this.onPitchDetected = callback;
		const started = await this.audioEngine.start();
		
		if (!started) {
			console.error('No se pudo iniciar el AudioEngine');
			return false;
		}
		
		this.isRunning = true;
		this.processAudio();

		return true;
	}

	stop(): void {
		this.isRunning = false;
		this.audioEngine.stop();

		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	destroy(): void {
		this.stop();
		this.detector = null;
		this.onPitchDetected = null;
	}

	private processAudio(): void {
		if (!this.isRunning || !this.detector) return;

		const frame = this.audioEngine.getInputFrame();

		if (frame && frame.isSignalDetected) {
			const sampleRate = this.audioEngine.getSampleRate();
			const [frequency, clarity] = this.detector.findPitch(frame.data, sampleRate);

			// FILTRO ESTRICTO: Solo procesar si la frecuencia está en el rango del instrumento
			// Y tiene suficiente claridad
			const isInFrequencyRange = frequency >= this.config.minFrequency! && 
			                           frequency <= this.config.maxFrequency!;
			const hasGoodClarity = clarity >= this.config.clarityThreshold!;
			
			if (isInFrequencyRange && hasGoodClarity) {
				const result = this.frequencyToResult(frequency, clarity, frame.decibels, true);
				this.onPitchDetected?.(result);
			} else {
				// Frecuencia fuera de rango o claridad baja = IGNORAR completamente
				// No reportar nada para evitar parpadeo
				// Solo reportar silencio si realmente no hay señal válida
				this.onPitchDetected?.({
					frequency: 0,
					clarity: isInFrequencyRange ? clarity : 0, // Solo mostrar claridad si está en rango
					note: '-',
					octave: 0,
					cents: 0,
					decibels: frame.decibels,
					isSignalDetected: isInFrequencyRange // Solo "detectando" si está en rango
				});
			}
		} else {
			// Sin señal (noise gate cerrado)
			this.onPitchDetected?.({
				frequency: 0,
				clarity: 0,
				note: '-',
				octave: 0,
				cents: 0,
				decibels: frame?.decibels ?? this.audioEngine.getDecibels(),
				isSignalDetected: false
			});
		}

		this.animationFrameId = requestAnimationFrame(() => this.processAudio());
	}

	private frequencyToResult(
		frequency: number, 
		clarity: number, 
		decibels: number,
		isSignalDetected: boolean
	): PitchResult {
		const result = frequencyToNote(frequency);

		return {
			frequency,
			clarity,
			note: result.note,
			octave: result.octave,
			cents: result.cents,
			decibels,
			isSignalDetected
		};
	}

	getVolume(): number {
		return this.audioEngine.getVolume();
	}

	getDecibels(): number {
		return this.audioEngine.getDecibels();
	}

	isSignalDetected(): boolean {
		return this.audioEngine.isSignalDetected();
	}

	isActive(): boolean {
		return this.isRunning;
	}

	// Métodos para ajustar el noise gate
	setNoiseGateThreshold(threshold: number): void {
		this.audioEngine.setNoiseGateThreshold(threshold);
	}

	getNoiseGateThreshold(): number {
		return this.audioEngine.getNoiseGateThreshold();
	}

	setNoiseGateEnabled(enabled: boolean): void {
		this.audioEngine.setNoiseGateEnabled(enabled);
	}

	// Actualiza el tamaño de buffer (reconstruye el detector si cambia)
	updateBufferSize(bufferSize: number): void {
		if (bufferSize <= 0 || bufferSize === this.bufferSize) return;
		this.detector = PitchDetector.forFloat32Array(bufferSize);
		this.bufferSize = bufferSize;
	}

	// Método para ajustar claridad mínima
	setClarityThreshold(threshold: number): void {
		this.config.clarityThreshold = threshold;
	}

	getClarityThreshold(): number {
		return this.config.clarityThreshold ?? 0.7;
	}

	// Método para ajustar filtros de audio según el instrumento
	setFilterFrequencies(minFreq: number, maxFreq: number): void {
		this.audioEngine.setFilterFrequencies(minFreq, maxFreq);
		this.config.minFrequency = minFreq;
		this.config.maxFrequency = maxFreq;
	}

	// Actualiza dinámicamente la configuración del detector (clarity threshold, rango, etc.)
	updateConfig(config: Partial<PitchDetectorConfig>): void {
		if (config.clarityThreshold !== undefined) {
			this.config.clarityThreshold = config.clarityThreshold;
		}
		if (config.minFrequency !== undefined || config.maxFrequency !== undefined) {
			this.config.minFrequency = config.minFrequency ?? this.config.minFrequency;
			this.config.maxFrequency = config.maxFrequency ?? this.config.maxFrequency;
		}
	}

	// Obtener rango de frecuencias actual
	getFrequencyRange(): { min: number; max: number } {
		return {
			min: this.config.minFrequency ?? 27.5,
			max: this.config.maxFrequency ?? 2000
		};
	}
}

// Singleton
let detectorInstance: TunerPitchDetector | null = null;

export function getPitchDetector(config?: PitchDetectorConfig): TunerPitchDetector {
	if (!detectorInstance) {
		detectorInstance = new TunerPitchDetector(config);
	}
	return detectorInstance;
}

export function destroyPitchDetector(): void {
	if (detectorInstance) {
		detectorInstance.destroy();
		detectorInstance = null;
	}
}

export { TunerPitchDetector };
