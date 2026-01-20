/**
 * Audio Engine - Maneja la captura de audio del micrófono
 * Con filtros de ruido y noise gate
 */

import { AudioPipeline, type AudioPipelineConfig, type InputFrame } from './pipeline';

export interface AudioEngineConfig {
	fftSize?: number;
	smoothingTimeConstant?: number;
	minDecibels?: number;
	maxDecibels?: number;
	// Filtros
	highpassFrequency?: number;  // Filtro pasa-altos (Hz)
	lowpassFrequency?: number;   // Filtro pasa-bajos (Hz)
	// Noise Gate
	noiseGateThreshold?: number; // Umbral en dB (ej: -50)
	noiseGateEnabled?: boolean;
	// Dispositivo de audio
	deviceId?: string;           // ID del dispositivo de entrada
}


const DEFAULT_CONFIG: AudioEngineConfig = {
	fftSize: 2048,
	smoothingTimeConstant: 0.8,
	minDecibels: -100,
	maxDecibels: -10,
	// Filtros - valor por defecto más alto para evitar ruido de baja frecuencia
	highpassFrequency: 150,   // Subido de 30 a 150 Hz
	lowpassFrequency: 2000,
	// Noise Gate
	noiseGateThreshold: -40,  // Subido de -45 a -40 dB (más estricto)
	noiseGateEnabled: true
};

type TimeDomainBuffer = Float32Array;

class AudioEngine {
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private mediaStream: MediaStream | null = null;
	private source: MediaStreamAudioSourceNode | null = null;
	private highpassFilter1: BiquadFilterNode | null = null;
	private highpassFilter2: BiquadFilterNode | null = null; // Segundo filtro para -24 dB/octava
	private lowpassFilter: BiquadFilterNode | null = null;
	private dataArray: TimeDomainBuffer | null = null;
	private silentBuffer: TimeDomainBuffer | null = null;
	private isRunning = false;
	private config: AudioEngineConfig;
	private pipeline: AudioPipeline;
	private pipelineConfig: AudioPipelineConfig;
	
	// Handlers para móviles
	private visibilityHandler: (() => void) | null = null;
	private stateChangeHandler: (() => void) | null = null;
	private wasRunningBeforeHidden = false;
	private onStateChange: ((state: 'running' | 'suspended' | 'interrupted') => void) | null = null;


	constructor(config: AudioEngineConfig = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.pipelineConfig = this.createPipelineConfig(this.config);
		this.pipeline = new AudioPipeline(this.pipelineConfig);
	}

	private buildAudioConstraints(deviceId?: string): MediaTrackConstraints {
		const constraints: MediaTrackConstraints = {
			// Desactivar procesamiento de audio del navegador
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false,
			// Optimizaciones para móviles
			channelCount: 1,              // Mono - reduce CPU
			sampleRate: { ideal: 44100 }, // Consistencia entre dispositivos
			sampleSize: { ideal: 16 }     // 16-bit audio
		};

		if (deviceId && deviceId !== 'default' && deviceId !== '') {
			constraints.deviceId = { exact: deviceId };
		}

		return constraints;
	}

	private createBuffer(length: number): TimeDomainBuffer {
		return new Float32Array(length) as TimeDomainBuffer;
	}

	private async createStream(deviceId?: string): Promise<MediaStream> {
		const audio = this.buildAudioConstraints(deviceId);
		return await navigator.mediaDevices.getUserMedia({ audio, video: false });
	}

	private disconnectSource(): void {
		if (this.source) {
			this.source.disconnect();
			this.source = null;
		}
	}

	private stopStream(): void {
		if (this.mediaStream) {
			this.mediaStream.getTracks().forEach(track => track.stop());
			this.mediaStream = null;
		}
	}

	private createPipelineConfig(config: AudioEngineConfig): AudioPipelineConfig {
		return {
			noiseGateEnabled: config.noiseGateEnabled ?? true,
			noiseGateThreshold: config.noiseGateThreshold ?? -45,
			gateSmoothing: 0.1,
			gateHysteresis: 3
		};
	}

