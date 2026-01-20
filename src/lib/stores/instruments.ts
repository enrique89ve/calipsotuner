/**
 * Definición de instrumentos y sus afinaciones
 * Frecuencias en Hz para cada cuerda
 */

export interface StringTuning {
	note: string;      // Nombre de la nota (ej: "E4")
	frequency: number; // Frecuencia en Hz
	octave: number;    // Octava
}

export interface Instrument {
	id: string;
	name: string;
	strings: StringTuning[];
	// Rango de frecuencias válidas para este instrumento
	minFrequency: number;  // Frecuencia mínima (con margen)
	maxFrequency: number;  // Frecuencia máxima (con margen)
	icon?: string;
	// Configuración de audio/pitch específica por instrumento (transparente al usuario)
	audioConfig?: {
		fftSize: number;
		highpassFrequency: number;
		lowpassFrequency: number;
		clarityThreshold: number;
		bufferSize: number;
	};
}

// Cuatro Venezolano - Afinación estándar (La-Re-Fa#-Si)
// Frecuencias según escala temperada (A4 = 440 Hz):
//   A3 = 220.000 Hz (exacto)
//   B3 = 246.9417 Hz
//   D4 = 293.6648 Hz
//   F#4 = 369.9944 Hz
// Rango: A3 (220 Hz) a F#4 (370 Hz)
export const cuatroVenezolano: Instrument = {
	id: 'cuatro',
	name: 'Cuatro Venezolano',
	minFrequency: 200,   // Margen inferior para A3
	maxFrequency: 420,   // Margen superior para F#4
	audioConfig: {
		fftSize: 4096,
		highpassFrequency: 85,
		lowpassFrequency: 450,
		clarityThreshold: 0.72,
		bufferSize: 4096
	},
	strings: [
		{ note: 'A3', frequency: 220.0000, octave: 3 },   // 1ra cuerda - La3 (exacto)
		{ note: 'D4', frequency: 293.6648, octave: 4 },   // 2da cuerda - Re4
		{ note: 'F#4', frequency: 369.9944, octave: 4 },   // 3ra cuerda - Fa#4
		{ note: 'B3', frequency: 246.9417, octave: 3 }    // 4ta cuerda - Si3
	]
};

// Guitarra - Afinación estándar (E-A-D-G-B-E)
// Frecuencias según escala temperada (A4 = 440 Hz)
export const guitarra: Instrument = {
	id: 'guitarra',
	name: 'Guitarra',
	minFrequency: 70,
	maxFrequency: 400,
	audioConfig: {
		fftSize: 4096,
		highpassFrequency: 95,
		lowpassFrequency: 480,
		clarityThreshold: 0.72,
		bufferSize: 4096
	},
	strings: [
		{ note: 'E2', frequency: 82.4069, octave: 2 },    // 6ta cuerda - Mi grave
		{ note: 'A2', frequency: 110.0000, octave: 2 },   // 5ta cuerda - La (exacto)
		{ note: 'D3', frequency: 146.8324, octave: 3 },   // 4ta cuerda - Re
		{ note: 'G3', frequency: 195.9977, octave: 3 },   // 3ra cuerda - Sol
		{ note: 'B3', frequency: 246.9417, octave: 3 },   // 2da cuerda - Si
		{ note: 'E4', frequency: 329.6276, octave: 4 }    // 1ra cuerda - Mi agudo
	]
};

// Bajo 5 cuerdas - Afinación estándar (B-E-A-D-G)
// Frecuencias según escala temperada (A4 = 440 Hz)
// Configuración optimizada para detectar B0 (30.87 Hz) y E1 (41.20 Hz)
export const bajo5Cuerdas: Instrument = {
	id: 'bajo5',
	name: 'Bajo 5 Cuerdas',
	minFrequency: 25,
	maxFrequency: 120,
	audioConfig: {
		fftSize: 8192,
		highpassFrequency: 18,
		lowpassFrequency: 480,
		clarityThreshold: 0.58,
		bufferSize: 8192
	},
	strings: [
		{ note: 'B0', frequency: 30.8677, octave: 0 },    // 5ta cuerda - Si grave
		{ note: 'E1', frequency: 41.2034, octave: 1 },    // 4ta cuerda - Mi
		{ note: 'A1', frequency: 55.0000, octave: 1 },    // 3ra cuerda - La (exacto)
		{ note: 'D2', frequency: 73.4162, octave: 2 },    // 2da cuerda - Re
		{ note: 'G2', frequency: 97.9989, octave: 2 }     // 1ra cuerda - Sol
	]
};

// Lista de todos los instrumentos disponibles
export const instruments: Instrument[] = [
	cuatroVenezolano,
	guitarra,
	bajo5Cuerdas
];

// Utilidad: obtener instrumento por ID
export function getInstrumentById(id: string): Instrument | undefined {
	return instruments.find((i) => i.id === id);
}

// Verificar si una frecuencia está en el rango válido del instrumento
export function isFrequencyInRange(frequency: number, instrument: Instrument): boolean {
	return frequency >= instrument.minFrequency && frequency <= instrument.maxFrequency;
}

// Obtener la cuerda más cercana a una frecuencia
export function getClosestString(frequency: number, instrument: Instrument): StringTuning | null {
	if (!isFrequencyInRange(frequency, instrument)) {
		return null;
	}
	
	let closest: StringTuning | null = null;
	let minDiff = Infinity;
	
	for (const string of instrument.strings) {
		const diff = Math.abs(frequency - string.frequency);
		// Solo considerar si está dentro del 15% de la frecuencia de la cuerda
		const tolerance = string.frequency * 0.15;
		if (diff < minDiff && diff < tolerance) {
			minDiff = diff;
			closest = string;
		}
	}
	
	return closest;
}

// Notas musicales para referencia
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Convertir frecuencia a nota más cercana
export function frequencyToNote(frequency: number): { note: string; octave: number; cents: number } {
	if (frequency <= 0) {
		return { note: '-', octave: 0, cents: 0 };
	}

	const A4 = 440;
	const C0 = A4 * Math.pow(2, -4.75);
	
	const halfSteps = Math.round(12 * Math.log2(frequency / C0));
	const octave = Math.floor(halfSteps / 12);
	const noteIndex = halfSteps % 12;
	const note = NOTES[noteIndex < 0 ? noteIndex + 12 : noteIndex];
	
	const perfectFrequency = C0 * Math.pow(2, halfSteps / 12);
	const rawCents = Math.round(1200 * Math.log2(frequency / perfectFrequency));
	const cents = Math.max(-50, Math.min(50, rawCents));
	
	return { note, octave, cents };
}

// Obtener frecuencia de una nota
export function noteToFrequency(note: string, octave: number): number {
	const noteIndex = NOTES.indexOf(note.replace(/\d+$/, '') as typeof NOTES[number]);
	if (noteIndex === -1) return 0;
	
	const A4 = 440;
	const halfStepsFromA4 = (octave - 4) * 12 + (noteIndex - 9);
	return A4 * Math.pow(2, halfStepsFromA4 / 12);
}
