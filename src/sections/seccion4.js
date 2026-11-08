/**
 * SECCIÓN 4 — ROMPECABEZAS DE MEMORIA (3x3 móvil / 4x4 escritorio)
 *
 * Requisitos:
 * - Imagen /assets/puzzle/madres_puzzle.jpg dividida en una rejilla
 *   (3x3 móvil, 4x4 escritorio) mediante piezas generadas con background-position.
 * - Piezas mezcladas con gsap.utils.shuffle.
 * - Draggable con snap/hitTest sobre su casilla correcta.
 * - Pieza correcta: encaja con Flip (0.65s, ease "memoria") y se bloquea.
 *   Incorrecta: regresa suavemente a la bandeja (0.5s, ease "power3.out").
 * - Al completar: se eliminan las costuras entre piezas, la última pieza deja por
 *   un instante la silueta simbólica de la ausencia antes de cerrar/respirar, la imagen
 *   respira (escala 1 a 1.02), y luego se revela el texto de /content/seccion4.json.
 */
import { gsap, Draggable, Flip } from '../core/gsap-setup.js';
import MEMORIA_EASE_NAME from '../core/easing.js';
import { resolveAssetUrl } from '../core/content-loader.js';
import {
  registerSectionController,
  revealSectionText,
  prefersReducedMotion
} from '../core/a11y.js';