	async init(deviceId?: string): Promise<boolean> {
		try {
			this.stopStream();
			this.pipeline.reset();
			this.mediaStream = await this.createStream(deviceId);

			const tracks = this.mediaStream.getAudioTracks();
			if (tracks.length > 0) {
				const settings = tracks[0].getSettings();
				this.config.deviceId = settings.deviceId ?? deviceId;
			}

			// Crear contexto de audio optimizado para baja latencia
			this.audioContext = new AudioContext({
				latencyHint: 'interactive',  // Baja latencia para tiempo real
				sampleRate: 44100            // Consistencia entre dispositivos
			});

			// Crear fuente de audio
			this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

			// Crear DOS filtros pasa-altos en cascada para -24 dB/octava
			// Esto elimina frecuencias bajas de forma mucho más agresiva
			this.highpassFilter1 = this.audioContext.createBiquadFilter();
			this.highpassFilter1.type = 'highpass';
			this.highpassFilter1.frequency.value = this.config.highpassFrequency!;
			this.highpassFilter1.Q.value = 0.707; // Butterworth
			
			this.highpassFilter2 = this.audioContext.createBiquadFilter();
			this.highpassFilter2.type = 'highpass';
			this.highpassFilter2.frequency.value = this.config.highpassFrequency!;
			this.highpassFilter2.Q.value = 0.707; // Butterworth

			// Crear filtro pasa-bajos (elimina frecuencias altas/ruido)
			this.lowpassFilter = this.audioContext.createBiquadFilter();
			this.lowpassFilter.type = 'lowpass';
			this.lowpassFilter.frequency.value = this.config.lowpassFrequency!;
			this.lowpassFilter.Q.value = 0.707;

			// Crear analizador
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = this.config.fftSize!;
			this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant!;
			this.analyser.minDecibels = this.config.minDecibels!;
			this.analyser.maxDecibels = this.config.maxDecibels!;

			// Conectar cadena: source → highpass1 → highpass2 → lowpass → analyser
			// Doble highpass = -24 dB/octava (mucho más agresivo)
			this.source.connect(this.highpassFilter1);
			this.highpassFilter1.connect(this.highpassFilter2);
			this.highpassFilter2.connect(this.lowpassFilter);
			this.lowpassFilter.connect(this.analyser);

			// Crear buffer para datos
			this.dataArray = this.createBuffer(this.analyser.fftSize);
			this.silentBuffer = this.createBuffer(this.analyser.fftSize);

			// Configurar handlers para móviles
			this.setupMobileHandlers();

			return true;
		} catch (error) {
			console.error('Error inicializando audio:', error);
			return false;
		}
	}

	/**
	 * Configura handlers para manejo de audio en móviles
	 */
	private setupMobileHandlers(): void {
		// Handler para cuando la app va a segundo plano
		this.visibilityHandler = () => {
			if (document.hidden) {
				// App va a background - pausar si estaba corriendo
				this.wasRunningBeforeHidden = this.isRunning;
				if (this.isRunning) {
					this.audioContext?.suspend();
				}
			} else {
				// App vuelve a foreground - resumir si estaba corriendo
				if (this.wasRunningBeforeHidden && this.audioContext?.state === 'suspended') {
					this.audioContext.resume();
				}
			}
		};
		document.addEventListener('visibilitychange', this.visibilityHandler);

		// Handler para cambios de estado del AudioContext (interrupciones, llamadas, etc.)
		if (this.audioContext) {
			this.stateChangeHandler = () => {
				const state = this.audioContext?.state as string;
				if (state) {
					this.onStateChange?.(state as 'running' | 'suspended' | 'interrupted');
					
					// Si el contexto se interrumpe (llamada entrante en iOS), notificar
					if (state === 'interrupted' || state === 'suspended') {
						console.log('AudioContext state changed:', state);
					}
				}
			};
			this.audioContext.addEventListener('statechange', this.stateChangeHandler);
		}
	}

	/**
	 * Elimina handlers de móviles
	 */
	private removeMobileHandlers(): void {
		if (this.visibilityHandler) {
			document.removeEventListener('visibilitychange', this.visibilityHandler);
			this.visibilityHandler = null;
		}
		if (this.stateChangeHandler && this.audioContext) {
			this.audioContext.removeEventListener('statechange', this.stateChangeHandler);
			this.stateChangeHandler = null;
		}
	}

