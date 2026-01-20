/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface AnalyserNode {
		getFloatTimeDomainData(array: Float32Array): void;
		getFloatFrequencyData(array: Float32Array): void;
	}
}

export {};
