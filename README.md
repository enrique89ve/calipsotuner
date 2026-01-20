# 🎸 Calipso Tuner

Afinador profesional web para Cuatro Venezolano, Guitarra y Bajo con configuración especializada para instrumentos venezolanos. Interfaz moderna, detección de frecuencia precisa y funcionamiento offline.

## ✨ Características

- 🎵 **Afinación en tiempo real** - Algoritmo YIN de detección de pitch con precisión profesional
- 🪕 **Cuatro Venezolano** - Afinación estándar (LA-RE-FA-SI) y alternativa (SOL-DO-MI-LA)
- 🎸 **Guitarra** - Afinación estándar EADGBE (6 cuerdas)
- 🎸 **Bajo 5 cuerdas** - Afinación estándar BEADG
- 🎚️ **Referencia fija** - Todas las afinaciones en A4 = 440 Hz
- 📱 **Mobile-First** - iOS/Android optimizado, baja latencia, gestos nativos
- 🌙 **Modo oscuro** - Estilo minimalista y profesional, diseño responsive
- ⚡ **Progressive Web App (PWA)** - Funciona offline, instalable en home screen
- 🎛️ **Selector de dispositivo de audio** - Elige micrófono o entrada específica
- 🔊 **Control de sensibilidad** - Ajusta el nivel de ruido gate dinámicamente

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js** ≥ 18.0.0
- **pnpm** 9.14.2+ (gestor de paquetes recomendado)
- **Navegador moderno** con soporte para Web Audio API

### Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/enrique89ve/calipsotuner.git
cd calipsotuner

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

El servidor estará disponible en `http://localhost:5173`

## 🏗️ Construcción para Producción

```bash
# Generar iconos PWA (solo si cambias la configuración de iconos)
pnpm run generate:icons

# Compilar para producción
pnpm run build

# Preview local de la build
pnpm run preview
```

## 🌐 Deployment

### Vercel (⭐ Recomendado)

```bash
# Opción 1: CLI
npm i -g vercel
vercel

# Opción 2: GitHub Integration
# Conecta en https://vercel.com/import
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod
```

### GitHub Pages

```bash
# Ya configurado en vercel.json
# Solo realiza push a GitHub y verifica el deployment en Settings → Pages
```

## 📦 Stack Tecnológico

| Tecnología         | Propósito                                        |
| ------------------ | ------------------------------------------------ |
| **SvelteKit**      | Framework full-stack moderna                     |
| **Svelte 5**       | UI reactiva con runes                            |
| **TypeScript**     | Type safety completo                             |
| **Pitchy**         | Librería de detección de pitch con algoritmo YIN |
| **Web Audio API**  | Procesamiento de audio nativo                    |
| **Service Worker** | Funcionalidad offline                            |
| **Vite**           | Build tool ultrarrápido                          |
| **Sharp**          | Generación automática de iconos PWA              |

## 📁 Estructura del Proyecto

```
calipsotuner/
├── src/
│   ├── lib/
│   │   ├── audio/
│   │   │   ├── audioEngine.ts      # Motor de audio, manejo de stream
│   │   │   ├── pitchDetector.ts    # Detección de pitch con Pitchy
│   │   │   ├── pipeline.ts         # Pipeline de procesamiento
│   │   │   └── index.ts            # Exportaciones
│   │   ├── components/
│   │   │   ├── Tuner.svelte        # Componente principal
│   │   │   ├── TunerNeedle.svelte  # Aguja de indicación
│   │   │   ├── AudioDeviceSelector.svelte
│   │   │   ├── InstrumentSelector.svelte
│   │   │   ├── StringSelector.svelte
│   │   │   ├── SettingsModal.svelte
│   │   │   └── ui/                 # Componentes reutilizables
│   │   ├── stores/
│   │   │   ├── tuner.svelte.ts     # Estado del afinador
│   │   │   ├── audioDevices.svelte.ts
│   │   │   ├── instruments.ts
│   │   │   ├── modal.svelte.ts
│   │   │   └── toast.svelte.ts
│   │   └── utils/
│   ├── routes/
│   │   ├── +layout.svelte          # Layout principal
│   │   ├── +page.svelte            # Página principal
│   │   └── calibrar/               # Ruta de calibración
│   ├── app.html                    # HTML template
│   ├── app.css                     # Estilos globales
│   └── service-worker.ts           # Service worker para offline
├── static/
│   ├── manifest.json               # PWA manifest
│   └── icons/                      # Iconos generados automáticamente
├── svelte.config.js                # Configuración de SvelteKit
├── vite.config.js                  # Configuración de Vite
├── tsconfig.json                   # Configuración de TypeScript
├── vercel.json                     # Configuración de Vercel
└── package.json                    # Dependencias y scripts
```

