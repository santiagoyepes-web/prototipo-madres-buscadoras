/**
 * SECCIÓN 1 — MAPA INTERACTIVO (hover + linterna + transición de huella)
 */
import { gsap, SplitText } from '../core/gsap-setup.js';
import MEMORIA_EASE_NAME from '../core/easing.js';
import { resolveAssetUrl } from '../core/content-loader.js';
import {
  registerSectionController,
  revealSectionText,
  prefersReducedMotion,
  focusElementSafely
} from '../core/a11y.js';
import {
  runFingerprintTransition,
  getIsTransitioning
} from '../core/transition.js';

const NODE_COORDS = [
  { xPercent: 48, yPercent: 25 },
  { xPercent: 56, yPercent: 46 },
  { xPercent: 29, yPercent: 56 },
  { xPercent: 46, yPercent: 72 }
];

export async function initSeccion1({ manifest }) {
  const mapHolder = document.getElementById('map-svg-holder');
  const nodesHolder = document.getElementById('map-nodes-holder');
  const mapCanvasBox = document.getElementById('map-canvas-box');
  const readingEl = document.getElementById('lectura-seccion-1');

  if (!mapHolder || !nodesHolder || !mapCanvasBox) return;

  let isSectionActive = true;
  let activeTouchNode = null;
  let textRevealed = false;

  // 1. Cargar e inyectar el SVG inline del mapa (/assets/map/mapa.svg) para estilizar su trazo
  const mapUrl = resolveAssetUrl(manifest?.seccion1?.mapa || 'map/mapa.svg');
  try {
    const svgText = await fetch(mapUrl).then((r) => r.text());
    if (svgText && svgText.includes('<svg')) {
      mapHolder.innerHTML = svgText;
      const svgEl = mapHolder.querySelector('svg');
      if (svgEl) {
        svgEl.setAttribute('aria-hidden', 'true');
        svgEl.setAttribute('focusable', 'false');
      }
    }
  } catch {
    // Si falla el fetch, se conserva el <img src="./assets/map/mapa.svg"> pre-renderizado en index.html
  }

  // 2. Enlazar los 4 nodos interactivos presentes en #map-nodes-holder
  const nodeElements = Array.from(nodesHolder.querySelectorAll('.map-node-btn'));

  nodeElements.forEach((btn, idx) => {
    const coords = NODE_COORDS[idx] || { xPercent: 50, yPercent: 50 };

    // Configurar SplitText en la etiqueta del nodo para animar al hacer hover/focus
    const labelTextEl = btn.querySelector('.map-node-label-text');
    let labelSplit = null;
    if (labelTextEl) {
      labelSplit = SplitText.create(labelTextEl, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line'
      });
    }

    const showNodeHover = () => {
      if (getIsTransitioning()) return;
      btn.classList.add('is-hovered');
      gsap.to(mapHolder, {
        opacity: 0.68,
        filter: 'brightness(0.95)',
        duration: 0.5,
        ease: MEMORIA_EASE_NAME,
        overwrite: 'auto'
      });

      if (labelSplit && !prefersReducedMotion()) {
        gsap.killTweensOf(labelSplit.lines);
        gsap.fromTo(
          labelSplit.lines,
          { yPercent: 100, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.65,
            stagger: 0.06,
            ease: MEMORIA_EASE_NAME
          }
        );
      }
    };

    const hideNodeHover = () => {
      btn.classList.remove('is-hovered');
      if (activeTouchNode === btn) {
        activeTouchNode = null;
      }
      gsap.to(mapHolder, {
        opacity: 0.46,
        filter: 'brightness(0.75)',
        duration: 0.6,
        ease: MEMORIA_EASE_NAME,
        overwrite: 'auto'
      });
    };

    const triggerNodeAction = () => {
      if (getIsTransitioning()) return;
      const targetId = btn.getAttribute('data-target');
      if (targetId === 'seccion-1') {
        revealSeccion1Text(false);
        focusElementSafely(readingEl);
      } else {
        runFingerprintTransition(targetId);
      }
    };

    btn.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        showNodeHover();
      }
    });

    btn.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        hideNodeHover();
      }
    });

    btn.addEventListener('focus', () => {
      showNodeHover();
    });

    btn.addEventListener('blur', () => {
      hideNodeHover();
    });

    // En táctil: primer tap sobre el nodo = estado hover; segundo tap = transición
    btn.addEventListener('pointerup', (e) => {
      if (getIsTransitioning()) return;
      if (e.pointerType === 'touch') {
        e.preventDefault();
        if (activeTouchNode !== btn) {
          if (activeTouchNode) {
            activeTouchNode.classList.remove('is-hovered');
          }
          activeTouchNode = btn;
          moveFlashlightToPercent(coords.xPercent, coords.yPercent);
          showNodeHover();
        } else {
          activeTouchNode = null;
          triggerNodeAction();
        }
      }
    });

    btn.addEventListener('click', (e) => {
      if (e.pointerType === 'touch') return;
      triggerNodeAction();
    });
  });

  // 3. Linterna radial con gsap.quickTo (0.35s de respuesta suave al cursor)
  const lightPos = { x: 50, y: 50 };
  const quickX = gsap.quickTo(lightPos, 'x', {
    duration: 0.35,
    ease: MEMORIA_EASE_NAME,
    onUpdate: updateFlashlightRender
  });
  const quickY = gsap.quickTo(lightPos, 'y', {
    duration: 0.35,
    ease: MEMORIA_EASE_NAME
  });

  function updateFlashlightRender() {
    mapCanvasBox.style.setProperty('--flashlight-x', `${lightPos.x.toFixed(2)}%`);
    mapCanvasBox.style.setProperty('--flashlight-y', `${lightPos.y.toFixed(2)}%`);

    NODE_COORDS.forEach((coords, index) => {
      const nodeEl = nodeElements[index];
      if (!nodeEl) return;
      const dx = lightPos.x - coords.xPercent;
      const dy = lightPos.y - coords.yPercent;
      const dist = Math.hypot(dx, dy);
      nodeEl.classList.toggle('is-near-light', dist < 24);
    });
  }

  function moveFlashlightToPercent(xPct, yPct) {
    if (prefersReducedMotion()) {
      lightPos.x = xPct;
      lightPos.y = yPct;
      updateFlashlightRender();
    } else {
      quickX(xPct);
      quickY(yPct);
    }
  }

  const handlePointerMove = (e) => {
    if (!isSectionActive || getIsTransitioning()) return;
    const rect = mapCanvasBox.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = gsap.utils.clamp(-10, 110, relX);
    const clampedY = gsap.utils.clamp(-10, 110, relY);

    moveFlashlightToPercent(clampedX, clampedY);

    if (relX >= 0 && relX <= 100 && relY >= 0 && relY <= 100) {
      gsap.to(mapHolder, {
        opacity: 0.58,
        filter: 'brightness(0.88)',
        duration: 0.45,
        ease: MEMORIA_EASE_NAME,
        overwrite: 'auto'
      });
    }
  };

  const sectionEl = document.getElementById('seccion-1');
  if (sectionEl) {
    sectionEl.addEventListener('pointermove', handlePointerMove, { passive: true });
    sectionEl.addEventListener('pointerdown', (e) => {
      if (activeTouchNode && !activeTouchNode.contains(e.target)) {
        activeTouchNode.classList.remove('is-hovered');
        activeTouchNode = null;
      }
    });
  }

  function revealSeccion1Text(simpleFade = false) {
    if (!readingEl) return;
    textRevealed = true;
    const directBtn = document.querySelector('[data-direct-text="seccion-1"]');
    if (directBtn) directBtn.setAttribute('aria-expanded', 'true');
    revealSectionText(readingEl, { simpleFade });
  }

  registerSectionController('seccion-1', {
    pause: () => {
      isSectionActive = false;
    },
    resume: () => {
      isSectionActive = true;
    },
    revealDirectly: () => {
      if (!textRevealed) {
        revealSeccion1Text(true);
      } else {
        revealSectionText(readingEl, { simpleFade: true });
      }
    }
  });
}