export function initSeccion4({ manifest }) {
  const boardEl = document.getElementById('puzzle-board');
  const trayEl = document.getElementById('puzzle-tray');
  const readingEl = document.getElementById('lectura-seccion-4');

  if (!boardEl || !trayEl || !readingEl) return;

  const imgUrl = resolveAssetUrl(
    manifest?.seccion4?.imagen || 'puzzle/madres_puzzle.jpg'
  );

  let currentGridSize = window.innerWidth >= 768 ? 4 : 3;
  let breathTween = null;
  let isCompleted = false;
  let draggables = [];

  function buildPuzzle(gridSize) {
    // Limpiar instancias previas
    draggables.forEach((d) => d.kill());
    draggables = [];
    boardEl.innerHTML = '';
    trayEl.innerHTML = '';
    boardEl.classList.remove('is-seamless');
    isCompleted = false;

    boardEl.style.setProperty('--grid-cols', String(gridSize));
    boardEl.style.setProperty('--grid-rows', String(gridSize));

    const totalPieces = gridSize * gridSize;
    const cells = [];
    const piecesData = [];
    let lockedCount = 0;

    // Tamaño visual de pieza en la bandeja
    const pieceW = gridSize === 4 ? 76 : 86;
    const pieceH = Math.round((pieceW * 2) / 3);
    trayEl.style.setProperty('--piece-w', `${pieceW}px`);
    trayEl.style.setProperty('--piece-h', `${pieceH}px`);

    // 1. Crear casillas destino en el tablero
    for (let i = 0; i < totalPieces; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      const cell = document.createElement('div');
      cell.className = 'puzzle-cell';
      cell.setAttribute('data-cell-index', String(i));
      cell.setAttribute(
        'aria-label',
        `Casilla fila ${row + 1}, columna ${col + 1}`
      );
      boardEl.appendChild(cell);
      cells.push(cell);

      // Porcentaje exacto de background-position
      const bgPosX = (col / (gridSize - 1)) * 100;
      const bgPosY = (row / (gridSize - 1)) * 100;

      piecesData.push({
        index: i,
        row,
        col,
        bgPosX,
        bgPosY
      });
    }

    // 2. Mezclar las piezas con gsap.utils.shuffle
    const shuffledPieces = gsap.utils.shuffle([...piecesData]);

    shuffledPieces.forEach((pData) => {
      const piece = document.createElement('div');
      piece.className = 'puzzle-piece';
      piece.setAttribute('data-piece-index', String(pData.index));
      piece.setAttribute('role', 'button');
      piece.setAttribute('tabindex', '0');
      piece.setAttribute(
        'aria-label',
        `Fragmento de fotografía (fila ${pData.row + 1}, columna ${pData.col + 1}). Arrastra a su casilla o presiona Enter para ubicar.`
      );

      piece.style.backgroundImage = `url("${imgUrl}")`;
      piece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
      piece.style.backgroundPosition = `${pData.bgPosX}% ${pData.bgPosY}%`;

      trayEl.appendChild(piece);

      const targetCell = cells[pData.index];

      const lockPieceIntoCell = () => {
        if (piece.classList.contains('is-locked')) return;

        const dInst = Draggable.get(piece);
        if (dInst) dInst.disable();

        const isLastPiece = lockedCount === totalPieces - 1;

        // Si es la última pieza, mostrar brevemente la silueta vacía como metáfora de la ausencia
        if (isLastPiece) {
          targetCell.classList.add('is-empty-silhouette');
        }

        const flipState = Flip.getState(piece);
        gsap.set(piece, { clearProps: 'x,y' });
        piece.classList.add('is-locked');
        piece.setAttribute('tabindex', '-1');
        piece.setAttribute('aria-disabled', 'true');
        targetCell.appendChild(piece);

        if (isLastPiece) {
          // Dejar la última pieza en silueta tenue un instante antes de completar la memoria
          gsap.set(piece, { opacity: 0.18 });
        }

        Flip.from(flipState, {
          duration: prefersReducedMotion() ? 0.2 : 0.65,
          ease: MEMORIA_EASE_NAME,
          scale: true,
          onComplete: () => {
            lockedCount += 1;
            if (lockedCount >= totalPieces) {
              handlePuzzleCompleted(piece, targetCell);
            }
          }
        });
      };

      // Accesibilidad por teclado: Enter o Space encaja la pieza en su casilla correcta
      piece.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          lockPieceIntoCell();
        }
      });

      const [drag] = Draggable.create(piece, {
        type: 'x,y',
        inertia: false,
        onDragEnd: function () {
          // hitTest contra su casilla correspondiente (40% de solape)
          if (this.hitTest(targetCell, '40%')) {
            gsap.killTweensOf(piece);
            lockPieceIntoCell();
          } else {
            // Pieza en casilla incorrecta: regresa suavemente a la bandeja (0.5s, power3.out)
            gsap.killTweensOf(piece);
            gsap.to(piece, {
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
  }

  function handlePuzzleCompleted(lastPieceEl, lastCellEl) {
    if (isCompleted) return;
    isCompleted = true;

    // Eliminar costuras entre piezas
    boardEl.classList.add('is-seamless');
    gsap.to(trayEl, {
      opacity: 0,
      height: 0,
      minHeight: 0,
      padding: 0,
      margin: 0,
      duration: 0.65,
      ease: MEMORIA_EASE_NAME
    });

    // Completar gradualmente la última pieza desde la silueta y activar respiración (1 a 1.02)
    const tl = gsap.timeline({
      defaults: { ease: MEMORIA_EASE_NAME }
    });

    if (lastPieceEl && lastCellEl) {
      tl.to(lastPieceEl, {
        opacity: 1,
        duration: 1.1,
        delay: 0.45,
        onComplete: () => {
          lastCellEl.classList.remove('is-empty-silhouette');
        }
      });
    }

    tl.add(() => {
      if (!prefersReducedMotion()) {
        breathTween = gsap.to(boardEl, {
          scale: 1.02,
          duration: 3.2,
          ease: MEMORIA_EASE_NAME,
          yoyo: true,
          repeat: -1
        });
      }

      const directBtn = document.querySelector('[data-direct-text="seccion-4"]');
      if (directBtn) directBtn.setAttribute('aria-expanded', 'true');
      revealSectionText(readingEl, { simpleFade: prefersReducedMotion() });
    });
  }

  buildPuzzle(currentGridSize);

  // Reconstruir rejilla (3x3 vs 4x4) si cambia el breakpoint entre móvil y escritorio y no se ha completado
  window.addEventListener('resize', () => {
    const nextSize = window.innerWidth >= 768 ? 4 : 3;
    if (nextSize !== currentGridSize && !isCompleted) {
      currentGridSize = nextSize;
      buildPuzzle(currentGridSize);
    }
  });

  registerSectionController('seccion-4', {
    pause: () => {
      if (breathTween) {
        breathTween.pause();
      }
    },
    resume: () => {
      if (breathTween && !prefersReducedMotion()) {
        breathTween.resume();
      }
    },
    revealDirectly: () => {
      revealSectionText(readingEl, { simpleFade: true });
    }
  });
}
