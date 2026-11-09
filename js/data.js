/* Garage Legends 2.0 — Catálogo
   Datos de fábrica aproximados (versión indicada en el modelo). Los valores marcados con "≈"
   son estimaciones o cifras no oficiales. Revisa y amplía aquí: cada coche = 10 cromos. */
window.GL = window.GL || {};

GL.VERSION = '2.3.0';
GL.REPO = 'https://github.com/rkarillo-tech/juego-coches';

GL.RARITIES = {
  COMMON:    { id: 'COMMON',    label: 'Común',      short: 'C', color: '#9aa7b8', weight: 0.58,  scrap: 10,  craft: 60,   xp: 5 },
  RARE:      { id: 'RARE',      label: 'Rara',       short: 'R', color: '#38bdf8', weight: 0.28,  scrap: 25,  craft: 150,  xp: 10 },
  EPIC:      { id: 'EPIC',      label: 'Épica',      short: 'E', color: '#b26bff', weight: 0.105, scrap: 60,  craft: 350,  xp: 20 },
  LEGENDARY: { id: 'LEGENDARY', label: 'Legendaria', short: 'L', color: '#fbbf24', weight: 0.03,  scrap: 150, craft: 800,  xp: 40 },
  MYTHIC:    { id: 'MYTHIC',    label: 'Mítica',     short: 'M', color: '#ff4d6d', weight: 0.005, scrap: 300, craft: 1600, xp: 80 }
};
GL.RARITY_ORDER = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];

/* Los 10 cromos de cada coche: cada uno revela un dato distinto */
GL.PIECES = [
  { n: 1,  key: 'origin',     label: 'Marca y país',      icon: '🏁' },
  { n: 2,  key: 'year',       label: 'Año',               icon: '📅' },
  { n: 3,  key: 'engine',     label: 'Motor',             icon: '🔧' },
  { n: 4,  key: 'hp',         label: 'Potencia',          icon: '⚡' },
  { n: 5,  key: 'accel',      label: '0-100 km/h',        icon: '⏱️' },
  { n: 6,  key: 'top',        label: 'Velocidad máxima',  icon: '🚀' },
  { n: 7,  key: 'weight',     label: 'Peso',              icon: '⚖️' },
  { n: 8,  key: 'drive',      label: 'Tracción y cambio', icon: '⚙️' },
  { n: 9,  key: 'production', label: 'Producción',        icon: '🏭' },
  { n: 10, key: 'fact',       label: 'Curiosidad',        icon: '⭐', foil: true }
];

GL.COUNTRIES = {
  DE: { name: 'Alemania', flag: '🇩🇪' }, IT: { name: 'Italia', flag: '🇮🇹' }, JP: { name: 'Japón', flag: '🇯🇵' },
  GB: { name: 'Reino Unido', flag: '🇬🇧' }, US: { name: 'Estados Unidos', flag: '🇺🇸' }, FR: { name: 'Francia', flag: '🇫🇷' },
  ES: { name: 'España', flag: '🇪🇸' }, KR: { name: 'Corea del Sur', flag: '🇰🇷' }, SE: { name: 'Suecia', flag: '🇸🇪' },
  HR: { name: 'Croacia', flag: '🇭🇷' }
};

