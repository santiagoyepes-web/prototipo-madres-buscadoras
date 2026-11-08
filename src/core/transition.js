/**
 * Transición de huella dactilar a pantalla completa (#transicion).
 *
 * Requisitos:
 * 1. Capa fija a pantalla completa (#transicion, fondo oscuro #0A0A0A) con fade-in (0.6s)
 *    y pulso sonoro tenue opcional (pulso-huella.wav).
 * 2. La huella se traza con DrawSVGPlugin (cada cresta es un <path>; stagger: 0.04s,
 *    de afuera hacia adentro) y luego se desvanece con opacity.
 * 3. Con la pantalla cubierta, ScrollToPlugin lleva a la sección destino de forma
 *    instantánea (duration: 0, autoKill: false).
 * 4. Se precargan y decodifican las imágenes de la sección destino con Promise.all
 *    en paralelo. Dura mínimo 2s y espera a que la precarga termine (máximo 6s).
 * 5. La huella se destraza y la capa hace fade-out. Todo coordinado en una sola gsap.timeline.
 * 6. Bloquea el scroll y los clics mientras dura la transición.
 * 7. Al terminar, mueve el foco al título de la sección destino.
 * 8. Con prefers-reduced-motion: solo fade de la capa, sin trazado de huella.
 */
import { gsap } from './gsap-setup.js';
import MEMORIA_EASE_NAME from './easing.js';
import { playTransitionPulse, getActiveSectionId } from './audio.js';
import { preloadAndDecodeImages, resolveAssetUrl } from './content-loader.js';
import {
  prefersReducedMotion,
  pauseAllSectionsExcept,
  resumeSection,
  focusElementSafely
} from './a11y.js';

let isTransitioning = false;
let sectionAssetsMap = {};

/**
 * Configura el mapa de imágenes por sección a partir de manifest.json para precarga.
 */
export function configureTransitionAssets(manifest) {
  if (!manifest) return;
  sectionAssetsMap = {
    'seccion-1': [
      manifest.seccion1?.mapa,
      ...(manifest.seccion1?.nodos || [])
    ].map(resolveAssetUrl),
    'seccion-2': [
      ...(manifest.seccion2?.contenedor || []),
      ...(manifest.seccion2?.indicios || [])
    ].map(resolveAssetUrl),
    'seccion-3': [
      ...(manifest.seccion3?.pares?.['par-a'] || []),
      ...(manifest.seccion3?.pares?.['par-b'] || []),
      ...(manifest.seccion3?.pares?.['par-c'] || [])
    ].map(resolveAssetUrl),
    'seccion-4': [manifest.seccion4?.imagen].map(resolveAssetUrl)
  };
}

export function getIsTransitioning() {
  return isTransitioning;
}

/**
 * Ejecuta la transición de huella hacia la sección destino (ej. 'seccion-2' o 'seccion-1').
 * @param {string} targetSectionId ID sin '#' (ej. 'seccion-1', 'seccion-2', 'seccion-3', 'seccion-4')
 * @param {{ onMidpoint?: () => void, onComplete?: () => void }} callbacks
 */
