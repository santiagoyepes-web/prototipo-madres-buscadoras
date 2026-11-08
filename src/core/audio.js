/**
 * Módulo de audio ambiental por sección conectado a ScrollTrigger.
 * - Máximo 25% de volumen (0.25).
 * - Fade-in y fade-out suaves de 1.5s con gsap.to y curva "memoria".
 * - Desbloqueo tras el primer gesto del usuario (política Autoplay).
 * - Con prefers-reduced-motion inicia silenciado por defecto.
 * - Botón global visible con aria-pressed para activar/silenciar sonido.
 */
import { gsap, ScrollTrigger } from './gsap-setup.js';
import MEMORIA_EASE_NAME from './easing.js';
import { resolveAssetUrl } from './content-loader.js';
import {
  prefersReducedMotion,
  onReducedMotionChange,
  resumeSection,
  pauseSection
} from './a11y.js';

const MAX_VOLUME = 0.25;
const FADE_DURATION = 1.5;

const audioElements = new Map();
let pulseAudio = null;
let isUnlocked = false;
let isMuted = false;
let activeSectionId = 'seccion-1';
let muteBtnEl = null;

/**
 * Inicializa el sistema de audio y los triggers de entrada/salida de cada sección.
 * @param {object} manifest Objeto manifest.json cargado
 * @param {(sectionId: string) => void} onSectionChange Callback cuando cambia la sección activa
 */
export function initAudioSystem(manifest, onSectionChange) {
  // Con prefers-reduced-motion, iniciar silenciado por defecto
  isMuted = prefersReducedMotion();

  const sectionConfigs = [
    { id: 'seccion-1', path: manifest?.seccion1?.audioEntrada },
    { id: 'seccion-2', path: manifest?.seccion2?.audioEntrada },
    { id: 'seccion-3', path: manifest?.seccion3?.audioEntrada },
    { id: 'seccion-4', path: manifest?.seccion4?.audioEntrada }
  ];

  sectionConfigs.forEach(({ id, path }) => {
    if (!path) return;
    const audio = new Audio(resolveAssetUrl(path));
    audio.loop = true;
    // Evitar saturar la red al inicio ya que ambiente-seccion1.wav pesa ~99 MB
    audio.preload = 'none';
    audio.volume = 0;
    audioElements.set(id, audio);
  });

  if (manifest?.ui?.sonidoHuella) {
    pulseAudio = new Audio(resolveAssetUrl(manifest.ui.sonidoHuella));
    pulseAudio.loop = false;
    pulseAudio.preload = 'metadata';
    pulseAudio.volume = 0.18;
  }

  muteBtnEl = document.getElementById('btn-audio-toggle');
  if (muteBtnEl) {
    updateMuteButtonUI();
    muteBtnEl.addEventListener('click', () => {
      unlockAudioContext();
      toggleMute();
    });
  }

  // Escuchar cambios en prefers-reduced-motion
  onReducedMotionChange((reduced) => {
    if (reduced && !isMuted) {
      setMuted(true);
    }
  });

  // Desbloquear audio tras el primer gesto del usuario en cualquier parte del documento
  const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
  const handleFirstGesture = (e) => {
    // Si el clic fue directamente en el botón de mute, su propio listener lo maneja
    if (muteBtnEl && muteBtnEl.contains(e.target)) return;
    unlockAudioContext();
    unlockEvents.forEach((evt) =>
      window.removeEventListener(evt, handleFirstGesture, { capture: true })
    );
  };

  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, handleFirstGesture, { capture: true, passive: true })
  );

  // Configurar ScrollTrigger para cada una de las 4 secciones
  sectionConfigs.forEach(({ id }) => {
    const sectionEl = document.getElementById(id);
    if (!sectionEl) return;

    ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => handleSectionEnter(id, onSectionChange),
      onEnterBack: () => handleSectionEnter(id, onSectionChange),
      onLeave: () => handleSectionLeave(id),
      onLeaveBack: () => handleSectionLeave(id)
    });
  });
}