/* tags: v8 v10 v12 w16 turbo4 electric hybrid classic manual */
GL.CARS = [
  /* ======================= COMUNES ======================= */
  { id: 'vw-golf-gti', brand: 'Volkswagen', model: 'Golf GTI (Mk8)', country: 'DE', rarity: 'COMMON', year: 2020,
    engine: '2.0 TSI 4 cilindros turbo', hp: 245, accel: 6.3, top: 250, weight: 1460, drive: 'Delantera · DSG 7', production: 'Serie',
    fact: 'El primer GTI es de 1976. Su pomo de cambio con forma de bola de golf y los asientos de cuadros son guiños a aquel modelo.', tags: ['turbo4'] },
  { id: 'toyota-gr86', brand: 'Toyota', model: 'GR86', country: 'JP', rarity: 'COMMON', year: 2021,
    engine: '2.4 bóxer 4 cilindros atmosférico', hp: 234, accel: 6.3, top: 226, weight: 1275, drive: 'Trasera · Manual 6', production: 'Serie',
    fact: 'Se desarrolló junto a Subaru: su "gemelo" es el Subaru BRZ. Por eso lleva un motor bóxer, típico de Subaru.', tags: ['manual'] },
  { id: 'mazda-mx5', brand: 'Mazda', model: 'MX-5 (ND) 2.0', country: 'JP', rarity: 'COMMON', year: 2015,
    engine: '2.0 4 cilindros atmosférico', hp: 184, accel: 6.5, top: 219, weight: 1100, drive: 'Trasera · Manual 6', production: 'Serie',
    fact: 'Tiene el récord Guinness del descapotable biplaza más vendido de la historia: más de un millón de unidades.', tags: ['manual'] },
  { id: 'hyundai-i30n', brand: 'Hyundai', model: 'i30 N Performance', country: 'KR', rarity: 'COMMON', year: 2017,
    engine: '2.0 T-GDi 4 cilindros turbo', hp: 280, accel: 5.9, top: 250, weight: 1480, drive: 'Delantera · Manual 6 / DCT 8', production: 'Serie',
    fact: 'La "N" viene de Namyang (su centro de desarrollo en Corea) y de Nürburgring, donde se puso a punto.', tags: ['turbo4'] },
  { id: 'honda-civic-typer', brand: 'Honda', model: 'Civic Type R (FL5)', country: 'JP', rarity: 'COMMON', year: 2022,
    engine: '2.0 VTEC Turbo 4 cilindros', hp: 329, accel: 5.4, top: 275, weight: 1430, drive: 'Delantera · Manual 6', production: 'Serie',
    fact: 'Ha batido récords de vuelta para coches de tracción delantera en circuitos como Suzuka y Nürburgring.', tags: ['turbo4', 'manual'] },
  { id: 'bmw-m2', brand: 'BMW', model: 'M2 (G87)', country: 'DE', rarity: 'COMMON', year: 2023,
    engine: '3.0 6 en línea biturbo', hp: 460, accel: 4.1, top: 250, weight: 1725, drive: 'Trasera · Manual 6 / Auto 8', production: 'Serie',
    fact: 'Se fabrica en la planta de BMW en San Luis Potosí (México). Con el paquete M Driver llega a 285 km/h.', tags: [] },
  { id: 'amg-a45s', brand: 'Mercedes-AMG', model: 'A 45 S 4MATIC+', country: 'DE', rarity: 'COMMON', year: 2019,
    engine: '2.0 4 cilindros turbo (M139)', hp: 421, accel: 3.9, top: 270, weight: 1635, drive: 'Total · DCT 8', production: 'Serie',
    fact: 'Su motor es el 4 cilindros de serie más potente del mundo. Lo monta a mano un solo mecánico, que firma una placa en el motor.', tags: ['turbo4'] },
  { id: 'audi-rs3', brand: 'Audi', model: 'RS 3 Sportback (8Y)', country: 'DE', rarity: 'COMMON', year: 2021,
    engine: '2.5 TFSI 5 cilindros turbo', hp: 400, accel: 3.8, top: 250, weight: 1570, drive: 'Total quattro · S tronic 7', production: 'Serie',
    fact: 'Su motor de 5 cilindros suena distinto a todos: se encienden en orden 1-2-4-5-3. Tiene incluso un modo derrape.', tags: [] },
  { id: 'ford-mustang-gt', brand: 'Ford', model: 'Mustang GT (S650)', country: 'US', rarity: 'COMMON', year: 2024,
    engine: '5.0 V8 atmosférico "Coyote"', hp: 446, accel: 4.9, top: 250, weight: 1800, drive: 'Trasera · Manual 6 / Auto 10', production: 'Serie',
    fact: 'El Mustang original de 1964 creó una categoría nueva: los "pony cars", deportivos americanos asequibles.', tags: ['v8', 'manual'] },
  { id: 'toyota-gr-yaris', brand: 'Toyota', model: 'GR Yaris', country: 'JP', rarity: 'COMMON', year: 2020,
    engine: '1.6 3 cilindros turbo', hp: 261, accel: 5.5, top: 230, weight: 1280, drive: 'Total GR-Four · Manual 6', production: 'Serie',
    fact: 'Nació para poder correr en el Mundial de Rallies (WRC): las normas obligan a vender versiones de calle.', tags: ['manual'] },
  { id: 'cupra-formentor-vz5', brand: 'Cupra', model: 'Formentor VZ5', country: 'ES', rarity: 'COMMON', year: 2021,
    engine: '2.5 TFSI 5 cilindros turbo', hp: 390, accel: 4.2, top: 250, weight: 1700, drive: 'Total · DSG 7', production: '≈ 7.000 unidades',
    fact: 'Diseñado en Martorell (Barcelona). Es el Cupra más potente con motor de gasolina, con el 5 cilindros de Audi.', tags: [] },
  { id: 'alpine-a110', brand: 'Alpine', model: 'A110', country: 'FR', rarity: 'COMMON', year: 2017,
    engine: '1.8 4 cilindros turbo', hp: 252, accel: 4.5, top: 250, weight: 1100, drive: 'Trasera · DCT 7', production: 'Serie',
    fact: 'Hereda el nombre del A110 de 1973, que ganó el primer Mundial de Rallies de marcas. Chasis y carrocería son de aluminio.', tags: ['turbo4'] },

  /* ======================= RARAS ======================= */
  { id: 'bmw-m3', brand: 'BMW', model: 'M3 Competition (G80)', country: 'DE', rarity: 'RARE', year: 2021,
    engine: '3.0 6 en línea biturbo (S58)', hp: 510, accel: 3.9, top: 250, weight: 1730, drive: 'Trasera (xDrive opcional) · Auto 8', production: 'Serie',
    fact: 'El primer M3 (E30, 1986) se creó para ganar carreras de turismos como el DTM alemán.', tags: [] },
  { id: 'amg-c63', brand: 'Mercedes-AMG', model: 'C 63 S E Performance', country: 'DE', rarity: 'RARE', year: 2023,
    engine: '2.0 4 cil. turbo + motor eléctrico', hp: 680, accel: 3.4, top: 280, weight: 2110, drive: 'Total · MCT 9', production: 'Serie',
    fact: 'Usa un turbo eléctrico, una tecnología que viene directamente de la Fórmula 1.', tags: ['hybrid', 'turbo4'] },
  { id: 'audi-r8', brand: 'Audi', model: 'R8 V10 performance', country: 'DE', rarity: 'RARE', year: 2019,
    engine: '5.2 V10 atmosférico', hp: 620, accel: 3.1, top: 331, weight: 1595, drive: 'Total quattro · S tronic 7', production: 'Serie (fin en 2024)',
    fact: 'Comparte el motor V10 con el Lamborghini Huracán. Fue el coche de Tony Stark en las películas de Iron Man.', tags: ['v10'] },
  { id: 'porsche-911-carrera', brand: 'Porsche', model: '911 Carrera S (992)', country: 'DE', rarity: 'RARE', year: 2019,
    engine: '3.0 bóxer 6 cilindros biturbo', hp: 450, accel: 3.5, top: 308, weight: 1515, drive: 'Trasera · PDK 8', production: 'Serie',
    fact: 'Desde 1963 el 911 lleva el motor detrás del eje trasero, algo que casi ningún otro deportivo hace.', tags: [] },
  { id: 'porsche-taycan', brand: 'Porsche', model: 'Taycan Turbo S', country: 'DE', rarity: 'RARE', year: 2019,
    engine: '2 motores eléctricos', hp: 761, accel: 2.8, top: 260, weight: 2295, drive: 'Total · 2 velocidades', production: 'Serie',
    fact: 'Fue de los primeros eléctricos con sistema de 800 voltios (carga más rápido) y tiene una caja de 2 marchas.', tags: ['electric'] },
  { id: 'nissan-gtr', brand: 'Nissan', model: 'GT-R (R35)', country: 'JP', rarity: 'RARE', year: 2007,
    engine: '3.8 V6 biturbo (VR38DETT)', hp: 570, accel: 2.8, top: 315, weight: 1750, drive: 'Total · DCT 6', production: 'Serie (2007-2025)',
    fact: 'Cada motor lo monta a mano un único maestro artesano "Takumi", que pone su nombre en una placa.', tags: [], approx: ['accel'] },
  { id: 'toyota-supra', brand: 'Toyota', model: 'GR Supra 3.0 (A90)', country: 'JP', rarity: 'RARE', year: 2019,
    engine: '3.0 6 en línea turbo (BMW)', hp: 340, accel: 4.3, top: 250, weight: 1540, drive: 'Trasera · Auto 8 / Manual 6', production: 'Serie',
    fact: 'Se desarrolló junto a BMW: comparte motor y plataforma con el BMW Z4.', tags: [] },
  { id: 'corvette-c8', brand: 'Chevrolet', model: 'Corvette Stingray (C8)', country: 'US', rarity: 'RARE', year: 2020,
    engine: '6.2 V8 atmosférico (LT2)', hp: 482, accel: 3.5, top: 296, weight: 1655, drive: 'Trasera · DCT 8', production: 'Serie',
    fact: 'Es el primer Corvette de serie con motor central, después de casi 70 años con el motor delante.', tags: ['v8'] },
  { id: 'audi-rs6', brand: 'Audi', model: 'RS 6 Avant (C8)', country: 'DE', rarity: 'RARE', year: 2019,
    engine: '4.0 V8 biturbo (híbrido ligero)', hp: 600, accel: 3.6, top: 250, weight: 2075, drive: 'Total quattro · Auto 8', production: 'Serie',
    fact: 'Es un coche familiar con maletero enorme... ¡y acelera como muchos superdeportivos! Puede llegar a 305 km/h.', tags: ['v8'] },
  { id: 'tesla-model-s-plaid', brand: 'Tesla', model: 'Model S Plaid', country: 'US', rarity: 'RARE', year: 2021,
    engine: '3 motores eléctricos', hp: 1020, accel: 2.1, top: 262, weight: 2160, drive: 'Total · 1 velocidad', production: 'Serie',
    fact: 'Es una berlina de 5 plazas y más de 1.000 CV. Con un paquete opcional alcanza los 322 km/h.', tags: ['electric'] },
  { id: 'amg-gt-r', brand: 'Mercedes-AMG', model: 'GT R', country: 'DE', rarity: 'RARE', year: 2017,
    engine: '4.0 V8 biturbo', hp: 585, accel: 3.6, top: 318, weight: 1630, drive: 'Trasera · DCT 7', production: 'Serie (2017-2021)',
    fact: 'Le apodaron "la bestia del Infierno Verde" (Nürburgring). Sus turbos van dentro de la "V" del motor.', tags: ['v8'] },
  { id: 'aston-vantage', brand: 'Aston Martin', model: 'Vantage', country: 'GB', rarity: 'RARE', year: 2024,
    engine: '4.0 V8 biturbo', hp: 665, accel: 3.5, top: 325, weight: 1605, drive: 'Trasera · Auto 8', production: 'Serie',
    fact: 'Aston Martin es la marca de James Bond: un Vantage V8 fue su coche en "007: Alta tensión" (1987).', tags: ['v8'] },

  /* ======================= ÉPICAS ======================= */
  { id: 'lambo-huracan', brand: 'Lamborghini', model: 'Huracán Performante', country: 'IT', rarity: 'EPIC', year: 2017,
    engine: '5.2 V10 atmosférico', hp: 640, accel: 2.9, top: 325, weight: 1382, drive: 'Total · DCT 7', production: '≈ 1.400 unidades',
    fact: 'Su aerodinámica activa "ALA" abre y cierra trampillas para pegarse al suelo. Batió el récord de Nürburgring en 2016.', tags: ['v10'] },
  { id: 'ferrari-458', brand: 'Ferrari', model: '458 Italia', country: 'IT', rarity: 'EPIC', year: 2009,
    engine: '4.5 V8 atmosférico (9.000 rpm)', hp: 570, accel: 3.4, top: 325, weight: 1485, drive: 'Trasera · DCT 7', production: 'Serie (2009-2015)',
    fact: 'Michael Schumacher ayudó a desarrollarlo. No tiene palancas: ¡los intermitentes son botones en el volante!', tags: ['v8'] },
  { id: 'ferrari-f8', brand: 'Ferrari', model: 'F8 Tributo', country: 'IT', rarity: 'EPIC', year: 2019,
    engine: '3.9 V8 biturbo', hp: 720, accel: 2.9, top: 340, weight: 1435, drive: 'Trasera · DCT 7', production: 'Serie (2019-2023)',
    fact: 'Su nombre es un "tributo" a su motor V8, elegido "Motor del Año" en el mundo varios años seguidos.', tags: ['v8'] },
  { id: 'mclaren-720s', brand: 'McLaren', model: '720S', country: 'GB', rarity: 'EPIC', year: 2017,
    engine: '4.0 V8 biturbo', hp: 720, accel: 2.9, top: 341, weight: 1419, drive: 'Trasera · SSG 7', production: 'Serie (2017-2023)',
    fact: 'Su chasis "Monocage II" es una pieza de fibra de carbono. Los faros, con forma de cuenca, esconden tomas de aire.', tags: ['v8'] },
  { id: 'porsche-gt3rs', brand: 'Porsche', model: '911 GT3 RS (992)', country: 'DE', rarity: 'EPIC', year: 2022,
    engine: '4.0 bóxer 6 atmosférico', hp: 525, accel: 3.2, top: 296, weight: 1450, drive: 'Trasera · PDK 7', production: 'Serie',
    fact: 'Genera 860 kg de carga aerodinámica a 285 km/h y tiene DRS en el alerón, como un Fórmula 1.', tags: [] },
  { id: 'amg-gt-black', brand: 'Mercedes-AMG', model: 'GT Black Series', country: 'DE', rarity: 'EPIC', year: 2020,
    engine: '4.0 V8 biturbo (cigüeñal plano)', hp: 730, accel: 3.2, top: 325, weight: 1540, drive: 'Trasera · DCT 7', production: 'Serie limitada',
    fact: 'En 2020 batió el récord de Nürburgring para coches de producción con 6:43.6.', tags: ['v8'] },
  { id: 'bmw-m4-csl', brand: 'BMW', model: 'M4 CSL', country: 'DE', rarity: 'EPIC', year: 2022,
    engine: '3.0 6 en línea biturbo', hp: 550, accel: 3.7, top: 307, weight: 1625, drive: 'Trasera · Auto 8', production: '1.000 unidades',
    fact: 'Pesa unos 100 kg menos que un M4 normal: no lleva asientos traseros. CSL = Competición, Sport, Ligero.', tags: [] },
  { id: 'ford-gt', brand: 'Ford', model: 'GT (2017)', country: 'US', rarity: 'EPIC', year: 2017,
    engine: '3.5 V6 EcoBoost biturbo', hp: 656, accel: 3.0, top: 348, weight: 1385, drive: 'Trasera · DCT 7', production: '≈ 1.350 unidades',
    fact: 'Homenaje al GT40 que ganó Le Mans en 1966. Su versión de carreras volvió a ganar en Le Mans en 2016, ¡50 años después!', tags: [] },
  { id: 'lambo-murcielago', brand: 'Lamborghini', model: 'Murciélago LP640', country: 'IT', rarity: 'EPIC', year: 2006,
    engine: '6.5 V12 atmosférico', hp: 640, accel: 3.4, top: 340, weight: 1665, drive: 'Total · Manual 6 / e-gear', production: '≈ 4.000 (todos los Murciélago)',
    fact: 'Se llama como un toro de lidia famoso de 1879 al que le perdonaron la vida por su valentía.', tags: ['v12', 'manual'] },
  { id: 'aston-dbs', brand: 'Aston Martin', model: 'DBS Superleggera', country: 'GB', rarity: 'EPIC', year: 2018,
    engine: '5.2 V12 biturbo', hp: 725, accel: 3.4, top: 340, weight: 1845, drive: 'Trasera · Auto 8', production: 'Serie (2018-2023)',
    fact: '"Superleggera" significa "superligero" en italiano: una técnica de carrocería creada por Touring en los años 30.', tags: ['v12'] },
  { id: 'lambo-urus', brand: 'Lamborghini', model: 'Urus', country: 'IT', rarity: 'EPIC', year: 2018,
    engine: '4.0 V8 biturbo', hp: 650, accel: 3.6, top: 305, weight: 2200, drive: 'Total · Auto 8', production: 'Serie',
    fact: 'Un SUV de 650 CV. Su nombre viene del uro, el antepasado salvaje de los toros. Es el Lamborghini más vendido.', tags: ['v8'] },

  /* ======================= LEGENDARIAS ======================= */
  { id: 'lambo-aventador', brand: 'Lamborghini', model: 'Aventador SVJ', country: 'IT', rarity: 'LEGENDARY', year: 2018,
    engine: '6.5 V12 atmosférico', hp: 770, accel: 2.8, top: 350, weight: 1770, drive: 'Total · ISR 7', production: '900 coupés',
    fact: 'En 2018 batió el récord de Nürburgring para coches de serie: 6:44.97.', tags: ['v12'] },
  { id: 'ferrari-sf90', brand: 'Ferrari', model: 'SF90 Stradale', country: 'IT', rarity: 'LEGENDARY', year: 2019,
    engine: '4.0 V8 biturbo + 3 motores eléctricos', hp: 1000, accel: 2.5, top: 340, weight: 1570, drive: 'Total · DCT 8', production: 'Serie',
    fact: 'SF90 = 90 años de la Scuderia Ferrari. Puede recorrer 25 km en modo 100 % eléctrico, en silencio.', tags: ['v8', 'hybrid'] },
  { id: 'ferrari-laferrari', brand: 'Ferrari', model: 'LaFerrari', country: 'IT', rarity: 'LEGENDARY', year: 2013,
    engine: '6.3 V12 + HY-KERS eléctrico', hp: 963, accel: 2.6, top: 350, weight: 1255, drive: 'Trasera · DCT 7', production: '499 + 1 unidades',
    fact: 'Se hicieron 499. Ferrari fabricó una más, la nº 500, y la subastó para ayudar tras el terremoto de Italia de 2016.', tags: ['v12', 'hybrid'], approx: ['accel'] },
  { id: 'bugatti-veyron', brand: 'Bugatti', model: 'Veyron 16.4 Super Sport', country: 'FR', rarity: 'LEGENDARY', year: 2010,
    engine: '8.0 W16 cuádruple turbo', hp: 1200, accel: 2.5, top: 431, weight: 1838, drive: 'Total · DSG 7', production: '≈ 30 Super Sport',
    fact: 'En 2010 fue el coche de serie más rápido del mundo (431 km/h). Necesita 10 radiadores para refrigerarse.', tags: ['w16'] },
  { id: 'bugatti-chiron', brand: 'Bugatti', model: 'Chiron Pur Sport', country: 'FR', rarity: 'LEGENDARY', year: 2020,
    engine: '8.0 W16 cuádruple turbo', hp: 1500, accel: 2.3, top: 350, weight: 1960, drive: 'Total · DSG 7', production: '60 unidades',
    fact: 'Está pensado para curvas, no para velocidad punta: por eso está limitado a 350 km/h y lleva un alerón fijo de 1,90 m.', tags: ['w16'] },
  { id: 'mclaren-p1', brand: 'McLaren', model: 'P1', country: 'GB', rarity: 'LEGENDARY', year: 2013,
    engine: '3.8 V8 biturbo + motor eléctrico', hp: 916, accel: 2.8, top: 350, weight: 1490, drive: 'Trasera · SSG 7', production: '375 unidades',
    fact: 'Tiene un botón de empuje eléctrico (IPAS) y un alerón con DRS, como los McLaren de Fórmula 1.', tags: ['v8', 'hybrid'] },
  { id: 'lambo-revuelto', brand: 'Lamborghini', model: 'Revuelto', country: 'IT', rarity: 'LEGENDARY', year: 2023,
    engine: '6.5 V12 + 3 motores eléctricos', hp: 1015, accel: 2.5, top: 350, weight: 1772, drive: 'Total · DCT 8', production: 'Serie',
    fact: 'Es el primer Lamborghini V12 híbrido enchufable y el sucesor del Aventador.', tags: ['v12', 'hybrid'] },
  { id: 'porsche-918', brand: 'Porsche', model: '918 Spyder', country: 'DE', rarity: 'LEGENDARY', year: 2013,
    engine: '4.6 V8 + 2 motores eléctricos', hp: 887, accel: 2.6, top: 345, weight: 1674, drive: 'Total · PDK 7', production: '918 unidades',
    fact: 'Fue el primer coche de calle en bajar de 7 minutos en Nürburgring (6:57). Se hicieron 918, como su nombre.', tags: ['v8', 'hybrid'] },
  { id: 'amg-one', brand: 'Mercedes-AMG', model: 'ONE', country: 'DE', rarity: 'LEGENDARY', year: 2022,
    engine: '1.6 V6 turbo de F1 + 4 motores eléctricos', hp: 1063, accel: 2.9, top: 352, weight: 1695, drive: 'Total · Automatizado 7', production: '275 unidades',
    fact: 'Lleva el motor de un Fórmula 1 Mercedes, como el de Lewis Hamilton. Batió el récord de Nürburgring de coches de serie.', tags: ['hybrid'] },
  { id: 'rimac-nevera', brand: 'Rimac', model: 'Nevera', country: 'HR', rarity: 'LEGENDARY', year: 2021,
    engine: '4 motores eléctricos', hp: 1914, accel: 2.0, top: 412, weight: 2300, drive: 'Total · 1 velocidad por motor', production: '150 unidades',
    fact: 'Hecho en Croacia. En 2023 batió 23 récords de aceleración y frenada en un solo día.', tags: ['electric'] },

  /* ======================= MÍTICAS (se desbloquean subiendo de nivel) ======================= */
  { id: 'ferrari-f40', brand: 'Ferrari', model: 'F40', country: 'IT', rarity: 'MYTHIC', unlock: 3, year: 1987,
    engine: '2.9 V8 biturbo', hp: 478, accel: 4.1, top: 324, weight: 1100, drive: 'Trasera · Manual 5', production: '1.315 unidades',
    fact: 'Fue el último Ferrari aprobado por Enzo Ferrari en persona y el primer coche de calle en superar las 200 millas/h.', tags: ['v8', 'classic', 'manual'], approx: ['accel'] },
  { id: 'mercedes-300sl', brand: 'Mercedes-Benz', model: '300 SL "Alas de Gaviota"', country: 'DE', rarity: 'MYTHIC', unlock: 5, year: 1954,
    engine: '3.0 6 en línea con inyección', hp: 215, accel: 10, top: 260, weight: 1295, drive: 'Trasera · Manual 4', production: '1.400 unidades',
    fact: 'Fue el primer coche de serie con inyección directa de gasolina. Sus puertas suben como alas porque el chasis tubular era muy alto.', tags: ['classic', 'manual'], approx: ['accel'] },
  { id: 'lambo-countach', brand: 'Lamborghini', model: 'Countach LP400', country: 'IT', rarity: 'MYTHIC', unlock: 7, year: 1974,
    engine: '4.0 V12 atmosférico', hp: 375, accel: 5.6, top: 290, weight: 1065, drive: 'Trasera · Manual 5', production: '≈ 150 unidades',
    fact: '"Countach" es una exclamación de asombro en dialecto piamontés. Fue el primer Lamborghini con puertas de tijera.', tags: ['v12', 'classic', 'manual'], approx: ['accel', 'top'] },
  { id: 'bmw-m1', brand: 'BMW', model: 'M1 (E26)', country: 'DE', rarity: 'MYTHIC', unlock: 9, year: 1978,
    engine: '3.5 6 en línea atmosférico', hp: 277, accel: 5.6, top: 262, weight: 1300, drive: 'Trasera · Manual 5', production: '453 unidades',
    fact: 'Es el único superdeportivo de motor central de BMW. Tuvo su propia copa, la Procar, con pilotos de Fórmula 1.', tags: ['classic', 'manual'] },
  { id: 'mclaren-f1', brand: 'McLaren', model: 'F1', country: 'GB', rarity: 'MYTHIC', unlock: 11, year: 1992,
    engine: '6.1 V12 BMW atmosférico', hp: 627, accel: 3.2, top: 386, weight: 1138, drive: 'Trasera · Manual 6', production: '106 unidades',
    fact: 'El conductor va sentado en el centro. El vano motor está forrado de oro, porque refleja muy bien el calor.', tags: ['v12', 'classic', 'manual'] },
  { id: 'ferrari-enzo', brand: 'Ferrari', model: 'Enzo', country: 'IT', rarity: 'MYTHIC', unlock: 13, year: 2002,
    engine: '6.0 V12 atmosférico', hp: 660, accel: 3.65, top: 350, weight: 1365, drive: 'Trasera · F1 6', production: '400 unidades',
    fact: 'La unidad nº 400 se regaló al papa Juan Pablo II, que la subastó para obras benéficas.', tags: ['v12'] },
  { id: 'pagani-huayra', brand: 'Pagani', model: 'Huayra Roadster BC', country: 'IT', rarity: 'MYTHIC', unlock: 15, year: 2019,
    engine: '6.0 V12 biturbo (AMG)', hp: 802, accel: 2.8, top: 370, weight: 1250, drive: 'Trasera · Secuencial 7', production: '40 unidades',
    fact: '"Huayra" es el dios del viento de los incas. "BC" homenajea a Benny Caiola, el primer cliente de Pagani.', tags: ['v12'], approx: ['accel', 'top'] },
  { id: 'aston-valkyrie', brand: 'Aston Martin', model: 'Valkyrie', country: 'GB', rarity: 'MYTHIC', unlock: 17, year: 2021,
    engine: '6.5 V12 Cosworth + motor eléctrico', hp: 1155, accel: 2.5, top: 350, weight: 1355, drive: 'Trasera · Secuencial 7', production: '150 coupés',
    fact: 'Lo diseñó Adrian Newey, ingeniero de Fórmula 1. Su V12 gira hasta 11.100 rpm.', tags: ['v12', 'hybrid'], approx: ['accel', 'top'] },
  { id: 'bugatti-bolide', brand: 'Bugatti', model: 'Bolide', country: 'FR', rarity: 'MYTHIC', unlock: 19, year: 2024,
    engine: '8.0 W16 cuádruple turbo', hp: 1600, accel: 2.2, top: 380, weight: 1450, drive: 'Total · DSG 7', production: '40 unidades',
    fact: 'Es solo para circuito: no se puede matricular para ir por la calle.', tags: ['w16'] },
  { id: 'koenigsegg-jesko', brand: 'Koenigsegg', model: 'Jesko', country: 'SE', rarity: 'MYTHIC', unlock: 21, year: 2021,
    engine: '5.0 V8 biturbo', hp: 1600, accel: 2.5, top: 500, weight: 1390, drive: 'Trasera · LST 9', production: '125 unidades',
    fact: 'Su caja de cambios "Light Speed" salta de cualquier marcha a cualquier otra casi al instante. Con etanol E85 da 1.600 CV.', tags: ['v8'], approx: ['accel', 'top'] }
];

