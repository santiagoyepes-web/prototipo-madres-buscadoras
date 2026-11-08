/**
 * Cargador de contenido (/content/*.json), resolvedor seguro de rutas (/assets/)
 * y normalizador de SVGs con defectos de exportación (como falta de viewBox o fondos blancos).
 * Respeta que /content/ y /assets/ son de solo lectura.
 */

const PATH_OVERRIDES = {
  'icons/transicion/huella.png': 'icons/transición/huella.png',
  'icons/seccion3/cana_par_a2.svg': 'icons/seccion3/caña_par_a2.svg'
};

/**
 * Convierte una ruta relativa del manifest.json en una URL relativa segura (./assets/...)
 * codificando adecuadamente caracteres especiales (tildes, ñ).
 * @param {string} relativePath
 * @returns {string}
 */
export function resolveAssetUrl(relativePath) {
  if (!relativePath) return '';
  const clean = relativePath.replace(/^(\.\/|\/)?(assets\/)?/, '');
  const segments = clean.split('/').map((seg) => encodeURIComponent(seg));
  return `./assets/${segments.join('/')}`;
}

/**
 * Repara en memoria archivos SVG de /assets/ que tienen problemas de origen:
 * - canoa_par_b2.svg: carece de atributo viewBox (tiene width="3995" height="2663") y
 *   contiene un primer <path fill="white"> que cubre todo el lienzo de blanco.
 * - ley_n2.svg: contiene un <rect id="BG" class="cls-2" width="5000" height="2789"/> blanco.
 *
 * @param {HTMLImageElement} imgEl Elemento <img> que apunta a un .svg
 */
export async function fixSvgImageElement(imgEl) {
  if (!imgEl) return;
  const src = imgEl.getAttribute('src') || '';
  if (!src.toLowerCase().endsWith('.svg')) return;

  try {
    const response = await fetch(src);
    if (!response.ok) return;
    let svgText = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return;

    // 1. Si no tiene viewBox pero sí width y height (caso canoa_par_b2.svg), añadir viewBox
    if (!svgEl.hasAttribute('viewBox')) {
      const w = parseFloat(svgEl.getAttribute('width')) || 3995;
      const h = parseFloat(svgEl.getAttribute('height')) || 2663;
      svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    // 2. Eliminar rectángulo de fondo blanco explícito (#BG en ley_n2.svg)
    const bgRect = svgEl.querySelector('#BG, rect.cls-2');
    if (bgRect) {
      bgRect.remove();
    }

    // 3. En canoa_par_b2.svg, el primer <path fill="white" d="M0 0L1534.69 0..."> es un fondo blanco completo
    const firstPath = svgEl.querySelector('path');
    if (
      firstPath &&
      firstPath.getAttribute('fill') === 'white' &&
      (firstPath.getAttribute('d') || '').startsWith('M0 0L1534')
    ) {
      firstPath.remove();
    }

    const serializer = new XMLSerializer();
    const fixedSvgString = serializer.serializeToString(svgEl);
    const encoded = encodeURIComponent(fixedSvgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');

    imgEl.src = `data:image/svg+xml;charset=utf-8,${encoded}`;
  } catch {
    // Si falla el fetch local, conserva el src original
  }
}

/**
 * Carga todos los archivos JSON de /content/ en paralelo usando rutas relativas.
 */
export async function loadAllContent() {
  const [manifest, seccion1, seccion2, seccion3, seccion4] = await Promise.all([
    fetch('./content/manifest.json').then((r) => r.json()),
    fetch('./content/seccion1.json').then((r) => r.json()),
    fetch('./content/seccion2.json').then((r) => r.json()),
    fetch('./content/seccion3.json').then((r) => r.json()),
    fetch('./content/seccion4.json').then((r) => r.json())
  ]);

  return {
    manifest,
    secciones: {
      1: seccion1,
      2: seccion2,
      3: seccion3,
      4: seccion4
    }
  };
}

/**
 * Convierte el texto plano de un JSON de sección en HTML semántico (<p>, <h3>, <em>)
 * sin alterar ni una sola letra, cifra, fecha o signo de puntuación del texto original.
 * @param {string} textoCompleto
 * @param {string[]} subtitulos
 * @returns {string} HTML seguro
 */
export function renderEditorialText(textoCompleto, subtitulos = []) {
  if (!textoCompleto) return '';
  const subSet = new Set(subtitulos.map((s) => s.trim()));
  const blocks = textoCompleto.split(/\n+/).map((b) => b.trim()).filter(Boolean);

  return blocks
    .map((line) => {
      if (subSet.has(line)) {
        return `<h3 class="editorial-subtitle" data-split-line>${escapeHtml(line)}</h3>`;
      }
      // Preservar cursivas marcadas con *Nombre* en seccion4.json sin alterar el texto visible
      const formatted = escapeHtml(line).replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return `<p class="editorial-paragraph" data-split-line>${formatted}</p>`;
    })
    .join('\n');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Precarga las URLs de imágenes de la sección destino en paralelo sin bloquear la GPU
 * cuando las imágenes fuente superan los 5000x5000 px.
 * @param {string[]} urls
 * @returns {Promise<void>}
 */
export function preloadAndDecodeImages(urls = []) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  if (!uniqueUrls.length) return Promise.resolve();

  const tasks = uniqueUrls.map((url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  });

  return Promise.all(tasks).then(() => undefined);
}
