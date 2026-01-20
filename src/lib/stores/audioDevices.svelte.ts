/**
 * Store para manejar dispositivos de audio
 */

import { getAudioEngine } from '$audio/audioEngine';

export interface AudioDevice {
	deviceId: string;
	label: string;
	kind: string;
	isDefault: boolean;
}

export enum AudioDeviceError {
	PermissionDenied = 'PermissionDenied',
	DeviceUnavailable = 'DeviceUnavailable',
	Unknown = 'Unknown'
}

function createAudioDevicesStore() {
	let devices = $state<AudioDevice[]>([]);
	let selectedDeviceId = $state<string>('');
	let isLoading = $state(false);
	let hasPermission = $state(false);
	let error = $state<AudioDeviceError | null>(null);

	async function loadDevices(): Promise<void> {
		isLoading = true;
		error = null;
		
		try {
			const testStream = await navigator.mediaDevices.getUserMedia({ 
				audio: true,
				video: false 
			});
			
			testStream.getTracks().forEach(track => track.stop());
			
			hasPermission = true;
			
			const allDevices = await navigator.mediaDevices.enumerateDevices();
			
			devices = allDevices
				.filter((d) => d.kind === 'audioinput')
				.map((d, index) => ({
					deviceId: d.deviceId,
					label: d.label || `Micrófono ${index + 1}`,
					kind: d.kind,
					isDefault: d.deviceId === 'default' || index === 0
				}));
			
			if ((!selectedDeviceId || selectedDeviceId === '') && devices.length > 0) {
				selectedDeviceId = devices[0].deviceId;
			}
		} catch (err) {
			console.error('Error cargando dispositivos:', err);
			error = err instanceof DOMException && err.name === 'NotAllowedError'
				? AudioDeviceError.PermissionDenied
				: AudioDeviceError.DeviceUnavailable;
			hasPermission = false;
		} finally {
			isLoading = false;
		}
	}

	async function selectDevice(deviceId: string): Promise<boolean> {
		if (deviceId === selectedDeviceId) {
			return true;
		}
		
		isLoading = true;
		error = null;
		
		try {
			const engine = getAudioEngine();
			const success = await engine.setInputDevice(deviceId);
			
			if (success) {
				selectedDeviceId = deviceId;
				return true;
			} else {
				error = AudioDeviceError.DeviceUnavailable;
				return false;
			}
		} catch (err) {
			console.error('Error seleccionando dispositivo:', err);
			error = err instanceof DOMException && err.name === 'NotAllowedError'
				? AudioDeviceError.PermissionDenied
				: AudioDeviceError.DeviceUnavailable;
			return false;
		} finally {
			isLoading = false;
		}
	}

	function getSelectedDevice(): AudioDevice | undefined {
		return devices.find((d) => d.deviceId === selectedDeviceId);
	}

	function getSelectedLabel(): string {
		const device = getSelectedDevice();
		if (!device) return 'Sin micrófono';
		const label = device.label;
		return label.length > 25 ? label.substring(0, 22) + '...' : label;
	}

	function getErrorMessage(): string | null {
		switch (error) {
			case AudioDeviceError.PermissionDenied:
				return 'Permiso de micrófono denegado';
			case AudioDeviceError.DeviceUnavailable:
				return 'No se pudo acceder al dispositivo';
			case AudioDeviceError.Unknown:
				return 'Error desconocido';
			default:
				return null;
		}
	}

	// Escuchar cambios en dispositivos (cuando se conecta/desconecta un USB)
	if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
		navigator.mediaDevices.addEventListener('devicechange', () => {
			loadDevices();
		});
	}

	return {
		get devices() { return devices; },
		get selectedDeviceId() { return selectedDeviceId; },
		get isLoading() { return isLoading; },
		get hasPermission() { return hasPermission; },
		get error() { return error; },
		getErrorMessage,
		loadDevices,
		selectDevice,
		getSelectedDevice,
		getSelectedLabel
	};
}

export const audioDevices = createAudioDevicesStore();