/* Pósters ilustrados (infografías creadas por la familia) disponibles para estos coches */
GL.POSTERS = ['aston-valkyrie', 'bugatti-bolide', 'bugatti-chiron', 'bugatti-veyron', 'ferrari-458', 'ferrari-enzo', 'ferrari-f8',
  'ferrari-laferrari', 'ferrari-sf90', 'koenigsegg-jesko', 'lambo-aventador', 'lambo-huracan', 'lambo-murcielago', 'lambo-revuelto',
  'mclaren-720s', 'mclaren-p1', 'pagani-huayra', 'porsche-gt3rs'];

/* Packs de sobres */
GL.PACKS = {
  standard:  { id: 'standard',  name: 'Sobre Garage', icon: '📦', color: '#22d3ee', cost: 200,
               desc: '5 cromos · 1 Rara o mejor garantizada' },
  epic:      { id: 'epic',      name: 'Sobre Nitro',  icon: '⚡', color: '#b26bff', cost: 600,
               desc: '5 cromos · 1 Épica o mejor garantizada' },
  legendary: { id: 'legendary', name: 'Sobre Apex',   icon: '👑', color: '#fbbf24', cost: 1500,
               desc: '5 cromos · 1 Legendaria o mejor garantizada' }
};

/* Tareas de recompensa por defecto (los padres pueden editarlas en el panel parental) */
GL.DEFAULT_TASKS = [
  { id: 't-deberes', emoji: '📚', name: 'Deberes terminados',          reward: { pack: 'standard', n: 1 }, xp: 30 },
  { id: 't-estudio', emoji: '🧠', name: 'Estudio concentrado (45 min)', reward: { pack: 'standard', n: 1 }, xp: 40 },
  { id: 't-examen',  emoji: '📝', name: 'Examen preparado a tiempo',    reward: { credits: 200 },          xp: 50 },
  { id: 't-nota',    emoji: '🏆', name: 'Buena nota (8 o más)',         reward: { pack: 'epic', n: 1 },    xp: 80 },
  { id: 't-casa',    emoji: '🏠', name: 'Ayuda en casa',                reward: { credits: 100 },          xp: 20 },
  { id: 't-lectura', emoji: '📖', name: 'Lectura (30 min)',             reward: { credits: 80 },           xp: 20 }
];
