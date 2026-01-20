export interface AudioPipelineConfig {
	noiseGateEnabled: boolean;
	noiseGateThreshold: number;
	gateSmoothing: number;
	gateHysteresis: number;
}

export interface InputFrame {
	data: Float32Array;
	decibels: number;
	isSignalDetected: boolean;
}

export class AudioPipeline {
	private currentRMS = 0;
	private currentDB = -Infinity;
	private isGateOpen = false;
	private config: AudioPipelineConfig;

	constructor(config: AudioPipelineConfig) {
		this.config = { ...config };
	}

	updateConfig(config: Partial<AudioPipelineConfig>): void {
		this.config = { ...this.config, ...config };
	}

	processFrame(data: Float32Array): InputFrame {
		this.updateLevels(data);

		if (this.config.noiseGateEnabled && !this.isGateOpen) {
			return {
				data,
				decibels: this.currentDB,
				isSignalDetected: false
			};
		}

		return {
			data,
			decibels: this.currentDB,
			isSignalDetected: true
		};
	}

	getDecibels(): number {
		return this.currentDB;
	}

	getRMS(): number {
		return this.currentRMS;
	}

	isSignalDetected(): boolean {
		return this.isGateOpen;
	}

	reset(): void {
		this.currentRMS = 0;
		this.currentDB = -Infinity;
		this.isGateOpen = false;
	}

	private updateLevels(data: Float32Array): void {
		const rms = this.calculateRMS(data);
		this.currentRMS += (rms - this.currentRMS) * this.config.gateSmoothing;
		this.currentDB = this.currentRMS > 0 ? 20 * Math.log10(this.currentRMS) : -Infinity;
		this.updateGateState();
	}

	private calculateRMS(data: Float32Array): number {
		let sum = 0;
		for (let i = 0; i < data.length; i++) {
			sum += data[i] * data[i];
		}
		return Math.sqrt(sum / data.length);
	}

	private updateGateState(): void {
		const threshold = this.config.noiseGateThreshold;
		const hysteresis = this.config.gateHysteresis;

		if (this.isGateOpen) {
			if (this.currentDB < threshold - hysteresis) {
				this.isGateOpen = false;
			}
			return;
		}

		if (this.currentDB > threshold) {
			this.isGateOpen = true;
		}
	}
}
