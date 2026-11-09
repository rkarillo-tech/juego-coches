/* Garage Legends 2.0 — Motor del juego (lógica pura, sin interfaz).
   Funciona en el navegador y en Node (para simular la economía). */
(function (GL) {
  'use strict';
  const R = GL.RARITIES;
  const DAY = 86400000;

  /* ---------- Ajustes de economía (afinados con simulación) ---------- */
  GL.TUNING = {
    cardsPerPack: 5,
    newBias: 0.40,          // prob. extra de que el cromo sea uno que te falta
    legendaryPity: 8,       // tras 8 sobres sin Legendaria, la siguiente está garantizada
    surpriseFactor: 0.6,    // "Cromo sorpresa" cuesta el 60 % de fabricar uno concreto
    foilScrapMult: 2,
    dupeXp: 2,
    completeXp: 60,
    completeCredits: { COMMON: 40, RARE: 80, EPIC: 150, LEGENDARY: 300, MYTHIC: 600 },
    quizPerDay: 3,
    quizCreditPerHit: 5,
    quizPerfectBonus: 25,
    welcomePacks: 3,
    welcomeCredits: 100
  };
  const T = GL.TUNING;

  GL.carById = {};
  GL.CARS.forEach(c => { GL.carById[c.id] = c; });

  /* ---------- Utilidades ---------- */
  GL.rng = Math.random;
  const rand = () => GL.rng();
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  GL.pick = pick;

  GL.dayKey = function (ts) {
    const d = new Date(ts == null ? Date.now() : ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  GL.weekKey = function (ts) {
    const d = new Date(ts == null ? Date.now() : ts);
    const day = (d.getDay() + 6) % 7; // lunes = 0
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    return GL.dayKey(monday.getTime());
  };
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  GL.hashStr = hashStr;

  /* ---------- Estado ---------- */
  GL.newState = function () {
    return {
      v: 2,
      created: Date.now(),
      pieces: {},                 // carId -> [n...]
      credits: T.welcomeCredits,
      packs: { standard: T.welcomePacks, epic: 0, legendary: 0 },
      xp: 0, level: 1,
      pity: { sinceLegendary: 0, lastPackNoNew: false },
      stats: { packsOpened: 0, cards: 0, newPieces: 0, dupes: 0, crafted: 0, quizPlayed: 0, quizGood: 0, quizPerfect: 0,
               tasksApproved: 0, legendaryPulled: 0, mythicPulled: 0, carsCompleted: 0, viewedCars: 0, dailyClaims: 0 },
      daily: { last: null, streak: 0, best: 0 },
      clock: { maxSeen: Date.now() },
      missions: { day: null, ids: [], base: {}, claimed: [] },
      weekly: { week: null, tasks: 0, claimed: [] },
      achievements: [],           // ids reclamados
      completedCars: [],          // ids completados (premio entregado)
      requests: [],               // {id, taskId, ts}
      history: [],                // {ts, icon, text}
      redeemed: [],               // códigos usados
      quiz: { day: null, plays: 0 },
      settings: { sound: true, haptics: true, easyRead: true, voice: true },
      carQuiz: {},                // carId -> aciertos en el Desafío sobre ese coche
      carDupes: {},               // carId -> repetidos conseguidos tras completarlo
      medals: {},                 // carId -> 1 bronce, 2 plata, 3 oro
      brands: [],                 // marcas con insignia conseguida
      favorite: null,             // coche favorito (se ve en Inicio)
      tutorialDone: false,
      tips: {},                   // ayudas emergentes ya vistas
      lastBackup: null,
      newCars: []                 // coches descubiertos recientemente (para destacar)
    };
  };

  GL.owned = (s, carId) => s.pieces[carId] || [];
  GL.hasPiece = (s, carId, n) => GL.owned(s, carId).includes(n);
  GL.count = (s, carId) => GL.owned(s, carId).length;
  GL.isComplete = (s, carId) => GL.count(s, carId) >= 10;
  GL.isDiscovered = (s, carId) => GL.count(s, carId) > 0;
  GL.isUnlocked = (s, car) => car.rarity !== 'MYTHIC' || s.level >= (car.unlock || 1);
  GL.availableCars = s => GL.CARS.filter(c => GL.isUnlocked(s, c));
  GL.missing = (s, carId) => { const o = GL.owned(s, carId); const m = []; for (let n = 1; n <= 10; n++) if (!o.includes(n)) m.push(n); return m; };

  GL.log = function (s, icon, text) {
    s.history.unshift({ ts: Date.now(), icon, text });
    if (s.history.length > 150) s.history.length = 150;
  };

  /* ---------- Niveles ---------- */
  GL.xpForLevel = L => 250 + 100 * (L - 1);  // XP necesaria para pasar de L a L+1
  GL.addXp = function (s, amount, events) {
    s.xp += amount;
    while (s.xp >= GL.xpForLevel(s.level)) {
      s.xp -= GL.xpForLevel(s.level);
      s.level++;
      const reward = (s.level % 5 === 0) ? { pack: 'epic', n: 1 } : (s.level % 2 === 0 ? { pack: 'standard', n: 1 } : { credits: 80 });
      GL.grant(s, reward);
      const unlocked = GL.CARS.filter(c => c.rarity === 'MYTHIC' && c.unlock === s.level);
      if (events) events.push({ type: 'levelup', level: s.level, reward, unlocked });
      GL.log(s, '⬆️', 'Nivel ' + s.level + ' alcanzado');
    }
  };

  GL.grant = function (s, reward) {
    if (!reward) return;
    if (reward.pack) s.packs[reward.pack] = (s.packs[reward.pack] || 0) + (reward.n || 1);
    if (reward.credits) s.credits += reward.credits;
  };
  GL.rewardText = function (reward) {
    if (!reward) return '';
    const parts = [];
    if (reward.pack) parts.push('+' + (reward.n || 1) + ' ' + GL.PACKS[reward.pack].name);
    if (reward.credits) parts.push('+' + reward.credits + ' 🔧');
    return parts.join(' · ');
  };

  /* ---------- Sobres ---------- */
  function rollRarity(s, minRarity) {
    const minIdx = GL.RARITY_ORDER.indexOf(minRarity || 'COMMON');
    const hasMythic = GL.CARS.some(c => c.rarity === 'MYTHIC' && GL.isUnlocked(s, c));
    const pool = GL.RARITY_ORDER.filter((r, i) => i >= minIdx && (r !== 'MYTHIC' || hasMythic));
    const total = pool.reduce((a, r) => a + R[r].weight, 0);
    let x = rand() * total;
    for (const r of pool) { x -= R[r].weight; if (x <= 0) return r; }
    return pool[pool.length - 1];
  }

  function drawCard(s, minRarity, forceNew) {
    let rarity = rollRarity(s, minRarity);
    let cars = GL.availableCars(s).filter(c => c.rarity === rarity);
    if (forceNew) {
      let withMissing = cars.filter(c => !GL.isComplete(s, c.id));
      if (!withMissing.length) {
        // probar con cualquier rareza igual o superior que tenga huecos
        const minIdx = GL.RARITY_ORDER.indexOf(minRarity || 'COMMON');
        withMissing = GL.availableCars(s).filter(c => GL.RARITY_ORDER.indexOf(c.rarity) >= minIdx && !GL.isComplete(s, c.id));
      }
      if (withMissing.length) { cars = withMissing; }
    }
    const car = pick(cars);
    rarity = car.rarity;
    const miss = GL.missing(s, car.id);
    let n;
    if (miss.length && (forceNew || rand() < T.newBias)) n = pick(miss);
    else n = 1 + Math.floor(rand() * 10);
    return { carId: car.id, n, rarity };
  }

  GL.slotMins = function (packType) {
    if (packType === 'legendary') return ['COMMON', 'COMMON', 'COMMON', 'EPIC', 'LEGENDARY'];
    if (packType === 'epic') return ['COMMON', 'COMMON', 'COMMON', 'RARE', 'EPIC'];
    return ['COMMON', 'COMMON', 'COMMON', 'COMMON', 'RARE'];
  };

  /* Abre un sobre: devuelve las cartas y los eventos (nuevos coches, completados, subidas de nivel) */
  GL.openPack = function (s, packType) {
    if ((s.packs[packType] || 0) <= 0) return null;
    s.packs[packType]--;
    const mins = GL.slotMins(packType).slice();
    const legendaryPity = s.pity.sinceLegendary >= T.legendaryPity;
    if (legendaryPity) mins[4] = 'LEGENDARY';
    const forceNewLast = s.pity.lastPackNoNew;

    const cards = [], events = [];
    let anyNew = false, gotLegendary = false;
    for (let i = 0; i < T.cardsPerPack; i++) {
      const c = drawCard(s, mins[i], forceNewLast && i === T.cardsPerPack - 1);
      const car = GL.carById[c.carId];
      const wasDiscovered = GL.isDiscovered(s, c.carId);
      const dup = GL.hasPiece(s, c.carId, c.n);
      const foil = c.n === 10;
      c.foil = foil; c.dup = dup;
      if (GL.RARITY_ORDER.indexOf(c.rarity) >= 3) gotLegendary = true;
      if (c.rarity === 'LEGENDARY') s.stats.legendaryPulled++;
      if (c.rarity === 'MYTHIC') s.stats.mythicPulled++;
      s.stats.cards++;
      if (dup) {
        c.scrap = R[c.rarity].scrap * (foil ? T.foilScrapMult : 1);
        s.credits += c.scrap;
        s.stats.dupes++;
        GL.addXp(s, T.dupeXp, events);
        if (GL.isComplete(s, c.carId)) { s.carDupes[c.carId] = (s.carDupes[c.carId] || 0) + 1; GL.checkMedal(s, c.carId, events); }
      } else {
        anyNew = true;
        (s.pieces[c.carId] = s.pieces[c.carId] || []).push(c.n);
        s.pieces[c.carId].sort((a, b) => a - b);
        s.stats.newPieces++;
        c.countAfter = GL.count(s, c.carId);
        if (!wasDiscovered) { c.newCar = true; s.newCars = [c.carId].concat(s.newCars.filter(x => x !== c.carId)).slice(0, 8); }
        GL.addXp(s, R[c.rarity].xp, events);
        if (GL.isComplete(s, c.carId)) GL.completeCar(s, car, events);
      }
      cards.push(c);
    }
    s.pity.sinceLegendary = gotLegendary ? 0 : s.pity.sinceLegendary + 1;
    s.pity.lastPackNoNew = !anyNew;
    s.stats.packsOpened++;
    return { cards, events, legendaryPity };
  };

  GL.completeCar = function (s, car, events) {
    if (s.completedCars.includes(car.id)) return;
    s.completedCars.push(car.id);
    s.stats.carsCompleted++;
    const credits = T.completeCredits[car.rarity];
    s.credits += credits;
    GL.log(s, '🏆', car.brand + ' ' + car.model + ' completado');
    if (events) events.push({ type: 'complete', carId: car.id, credits });
    s.medals[car.id] = Math.max(1, s.medals[car.id] || 0);
    GL.addXp(s, T.completeXp, events);
    GL.checkMedal(s, car.id, events);
    GL.checkBrand(s, car.brand, events);
  };

  /* ---------- Medallas de coche (bronce, plata, oro) ---------- */
  GL.MEDALS = [
    null,
    { tier: 1, icon: '🥉', name: 'Bronce', how: 'Completa los 10 cromos', reward: null },
    { tier: 2, icon: '🥈', name: 'Plata', how: 'Acierta 3 preguntas sobre este coche en el Desafío', need: 3, reward: { credits: 80 } },
    { tier: 3, icon: '🥇', name: 'Oro', how: 'Consigue 5 cromos repetidos de este coche después de completarlo', need: 5, reward: { pack: 'standard', n: 1 } }
  ];
  GL.medalTier = function (s, carId) {
    if (!GL.isComplete(s, carId)) return 0;
    let t = 1;
    if ((s.carQuiz[carId] || 0) >= GL.MEDALS[2].need) {
      t = 2;
      if ((s.carDupes[carId] || 0) >= GL.MEDALS[3].need) t = 3;
    }
    return t;
  };
  GL.checkMedal = function (s, carId, events) {
    const t = GL.medalTier(s, carId), had = s.medals[carId] || 0;
    if (t <= had) return;
    s.medals[carId] = t;
    for (let k = Math.max(2, had + 1); k <= t; k++) {
      const m = GL.MEDALS[k];
      GL.grant(s, m.reward);
      const car = GL.carById[carId];
      GL.log(s, m.icon, 'Medalla de ' + m.name.toLowerCase() + ': ' + car.brand + ' ' + car.model);
      if (events) events.push({ type: 'medal', carId, tier: k, reward: m.reward });
    }
  };
  GL.quizCorrect = function (s, carId, events) {
    s.carQuiz[carId] = (s.carQuiz[carId] || 0) + 1;
    GL.checkMedal(s, carId, events);
  };

  /* ---------- Insignias de marca ---------- */
  GL.BRANDS = [...new Set(GL.CARS.map(c => c.brand))].sort((a, b) => a.localeCompare(b, 'es'));
  GL.brandCars = b => GL.CARS.filter(c => c.brand === b);
  GL.brandReward = function (b) {
    const n = GL.brandCars(b).length;
    return n >= 4 ? { pack: 'legendary', n: 1 } : n >= 2 ? { pack: 'epic', n: 1 } : { credits: 120 };
  };
  GL.checkBrand = function (s, brand, events) {
    if (s.brands.includes(brand)) return;
    if (!GL.brandCars(brand).every(c => GL.isComplete(s, c.id))) return;
    s.brands.push(brand);
    const reward = GL.brandReward(brand);
    GL.grant(s, reward);
    GL.log(s, '🛡️', 'Insignia de marca: ' + brand);
    if (events) events.push({ type: 'brand', brand, reward });
  };

  /* ---------- Rangos de piloto ---------- */
  GL.RANKS = [
    { from: 1, icon: '🔩', name: 'Aprendiz' }, { from: 3, icon: '🔧', name: 'Mecánico' }, { from: 6, icon: '🏎️', name: 'Piloto' },
    { from: 10, icon: '🏁', name: 'Piloto Pro' }, { from: 15, icon: '🏆', name: 'Campeón' }, { from: 20, icon: '👑', name: 'Leyenda' }
  ];
  GL.rank = level => GL.RANKS.filter(r => level >= r.from).pop();

  /* ---------- Taller ---------- */
  GL.craftCost = car => R[car.rarity].craft;
  GL.surpriseCost = rarity => Math.round(R[rarity].craft * T.surpriseFactor / 10) * 10;

  GL.craft = function (s, carId, n) {
    const car = GL.carById[carId];
    if (!car || !GL.isUnlocked(s, car) || GL.hasPiece(s, carId, n)) return null;
    const cost = GL.craftCost(car);
    if (s.credits < cost) return null;
    s.credits -= cost;
    const events = [];
    const wasDiscovered = GL.isDiscovered(s, carId);
    (s.pieces[carId] = s.pieces[carId] || []).push(n);
    s.pieces[carId].sort((a, b) => a - b);
    s.stats.crafted++; s.stats.newPieces++;
    GL.addXp(s, R[car.rarity].xp, events);
    if (GL.isComplete(s, carId)) GL.completeCar(s, car, events);
    return { card: { carId, n, rarity: car.rarity, foil: n === 10, countAfter: GL.count(s, carId), newCar: !wasDiscovered }, events };
  };

  /* Cromo sorpresa: un cromo nuevo al azar de la rareza elegida, más barato que fabricarlo */
  GL.surprise = function (s, rarity) {
    const cost = GL.surpriseCost(rarity);
    const cars = GL.availableCars(s).filter(c => c.rarity === rarity && !GL.isComplete(s, c.id));
    if (!cars.length || s.credits < cost) return null;
    s.credits -= cost;
    const car = pick(cars);
    const n = pick(GL.missing(s, car.id));
    s.credits += GL.craftCost(car); // se compensa porque GL.craft vuelve a cobrar
    const res = GL.craft(s, car.id, n);
    return res;
  };

  GL.buyPack = function (s, packType) {
    const p = GL.PACKS[packType];
    if (s.credits < p.cost) return false;
    s.credits -= p.cost;
    s.packs[packType]++;
    return true;
  };

  /* ---------- Reloj y sobre diario ---------- */
  GL.touchClock = function (s) {
    const now = Date.now();
    if (now > s.clock.maxSeen) s.clock.maxSeen = now;
  };
  GL.clockTampered = s => Date.now() < s.clock.maxSeen - 2 * 3600 * 1000;
  GL.dailyAvailable = s => !GL.clockTampered(s) && s.daily.last !== GL.dayKey();
  GL.streakRewards = function (streak) {
    if (streak > 0 && streak % 30 === 0) return { pack: 'legendary', n: 1 };
    if (streak > 0 && streak % 7 === 0) return { pack: 'epic', n: 1 };
    if (streak === 3) return { credits: 80 };
    return null;
  };
  GL.claimDaily = function (s) {
    if (!GL.dailyAvailable(s)) return null;
    const today = GL.dayKey();
    const yesterday = GL.dayKey(Date.now() - DAY);
    s.daily.streak = (s.daily.last === yesterday) ? s.daily.streak + 1 : 1;
    s.daily.best = Math.max(s.daily.best, s.daily.streak);
    s.daily.last = today;
    s.packs.standard++;
    s.stats.dailyClaims++;
    const bonus = GL.streakRewards(s.daily.streak);
    GL.grant(s, bonus);
    GL.log(s, '🎁', 'Sobre diario (racha ' + s.daily.streak + ')');
    return { streak: s.daily.streak, bonus };
  };

  /* ---------- Misiones diarias ---------- */
  GL.MISSIONS = [
    { id: 'open2',  text: 'Abre 2 sobres',                      metric: 'packsOpened',   target: 2, reward: { credits: 40 },  xp: 20 },
    { id: 'new3',   text: 'Consigue 3 cromos nuevos',            metric: 'newPieces',     target: 3, reward: { credits: 50 },  xp: 25 },
    { id: 'quiz1',  text: 'Juega una partida del Desafío',       metric: 'quizPlayed',    target: 1, reward: { credits: 30 },  xp: 15 },
    { id: 'quiz4',  text: 'Acierta 4 de 5 en el Desafío',        metric: 'quizGood',      target: 1, reward: { credits: 60 },  xp: 25 },
    { id: 'craft1', text: 'Fabrica un cromo en el Taller',       metric: 'crafted',       target: 1, reward: { credits: 30 },  xp: 15 },
    { id: 'task1',  text: 'Consigue que te aprueben una tarea',  metric: 'tasksApproved', target: 1, reward: { credits: 60 },  xp: 30 },
    { id: 'view1',  text: 'Mira la ficha de un coche completo',  metric: 'viewedCars',    target: 1, reward: { credits: 20 },  xp: 10 }
  ];
  GL.ensureMissions = function (s) {
    const today = GL.dayKey();
    if (s.missions.day === today) return;
    const seed = hashStr(today + (s.created || 0));
    const pool = GL.MISSIONS.map(m => m.id);
    const ids = ['task1'];      // siempre hay una de estudio
    let k = seed;
    while (ids.length < 3) { k = Math.imul(k ^ (k >>> 13), 2654435761) >>> 0; const id = pool[k % pool.length]; if (!ids.includes(id)) ids.push(id); }
    s.missions = { day: today, ids, base: Object.assign({}, s.stats), claimed: [] };
  };
  GL.missionProgress = function (s, id) {
    const m = GL.MISSIONS.find(x => x.id === id);
    const p = Math.min(m.target, (s.stats[m.metric] || 0) - (s.missions.base[m.metric] || 0));
    return { m, p, done: p >= m.target, claimed: s.missions.claimed.includes(id) };
  };
  GL.claimMission = function (s, id) {
    const st = GL.missionProgress(s, id);
    if (!st.done || st.claimed) return null;
    s.missions.claimed.push(id);
    GL.grant(s, st.m.reward);
    const events = [];
    GL.addXp(s, st.m.xp, events);
    return { reward: st.m.reward, events };
  };

  /* ---------- Objetivo semanal de estudio ---------- */
  GL.WEEKLY = [
    { id: 'w3',  target: 3,  reward: { pack: 'standard', n: 1 } },
    { id: 'w6',  target: 6,  reward: { pack: 'epic', n: 1 } },
    { id: 'w10', target: 10, reward: { pack: 'legendary', n: 1 } }
  ];
  GL.ensureWeek = function (s) {
    const wk = GL.weekKey();
    if (s.weekly.week !== wk) s.weekly = { week: wk, tasks: 0, claimed: [] };
  };
  GL.claimWeekly = function (s, id) {
    GL.ensureWeek(s);
    const w = GL.WEEKLY.find(x => x.id === id);
    if (!w || s.weekly.tasks < w.target || s.weekly.claimed.includes(id)) return null;
    s.weekly.claimed.push(id);
    GL.grant(s, w.reward);
    GL.log(s, '📅', 'Objetivo semanal: ' + w.target + ' tareas');
    return w.reward;
  };

  /* ---------- Tareas (aprobadas por el padre/madre) ---------- */
  GL.approveTask = function (s, task, viaCode) {
    GL.ensureWeek(s);
    GL.grant(s, task.reward);
    s.stats.tasksApproved++;
    s.weekly.tasks++;
    const events = [];
    GL.addXp(s, task.xp || 20, events);
    GL.log(s, task.emoji || '✅', task.name + (viaCode ? ' (código)' : '') + ' → ' + GL.rewardText(task.reward));
    return events;
  };

  /* ---------- Logros ---------- */
  const countBy = (s, fn) => GL.CARS.filter(c => fn(c) && GL.isComplete(s, c.id)).length;
  const brandDone = (s, brand) => GL.CARS.filter(c => c.brand === brand).every(c => GL.isComplete(s, c.id));
  GL.ACHIEVEMENTS = [
    { id: 'first',     icon: '🃏', name: 'Primer cromo',         desc: 'Consigue tu primer cromo',               test: s => s.stats.newPieces >= 1,          reward: { credits: 50 } },
    { id: 'car1',      icon: '🚗', name: 'Primer coche',          desc: 'Completa tu primer coche',               test: s => s.completedCars.length >= 1,     reward: { pack: 'standard', n: 1 } },
    { id: 'car5',      icon: '🏎️', name: 'Garaje en marcha',      desc: 'Completa 5 coches',                      test: s => s.completedCars.length >= 5,     reward: { pack: 'epic', n: 1 } },
    { id: 'car15',     icon: '🏁', name: 'Coleccionista',         desc: 'Completa 15 coches',                     test: s => s.completedCars.length >= 15,    reward: { pack: 'epic', n: 2 } },
    { id: 'car30',     icon: '💎', name: 'Gran colección',        desc: 'Completa 30 coches',                     test: s => s.completedCars.length >= 30,    reward: { pack: 'legendary', n: 1 } },
    { id: 'carAll',    icon: '👑', name: 'Leyenda del Garaje',    desc: 'Completa TODOS los coches',              test: s => s.completedCars.length >= GL.CARS.length, reward: { pack: 'legendary', n: 3 } },
    { id: 'legend1',   icon: '🌟', name: '¡Legendaria!',          desc: 'Consigue un cromo Legendario',           test: s => s.stats.legendaryPulled >= 1,    reward: { credits: 100 } },
    { id: 'mythic1',   icon: '🔥', name: 'Mito vivo',             desc: 'Consigue un cromo Mítico',               test: s => s.stats.mythicPulled >= 1,       reward: { credits: 200 } },
    { id: 'german',    icon: '🇩🇪', name: 'Ingeniería alemana',   desc: 'Completa 5 coches alemanes',             test: s => countBy(s, c => c.country === 'DE') >= 5, reward: { pack: 'epic', n: 1 } },
    { id: 'italian',   icon: '🇮🇹', name: 'Pasión italiana',      desc: 'Completa 5 coches italianos',            test: s => countBy(s, c => c.country === 'IT') >= 5, reward: { pack: 'epic', n: 1 } },
    { id: 'japan',     icon: '🇯🇵', name: 'Espíritu JDM',         desc: 'Completa 4 coches japoneses',            test: s => countBy(s, c => c.country === 'JP') >= 4, reward: { pack: 'standard', n: 2 } },
    { id: 'v12',       icon: '🎻', name: 'Club V12',              desc: 'Completa 3 coches con motor V12',        test: s => countBy(s, c => c.tags.includes('v12')) >= 3, reward: { pack: 'epic', n: 1 } },
    { id: 'hp1000',    icon: '💥', name: 'Club de los 1.000 CV',  desc: 'Completa 3 coches de 1.000 CV o más',    test: s => countBy(s, c => c.hp >= 1000) >= 3, reward: { pack: 'legendary', n: 1 } },
    { id: 'volt',      icon: '🔋', name: 'Voltaje',               desc: 'Completa 3 eléctricos o híbridos',       test: s => countBy(s, c => c.tags.includes('electric') || c.tags.includes('hybrid')) >= 3, reward: { pack: 'epic', n: 1 } },
    { id: 'classic',   icon: '🕰️', name: 'Clásico eterno',        desc: 'Completa un clásico mítico',             test: s => countBy(s, c => c.tags.includes('classic')) >= 1, reward: { pack: 'epic', n: 1 } },
    { id: 'streak7',   icon: '📆', name: 'Constancia',            desc: 'Racha de 7 días seguidos',               test: s => s.daily.best >= 7,  reward: { credits: 150 } },
    { id: 'streak30',  icon: '🗓️', name: 'Imparable',             desc: 'Racha de 30 días seguidos',              test: s => s.daily.best >= 30, reward: { pack: 'legendary', n: 1 } },
    { id: 'study10',   icon: '📚', name: 'Buen estudiante',       desc: '10 tareas aprobadas',                    test: s => s.stats.tasksApproved >= 10, reward: { pack: 'epic', n: 1 } },
    { id: 'study50',   icon: '🎓', name: 'Matrícula de honor',    desc: '50 tareas aprobadas',                    test: s => s.stats.tasksApproved >= 50, reward: { pack: 'legendary', n: 1 } },
    { id: 'quizPro',   icon: '🧩', name: 'Experto en motor',      desc: 'Haz un pleno (5/5) en el Desafío',       test: s => s.stats.quizPerfect >= 1, reward: { credits: 100 } },
    { id: 'quiz25',    icon: '🎯', name: 'Enciclopedia andante',  desc: 'Juega 25 partidas del Desafío',          test: s => s.stats.quizPlayed >= 25, reward: { pack: 'epic', n: 1 } },
    { id: 'craft10',   icon: '🛠️', name: 'Mecánico',              desc: 'Fabrica 10 cromos en el Taller',         test: s => s.stats.crafted >= 10, reward: { credits: 150 } },
    { id: 'packs50',   icon: '📦', name: 'Abre-sobres',           desc: 'Abre 50 sobres',                         test: s => s.stats.packsOpened >= 50, reward: { pack: 'epic', n: 1 } },
    { id: 'level10',   icon: '🚀', name: 'Nivel 10',              desc: 'Llega al nivel 10 de garaje',            test: s => s.level >= 10, reward: { pack: 'epic', n: 1 } },
    { id: 'level20',   icon: '🛸', name: 'Nivel 20',              desc: 'Llega al nivel 20 de garaje',            test: s => s.level >= 20, reward: { pack: 'legendary', n: 1 } }
  ];
  GL.achievementState = function (s) {
    return GL.ACHIEVEMENTS.map(a => ({ a, done: !!a.test(s), claimed: s.achievements.includes(a.id) }));
  };
  GL.claimAchievement = function (s, id) {
    const a = GL.ACHIEVEMENTS.find(x => x.id === id);
    if (!a || s.achievements.includes(id) || !a.test(s)) return null;
    s.achievements.push(id);
    GL.grant(s, a.reward);
    GL.log(s, a.icon, 'Logro: ' + a.name);
    return a.reward;
  };
  GL.pendingAchievements = s => GL.ACHIEVEMENTS.filter(a => !s.achievements.includes(a.id) && a.test(s)).length;

  /* ---------- Desafío (quiz) ---------- */
  GL.QUIZ_STATS = [
    { key: 'hp',     q: '¿Cuál tiene MÁS potencia?',              better: 'max', fmt: c => GL.fmt.hp(c) },
    { key: 'accel',  q: '¿Cuál acelera ANTES de 0 a 100 km/h?',  better: 'min', fmt: c => GL.fmt.accel(c) },
    { key: 'top',    q: '¿Cuál tiene MAYOR velocidad máxima?',    better: 'max', fmt: c => GL.fmt.top(c) },
    { key: 'weight', q: '¿Cuál pesa MENOS?',                      better: 'min', fmt: c => GL.fmt.weight(c) },
    { key: 'year',   q: '¿Cuál es MÁS antiguo?',                  better: 'min', fmt: c => String(c.year) }
  ];
  GL.quizAvailable = function (s) { if (s.quiz.day !== GL.dayKey()) { s.quiz = { day: GL.dayKey(), plays: 0 }; } return T.quizPerDay - s.quiz.plays; };
  GL.makeQuiz = function () {
    const qs = [];
    let guard = 0;
    while (qs.length < 5 && guard++ < 200) {
      if (qs.length % 2 === 1 && rand() < 0.6) {
        // ¿Qué coche es? (foto recortada)
        const car = pick(GL.CARS);
        const others = GL.CARS.filter(c => c.id !== car.id && c.brand !== car.brand);
        const opts = [car];
        while (opts.length < 4) { const o = pick(others); if (!opts.includes(o)) opts.push(o); }
        opts.sort(() => rand() - 0.5);
        qs.push({ type: 'guess', carId: car.id, options: opts.map(o => o.id), answer: car.id, region: pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) });
      } else {
        const st = pick(GL.QUIZ_STATS);
        const a = pick(GL.CARS), b = pick(GL.CARS);
        if (a.id === b.id || a[st.key] === b[st.key]) continue;
        if ((a.approx || []).includes(st.key) || (b.approx || []).includes(st.key)) continue;
        const ans = (st.better === 'max' ? (a[st.key] > b[st.key]) : (a[st.key] < b[st.key])) ? a.id : b.id;
        qs.push({ type: 'duel', stat: st.key, q: st.q, options: [a.id, b.id], answer: ans });
      }
    }
    return qs;
  };
  GL.startQuiz = function (s) {
    if (GL.quizAvailable(s) <= 0) return null;
    s.quiz.plays++;            // se cuenta al empezar: salir a mitad no da otra oportunidad
    return GL.makeQuiz();
  };
  GL.finishQuiz = function (s, hits) {
    s.stats.quizPlayed++;
    if (hits >= 4) s.stats.quizGood++;
    if (hits >= 5) s.stats.quizPerfect++;
    const credits = hits * T.quizCreditPerHit + (hits >= 5 ? T.quizPerfectBonus : 0);
    s.credits += credits;
    const events = [];
    GL.addXp(s, hits * 5, events);
    return { credits, events };
  };

  /* ---------- Formatos ---------- */
  const nf = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const ap = (c, k) => ((c.approx || []).includes(k) ? '≈ ' : '');
  GL.fmt = {
    hp: c => nf(c.hp) + ' CV',
    accel: c => ap(c, 'accel') + String(c.accel).replace('.', ',') + ' s',
    top: c => ap(c, 'top') + nf(c.top) + ' km/h' + (c.id === 'koenigsegg-jesko' ? ' (teórica)' : ''),
    weight: c => '≈ ' + nf(c.weight) + ' kg',
    year: c => String(c.year)
  };
  GL.pieceValue = function (car, n) {
    const k = GL.PIECES[n - 1].key;
    const ctry = GL.COUNTRIES[car.country];
    switch (k) {
      case 'origin': return ctry.flag + ' ' + car.brand + ' · ' + ctry.name;
      case 'year': return String(car.year);
      case 'engine': return car.engine;
      case 'hp': return GL.fmt.hp(car);
      case 'accel': return GL.fmt.accel(car);
      case 'top': return GL.fmt.top(car);
      case 'weight': return GL.fmt.weight(car);
      case 'drive': return car.drive;
      case 'production': return car.production;
      case 'fact': return car.fact;
    }
    return '';
  };

  /* ---------- Saneado al importar ---------- */
  GL.sanitize = function (raw) {
    const s = GL.newState();
    if (!raw || typeof raw !== 'object') return null;
    const num = (v, d, max) => { v = Number(v); return Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max || 1e9) : d; };
    if (raw.pieces && typeof raw.pieces === 'object') {
      for (const id in raw.pieces) {
        if (!GL.carById[id] || !Array.isArray(raw.pieces[id])) continue;
        const arr = [...new Set(raw.pieces[id].map(Number).filter(n => n >= 1 && n <= 10 && Number.isInteger(n)))].sort((a, b) => a - b);
        if (arr.length) s.pieces[id] = arr;
      }
    }
    s.created = num(raw.created, Date.now());
    s.credits = num(raw.credits, s.credits, 100000);
    if (raw.packs) ['standard', 'epic', 'legendary'].forEach(p => { s.packs[p] = num(raw.packs[p], 0, 500); });
    s.level = Math.max(1, num(raw.level, 1, 200));
    s.xp = num(raw.xp, 0, 100000);
    for (const k in s.stats) s.stats[k] = num(raw.stats && raw.stats[k], 0);
    if (raw.daily) { s.daily.last = typeof raw.daily.last === 'string' ? raw.daily.last.slice(0, 10) : null; s.daily.streak = num(raw.daily.streak, 0, 10000); s.daily.best = num(raw.daily.best, 0, 10000); }
    if (raw.pity) { s.pity.sinceLegendary = num(raw.pity.sinceLegendary, 0, 100); s.pity.lastPackNoNew = !!raw.pity.lastPackNoNew; }
    const idList = (arr, valid) => Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && valid(x)) : [];
    s.achievements = idList(raw.achievements, x => GL.ACHIEVEMENTS.some(a => a.id === x));
    s.completedCars = idList(raw.completedCars, x => !!GL.carById[x] && GL.isComplete(s, x));
    s.redeemed = idList(raw.redeemed, x => x.length < 40).slice(0, 500);
    if (Array.isArray(raw.history)) s.history = raw.history.slice(0, 150).filter(h => h && typeof h.text === 'string').map(h => ({ ts: num(h.ts, 0), icon: String(h.icon || '•').slice(0, 4), text: h.text.slice(0, 160) }));
    if (raw.clock) s.clock.maxSeen = Math.max(num(raw.clock.maxSeen, 0), s.clock.maxSeen);
    if (raw.weekly && typeof raw.weekly.week === 'string') { s.weekly.week = raw.weekly.week.slice(0, 10); s.weekly.tasks = num(raw.weekly.tasks, 0, 1000); s.weekly.claimed = idList(raw.weekly.claimed, x => GL.WEEKLY.some(w => w.id === x)); }
    if (raw.settings) { ['sound', 'haptics', 'easyRead', 'voice'].forEach(k => { s.settings[k] = raw.settings[k] !== false; }); }
    const numMap = (o, max) => { const r = {}; if (o && typeof o === 'object') for (const id in o) if (GL.carById[id]) r[id] = num(o[id], 0, max); return r; };
    s.carQuiz = numMap(raw.carQuiz, 10000); s.carDupes = numMap(raw.carDupes, 10000); s.medals = numMap(raw.medals, 3);
    s.brands = idList(raw.brands, x => GL.BRANDS.includes(x));
    s.favorite = (typeof raw.favorite === 'string' && GL.carById[raw.favorite]) ? raw.favorite : null;
    s.tutorialDone = !!raw.tutorialDone;
    if (raw.tips && typeof raw.tips === 'object') for (const k in raw.tips) if (k.length < 30) s.tips[k] = true;
    return s;
  };

  /* Migración desde la versión 1 (garage_legends_supercars_v2) */
  GL.migrateV1 = function (old) {
    const s = GL.newState();
    if (!old || !old.ownedPieces) return null;
    for (const id in old.ownedPieces) {
      if (GL.carById[id] && Array.isArray(old.ownedPieces[id])) {
        const arr = [...new Set(old.ownedPieces[id].filter(n => n >= 1 && n <= 10))].sort((a, b) => a - b);
        if (arr.length) s.pieces[id] = arr;
      }
    }
    s.credits = Math.min(5000, Math.round((Number(old.scrapCredits) || 0) * 0.8) + T.welcomeCredits);
    if (old.packs) ['standard', 'epic', 'legendary'].forEach(p => { s.packs[p] = Math.min(50, (Number(old.packs[p]) || 0)) + (p === 'standard' ? 1 : 0); });
    s.completedCars = GL.CARS.filter(c => GL.isComplete(s, c.id)).map(c => c.id);
    s.stats.newPieces = Object.values(s.pieces).reduce((a, b) => a + b.length, 0);
    s.stats.carsCompleted = s.completedCars.length;
    // XP equivalente por lo ya conseguido
    let xp = 0;
    for (const id in s.pieces) xp += s.pieces[id].length * R[GL.carById[id].rarity].xp;
    xp += s.completedCars.length * T.completeXp;
    GL.addXp(s, xp, null);
    GL.log(s, '🔄', 'Álbum migrado desde la versión 1');
    return s;
  };

  if (typeof module !== 'undefined') module.exports = GL;
})(window.GL);