export function runFingerprintTransition(targetSectionId, { onMidpoint, onComplete } = {}) {
  const cleanId = targetSectionId.replace(/^#/, '');
  const targetEl = document.getElementById(cleanId);
  if (!targetEl || isTransitioning) return;

  const overlay = document.getElementById('transicion');
  const ridges = overlay ? overlay.querySelectorAll('.huella-ridge') : [];
  const bgImg = overlay ? overlay.querySelector('.huella-raster-ref') : null;
  const srStatus = overlay ? overlay.querySelector('.transicion-sr-text') : null;

  if (!overlay) {
    gsap.to(window, {
      duration: 0,
      scrollTo: { y: targetEl, autoKill: false }
    });
    return;
  }

  isTransitioning = true;
  document.body.classList.add('is-transitioning');
  overlay.classList.add('is-active');
  overlay.setAttribute('aria-hidden', 'false');
  if (srStatus) {
    srStatus.textContent = 'Cargando sección…';
  }

  // Pausar los bucles activos de la sección saliente
  const currentId = getActiveSectionId();
  if (currentId && currentId !== cleanId) {
    pauseAllSectionsExcept(cleanId);
  }

  // Pulso sonoro tenue opcional
  playTransitionPulse();

  const reduced = prefersReducedMotion();
  const urlsToPreload = sectionAssetsMap[cleanId] || [];

  // Promesa de precarga con máximo de 6 segundos
  const preloadWithTimeout = Promise.race([
    preloadAndDecodeImages(urlsToPreload),
    new Promise((resolve) => setTimeout(resolve, 6000))
  ]);

  // Estado inicial de las crestas antes de la timeline
  if (!reduced && ridges.length) {
    gsap.set(ridges, { drawSVG: '0%', opacity: 1 });
    if (bgImg) gsap.set(bgImg, { opacity: 0 });
  } else if (ridges.length) {
    gsap.set(ridges, { opacity: 0 });
    if (bgImg) gsap.set(bgImg, { opacity: 0.35 });
  }

  const tl = gsap.timeline({
    defaults: { ease: MEMORIA_EASE_NAME },
    onComplete: () => {
      overlay.classList.remove('is-active');
      overlay.setAttribute('aria-hidden', 'true');
      if (srStatus) {
        srStatus.textContent = '';
      }
      document.body.classList.remove('is-transitioning');
      isTransitioning = false;

      // Reanudar sección destino
      resumeSection(cleanId);

      // Mover el foco al título o mapa de la sección destino
      const focusTarget =
        cleanId === 'seccion-1'
          ? targetEl.querySelector('.section-title, #mapa-interactivo-titulo')
          : targetEl.querySelector('.section-title');
      focusElementSafely(focusTarget || targetEl);

      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  });

  // 1. Fade-in de la capa oscura (0.6s)
  tl.fromTo(
    overlay,
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.6 }
  );

  if (!reduced && ridges.length) {
    // 2. Trazado de crestas de afuera hacia adentro con DrawSVGPlugin (0.9s + stagger 0.04s)
    tl.to(
      ridges,
      {
        drawSVG: '100%',
        duration: 0.9,
        stagger: {
          each: 0.04,
          from: 'start' // Las crestas están ordenadas de afuera hacia adentro en el SVG
        }
      },
      '-=0.15'
    );

    if (bgImg) {
      tl.to(bgImg, { opacity: 0.18, duration: 0.45 }, '-=0.5');
    }
  } else {
    // En prefers-reduced-motion: espera contemplativa sin trazado
    tl.to(overlay, { duration: 0.8 });
  }

  // 3. Punto medio con la pantalla cubierta: salto instantáneo con ScrollToPlugin
  tl.add(() => {
    tl.pause();

    gsap.to(window, {
      duration: 0,
      scrollTo: { y: targetEl, autoKill: false }
    });

    if (typeof onMidpoint === 'function') {
      onMidpoint();
    }

    // 4. Esperar a que termine la precarga de imágenes (y garantizar mínimo 2s totales de transición)
    preloadWithTimeout.finally(() => {
      tl.resume();
    });
  });

  // 5. Destrazado de la huella y fade-out de la capa (0.6s)
  if (!reduced && ridges.length) {
    if (bgImg) {
      tl.to(bgImg, { opacity: 0, duration: 0.35 }, '+=0.05');
    }
    tl.to(
      ridges,
      {
        drawSVG: '100% 100%',
        opacity: 0,
        duration: 0.5,
        stagger: {
          each: 0.02,
          from: 'end'
        }
      },
      '<'
    );
  }

  tl.to(overlay, {
    autoAlpha: 0,
    duration: 0.6
  });

  return tl;
}