	/**
	 * Registra callback para cambios de estado del audio
	 */
	setOnStateChange(callback: ((state: 'running' | 'suspended' | 'interrupted') => void) | null): void {
		this.onStateChange = callback;
	}

	/**
	 * Inicia la captura de audio
	 * En iOS, debe llamarse desde un gesto del usuario (click/touch)
	 */
	async start(): Promise<boolean> {
		if (!this.audioContext || !this.analyser) {
			console.error('AudioEngine no inicializado');
			return false;
		}

		// En iOS/Safari, el AudioContext puede estar suspendido
		// y requiere un gesto del usuario para activarse
		if (this.audioContext.state === 'suspended') {
			try {
				await this.audioContext.resume();
			} catch (error) {
				console.error('Error resumiendo AudioContext:', error);
				return false;
			}
		}

		// Verificar que el contexto esté corriendo
		if (this.audioContext.state !== 'running') {
			console.warn('AudioContext no está en estado running:', this.audioContext.state);
			// En iOS, intentar de nuevo - a veces necesita un segundo intento
			try {
				await this.audioContext.resume();
			} catch (error) {
				console.error('Error en segundo intento de resume:', error);
				return false;
			}
		}

		this.isRunning = true;
		return true;
	}

	stop(): void {
		this.isRunning = false;
		this.pipeline.reset();
	}

	destroy(): void {
		this.stop();
		this.removeMobileHandlers();

		if (this.source) {
			this.source.disconnect();
			this.source = null;
		}

		if (this.highpassFilter1) {
			this.highpassFilter1.disconnect();
			this.highpassFilter1 = null;
		}
		
		if (this.highpassFilter2) {
			this.highpassFilter2.disconnect();
			this.highpassFilter2 = null;
		}

		if (this.lowpassFilter) {
			this.lowpassFilter.disconnect();
			this.lowpassFilter = null;
		}

		this.stopStream();
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}

