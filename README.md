# 🎸 Calipso Tuner

Afinador profesional web para Cuatro Venezolano, Guitarra y Bajo con configuración especializada para instrumentos venezolanos.

## ✨ Características

- 🎵 **Afinación en tiempo real** con algoritmo YIN
- 🪕 **Cuatro Venezolano** - Afinación estándar (LA-RE-FA-SI) y alternativa (SOL-DO-MI-LA)
- 🎸 **Guitarra** - Afinación estándar EADGBE
- 🎸 **Bajo 5 cuerdas** - Afinación estándar BEADG
- 🔧 **Calibración personalizable** - Ajusta A4 de 432Hz a 448Hz
- 📱 **Optimizado para móviles** - iOS/Android con baja latencia
- 🌙 **Modo oscuro** - Estilo hardware profesional
- ⚡ **PWA** - Funciona offline, instala en home screen

## 🚀 Instalación Local

```bash
# Clonar repositorio
git clone <repo-url>
cd tuner-app

# Instalar dependencias
pnpm install

# Iniciar desarrollo
pnpm dev
```

## 🏗️ Build Producción

```bash
# Generar iconos (solo necesario una vez)
pnpm run generate:icons

# Build
pnpm run build

# Preview local
pnpm run preview
```

## 📦 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### GitHub Pages

1. Subir código a GitHub
2. Settings → Pages
3. Source: `gh-pages` branch
4. Deploy desde `build/` folder

## 📁 Estructura

```
tuner-app/
├── src/
│   ├── lib/
│   │   ├── audio/          # Audio engine y pitch detection
│   │   ├── components/     # Componentes UI
│   │   └── stores/         # Svelte stores (state)
│   └── routes/             # Pages (SvelteKit)
├── static/
│   ├── icons/              # Iconos PWA (autogenerados)
│   └── manifest.json       # PWA manifest
└── build/                 # Output de producción
```

## 🎨 Tecnologías

- **SvelteKit** - Framework full-stack
- **Svelte 5** - Reactive UI con runes
- **TypeScript** - Type safety
- **Pitchy** - Algoritmo YIN para detección de frecuencia
- **Web Audio API** - Audio processing
- **Service Worker** - Offline caching
- **Sharp** - Generación de iconos

## 🔧 Configuración

### Afinaciones Predefinidas

| Instrumento | Cuerdas | Frecuencia Base |
|-------------|----------|-----------------|
| Cuatro Venezolano | La-Re-Fa-Si | A4 = 440Hz |
| Cuatro (Alt) | Sol-Do-Mi-La | A4 = 440Hz |
| Guitarra | E-A-D-G-B-E | A4 = 440Hz |
| Bajo 5 | B-E-A-D-G | A4 = 440Hz |

### Rango de Frecuencias

- **Mínimo**: 27.5 Hz (A0)
- **Máximo**: 2000 Hz (limitado para instrumentos de cuerda)

### Audio Settings

| Configuración | Valor | Descripción |
|---------------|--------|-------------|
| Sample Rate | 44100 Hz | Consistencia móvil |
| Latency Hint | Interactive | Baja latencia |
| Channel Count | 1 | Mono |
| Highpass Filter | 150 Hz | Elimina ruido grave |
| Lowpass Filter | 2000 Hz | Elimina ruido agudo |
| Noise Gate | -40 dB | Umbral de silencio |

## 📱 Optimización Móvil

- ✅ Visibility handler - Pausa audio en background
- ✅ State change listener - Detecta interrupciones (llamadas)
- ✅ User gesture support - Compatible con iOS Safari
- ✅ Mono audio - Reduce consumo de CPU
- ✅ Offline support - Funciona sin conexión

## 👨‍💻 Créditos

Creado por [EnriqueVee](https://instagram.com/enriquevee)

## 📄 Licencia

MIT
