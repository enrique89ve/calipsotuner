/**
 * Store centralizado para Modales
 * Uso: import { modal } from '$stores/modal.svelte';
 *      modal.open({ title: 'Mi Modal', component: MiComponente });
 *      modal.close();
 */

import type { Component, Snippet } from 'svelte';

export interface ModalConfig<Props extends Record<string, unknown> = Record<string, unknown>> {
	title?: string;
	component?: Component<Props>;
	props?: Props;
	content?: string;
	closable?: boolean;
	onClose?: () => void;
	onConfirm?: () => void;
	confirmText?: string;
	cancelText?: string;
	size?: 'sm' | 'md' | 'lg';
}

function createModalStore() {
	let isOpen = $state(false);
	let config = $state<ModalConfig>({});

	function open<Props extends Record<string, unknown>>(newConfig: ModalConfig<Props>) {
		config = {
			closable: true,
			size: 'md',
			confirmText: 'Aceptar',
			...newConfig
		} as ModalConfig;
		isOpen = true;
	}

	function close() {
		if (config.onClose) {
			config.onClose();
		}
		isOpen = false;
		config = {};
	}

	function confirm() {
		if (config.onConfirm) {
			config.onConfirm();
		}
		close();
	}

	// Modal de confirmación rápida
	function confirmDialog(
		message: string,
		onConfirm: () => void,
		options: Partial<ModalConfig> = {}
	) {
		open({
			title: 'Confirmar',
			content: message,
			onConfirm,
			...options
		});
	}

	// Modal de alerta rápida
	function alert(message: string, options: Partial<ModalConfig> = {}) {
		open({
			title: 'Aviso',
			content: message,
			confirmText: 'Entendido',
			cancelText: '',
			...options
		});
	}

	return {
		get isOpen() {
			return isOpen;
		},
		get config() {
			return config;
		},
		open,
		close,
		confirm,
		confirmDialog,
		alert
	};
}

export const modal = createModalStore();
