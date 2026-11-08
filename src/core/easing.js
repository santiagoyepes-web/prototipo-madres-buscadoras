/**
 * Curva maestra única del proyecto: "memoria"
 * Movimiento lento, suave y contemplativo.
 * Prohibidos bounce y elastic en toda la aplicación.
 */
import { gsap, CustomEase } from './gsap-setup.js';

export const MEMORIA_EASE_NAME = 'memoria';
export const MEMORIA_EASE_PATH = 'M0,0 C0.22,0.61 0.36,1 1,1';

export const memoriaEase = CustomEase.create(MEMORIA_EASE_NAME, MEMORIA_EASE_PATH);

// Configurar el ease por defecto de GSAP para mantener consistencia contemplativa
gsap.defaults({
  ease: MEMORIA_EASE_NAME
});

export default MEMORIA_EASE_NAME;
