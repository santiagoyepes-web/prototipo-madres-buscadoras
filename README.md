# Buscadoras: entre el duelo y la justicia

Sitio web interactivo y documental de cuatro secciones sobre la lucha de las mujeres buscadoras en Colombia frente a la desaparición forzada, el Acuerdo de Paz de 2016, la Ley 2364 de 2024 y las geografías de búsqueda en el Valle del Cauca.

---

## Cómo ejecutar el proyecto

### Requisitos previos
- **Node.js** (v18 o superior) y **npm**.

### Instalación y desarrollo
```bash
# 1. Instalar dependencias (Vite + GSAP 3.13+)
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar versión de producción
npm run build

# 4. Previsualizar compilación de producción
npm run preview
```

---

## Arquitectura del Proyecto

```text
Prototipo/
├── index.html
├── package.json
├── vite.config.js
├── assets/                   # Recursos originales de solo lectura (audio, fuentes, iconos, mapa, puzzle)
├── content/                  # Textos de investigación y manifest.json (solo lectura)
├── docs/                     # Brief, guía de estilos y referencias (solo lectura)
└── src/
    ├── main.js               # Inicialización global, inyección de textos al DOM y eventos UI
    ├── styles/
    │   ├── variables.css     # Paleta oficial, @font-face locales y escala clamp()
    │   ├── base.css          # Layout 100dvh, zonas seguras (--safe-zone-ui) y accesibilidad
    │   └── sections.css      # Estilos de #transicion y tableros interactivos (Secciones 1–4)
    ├── core/
    │   ├── gsap-setup.js     # Registro centralizado de los 9 plugins de GSAP
    │   ├── easing.js         # Definición única de CustomEase "memoria"
    │   ├── audio.js          # Audio ambiental por sección con ScrollTrigger y fade de 1.5s
    │   ├── transition.js     # Transición de pantalla completa con huella dactilar
    │   ├── a11y.js           # gsap.matchMedia() (prefers-reduced-motion), foco y lectura directa
    │   └── content-loader.js # Carga de JSON y resolución segura de rutas con caracteres especiales
    └── sections/
        ├── seccion1.js       # Mapa interactivo en penumbra + linterna radial + 4 nodos
        ├── seccion2.js       # Reunir 5 indicios en el expediente central
        ├── seccion3.js       # Unir 3 pares de libros y territorios con colisiones y repulsión
        └── seccion4.js       # Rompecabezas de memoria (3x3 móvil / 4x4 escritorio)
```

---

## Tabla de Plugins de GSAP por Sección y Módulo

| Plugin / Utilidad GSAP | Módulo Core (`/src/core/`) | Sección 1 (Mapa) | Sección 2 (Indicios) | Sección 3 (Pares) | Sección 4 (Rompecabezas) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`CustomEase` (`"memoria"`)** | `easing.js` / `transition.js` / `audio.js` | Linterna, hover de mapa y etiquetas | Encaje de indicios y revelado de texto | Flotación, unión de pares y revelado | Encaje de piezas, respiración y revelado |
| **`ScrollTrigger`** | `audio.js` (fades de audio y pausa de sección en `onEnter`/`onLeave`) | Activa sonido `ambiente-seccion1.wav` | Activa sonido `ambiente-seccion2.wav` | Activa sonido `ambiente-seccion3.wav` y ticker | Activa sonido `ambiente-seccion4.wav` |
| **`ScrollToPlugin`** | `transition.js` / `main.js` | Navegación hacia secciones 2, 3, 4 y tope del home | Botón de huella de retorno a `#seccion-1` | Botón de huella de retorno a `#seccion-1` | Botón de huella de retorno a `#seccion-1` |
| **`DrawSVGPlugin`** | `transition.js` | Trazado y destrazado de crestas de huella (`stagger: 0.04s`) | Transición de retorno al mapa principal | Transición de retorno al mapa principal | Transición de retorno al mapa principal |
| **`SplitText`** | `a11y.js` | Etiquetas de los 4 nodos y texto completo de Sección 1 | Revelado por líneas con máscara al reunir los 5 indicios | Revelado de cada fragmento (`par-a`, `par-b`, `par-c`) | Revelado del texto completo al armar el rompecabezas |
| **`Draggable`** | `gsap-setup.js` | — | Arrastre de los 5 indicios y `hitTest("50%")` | Arrastre de libros y símbolos territoriales | Arrastre de piezas y `hitTest` sobre su casilla |
| **`InertiaPlugin`** | `gsap-setup.js` | — | Inercia suave al arrastrar/soltar indicios | Lanzamiento con inercia dentro de los límites | — |
| **`Flip`** | `gsap-setup.js` | — | Acomodo fluido (`0.65s`) del indicio dentro del expediente | — | Encaje fluido (`0.65s`) de cada pieza en su casilla |
| **`Physics2DPlugin`** | `gsap-setup.js` | — | — | Repulsión suave (`velocity: 120–160`, `friction: 0.08`) al tocarse pares distintos | — |
| **`gsap.quickTo` / `gsap.ticker` / `gsap.utils`** | `a11y.js` (`gsap.matchMedia`) | `gsap.quickTo` (`0.35s`) para la linterna del cursor | — | `gsap.ticker` (distancias) y `gsap.utils.random` (flotación) | `gsap.utils.shuffle` para mezclar piezas |

---

## Accesibilidad y Decisiones Técnicas

1. **Textos íntegros en el DOM:** Todos los textos de `/content/seccion1.json` a `/content/seccion4.json` se inyectan completos desde el arranque en contenedores `<article>` semánticos para lectores de pantalla.
2. **Lectura directa sin barreras:** Cada sección cuenta con el botón visible **"Ver texto directamente"** en la zona segura superior derecha, que salta la mecánica interactiva y muestra el texto con un fade suave.
3. **`prefers-reduced-motion`:** Gestionado con `gsap.matchMedia()`. Desactiva flotación, inercia, física de repulsión y trazado de crestas de la huella (usando únicamente fades de opacidad), e inicia con el audio silenciado por defecto.
4. **Teclado, ratón y táctil:** Todos los nodos, indicios, libros y piezas del rompecabezas son operables mediante puntero (mouse/touch) y mediante teclado (`Tab` + `Enter`/`Space`), con `aria-label` descriptivos y foco visible (`#FFEB99`).
5. **Daltonismo en Sección 3:** Además del color de cada par (verde, azul, amarillo), cada par cuenta con un símbolo geométrico (`◆`, `●`, `▲`) y un patrón de borde distinto (continuo, discontinuo, doble).
