/**
 * SECCIÓN 3 — LIBROS Y TERRITORIOS POR PAREJAS
 * (Tween flotante yoyo + Draggable/Inertia + gsap.ticker + Physics2DPlugin + SplitText)
 */
import { gsap, Draggable, SplitText } from '../core/gsap-setup.js';
import MEMORIA_EASE_NAME from '../core/easing.js';
import {
  registerSectionController,
  prefersReducedMotion,
  onReducedMotionChange,
  revealSectionText
} from '../core/a11y.js';

const TOTAL_PAIRS = 3;

export function initSeccion3() {
  const arenaEl = document.getElementById('pares-arena');
  const readingEl = document.getElementById('lectura-seccion-3');
  if (!arenaEl || !readingEl) return;

  const tokenElements = Array.from(arenaEl.querySelectorAll('.par-token'));
  const tokens = [];
  const matchedPairs = new Set();
  let isSectionActive = false;
  let selectedKeyboardToken = null;
  let repulsionCooldownUntil = 0;

  tokenElements.forEach((el, idx) => {
    const pairId = el.getAttribute('data-pair') || 'par-a';

    const tokenObj = {
      id: `${pairId}-${idx}`,
      pairId,
      el,
      floatTween: null,
      draggable: null,
      isMatched: false,
      isRepelling: false
    };

    // Accesibilidad por teclado: Enter/Space selecciona un elemento y al elegir el segundo evalúa el par
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleKeyboardPairSelection(tokenObj);
      }
    });

    const [drag] = Draggable.create(el, {
      type: 'x,y',
      bounds: arenaEl,
      inertia: !prefersReducedMotion(),
      edgeResistance: 0.8,
      onPress: () => {
        stopFloating(tokenObj);
      },
      onDragEnd: () => {
        if (!tokenObj.isMatched && !tokenObj.isRepelling && isSectionActive) {
          startFloating(tokenObj);
        }
      },
      onThrowComplete: () => {
        if (!tokenObj.isMatched && !tokenObj.isRepelling && isSectionActive) {
          startFloating(tokenObj);
        }
      }
    });

    tokenObj.draggable = drag;
    tokens.push(tokenObj);
  });

  function startFloating(tokenObj) {
    if (
      prefersReducedMotion() ||
      tokenObj.isMatched ||
      tokenObj.isRepelling ||
      !isSectionActive
    ) {
      return;
    }
    stopFloating(tokenObj);

    const currentX = gsap.getProperty(tokenObj.el, 'x') || 0;
    const currentY = gsap.getProperty(tokenObj.el, 'y') || 0;
    const deltaX = gsap.utils.random(-14, 14);
    const deltaY = gsap.utils.random(-14, 14);
    const duration = gsap.utils.random(4.0, 6.5);

    tokenObj.floatTween = gsap.to(tokenObj.el, {
      x: currentX + deltaX,
      y: currentY + deltaY,
      duration,
      ease: MEMORIA_EASE_NAME,
      yoyo: true,
      repeat: -1
    });
  }

  function stopFloating(tokenObj) {
    if (tokenObj.floatTween) {
      tokenObj.floatTween.kill();
      tokenObj.floatTween = null;
    }
  }

  function startAllFloating() {
    tokens.forEach((t) => startFloating(t));
  }

  function stopAllFloating() {
    tokens.forEach((t) => stopFloating(t));
  }

  function handleKeyboardPairSelection(tokenObj) {
    if (tokenObj.isMatched) return;
    if (!selectedKeyboardToken) {
      selectedKeyboardToken = tokenObj;
      gsap.to(tokenObj.el, {
        scale: 1.08,
        duration: 0.35,
        ease: MEMORIA_EASE_NAME
      });
      return;
    }

    if (selectedKeyboardToken === tokenObj) {
      gsap.to(tokenObj.el, { scale: 1, duration: 0.35 });
      selectedKeyboardToken = null;
      return;
    }

    const first = selectedKeyboardToken;
    selectedKeyboardToken = null;
    gsap.to(first.el, { scale: 1, duration: 0.25 });

    if (first.pairId === tokenObj.pairId) {
      unitePair(first, tokenObj);
    } else {
      repelPair(first, tokenObj);
    }
  }

  // Bucle en gsap.ticker para evaluar colisiones por distancia entre centros
  function checkCollisionsOnTick() {
    if (!isSectionActive) return;
    const activeTokens = tokens.filter((t) => !t.isMatched);
    if (activeTokens.length < 2) return;

    const now = performance.now();

    for (let i = 0; i < activeTokens.length; i++) {
      for (let j = i + 1; j < activeTokens.length; j++) {
        const a = activeTokens[i];
        const b = activeTokens[j];
        if (a.isRepelling || b.isRepelling) continue;

        const rectA = a.el.getBoundingClientRect();
        const rectB = b.el.getBoundingClientRect();

        const centerAX = rectA.left + rectA.width / 2;
        const centerAY = rectA.top + rectA.height / 2;
        const centerBX = rectB.left + rectB.width / 2;
        const centerBY = rectB.top + rectB.height / 2;

        const dist = Math.hypot(centerAX - centerBX, centerAY - centerBY);
        const threshold = (rectA.width + rectB.width) * 0.44;

        if (dist > 0 && dist < threshold) {
          if (a.pairId === b.pairId) {
            unitePair(a, b);
            return;
          } else if (now > repulsionCooldownUntil) {
            repulsionCooldownUntil = now + 750;
            repelPair(a, b, centerAX, centerAY, centerBX, centerBY);
            return;
          }
        }
      }
    }
  }

  function unitePair(tokenA, tokenB) {
    if (tokenA.isMatched || tokenB.isMatched) return;
    tokenA.isMatched = true;
    tokenB.isMatched = true;

    stopFloating(tokenA);
    stopFloating(tokenB);

    if (tokenA.draggable) tokenA.draggable.disable();
    if (tokenB.draggable) tokenB.draggable.disable();

    gsap.killTweensOf([tokenA.el, tokenB.el]);

    const tl = gsap.timeline({
      defaults: { ease: MEMORIA_EASE_NAME },
      onComplete: () => {
        tokenA.el.style.pointerEvents = 'none';
        tokenB.el.style.pointerEvents = 'none';
        tokenA.el.setAttribute('aria-hidden', 'true');
        tokenB.el.setAttribute('aria-hidden', 'true');
        tokenA.el.setAttribute('tabindex', '-1');
        tokenB.el.setAttribute('tabindex', '-1');
      }
    });

    tl.to([tokenA.el, tokenB.el], {
      scale: 1.08,
      duration: 0.45
    }).to([tokenA.el, tokenB.el], {
      opacity: 0,
      scale: 0.94,
      duration: 0.65
    });

    revealPairFragment(tokenA.pairId);
  }

  function repelPair(
    tokenA,
    tokenB,
    cAX = 0,
    cAY = 0,
    cBX = 10,
    cBY = 10
  ) {
    if (prefersReducedMotion()) return;

    tokenA.isRepelling = true;
    tokenB.isRepelling = true;
    stopFloating(tokenA);
    stopFloating(tokenB);

    if (tokenA.draggable && tokenA.draggable.isDragging) {
      tokenA.draggable.endDrag();
    }
    if (tokenB.draggable && tokenB.draggable.isDragging) {
      tokenB.draggable.endDrag();
    }

    const angleRad = Math.atan2(cAY - cBY, cAX - cBX);
    const angleDegA = (angleRad * 180) / Math.PI;
    const angleDegB = angleDegA + 180;
    const velocity = gsap.utils.random(120, 160);

    gsap.to(tokenA.el, {
      duration: 0.95,
      physics2D: {
        velocity,
        angle: angleDegA,
        friction: 0.08
      },
      onUpdate: () => clampTokenInsideArena(tokenA.el),
      onComplete: () => {
        tokenA.isRepelling = false;
        startFloating(tokenA);
      }
    });

    gsap.to(tokenB.el, {
      duration: 0.95,
      physics2D: {
        velocity,
        angle: angleDegB,
        friction: 0.08
      },
      onUpdate: () => clampTokenInsideArena(tokenB.el),
      onComplete: () => {
        tokenB.isRepelling = false;
        startFloating(tokenB);
      }
    });
  }

  function clampTokenInsideArena(el) {
    const arenaRect = arenaEl.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (!arenaRect.width || !arenaRect.height) return;

    let dx = 0;
    let dy = 0;
    if (elRect.left < arenaRect.left + 8) {
      dx = arenaRect.left + 8 - elRect.left;
    } else if (elRect.right > arenaRect.right - 8) {
      dx = arenaRect.right - 8 - elRect.right;
    }

    if (elRect.top < arenaRect.top + 8) {
      dy = arenaRect.top + 8 - elRect.top;
    } else if (elRect.bottom > arenaRect.bottom - 8) {
      dy = arenaRect.bottom - 8 - elRect.bottom;
    }

    if (dx !== 0 || dy !== 0) {
      gsap.set(el, {
        x: `+=${dx}`,
        y: `+=${dy}`
      });
    }
  }

  function revealPairFragment(pairId) {
    if (matchedPairs.has(pairId)) return;
    matchedPairs.add(pairId);

    readingEl.classList.add('is-partial');
    const fragEl = document.getElementById(`fragmento-${pairId}`);
    if (fragEl) {
      fragEl.classList.add('is-visible');
      gsap.set(fragEl, { opacity: 1 });

      if (!prefersReducedMotion()) {
        const targets = fragEl.querySelectorAll('.editorial-subtitle, .editorial-paragraph');
        const split = SplitText.create(targets, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'split-line'
        });
        gsap.fromTo(
          split.lines,
          { yPercent: 105, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.08,
            ease: MEMORIA_EASE_NAME
          }
        );
      } else {
        gsap.fromTo(
          fragEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.7, ease: MEMORIA_EASE_NAME }
        );
      }
    }

    if (matchedPairs.size >= TOTAL_PAIRS) {
      readingEl.classList.add('is-revealed');
      const directBtn = document.querySelector('[data-direct-text="seccion-3"]');
      if (directBtn) directBtn.setAttribute('aria-expanded', 'true');
    }
  }

  onReducedMotionChange((reduced) => {
    if (reduced) {
      stopAllFloating();
    } else if (isSectionActive) {
      startAllFloating();
    }
  });

  registerSectionController('seccion-3', {
    pause: () => {
      isSectionActive = false;
      gsap.ticker.remove(checkCollisionsOnTick);
      stopAllFloating();
    },
    resume: () => {
      isSectionActive = true;
      gsap.ticker.add(checkCollisionsOnTick);
      startAllFloating();
    },
    revealDirectly: () => {
      ['par-a', 'par-b', 'par-c'].forEach((id) => matchedPairs.add(id));
      readingEl.querySelectorAll('.fragment-block').forEach((b) => {
        b.classList.add('is-visible');
      });
      revealSectionText(readingEl, { simpleFade: true });
    }
  });
}
