/* Garage Legends 2.0 — Interfaz */
(function (GL) {
  'use strict';
  const KEY = 'gl2_state', PKEY = 'gl2_parent', V1KEY = 'garage_legends_supercars_v2';
  const $ = s => document.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const R = GL.RARITIES;

  let S = null;          // estado del juego
  let P = null;          // configuración parental (no se exporta)
  let tab = 'home';
  let firstRun = false, migrated = false;
  const ui = { q: '', rarity: 'ALL', status: 'ALL', countdownTimer: null, quiz: null, lastPendingAch: 0 };

  /* ================= Persistencia ================= */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  function load() {
    const raw = lsGet(KEY);
    if (raw) {
      try { S = Object.assign(GL.newState(), JSON.parse(raw)); } catch (e) { S = null; }
    }
    if (!S) {
      const old = lsGet(V1KEY);
      if (old) { try { S = GL.migrateV1(JSON.parse(old)); migrated = !!S; } catch (e) { S = null; } }
    }
    if (!S) { S = GL.newState(); firstRun = true; }
    // completar campos nuevos si faltan
    const base = GL.newState();
    for (const k in base) if (S[k] === undefined) S[k] = base[k];
    for (const k in base.stats) if (S.stats[k] === undefined) S.stats[k] = 0;
    if (!Array.isArray(S.fresh)) S.fresh = [];        // cromos nuevos aún no vistos en el álbum ("carId:n")
    try { P = JSON.parse(lsGet(PKEY) || 'null'); } catch (e) { P = null; }
    if (!P) P = { pinHash: null, salt: null, familyKey: null, tasks: GL.DEFAULT_TASKS.map(t => Object.assign({}, t)), maxPerDay: 5, fails: 0, lockUntil: 0 };
    GL.touchClock(S); GL.ensureMissions(S); GL.ensureWeek(S);
    applyEasy();
    save();
  }
  function applyEasy() { document.body.classList.toggle('easy', S.settings.easyRead !== false); }
  function save() {
    lsSet(KEY, JSON.stringify(S));
    hud();
  }
  function saveP() { lsSet(PKEY, JSON.stringify(P)); }

  /* ================= Sonido, vibración y efectos ================= */
  let actx = null;
  function ac() { if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; actx = new C(); } if (actx.state === 'suspended') actx.resume(); return actx; }
  function tone(freq, start, dur, type, vol) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime + start);
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, c.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
  }
  function sfx(t) {
    if (!S.settings.sound) return;
    try {
      if (t === 'tap') tone(660, 0, 0.06, 'sine', 0.04);
      else if (t === 'flip') { tone(320, 0, 0.08, 'triangle', 0.05); tone(480, 0.04, 0.08, 'triangle', 0.04); }
      else if (t === 'new') { tone(660, 0, 0.1, 'triangle'); tone(990, 0.08, 0.16, 'triangle'); }
      else if (t === 'dup') tone(300, 0, 0.12, 'sine', 0.05);
      else if (t === 'epic') [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.08));
      else if (t === 'legend') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.4, 'square', 0.05));
      else if (t === 'complete') [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.09));
      else if (t === 'level') [440, 554, 659, 880].forEach((f, i) => tone(f, i * 0.09, 0.3, 'sawtooth', 0.05));
      else if (t === 'rip') { const c = ac(); if (!c) return; const len = 0.35 * c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); const src = c.createBufferSource(), g = c.createGain(); g.gain.value = 0.12; src.buffer = b; src.connect(g); g.connect(c.destination); src.start(); }
      else if (t === 'coin') { tone(988, 0, 0.08, 'square', 0.04); tone(1319, 0.07, 0.18, 'square', 0.04); }
      else if (t === 'error') tone(180, 0, 0.18, 'sawtooth', 0.05);
    } catch (e) { }
  }
  function buzz(p) { if (S.settings.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } }

  function confetti(colors, amount) {
    const cv = $('#fx'), ctx = cv.getContext('2d');
    const W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio;
    const parts = [];
    for (let i = 0; i < (amount || 140); i++) parts.push({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .45, vx: (Math.random() - .5) * 26 * devicePixelRatio, vy: (-Math.random() * 22 - 8) * devicePixelRatio, s: (4 + Math.random() * 6) * devicePixelRatio, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[i % colors.length] });
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, W, H); t++;
      parts.forEach(p => { p.vy += 0.6 * devicePixelRatio; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (t < 160) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })();
  }
  function flashScreen(color) {
    const d = document.createElement('div'); d.className = 'flashscreen';
    d.style.background = 'radial-gradient(circle, ' + color + ', transparent 70%)';
    document.body.appendChild(d); setTimeout(() => d.remove(), 800);
  }
  let toastT = null;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 3200);
  }

  /* ================= Lectura en voz alta ================= */
  const cleanSpeech = t => String(t).replace(/<[^>]+>/g, ' ').replace(/🔧/g, ' créditos ').replace(/[#★]/g, ' ')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B50}]/gu, '').replace(/\s+/g, ' ').trim();
  function speak(text, btn) {
    if (!('speechSynthesis' in window)) { toast('Este móvil no puede leer en voz alta.'); return; }
    try {
      speechSynthesis.cancel();
      document.querySelectorAll('.say.speaking').forEach(b => b.classList.remove('speaking'));
      const u = new SpeechSynthesisUtterance(cleanSpeech(text));
      u.lang = 'es-ES'; u.rate = 0.9;
      const vs = speechSynthesis.getVoices();
      const v = vs.find(x => /^es[-_]ES/i.test(x.lang)) || vs.find(x => /^es/i.test(x.lang));
      if (v) u.voice = v;
      if (btn) { btn.classList.add('speaking'); u.onend = u.onerror = () => btn.classList.remove('speaking'); }
      speechSynthesis.speak(u);
    } catch (e) { }
  }
  const autoSpeak = text => { if (S.settings.voice !== false) speak(text); };
  const sayBtn = text => '<button class="say" data-act="say" data-t="' + esc(text) + '" aria-label="Escuchar">🔊</button>';
  if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) { } }

  /* ================= Ayudas emergentes (una sola vez) ================= */
  function tip(id, ico, text) {
    if (!S || S.tips[id] || ui.tour) return;
    if (id !== 'hallFirst' && !$('#overlay').classList.contains('hidden')) return;   // no tapar celebraciones ni sobres
    S.tips[id] = true; save();
    const old = $('#tipBox'); if (old) old.remove();
    const d = document.createElement('div'); d.className = 'tip'; d.id = 'tipBox';
    d.innerHTML = '<div class="tip-row"><div class="tip-ico">' + ico + '</div><div class="tip-txt">' + esc(text) + '</div>' + sayBtn(text) + '</div><div class="row mt8" style="justify-content:flex-end"><button class="btn small primary" data-act="tipOk">Entendido</button></div>';
    document.body.appendChild(d);
  }

  /* ================= Ayuda de cada pantalla ================= */
  const HELP = {
    general: { title: '❓ Cómo se juega', steps: [
      ['🃏', 'Cada coche tiene 10 cromos. Cada cromo enseña un trozo de la foto y un dato del coche.'],
      ['📦', 'Abre sobres para conseguir cromos. Tienes un sobre gratis cada día.'],
      ['🔥', 'Si entras días seguidos, sube tu racha y ganas premios extra.'],
      ['🔧', 'Las cartas repetidas te dan créditos. Con los créditos fabricas el cromo que te falta.'],
      ['🏅', 'Al completar un coche ganas una medalla y su Carta de Leyenda. Puedes mejorarlas a plata y a oro.'],
      ['📚', 'Haz los deberes, toca «¡Hecho!» en Premios y tus padres lo aprueban. ¡Ganas sobres!'],
      ['✅', 'Si no sabes qué hacer, mira el cuadro verde de Inicio.']] },
    home: { title: '🏠 Inicio', steps: [
      ['✅', 'El cuadro verde te dice qué hacer ahora. Toca su botón.'],
      ['🎁', 'Arriba recoges tu sobre gratis de cada día.'],
      ['📋', 'Las misiones son pequeños retos del día. Al terminarlas, toca el botón amarillo para cobrar.'],
      ['📅', 'El objetivo semanal sube con cada tarea aprobada. Tiene 3 escalones con premio.'],
      ['🏛️', 'En el Salón de la Fama están tus Cartas de Leyenda: una por cada coche completado.'],
      ['🏆', 'En la Vitrina ves tus medallas, insignias y trofeos.']] },
    album: { title: '📒 Álbum', steps: [
      ['📖', 'Cada hoja del álbum es una marca. Desliza hacia los lados para pasar de hoja.'],
      ['🔢', 'Los huecos con número son cromos que te faltan. Los que tienen foto ya están pegados.'],
      ['📑', 'Toca el nombre de la marca, arriba, para abrir el índice y saltar a otra hoja.'],
      ['🔒', 'Los coches con candado son míticos: se abren al subir de nivel.'],
      ['👆', 'Toca un coche para ver sus cromos y fabricar los que faltan.'],
      ['🔎', 'Con el botón «Buscar» ves todos los coches en una lista con filtros.']] },
    packs: { title: '📦 Sobres', steps: [
      ['📦', 'Toca «Abrir» y después toca el sobre.'],
      ['🃏', 'Toca cada carta para darle la vuelta. El color del borde dice lo rara que es.'],
      ['🟢', 'NUEVO significa que es un cromo que no tenías.'],
      ['🔧', 'Si es repetido, se convierte en créditos.'],
      ['🛒', 'Con créditos puedes comprar sobres o un cromo sorpresa.']] },
    quiz: { title: '🧩 Desafío', steps: [
      ['👂', 'Toca 🔊 para escuchar la pregunta.'],
      ['👆', 'Toca la respuesta que creas correcta.'],
      ['🟢', 'Verde es correcto. Después verás los datos de verdad.'],
      ['🥈', 'Acertar preguntas de un coche completo te da su medalla de plata.'],
      ['📆', 'Puedes jugar 3 partidas cada día.']] },
    rewards: { title: '🎯 Premios', steps: [
      ['📚', 'Cuando termines una tarea, toca «¡Hecho!».'],
      ['📲', 'Toca el botón verde para avisar por WhatsApp y después toca enviar.'],
      ['👨‍👩‍👦', 'Tus padres la aprueban con su PIN o te mandan un código.'],
      ['📅', 'Cuantas más tareas a la semana, mejor premio semanal.'],
      ['🎟️', 'Si te mandan un enlace con tu premio, solo tienes que tocarlo. Si te mandan un código, escríbelo en «Canjear código».'],
      ['🏅', 'Los logros con botón amarillo están listos para cobrar.']] },
    car: { title: '🚗 Ficha del coche', steps: [
      ['🧩', 'Cada casilla del puzle es un cromo. Toca una casilla para ver qué dato tiene.'],
      ['🛠️', 'El botón 🛠️ fabrica un cromo que te falta, pagando créditos.'],
      ['🥉', 'Con los 10 cromos ganas la medalla de bronce y ves la ficha completa.'],
      ['🥈', 'Plata: acierta 3 preguntas de este coche en el Desafío.'],
      ['🥇', 'Oro: consigue 5 repetidos de este coche después de completarlo.']] }
  };
  const helpBtn = k => '<div class="screen-help"><button class="help-btn" data-act="help" data-k="' + k + '">❓ ¿Cómo funciona?</button></div>';
  function helpSheet(k) {
    const h = HELP[k] || HELP.general;
    const all = h.steps.map(x => x[1]).join('. ');
    openSheet(h.title, '<div class="row" style="margin-bottom:10px"><button class="btn small primary" data-act="say" data-t="' + esc(all) + '">🔊 Escuchar todo</button></div>' +
      h.steps.map(x => '<div class="help-step"><div class="hs-n">' + x[0] + '</div><div class="hs-t grow">' + esc(x[1]) + '</div>' + sayBtn(x[1]) + '</div>').join('') +
      '<button class="btn block mt16" data-act="startTour">🧭 Ver el tutorial guiado otra vez</button>');
  }

  /* ================= Tutorial guiado ================= */
  const TOUR = [
    { ico: '👋', t: '¡Hola! Te voy a enseñar a jugar, paso a paso. Si quieres, toca el altavoz para que te lo lea.', btn: 'Empezar' },
    { tab: 'home', sel: '.bottomnav [data-tab="packs"]', ico: '📦', t: 'Aquí están tus sobres. Toca donde brilla.', tap: true },
    { tab: 'packs', sel: '[data-act="openPack"][data-type="standard"]:not([disabled])', ico: '🎁', t: 'Tienes sobres de regalo. Toca «Abrir». Luego toca el sobre y gira las cartas.', tap: true, wait: 'reveal' },
    { ico: '🃏', t: '¡Muy bien! Cada carta es un cromo: un trozo de la foto de un coche y un dato real de ese coche.' },
    { sel: '.bottomnav [data-tab="album"]', ico: '📒', t: 'Ahora toca «Álbum» para ver tus coches.', tap: true },
    { tab: 'album', sel: '#albumBook .acar.has, #albumBook .acar.done, #albumList .tile:not(.unknown):not(.locked)', ico: '🚗', t: 'Cada coche tiene 10 huecos para sus cromos. Cuando pegas los 10, el coche es tuyo y ganas una medalla.' },
    { sel: '.top-right .pill', ico: '🔧', t: 'Las cartas repetidas te dan créditos. Con los créditos fabricas el cromo que te falta.' },
    { sel: '.bottomnav [data-tab="rewards"]', ico: '🎯', t: 'Toca «Premios».', tap: true },
    { tab: 'rewards', sel: '[data-act="request"]', ico: '📚', t: 'Cuando acabes los deberes, toca «¡Hecho!» y avisa a tus padres por WhatsApp. Cuando lo aprueben, ganas sobres.' },
    { sel: '.bottomnav [data-tab="quiz"]', ico: '🧩', t: 'En «Desafío» respondes preguntas de coches y ganas créditos.' },
    { sel: '.bottomnav [data-tab="home"]', ico: '🏠', t: 'Toca «Inicio».', tap: true },
    { tab: 'home', sel: '#nextStep', ico: '✅', t: 'Aquí siempre verás qué hacer ahora. Si te pierdes, mira el cuadro verde.' },
    { ico: '🏆', t: '¡Ya sabes jugar! Te regalo un sobre por terminar el tutorial.', btn: '¡Genial!', final: true }
  ];
  function startTour() {
    closeSheet(); closeOverlay();
    const t = $('#tipBox'); if (t) t.remove();
    ui.tour = { i: 0 };
    go('home');
    setTimeout(drawTour, 150);
  }
  function endTour(finished) {
    const L = $('#tourLayer'); if (L) L.remove();
    closeOverlay();
    try { speechSynthesis.cancel(); } catch (e) { }
    const wasFirst = !S.tutorialDone;
    ui.tour = null;
    S.tutorialDone = true;
    if (finished && wasFirst) { S.packs.standard++; GL.log(S, '🧭', 'Tutorial completado'); confetti(['#fbbf24', '#22d3ee', '#fff']); sfx('complete'); toast('🎁 +1 Sobre Garage por terminar el tutorial'); }
    save(); render();
  }
  function tourNext() {
    if (!ui.tour) return;
    const st = TOUR[ui.tour.i];
    if (st && st.final) { endTour(true); return; }
    ui.tour.i++;
    if (ui.tour.i >= TOUR.length) { endTour(true); return; }
    drawTour();
  }
  function tourEvent(name) {
    if (!ui.tour || !ui.tour.waiting || ui.tour.waiting !== name) return;
    ui.tour.waiting = null;
    ui.tour.i++;
    setTimeout(drawTour, 300);
  }
  function drawTour() {
    if (!ui.tour) return;
    const st = TOUR[ui.tour.i]; if (!st) return endTour(true);
    if (st.tab && tab !== st.tab) go(st.tab);
    let L = $('#tourLayer');
    if (!L) { L = document.createElement('div'); L.id = 'tourLayer'; L.className = 'tour'; document.body.appendChild(L); }
    L.style.display = '';
    let el = st.sel ? document.querySelector(st.sel) : null;
    if (st.sel && !el) { ui.tour.i++; return drawTour(); }   // si no existe, saltar el paso
    if (el && el.scrollIntoView && !el.closest('.bottomnav') && !el.closest('.topbar')) el.scrollIntoView({ block: 'center' });
    setTimeout(() => {
      const r = el ? el.getBoundingClientRect() : null;
      const pad = 6;
      const hole = r ? 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px'
        : 'left:50%;top:40%;width:0;height:0';
      const below = r ? (r.top + r.height / 2 < innerHeight / 2) : false;
      const bubblePos = !r ? 'top:28%' : below ? 'top:' + Math.min(innerHeight - 260, r.bottom + 18) + 'px' : 'bottom:' + Math.max(12, innerHeight - r.top + 18) + 'px';
      const n = ui.tour.i + 1;
      L.innerHTML = '<div class="tour-block"></div><div class="tour-hole' + (r ? '' : ' none') + '" style="' + hole + '"></div>' +
        (r && st.tap ? '<div class="tour-finger" style="left:' + (r.left + r.width / 2 - 8) + 'px;top:' + (r.top + r.height / 2 - 4) + 'px">👆</div>' : '') +
        '<div class="tour-bubble" style="' + bubblePos + '"><div class="tb-row"><div class="tb-ico">' + st.ico + '</div><div class="tb-txt">' + esc(st.t) + '</div>' + sayBtn(st.t) + '</div>' +
        '<div class="tb-act"><span class="tb-step">Paso ' + n + ' de ' + TOUR.length + '</span>' +
        (st.final ? '' : '<button class="btn small ghost" data-act="tourSkip">Saltar</button>') +
        (st.tap ? '' : '<button class="btn small gold" data-act="tourNext">' + (st.btn || 'Siguiente') + '</button>') + '</div></div>';
      L.querySelector('.tour-block').onclick = ev => {
        if (!st.tap || !r) return;
        const x = ev.clientX, y = ev.clientY;
        if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
          if (st.wait) { ui.tour.waiting = st.wait; L.style.display = 'none'; el.click(); }
          else { el.click(); ui.tour.i++; setTimeout(drawTour, 350); }
        }
      };
      autoSpeak(st.t);
    }, el ? 260 : 0);
  }
  window.addEventListener('resize', () => { if (ui.tour && !ui.tour.waiting) drawTour(); });

  /* ================= Qué hago ahora ================= */
  function nextStep() {
    if (GL.dailyAvailable(S)) return { ico: '🎁', t: 'Recoge tu sobre gratis de hoy.', btn: 'Recoger', act: 'claimDaily' };
    const packs = S.packs.standard + S.packs.epic + S.packs.legendary;
    if (packs) return { ico: '📦', t: 'Tienes ' + packs + (packs > 1 ? ' sobres' : ' sobre') + ' sin abrir. ¡Ábrelos!', btn: 'Abrir', act: 'nsOpen' };
    const mi = S.missions.ids.find(id => { const st = GL.missionProgress(S, id); return st.done && !st.claimed; });
    if (mi) return { ico: '📋', t: 'Has terminado una misión. Cobra tu premio.', btn: 'Cobrar', act: 'claimMission', extra: 'data-id="' + mi + '"' };
    const wk = GL.WEEKLY.find(w => S.weekly.tasks >= w.target && !S.weekly.claimed.includes(w.id));
    if (wk || GL.pendingAchievements(S)) return { ico: '🏅', t: 'Tienes premios listos para cobrar.', btn: 'Ir a Premios', act: 'go', extra: 'data-tab="rewards"' };
    const craftable = GL.availableCars(S).filter(c => { const n = GL.count(S, c.id); return n >= 7 && n < 10 && S.credits >= GL.craftCost(c); }).sort((a, b) => GL.count(S, b.id) - GL.count(S, a.id))[0];
    if (craftable) return { ico: '🛠️', t: 'Tienes créditos para fabricar un cromo del ' + craftable.model + '.', btn: 'Ver coche', act: 'openCar', extra: 'data-car="' + craftable.id + '"' };
    if (GL.quizAvailable(S) > 0) return { ico: '🧩', t: 'Juega el Desafío y gana créditos.', btn: 'Jugar', act: 'go', extra: 'data-tab="quiz"' };
    if (S.requests.length) return { ico: '⏳', t: 'Pide a tus padres que aprueben tus tareas.', btn: 'Ver', act: 'go', extra: 'data-tab="rewards"' };
    return { ico: '📚', t: 'Haz tus deberes y pide tu premio para conseguir más sobres.', btn: 'Premios', act: 'go', extra: 'data-tab="rewards"' };
  }
  function nextStepCard() {
    const n = nextStep();
    return '<div class="next-step" id="nextStep"><div class="ns-ico">' + n.ico + '</div><div class="grow"><div class="ns-lab">¿Qué hago ahora?</div><div class="ns-txt">' + esc(n.t) + '</div></div>' +
      '<div class="row gap6" style="flex-direction:column">' + sayBtn('¿Qué hago ahora? ' + n.t) + '<button class="btn small green" data-act="' + n.act + '" ' + (n.extra || '') + '>' + n.btn + '</button></div></div>';
  }

  /* ================= Cartas de Leyenda y Salón de la Fama ================= */
  const tierOf = id => Math.max(1, S.medals[id] || 1);
  const lcardHtml = (id, cls) => '<div class="lcard lt' + tierOf(id) + ' ' + (cls || '') + '" data-lcard="' + id + '"><canvas></canvas><i class="lholo"></i></div>';
  function mountCards(root, W) {
    (root || document).querySelectorAll('[data-lcard]').forEach(el => {
      const cv = el.querySelector('canvas'); if (!cv || cv.dataset.done) return;
      cv.dataset.done = '1'; GL.drawLegendCard(cv, el.dataset.lcard, tierOf(el.dataset.lcard), W || 750);
    });
  }
  function setTilt(el, rx, ry) {
    el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg)';
    el.style.setProperty('--mx', (50 + ry * 3.2).toFixed(1) + '%'); el.style.setProperty('--my', (50 + rx * 3.2).toFixed(1) + '%');
  }
  document.addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest('.lcard.tilt'); if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt(el, (0.5 - (e.clientY - r.top) / r.height) * 22, ((e.clientX - r.left) / r.width - 0.5) * 22);
  });
  window.addEventListener('deviceorientation', e => {
    const el = document.querySelector('.lcard.tilt'); if (!el || e.gamma == null || e.beta == null) return;
    const cl = v => Math.max(-14, Math.min(14, v));
    setTilt(el, cl((45 - e.beta) / 2.5), cl(e.gamma / 2.5));
  });
  function bigLegend(id) {
    const car = GL.carById[id]; if (!car || !GL.isComplete(S, id)) return;
    const t = tierOf(id), m = GL.MEDALS[t], next = GL.MEDALS[t + 1];
    openSheet('🃏 Carta de Leyenda', '<div class="lcard-big">' + lcardHtml(id, 'tilt') + '</div>' +
      '<div class="center small muted mt12">Mueve el dedo sobre la carta o inclina el móvil para ver el brillo.</div>' +
      '<div class="card mt12 small">' + m.icon + ' <b>Edición ' + m.name.toLowerCase() + '.</b> ' + (next ? 'Para mejorarla a ' + next.name.toLowerCase() + ': ' + next.how.charAt(0).toLowerCase() + next.how.slice(1) + '.' : '¡Es la mejor edición que existe!') + '</div>' +
      '<button class="btn gold block mt12" data-act="dlCard" data-car="' + id + '">📥 Descargar para imprimir</button>' +
      '<div class="row mt8 gap6"><button class="btn small grow" data-act="openCar" data-car="' + id + '">📋 Ver ficha</button><button class="btn small grow ' + (S.favorite === id ? 'gold' : '') + '" data-act="setFavCard" data-car="' + id + '">' + (S.favorite === id ? '⭐ Favorito' : '☆ Favorito') + '</button></div>',
      { onMount: w => mountCards(w, 750) });
  }
  async function downloadCard(id) {
    toast('🖨️ Preparando la carta…');
    try {
      const blob = await GL.cardBlob(id, tierOf(id), 1500);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'garage-legends-' + id + '.png'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast('📥 Carta descargada. Tamaño de cromo: 6,3 × 8,8 cm.');
    } catch (e) { toast('No se pudo crear la imagen.'); }
  }
  function hallCars() {
    const ro = c => GL.RARITY_ORDER.indexOf(c.rarity);
    return GL.CARS.filter(c => GL.isComplete(S, c.id)).sort((a, b) => (b.id === S.favorite) - (a.id === S.favorite) || tierOf(b.id) - tierOf(a.id) || ro(b) - ro(a));
  }
  function hall() {
    const cars = hallCars(), n = k => cars.filter(c => tierOf(c.id) === k).length;
    let items = cars.map(c => '<div class="hall-item" data-act="lcard" data-car="' + c.id + '">' + lcardHtml(c.id) + (c.id === S.favorite ? '<span class="hall-fav">⭐</span>' : '') + '</div>').join('');
    if (!cars.length) items = '<div class="hall-item"><div class="lcard hall-empty"><div>🔒<br><br>Completa tu primer coche para conseguir tu primera Carta de Leyenda</div></div></div>';
    closeSheet();
    openOverlay('<div class="hall"><div class="hall-top"><button class="icon-btn" data-act="closeOverlay" aria-label="Cerrar">✕</button><div class="grow"><div class="hall-title">Salón de la Fama</div><div class="small">' + cars.length + ' de ' + GL.CARS.length + ' cartas · 🥇 ' + n(3) + ' · 🥈 ' + n(2) + ' · 🥉 ' + n(1) + '</div></div></div>' +
      '<div class="hall-track">' + items + '</div><div class="hall-hint">' + (cars.length ? 'Desliza para ver tus cartas. Toca una para verla en grande.' : 'Aquí se expondrán tus coches completados.') + '</div></div>');
    mountCards($('#overlay'), 460);
    if (cars.length) setTimeout(() => tip('hallFirst', '🏛️', 'Este es tu Salón de la Fama. Cada coche que completas se convierte en una Carta de Leyenda. Tócala para verla en grande y descargarla.'), 500);
  }

  /* ================= Vitrina ================= */
  const brandShort = b => ({ 'Mercedes-AMG': 'AMG', 'Mercedes-Benz': 'MB', 'Aston Martin': 'AM', 'Volkswagen': 'VW', 'Lamborghini': 'LAMBO', 'Koenigsegg': 'KOE', 'Chevrolet': 'CHEVY' }[b] || (b.length <= 5 ? b.toUpperCase() : b.slice(0, 3).toUpperCase()));
  function vitrina() {
    const medals = GL.CARS.filter(c => (S.medals[c.id] || 0) > 0);
    const gold = medals.filter(c => S.medals[c.id] === 3).length, silver = medals.filter(c => S.medals[c.id] === 2).length;
    let b = '<button class="btn gold block" style="margin-bottom:10px" data-act="hall">🏛️ Ir al Salón de la Fama</button><div class="card small">' + sayBtn('Vitrina. Aquí guardas tus medallas de coches, las insignias de marca y los trofeos.') + ' Aquí guardas todo lo que vas consiguiendo. Toca cualquier cosa para saber cómo se gana.</div>';
    b += '<h2 class="sec">🏅 Medallas de coches<span class="count">' + medals.length + '/' + GL.CARS.length + ' · 🥈' + silver + ' · 🥇' + gold + '</span></h2><div class="medal-grid">' +
      GL.CARS.slice().sort((x, y) => (S.medals[y.id] || 0) - (S.medals[x.id] || 0)).map(c => { const t = S.medals[c.id] || 0; return '<div class="medal ' + (t ? 't' + t : 'lock') + '" data-act="openCar" data-car="' + c.id + '"><img loading="lazy" src="' + carThumb(c.id) + '" alt=""><span class="md-ic">' + (t ? GL.MEDALS[t].icon : '🔒') + '</span><div class="md-nm">' + esc(c.model) + '</div></div>'; }).join('') + '</div>';
    b += '<h2 class="sec">🛡️ Insignias de marca<span class="count">' + S.brands.length + '/' + GL.BRANDS.length + '</span></h2><div class="small muted" style="margin:-4px 2px 10px">Completa todos los coches de una marca para ganar su insignia.</div><div class="emblem-grid">' +
      GL.BRANDS.slice().sort((x, y) => S.brands.includes(y) - S.brands.includes(x)).map(br => { const cars = GL.brandCars(br), done = cars.filter(c => GL.isComplete(S, c.id)).length, got = S.brands.includes(br);
        return '<div class="emblem ' + (got ? '' : 'lock') + '" data-act="emblemInfo" data-b="' + esc(br) + '"><div class="em-c">' + esc(brandShort(br)) + '</div><div class="em-n">' + esc(br) + '</div><div class="em-p">' + done + '/' + cars.length + '</div></div>'; }).join('') + '</div>';
    b += '<h2 class="sec">🏆 Trofeos<span class="count">' + S.achievements.length + '/' + GL.ACHIEVEMENTS.length + '</span></h2><div class="trophy-grid">' +
      GL.ACHIEVEMENTS.slice().sort((x, y) => S.achievements.includes(y.id) - S.achievements.includes(x.id)).map(a => { const got = S.achievements.includes(a.id); return '<div class="trophy ' + (got ? '' : 'lock') + '" data-act="trophyInfo" data-id="' + a.id + '"><div class="tr-i">' + a.icon + '</div>' + esc(a.name) + '</div>'; }).join('') + '</div>';
    openSheet('🏆 Mi Vitrina', b);
  }

  /* ================= Hojas y overlays ================= */
  function openSheet(title, body, opts) {
    const w = $('#sheet');
    w.innerHTML = '<div class="sheet"><div class="sheet-head"><h3>' + title + '</h3><button class="icon-btn" data-act="closeSheet" aria-label="Cerrar">✕</button></div><div class="sheet-body">' + body + '</div></div>';
    w.classList.remove('hidden');
    w.onclick = e => { if (e.target === w) closeSheet(); };
    if (opts && opts.onMount) opts.onMount(w);
  }
  function closeSheet() { const w = $('#sheet'); w.classList.add('hidden'); w.innerHTML = ''; }
  function openOverlay(html) { const tb = $('#tipBox'); if (tb) tb.remove(); const o = $('#overlay'); o.innerHTML = html; o.classList.remove('hidden'); o.scrollTop = 0; }
  function closeOverlay() { const o = $('#overlay'); o.classList.add('hidden'); o.innerHTML = ''; hud(); }

  /* ================= Elementos visuales ================= */
  const carImg = id => 'img/cars/' + id + '.webp';
  const carThumb = id => 'img/cars/' + id + '-s.webp';
  const region = (id, n) => { const col = (n - 1) % 5, row = Math.floor((n - 1) / 5); return 'background-image:url(' + carImg(id) + ');background-position:' + (col * 25) + '% ' + (row * 100) + '%'; };
  const rarTag = r => '<span class="tag rar rar-' + r + '">' + R[r].label + '</span>';

  function puzzleCells(carId, big) {
    let h = '';
    for (let n = 1; n <= 10; n++) {
      const on = GL.hasPiece(S, carId, n);
      h += '<div class="cell ' + (on ? 'on' : 'off') + '" data-n="' + n + '"' + (big ? ' data-act="pieceInfo" data-car="' + carId + '"' : '') + '>' + (on ? '' : '<span>' + GL.PIECES[n - 1].icon + '</span>') + '</div>';
    }
    return '<div class="puzzle' + (big ? ' big' : '') + '">' + h + '</div>';
  }

  function tcard(c, extra) {
    const car = GL.carById[c.carId], pc = GL.PIECES[c.n - 1];
    let mini = ''; for (let i = 1; i <= 10; i++) mini += '<i' + (i === c.n ? ' class="on"' : '') + '></i>';
    return '<div class="tcard' + (c.foil ? ' foil' : '') + '" style="--rc:' + R[c.rarity].color + '"><div class="in">' +
      '<div class="tc-top"><span>' + esc(car.brand) + '</span><span class="num">#' + c.n + '/10</span></div>' +
      '<div class="tc-img" style="' + region(c.carId, c.n) + '"><div class="mini">' + mini + '</div></div>' +
      '<div class="tc-bot"><div class="tc-car">' + esc(car.model) + '</div><div class="tc-lab">' + pc.icon + ' ' + pc.label + '</div>' +
      '<div class="tc-val">' + esc(GL.pieceValue(car, c.n)) + '</div></div></div>' + (extra || '') + '</div>';
  }

  function tile(car) {
    const cnt = GL.count(S, car.id), done = cnt >= 10, unlocked = GL.isUnlocked(S, car);
    const cls = !unlocked ? 'locked' : (cnt === 0 ? 'unknown' : (done ? 'complete' : ''));
    const isNew = S.newCars.includes(car.id) && !done;
    return '<div class="tile ' + cls + '" style="--rc:' + R[car.rarity].color + '" data-act="openCar" data-car="' + car.id + '">' +
      '<div class="ph"><img loading="lazy" src="' + carThumb(car.id) + '" alt="">' + (unlocked && cnt > 0 && !done ? puzzleCells(car.id, false) : '') +
      '<span class="rdot">' + rarTag(car.rarity) + '</span>' + (isNew ? '<span class="newb">NUEVO</span>' : '') + (done && S.medals[car.id] ? '<span class="medal-badge">' + GL.MEDALS[S.medals[car.id]].icon + '</span>' : '') + '</div>' +
      '<div class="info"><div class="br">' + esc(car.brand) + '</div><div class="nm">' + esc(car.model) + '</div>' +
      (unlocked ? '<div class="pr"><div class="progress' + (done ? ' gold' : '') + '"><span style="width:' + cnt * 10 + '%"></span></div>' + cnt + '/10</div>'
        : '<div class="pr">🔒 Nivel ' + car.unlock + '</div>') + '</div></div>';
  }

  /* ================= HUD ================= */
  function hud() {
    if (!S) return;
    $('#hudLevel').textContent = S.level;
    $('#hudXpBar').style.width = Math.min(100, S.xp / GL.xpForLevel(S.level) * 100) + '%';
    $('#hudCredits').textContent = nf(S.credits);
    const packs = S.packs.standard + S.packs.epic + S.packs.legendary;
    $('#badgePacks').textContent = packs || '';
    const ba = $('#badgeAlbum'); if (ba) ba.textContent = (S.fresh && S.fresh.length) ? (S.fresh.length > 9 ? '9+' : S.fresh.length) : '';
    $('#badgeQuiz').textContent = GL.quizAvailable(S) > 0 ? GL.quizAvailable(S) : '';
    const pend = GL.pendingAchievements(S) + GL.WEEKLY.filter(w => S.weekly.tasks >= w.target && !S.weekly.claimed.includes(w.id)).length;
    $('#badgeRewards').textContent = pend || '';
    if ($('#overlay').classList.contains('hidden')) {   // no estropear la sorpresa mientras se abren sobres
      if (pend > ui.lastPendingAch && document.readyState === 'complete' && GL.pendingAchievements(S) > 0) toast('🏅 ¡Tienes un logro nuevo para reclamar en Premios!');
      ui.lastPendingAch = pend;
    }
  }

  /* ================= Navegación ================= */
  function go(t) {
    tab = t; clearInterval(ui.countdownTimer);
    document.querySelectorAll('.bottomnav button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    GL.touchClock(S); GL.ensureMissions(S); GL.ensureWeek(S);
    render(); window.scrollTo(0, 0);
  }
  function render() {
    const scr = $('#screen');
    if (tab === 'home') scr.innerHTML = homeView();
    else if (tab === 'album') scr.innerHTML = albumView();
    else if (tab === 'packs') scr.innerHTML = packsView();
    else if (tab === 'quiz') scr.innerHTML = ui.quiz ? quizGameView() : quizView();
    else if (tab === 'rewards') scr.innerHTML = rewardsView();
    const book = tab === 'album' && $('#albumBook');
    if (!book) scr.insertAdjacentHTML('beforeend', footerHtml());
    if (book) setupBook(book);
    if (tab === 'home') startCountdown();
    hud();
  }
  function footerHtml() {
    return '<footer class="app-footer">Garage Legends ' + GL.VERSION + ' · © 2026 Rafael Karino Arillo · <button class="link-inline" data-act="license" type="button">Licencia y créditos</button> · <a href="' + GL.REPO + '" target="_blank" rel="noopener noreferrer">código fuente</a></footer>';
  }
  const MIT_TEXT = 'MIT License\n\nCopyright (c) 2026 Rafael Karino Arillo (rkarillo-tech)\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.';
  function licenseSheet() {
    openSheet('📜 Licencia y créditos',
      '<p><b>Garage Legends ' + GL.VERSION + '</b> · © 2026 Rafael Karino Arillo (<a href="https://github.com/rkarillo-tech" target="_blank" rel="noopener noreferrer">rkarillo-tech</a>).</p>' +
      '<p class="small">Software libre con licencia MIT: puedes usarlo, copiarlo, modificarlo y distribuirlo, también con fines comerciales, siempre que conserves este aviso de copyright y el texto de la licencia. Se ofrece tal cual, sin garantía de ningún tipo.</p>' +
      '<details><summary>Ver el texto de la licencia</summary><pre class="lic-text">' + esc(MIT_TEXT) + '</pre></details>' +
      '<h2 class="sec">Créditos</h2><ul class="small" style="padding-left:18px;line-height:1.6">' +
      '<li>Juego, motor de sobres, interfaz, tutorial y panel de padres: código propio con licencia MIT.</li>' +
      '<li><b>Fotos de los coches:</b> Wikimedia Commons, de varios autores, con licencias Creative Commons (la mayoría CC BY-SA 4.0). No están cubiertas por la licencia MIT. <button class="link-inline" data-act="credits" type="button">Ver autores y licencias</button>.</li>' +
      '<li><b>Tipografía Orbitron</b> © Matt McInerney, con licencia SIL Open Font License 1.1.</li>' +
      '<li><b>Pósters ilustrados:</b> creados por la familia con IA; son decorativos.</li>' +
      '<li>Las marcas y los nombres de modelos pertenecen a sus propietarios; este proyecto no está afiliado a ninguno de ellos. Los datos técnicos son aproximados.</li></ul>' +
      '<p class="small muted">La partida se guarda solo en este móvil: la aplicación no envía datos a ningún servidor. Los avisos por WhatsApp los envías tú desde tu propia aplicación de WhatsApp.</p>' +
      '<p class="small"><a href="' + GL.REPO + '" target="_blank" rel="noopener noreferrer">Código fuente y descargas en GitHub</a></p>');
  }

  /* ================= INICIO ================= */
  function msToMidnight() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n; }
  function fmtCountdown(ms) { const s = Math.floor(ms / 1000); return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function startCountdown() {
    clearInterval(ui.countdownTimer);
    ui.countdownTimer = setInterval(() => {
      const el = $('#cd'); if (!el) return clearInterval(ui.countdownTimer);
      if (GL.dailyAvailable(S)) { render(); return; }
      el.textContent = fmtCountdown(msToMidnight());
    }, 1000);
  }
  function totalPieces() { return Object.values(S.pieces).reduce((a, b) => a + b.length, 0); }

  function homeView() {
    const avail = GL.dailyAvailable(S), tampered = GL.clockTampered(S);
    const packs = S.packs.standard + S.packs.epic + S.packs.legendary;
    let h = helpBtn('home') + nextStepCard();
    if (S.favorite && GL.isComplete(S, S.favorite)) { const fc = GL.carById[S.favorite]; h += '<div class="fav-banner" data-act="openCar" data-car="' + fc.id + '"><img src="' + carImg(fc.id) + '" alt=""><div class="fb-txt">⭐ Mi favorito: ' + esc(fc.brand + ' ' + fc.model) + ' ' + (GL.MEDALS[S.medals[fc.id] || 1].icon) + '</div></div>'; }
    h += '<div class="hero ' + (avail ? 'ready' : '') + '"><div class="big-pack">' + (avail ? '🎁' : '📦') + '</div>';
    if (tampered) h += '<h3>⏰ Reloj cambiado</h3><p class="small muted" style="max-width:70%">La hora del móvil ha ido hacia atrás. El sobre diario volverá cuando la hora sea correcta.</p>';
    else if (avail) h += '<h3>¡Sobre diario listo!</h3><p class="small muted" style="max-width:65%">Recógelo cada día para mantener tu racha.</p><button class="btn gold mt8" data-act="claimDaily">🎁 Recoger sobre</button>';
    else h += '<h3>Próximo sobre diario</h3><div class="countdown" id="cd">' + fmtCountdown(msToMidnight()) + '</div>' + (packs ? '<button class="btn primary small mt8" data-act="go" data-tab="packs">Tienes ' + packs + ' sobre' + (packs > 1 ? 's' : '') + ' por abrir</button>' : '');
    h += '<div class="streak">🔥 Racha: <b>' + S.daily.streak + '</b> día' + (S.daily.streak === 1 ? '' : 's') + ' <span class="dim">· récord ' + S.daily.best + '</span></div></div>';

    const pieces = totalPieces(), cars = GL.CARS.filter(c => GL.isComplete(S, c.id)).length;
    h += '<div class="grid2 mt12"><div class="stat"><div class="v">' + pieces + '<span class="dim small">/' + GL.CARS.length * 10 + '</span></div><div class="l">Cromos</div></div>' +
      '<div class="stat"><div class="v">' + cars + '<span class="dim small">/' + GL.CARS.length + '</span></div><div class="l">Coches completos</div></div></div>' +
      '<div class="row mt8 wrap gap6"><span class="rank-chip">' + GL.rank(S.level).icon + ' ' + GL.rank(S.level).name + '</span><span class="small muted">Nivel ' + S.level + ' · ' + S.xp + '/' + GL.xpForLevel(S.level) + ' puntos</span></div>';

    // próximo objetivo
    const cand = GL.availableCars(S).filter(c => !GL.isComplete(S, c.id) && GL.count(S, c.id) > 0).sort((a, b) => GL.count(S, b.id) - GL.count(S, a.id) || GL.craftCost(a) - GL.craftCost(b));
    if (cand.length) {
      const c = cand[0], left = 10 - GL.count(S, c.id);
      h += '<h2 class="sec">🎯 Tu coche más cerca</h2><div class="card target-car" data-act="openCar" data-car="' + c.id + '">' +
        '<div class="thumb"><div class="tile" style="pointer-events:none"><div class="ph"><img src="' + carThumb(c.id) + '" alt="">' + puzzleCells(c.id, false) + '</div></div></div>' +
        '<div class="grow"><div class="tiny muted">' + esc(c.brand) + '</div><div style="font-weight:800">' + esc(c.model) + '</div>' +
        '<div class="small mt8">' + (left === 1 ? '¡Solo te falta <b>1 cromo</b>!' : 'Te faltan <b>' + left + '</b> cromos') + '</div>' +
        '<div class="tiny muted mt8">Fabricar uno: ' + GL.craftCost(c) + ' 🔧</div></div></div>';
    }

    // misiones
    h += '<h2 class="sec">📋 Misiones de hoy</h2>';
    S.missions.ids.forEach(id => {
      const st = GL.missionProgress(S, id);
      h += '<div class="mission ' + (st.claimed ? 'claimed' : st.done ? 'done' : '') + '"><div class="mi">' + (st.claimed ? '✅' : st.m.id === 'task1' ? '📚' : st.m.id.startsWith('quiz') ? '🧩' : st.m.id === 'craft1' ? '🛠️' : st.m.id === 'view1' ? '👀' : '📦') + '</div>' +
        '<div class="grow"><div style="font-weight:600;font-size:14px">' + st.m.text + '</div><div class="row mt8"><div class="progress grow"><span style="width:' + (st.p / st.m.target * 100) + '%"></span></div><span class="tiny muted">' + st.p + '/' + st.m.target + '</span></div></div>' +
        (st.claimed ? '' : st.done ? '<button class="btn gold small" data-act="claimMission" data-id="' + id + '">' + GL.rewardText(st.m.reward) + '</button>' : '<span class="tiny muted">' + GL.rewardText(st.m.reward) + '</span>') + '</div>';
    });

    // semana
    h += '<h2 class="sec">📅 Objetivo de estudio semanal<span class="count">' + S.weekly.tasks + (S.weekly.tasks === 1 ? ' tarea' : ' tareas') + '</span></h2>' + weeklyLadder();

    if (S.newCars.length) {
      h += '<h2 class="sec">✨ Descubiertos hace poco</h2><div class="album-grid">' + S.newCars.slice(0, 4).map(id => GL.carById[id]).filter(Boolean).map(tile).join('') + '</div>';
    }
    const ach = GL.pendingAchievements(S);
    const nMed = Object.values(S.medals).filter(Boolean).length;
    const nCards = GL.CARS.filter(c => GL.isComplete(S, c.id)).length;
    h += '<div class="card mt16 row hall-entry" data-act="hall" style="cursor:pointer"><div style="font-size:28px">🏛️</div><div class="grow"><b>Salón de la Fama</b><div class="small">' + (nCards ? nCards + (nCards === 1 ? ' Carta de Leyenda' : ' Cartas de Leyenda') : 'Completa un coche para conseguir tu primera carta') + '</div></div><span>›</span></div>';
    h += '<div class="card mt12 row" data-act="vitrina" style="cursor:pointer"><div style="font-size:28px">🏆</div><div class="grow"><b>Mi Vitrina</b><div class="small muted">🏅 ' + nMed + ' medallas · 🛡️ ' + S.brands.length + ' insignias · 🏆 ' + S.achievements.length + ' trofeos' + (ach ? ' · <span style="color:var(--gold)">' + ach + ' por cobrar</span>' : '') + '</div></div><span>›</span></div>';
    const cc = GL.availableCars(S).find(c => { const n = GL.count(S, c.id); return n > 0 && n < 10 && S.credits >= GL.craftCost(c); });
    if (cc) setTimeout(() => tip('canCraft', '🛠️', 'Tienes créditos para fabricar un cromo. Entra en un coche del Álbum y toca el botón 🛠️ del cromo que te falta.'), 600);

    if (pieces > 20 && (!S.lastBackup || Date.now() - S.lastBackup > 14 * 864e5)) {
      h += '<div class="card mt12 row"><div style="font-size:26px">💾</div><div class="grow small">Haz una copia de seguridad de tu álbum por si cambias de móvil.</div><button class="btn small" data-act="exportSave">Guardar</button></div>';
    }
    return h;
  }

  function weeklyLadder() {
    return '<div class="card"><div class="small muted">Tareas aprobadas esta semana (de lunes a domingo). ¡Cada escalón da un premio!</div><div class="ladder">' +
      GL.WEEKLY.map(w => {
        const ok = S.weekly.tasks >= w.target, cl = S.weekly.claimed.includes(w.id);
        return '<div class="rung ' + (cl ? 'claimed' : ok ? 'ok' : '') + '"><div class="rg">' + GL.PACKS[w.reward.pack].icon + '</div><div><b>' + w.target + ' tareas</b></div><div class="tiny muted">' + GL.PACKS[w.reward.pack].name + '</div>' +
          (cl ? '<div class="tiny">✅ Cobrado</div>' : ok ? '<button class="btn gold small mt8" data-act="claimWeekly" data-id="' + w.id + '">Cobrar</button>' : '<div class="progress mt8"><span style="width:' + Math.min(100, S.weekly.tasks / w.target * 100) + '%"></span></div>') + '</div>';
      }).join('') + '</div></div>';
  }

  /* ================= ÁLBUM ================= */
  /* ---------- Álbum en hojas: una página de papel por marca ---------- */
  const bookMode = () => S.settings.albumMode !== 'list';
  const brandIndex = b => Math.max(0, GL.BRANDS.indexOf(b));
  const freshOf = b => S.fresh.filter(f => GL.carById[f.split(':')[0]] && GL.carById[f.split(':')[0]].brand === b).length;
  function albumView() {
    const total = GL.CARS.length * 10, have = totalPieces();
    const head = '<div class="row between" style="margin:-4px 0 10px;gap:6px"><button class="help-btn" data-act="albumMode">' + (bookMode() ? '🔎 Buscar' : '📖 Hojas') + '</button><span class="small muted">' + have + '/' + total + ' cromos</span><button class="help-btn" data-act="help" data-k="album">❓ Ayuda</button></div>';
    if (!bookMode()) return head + albumListView();
    if (ui.albumPage == null) { const f = S.fresh[0] || (S.newCars[0] ? S.newCars[0] + ':1' : null); ui.albumPage = f && GL.carById[f.split(':')[0]] ? brandIndex(GL.carById[f.split(':')[0]].brand) : 0; }
    setTimeout(() => tip('albumBook', '📖', 'Este es tu álbum. Cada hoja es una marca. Desliza hacia los lados para pasar de hoja, o toca el nombre de la marca para ver el índice.'), 600);
    return head + '<div class="book-nav"><button class="icon-btn" data-act="bookPrev" aria-label="Hoja anterior">‹</button><button class="book-title" data-act="bookIndex"><b id="bookBrand"></b><span id="bookPos"></span></button><button class="icon-btn" data-act="bookNext" aria-label="Hoja siguiente">›</button></div>' +
      '<div class="book" id="albumBook">' + GL.BRANDS.map(pageHtml).join('') + '</div>';
  }
  function pageHtml(b, i) {
    const cars = GL.brandCars(b).slice().sort((x, y) => GL.RARITY_ORDER.indexOf(x.rarity) - GL.RARITY_ORDER.indexOf(y.rarity));
    const done = cars.filter(c => GL.isComplete(S, c.id)).length, pcs = cars.reduce((a, c) => a + GL.count(S, c.id), 0);
    const ctry = GL.COUNTRIES[cars[0].country];
    return '<section class="apage" data-i="' + i + '" data-brand="' + esc(b) + '"><header class="ap-head"><div class="ap-brand">' + esc(b) + (S.brands.includes(b) ? ' 🛡️' : '') + '</div><div class="ap-sub">' + ctry.flag + ' ' + ctry.name + ' · ' + done + '/' + cars.length + (cars.length === 1 ? ' coche' : ' coches') + ' · ' + pcs + '/' + cars.length * 10 + ' cromos</div><div class="ap-bar"><span style="width:' + (pcs / (cars.length * 10) * 100) + '%"></span></div></header>' +
      cars.map(acarHtml).join('') + '<footer class="ap-foot">— ' + (i + 1) + ' —</footer></section>';
  }
  function acarHtml(car) {
    const cnt = GL.count(S, car.id), done = cnt >= 10, unlocked = GL.isUnlocked(S, car);
    let body;
    if (!unlocked) body = '<div class="ac-grid locked"><div class="ac-lock">🔒<br>Se abre en el nivel ' + car.unlock + '</div></div>';
    else if (done) body = '<div class="ac-full"><img loading="lazy" src="' + carImg(car.id) + '" alt="' + esc(car.model) + '">' + (S.medals[car.id] ? '<span class="ac-medal">' + GL.MEDALS[S.medals[car.id]].icon + '</span>' : '') + '</div>';
    else {
      let cells = '';
      for (let n = 1; n <= 10; n++) {
        const col = (n - 1) % 5, row = Math.floor((n - 1) / 5);
        if (GL.hasPiece(S, car.id, n)) cells += '<i class="st on' + (S.fresh.includes(car.id + ':' + n) ? ' stick' : '') + '" style="background-image:url(' + carThumb(car.id) + ');background-position:' + (col * 25) + '% ' + (row * 100) + '%"></i>';
        else cells += '<i class="st"><b>' + n + '</b></i>';
      }
      body = '<div class="ac-grid">' + cells + '</div>';
    }
    return '<div class="acar ' + (done ? 'done' : cnt ? 'has' : '') + '" data-act="openCar" data-car="' + car.id + '"><div class="ac-head"><span class="ac-name">' + esc(car.model) + '</span>' + rarTag(car.rarity) + '</div>' + body +
      '<div class="ac-foot">' + (!unlocked ? 'Coche mítico' : done ? '✅ Completo · ' + GL.fmt.hp(car) + ' · ' + GL.fmt.top(car) : cnt ? cnt + ' de 10 cromos' : 'Aún sin cromos') + '</div></div>';
  }
  function setupBook(book) {
    const navH = $('#bottomnav').offsetHeight;
    book.style.height = Math.max(260, innerHeight - book.getBoundingClientRect().top - window.scrollY - navH - 10) + 'px';
    const pageW = () => book.clientWidth + 12;
    const show = (i, first) => {
      i = Math.max(0, Math.min(GL.BRANDS.length - 1, i));
      if (!first && i !== ui.albumPage) sfx('flip');
      ui.albumPage = i;
      $('#bookBrand').textContent = GL.BRANDS[i];
      $('#bookPos').textContent = 'Hoja ' + (i + 1) + ' de ' + GL.BRANDS.length + ' · índice';
      // los cromos nuevos de esta hoja ya se han visto "pegar"
      const b = GL.BRANDS[i];
      if (freshOf(b)) { clearTimeout(ui.freshT); ui.freshT = setTimeout(() => { if (ui.albumPage !== i || tab !== 'album') return; S.fresh = S.fresh.filter(f => { const c = GL.carById[f.split(':')[0]]; return c && c.brand !== b; }); save(); }, 1400); if (!first || true) setTimeout(() => sfx('new'), 250); }
    };
    book.scrollLeft = (ui.albumPage || 0) * pageW();
    show(ui.albumPage || 0, true);
    ui.bookShow = show;
    let t = null;
    book.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { const i = Math.round(book.scrollLeft / pageW()); if (i !== ui.albumPage) show(i); }, 90); }, { passive: true });
  }
  function bookGo(i) {
    const book = $('#albumBook'); if (!book) return;
    i = Math.max(0, Math.min(GL.BRANDS.length - 1, i));
    const far = Math.abs(i - (ui.albumPage || 0)) > 1;
    if (ui.bookShow) ui.bookShow(i);                       // el título cambia al momento
    book.scrollTo({ left: i * (book.clientWidth + 12), behavior: far ? 'auto' : 'smooth' });
  }
  function bookIndex() {
    openSheet('📖 Índice del álbum', GL.BRANDS.map((b, i) => {
      const cars = GL.brandCars(b), pcs = cars.reduce((a, c) => a + GL.count(S, c.id), 0), fr = freshOf(b), ctry = GL.COUNTRIES[cars[0].country];
      return '<div class="idx-row" data-act="bookJump" data-i="' + i + '"><span class="idx-n">' + (i + 1) + '</span><div class="grow"><b>' + esc(b) + '</b>' + (S.brands.includes(b) ? ' 🛡️' : '') + (fr ? ' <span class="newb" style="position:static">' + fr + ' NUEVO' + (fr > 1 ? 'S' : '') + '</span>' : '') + '<div class="tiny muted">' + ctry.flag + ' ' + ctry.name + ' · ' + pcs + '/' + cars.length * 10 + ' cromos</div><div class="progress mt8" style="height:5px"><span style="width:' + (pcs / (cars.length * 10) * 100) + '%"></span></div></div><span>›</span></div>';
    }).join(''));
  }
  function albumListView() {
    const total = GL.CARS.length * 10, have = totalPieces();
    let h = '<div class="album-top"><div class="card"><div class="row between"><b class="display">MI ÁLBUM</b><span class="small muted">' + have + '/' + total + ' cromos · ' + Math.round(have / total * 100) + '%</span></div><div class="progress mt8"><span style="width:' + (have / total * 100) + '%"></span></div></div>' +
      '<div class="search"><input id="albumSearch" type="search" placeholder="Buscar marca o modelo…" value="' + esc(ui.q) + '" autocomplete="off"></div>' +
      '<div class="chips">' + [['ALL', 'Todas']].concat(GL.RARITY_ORDER.map(r => [r, { COMMON: 'Comunes', RARE: 'Raras', EPIC: 'Épicas', LEGENDARY: 'Legendarias', MYTHIC: 'Míticas' }[r]])).map(([k, l]) => '<button class="chip ' + (ui.rarity === k ? 'on' : '') + '" data-act="fRar" data-v="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<div class="chips" style="margin-top:-4px">' + [['ALL', 'Todo'], ['PROGRESS', 'Empezados'], ['DONE', 'Completos'], ['UNKNOWN', 'Por descubrir']].map(([k, l]) => '<button class="chip ' + (ui.status === k ? 'on' : '') + '" data-act="fSt" data-v="' + k + '">' + l + '</button>').join('') + '</div></div>';
    h += '<div id="albumList">' + albumList() + '</div>';
    return h;
  }
  function albumList() {
    const q = ui.q.trim().toLowerCase();
    const cars = GL.CARS.filter(c => {
      if (ui.rarity !== 'ALL' && c.rarity !== ui.rarity) return false;
      const cnt = GL.count(S, c.id);
      if (ui.status === 'DONE' && cnt < 10) return false;
      if (ui.status === 'PROGRESS' && (cnt === 0 || cnt >= 10)) return false;
      if (ui.status === 'UNKNOWN' && cnt > 0) return false;
      if (q && !(c.brand + ' ' + c.model).toLowerCase().includes(q)) return false;
      return true;
    });
    if (!cars.length) return '<div class="empty">No hay coches con este filtro.</div>';
    const brands = [...new Set(cars.map(c => c.brand))].sort((a, b) => a.localeCompare(b, 'es'));
    return brands.map(b => {
      const all = GL.CARS.filter(c => c.brand === b), list = cars.filter(c => c.brand === b);
      const done = all.filter(c => GL.isComplete(S, c.id)).length;
      const ctry = GL.COUNTRIES[all[0].country];
      return '<div class="brand-head"><span>' + ctry.flag + '</span><span class="bn">' + esc(b) + '</span><span class="bp">' + done + '/' + all.length + ' completos</span></div>' +
        '<div class="album-grid">' + list.sort((x, y) => GL.RARITY_ORDER.indexOf(x.rarity) - GL.RARITY_ORDER.indexOf(y.rarity)).map(tile).join('') + '</div>';
    }).join('');
  }

  /* ================= FICHA DEL COCHE ================= */
  const MAX = { hp: 1914, top: 500 };
  function specBar(label, value, pct, cls) {
    return '<div class="specbar"><div class="row between"><span class="muted">' + label + '</span><b>' + value + '</b></div><div class="progress ' + (cls || '') + '"><span style="width:' + Math.max(4, Math.min(100, pct)) + '%"></span></div></div>';
  }
  function openCar(id, flashN) {
    const car = GL.carById[id]; if (!car) return;
    const cnt = GL.count(S, id), done = cnt >= 10, unlocked = GL.isUnlocked(S, car);
    const cr = (window.GL_CREDITS || {})[id];
    if (S.newCars.includes(id)) { S.newCars = S.newCars.filter(x => x !== id); save(); }
    if (done) { S.stats.viewedCars++; save(); }
    let b = '<div class="car-hero ' + (done ? 'done' : '') + '">' + (unlocked ? '<img src="' + carImg(id) + '" alt="' + esc(car.model) + '" ' + (cnt === 0 ? 'style="filter:brightness(0)"' : '') + '>' : '<div style="height:100%;display:grid;place-items:center;font-size:44px">🔒</div>') + (unlocked && !done ? puzzleCells(id, true) : '') + '</div>';
    b += '<div class="row between mt12 wrap gap6"><div>' + rarTag(car.rarity) + ' <span class="tag" style="background:#ffffff12">' + GL.COUNTRIES[car.country].flag + ' ' + esc(car.brand) + '</span></div><span class="small muted">' + cnt + '/10 cromos</span></div>';
    b += '<div class="row between"><div class="car-title">' + esc(car.model) + '</div><button class="help-btn" data-act="help" data-k="car">❓</button></div>';
    if (!unlocked) {
      b += '<div class="card mt12 center">🔒 Este coche mítico se desbloquea al llegar al <b>nivel ' + car.unlock + '</b> de garaje.<div class="small muted mt8">Tú estás en el nivel ' + S.level + '. Sube de nivel consiguiendo cromos, completando misiones y tareas.</div></div>';
      openSheet(esc(car.brand), b); return;
    }
    if (done) {
      b += '<div class="card mt12"><b class="display small">FICHA TÉCNICA</b>' +
        specBar('⚡ Potencia', GL.fmt.hp(car), car.hp / 1600 * 100) +
        specBar('⏱️ 0-100 km/h', GL.fmt.accel(car), (10.5 - car.accel) / (10.5 - 1.9) * 100, 'green') +
        specBar('🚀 Velocidad máx.', GL.fmt.top(car), car.top / 450 * 100, 'gold') +
        specBar('⚖️ Peso (menos es mejor)', GL.fmt.weight(car), (2400 - car.weight) / (2400 - 1000) * 100) +
        '<div class="small muted mt8">Datos de fábrica aproximados. "≈" = estimación o dato no oficial.</div></div>';
      const t = S.medals[id] || 1;
      b += '<h2 class="sec">🏅 Medallas de este coche</h2>' + [1, 2, 3].map(k => {
        const m = GL.MEDALS[k], on = t >= k;
        const prog = k === 2 ? Math.min(m.need, S.carQuiz[id] || 0) + '/' + m.need : k === 3 ? Math.min(m.need, S.carDupes[id] || 0) + '/' + m.need : '';
        return '<div class="medal-line ' + (on ? '' : 'off') + '"><div class="ml-i">' + m.icon + '</div><div class="grow"><b>' + m.name + (on ? ' ✅' : '') + '</b><div class="small muted">' + m.how + (m.reward ? ' · Premio: ' + GL.rewardText(m.reward) : '') + '</div></div>' + (on || !prog ? '' : '<span class="small">' + prog + '</span>') + '</div>';
      }).join('') +
      '<button class="btn primary block mt12" data-act="lcard" data-car="' + id + '">🃏 Ver su Carta de Leyenda</button>' +
      '<button class="btn block mt8 ' + (S.favorite === id ? 'gold' : '') + '" data-act="setFav" data-car="' + id + '">' + (S.favorite === id ? '⭐ Es tu coche favorito' : '☆ Poner como mi favorito') + '</button>';
    } else {
      b += '<div class="small muted mt8">Toca una casilla vacía del puzle para ver qué dato esconde. Cada cromo nuevo revela un trozo de la foto y un dato del coche. Al completarlo ganas la medalla de bronce 🥉.</div>';
    }
    b += '<h2 class="sec">Cromos</h2><div class="piece-list">' + GL.PIECES.map(pc => {
      const on = GL.hasPiece(S, id, pc.n);
      return '<div class="piece-row ' + (on ? '' : 'off') + (pc.foil ? ' foil' : '') + '"><div class="pi">' + pc.icon + '</div><div class="grow"><div class="pl">#' + pc.n + ' · ' + pc.label + (pc.foil ? ' · brillante' : '') + '</div><div class="pv">' + (on ? esc(GL.pieceValue(car, pc.n)) : '? ? ?') + '</div></div>' +
        (on ? '' : '<button class="btn small" data-act="craft" data-car="' + id + '" data-n="' + pc.n + '" ' + (S.credits < GL.craftCost(car) ? 'disabled' : '') + '>🛠️ ' + GL.craftCost(car) + '</button>') + '</div>';
    }).join('') + '</div>';
    if (done && GL.POSTERS.includes(id)) {
      b += '<h2 class="sec">🖼️ Póster ilustrado</h2><div class="poster" data-act="zoomPoster" data-car="' + id + '"><img loading="lazy" src="img/posters/' + id + '.webp" alt="Póster"></div><div class="credit">Ilustración artística creada con IA: es decorativa y puede tener detalles inventados (no es un plano técnico real).</div>';
    } else if (!done && GL.POSTERS.includes(id)) {
      b += '<div class="card mt12 small muted">🖼️ Completa este coche para desbloquear su <b>póster ilustrado</b>.</div>';
    }
    if (cr && cnt > 0) b += '<div class="credit">📷 Foto: ' + esc(cr.author || 'Wikimedia Commons') + ' · ' + esc(cr.license) + ' · <a href="' + esc(cr.url) + '" target="_blank" rel="noopener">Wikimedia Commons</a></div>';
    openSheet(esc(car.brand), b, {
      onMount: w => { if (flashN) { const c = w.querySelector('.puzzle .cell[data-n="' + flashN + '"]'); if (c) c.classList.add('flash'); } }
    });
    if (!done && cnt > 0) setTimeout(() => tip('carDetail', '🧩', 'Toca una casilla oscura del puzle para ver qué dato esconde. Si tienes créditos, puedes fabricar ese cromo con el botón 🛠️.'), 500);
  }

  /* ================= SOBRES, TIENDA Y TALLER ================= */
  function packsView() {
    let h = helpBtn('packs') + '<h2 class="sec">📦 Mis sobres</h2>';
    ['standard', 'epic', 'legendary'].forEach(t => {
      const p = GL.PACKS[t], n = S.packs[t];
      h += '<div class="pack-row"><div class="pack-mini" style="--pc:' + p.color + '">' + p.icon + (n ? '<span class="n">' + n + '</span>' : '') + '</div><div class="grow"><b>' + p.name + '</b><div class="small muted">' + p.desc + '</div></div>' +
        '<button class="btn ' + (n ? 'primary' : '') + '" data-act="openPack" data-type="' + t + '" ' + (n ? '' : 'disabled') + '>Abrir</button></div>';
    });
    const left = Math.max(0, GL.TUNING.legendaryPity - S.pity.sinceLegendary);
    h += '<div class="small muted mt8">🌟 Suerte acumulada: ' + (left === 0 ? '¡tu próximo sobre trae una <b>Legendaria</b> garantizada!' : 'Legendaria garantizada como mucho en <b>' + (left + 1) + '</b> sobres.') + (S.pity.lastPackNoNew ? '<br>🛡️ Tu último sobre no trajo nada nuevo: el siguiente trae <b>un cromo nuevo seguro</b>.' : '') + '</div>';

    h += '<h2 class="sec">🛒 Tienda<span class="count">Tienes ' + nf(S.credits) + ' 🔧</span></h2>';
    ['standard', 'epic', 'legendary'].forEach(t => {
      const p = GL.PACKS[t];
      h += '<div class="shop-item"><div style="font-size:26px">' + p.icon + '</div><div class="grow"><b>' + p.name + '</b><div class="tiny muted">' + p.desc + '</div></div><button class="btn small" data-act="buyPack" data-type="' + t + '" ' + (S.credits < p.cost ? 'disabled' : '') + '>' + nf(p.cost) + ' 🔧</button></div>';
    });

    h += '<h2 class="sec">🛠️ Taller</h2><div class="card small muted">Los cromos repetidos se convierten en <b>créditos 🔧</b>. Úsalos para fabricar el cromo exacto que te falta (desde la ficha de cada coche) o para un <b>cromo sorpresa</b> nuevo, más barato.</div>';
    GL.RARITY_ORDER.forEach(r => {
      const pending = GL.availableCars(S).filter(c => c.rarity === r && !GL.isComplete(S, c.id)).length;
      if (!pending) return;
      const cost = GL.surpriseCost(r);
      h += '<div class="shop-item"><div>' + rarTag(r) + '</div><div class="grow"><b>Cromo sorpresa</b><div class="tiny muted">Uno nuevo seguro de un coche ' + R[r].label.toLowerCase() + '</div></div><button class="btn small" data-act="surprise" data-r="' + r + '" ' + (S.credits < cost ? 'disabled' : '') + '>' + nf(cost) + ' 🔧</button></div>';
    });
    const near = GL.availableCars(S).filter(c => { const n = GL.count(S, c.id); return n >= 7 && n < 10; }).sort((a, b) => GL.count(S, b.id) - GL.count(S, a.id));
    if (near.length) h += '<h2 class="sec">🏁 Casi completos</h2><div class="album-grid">' + near.slice(0, 6).map(tile).join('') + '</div>';

    h += '<h2 class="sec">🎲 Probabilidades</h2><div class="card small"><div class="muted">Cada cromo normal de un sobre:</div>' +
      GL.RARITY_ORDER.map(r => { const tot = GL.RARITY_ORDER.reduce((a, x) => a + R[x].weight, 0); return '<div class="row between mt8">' + rarTag(r) + '<span>' + (R[r].weight / tot * 100).toFixed(1).replace('.', ',') + ' %</span></div>'; }).join('') +
      '<div class="tiny muted mt8">Los míticos solo salen cuando ya están desbloqueados por nivel. Si un sobre no trae nada nuevo, el siguiente trae un cromo nuevo seguro.</div></div>';
    return h;
  }

  function openPackFlow(type) {
    if (!S.packs[type]) return;
    const p = GL.PACKS[type];
    if (ui.tour) setTimeout(() => autoSpeak('Toca el sobre para abrirlo.'), 300);
    openOverlay('<div class="open-stage"><div class="pack3d" id="pk" style="--pc:' + p.color + '" data-act="ripPack" data-type="' + type + '"><div class="pk-ico">' + p.icon + '</div><div class="pk-name">' + p.name.toUpperCase() + '</div><div class="pk-sub">5 cromos</div></div><div class="tap-hint">Toca el sobre para abrirlo</div><button class="btn ghost small mt16" data-act="closeOverlay">Ahora no</button></div>');
    sfx('tap');
  }

  const cardStamp = c => c.dup ? '<div class="stamp dup">+' + c.scrap + ' 🔧</div>' : (c.newCar ? '<div class="stamp car">¡COCHE NUEVO!</div>' : '<div class="stamp new">NUEVO</div>');
  function bigCard(c) {
    const car = GL.carById[c.carId];
    openSheet(esc(car.brand) + ' · #' + c.n, '<div class="big-card">' + tcard(c, cardStamp(c)) + '</div><div class="center small muted mt12">' + (c.dup ? 'Repetido: convertido en créditos para el Taller.' : 'Cromo ' + (c.countAfter || GL.count(S, c.carId)) + '/10 de este coche.') + '</div>');
  }
  let reveal = null;
  function ripPack(type) {
    const pk = $('#pk'); if (!pk || pk.dataset.busy) return; pk.dataset.busy = '1';
    pk.classList.add('shake'); buzz(30); sfx('tap');
    setTimeout(() => {
      pk.classList.remove('shake'); pk.classList.add('rip'); sfx('rip'); buzz([20, 40, 60]);
      const res = GL.openPack(S, type);
      if (res) { res.cards.forEach(c => { if (!c.dup) S.fresh.push(c.carId + ':' + c.n); }); S.fresh = S.fresh.slice(-80); }
      save();
      if (!res) { closeOverlay(); return; }
      reveal = { type, res, flipped: 0 };
      setTimeout(() => showReveal(), 420);
    }, 520);
  }
  function showReveal() {
    const { res } = reveal;
    const best = res.cards.reduce((m, c) => Math.max(m, GL.RARITY_ORDER.indexOf(c.rarity)), 0);
    let h = '<div class="open-stage"><div class="display center" style="margin-bottom:14px;font-weight:800">' + (res.legendaryPity ? '🌟 ¡SUERTE ACUMULADA ACTIVADA! 🌟' : 'TOCA CADA CARTA') + '</div><div class="reveal-grid">';
    res.cards.forEach((c, i) => {
      const stamp = cardStamp(c);
      h += '<div class="flip" data-act="flip" data-i="' + i + '" style="animation-delay:' + (i * 90) + 'ms"><div class="fi"><div class="face back"><div class="cardback glow-' + c.rarity + '" style="--rc:' + R[c.rarity].color + '"><span class="lg">GL</span></div></div><div class="face front">' + tcard(c, stamp) + '</div></div></div>';
    });
    h += '</div><div class="open-summary" id="sum"><button class="btn" data-act="flipAll">Girar todas</button></div></div>';
    openOverlay(h);
    if (ui.tour) autoSpeak('Toca cada carta para darle la vuelta.');
    if (best >= 3) setTimeout(() => { sfx('epic'); }, 300);
  }
  function flipCard(i) {
    const el = document.querySelector('.flip[data-i="' + i + '"]'); if (!el) return;
    if (el.classList.contains('open')) { if (!ui.flippingAll) bigCard(reveal.res.cards[i]); return; }
    el.classList.add('open'); reveal.flipped++;
    const c = reveal.res.cards[i];
    sfx('flip');
    setTimeout(() => {
      if (c.rarity === 'MYTHIC' || c.rarity === 'LEGENDARY') { sfx('legend'); flashScreen(R[c.rarity].color); confetti([R[c.rarity].color, '#fff', '#fde68a'], 160); buzz([60, 40, 120]); }
      else if (c.rarity === 'EPIC') { sfx('epic'); buzz(40); }
      else if (!c.dup) sfx('new'); else sfx('dup');
    }, 280);
    if (reveal.flipped >= reveal.res.cards.length) setTimeout(revealDone, 600);
  }
  function revealDone() {
    const { res, type } = reveal;
    const nNew = res.cards.filter(c => !c.dup).length, scrap = res.cards.reduce((a, c) => a + (c.scrap || 0), 0);
    if (scrap && !ui.tour) setTimeout(() => tip('dupes', '🔧', 'Las cartas repetidas no se pierden: se convierten en créditos. Con los créditos fabricas los cromos que te faltan.'), 900);
    const sum = $('#sum'); if (!sum) return;
    sum.innerHTML = '<div class="card"><b>' + (nNew ? '¡' + nNew + ' cromo' + (nNew > 1 ? 's' : '') + ' nuevo' + (nNew > 1 ? 's' : '') + '!' : 'Todos repetidos… ¡el siguiente trae uno nuevo seguro!') + '</b>' + (scrap ? '<div class="small muted mt8">Repetidos convertidos en <b>+' + scrap + ' 🔧</b> para el Taller.</div>' : '') + '</div>' +
      '<div class="open-actions">' + (S.packs[type] > 0 ? '<button class="btn primary" data-act="nextPack" data-type="' + type + '">Abrir otro (' + S.packs[type] + ')</button>' : '') + (nNew && !ui.tour ? '<button class="btn green" data-act="toAlbum">📒 Pegar en el álbum</button>' : '') + '<button class="btn" data-act="endReveal">Continuar</button></div>';
  }
  function endReveal(next) {
    const events = reveal ? reveal.res.events : [];
    const type = reveal && reveal.type;
    reveal = null;
    closeOverlay();
    playEvents(events, () => {
      render();
      if (ui.afterReveal) { const f = ui.afterReveal; ui.afterReveal = null; f(); return; }
      if (next && S.packs[type] > 0) openPackFlow(type);
      else { tourEvent('reveal'); if (events.some(e => e.type === 'complete')) setTimeout(() => tip('firstMedal', '🏅', 'Has completado un coche. Su Carta de Leyenda ya está en tu Salón de la Fama. Puedes mejorarla a plata y oro.'), 400); }
    });
  }

  /* Cola de celebraciones: coche completado, subida de nivel */
  function playEvents(events, done) {
    const q = (events || []).filter(e => ['complete', 'levelup', 'medal', 'brand'].includes(e.type));
    (function step() {
      const e = q.shift();
      if (!e) { closeOverlay(); if (done) done(); return; }
      if (e.type === 'complete') {
        const car = GL.carById[e.carId];
        openOverlay('<div class="celebrate"><div class="big">¡COCHE COMPLETADO!</div><div class="lcard-cele">' + lcardHtml(car.id, 'tilt') + '</div><div class="display" style="font-size:18px;font-weight:800">' + esc(car.brand) + ' ' + esc(car.model) + '</div><div class="mt8">' + rarTag(car.rarity) + '</div><div class="card mt16">🥉 <b>¡Medalla de bronce!</b><br>Premio: <b>+' + e.credits + ' 🔧</b> · <b>+' + GL.TUNING.completeXp + ' puntos</b>' + (GL.POSTERS.includes(car.id) ? '<br>🖼️ ¡Póster ilustrado desbloqueado!' : '') + '<br>🃏 <b>¡Nueva Carta de Leyenda</b> en tu Salón de la Fama!</div><div class="open-actions"><button class="btn gold" data-act="evNext">¡Genial!</button></div></div>');
        mountCards($('#overlay'), 600);
        sfx('complete'); confetti(['#fbbf24', '#fde68a', '#22d3ee', '#fff', R[car.rarity].color], 220); buzz([80, 60, 80, 60, 200]);
      } else if (e.type === 'medal') {
        const car = GL.carById[e.carId], m = GL.MEDALS[e.tier];
        openOverlay('<div class="celebrate"><div style="font-size:90px;animation:popIn .6s">' + m.icon + '</div><div class="big">¡MEDALLA DE ' + m.name.toUpperCase() + '!</div><div class="display mt8" style="font-size:17px;font-weight:800">' + esc(car.brand + ' ' + car.model) + '</div><div class="card mt16">' + (e.tier === 2 ? 'Has acertado 3 preguntas de este coche. ¡Ya eres experto!' : 'Has conseguido 5 repetidos de este coche. ¡Edición oro!') + '<br>🃏 Su Carta de Leyenda ahora es de <b>' + m.name.toLowerCase() + '</b>.<br>Premio: <b>' + GL.rewardText(e.reward) + '</b></div><div class="open-actions"><button class="btn gold" data-act="evNext">¡Genial!</button></div></div>');
        sfx('complete'); confetti(e.tier === 3 ? ['#fbbf24', '#fde68a', '#fff'] : ['#cbd5e1', '#fff', '#22d3ee'], 180); buzz([80, 60, 120]);
      } else if (e.type === 'brand') {
        openOverlay('<div class="celebrate"><div class="emblem" style="border:0;background:none"><div class="em-c" style="width:120px;height:120px;font-size:28px">' + esc(brandShort(e.brand)) + '</div></div><div class="big">¡INSIGNIA DE ' + esc(e.brand.toUpperCase()) + '!</div><div class="card mt16">Has completado todos los coches de ' + esc(e.brand) + '.<br>Premio: <b>' + GL.rewardText(e.reward) + '</b></div><div class="open-actions"><button class="btn gold" data-act="evNext">¡Genial!</button></div></div>');
        sfx('legend'); confetti(['#fbbf24', '#fde68a', '#fff'], 220); buzz([100, 60, 100, 60, 200]);
      } else {
        const un = (e.unlocked || []);
        openOverlay('<div class="celebrate"><div class="big">¡SUBES DE NIVEL!</div><div class="level-burst mt16">' + e.level + '</div><div class="card mt16">Premio: <b>' + GL.rewardText(e.reward) + '</b>' + (un.length ? '<br>🔓 Desbloqueado el coche mítico: <b>' + un.map(c => esc(c.brand + ' ' + c.model)).join(', ') + '</b>. ¡Ya puede salir en los sobres!' : '') + '</div><div class="open-actions"><button class="btn primary" data-act="evNext">Continuar</button></div></div>');
        sfx('level'); confetti(['#22d3ee', '#818cf8', '#fff'], 120); buzz([50, 50, 100]);
      }
      ui.evNext = step;
    })();
  }

  /* ================= DESAFÍO ================= */
  function quizView() {
    const left = GL.quizAvailable(S);
    setTimeout(() => tip('quizFirst', '👂', 'En el Desafío puedes tocar el altavoz para escuchar cada pregunta. Acertar preguntas de tus coches completos te da medallas de plata.'), 500);
    return helpBtn('quiz') + '<div class="card center"><div style="font-size:46px">🧩</div><div class="display" style="font-weight:800;font-size:18px">DESAFÍO MOTOR</div>' +
      '<p class="small muted">5 preguntas: duelos de datos ("¿cuál es más potente?") y adivinar el coche por un trozo de foto. Ganas <b>' + GL.TUNING.quizCreditPerHit + ' 🔧 por acierto</b> y <b>+' + GL.TUNING.quizPerfectBonus + ' 🔧</b> si haces pleno.</p>' +
      '<button class="btn primary block" data-act="startQuiz" ' + (left > 0 ? '' : 'disabled') + '>' + (left > 0 ? '¡Jugar! (' + left + ' partida' + (left > 1 ? 's' : '') + ' hoy)' : 'Vuelve mañana para jugar más') + '</button>' +
      '<div class="tiny muted mt8">Hay ' + GL.TUNING.quizPerDay + ' partidas al día. Las preguntas usan todos los coches del juego: ¡también aprendes de los que aún no tienes!</div></div>' +
      '<h2 class="sec">📊 Tus récords</h2><div class="grid2"><div class="stat"><div class="v">' + S.stats.quizPlayed + '</div><div class="l">Partidas</div></div><div class="stat"><div class="v">' + S.stats.quizPerfect + '</div><div class="l">Plenos 5/5</div></div></div>';
  }
  function startQuiz() {
    const qs = GL.startQuiz(S); if (!qs) return;
    save(); ui.quiz = { qs, i: 0, hits: 0, results: [], answered: false, events: [] };
    render();
  }
  function quizGameView() {
    const z = ui.quiz;
    if (z.i >= z.qs.length) return quizResultView();
    const q = z.qs[z.i];
    if (!z.answered && z.spoken !== z.i) { z.spoken = z.i; const qt = q.type === 'duel' ? GL.QUIZ_STATS.find(x => x.key === q.stat).q : '¿Qué coche es?'; setTimeout(() => autoSpeak(qt), 200); }
    let dots = ''; for (let k = 0; k < z.qs.length; k++) dots += '<i class="' + (k < z.i ? (z.results[k] ? 'ok' : 'ko') : k === z.i ? 'cur' : '') + '"></i>';
    let h = '<div class="dots">' + dots + '</div>';
    if (q.type === 'duel') {
      const st = GL.QUIZ_STATS.find(s => s.key === q.stat);
      h += '<div class="row" style="justify-content:center">' + sayBtn(st.q + ' ' + q.options.map(id => GL.carById[id].brand + ' ' + GL.carById[id].model).join(', o ')) + '<div class="quiz-q">' + st.q + '</div></div><div class="duel">' + q.options.map(id => {
        const c = GL.carById[id];
        let cls = ''; if (z.answered) cls = id === q.answer ? 'right' : (id === z.pick ? 'wrong' : '');
        return '<button class="opt ' + cls + '" data-act="answer" data-id="' + id + '"><img src="' + carThumb(id) + '" alt=""><div class="ol">' + esc(c.brand) + ' ' + esc(c.model) + '</div><div class="ov">' + (z.answered ? st.fmt(c) : '') + '</div></button>';
      }).join('') + '</div>';
    } else {
      const col = (q.region) % 5, row = Math.floor(q.region / 5);
      h += '<div class="row" style="justify-content:center">' + sayBtn('¿Qué coche es? ' + q.options.map(id => GL.carById[id].brand + ' ' + GL.carById[id].model).join(', o ')) + '<div class="quiz-q">¿Qué coche es?</div></div><div class="guess-img ' + (z.answered ? 'reveal' : '') + '" style="background-image:url(' + carImg(q.carId) + ');background-position:' + (col * 25) + '% ' + (row * 100) + '%"></div>' +
        '<div class="guess-opts">' + q.options.map(id => { const c = GL.carById[id]; let cls = ''; if (z.answered) cls = id === q.answer ? 'right' : (id === z.pick ? 'wrong' : ''); return '<button class="btn ' + cls + '" data-act="answer" data-id="' + id + '">' + esc(c.brand) + '<br><span class="small">' + esc(c.model) + '</span></button>'; }).join('') + '</div>';
    }
    if (z.answered) h += '<div class="center mt16"><div class="display" style="font-weight:800;color:' + (z.results[z.i] ? 'var(--green)' : 'var(--red)') + '">' + (z.results[z.i] ? '¡CORRECTO!' : '¡CASI!') + '</div><button class="btn primary mt12" data-act="quizNext">' + (z.i + 1 >= z.qs.length ? 'Ver resultado' : 'Siguiente') + '</button></div>';
    return h;
  }
  function quizAnswer(id) {
    const z = ui.quiz; if (!z || z.answered) return;
    const q = z.qs[z.i]; const ok = id === q.answer;
    z.answered = true; z.pick = id; z.results[z.i] = ok; if (ok) { z.hits++; GL.quizCorrect(S, q.answer, z.events); save(); }
    sfx(ok ? 'new' : 'error'); buzz(ok ? 25 : [40, 40, 40]);
    render();
  }
  function quizNext() {
    const z = ui.quiz; z.i++; z.answered = false; z.pick = null;
    if (z.i >= z.qs.length) { z.reward = GL.finishQuiz(S, z.hits); save(); if (z.hits >= 4) { confetti(['#34d399', '#22d3ee', '#fff']); sfx('complete'); } else sfx('coin'); }
    render();
  }
  function quizResultView() {
    const z = ui.quiz;
    return '<div class="card center"><div style="font-size:50px">' + (z.hits === 5 ? '🏆' : z.hits >= 3 ? '🎉' : '💪') + '</div><div class="display" style="font-size:22px;font-weight:900">' + z.hits + ' / 5</div>' +
      '<p>' + (z.hits === 5 ? '¡PLENO! Eres un experto del motor.' : z.hits >= 3 ? '¡Muy bien!' : 'Sigue practicando: los datos están en los cromos.') + '</p>' +
      '<div class="pill" style="font-size:15px">+' + z.reward.credits + ' 🔧 · +' + z.hits * 5 + ' XP</div>' +
      '<div class="open-actions"><button class="btn primary" data-act="quizDone">Continuar</button></div></div>';
  }

  /* ================= PREMIOS ================= */
  function rewardsView() {
    setTimeout(() => tip('rewardsFirst', '📚', 'Cuando termines una tarea de verdad, toca «¡Hecho!». Después tus padres la aprueban con su PIN y recibes el premio.'), 500);
    let h = helpBtn('rewards') + '<h2 class="sec">📚 Tareas con premio</h2><div class="small muted" style="margin:-4px 2px 10px">Cuando termines una tarea, pulsa <b>¡Hecho!</b> y pide a tus padres que la aprueben.</div>';
    const today = GL.dayKey();
    P.tasks.forEach(t => {
      const pend = S.requests.some(r => r.taskId === t.id && GL.dayKey(r.ts) === today);
      h += '<div class="task"><div class="te">' + esc(t.emoji) + '</div><div class="grow"><b style="font-size:14px">' + esc(t.name) + '</b><div class="tr">' + GL.rewardText(t.reward) + ' · +' + (t.xp || 20) + ' XP</div></div>' +
        (pend ? (P.parentPhone ? '<button class="btn small" data-act="notify" data-id="' + esc(t.id) + '">📲 Avisar</button>' : '<span class="tiny muted">⏳ Pendiente</span>') : '<button class="btn small green" data-act="request" data-id="' + esc(t.id) + '">¡Hecho!</button>') + '</div>';
    });
    if (S.requests.length) h += '<div class="card mt12 row"><div style="font-size:24px">⏳</div><div class="grow small"><b>' + S.requests.length + ' tarea' + (S.requests.length > 1 ? 's' : '') + ' esperando aprobación</b><div class="muted">Para aprobarlas hace falta el PIN de los padres.</div></div><button class="btn primary small" data-act="approveFlow">Aprobar</button></div>';

    h += '<h2 class="sec">📅 Esta semana<span class="count">' + S.weekly.tasks + (S.weekly.tasks === 1 ? ' tarea aprobada' : ' tareas aprobadas') + '</span></h2>' + weeklyLadder();

    h += '<h2 class="sec">🎟️ Canjear código</h2><div class="card"><div class="small muted">Si tus padres te envían un código desde su móvil, escríbelo aquí.</div><div class="row mt8"><input id="codeIn" placeholder="GL-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"><button class="btn primary" data-act="redeem">Canjear</button></div></div>';

    h += '<h2 class="sec">🏅 Logros<span class="count">' + S.achievements.length + '/' + GL.ACHIEVEMENTS.length + '</span></h2>' + achievementsList();

    h += '<h2 class="sec">🧾 Historial</h2><div class="card">' + (S.history.length ? S.history.slice(0, 25).map(x => '<div class="hist"><span>' + esc(x.icon) + '</span><span>' + esc(x.text) + '</span><span class="ht">' + new Date(x.ts).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + '</span></div>').join('') : '<div class="muted small">Aún no hay nada.</div>') + '</div>';
    return h;
  }
  function achievementsList() {
    return GL.achievementState(S).sort((a, b) => (b.done && !b.claimed) - (a.done && !a.claimed) || a.claimed - b.claimed).map(({ a, done, claimed }) =>
      '<div class="ach ' + (claimed ? '' : done ? 'ready' : 'locked') + '"><div class="ai">' + a.icon + '</div><div class="grow"><b style="font-size:14px">' + a.name + '</b><div class="tiny muted">' + a.desc + ' · ' + GL.rewardText(a.reward) + '</div></div>' +
      (claimed ? '<span>✅</span>' : done ? '<button class="btn gold small" data-act="claimAch" data-id="' + a.id + '">Cobrar</button>' : '') + '</div>').join('');
  }

  /* ================= PIN parental ================= */
  const hashPin = (pin, salt) => GL.sha256(salt + ':' + pin);
  function randomKey(n) { const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; const arr = new Uint32Array(n); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(arr) : arr.forEach((_, i) => arr[i] = Math.random() * 1e9); for (let i = 0; i < n; i++) s += A[arr[i] % 32]; return s; }

  function pinPad(title, sub, onDone) {
    let val = '';
    const draw = () => {
      openSheet(title, '<div class="center small muted">' + sub + '</div><div class="pin-dots mt12">' + [0, 1, 2, 3, 4, 5].map(i => '<i class="' + (i < val.length ? 'on' : '') + '"></i>').join('') + '</div>' +
        '<div class="pin-pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map(k => '<button data-k="' + k + '">' + (k === 'C' ? '⌫' : k) + '</button>').join('') + '</div>', {
        onMount: w => w.querySelectorAll('.pin-pad button').forEach(b => b.onclick = () => {
          const k = b.dataset.k; sfx('tap');
          if (k === 'C') val = val.slice(0, -1);
          else if (k === 'OK') { if (val.length >= 4) { onDone(val); return; } }
          else if (val.length < 6) val += k;
          w.querySelectorAll('.pin-dots i').forEach((d, i) => d.classList.toggle('on', i < val.length));
        })
      });
    };
    draw();
  }
  function requirePin(cb) {
    if (!P.pinHash) {
      pinPad('Crear PIN parental', 'Solo para padres: elige un PIN de 4 a 6 números. Sirve para aprobar tareas y proteger las copias de seguridad.', p1 => {
        pinPad('Repite el PIN', 'Vuelve a escribir el mismo PIN.', p2 => {
          if (p1 !== p2) { sfx('error'); toast('Los PIN no coinciden. Inténtalo otra vez.'); closeSheet(); return; }
          P.salt = randomKey(12); P.pinHash = hashPin(p1, P.salt); if (!P.familyKey && !P.isParentDevice) P.familyKey = randomKey(10); saveP();
          toast('🔐 PIN creado'); closeSheet(); cb();
        });
      });
      return;
    }
    if (Date.now() < (P.lockUntil || 0)) { toast('Demasiados intentos. Espera ' + Math.ceil((P.lockUntil - Date.now()) / 1000) + ' s.'); return; }
    pinPad('PIN parental', 'Solo para padres.', pin => {
      if (hashPin(pin, P.salt) === P.pinHash) { P.fails = 0; saveP(); closeSheet(); cb(); }
      else {
        P.fails = (P.fails || 0) + 1; if (P.fails >= 5) { P.lockUntil = Date.now() + 60000 * Math.min(10, P.fails - 4); }
        saveP(); sfx('error'); buzz([50, 50, 50]); toast('PIN incorrecto'); closeSheet();
      }
    });
  }

  /* ================= Aprobaciones ================= */
  function approvalsToday() { const d = GL.dayKey(); if (!S.approvals || S.approvals.day !== d) S.approvals = { day: d, n: 0 }; return S.approvals; }
  function approveFlow() { requirePin(() => approveSheet()); }
  function approveSheet() {
    const ap = approvalsToday();
    let b = '<div class="small muted">Aprobadas hoy: <b>' + ap.n + '</b> de un máximo de ' + P.maxPerDay + ' (puedes cambiar el límite en el panel).</div>';
    if (!S.requests.length) b += '<div class="empty">No hay tareas pendientes.</div>';
    S.requests.forEach(r => {
      const t = P.tasks.find(x => x.id === r.taskId);
      if (!t) return;
      b += '<div class="task"><div class="te">' + esc(t.emoji) + '</div><div class="grow"><b>' + esc(t.name) + '</b><div class="tr">' + GL.rewardText(t.reward) + '</div><div class="tiny muted">' + new Date(r.ts).toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + '</div></div>' +
        '<div class="row gap6"><button class="btn small danger" data-act="reject" data-id="' + r.id + '">✕</button><button class="btn small green" data-act="approve" data-id="' + r.id + '">Aprobar</button></div></div>';
    });
    b += '<button class="btn block mt16" data-act="parentPanel">Abrir panel de padres</button>';
    openSheet('Aprobar tareas', b);
  }
  function approve(reqId, fromPanel) {
    const r = S.requests.find(x => x.id === reqId); if (!r) return;
    const t = P.tasks.find(x => x.id === r.taskId);
    const ap = approvalsToday();
    if (ap.n >= P.maxPerDay) { toast('Límite diario de aprobaciones alcanzado (' + P.maxPerDay + ').'); return; }
    S.requests = S.requests.filter(x => x.id !== reqId);
    if (t) { ap.n++; const ev = GL.approveTask(S, t); save(); sfx('coin'); toast('✅ ¡Buen trabajo! ' + t.name + ' → ' + GL.rewardText(t.reward)); if (ev.length) { closeSheet(); playEvents(ev, () => render()); return; } }
    save();
    if (fromPanel) parentPanel(); else approveSheet();
    render();
  }

  /* ================= Avisos por WhatsApp ================= */
  const APP_URL = () => location.origin + location.pathname.replace(/index\.html$/, '');
  function rewardIdx(reward) {
    if (!reward) return 0;
    if (reward.pack) {
      const i = CODE_REWARDS.findIndex(r => r.pack === reward.pack && (r.n || 1) === (reward.n || 1));
      return i >= 0 ? i : CODE_REWARDS.findIndex(r => r.pack === reward.pack);
    }
    let best = 4, diff = 1e9;
    CODE_REWARDS.forEach((r, i) => { if (r.credits && Math.abs(r.credits - reward.credits) < diff) { diff = Math.abs(r.credits - reward.credits); best = i; } });
    return best;
  }
  function cleanPhone(v) {
    let d = String(v || '').replace(/[^0-9]/g, '').replace(/^00/, '');
    if (d.length === 9 && /^[6789]/.test(d)) d = '34' + d;   // número español sin prefijo
    return d;
  }
  function waOpen(phone, text) {
    const url = 'https://wa.me/' + (phone || '') + '?text=' + encodeURIComponent(text);
    const w = window.open(url, '_blank');
    if (!w) location.href = url;
  }
  function requestMessage(t) {
    const link = APP_URL() + '#aprobar=' + rewardIdx(t.reward) + '&k=' + (P.familyKey || '') + '&t=' + encodeURIComponent(t.name).replace(/[()'!*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    return '📚 ¡He terminado: ' + t.name + '! ¿Me lo apruebas?\n\nPremio: ' + GL.rewardText(t.reward).replace(/🔧/g, 'créditos') + '\n\n👉 Para aprobarlo toca aquí: ' + link;
  }
  function notifySheet(t) {
    const b = '<div class="center"><div style="font-size:54px">📲</div><div class="tip-txt mt8" style="font-size:18px">Avisa a tus padres de que has terminado.</div>' + sayBtn('Avisa a tus padres de que has terminado. Toca el botón verde y después toca enviar en WhatsApp.') +
      '<div class="card mt12 small" style="text-align:left">1️⃣ Toca el botón verde.<br>2️⃣ Se abre WhatsApp con el mensaje ya escrito.<br>3️⃣ Toca <b>enviar</b> ➤.</div>' +
      '<button class="btn green block mt16" style="font-size:17px;padding:16px" data-act="sendWa" data-id="' + esc(t.id) + '">💬 Avisar por WhatsApp</button><button class="btn ghost block mt8" data-act="closeSheet">Ahora no</button></div>';
    openSheet('Avisar', b);
  }

  /* El padre/madre toca el enlace del WhatsApp en SU móvil: se abre la app lista para aprobar */
  function approveLinkFromHash() {
    const h = location.hash || '';
    let m = /^#aprobar=(\d+)&k=([0-9A-Za-z]*)&t=(.*)$/.exec(h), idx, key = '', rawName = '';
    if (m) { idx = m[1]; key = m[2].toUpperCase(); rawName = m[3]; }
    else { m = /^#aprobar=(\d+)~?(.*)$/.exec(h); if (!m) return null; idx = m[1]; rawName = m[2]; }   // avisos antiguos, sin clave
    history.replaceState(null, '', location.pathname + location.search);
    let name = ''; try { name = decodeURIComponent(rawName || ''); } catch (e) { }
    return { idx: Math.min(CODE_REWARDS.length - 1, +idx || 0), name: name.slice(0, 60), key: key.length >= 6 ? key : '' };
  }
  function handleApproveLink(link) {
    P.isParentDevice = true;
    if (link.key && link.key !== P.familyKey) { P.familyKey = link.key; link.keyUpdated = true; }   // la clave del móvil del hijo manda
    saveP();
    requirePin(() => parentPanel({ approve: link }));
  }
  /* El hijo toca el enlace de la respuesta: el premio se canjea solo */
  function redeemLinkFromHash() {
    const m = /^#canjear=([0-9A-Za-z-]{12,20})$/.exec(location.hash || '');
    if (!m) return null;
    history.replaceState(null, '', location.pathname + location.search);
    return m[1];
  }
  function handleRedeemLink(code) {
    closeOverlay(); go('rewards');
    setTimeout(() => redeemCode(code), 350);
  }

  /* ================= Códigos a distancia ================= */
  const CODE_REWARDS = [{ pack: 'standard', n: 1 }, { pack: 'standard', n: 2 }, { pack: 'epic', n: 1 }, { pack: 'legendary', n: 1 }, { credits: 50 }, { credits: 100 }, { credits: 200 }];
  const A32 = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const dayNum = ts => Math.floor((ts - new Date(ts).getTimezoneOffset() * 60000) / 864e5);
  function b32(n, len) { let s = ''; for (let i = 0; i < len; i++) { s = A32[n % 32] + s; n = Math.floor(n / 32); } return s; }
  function unb32(s) { let n = 0; for (const ch of s) { const v = A32.indexOf(ch); if (v < 0) return -1; n = n * 32 + v; } return n; }
  function signCode(payload) { const hx = GL.sha256(P.familyKey + '|' + payload); let s = ''; for (let i = 0; i < 5; i++) s += A32[parseInt(hx.substr(i * 2, 2), 16) % 32]; return s; }
  function makeCode(rewardIdx) {
    const payload = A32[rewardIdx] + b32(dayNum(Date.now()), 3) + randomKey(3);
    const full = payload + signCode(payload);
    return 'GL-' + full.slice(0, 4) + '-' + full.slice(4, 8) + '-' + full.slice(8, 12);
  }
  function redeemCode(raw) {
    const txt = String(raw || '').toUpperCase();
    // vale el código suelto, el mensaje entero pegado o el enlace de canje
    const found = /CANJEAR=([0-9A-Z]{12})/.exec(txt) || /GL[\s-]*([0-9A-Z]{4})[\s-]*([0-9A-Z]{4})[\s-]*([0-9A-Z]{4})/.exec(txt);
    const code = found ? (found[2] ? found[1] + found[2] + found[3] : found[1]) : txt.replace(/[^0-9A-Z]/g, '').replace(/^GL/, '');
    if (code.length !== 12) return toast('El código debe tener 12 caracteres (GL-XXXX-XXXX-XXXX).');
    if (!P.familyKey) return toast('Este móvil aún no tiene clave familiar. Tus padres deben crear el PIN primero.');
    if (S.redeemed.includes(code)) return toast('Este código ya se canjeó.');
    const payload = code.slice(0, 7), sig = code.slice(7);
    if (signCode(payload) !== sig) { sfx('error'); return toast('Código no válido para este móvil. Pide a tus padres que lo generen desde el enlace de tu último aviso (botón 📲 Avisar).'); }
    const idx = A32.indexOf(payload[0]), dn = unb32(payload.slice(1, 4)), today = dayNum(Date.now());
    if (idx < 0 || idx >= CODE_REWARDS.length) return toast('Código no válido.');
    if (dn > today + 1 || today - dn > 2) return toast('Este código ha caducado (dura 3 días).');
    S.redeemed.push(code);
    const reward = CODE_REWARDS[idx];
    const ri = S.requests.findIndex(r => { const t = P.tasks.find(x => x.id === r.taskId); return t && rewardIdx(t.reward) === idx; });
    if (ri >= 0) S.requests.splice(ri, 1);
    const ev = GL.approveTask(S, { name: 'Premio a distancia', emoji: '🎟️', reward, xp: 30 }, true);
    save(); sfx('coin'); confetti(['#34d399', '#fbbf24', '#fff'], 100);
    toast('🎟️ ¡Código canjeado! ' + GL.rewardText(reward));
    playEvents(ev, () => render());
  }

  /* ================= Panel de padres ================= */
  function rewardOptions(sel) {
    const opts = [['p:standard:1', '1 Sobre Garage'], ['p:standard:2', '2 Sobres Garage'], ['p:epic:1', '1 Sobre Nitro'], ['p:legendary:1', '1 Sobre Apex'], ['c:50', '50 créditos'], ['c:80', '80 créditos'], ['c:100', '100 créditos'], ['c:200', '200 créditos']];
    const cur = sel.pack ? 'p:' + sel.pack + ':' + (sel.n || 1) : 'c:' + sel.credits;
    return opts.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>').join('');
  }
  const parseReward = v => { const p = v.split(':'); return p[0] === 'p' ? { pack: p[1], n: Number(p[2]) } : { credits: Number(p[1]) }; };

  function parentPanel(opts) {
    opts = (opts && typeof opts === 'object' && !opts.target) ? opts : {};
    const ap = approvalsToday();
    const recent = S.history.filter(x => x.text.includes('→')).slice(0, 8);
    let b = '';
    if (S.requests.length) b += '<div class="card row"><div class="grow"><b>⏳ ' + S.requests.length + ' tarea(s) pendientes</b></div><button class="btn primary small" data-act="approveSheetP">Revisar</button></div>';
    b += '<h2 class="sec">⚡ Dar un premio ahora</h2><div class="small muted">Aprobadas hoy: ' + ap.n + '/' + P.maxPerDay + '</div>' + P.tasks.map(t => '<div class="task"><div class="te">' + esc(t.emoji) + '</div><div class="grow"><b style="font-size:14px">' + esc(t.name) + '</b><div class="tr">' + GL.rewardText(t.reward) + '</div></div><button class="btn small green" data-act="grantTask" data-id="' + esc(t.id) + '">Dar</button></div>').join('');

    if (opts.approve) {
      b = '<div class="card" style="border-color:var(--green)"><b>✅ Aprobar: ' + esc(opts.approve.name || 'tarea') + '</b><div class="small muted mt8">Premio: ' + GL.rewardText(CODE_REWARDS[opts.approve.idx]) + '. Genera el código y envíale el enlace por WhatsApp: al tocarlo, el premio se canjea solo.</div>' +
        (opts.approve.key ? '<div class="tiny muted mt8">🔑 Clave familiar recibida en el aviso' + (opts.approve.keyUpdated ? ' (actualizada en este móvil)' : '') + '.</div>' : '<div class="tiny mt8" style="color:var(--gold)">⚠️ Este aviso es de una versión anterior y no trae la clave familiar. Si el código no le funciona, pídele que te reenvíe el aviso con el botón 📲 Avisar.</div>') +
        (P.familyKey ? '<button class="btn primary block mt12" data-act="genCode">🎟️ Generar código</button>' : '<div class="small mt12" style="color:var(--gold)">⚠️ Antes escribe abajo la <b>clave familiar</b> que aparece en el panel de padres del móvil de tu hijo.</div>') + '<div id="codeOut"></div></div>' + b;
    }
    b += '<h2 class="sec">📲 Avisos por WhatsApp</h2><div class="card"><div class="small muted">Cuando tu hijo pulse «¡Hecho!», se le abrirá WhatsApp con un mensaje para ti. El mensaje trae un enlace: al tocarlo en tu móvil se abre la app lista para aprobar.</div>' +
      '<div class="field"><label>Tu número de WhatsApp (con prefijo, por ejemplo 34 600 000 000)</label><div class="row"><input id="parentPhone" type="tel" inputmode="tel" value="' + esc(P.parentPhone ? '+' + P.parentPhone : '') + '" placeholder="+34 600 000 000"><button class="btn small primary" data-act="savePhone">Guardar</button></div></div>' +
      '<button class="btn small mt8" data-act="testWa">Enviar mensaje de prueba</button>' +
      '<div class="small muted mt12">Para aprobar desde tu móvil: abre la app en tu móvil, crea tu PIN y escribe la clave familiar <b>' + esc(P.familyKey || '(se crea con el PIN)') + '</b>.</div></div>';
    b += '<h2 class="sec">📲 Código a distancia</h2><div class="card"><div class="small muted">Genera un código (válido 3 días, un solo uso) y mándaselo por WhatsApp. Para generarlo desde <b>tu</b> móvil, abre la app en tu móvil, entra en este panel y pon la misma clave familiar.</div>' +
      '<div class="field"><label>Premio</label><select id="codeReward">' + CODE_REWARDS.map((r, i) => '<option value="' + i + '">' + GL.rewardText(r) + '</option>').join('') + '</select></div><button class="btn primary block mt12" data-act="genCode">Generar código</button><div id="codeOut"></div>' +
      '<div class="field"><label>Clave familiar (igual en los dos móviles)</label><div class="row"><input id="famKey" value="' + esc(P.familyKey || '') + '" autocapitalize="characters"><button class="btn small" data-act="saveFamKey">Guardar</button></div></div></div>';

    b += '<h2 class="sec">📈 Resumen</h2><div class="grid2"><div class="stat"><div class="v">' + S.weekly.tasks + '</div><div class="l">Tareas esta semana</div></div><div class="stat"><div class="v">' + S.stats.tasksApproved + '</div><div class="l">Tareas en total</div></div>' +
      '<div class="stat"><div class="v">' + S.stats.packsOpened + '</div><div class="l">Sobres abiertos</div></div><div class="stat"><div class="v">' + S.completedCars.length + '/' + GL.CARS.length + '</div><div class="l">Coches completos</div></div></div>' +
      (recent.length ? '<div class="card mt12">' + recent.map(x => '<div class="hist"><span>' + esc(x.icon) + '</span><span>' + esc(x.text) + '</span><span class="ht">' + new Date(x.ts).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + '</span></div>').join('') + '</div>' : '');

    b += '<h2 class="sec">✏️ Tareas y premios</h2><div id="taskEdit">' + P.tasks.map((t, i) => '<div class="list-edit"><input data-te="emoji" data-i="' + i + '" value="' + esc(t.emoji) + '" maxlength="4" style="text-align:center;padding:8px 4px"><div><input data-te="name" data-i="' + i + '" value="' + esc(t.name) + '" maxlength="40"><div class="row mt8"><select data-te="reward" data-i="' + i + '">' + rewardOptions(t.reward) + '</select><button class="btn small danger" data-act="delTask" data-i="' + i + '">🗑</button></div></div></div>').join('') + '</div>' +
      '<div class="row mt12"><button class="btn small" data-act="addTask">+ Añadir tarea</button><button class="btn small primary" data-act="saveTasks">Guardar cambios</button></div>' +
      '<div class="field"><label>Máximo de tareas aprobadas por día</label><input id="maxDay" type="number" min="1" max="20" value="' + P.maxPerDay + '"></div><button class="btn small mt8" data-act="saveMax">Guardar límite</button>';

    b += '<h2 class="sec">💡 Consejos para que el premio ayude</h2><div class="card small"><ul class="tips-parent" style="padding-left:18px;margin:0">' +
      '<li><b>Pactad juntos</b> qué tareas cuentan y qué se gana. Si él ayuda a elegir, se implica más.</li>' +
      '<li><b>Aprueba pronto</b> y di algo concreto sobre el esfuerzo: «te has concentrado 45 minutos». Así el mensaje no es solo «toma un sobre».</li>' +
      '<li>Con dislexia, la nota no siempre refleja el trabajo: <b>premia el esfuerzo y la constancia</b>, no solo el resultado.</li>' +
      '<li><b>No quites cromos ni sobres como castigo.</b> Si un día no hay tarea, simplemente no hay premio.</li>' +
      '<li>No premies lo que ya hace por gusto (por ejemplo, leer sobre coches): los premios pueden quitarle las ganas.</li>' +
      '<li>Con el tiempo, pasa de premiar cada tarea a premiar <b>la semana</b> (los escalones semanales ya lo hacen).</li>' +
      '<li>Activa la lectura en voz alta y el modo lectura fácil (menú ⚙️) y deja que también juegue por placer.</li></ul></div>';
    b += '<h2 class="sec">💾 Copias de seguridad</h2><div class="card"><div class="small muted">La partida se guarda en este móvil. Haz copia de vez en cuando (por ejemplo a tu Google Drive o WhatsApp). Restaurar una copia solo se puede desde aquí.</div><div class="row wrap mt12"><button class="btn small" data-act="exportSave">⬇️ Descargar</button><button class="btn small" data-act="shareSave">📤 Compartir</button><label class="btn small">⬆️ Restaurar<input type="file" accept=".json,application/json" id="importFile" hidden></label></div></div>';

    b += '<h2 class="sec">🧰 Herramientas</h2><div class="row wrap"><button class="btn small" data-act="pGrant" data-v="standard">+1 Garage</button><button class="btn small" data-act="pGrant" data-v="epic">+1 Nitro</button><button class="btn small" data-act="pGrant" data-v="legendary">+1 Apex</button><button class="btn small" data-act="pGrant" data-v="credits">+200 🔧</button></div>' +
      '<div class="row wrap mt12"><button class="btn small" data-act="changePin">Cambiar PIN</button><button class="btn small danger" data-act="resetAll">Reiniciar álbum</button></div>';
    openSheet('👨‍👩‍👦 Panel de padres', b, {
      onMount: w => {
        const f = w.querySelector('#importFile'); if (f) f.onchange = importSave;
        if (opts.approve) { const sel = w.querySelector('#codeReward'); if (sel) sel.value = String(opts.approve.idx); if (!P.familyKey) { const k = w.querySelector('#famKey'); if (k) { k.scrollIntoView({ block: 'center' }); k.focus(); } } }
      }
    });
  }
  function readTaskEdits() {
    document.querySelectorAll('[data-te]').forEach(el => {
      const t = P.tasks[+el.dataset.i]; if (!t) return;
      if (el.dataset.te === 'emoji') t.emoji = el.value.trim().slice(0, 4) || '⭐';
      if (el.dataset.te === 'name') t.name = el.value.trim().slice(0, 40) || 'Tarea';
      if (el.dataset.te === 'reward') t.reward = parseReward(el.value);
    });
  }

  /* ================= Copias de seguridad ================= */
  function backupBlob() { return new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); }
  function exportSave() {
    const url = URL.createObjectURL(backupBlob()), a = document.createElement('a');
    a.href = url; a.download = 'garage-legends-copia-' + GL.dayKey() + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    S.lastBackup = Date.now(); save(); toast('💾 Copia descargada'); if (tab === 'home') render();
  }
  async function shareSave() {
    const file = new File([backupBlob()], 'garage-legends-copia-' + GL.dayKey() + '.json', { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Copia de Garage Legends' }); S.lastBackup = Date.now(); save(); } catch (e) { }
    } else exportSave();
  }
  function importSave(ev) {
    const f = ev.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        const ns = data.ownedPieces ? GL.migrateV1(data) : GL.sanitize(data);
        if (!ns) throw new Error('bad');
        S = ns; GL.touchClock(S); GL.ensureMissions(S); GL.ensureWeek(S); save(); closeSheet(); render(); toast('✅ Álbum restaurado');
      } catch (e) { toast('Ese archivo no es una copia válida de Garage Legends.'); }
    };
    rd.readAsText(f);
  }

  /* ================= Menú ================= */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  function menu() {
    const b = '<div class="card row between"><span>🔤 Lectura fácil<br><span class="tiny muted">Letra más grande y separada</span></span><button class="btn small" data-act="toggle" data-k="easyRead">' + (S.settings.easyRead !== false ? 'Activada' : 'Apagada') + '</button></div>' +
      '<div class="card row between"><span>🗣️ Leer en voz alta<br><span class="tiny muted">Tutorial y preguntas</span></span><button class="btn small" data-act="toggle" data-k="voice">' + (S.settings.voice !== false ? 'Activado' : 'Apagado') + '</button></div>' +
      '<div class="card row between"><span>🧭 Tutorial guiado</span><button class="btn small primary" data-act="startTour">Empezar</button></div>' +
      '<div class="card row between"><span>🔊 Sonido</span><button class="btn small" data-act="toggle" data-k="sound">' + (S.settings.sound ? 'Activado' : 'Apagado') + '</button></div>' +
      '<div class="card row between"><span>📳 Vibración</span><button class="btn small" data-act="toggle" data-k="haptics">' + (S.settings.haptics ? 'Activada' : 'Apagada') + '</button></div>' +
      '<div class="card row between"><span>💾 Copia de seguridad</span><span class="row gap6"><button class="btn small" data-act="exportSave">Descargar</button><button class="btn small" data-act="shareSave">Compartir</button></span></div>' +
      '<div class="card row between"><span>📲 Instalar como app</span><button class="btn small" data-act="install">Instalar</button></div>' +
      '<div class="card row between"><span>❓ Cómo se juega</span><button class="btn small" data-act="help">Ver</button></div>' +
      '<div class="card row between"><span>📷 Créditos de las fotos</span><button class="btn small" data-act="credits">Ver</button></div>' +
      '<div class="card row between"><span>👨‍👩‍👦 Panel de padres</span><button class="btn small primary" data-act="parentAccess">Entrar</button></div>' +
      '<div class="card row between"><span>📜 Licencia y créditos</span><button class="btn small" data-act="license">Ver</button></div>' +
      '<div class="tiny dim center mt16">Garage Legends ' + GL.VERSION + ' · © 2026 Rafael Karino Arillo · Licencia MIT<br>' + GL.CARS.length + ' coches · ' + GL.CARS.length * 10 + ' cromos</div>';
    openSheet('⚙️ Menú', b);
  }
  function help() {
    openSheet('❓ Cómo se juega', '<div class="card small"><b>🃏 Cromos y coches</b><br>Cada coche tiene 10 cromos. Cada cromo destapa un trozo de su foto y un dato real: motor, potencia, velocidad… El nº 10 es una curiosidad brillante.</div>' +
      '<div class="card small"><b>📦 Sobres</b><br>Cada día tienes un sobre gratis. Si vienes días seguidos sube tu racha 🔥: al 3.er día, créditos extra; cada 7 días, un sobre Nitro; a los 30, un sobre Apex.</div>' +
      '<div class="card small"><b>💎 Rarezas</b><br>Común, Rara, Épica, Legendaria y Mítica. Cuanto más exclusivo es el coche en la vida real, más difícil es conseguirlo. Los míticos se desbloquean subiendo de nivel.</div>' +
      '<div class="card small"><b>🔧 Repetidos y Taller</b><br>Los repetidos se convierten en créditos. Con ellos fabricas el cromo exacto que te falta, compras sobres o pides un cromo sorpresa.</div>' +
      '<div class="card small"><b>📚 Premios por estudiar</b><br>Termina deberes o tareas, pulsa ¡Hecho! en Premios y que tus padres lo aprueben. ¡Cuantas más tareas a la semana, mejores premios!</div>' +
      '<div class="card small"><b>🧩 Desafío</b><br>3 partidas al día de preguntas sobre coches para ganar créditos y aprender.</div>');
  }
  function creditsSheet() {
    const C = window.GL_CREDITS || {};
    openSheet('📷 Créditos', '<div class="small muted">Las fotos son de Wikimedia Commons, con licencias libres. Gracias a sus autores.</div>' +
      GL.CARS.map(c => { const x = C[c.id]; return x ? '<div class="hist"><span><b>' + esc(c.brand + ' ' + c.model) + '</b><br><span class="tiny muted">' + esc(x.author) + ' · ' + esc(x.license) + ' · <a href="' + esc(x.url) + '" target="_blank" rel="noopener">ver</a></span></span></div>' : ''; }).join('') +
      '<div class="small muted mt12">Pósters ilustrados: creados por la familia con IA.</div>');
  }

  /* ================= Acciones (delegación de eventos) ================= */
  const A = {
    go: d => go(d.tab),
    closeSheet: () => closeSheet(),
    closeOverlay: () => closeOverlay(),
    claimDaily: () => {
      const r = GL.claimDaily(S); if (!r) return; save(); sfx('coin'); confetti(['#fbbf24', '#22d3ee', '#fff'], 90); buzz(40);
      toast('🎁 +1 Sobre Garage' + (r.bonus ? ' · Bonus de racha: ' + GL.rewardText(r.bonus) : '') + ' · 🔥 ' + r.streak);
      render();
    },
    claimMission: d => { const r = GL.claimMission(S, d.id); if (!r) return; save(); sfx('coin'); toast('✅ ' + GL.rewardText(r.reward)); playEvents(r.events, () => render()); },
    claimWeekly: d => { const r = GL.claimWeekly(S, d.id); if (!r) return; save(); sfx('complete'); confetti(['#fbbf24', '#34d399', '#fff']); toast('📅 ¡Objetivo semanal! ' + GL.rewardText(r)); render(); },
    claimAch: d => { const r = GL.claimAchievement(S, d.id); if (!r) return; save(); sfx('complete'); confetti(['#fbbf24', '#fff']); toast('🏅 ' + GL.rewardText(r)); render(); if (!$('#sheet').classList.contains('hidden')) A.openAchievements(); },
    openAchievements: () => openSheet('🏅 Vitrina de logros', achievementsList()),
    openCar: d => { sfx('tap'); openCar(d.car); },
    pieceInfo: (d, el) => {
      const car = GL.carById[d.car], n = +el.dataset.n, pc = GL.PIECES[n - 1];
      if (GL.hasPiece(S, d.car, n)) { toast(pc.icon + ' ' + pc.label + ': ' + GL.pieceValue(car, n)); return; }
      toast(pc.icon + ' Cromo #' + n + ' (' + pc.label + '): consíguelo en sobres o fabrícalo por ' + GL.craftCost(car) + ' 🔧');
    },
    craft: d => {
      const car = GL.carById[d.car];
      if (!confirm('¿Fabricar el cromo #' + d.n + ' de ' + car.model + ' por ' + GL.craftCost(car) + ' créditos?')) return;
      const r = GL.craft(S, d.car, +d.n); if (!r) return toast('No tienes créditos suficientes.');
      save(); sfx('new'); buzz(30); toast('🛠️ ¡Cromo fabricado! (' + r.card.countAfter + '/10)');
      closeSheet(); playEvents(r.events, () => { render(); if (!GL.isComplete(S, d.car)) openCar(d.car, +d.n); else openCar(d.car); });
    },
    surprise: d => {
      const r = GL.surprise(S, d.r); if (!r) return toast('No tienes créditos suficientes.');
      save(); sfx('epic');
      openOverlay('<div class="celebrate"><div class="display" style="font-weight:800">CROMO SORPRESA</div><div class="big-card mt16">' + tcard(r.card, '<div class="stamp new">NUEVO</div>') + '</div><div class="open-actions"><button class="btn primary" data-act="surpriseOk">¡Genial!</button></div></div>');
      ui.pendingEvents = r.events;
    },
    surpriseOk: () => { closeOverlay(); playEvents(ui.pendingEvents, () => render()); ui.pendingEvents = null; },
    buyPack: d => { const p = GL.PACKS[d.type]; if (!confirm('¿Comprar ' + p.name + ' por ' + p.cost + ' créditos?')) return; if (GL.buyPack(S, d.type)) { save(); sfx('coin'); render(); openPackFlow(d.type); } },
    openPack: d => openPackFlow(d.type),
    ripPack: d => ripPack(d.type),
    flip: d => flipCard(+d.i),
    flipAll: () => { ui.flippingAll = true; reveal.res.cards.forEach((_, i) => setTimeout(() => flipCard(i), i * 160)); setTimeout(() => { ui.flippingAll = false; }, 1000); },
    nextPack: () => endReveal(true),
    endReveal: () => endReveal(false),
    evNext: () => ui.evNext && ui.evNext(),
    fRar: d => { ui.rarity = d.v; render(); },
    fSt: d => { ui.status = d.v; render(); },
    startQuiz: () => startQuiz(),
    answer: d => quizAnswer(d.id),
    quizNext: () => quizNext(),
    quizDone: () => { const ev = ui.quiz.events.concat(ui.quiz.reward.events); ui.quiz = null; playEvents(ev, () => render()); },
    request: d => {
      const t = P.tasks.find(x => x.id === d.id); if (!t) return;
      S.requests.push({ id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1000), taskId: t.id, ts: Date.now() });
      save(); sfx('tap'); render();
      if (P.parentPhone) notifySheet(t); else toast('⏳ Apuntado. Pide a tus padres que lo aprueben.');
    },
    notify: d => { const t = P.tasks.find(x => x.id === d.id); if (t) notifySheet(t); },
    sendWa: d => { const t = P.tasks.find(x => x.id === d.id); if (!t) return; closeSheet(); waOpen(P.parentPhone, requestMessage(t)); toast('📲 ¡Aviso preparado! Ahora toca enviar en WhatsApp.'); },
    replyWa: d => waOpen('', '🎟️ ¡Premio aprobado! Toca el enlace para recibirlo:\n' + APP_URL() + '#canjear=' + d.code.replace(/^GL-?/, '').replace(/-/g, '')),
    copyCode: async d => {
      try { await navigator.clipboard.writeText(d.code); toast('📋 Código copiado: pégalo en WhatsApp como mensaje aparte'); }
      catch (e) { toast('Mantén pulsado el código para copiarlo.'); }
    },
    savePhone: () => { const v = cleanPhone($('#parentPhone').value); if (v && v.length < 10) return toast('Escribe el número con prefijo, por ejemplo 34 600 000 000.'); P.parentPhone = v || null; saveP(); toast(v ? '📲 WhatsApp guardado: +' + v : 'Avisos por WhatsApp desactivados'); },
    testWa: () => { if (!P.parentPhone) return toast('Guarda primero el número.'); waOpen(P.parentPhone, '✅ Prueba de Garage Legends: los avisos de tareas llegarán a este WhatsApp.'); },
    approveFlow: () => approveFlow(),
    approve: d => approve(d.id),
    reject: d => { S.requests = S.requests.filter(x => x.id !== d.id); save(); approveSheet(); render(); },
    approveSheetP: () => approveSheet(),
    redeem: () => { redeemCode($('#codeIn').value); },
    parentAccess: () => requirePin(parentPanel),
    parentPanel: () => parentPanel(),
    grantTask: d => {
      const t = P.tasks.find(x => x.id === d.id); if (!t) return;
      const ap = approvalsToday(); if (ap.n >= P.maxPerDay) return toast('Límite diario alcanzado (' + P.maxPerDay + ').');
      ap.n++; const ev = GL.approveTask(S, t); save(); sfx('coin'); toast('✅ ' + t.name + ' → ' + GL.rewardText(t.reward));
      if (ev.length) { closeSheet(); playEvents(ev, () => render()); } else { parentPanel(); render(); }
    },
    genCode: () => {
      if (!P.familyKey) return toast('Guarda primero una clave familiar.');
      const code = makeCode(+$('#codeReward').value);
      const outs = document.querySelectorAll('#codeOut'); if (outs.length > 1) outs[1].innerHTML = '';
      $('#codeOut').innerHTML = '<div class="codebox mt12">' + code + '</div><div class="row mt8"><button class="btn green block" data-act="replyWa" data-code="' + code + '">💬 Enviar enlace por WhatsApp</button></div><div class="small muted mt8">Tu hijo solo tiene que tocar el enlace: el premio se canjea solo.</div><div class="row mt8 gap6"><button class="btn small grow" data-act="copyCode" data-code="' + code + '">📋 Copiar solo el código</button><button class="btn small grow" data-act="shareCode" data-code="' + code + '">📤 Otra app</button></div>';
    },
    shareCode: async d => {
      const text = '🎟️ Código de Garage Legends: ' + d.code + ' (canjéalo en Premios)';
      if (navigator.share) { try { await navigator.share({ text }); } catch (e) { } }
      else { try { await navigator.clipboard.writeText(d.code); toast('Código copiado'); } catch (e) { } }
    },
    saveFamKey: () => { const v = $('#famKey').value.toUpperCase().replace(/[^0-9A-Z]/g, ''); if (v.length < 6) return toast('La clave debe tener al menos 6 caracteres.'); P.familyKey = v; saveP(); toast('🔑 Clave familiar guardada'); },
    addTask: () => { readTaskEdits(); P.tasks.push({ id: 't-' + Date.now().toString(36), emoji: '⭐', name: 'Nueva tarea', reward: { credits: 50 }, xp: 20 }); saveP(); parentPanel(); },
    delTask: d => { readTaskEdits(); P.tasks.splice(+d.i, 1); saveP(); parentPanel(); },
    saveTasks: () => { readTaskEdits(); saveP(); toast('💾 Tareas guardadas'); render(); },
    saveMax: () => { P.maxPerDay = Math.max(1, Math.min(20, +$('#maxDay').value || 5)); saveP(); toast('Límite guardado'); },
    pGrant: d => { if (d.v === 'credits') S.credits += 200; else S.packs[d.v]++; GL.log(S, '🎁', 'Regalo de tus padres'); save(); toast('🎁 Añadido'); render(); },
    changePin: () => { P.pinHash = null; saveP(); requirePin(parentPanel); },
    resetAll: () => {
      if (!confirm('¿Seguro que quieres BORRAR todo el álbum? Haz antes una copia de seguridad. Esto no se puede deshacer.')) return;
      if (!confirm('Última confirmación: se perderán todos los cromos.')) return;
      S = GL.newState(); GL.ensureMissions(S); GL.ensureWeek(S); save(); closeSheet(); go('home'); toast('Álbum reiniciado');
    },
    exportSave: () => exportSave(),
    shareSave: () => shareSave(),
    toggle: d => { S.settings[d.k] = S.settings[d.k] === false; save(); applyEasy(); menu(); },
    install: async () => {
      if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { } installEvt = null; }
      else toast('En Chrome: menú ⋮ → "Añadir a pantalla de inicio". En iPhone: Compartir → "Añadir a inicio".');
    },
    help: d => helpSheet(d && d.k ? d.k : 'general'),
    say: (d, el) => speak(d.t, el),
    tipOk: () => { const t = $('#tipBox'); if (t) t.remove(); try { speechSynthesis.cancel(); } catch (e) { } },
    startTour: () => startTour(),
    tourNext: () => tourNext(),
    tourSkip: () => endTour(false),
    vitrina: () => vitrina(),
    albumMode: () => { S.settings.albumMode = bookMode() ? 'list' : 'book'; save(); sfx('tap'); render(); },
    bookPrev: () => bookGo((ui.albumPage || 0) - 1),
    bookNext: () => bookGo((ui.albumPage || 0) + 1),
    bookIndex: () => bookIndex(),
    bookJump: d => { closeSheet(); bookGo(+d.i); },
    toAlbum: () => {
      const c = reveal && reveal.res.cards.find(x => !x.dup);
      if (c) ui.albumPage = brandIndex(GL.carById[c.carId].brand);
      S.settings.albumMode = 'book';
      ui.afterReveal = () => go('album');
      endReveal(false);
    },
    hall: () => { sfx('tap'); hall(); },
    lcard: d => { sfx('flip'); bigLegend(d.car); },
    dlCard: d => downloadCard(d.car),
    setFavCard: d => { S.favorite = S.favorite === d.car ? null : d.car; save(); sfx('tap'); bigLegend(d.car); if (!$('#overlay').classList.contains('hidden') && $('.hall')) hall(), bigLegend(d.car); else render(); },
    nsOpen: () => { const t = ['standard', 'epic', 'legendary'].find(x => S.packs[x] > 0); go('packs'); if (t) openPackFlow(t); },
    setFav: d => { S.favorite = S.favorite === d.car ? null : d.car; save(); sfx('tap'); openCar(d.car); render(); },
    emblemInfo: d => { const cars = GL.brandCars(d.b), done = cars.filter(c => GL.isComplete(S, c.id)).length; toast('🛡️ ' + d.b + ': ' + done + ' de ' + cars.length + ' coches completos. Premio: ' + GL.rewardText(GL.brandReward(d.b))); },
    trophyInfo: d => { const a = GL.ACHIEVEMENTS.find(x => x.id === d.id); if (a) toast(a.icon + ' ' + a.name + ': ' + a.desc + '. ' + (S.achievements.includes(a.id) ? '¡Conseguido!' : 'Premio: ' + GL.rewardText(a.reward))); },
    credits: () => creditsSheet(),
    license: () => licenseSheet(),
    zoomPoster: d => openOverlay('<div class="open-stage" data-act="closeOverlay"><img src="img/posters/' + d.car + '.webp" alt="" style="width:100%;max-width:1200px;border-radius:12px"><div class="tap-hint">Toca para cerrar</div></div>')
  };

  document.addEventListener('click', e => {
    const nav = e.target.closest('.bottomnav button');
    if (nav) { sfx('tap'); go(nav.dataset.tab); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = A[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el.dataset, el); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'albumSearch') { ui.q = e.target.value; const l = $('#albumList'); if (l) l.innerHTML = albumList(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'codeIn') redeemCode(e.target.value); });
  $('#btnMenu').onclick = () => { sfx('tap'); menu(); };
  $('#levelChip').onclick = () => toast(GL.rank(S.level).icon + ' ' + GL.rank(S.level).name + ' · Nivel ' + S.level + ' · ' + S.xp + '/' + GL.xpForLevel(S.level) + ' XP para el siguiente. ' + (GL.CARS.find(c => c.rarity === 'MYTHIC' && c.unlock > S.level) ? 'Próximo mítico en el nivel ' + GL.CARS.find(c => c.rarity === 'MYTHIC' && c.unlock > S.level).unlock + '.' : ''));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S) { GL.touchClock(S); GL.ensureMissions(S); GL.ensureWeek(S); save(); if (tab === 'home') render(); } });

  /* ================= Arranque ================= */
  function welcome() {
    if (P.isParentDevice && !firstRun) return;
    if (migrated) {
      openOverlay('<div class="celebrate"><div class="big">GARAGE LEGENDS 2.0</div><div class="card mt16" style="max-width:480px">🔄 Tu álbum anterior se ha pasado a la nueva versión: conservas tus cromos y tus sobres. ¡Ahora hay <b>' + GL.CARS.length + ' coches</b>, misiones, desafío, logros y mucho más!</div><div class="open-actions"><button class="btn gold" data-act="closeOverlay">¡A jugar!</button></div></div>');
    } else if (firstRun) {
      openOverlay('<div class="celebrate"><div style="font-size:64px">🏎️</div><div class="big">GARAGE LEGENDS</div><div class="card mt16 small" style="max-width:480px;text-align:left">' +
        '🃏 Colecciona los <b>10 cromos</b> de cada coche para destapar su foto y sus datos.<br><br>📦 Tienes <b>' + GL.TUNING.welcomePacks + ' sobres de bienvenida</b> y uno gratis cada día.<br><br>📚 Gana más sobres haciendo deberes y estudiando (pestaña Premios).<br><br>👑 ' + GL.CARS.length + ' coches, de un Golf GTI a un Bugatti. ¿Podrás completarlos todos?</div>' +
        '<div class="open-actions"><button class="btn gold" data-act="welcomeGo">¡Empezar!</button></div></div>');
    } else if (!S.tutorialDone) {
      openOverlay('<div class="celebrate"><div style="font-size:60px">✨</div><div class="big">¡NOVEDADES!</div><div class="card mt16 small" style="text-align:left">🧭 Un <b>tutorial guiado</b> que te enseña a jugar paso a paso.<br><br>🔊 Puedes <b>escuchar</b> las explicaciones.<br><br>🏅 <b>Medallas</b> de bronce, plata y oro para cada coche, <b>insignias</b> de marca y una <b>vitrina</b>.</div><div class="open-actions"><button class="btn gold" data-act="welcomeGo">Ver el tutorial</button><button class="btn" data-act="tourSkip">Ahora no</button></div></div>');
    }
  }
  A.welcomeGo = () => { closeOverlay(); startTour(); };

  load();
  go('home');
  const approveLink = approveLinkFromHash(), redeemLink = !approveLink && redeemLinkFromHash();
  if (approveLink) handleApproveLink(approveLink); else if (redeemLink) handleRedeemLink(redeemLink); else welcome();
  window.addEventListener('hashchange', () => { const l = approveLinkFromHash(); if (l) return handleApproveLink(l); const r = redeemLinkFromHash(); if (r) handleRedeemLink(r); });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})(window.GL);
