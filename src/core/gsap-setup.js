/**
 * Registro centralizado de GSAP y todos los plugins requeridos por el proyecto.
 * Prohibido usar bounce o elastic.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { SplitText } from 'gsap/SplitText';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { Flip } from 'gsap/Flip';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(
  ScrollTrigger,
  ScrollToPlugin,
  SplitText,
  Draggable,
  InertiaPlugin,
  Physics2DPlugin,
  Flip,
  DrawSVGPlugin,
  CustomEase
);

export {
  gsap,
  ScrollTrigger,
  ScrollToPlugin,
  SplitText,
  Draggable,
  InertiaPlugin,
  Physics2DPlugin,
  Flip,
  DrawSVGPlugin,
  CustomEase
};