function handleSectionEnter(sectionId, onSectionChange) {
  const previousId = activeSectionId;
  activeSectionId = sectionId;

  if (previousId && previousId !== sectionId) {
    fadeOutSectionAudio(previousId);
    pauseSection(previousId);
  }

  resumeSection(sectionId);
  fadeInSectionAudio(sectionId);

  if (typeof onSectionChange === 'function') {
    onSectionChange(sectionId);
  }
}

function handleSectionLeave(sectionId) {
  fadeOutSectionAudio(sectionId);
  pauseSection(sectionId);
}

function unlockAudioContext() {
  if (isUnlocked) return;
  isUnlocked = true;

  if (!isMuted && activeSectionId) {
    fadeInSectionAudio(activeSectionId);
  }
}

/**
 * Reproduce el sonido de la sección con fade-in suave de 0 a 0.25 en 1.5s.
 */
export function fadeInSectionAudio(sectionId) {
  const audio = audioElements.get(sectionId);
  if (!audio) return;

  gsap.killTweensOf(audio);

  if (isMuted || !isUnlocked) {
    audio.volume = 0;
    return;
  }

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // Autoplay aún restringido hasta el próximo gesto
    });
  }

  gsap.to(audio, {
    volume: MAX_VOLUME,
    duration: FADE_DURATION,
    ease: MEMORIA_EASE_NAME,
    overwrite: true
  });
}

/**
 * Hace fade-out de 1.5s del sonido de la sección y pausa al llegar a 0.
 */
export function fadeOutSectionAudio(sectionId) {
  const audio = audioElements.get(sectionId);
  if (!audio) return;

  gsap.killTweensOf(audio);
  gsap.to(audio, {
    volume: 0,
    duration: FADE_DURATION,
    ease: MEMORIA_EASE_NAME,
    overwrite: true,
    onComplete: () => {
      if (audio.volume <= 0.01) {
        audio.pause();
      }
    }
  });
}

/**
 * Reproduce un pulso sonoro tenue opcional durante la transición de huella.
 */
export function playTransitionPulse() {
  if (!pulseAudio || isMuted || !isUnlocked) return;
  try {
    pulseAudio.currentTime = 0;
    pulseAudio.volume = 0.16;
    pulseAudio.play().catch(() => {});
  } catch {
    // Ignorar si el navegador bloquea la reproducción
  }
}

export function toggleMute() {
  setMuted(!isMuted);
}

export function setMuted(mutedState) {
  isMuted = Boolean(mutedState);
  updateMuteButtonUI();

  if (isMuted) {
    for (const [id] of audioElements.entries()) {
      fadeOutSectionAudio(id);
    }
  } else {
    unlockAudioContext();
    if (activeSectionId) {
      fadeInSectionAudio(activeSectionId);
    }
  }
}

function updateMuteButtonUI() {
  if (!muteBtnEl) return;
  // aria-pressed="true" cuando el sonido está silenciado o según etiqueta del control
  // Usaremos aria-pressed para indicar si el sonido está ACTIVO (true = sonido activo, false = silenciado)
  // y actualizaremos el texto e icono claramente.
  const isSoundActive = !isMuted;
  muteBtnEl.setAttribute('aria-pressed', String(isSoundActive));
  muteBtnEl.setAttribute(
    'aria-label',
    isSoundActive ? 'Silenciar sonido ambiental' : 'Activar sonido ambiental'
  );
  const labelSpan = muteBtnEl.querySelector('.btn-ui-label');
  if (labelSpan) {
    labelSpan.textContent = isSoundActive ? 'Sonido: Activo' : 'Sonido: Silenciado';
  }
  muteBtnEl.classList.toggle('is-muted', isMuted);
}

export function getActiveSectionId() {
  return activeSectionId;
}
