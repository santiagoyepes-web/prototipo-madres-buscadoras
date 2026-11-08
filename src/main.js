/**
 * Punto de entrada principal — Buscadoras: entre el duelo y la justicia
 */
import { gsap } from './core/gsap-setup.js';
import MEMORIA_EASE_NAME from './core/easing.js';
import {
  loadAllContent,
  renderEditorialText,
  fixSvgImageElement
} from './core/content-loader.js';
import {
  initMatchMedia,
  registerSectionController,
  triggerDirectTextReveal,
  revealSectionText,
  focusElementSafely
} from './core/a11y.js';
import { initAudioSystem } from './core/audio.js';
import {
  configureTransitionAssets,
  runFingerprintTransition
} from './core/transition.js';
import { initSeccion1 } from './sections/seccion1.js';
import { initSeccion2 } from './sections/seccion2.js';
import { initSeccion3 } from './sections/seccion3.js';
import { initSeccion4 } from './sections/seccion4.js';

async function bootstrap() {
  initMatchMedia();

  // 1. Conectar botones de huella "Volver al inicio (Sección 1)" y lectura directa de inmediato
  setupHomeFingerprintButtons();
  setupDirectReadingButtons();

  // 3. Cargar textos de /content/*.json y manifest.json
  let data;
  try {
    data = await loadAllContent();
  } catch (err) {
    console.error('Error al cargar /content/*.json:', err);
    return;
  }

  const { manifest, secciones } = data;

  // 4. Poblar el DOM desde el inicio con TODOS los textos de /content/seccion1..4.json
  //    para garantizar accesibilidad total con lectores de pantalla.
  populateSectionDOM(1, secciones[1]);
  populateSectionDOM(2, secciones[2]);
  populateSectionDOM(3, secciones[3]);
  populateSectionDOM(4, secciones[4]);

  // 5. Configurar precarga de recursos para la transición de huella
  configureTransitionAssets(manifest);

  // 6. Inicializar cada sección
  initSeccion1({ manifest, content: secciones[1] });
  initSeccion2({ manifest, content: secciones[2] });
  initSeccion3({ manifest, content: secciones[3] });
  initSeccion4({ manifest, content: secciones[4] });

  // 7. Inicializar sistema de audio con ScrollTrigger
  initAudioSystem(manifest, (activeSectionId) => {
    updateActiveHomeButtons(activeSectionId);
  });
}

function populateSectionDOM(num, sectionData) {
  if (!sectionData) return;
  const titleEl = document.getElementById(`titulo-seccion-${num}`);
  if (titleEl && sectionData.titulo) {
    titleEl.textContent = sectionData.titulo;
  }

  const readingEl = document.getElementById(`lectura-seccion-${num}`);
  if (!readingEl) return;

  if (num === 3 && Array.isArray(sectionData.fragmentos) && sectionData.fragmentos.length) {
    // En la Sección 3 estructuramos los 3 fragmentos (par-a, par-b, par-c) que conforman el texto completo
    readingEl.innerHTML = sectionData.fragmentos
      .map(
        (frag) => `
        <div class="fragment-block" id="fragmento-${frag.id}" data-fragment-id="${frag.id}">
          ${renderEditorialText(frag.texto, sectionData.subtitulos)}
        </div>
      `
      )
      .join('\n');
  } else {
    readingEl.innerHTML = renderEditorialText(
      sectionData.textoCompleto,
      sectionData.subtitulos
    );
  }

  // Registrar controlador por defecto si la sección aún no ha registrado uno propio
  const sectionId = `seccion-${num}`;
  registerSectionController(sectionId, {
    revealDirectly: () => {
      revealSectionText(readingEl, { simpleFade: true });
      const btn = document.querySelector(`[data-direct-text="${sectionId}"]`);
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
  });
}

function setupHomeFingerprintButtons() {
  const homeBtns = document.querySelectorAll('[data-home-btn]');
  homeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const originSection = btn.getAttribute('data-home-btn');
      if (originSection === 'seccion-1') {
        // En la sección 1 indica estado activo y lleva al tope del mapa suavemente
        gsap.to(window, {
          duration: 0.8,
          scrollTo: { y: '#seccion-1', autoKill: false },
          ease: MEMORIA_EASE_NAME,
          onComplete: () => {
            focusElementSafely('#titulo-seccion-1');
          }
        });
      } else {
        // En las secciones 2, 3 o 4 ejecuta la transición de huella dactilar y regresa a #seccion-1
        runFingerprintTransition('seccion-1');
      }
    });
  });
}

function updateActiveHomeButtons(activeSectionId) {
  document.querySelectorAll('[data-home-btn]').forEach((btn) => {
    const isHome = activeSectionId === 'seccion-1' && btn.getAttribute('data-home-btn') === 'seccion-1';
    btn.classList.toggle('is-home-active', isHome);
    if (isHome) {
      btn.setAttribute('aria-current', 'location');
    } else {
      btn.removeAttribute('aria-current');
    }
  });
}

function setupDirectReadingButtons() {
  const directBtns = document.querySelectorAll('[data-direct-text]');
  directBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const sectionId = btn.getAttribute('data-direct-text');
      btn.setAttribute('aria-expanded', 'true');
      triggerDirectTextReveal(sectionId);
      const readingEl = document.getElementById(`lectura-${sectionId}`);
      if (readingEl) {
        focusElementSafely(readingEl);
      }
    });
  });
}

bootstrap();
