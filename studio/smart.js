"use strict";
/* ============ Студия: умные функции ============
   лица (BlazeFace) → автоповорот, человек по центру, умная обрезка, скрыть лица, бьюти по лицам
   линии → авто-горизонт · гистограммы → перенос стиля с другого фото
   выделение + PatchMatch → удаление объектов                                              */
const SMART = (() => {
  const TFJS = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  const BLAZE = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.1.0/dist/blazeface.min.umd.js';
  const HORIZON_SIGN = -1;
  const yieldUI = (() => { const ch = new MessageChannel(); let res = null; ch.port1.onmessage = () => { const r = res; res = null; r && r(); }; return () => new Promise(r => { res = r; ch.port2.postMessage(0); }); })();
  let detector = null, loading = null;
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script')); document.head.appendChild(s); });
  async function getDetector() {
    if (detector) return detector;
    if (!loading) loading = (async () => { toast('Загружаю распознавание лиц… (один раз)'); await loadScript(TFJS); await loadScript(BLAZE); detector = await blazeface.load({ maxFaces: 12, scoreThreshold: .7 }); return detector; })();
    try { return await loading; } catch (e) { loading = null; throw e; }
  }
  async function detect(canvas) {
    const d = await getDetector(), f = await d.estimateFaces(canvas, false), w = canvas.width, h = canvas.height;
    return f.map(x => ({ x: x.topLeft[0] / w, y: x.topLeft[1] / h, w: (x.bottomRight[0] - x.topLeft[0]) / w, h: (x.bottomRight[1] - x.topLeft[1]) / h, p: x.probability[0] }));
  }
  /* кадр = исходник с учётом поворота и зеркала, без обрезки */
  function frameCanvas(maxSide) {
    const g = S.geo, [fw, fh] = frameSize(g.rot), k = Math.min(1, maxSide / Math.max(fw, fh)), w = Math.max(2, Math.round(fw * k)), h = Math.max(2, Math.round(fh * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
    x.translate(w / 2, h / 2); x.scale(g.fx, g.fy); x.rotate(g.rot * Math.PI / 2); x.drawImage(S.src, -S.sw * k / 2, -S.sh * k / 2, S.sw * k, S.sh * k); return c;
  }
  function rotCanvas(k, max) {
    const [fw, fh] = k % 2 ? [S.sh, S.sw] : [S.sw, S.sh], s = Math.min(1, max / Math.max(fw, fh)), w = Math.round(fw * s), h = Math.round(fh * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.translate(w / 2, h / 2); x.rotate(k * Math.PI / 2); x.drawImage(S.src, -S.sw * s / 2, -S.sh * s / 2, S.sw * s, S.sh * s); return c;
  }
  const union = fs => { const x0 = Math.min(...fs.map(f => f.x)), y0 = Math.min(...fs.map(f => f.y)), x1 = Math.max(...fs.map(f => f.x + f.w)), y1 = Math.max(...fs.map(f => f.y + f.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; };
  async function guard(id, fn) {
    if (!S.src) return toast('Сначала открой фото'); const b = $(id); if (b && b.classList.contains('busy')) return; b && b.classList.add('busy');
    try { await fn(); } catch (e) { console.error(e); toast(e && e.message === 'script' ? 'Нужен интернет для распознавания лиц' : 'Не получилось: ' + (e && e.message || e)); } finally { b && b.classList.remove('busy'); }
  }
  const done = (msg, label) => { syncUI(); layout(); render(); pushHist(label); toast(msg); const r = $('stage').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14, { spread: 150 }); hap('light'); };

  /* ---------- 1. исправить поворот ---------- */
  function skyScore(c) {
    const x = c.getContext('2d', { willReadFrequently: true }), s = document.createElement('canvas'); s.width = 48; s.height = 48; s.getContext('2d').drawImage(c, 0, 0, 48, 48); const d = s.getContext('2d').getImageData(0, 0, 48, 48).data;
    let lt = 0, lb = 0, bt = 0, bb = 0; for (let y = 0; y < 48; y++) for (let xx = 0; xx < 48; xx++) { const i = (y * 48 + xx) * 4, l = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2], bl = d[i + 2] - (d[i] + d[i + 1]) / 2;
      if (y < 10) { lt += l; bt += bl; } else if (y > 37) { lb += l; bb += bl; } } const n = 480 * 255; return (lt - lb) / n + .7 * (bt - bb) / n;
  }
  async function orient() {
    const scores = [];
    for (let k = 0; k < 4; k++) { const f = await detect(rotCanvas(k, 360)); scores.push(f.reduce((s, x) => s + x.p * (1 + Math.min(2, x.w * x.h * 12)), 0)); }
    let best = 0; scores.forEach((s, k) => { if (s > scores[best] + 1e-6) best = k; }); const cur = S.geo.rot, any = scores.some(s => s > 0);
    if (any) {
      if (best === cur || scores[best] < scores[cur] + .6) { toast('Лица стоят правильно — поворот не нужен 👍'); return; }
      S.geo.rot = best; resetCrop(); done('Повернула так, чтобы лица были прямо', 'Авто-поворот по лицам'); return;
    }
    const sc = [0, 1, 2, 3].map(k => skyScore(rotCanvas(k, 96))); let b2 = 0; sc.forEach((s, k) => { if (s > sc[b2]) b2 = k; });
    if (b2 !== cur && sc[b2] > sc[cur] + .12) { S.geo.rot = b2; resetCrop(); done('Лиц нет, но небо должно быть сверху — повернула', 'Авто-поворот по небу'); }
    else toast('Лиц не нашла, и фото выглядит ровно');
  }

  /* ---------- 2. человек по центру / умная обрезка ---------- */
  async function faceTarget() {
    const fc = frameCanvas(520), faces = await detect(fc);
    if (faces.length) return { faces, u: union(faces), kind: 'faces' };
    const w = fc.width, h = fc.height, d = fc.getContext('2d').getImageData(0, 0, w, h).data; let sx = 0, sy = 0, sw = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = (y * w + x) * 4, j = i + 4, k = i + w * 4, m = Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i] - d[k]) + Math.abs(d[i + 1] - d[k + 1]); sx += x * m; sy += y * m; sw += m; }
    return { faces: [], u: { cx: sw ? sx / sw / w : .5, cy: sw ? sy / sw / h : .5, w: .2, h: .2 }, kind: 'saliency' };
  }
  async function centerFace() {
    const t = await faceTarget(); if (t.kind !== 'faces') { toast('Лиц не нашла — центрирую по самой «живой» части кадра'); }
    const { cx, cy } = t.u; let cw = clamp(2 * Math.min(cx, 1 - cx), .45, 1);
    const x = clamp(cx - cw / 2, 0, 1 - cw), y = clamp(cy - (t.kind === 'faces' ? .42 : .5) * cw, 0, 1 - cw);
    S.geo.aspect = 'orig'; S.geo.crop = { x, y, w: cw, h: cw }; done(t.kind === 'faces' ? 'Человек теперь в центре кадра' : 'Центрировала по главному объекту', 'Человек по центру');
  }
  async function smartCrop(ratio, name) {
    const t = await faceTarget(), [fw, fh] = frameSize(S.geo.rot); let cwp = Math.min(fw, fh * ratio), chp = cwp / ratio;
    if (t.kind === 'faces' && t.u.w * fw > cwp * .6) { cwp = Math.min(fw, t.u.w * fw * 1.9); chp = cwp / ratio; if (chp > fh) { chp = fh; cwp = chp * ratio; } }
    const w = cwp / fw, h = chp / fh, x = clamp(t.u.cx - w / 2, 0, 1 - w), y = clamp(t.u.cy - (t.kind === 'faces' ? .38 : .5) * h, 0, 1 - h);
    S.geo.aspect = name; S.geo.crop = { x, y, w, h }; done(t.kind === 'faces' ? `Обрезала ${name} по лицам` : `Обрезала ${name} по главному объекту`, 'Умная обрезка ' + name);
  }

  /* ---------- 3. скрыть лица / бьюти ---------- */
  async function hideFaces() {
    const faces = await detect(frameCanvas(520)); if (!faces.length) return toast('Лиц не нашла');
    const c = S.geo.crop, [fw, fh] = frameSize(S.geo.rot), ow = fw * c.w, oh = fh * c.h, mn = Math.min(ow, oh); let n = 0;
    for (const f of faces) { const u = (f.x + f.w / 2 - c.x) / c.w, v = (f.y + f.h / 2 - c.y) / c.h; if (u < -.05 || u > 1.05 || v < -.05 || v > 1.05) continue;
      const wp = f.w * fw * 1.5, hp = f.h * fh * 1.55; addLayer({ kind: 'redact', mode: 'pixel', x: u, y: v, size: wp / mn * 100, aspect: hp / wp, rot: 0 }, 'Скрыть лицо'); n++; }
    S.sel = -1; done(`Скрыла лиц: ${n}`, 'Скрыть лица');
  }
  function frameToSrc(u, v) {
    const g = S.geo, [fw, fh] = frameSize(g.rot); let qx = (u - .5) * fw, qy = (v - .5) * fh; qx *= g.fx; qy *= g.fy;
    if (g.rot === 1) [qx, qy] = [qy, -qx]; else if (g.rot === 2) [qx, qy] = [-qx, -qy]; else if (g.rot === 3) [qx, qy] = [-qy, qx]; return [qx / S.sw + .5, qy / S.sh + .5];
  }
  async function beauty() {
    const faces = await detect(frameCanvas(520)); if (!faces.length) return toast('Лиц не нашла'); const [fw] = frameSize(S.geo.rot);
    for (const f of faces) { const [su, sv] = frameToSrc(f.x + f.w / 2, f.y + f.h / 2 + f.h * .06), r = f.w * fw * (mkW / S.sw) * .7; for (let i = 0; i < 4; i++) stampMask(mkA, su * mkW, sv * mkH_, r, .85, false); }
    S.maskHas = true; S.local.smooth = Math.max(S.local.smooth, 62); S.local.exp = Math.max(S.local.exp, 6); S.local.sat = Math.max(S.local.sat, 6); uploadMask(); commitMask(); done(`Сгладила кожу на лицах: ${faces.length}`, 'Бьюти по лицам');
  }

  /* ---------- 4. горизонт ---------- */
  function boxBlur(a, w, h, r) {
    const t = new Float32Array(w * h), o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let s = 0, n = 0; for (let x = 0; x <= r && x < w; x++) { s += a[y * w + x]; n++; } for (let x = 0; x < w; x++) { t[y * w + x] = s / n; const ax = x + r + 1, rx = x - r; if (ax < w) { s += a[y * w + ax]; n++; } if (rx >= 0) { s -= a[y * w + rx]; n--; } } }
    for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let y = 0; y <= r && y < h; y++) { s += t[y * w + x]; n++; } for (let y = 0; y < h; y++) { o[y * w + x] = s / n; const ay = y + r + 1, ry = y - r; if (ay < h) { s += t[ay * w + x]; n++; } if (ry >= 0) { s -= t[ry * w + x]; n--; } } }
    return o;
  }
  function horizon() {
    const c = frameCanvas(260), w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data; let L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]; for (let k = 0; k < 3; k++) L = boxBlur(L, w, h, 2);  /* сглаживаем, иначе «лесенка» пикселей даёт ложные 0° */
    const bins = new Float32Array(61);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const i = y * w + x, gx = L[i + 2] - L[i - 2], gy = L[i + 2 * w] - L[i - 2 * w], mag = Math.hypot(gx, gy); if (mag < 8) continue;
      let dev = (Math.atan2(gy, gx) * 180 / Math.PI + 90) % 90; if (dev < 0) dev += 90; if (dev > 45) dev -= 90; if (Math.abs(dev) <= 15) bins[Math.round((dev + 15) * 2)] += mag; }
    const sm = bins.map((_, i) => (bins[i - 1] || 0) * .5 + bins[i] + (bins[i + 1] || 0) * .5); let pk = 0; sm.forEach((v, i) => { if (v > sm[pk]) pk = i; });
    const mean = sm.reduce((a, b) => a + b, 0) / sm.length; if (sm[pk] < mean * 2.4 || mean < 25) return toast('Чётких линий не нашла — выровняй вручную во вкладке «Кадр»');
    let sw = 0, sa = 0; for (let i = Math.max(0, pk - 4); i <= Math.min(60, pk + 4); i++) { sw += sm[i]; sa += sm[i] * (i / 2 - 15); } const angle = sa / sw;
    if (Math.abs(angle) < .4) return toast('Горизонт и так ровный 👍');
    S.geo.ang = clamp(Math.round(HORIZON_SIGN * angle * 2) / 2, -45, 45); done(`Выровняла горизонт на ${Math.abs(angle).toFixed(1)}°`, 'Авто-горизонт');
  }
  /* ---------- 5. стиль с другого фото ---------- */
  let styleLut = null;
  function histCdf(canvas) { const s = document.createElement('canvas'); const k = Math.min(1, 160 / Math.max(canvas.width, canvas.height)); s.width = Math.max(2, Math.round(canvas.width * k)); s.height = Math.max(2, Math.round(canvas.height * k));
    const x = s.getContext('2d', { willReadFrequently: true }); x.drawImage(canvas, 0, 0, s.width, s.height); const d = x.getImageData(0, 0, s.width, s.height).data, H = [new Float32Array(256), new Float32Array(256), new Float32Array(256)];
    for (let i = 0; i < d.length; i += 4) { H[0][d[i]]++; H[1][d[i + 1]]++; H[2][d[i + 2]]++; } const n = d.length / 4;
    return H.map(h => { let a = 0; return h.map(v => (a += v) / n); }); }
  function setStyle(refCanvas) {
    const a = histCdf(S.src), b = histCdf(refCanvas); styleLut = [0, 1, 2].map(c => { const m = new Float32Array(256); let j = 0; for (let i = 0; i < 256; i++) { while (j < 255 && b[c][j] < a[c][i]) j++; m[i] = j; } return m; });
    $('styleBox').style.display = 'block'; applyStyle(); pushHist('Стиль с другого фото'); toast('Стиль перенесён — регулируй силу ползунком'); const r = $('stage').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14, { spread: 150 });
  }
  function applyStyle() {
    if (!styleLut) return; const k = $('skSl').value / 100; $('skV').textContent = $('skSl').value; fill($('skSl'));
    ['r', 'g', 'b'].forEach((ch, c) => { const pts = []; let prev = 0; for (let i = 0; i <= 10; i++) { const x = i / 10; let y = x + (styleLut[c][Math.round(x * 255)] / 255 - x) * k; y = clamp(Math.max(y, prev), 0, 1); prev = y; pts.push([x, y]); } S.curves[ch] = pts; });
    updateCurveTex(); render(); if (S.tab === 'curves') drawCurve();
  }

  /* ---------- 6. удаление объектов ---------- */
  let selCv = null, sel2 = null, eMode = 'brush', eLast = null, hasSel = false, eSize = 30, eTol = 28;
  function ensureSel(W, H) { if (!selCv || selCv.width !== W || selCv.height !== H) { selCv = document.createElement('canvas'); selCv.width = W; selCv.height = H; sel2 = selCv.getContext('2d', { willReadFrequently: true }); hasSel = false; } }
  const brushR = () => eSize / 100 * .12 * Math.min(ovc.width, ovc.height) + 3;
  function strokeSel(a, b) { sel2.save(); sel2.lineCap = 'round'; sel2.lineWidth = brushR() * 2; if (eMode === 'rub') sel2.globalCompositeOperation = 'destination-out'; sel2.strokeStyle = 'rgb(255,60,60)'; sel2.beginPath(); sel2.moveTo(a[0], a[1]); sel2.lineTo(b[0] + .01, b[1]); sel2.stroke(); sel2.restore(); if (eMode !== 'rub') hasSel = true; render(); }
  function eraseDown(nx, ny) { ensureSel(ovc.width, ovc.height); if (eMode === 'wand') { wandSelect(nx, ny); return; } eLast = [nx * ovc.width, ny * ovc.height]; strokeSel(eLast, eLast); }
  function eraseMove(nx, ny) { if (eMode === 'wand' || !eLast) return; const p = [nx * ovc.width, ny * ovc.height]; strokeSel(eLast, p); eLast = p; }
  function eraseUp() { eLast = null; }
  function drawSel(ctx, W, H) { if (selCv && hasSel && selCv.width === W && selCv.height === H) { ctx.save(); ctx.globalAlpha = .5; ctx.drawImage(selCv, 0, 0); ctx.restore(); } }
  function wandSelect(nx, ny) {
    const gw = glc.width, gh = glc.height, k = Math.min(1, 640 / Math.max(gw, gh)), w = Math.max(2, Math.round(gw * k)), h = Math.max(2, Math.round(gh * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(glc, 0, 0, w, h); const d = cx.getImageData(0, 0, w, h).data;
    const sx = clamp(Math.floor(nx * w), 0, w - 1), sy = clamp(Math.floor(ny * h), 0, h - 1); let sr = 0, sg = 0, sb = 0, sn = 0;
    for (let y = Math.max(0, sy - 2); y <= Math.min(h - 1, sy + 2); y++) for (let x = Math.max(0, sx - 2); x <= Math.min(w - 1, sx + 2); x++) { const i = (y * w + x) * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; sn++; } sr /= sn; sg /= sn; sb /= sn;
    const tol = eTol * 2.2, tolN = eTol * .8, mask = new Uint8Array(w * h), stack = new Int32Array(w * h); let sp = 0, cnt = 0; stack[sp++] = sy * w + sx; mask[sy * w + sx] = 1;
    const dist = (i, r, g, b) => Math.hypot(d[i * 4] - r, d[i * 4 + 1] - g, d[i * 4 + 2] - b);
    while (sp && cnt < w * h * .6) { const p = stack[--sp]; cnt++; const x = p % w, y = (p / w) | 0, pr = d[p * 4], pg = d[p * 4 + 1], pb = d[p * 4 + 2];
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) { if (q < 0 || mask[q]) continue; if (dist(q, sr, sg, sb) <= tol && dist(q, pr, pg, pb) <= tolN) { mask[q] = 1; stack[sp++] = q; } } }
    if (cnt < 4) return toast('Ничего не выделилось — увеличь допуск цвета');
    const grown = dilate(mask, w, h, 2), mc = document.createElement('canvas'); mc.width = w; mc.height = h; const mx = mc.getContext('2d'), im = mx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) if (grown[i]) { im.data[i * 4] = 255; im.data[i * 4 + 1] = 60; im.data[i * 4 + 2] = 60; im.data[i * 4 + 3] = 255; } mx.putImageData(im, 0, 0);
    sel2.drawImage(mc, 0, 0, selCv.width, selCv.height); hasSel = true; render(); hap();
  }
  function dilate(m, w, h, r) {
    let a = m; for (let it = 0; it < r; it++) { const b = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (a[i]) { b[i] = 1; continue; }
      if ((x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w]) || (x > 0 && y > 0 && a[i - w - 1]) || (x < w - 1 && y > 0 && a[i - w + 1]) || (x > 0 && y < h - 1 && a[i + w - 1]) || (x < w - 1 && y < h - 1 && a[i + w + 1])) b[i] = 1; } a = b; } return a;
  }
  /* PatchMatch-достройка: сначала плавная заливка от краёв, потом подбор похожих кусочков из окружения */
  async function inpaint(data, w, h, hole, progress) {
    const N = w * h, R = 2; let total = 0; for (let i = 0; i < N; i++) if (hole[i]) total++;
    const known = new Uint8Array(N); for (let i = 0; i < N; i++) known[i] = hole[i] ? 0 : 1; const inF = new Uint8Array(N); let front = [];
    const nbrs = i => { const x = i % w, y = (i / w) | 0, o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) o.push(yy * w + xx); } return o; };
    for (let i = 0; i < N; i++) if (hole[i] && nbrs(i).some(j => known[j])) { inF[i] = 1; front.push(i); }
    let work = 0;
    while (front.length) { const vals = new Float32Array(front.length * 3);
      front.forEach((i, k) => { let r = 0, g = 0, b = 0, n = 0; for (const j of nbrs(i)) if (known[j]) { r += data[j * 4]; g += data[j * 4 + 1]; b += data[j * 4 + 2]; n++; } vals[k * 3] = r / n; vals[k * 3 + 1] = g / n; vals[k * 3 + 2] = b / n; });
      const nxt = []; front.forEach((i, k) => { data[i * 4] = vals[k * 3]; data[i * 4 + 1] = vals[k * 3 + 1]; data[i * 4 + 2] = vals[k * 3 + 2]; known[i] = 1; });
      for (const i of front) for (const j of nbrs(i)) if (hole[j] && !known[j] && !inF[j]) { inF[j] = 1; nxt.push(j); }
      work += front.length; front = nxt; if (work > 6000) { work = 0; await yieldUI(); progress(.05 + .15 * (1 - front.length / Math.max(1, total))); } }
    const S1 = new Int32Array((w + 1) * (h + 1)); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) S1[(y + 1) * (w + 1) + x + 1] = hole[y * w + x] + S1[y * (w + 1) + x + 1] + S1[(y + 1) * (w + 1) + x] - S1[y * (w + 1) + x];
    const ok = new Uint8Array(N), cand = [];
    for (let y = R; y < h - R; y++) for (let x = R; x < w - R; x++) { const s = S1[(y + R + 1) * (w + 1) + x + R + 1] - S1[(y - R) * (w + 1) + x + R + 1] - S1[(y + R + 1) * (w + 1) + x - R] + S1[(y - R) * (w + 1) + x - R]; if (!s) { ok[y * w + x] = 1; cand.push(y * w + x); } }
    if (cand.length < 60) return false;
    const holeIdx = []; let bx0 = w, by0 = h, bx1 = 0, by1 = 0; for (let i = 0; i < N; i++) if (hole[i]) { holeIdx.push(i); const x = i % w, y = (i / w) | 0; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
    const mg = Math.max(40, Math.max(bx1 - bx0, by1 - by0) * .9), near = cand.filter(i => { const x = i % w, y = (i / w) | 0; return x > bx0 - mg && x < bx1 + mg && y > by0 - mg && y < by1 + mg; }), pool = near.length > 200 ? near : cand;
    const nnf = new Int32Array(N); for (const p of holeIdx) nnf[p] = pool[(Math.random() * pool.length) | 0];
    const cost = (p, q, best) => { const px = p % w, py = (p / w) | 0, qx = q % w, qy = (q / w) | 0; let s = 0;
      for (let dy = -R; dy <= R; dy++) { const ay = py + dy; if (ay < 0 || ay >= h) continue; for (let dx = -R; dx <= R; dx++) { const ax = px + dx; if (ax < 0 || ax >= w) continue; const a = (ay * w + ax) * 4, b = ((qy + dy) * w + qx + dx) * 4, d0 = data[a] - data[b], d1 = data[a + 1] - data[b + 1], d2 = data[a + 2] - data[b + 2]; s += d0 * d0 + d1 * d1 + d2 * d2; } if (s >= best) return s; } return s; };
    const iters = holeIdx.length > 60000 ? 3 : 4, rmax = Math.min(Math.max(w, h) >> 1, 140); let counter = 0;
    for (let it = 0; it < iters; it++) {
      const fwd = it % 2 === 0;
      for (let t = 0; t < holeIdx.length; t++) { const p = holeIdx[fwd ? t : holeIdx.length - 1 - t], px = p % w, py = (p / w) | 0; let q = nnf[p], best = cost(p, q, 1e18);
        for (const [nx, ny] of fwd ? [[px - 1, py], [px, py - 1]] : [[px + 1, py], [px, py + 1]]) { if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const n = ny * w + nx; if (!hole[n]) continue; const qn = nnf[n], qx = (qn % w) + (px - nx), qy = ((qn / w) | 0) + (py - ny);
          if (qx < R || qy < R || qx >= w - R || qy >= h - R) continue; const qi = qy * w + qx; if (!ok[qi]) continue; const c = cost(p, qi, best); if (c < best) { best = c; q = qi; } }
        for (let rad = rmax; rad >= 2; rad >>= 1) { const qx = (q % w) + (((Math.random() * 2 - 1) * rad) | 0), qy = ((q / w) | 0) + (((Math.random() * 2 - 1) * rad) | 0); if (qx < R || qy < R || qx >= w - R || qy >= h - R) continue; const qi = qy * w + qx; if (!ok[qi]) continue; const c = cost(p, qi, best); if (c < best) { best = c; q = qi; } }
        nnf[p] = q; if (++counter > 5000) { counter = 0; await yieldUI(); progress(.2 + .75 * (it + t / holeIdx.length) / iters); } }
      const sums = new Float32Array(N * 3), cnt = new Uint16Array(N);
      for (const p of holeIdx) { const px = p % w, py = (p / w) | 0, q = nnf[p], qx = q % w, qy = (q / w) | 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const tx = px + dx, ty = py + dy; if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue; const tt = ty * w + tx; if (!hole[tt]) continue; const s = ((qy + dy) * w + qx + dx) * 4; sums[tt * 3] += data[s]; sums[tt * 3 + 1] += data[s + 1]; sums[tt * 3 + 2] += data[s + 2]; cnt[tt]++; } }
      for (const p of holeIdx) if (cnt[p]) { data[p * 4] = sums[p * 3] / cnt[p]; data[p * 4 + 1] = sums[p * 3 + 1] / cnt[p]; data[p * 4 + 2] = sums[p * 3 + 2] / cnt[p]; }
      await yieldUI();
    }
    return true;
  }
  async function removeObject() {
    if (!S.src) return toast('Сначала открой фото'); ensureSel(ovc.width, ovc.height); if (!hasSel) return toast('Сначала выдели объект: закрась кистью или тапни по нему');
    const W = selCv.width, H = selCv.height, sd = sel2.getImageData(0, 0, W, H).data; let ws = Math.min(1, 800 / Math.max(S.sw, S.sh)), ww, wh, hole, count;
    for (let attempt = 0; attempt < 5; attempt++) { ww = Math.max(8, Math.round(S.sw * ws)); wh = Math.max(8, Math.round(S.sh * ws)); hole = new Uint8Array(ww * wh); count = 0;
      for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const [u, v] = srcToOut((x + .5) / ww, (y + .5) / wh), ix = Math.floor(u * W), iy = Math.floor(v * H); if (ix >= 0 && iy >= 0 && ix < W && iy < H && sd[(iy * W + ix) * 4 + 3] > 90) { hole[y * ww + x] = 1; count++; } }
      if (count <= 110000 || attempt === 4) break; ws *= .78; await yieldUI(); }
    if (count < 6) return toast('Выделение не попало на фото — выдели объект ещё раз');
    if (count > ww * wh * .75) return toast('Выделено почти всё фото — выдели только лишнее');
    hole = dilate(hole, ww, wh, 3); const wc = document.createElement('canvas'); wc.width = ww; wc.height = wh; const wx = wc.getContext('2d', { willReadFrequently: true }); wx.drawImage(S.src, 0, 0, ww, wh); const im = wx.getImageData(0, 0, ww, wh);
    const btn = $('eGo'); btn.classList.add('busy'); const prog = p => toast('🧽 Стираю… ' + Math.round(p * 100) + '%'); prog(0); await yieldUI();
    const ok = await inpaint(im.data, ww, wh, hole, prog); btn.classList.remove('busy'); if (!ok) return toast('Слишком большая область — не из чего достроить. Выдели поменьше');
    wx.putImageData(im, 0, 0); ensureBase();
    const full = document.createElement('canvas'); full.width = S.sw; full.height = S.sh; const fx = full.getContext('2d'); fx.imageSmoothingEnabled = true; fx.imageSmoothingQuality = 'high'; fx.drawImage(wc, 0, 0, S.sw, S.sh);
    const mc = document.createElement('canvas'); mc.width = ww; mc.height = wh; const mx = mc.getContext('2d'), md = mx.createImageData(ww, wh); for (let i = 0; i < ww * wh; i++) { md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = 255; md.data[i * 4 + 3] = hole[i] ? 255 : 0; } mx.putImageData(md, 0, 0);
    fx.globalCompositeOperation = 'destination-in'; fx.drawImage(mc, 0, 0, S.sw, S.sh); S.src.getContext('2d').drawImage(full, 0, 0); commitSrc(); setTexture(S.src);
    sel2.clearRect(0, 0, selCv.width, selCv.height); hasSel = false; render(); pushHist('Удаление объекта'); toast('🧽 Готово — объект стёрт'); const r = $('stage').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 18, { spread: 170 }); hap('light');
  }
  function selToMask() {
    if (!hasSel) return toast('Сначала выдели участок'); const W = selCv.width, H = selCv.height, sd = sel2.getImageData(0, 0, W, H).data, mc = document.createElement('canvas'); mc.width = mkW; mc.height = mkH_; const mx = mc.getContext('2d'), im = mx.createImageData(mkW, mkH_);
    for (let y = 0; y < mkH_; y++) for (let x = 0; x < mkW; x++) { const [u, v] = srcToOut((x + .5) / mkW, (y + .5) / mkH_), ix = Math.floor(u * W), iy = Math.floor(v * H); const a = ix >= 0 && iy >= 0 && ix < W && iy < H ? sd[(iy * W + ix) * 4 + 3] : 0; const i = (y * mkW + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = a; }
    mx.putImageData(im, 0, 0); mkA.drawImage(mc, 0, 0); S.maskHas = true; uploadMask(); commitMask(); sel2.clearRect(0, 0, W, H); hasSel = false; pushHist('Выделение → маска'); setTab('local'); toast('Выделение перенесено в маску кисти — настрой, что с ним сделать');
  }

  /* ---------- подключение кнопок ---------- */
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('sOrient', () => guard('sOrient', orient)); on('sCenter', () => guard('sCenter', centerFace)); on('sHorizon', () => guard('sHorizon', async () => horizon()));
  on('sHide', () => guard('sHide', hideFaces)); on('sBeauty', () => guard('sBeauty', beauty)); on('sStyle', () => S.src ? $('file3').click() : toast('Сначала открой фото'));
  on('sErase', () => S.src ? setTab('erase') : toast('Сначала открой фото'));
  on('sCrop11', () => guard('sCrop11', () => smartCrop(1, '1:1'))); on('sCrop45', () => guard('sCrop45', () => smartCrop(4 / 5, '4:5'))); on('sCrop916', () => guard('sCrop916', () => smartCrop(9 / 16, '9:16'))); on('sCrop169', () => guard('sCrop169', () => smartCrop(16 / 9, '16:9')));
  $('file3').onchange = e => { const f = e.target.files[0]; if (!f) return; const url = URL.createObjectURL(f), im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); URL.revokeObjectURL(url); setStyle(c); }; im.src = url; e.target.value = ''; };
  $('skSl').oninput = applyStyle; $('skSl').onchange = () => pushHist('Сила стиля');
  on('skOff', () => { styleLut = null; ['r', 'g', 'b'].forEach(c => S.curves[c] = [[0, 0], [1, 1]]); updateCurveTex(); render(); $('styleBox').style.display = 'none'; pushHist('Стиль убран'); });
  const modes = { eBrush: 'brush', eWand: 'wand', eRub: 'rub' };
  Object.entries(modes).forEach(([id, m]) => on(id, () => { eMode = m; Object.keys(modes).forEach(k => $(k).classList.toggle('on', k === id)); hap(); }));
  $('eSize').oninput = e => { eSize = +e.target.value; $('esV').textContent = e.target.value; fill(e.target); }; $('eTol').oninput = e => { eTol = +e.target.value; $('etV').textContent = e.target.value; fill(e.target); };
  on('eGo', removeObject); on('eToMask', selToMask); on('eClear', () => { if (sel2) sel2.clearRect(0, 0, selCv.width, selCv.height); hasSel = false; render(); hap('light'); });
  document.querySelectorAll('#p-erase input[type=range]').forEach(fill);
  return { eraseDown, eraseMove, eraseUp, drawSel, detect, frameCanvas };
})();
