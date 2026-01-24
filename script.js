(() => {
  // Elements
  const $ = (s) => document.querySelector(s);
  const dataEl = $('#data');
  const dlBtn = $('#dlBtn');
  const pasteBtn = $('#pasteBtn');
  const colorEl = $('#color');
  const colorHexEl = $('#colorHex');
  const colorSwatch = $('#colorSwatch');
  const bgColorEl = $('#bgColor');
  const bgColorHexEl = $('#bgColorHex');
  const bgColorSwatch = $('#bgColorSwatch');
  const resolutionChips = $('#resolutionChips');
  const previewQREl = $('#previewQR');
  const tongueEl = $('#tongue');

  // State
  let style = 'squares';
  let ftype = 'svg';
  let qrColor = '#000000';
  let bgColor = '#FFFFFF';
  let resolution = 1024;

  const styleTabs = $('#styleTabs');
  const typeChips = $('#typeChips');

  // Paste button
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      dataEl.value = text;
      generateQR();
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  });

  function isValidHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }

  function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Color picker -> HEX input sync
  colorEl.addEventListener('input', (e) => {
    qrColor = e.target.value.toUpperCase();
    colorHexEl.value = qrColor;
    colorSwatch.style.backgroundColor = qrColor;
    document.getElementById('tongue-top').style.borderBottomColor = hexToRgba(qrColor, 0.2);
    generateQR();
  });

  // Color swatch click -> open color picker
  colorSwatch.addEventListener('click', () => {
    colorEl.click();
  });

  // HEX input -> Color picker sync
  colorHexEl.addEventListener('input', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (isValidHex(val)) {
      qrColor = val.toUpperCase();
      colorEl.value = qrColor;
      colorSwatch.style.backgroundColor = qrColor;
      document.getElementById('tongue-top').style.borderBottomColor = hexToRgba(qrColor, 0.2);
      generateQR();
    }
  });

  colorHexEl.addEventListener('blur', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (!isValidHex(val)) {
      e.target.value = qrColor;
    } else {
      qrColor = val.toUpperCase();
      colorEl.value = qrColor;
      colorSwatch.style.backgroundColor = qrColor;
      document.getElementById('tongue-top').style.borderBottomColor = hexToRgba(qrColor, 0.2);
      e.target.value = qrColor;
    }
  });

  // Background color picker -> HEX input sync
  bgColorEl.addEventListener('input', (e) => {
    bgColor = e.target.value.toUpperCase();
    bgColorHexEl.value = bgColor;
    bgColorSwatch.style.backgroundColor = bgColor;
    document.getElementById('tongue-top').style.backgroundColor = bgColor;
    document.querySelector('#tongue svg path').setAttribute('fill', bgColor);
    generateQR();
  });

  // Background swatch click -> open color picker
  bgColorSwatch.addEventListener('click', () => {
    bgColorEl.click();
  });

  // Background HEX input -> Color picker sync
  bgColorHexEl.addEventListener('input', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (isValidHex(val)) {
      bgColor = val.toUpperCase();
      bgColorEl.value = bgColor;
      bgColorSwatch.style.backgroundColor = bgColor;
      document.getElementById('tongue-top').style.backgroundColor = bgColor;
      document.querySelector('#tongue svg path').setAttribute('fill', bgColor);
      generateQR();
    }
  });

  bgColorHexEl.addEventListener('blur', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (!isValidHex(val)) {
      e.target.value = bgColor;
    } else {
      bgColor = val.toUpperCase();
      bgColorEl.value = bgColor;
      bgColorSwatch.style.backgroundColor = bgColor;
      document.getElementById('tongue-top').style.backgroundColor = bgColor;
      document.querySelector('#tongue svg path').setAttribute('fill', bgColor);
      e.target.value = bgColor;
    }
  });

  // Auto-generate function
  let generateTimeout = null;
  function generateQR(animate = true) {
    const text = (dataEl.value || '').trim();
    const main = document.querySelector('main');
    if (!text) {
      dlBtn.disabled = true;
      previewQREl.innerHTML = '';
      previewQREl.appendChild(drawRedCross());
      if (animate) {
        tongueEl.classList.add('raised');
      }
      // Add disabled state to all sections except input section
      main.querySelectorAll('.section').forEach(section => {
        if (!section.contains(dataEl)) {
          section.classList.add('disabled-content');
        }
      });
      dlBtn.classList.add('disabled-content');
      return;
    }
    // Remove disabled state when text is present
    main.querySelectorAll('.section').forEach(section => {
      section.classList.remove('disabled-content');
    });
    dlBtn.classList.remove('disabled-content');
    if (typeof window.qrcode !== 'function') return;

    // Raise tongue at start of generation (only if animating)
    if (animate) {
      tongueEl.classList.add('raised');
    }

    // Debounce generation
    clearTimeout(generateTimeout);
    generateTimeout = setTimeout(async () => {
      revoke();
      dlBtn.disabled = true;
      const qr = buildQR(text);
      
      // Always show SVG in preview
      const svg = renderSVG(qr);
      previewQREl.innerHTML = '';
      previewQREl.appendChild(svg.cloneNode(true));
      
      // Prepare download in selected format
      if (ftype === 'svg') {
        const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
        lastUrl = URL.createObjectURL(blob);
        lastFmt = 'svg';
      } else {
        // Always regenerate canvas for raster formats to ensure correct resolution
        const canvas = renderCanvas(qr, resolution);
        const mime = ftype === 'jpg' ? 'image/jpeg' : 'image/png';
        lastUrl = await toBlobUrl(canvas, mime);
        lastFmt = ftype;
      }
      
      if (animate) {
        tongueEl.classList.remove('raised');
      }
      dlBtn.disabled = false;
    }, 300);
  }

  styleTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-style]');
    if (!btn) return;
    styleTabs.querySelectorAll('button').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    style = btn.dataset.style;
    generateQR();
  });

  typeChips.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    typeChips.querySelectorAll('button').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    ftype = btn.dataset.type;
    
    // Get the parent format-column of resolutionChips to access the label
    const dimensionLabel = resolutionChips.closest('.format-column').querySelector('.section-title');
    
    // Disable resolution options when SVG is selected
    if (ftype === 'svg') {
      resolutionChips.classList.add('disabled');
      dimensionLabel.classList.add('disabled');
      
      // Reset all resolution buttons to default (no selection)
      resolutionChips.querySelectorAll('button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
    } else {
      resolutionChips.classList.remove('disabled');
      dimensionLabel.classList.remove('disabled');
      
      // Auto-select 1024 for raster formats
      resolution = 1024;
      resolutionChips.querySelectorAll('button').forEach(b => {
        if (b.dataset.size === '1024') {
          b.classList.add('active');
          b.setAttribute('aria-selected', 'true');
        } else {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        }
      });
    }
    
    generateQR(false);
  });

  resolutionChips.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-size]');
    if (!btn) return;
    resolutionChips.querySelectorAll('button').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    resolution = parseInt(btn.dataset.size, 10);
    generateQR(false);
  });

  // Generate on text input change
  dataEl.addEventListener('input', generateQR);

  let lastUrl = null;
  let lastFmt = null;

  function revoke() {
    if (lastUrl) {
      URL.revokeObjectURL(lastUrl);
      lastUrl = null;
    }
  }

  function buildQR(text) {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr;
  }

  function renderCanvas(qr, targetSize) {
    const modules = qr.getModuleCount();
    const quiet = 4;
    const scale = Math.max(1, Math.floor(targetSize / (modules + 2 * quiet)));
    const size = scale * (modules + 2 * quiet);
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // QR shapes
    ctx.fillStyle = qrColor;
    const off = scale * quiet;
    if (style === 'dots') {
      const r = Math.floor(scale * 0.5);
      for (let rIdx = 0; rIdx < modules; rIdx++) {
        for (let cIdx = 0; cIdx < modules; cIdx++) {
          if (qr.isDark(rIdx, cIdx)) {
            const cx = off + cIdx * scale + scale / 2;
            const cy = off + rIdx * scale + scale / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else if (style === 'diamonds') {
      for (let rIdx = 0; rIdx < modules; rIdx++) {
        for (let cIdx = 0; cIdx < modules; cIdx++) {
          if (qr.isDark(rIdx, cIdx)) {
            const x = off + cIdx * scale;
            const y = off + rIdx * scale;
            const diamondSize = scale * 0.765;
            ctx.save();
            ctx.translate(x + scale / 2, y + scale / 2);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
            ctx.restore();
          }
        }
      }
    } else if (style === 'hearts') {
      const s = scale * 0.84;
      for (let rIdx = 0; rIdx < modules; rIdx++) {
        for (let cIdx = 0; cIdx < modules; cIdx++) {
          if (qr.isDark(rIdx, cIdx)) {
            const cx = off + cIdx * scale + scale / 2;
            const cy = off + rIdx * scale + scale / 2;
            drawHeart(ctx, cx, cy, s);
          }
        }
      }
    } else if (style === 'stars') {
      const r = scale * 0.6;
      for (let rIdx = 0; rIdx < modules; rIdx++) {
        for (let cIdx = 0; cIdx < modules; cIdx++) {
          if (qr.isDark(rIdx, cIdx)) {
            const cx = off + cIdx * scale + scale / 2;
            const cy = off + rIdx * scale + scale / 2;
            drawStar(ctx, cx, cy, 5, r, r * 0.4);
          }
        }
      }
    } else {
      for (let rIdx = 0; rIdx < modules; rIdx++) {
        for (let cIdx = 0; cIdx < modules; cIdx++) {
          if (qr.isDark(rIdx, cIdx)) {
            ctx.fillRect(off + cIdx * scale, off + rIdx * scale, scale, scale);
          }
        }
      }
    }
    return c;
  }

  function drawHeart(ctx, cx, cy, size) {
    // Original viewBox from icon_pattern_heart: 0 0 44 48
    const scale = size / 44;
    const offsetX = cx - 22 * scale;
    const offsetY = cy - 24 * scale;
    
    // Create path from icon_pattern_heart.svg
    const pathData = `M ${22 * scale + offsetX} ${44 * scale + offsetY}L${18.81 * scale + offsetX} ${41.1226 * scale + offsetY}C${7.48 * scale + offsetX} ${30.9428 * scale + offsetY} ${0 * scale + offsetX} ${24.2071 * scale + offsetY} ${0 * scale + offsetX} ${15.9891 * scale + offsetY}C${0 * scale + offsetX} ${9.25341 * scale + offsetY} ${5.324 * scale + offsetX} ${4 * scale + offsetY} ${12.1 * scale + offsetX} ${4 * scale + offsetY}C${15.928 * scale + offsetX} ${4 * scale + offsetY} ${19.602 * scale + offsetX} ${5.76567 * scale + offsetY} ${22 * scale + offsetX} ${8.53406 * scale + offsetY}C${24.398 * scale + offsetX} ${5.76567 * scale + offsetY} ${28.072 * scale + offsetX} ${4 * scale + offsetY} ${31.9 * scale + offsetX} ${4 * scale + offsetY}C${38.676 * scale + offsetX} ${4 * scale + offsetY} ${44 * scale + offsetX} ${9.25341 * scale + offsetY} ${44 * scale + offsetX} ${15.9891 * scale + offsetY}C${44 * scale + offsetX} ${24.2071 * scale + offsetY} ${36.52 * scale + offsetX} ${30.9428 * scale + offsetY} ${25.19 * scale + offsetX} ${41.1226 * scale + offsetY}L${22 * scale + offsetX} ${44 * scale + offsetY}Z`;
    
    const path2D = new Path2D(pathData);
    ctx.fill(path2D);
  }

  function drawStar(ctx, cx, cy, points, outerRadius, innerRadius) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawRedCross() {
    const xmlns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(xmlns, 'svg');
    const size = 256;
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);

    // Background
    const bg = document.createElementNS(xmlns, 'rect');
    bg.setAttribute('fill', bgColor);
    bg.setAttribute('width', size);
    bg.setAttribute('height', size);
    svg.appendChild(bg);

    // Red cross
    const strokeWidth = 20;
    const margin = 40;
    const line1 = document.createElementNS(xmlns, 'line');
    line1.setAttribute('x1', margin);
    line1.setAttribute('y1', margin);
    line1.setAttribute('x2', size - margin);
    line1.setAttribute('y2', size - margin);
    line1.setAttribute('stroke', '#ff000000');
    line1.setAttribute('stroke-width', strokeWidth);
    line1.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line1);

    const line2 = document.createElementNS(xmlns, 'line');
    line2.setAttribute('x1', size - margin);
    line2.setAttribute('y1', margin);
    line2.setAttribute('x2', margin);
    line2.setAttribute('y2', size - margin);
    line2.setAttribute('stroke', '#ff000000');
    line2.setAttribute('stroke-width', strokeWidth);
    line2.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line2);

    return svg;
  }

  function renderSVG(qr) {
    const modules = qr.getModuleCount();
    const quiet = 4;
    const cell = 8;
    const size = (modules + 2 * quiet) * cell;
    const xmlns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(xmlns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);

    // Background
    const bg = document.createElementNS(xmlns, 'rect');
    bg.setAttribute('fill', bgColor);
    bg.setAttribute('width', size);
    bg.setAttribute('height', size);
    svg.appendChild(bg);

    const g = document.createElementNS(xmlns, 'g');
    g.setAttribute('fill', qrColor);
    svg.appendChild(g);
    const off = quiet * cell;
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (qr.isDark(r, c)) {
          const x = off + c * cell;
          const y = off + r * cell;
          if (style === 'dots') {
            const circ = document.createElementNS(xmlns, 'circle');
            circ.setAttribute('cx', x + cell / 2);
            circ.setAttribute('cy', y + cell / 2);
            circ.setAttribute('r', Math.floor(cell * 0.5));
            g.appendChild(circ);
          } else if (style === 'diamonds') {
            const diamondSize = cell * 0.765;
            const offset = (cell - diamondSize) / 2;
            const gg = document.createElementNS(xmlns, 'g');
            gg.setAttribute('transform', `translate(${x + cell / 2} ${y + cell / 2}) rotate(45) translate(${-diamondSize / 2} ${-diamondSize / 2})`);
            const rect = document.createElementNS(xmlns, 'rect');
            rect.setAttribute('width', diamondSize);
            rect.setAttribute('height', diamondSize);
            gg.appendChild(rect);
            g.appendChild(gg);
          } else if (style === 'hearts') {
            const heart = createHeartPath(x + cell / 2, y + cell / 2, cell * 0.84);
            g.appendChild(heart);
          } else if (style === 'stars') {
            const star = createStarPath(x + cell / 2, y + cell / 2, 5, cell * 0.6, cell * 0.24);
            g.appendChild(star);
          } else {
            const rect = document.createElementNS(xmlns, 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', cell);
            rect.setAttribute('height', cell);
            g.appendChild(rect);
          }
        }
      }
    }
    return svg;
  }

  function createHeartPath(cx, cy, size) {
    const xmlns = 'http://www.w3.org/2000/svg';
    const path = document.createElementNS(xmlns, 'path');
    
    // Original viewBox from icon_pattern_heart: 0 0 44 48
    // Original path positioned with center at (22, 24)
    const scale = size / 44; // Scale to fit size
    const offsetX = cx - 22 * scale;
    const offsetY = cy - 24 * scale;
    
    // Path from icon_pattern_heart.svg, scaled and positioned
    const d = `M ${22 * scale + offsetX} ${44 * scale + offsetY}L${18.81 * scale + offsetX} ${41.1226 * scale + offsetY}C${7.48 * scale + offsetX} ${30.9428 * scale + offsetY} ${0 * scale + offsetX} ${24.2071 * scale + offsetY} ${0 * scale + offsetX} ${15.9891 * scale + offsetY}C${0 * scale + offsetX} ${9.25341 * scale + offsetY} ${5.324 * scale + offsetX} ${4 * scale + offsetY} ${12.1 * scale + offsetX} ${4 * scale + offsetY}C${15.928 * scale + offsetX} ${4 * scale + offsetY} ${19.602 * scale + offsetX} ${5.76567 * scale + offsetY} ${22 * scale + offsetX} ${8.53406 * scale + offsetY}C${24.398 * scale + offsetX} ${5.76567 * scale + offsetY} ${28.072 * scale + offsetX} ${4 * scale + offsetY} ${31.9 * scale + offsetX} ${4 * scale + offsetY}C${38.676 * scale + offsetX} ${4 * scale + offsetY} ${44 * scale + offsetX} ${9.25341 * scale + offsetY} ${44 * scale + offsetX} ${15.9891 * scale + offsetY}C${44 * scale + offsetX} ${24.2071 * scale + offsetY} ${36.52 * scale + offsetX} ${30.9428 * scale + offsetY} ${25.19 * scale + offsetX} ${41.1226 * scale + offsetY}L${22 * scale + offsetX} ${44 * scale + offsetY}Z`;
    
    path.setAttribute('d', d);
    return path;
  }

  function createStarPath(cx, cy, points, outerRadius, innerRadius) {
    const xmlns = 'http://www.w3.org/2000/svg';
    const path = document.createElementNS(xmlns, 'path');
    let d = '';
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      d += (i === 0 ? 'M' : 'L') + ` ${x} ${y}`;
    }
    d += ' Z';
    path.setAttribute('d', d);
    return path;
  }

  async function toBlobUrl(canvas, mime) {
    return new Promise((resolve) => {
      if (canvas.toBlob) {
        canvas.toBlob(b => resolve(URL.createObjectURL(b)), mime, 0.92);
      } else {
        const dataUrl = canvas.toDataURL(mime, 0.92);
        fetch(dataUrl).then(r => r.blob()).then(b => resolve(URL.createObjectURL(b)));
      }
    });
  }

  dlBtn.addEventListener('mouseenter', () => {
    dataEl.classList.add('wobble');
  });

  dlBtn.addEventListener('mouseleave', () => {
    dataEl.classList.remove('wobble');
  });

  dlBtn.addEventListener('click', () => {
    if (!lastUrl) return;
    const a = document.createElement('a');
    a.href = lastUrl;
    a.download = `qr-code.${lastFmt}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Initialize with red cross on page load
  resolutionChips.classList.add('disabled');
  resolutionChips.closest('.format-column').querySelector('.section-title').classList.add('disabled');
  generateQR();

  // Initialize tongue-top and SVG colors
  document.getElementById('tongue-top').style.backgroundColor = bgColor;
  document.getElementById('tongue-top').style.borderBottomColor = hexToRgba(qrColor, 0.2);
  document.querySelector('#tongue svg path').setAttribute('fill', bgColor);

  // Parallax effect for pupils following the cursor (smoothed)
const pupils = Array.from(document.querySelectorAll('.pupil'));

const state = pupils.map((pupil) => {
  const white = pupil.closest('.white');
  return {
    pupil,
    white,
    cx: 0,
    cy: 0,
    tx: 0,  // target x
    ty: 0,  // target y
    x: 0,   // current x
    y: 0,   // current y
  };
});

// Настройки
let maxOffset = 24;     // максимум смещения (px)
const sensitivity = 0.12; // насколько сильно реагирует на дистанцию
const smoothing = 0.18;   // 0..1 (чем больше, тем быстрее догоняет)

// Проверяем размер экрана для маленького брейкпоинта
const checkScreenSize = () => {
  maxOffset = window.innerWidth <= 540 ? 8 : 24;
};
checkScreenSize();
window.addEventListener('resize', checkScreenSize);

// Обновляем центры глаз (не на каждый mousemove)
function updateEyeCenters() {
  state.forEach((s) => {
    const r = s.white.getBoundingClientRect();
    s.cx = r.left + r.width / 2;
    s.cy = r.top + r.height / 2;
  });
}
updateEyeCenters();
window.addEventListener('resize', updateEyeCenters);
window.addEventListener('scroll', updateEyeCenters, { passive: true });

// Храним курсор
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // считаем target’ы тут, но без DOM-измерений
  state.forEach((s) => {
    const dx = mouseX - s.cx;
    const dy = mouseY - s.cy;
    const dist = Math.hypot(dx, dy) || 1;

    // Нормализуем направление
    const nx = dx / dist;
    const ny = dy / dist;

    // Сила = dist * sensitivity, но ограничиваем maxOffset
    const mag = Math.min(maxOffset, dist * sensitivity);

    s.tx = nx * mag;
    s.ty = ny * mag;
  });
}, { passive: true });

// Рендерим плавно
let rafId = null;
function animate() {
  state.forEach((s) => {
    s.x += (s.tx - s.x) * smoothing;
    s.y += (s.ty - s.y) * smoothing;

    // округление чуть убирает микродрожь на сабпикселях
    const x = Math.round(s.x * 100) / 100;
    const y = Math.round(s.y * 100) / 100;

    s.pupil.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  rafId = requestAnimationFrame(animate);
}
if (!rafId) animate();

})();
