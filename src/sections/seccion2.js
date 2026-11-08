/**
 * SECCIÓN 2 — REUNIR INDICIOS (Draggable + InertiaPlugin + Flip + SplitText)
 */
import { gsap, Draggable, Flip } from '../core/gsap-setup.js';
import MEMORIA_EASE_NAME from '../core/easing.js';
import {
  registerSectionController,
  revealSectionText,
  prefersReducedMotion
} from '../core/a11y.js';

export function initSeccion2() {
  const boardEl = document.getElementById('indicios-board');
  const dropzoneEl = document.getElementById('expediente-dropzone');
  const slotsEl = document.getElementById('expediente-slots');
  const statusEl = document.getElementById('expediente-status');
  const readingEl = document.getElementById('lectura-seccion-2');

  if (!boardEl || !dropzoneEl || !slotsEl || !readingEl) return;

  const indicioElements = Array.from(boardEl.querySelectorAll('.indicio-item'));
  const totalIndicios = indicioElements.length;
  let collectedCount = 0;
  let allRevealed = false;
  const draggables = [];

  // Preparar los bloques del texto para la opacidad progresiva antes del revelado final
  const textBlocks = Array.from(readingEl.querySelectorAll('[data-split-line]'));
  gsap.set(textBlocks, { opacity: 0.08 });

  indicioElements.forEach((item) => {
    const collectIndicio = () => {
      if (item.classList.contains('is-collected')) return;

      const dragInstance = Draggable.get(item);
      if (dragInstance) {
        dragInstance.disable();
      }

      dropzoneEl.classList.remove('is-over');

      // Capturar estado con Flip antes de mover el nodo al contenedor del expediente
      const flipState = Flip.getState(item);

      gsap.set(item, { clearProps: 'x,y' });
      item.classList.add('is-collected');
      item.setAttribute('tabindex', '-1');
      item.setAttribute('aria-disabled', 'true');
      slotsEl.appendChild(item);

      Flip.from(flipState, {
        duration: prefersReducedMotion() ? 0.2 : 0.65,
        ease: MEMORIA_EASE_NAME,
        scale: true
      });

      collectedCount += 1;
      updateIndiciosProgress();
    };

    // Accesibilidad por teclado: Enter o Space coloca el indicio en el expediente
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        collectIndicio();
      }
    });

    // Crear Draggable con InertiaPlugin
    const [drag] = Draggable.create(item, {
      type: 'x,y',
      bounds: boardEl,
      inertia: !prefersReducedMotion(),
      edgeResistance: 0.75,
      onDrag: function () {
        const isHit = this.hitTest(dropzoneEl, '50%');
        dropzoneEl.classList.toggle('is-over', isHit);
      },
      onDragEnd: function () {
        if (this.hitTest(dropzoneEl, '50%')) {
          gsap.killTweensOf(item);
          collectIndicio();
        } else {
          dropzoneEl.classList.remove('is-over');
          // Regresa suavemente a su lugar con power3.out en 0.5s
          gsap.killTweensOf(item);
          gsap.to(item, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: 'power3.out'
          });
        }
      }
    });

    if (drag) {
      draggables.push(drag);
    }
  });

  function updateIndiciosProgress() {
    if (statusEl) {
      statusEl.textContent = `${collectedCount} / ${totalIndicios} indicios reunidos`;
    }

    if (allRevealed) return;

    readingEl.classList.add('is-partial');
    const ratio = collectedCount / totalIndicios;
    const activeLinesCount = Math.ceil(textBlocks.length * ratio);

    textBlocks.forEach((block, i) => {
      const targetOpacity = i < activeLinesCount ? 0.35 + ratio * 0.35 : 0.12;
      gsap.to(block, {
        opacity: targetOpacity,
        duration: 0.6,
        ease: MEMORIA_EASE_NAME
      });
    });

    if (collectedCount >= totalIndicios) {
      allRevealed = true;
      const directBtn = document.querySelector('[data-direct-text="seccion-2"]');
      if (directBtn) directBtn.setAttribute('aria-expanded', 'true');
      revealSectionText(readingEl, { simpleFade: prefersReducedMotion() });
    }
  }

  registerSectionController('seccion-2', {
    pause: () => {
      draggables.forEach((d) => {
        if (d.isThrowing) {
          gsap.killTweensOf(d.target);
        }
      });
    },
    resume: () => {},
    revealDirectly: () => {
      allRevealed = true;
      revealSectionText(readingEl, { simpleFade: true });
    }
  });
}
