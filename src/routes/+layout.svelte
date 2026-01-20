<script lang="ts">
	import '../app.css';
	import { ToastContainer, Modal } from '$components/ui';

	let { children } = $props();
</script>

<svelte:head>
	<!-- Forzar modo oscuro inmediatamente -->
	<meta name="color-scheme" content="dark">
	<style>
		html, body {
			background: #0a0a0a !important;
			color: #ccc !important;
		}
	</style>

	<title>Calipso Tuner - Afinador Profesional para Cuatro, Guitarra y Bajo</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
	<meta name="theme-color" content="#0a0a0a">
	<meta name="mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
	<meta name="description" content="Afinador profesional para Cuatro Venezolano, Guitarra y Bajo. Configuración especializada para el Cuatro Venezolano con afinación estándar y alternativa.">
	<meta name="keywords" content="afinador, cuatro venezolano, guitarra, bajo, afinación, tuner, calipso, instrumentos musicales">
	<meta name="author" content="EnriqueVee">
	<meta name="robots" content="index, follow">

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website">
	<meta property="og:title" content="Calipso Tuner - Afinador Profesional">
	<meta property="og:description" content="Afinador profesional para Cuatro Venezolano, Guitarra y Bajo con configuración especializada.">
	<meta property="og:locale" content="es_ES">

	<!-- Twitter -->
	<meta name="twitter:card" content="summary">
	<meta name="twitter:title" content="Calipso Tuner - Afinador Profesional">
	<meta name="twitter:description" content="Afinador profesional para Cuatro Venezolano, Guitarra y Bajo con configuración especializada.">
	<meta name="twitter:creator" content="@enriquevee">

	<!-- Apple touch icon -->
	<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
	<link rel="manifest" href="/manifest.json">

	<!-- Favicon -->
	<link rel="icon" type="image/png" href="/icons/icon-32x32.png" sizes="32x32">
	<link rel="icon" type="image/png" href="/icons/icon-16x16.png" sizes="16x16">
</svelte:head>

<main>
	{@render children()}
</main>

<ToastContainer />
<Modal />

<style>
	main {
		width: 100%;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #0a0a0a;
	}
</style>
