/* Garage Legends — Cartas de Leyenda: dibujo en canvas (pantalla y descarga para imprimir) */
(function (GL) {
  'use strict';
  const BODY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const TIERS = [null,
    { name: 'BRONCE', a: '#e9b07c', b: '#8a5a33', c: '#f8dcbd' },
    { name: 'PLATA',  a: '#eef1f6', b: '#8a94a6', c: '#ffffff' },
    { name: 'ORO',    a: '#fde68a', b: '#b7791f', c: '#fff8d6' }];
  GL.CARD_TIERS = TIERS;

  const cache = {};
  const loadImg = src => cache[src] || (cache[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, text, weight, family, size, maxW, min) { do { c.font = weight + ' ' + size + 'px ' + family; size -= 2; } while (c.measureText(text).width > maxW && size > (min || 14)); }
  function wrap(c, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(/\s+/); let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(test).width > maxW && line) {
        n++;
        if (n === maxLines) { c.fillText(line.replace(/[.,;:]?$/, '…'), x, y); return; }
        c.fillText(line, x, y); y += lh; line = words[i];
      } else line = test;
    }
    if (line) c.fillText(line, x, y);
  }
  const nf = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  /* Dibuja la carta de un coche. W = ancho en píxeles (750 pantalla, 1500 impresión a 300 ppp) */
  GL.drawLegendCard = async function (cv, carId, tierN, W) {
    const car = GL.carById[carId]; if (!car) return;
    const T = TIERS[Math.max(1, Math.min(3, tierN || 1))], RC = GL.RARITIES[car.rarity].color;
    const k = (W || 750) / 750;
    cv.width = Math.round(750 * k); cv.height = Math.round(1050 * k);
    const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
    try { await document.fonts.load('800 40px Orbitron'); } catch (e) { }
    const img = await loadImg('img/cars/' + carId + '.webp').catch(() => null);
    const metal = (x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, T.a); g.addColorStop(.3, T.b); g.addColorStop(.55, T.c); g.addColorStop(.8, T.b); g.addColorStop(1, T.a); return g; };

    // marco metálico y panel interior
    rr(c, 0, 0, 750, 1050, 44); c.fillStyle = metal(0, 0, 750, 1050); c.fill();
    let g = c.createLinearGradient(0, 26, 0, 1024); g.addColorStop(0, '#182236'); g.addColorStop(1, '#090d15');
    rr(c, 26, 26, 698, 998, 26); c.fillStyle = g; c.fill();

    // rareza y potencia
    const light = car.rarity === 'EPIC' || car.rarity === 'MYTHIC';
    c.font = '800 22px ' + BODY; const lab = GL.RARITIES[car.rarity].label.toUpperCase(), lw = c.measureText(lab).width + 36;
    rr(c, 46, 48, lw, 44, 10); c.fillStyle = RC; c.fill();
    c.fillStyle = light ? '#fff' : '#0a0d14'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(lab, 64, 71);
    c.textAlign = 'right'; c.fillStyle = '#fff'; c.font = '900 44px Orbitron, ' + BODY; const hp = nf(car.hp); c.fillText(hp, 704, 72);
    const hw = c.measureText(hp).width; c.font = '800 18px ' + BODY; c.fillStyle = T.a; c.fillText('CV', 704 - hw - 8, 78);

    // marca y modelo
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = T.a; c.font = '800 22px ' + BODY; c.fillText(car.brand.toUpperCase(), 48, 132);
    c.fillStyle = '#fff'; fit(c, car.model, '800', 'Orbitron, ' + BODY, 42, 654, 22); c.fillText(car.model, 46, 176);

    // foto
    const px = 46, py = 196, pw = 658, ph = 404;
    c.save(); rr(c, px, py, pw, ph, 16); c.clip();
    if (img) { const sw = img.height * pw / ph, sx = Math.max(0, (img.width - sw) / 2); c.drawImage(img, sx, 0, Math.min(sw, img.width), img.height, px, py, pw, ph); }
    else { c.fillStyle = '#05070c'; c.fillRect(px, py, pw, ph); }
    g = c.createLinearGradient(0, py + ph - 90, 0, py + ph); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = g; c.fillRect(px, py + ph - 90, pw, 90);
    c.restore();
    rr(c, px, py, pw, ph, 16); c.lineWidth = 5; c.strokeStyle = metal(px, py, px + pw, py + ph); c.stroke();
    const ctry = GL.COUNTRIES[car.country].name.toUpperCase();
    c.font = '800 18px ' + BODY; c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText(ctry + ' · ' + car.year, px + pw - 16, py + ph - 16);

    // datos
    const stats = [['0-100', String(car.accel).replace('.', ',') + ' s'], ['VEL. MÁX', nf(car.top) + ' km/h'], ['PESO', nf(car.weight) + ' kg'], ['AÑO', String(car.year)]];
    const bw = (658 - 36) / 4;
    stats.forEach((s, i) => {
      const x = 46 + i * (bw + 12);
      rr(c, x, 620, bw, 88, 12); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke();
      c.textAlign = 'center'; c.fillStyle = '#8fa0bd'; c.font = '700 15px ' + BODY; c.fillText(s[0], x + bw / 2, 648);
      c.fillStyle = '#fff'; fit(c, s[1], '800', 'Orbitron, ' + BODY, 24, bw - 14, 14); c.fillText(s[1], x + bw / 2, 688);
    });

    // dato de leyenda
    rr(c, 46, 728, 658, 196, 14); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill(); c.lineWidth = 2; c.strokeStyle = T.b; c.stroke();
    c.font = '800 17px ' + BODY; const tl = 'DATO DE LEYENDA', tw = c.measureText(tl).width + 28;
    rr(c, 62, 714, tw, 30, 8); c.fillStyle = metal(62, 714, 62 + tw, 744); c.fill();
    c.fillStyle = '#1a1206'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(tl, 76, 730); c.textBaseline = 'alphabetic';
    c.fillStyle = '#e8eef9'; c.font = '500 23px ' + BODY; wrap(c, car.fact, 66, 786, 618, 32, 4);
    c.fillStyle = '#8fa0bd'; c.font = '600 17px ' + BODY; fit(c, car.engine + ' · ' + car.drive, '600', BODY, 19, 618, 12); c.fillText(car.engine + ' · ' + car.drive, 66, 906);

    // pie: número de serie, medalla y sello
    const idx = GL.CARS.indexOf(car) + 1;
    c.textAlign = 'left'; c.fillStyle = T.a; c.font = '800 26px Orbitron, ' + BODY; c.fillText('Nº ' + String(idx).padStart(2, '0') + '/' + GL.CARS.length, 48, 974);
    c.textAlign = 'center'; c.font = '800 20px ' + BODY; c.fillStyle = T.c; c.fillText('★ ' + T.name + ' ★', 375, 972);
    c.textAlign = 'right'; c.fillStyle = '#fff'; c.font = '800 18px Orbitron, ' + BODY; c.fillText('GARAGE LEGENDS', 704, 972);
    const cr = (window.GL_CREDITS || {})[carId];
    if (cr) { c.textAlign = 'center'; c.fillStyle = '#6b7a96'; const t = 'Foto: ' + (cr.author || 'Wikimedia Commons') + ' · ' + cr.license + ' · Wikimedia Commons'; fit(c, t, '500', BODY, 15, 640, 9); c.fillText(t, 375, 1006); }
  };

  GL.cardBlob = async function (carId, tierN, W) {
    const cv = document.createElement('canvas');
    await GL.drawLegendCard(cv, carId, tierN, W);
    return new Promise(res => cv.toBlob(res, 'image/png'));
  };
})(window.GL);
