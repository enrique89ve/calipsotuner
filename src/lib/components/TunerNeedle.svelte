<script lang="ts">
	import { onMount } from 'svelte';
	
	interface Props {
		cents?: number;
		isInTune?: boolean;
		isActive?: boolean;
		note?: string;
		octave?: number;
	}
	
	let { cents = 0, isInTune = false, isActive = false, note = '-', octave = 0 }: Props = $props();
	
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrame: number;
	let currentPosition = 0;
	let velocity = 0;
	let smoothedPosition = 0;
	
	let WIDTH = $state(320);
	let HEIGHT = $state(140);
	// Movimiento mas suave y natural
	const SMOOTHING = 0.04;
	const DAMPING = 0.88;
	const POSITION_LERP = 0.12;
	
	onMount(() => {
		ctx = canvas.getContext('2d');
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		draw();
		return () => {
			window.removeEventListener('resize', resizeCanvas);
			if (animationFrame) cancelAnimationFrame(animationFrame);
		};
	});
	
	function resizeCanvas() {
		if (!container) return;
		const rect = container.getBoundingClientRect();
		WIDTH = Math.min(rect.width, 400);
		HEIGHT = Math.round(WIDTH * 0.48);
		canvas.width = WIDTH;
		canvas.height = HEIGHT;
	}
	
	function draw() {
		if (!ctx) return;
		
		const PADDING = WIDTH * 0.08;
		const METER_WIDTH = WIDTH - (PADDING * 2);
		const NUMBERS_Y = HEIGHT * 0.12;
		const SCALE_Y = HEIGHT * 0.32;
		
		const targetPosition = isActive ? (cents / 50) * (METER_WIDTH / 2) : 0;
		
		// Suavizado de posicion con interpolacion doble
		smoothedPosition += (targetPosition - smoothedPosition) * POSITION_LERP;
		const distance = smoothedPosition - currentPosition;
		velocity += distance * SMOOTHING;
		velocity *= DAMPING;
		currentPosition += velocity;
		
		// Umbral mas pequeno para movimiento mas preciso
		if (Math.abs(targetPosition - currentPosition) < 0.3 && Math.abs(velocity) < 0.05) {
			currentPosition = smoothedPosition;
			velocity = 0;
		}
		
		ctx.clearRect(0, 0, WIDTH, HEIGHT);
		
		// Fondo
		ctx.fillStyle = '#0d0d0d';
		ctx.fillRect(0, 0, WIDTH, HEIGHT);
		
		const centerX = WIDTH / 2;
		
		// Numeros arriba de la escala (separados de la aguja)
		const marks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
		marks.forEach((value) => {
			const x = centerX + (value / 50) * (METER_WIDTH / 2);
			const isCenter = value === 0;
			const isMajor = Math.abs(value) % 20 === 0;
			
			if (isMajor || isCenter) {
				const displayVal = value * 2;
				ctx!.font = `${isCenter ? 'bold ' : ''}${Math.round(HEIGHT * 0.085)}px Arial`;
				ctx!.fillStyle = isCenter ? '#0a0' : '#555';
				ctx!.textAlign = 'center';
				ctx!.fillText(displayVal.toString(), x, NUMBERS_Y);
			}
		});
		
		// Marcas de escala
		marks.forEach((value) => {
			const x = centerX + (value / 50) * (METER_WIDTH / 2);
			const isCenter = value === 0;
			const isMajor = Math.abs(value) % 20 === 0;
			
			ctx!.beginPath();
			ctx!.moveTo(x, SCALE_Y);
			ctx!.lineTo(x, SCALE_Y + (isCenter ? HEIGHT * 0.12 : isMajor ? HEIGHT * 0.08 : HEIGHT * 0.05));
			ctx!.strokeStyle = isCenter ? '#0a0' : '#3a3a3a';
			ctx!.lineWidth = isCenter ? 2 : 1;
			ctx!.stroke();
		});
		
		// Zona verde central mejorada con gradiente
		const zoneWidth = (10 / 50) * (METER_WIDTH / 2) * 2;
		const zoneHeight = HEIGHT * 0.14;
		const zoneY = SCALE_Y;
		
		// Gradiente radial para efecto glow
		const gradient = ctx.createRadialGradient(
			centerX, zoneY + zoneHeight / 2, 0,
			centerX, zoneY + zoneHeight / 2, zoneWidth / 1.5
		);
		
		if (isInTune && isActive) {
			gradient.addColorStop(0, 'rgba(0, 220, 0, 0.35)');
			gradient.addColorStop(0.5, 'rgba(0, 180, 0, 0.18)');
			gradient.addColorStop(1, 'rgba(0, 100, 0, 0.02)');
		} else {
			gradient.addColorStop(0, 'rgba(0, 120, 0, 0.12)');
			gradient.addColorStop(0.6, 'rgba(0, 80, 0, 0.05)');
			gradient.addColorStop(1, 'rgba(0, 60, 0, 0)');
		}
		
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.roundRect(centerX - zoneWidth / 2, zoneY, zoneWidth, zoneHeight, 3);
		ctx.fill();
		
		// Bordes sutiles de la zona verde
		if (isInTune && isActive) {
			ctx.strokeStyle = 'rgba(0, 200, 0, 0.3)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(centerX - zoneWidth / 2, zoneY, zoneWidth, zoneHeight, 3);
			ctx.stroke();
		}
		
		// Linea central verde
		ctx.beginPath();
		ctx.moveTo(centerX, SCALE_Y);
		ctx.lineTo(centerX, SCALE_Y + HEIGHT * 0.14);
		ctx.strokeStyle = isInTune && isActive ? '#0d0' : '#080';
		ctx.lineWidth = 2;
		ctx.stroke();
		
		// Aguja - posicion calculada
		const x = centerX + currentPosition;
		const needleTop = SCALE_Y + 2;
		const needleBottom = HEIGHT * 0.58;
		
		let needleColor = '#444';
		let needleGlow = 'transparent';
		if (isActive) {
			if (isInTune) {
				needleColor = '#0f0';
				needleGlow = 'rgba(0, 255, 0, 0.4)';
			} else if (Math.abs(currentPosition) < METER_WIDTH * 0.15) {
				needleColor = '#fa0';
				needleGlow = 'rgba(255, 170, 0, 0.3)';
			} else {
				needleColor = '#f55';
				needleGlow = 'rgba(255, 80, 80, 0.25)';
			}
		}
		
		// Glow de aguja
		if (isActive && needleGlow !== 'transparent') {
			ctx.beginPath();
			ctx.moveTo(x, needleTop);
			ctx.lineTo(x, needleBottom);
			ctx.strokeStyle = needleGlow;
			ctx.lineWidth = 8;
			ctx.lineCap = 'round';
			ctx.stroke();
		}
		
		// Sombra de aguja
		ctx.beginPath();
		ctx.moveTo(x + 1, needleTop);
		ctx.lineTo(x + 1, needleBottom);
		ctx.strokeStyle = 'rgba(0,0,0,0.5)';
		ctx.lineWidth = 4;
		ctx.lineCap = 'round';
		ctx.stroke();
		
		// Aguja principal
		ctx.beginPath();
		ctx.moveTo(x, needleTop);
		ctx.lineTo(x, needleBottom);
		ctx.strokeStyle = needleColor;
		ctx.lineWidth = 3;
		ctx.stroke();
		
		// Circulo indicador en la punta
		ctx.beginPath();
		ctx.arc(x, needleTop - 4, 5, 0, Math.PI * 2);
		ctx.fillStyle = needleColor;
		ctx.fill();
		
		// Punto brillante en el circulo
		ctx.beginPath();
		ctx.arc(x - 1.5, needleTop - 5.5, 1.5, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(255,255,255,0.4)';
		ctx.fill();
		
		// === NOTA CENTRADA ABAJO ===
		drawCenteredNote(centerX, HEIGHT);
		
		animationFrame = requestAnimationFrame(draw);
	}
	
	function drawCenteredNote(centerX: number, height: number) {
		if (!ctx) return;
		
		const noteY = height * 0.80;
		const displayNote = isActive ? note : '-';
		const displayOctave = isActive && octave > 0 ? octave.toString() : '';
		
		// Tamaño para la nota
		const fontSize = Math.round(height * 0.28);
		const octaveSize = Math.round(fontSize * 0.38);
		
		// Color segun estado
		let noteColor = '#2a2a2a';
		let octaveColor = '#222';
		if (isActive) {
			if (isInTune) {
				noteColor = '#0f0';
				octaveColor = '#080';
			} else {
				noteColor = '#6a6';
				octaveColor = '#454';
			}
		}
		
		// Medir ancho del texto de la nota
		ctx.font = `bold ${fontSize}px 'Arial', sans-serif`;
		const noteWidth = ctx.measureText(displayNote).width;
		
		// Calcular posicion X para centrar nota + octava juntos
		const totalWidth = noteWidth + (displayOctave ? octaveSize * 0.7 : 0);
		const startX = centerX - totalWidth / 2;
		
		// Glow si esta afinado
		if (isActive && isInTune) {
			ctx.shadowColor = '#0f0';
			ctx.shadowBlur = 12;
		}
		
		// Nota principal
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = noteColor;
		ctx.fillText(displayNote, startX, noteY);
		
		ctx.shadowBlur = 0;
		
		// Octava como subindice a la derecha
		if (displayOctave) {
			ctx.font = `bold ${octaveSize}px 'Arial', sans-serif`;
			ctx.fillStyle = octaveColor;
			ctx.fillText(displayOctave, startX + noteWidth + 2, noteY + fontSize * 0.25);
		}
	}
</script>

<div class="meter-wrap" bind:this={container}>
	<canvas bind:this={canvas} width={WIDTH} height={HEIGHT}></canvas>
</div>

<style>
	.meter-wrap {
		width: 100%;
	}
	
	canvas {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 4px;
	}
</style>
