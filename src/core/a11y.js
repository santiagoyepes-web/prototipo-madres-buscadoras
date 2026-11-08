/**
 * Utilidades de accesibilidad, gestión de prefers-reduced-motion con gsap.matchMedia(),
 * revelado de texto con SplitText y control de pausa por sección.
 */
import { gsap, SplitText } from './gsap-setup.js';
import MEMORIA_EASE_NAME from './easing.js';

const sectionRegistry = new Map();
let isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reducedMotionListeners = new Set();

/**
 * Inicializa gsap.matchMedia() para escuchar cambios en prefers-reduced-motion.
 */
export function initMatchMedia() {
  const mm = gsap.matchMedia();

  mm.add(
    {
      isReduced: '(prefers-reduced-motion: reduce)',
      isNormal: '(prefers-reduced-motion: no-preference)'
    },
    (context) => {
      isReducedMotion = Boolean(context.conditions.isReduced);
      document.documentElement.classList.toggle('reduced-motion', isReducedMotion);
      reducedMotionListeners.forEach((cb) => cb(isReducedMotion));
    }
  );
}

export function prefersReducedMotion() {
  return isReducedMotion;
}

export function onReducedMotionChange(callback) {
  reducedMotionListeners.add(callback);
  return () => reducedMotionListeners.delete(callback);
}

/**
 * Registra los controladores de ciclo de vida de cada sección (pause, resume, revealDirectly).
 * @param {string} sectionId Ej: 'seccion-1'
 * @param {{ pause?: () => void, resume?: () => void, revealDirectly?: () => void }} handlers
 */
export function registerSectionController(sectionId, handlers) {
  sectionRegistry.set(sectionId, handlers);
}

export function pauseSection(sectionId) {
  const ctrl = sectionRegistry.get(sectionId);
  if (ctrl && typeof ctrl.pause === 'function') {
    ctrl.pause();
  }
}

export function pauseAllSectionsExcept(activeSectionId) {
  for (const [id, ctrl] of sectionRegistry.entries()) {
    if (id !== activeSectionId && ctrl && typeof ctrl.pause === 'function') {
      ctrl.pause();
    }
  }
}

export function resumeSection(sectionId) {
  const ctrl = sectionRegistry.get(sectionId);
  if (ctrl && typeof ctrl.resume === 'function') {
    ctrl.resume();
  }
}

export function triggerDirectTextReveal(sectionId) {
  const ctrl = sectionRegistry.get(sectionId);
  if (ctrl && typeof ctrl.revealDirectly === 'function') {
    ctrl.revealDirectly();
  }
}

/**
 * Revela un contenedor de texto completo usando SplitText con máscara por línea
 * (0.9s por línea, stagger: 0.08s, curva "memoria"), o un fade simple si
 * prefers-reduced-motion está activo o si es lectura directa.
 *
 * El texto permanece siempre en el DOM para lectores de pantalla.
 *
 * @param {HTMLElement} containerEl Contenedor del artículo de texto
 * @param {{ simpleFade?: boolean, onComplete?: () => void }} options
 */
export function revealSectionText(containerEl, { simpleFade = false, onComplete } = {}) {
  if (!containerEl) return null;

  containerEl.classList.add('is-revealed');
  containerEl.setAttribute('aria-hidden', 'false');

  // Asegurar que todos los bloques hijos tengan opacidad 1 base
  const blocks = containerEl.querySelectorAll('[data-split-line], .fragment-block');
  gsap.set(blocks, { opacity: 1 });

  if (simpleFade || isReducedMotion) {
    return gsap.fromTo(
      containerEl,
      { opacity: 0, y: 0 },
      {
        opacity: 1,
        duration: 0.75,
        ease: MEMORIA_EASE_NAME,
        onComplete
      }
    );
  }

  gsap.set(containerEl, { opacity: 1 });

  const targets = containerEl.querySelectorAll('.editorial-subtitle, .editorial-paragraph');
  if (!targets.length) {
    if (onComplete) onComplete();
    return null;
  }

  // Revertir SplitText previo si existía
  if (containerEl._splitInstance) {
    containerEl._splitInstance.revert();
  }

  const split = SplitText.create(targets, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line'
  });
  containerEl._splitInstance = split;

  return gsap.fromTo(
    split.lines,
    { yPercent: 105, opacity: 0 },
    {
      yPercent: 0,
      opacity: 1,
      duration: 0.9,
      stagger: 0.08,
      ease: MEMORIA_EASE_NAME,
      onComplete
    }
  );
}

/**
 * Mueve el foco de teclado de forma segura a un elemento sin provocar saltos bruscos de scroll.
 * @param {HTMLElement | string} target
 */
export function focusElementSafely(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
}
