/**
 * Store centralizado para Toasts/Notificaciones
 * Uso: import { toasts } from '$stores/toast.svelte';
 *      toasts.success('Mensaje');
 *      toasts.error('Error');
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration: number;
}

interface ToastOptions {
	duration?: number;
}

const DEFAULT_DURATION = 3000;

function createToastStore() {
	let items = $state<Toast[]>([]);

	function add(type: ToastType, message: string, options: ToastOptions = {}) {
		const id = crypto.randomUUID();
		const duration = options.duration ?? DEFAULT_DURATION;

		const toast: Toast = { id, type, message, duration };
		items = [...items, toast];

		// Auto-remove después del duration
		if (duration > 0) {
			setTimeout(() => remove(id), duration);
		}

		return id;
	}

	function remove(id: string) {
		items = items.filter((t) => t.id !== id);
	}

	function clear() {
		items = [];
	}

	return {
		get items() {
			return items;
		},
		add,
		remove,
		clear,
		success: (message: string, options?: ToastOptions) => add('success', message, options),
		error: (message: string, options?: ToastOptions) => add('error', message, options),
		warning: (message: string, options?: ToastOptions) => add('warning', message, options),
		info: (message: string, options?: ToastOptions) => add('info', message, options)
	};
}

export const toasts = createToastStore();