		this.analyser = null;
		this.dataArray = null;
		this.silentBuffer = null;
	}

	/**
	 * Obtiene datos del dominio de tiempo con noise gate aplicado
	 */
	getTimeDomainData(): Float32Array | null {
		return this.getInputFrame()?.data ?? null;
	}

	private snapshot(): InputFrame | null {
		if (!this.analyser || !this.dataArray || !this.isRunning) {
			return null;
		}

		this.analyser.getFloatTimeDomainData(this.dataArray);

		const frame = this.pipeline.processFrame(this.dataArray);
		if (!frame.isSignalDetected && this.silentBuffer) {
			return {
				...frame,
				data: this.silentBuffer
			};
		}

		return frame;
	}

	getInputFrame(): InputFrame | null {
		return this.snapshot();
	}

	getFrequencyData(): Float32Array | null {
		if (!this.analyser || !this.isRunning) {
			return null;
		}

		const freqData = new Float32Array(this.analyser.frequencyBinCount);
		this.analyser.getFloatFrequencyData(freqData);
		return freqData;
	}

	getSampleRate(): number {
		return this.audioContext?.sampleRate ?? 44100;
	}

	/**
	 * Obtiene el volumen normalizado (0-1)
	 */
	getVolume(): number {
		return Math.min(1, this.getRMS() * 10);
	}

	/**
	 * Obtiene el nivel actual en dB
	 */
	getDecibels(): number {
		return this.pipeline.getDecibels();
	}

	/**
	 * Verifica si el noise gate está abierto (señal detectada)
	 */
	isSignalDetected(): boolean {
		return this.pipeline.isSignalDetected();
	}

	/**
	 * Obtiene el RMS actual
	 */
	getRMS(): number {
		return this.pipeline.getRMS();
	}

	isActive(): boolean {
		return this.isRunning;
	}

	getBufferSize(): number {
		return this.config.fftSize ?? 2048;
	}

	/**
	 * Actualiza el umbral del noise gate en tiempo real
	 */
	setNoiseGateThreshold(threshold: number): void {
		this.config.noiseGateThreshold = threshold;
		this.pipeline.updateConfig({ noiseGateThreshold: threshold });
	}

	/**
	 * Habilita/deshabilita el noise gate
	 */
	setNoiseGateEnabled(enabled: boolean): void {
		this.config.noiseGateEnabled = enabled;
		this.pipeline.updateConfig({ noiseGateEnabled: enabled });
	}

	/**
	 * Obtiene el umbral actual del noise gate
	 */
	getNoiseGateThreshold(): number {
		return this.config.noiseGateThreshold ?? -45;
	}

	/**
	 * Actualiza las frecuencias de los filtros
	 */
	setFilterFrequencies(highpass: number, lowpass: number): void {
		this.updateFilterFrequencies(highpass, lowpass);
	}

	/**
	 * Actualiza dinámicamente la configuración de audio (filtros y FFT size)
	 * Se usa para optimizar por instrumento (ej: bajo necesita FFT más grande)
	 */
	updateAudioConfig(config: Partial<AudioEngineConfig>): void {
		if (config.fftSize !== undefined && config.fftSize !== this.config.fftSize) {
			this.config.fftSize = config.fftSize;
			if (this.analyser) {
				this.analyser.fftSize = config.fftSize;
				this.dataArray = this.createBuffer(config.fftSize);
				this.silentBuffer = this.createBuffer(config.fftSize);
			}
		}
		if (config.highpassFrequency !== undefined || config.lowpassFrequency !== undefined) {
			this.updateFilterFrequencies(
				config.highpassFrequency ?? this.config.highpassFrequency!,
				config.lowpassFrequency ?? this.config.lowpassFrequency!
			);
		}
		if (config.noiseGateThreshold !== undefined) {
			this.setNoiseGateThreshold(config.noiseGateThreshold);
		}
		if (config.noiseGateEnabled !== undefined) {
			this.setNoiseGateEnabled(config.noiseGateEnabled);
		}
	}

	private updateFilterFrequencies(highpass: number, lowpass: number): void {
		if (this.highpassFilter1) {
			this.highpassFilter1.frequency.value = highpass;
		}
		if (this.highpassFilter2) {
			this.highpassFilter2.frequency.value = highpass;
		}
		if (this.lowpassFilter) {
			this.lowpassFilter.frequency.value = lowpass;
		}
		this.config.highpassFrequency = highpass;
		this.config.lowpassFrequency = lowpass;
	}

	/**
	 * Cambia el dispositivo de entrada de audio
	 */
	async setInputDevice(deviceId: string): Promise<boolean> {
		try {
			this.stopStream();
			this.disconnectSource();

			this.mediaStream = await this.createStream(deviceId);

			const tracks = this.mediaStream.getAudioTracks();
			if (tracks.length > 0) {
				const settings = tracks[0].getSettings();
				this.config.deviceId = settings.deviceId ?? deviceId;
			}

			if (this.audioContext && this.highpassFilter1) {
				this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
				this.source.connect(this.highpassFilter1);
			}

			return true;
		} catch (error) {
			console.error('Error cambiando dispositivo de audio:', error);
			return false;
		}
	}

	/**
	 * Obtiene el ID del dispositivo actual
	 */
	getCurrentDeviceId(): string | undefined {
		return this.config.deviceId;
	}

	/**
	 * Lista todos los dispositivos de entrada de audio disponibles
	 */
	static async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach(track => track.stop());
			
			const devices = await navigator.mediaDevices.enumerateDevices();
			return devices.filter(device => device.kind === 'audioinput');
		} catch (error) {
			console.error('Error obteniendo dispositivos de audio:', error);
			return [];
		}
	}
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(config?: AudioEngineConfig): AudioEngine {
	if (!audioEngineInstance) {
		audioEngineInstance = new AudioEngine(config);
	}
	return audioEngineInstance;
}

export function destroyAudioEngine(): void {
	if (audioEngineInstance) {
		audioEngineInstance.destroy();
		audioEngineInstance = null;
	}
}

export { AudioEngine };
