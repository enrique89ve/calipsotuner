/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Nombre único del cache basado en la versión del build
const CACHE_NAME = `tuner-cache-${version}`;

// Archivos a cachear inmediatamente
const ASSETS = [
	...build, // archivos generados por Vite
	...files  // archivos en /static
];

// Instalación: cachear todos los assets
sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

// Activación: limpiar caches antiguos
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => {
				return Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key))
				);
			})
			.then(() => sw.clients.claim())
	);
});

// Fetch: estrategia cache-first para assets, network-first para navegación
sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Ignorar requests externos
	if (url.origin !== location.origin) return;

	event.respondWith(
		caches.match(event.request)
			.then((cached) => {
				// Si está en cache, devolverlo
				if (cached) {
					return cached;
				}

				// Si no, ir a la red
				return fetch(event.request)
					.then((response) => {
						// Cachear la respuesta para futuras requests
						if (response.status === 200) {
							const responseClone = response.clone();
							caches.open(CACHE_NAME)
								.then((cache) => cache.put(event.request, responseClone));
						}
						return response;
					})
					.catch(() => {
						// Si falla la red y es navegación, devolver la página offline
						if (event.request.mode === 'navigate') {
							return caches.match('/');
						}
						throw new Error('Network error');
					});
			}) as Promise<Response>
	);
});