## 🎛️ Configuración de Instrumentos

### Afinaciones Disponibles

| Instrumento           | Cuerdas | Notas        | Frecuencia Base |
| --------------------- | ------- | ------------ | --------------- |
| **Cuatro Venezolano** | 4       | La-Re-Fa-Si  | A4 = 440Hz      |
| **Cuatro (Alt)**      | 4       | Sol-Do-Mi-La | A4 = 440Hz      |
| **Guitarra**          | 6       | E-A-D-G-B-E  | A4 = 440Hz      |
| **Bajo 5 Cuerdas**    | 5       | B-E-A-D-G    | A4 = 440Hz      |

### Configuración de Audio

| Parámetro                | Valor        | Descripción                                       |
| ------------------------ | ------------ | ------------------------------------------------- |
| **Sample Rate**          | 44100 Hz     | Estándar para móviles, balance latencia/precisión |
| **Latency Hint**         | Interactive  | Baja latencia (~100-200ms)                        |
| **Canales**              | Mono         | Reduce procesamiento CPU                          |
| **Highpass Filter**      | 150 Hz       | Elimina ruido grave/cables                        |
| **Lowpass Filter**       | 2000 Hz      | Corta armónicos > 2KHz                            |
| **Noise Gate**           | -40 dB       | Threshold de silencio                             |
| **Rango de Frecuencias** | 27.5-2000 Hz | A0 a E7 aprox                                     |

### Calibración

- Rango: **432 - 448 Hz** para A4
- Precisión: ±0.5 Hz
- Almacenamiento: LocalStorage (persiste entre sesiones)

## 📱 Optimizaciones Móvil

✅ **Compatibilidad Completa iOS/Android**

- ✓ **Visibility API** - Pausa automáticamente cuando cambias de app
- ✓ **State Change Listener** - Detecta interrupciones (llamadas, notificaciones)
- ✓ **User Gesture Support** - Compatible con iOS Safari (requiere interacción del usuario)
- ✓ **Mono Audio** - Reduce consumo CPU/batería
- ✓ **Offline Support** - Service Worker caches todo localmente
- ✓ **Responsive Design** - Optimizado para 320px - 2400px
- ✓ **Touch Optimized** - Botones 48px+ para usabilidad táctil
- ✓ **Hardware Acceleration** - CSS transforms 3D

## 🔐 Privacidad & Seguridad

- ✅ **Sin conexión a servidor** - Todo procesamiento ocurre localmente
- ✅ **No recolecta datos** - Sin analytics, sin tracking
- ✅ **HTTPS ready** - Funciona con certificados SSL
- ✅ **Permisos únicos** - Solo solicita micrófono cuando es necesario
- ✅ **Open Source** - Código completamente auditable

## 🐛 Reportar Problemas

Encontraste un bug? Abre una issue en [GitHub Issues](https://github.com/enrique89ve/calipsotuner/issues)

**Por favor incluye:**

- Descripción del problema
- Navegador y versión
- Dispositivo (móvil/escritorio)
- Pasos para reproducir
- Screenshots/videos si es posible

## 💡 Contribuciones

Las contribuciones son bienvenidas! Por favor:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia **MIT** - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Créditos

**Desarrollado por:** [enrique89ve](https://github.com/enrique89ve)

**Agradecimientos:**

- Algoritmo YIN por A. de Cheveigné & H. Kawahara
- Librería [Pitchy](https://github.com/pimterry/pitchy) para implementación del YIN
- [SvelteKit](https://kit.svelte.dev/) por el excelente framework
- Comunidad de desarrolladores open source

## 📞 Contacto

- 🌐 GitHub: [@enrique89ve](https://github.com/enrique89ve)
- 📧 Email: jesusjik89@gmail.com

---

⭐ Si te resulta útil, no olvides dejar una estrella en GitHub!
