// Re-exportar módulos de audio
export { AudioEngine, getAudioEngine, destroyAudioEngine } from './audioEngine';
export { 
	TunerPitchDetector, 
	getPitchDetector, 
	destroyPitchDetector,
	type PitchResult,
	type PitchDetectorConfig 
} from './pitchDetector';
