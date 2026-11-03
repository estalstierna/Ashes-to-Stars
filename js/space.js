// Space: the bodies of the solar system (and beyond), and colonies on them.
// Colonies are founded and expanded, grow, feed research/space/growth, and may seek independence.
var G = window.G || (window.G = {});

G.space = (function () {
  var U = G.util;
  function E() { return G.engine; }
  function S() { return G.state; }

  // unlock: space milestone index required. cost: founding cost as a share of GDP.
  // yields per colony level: space points, research points, growth.
  var BODIES = [
    { id: 'moon', name: 'The Moon', icon: '🌕', unlock: 2, cost: 0.01, space: 1.5, rp: 2, econ: 0.0008, orbit: 0, distance: '384,400 km from Earth',
      gravity: '0.17 g', day: '29.5 Earth days', temp: '−173 to +127 °C',
      resources: 'Water ice in polar craters, helium-3 for fusion reactors, regolith for 3D-printed habitats.',
      lore: [
        'Humanity returned to the Moon in the 2030s. In 2065, in the middle of the Long War, the United States founded Artemis Colony on the rim of Shackleton crater at the south pole: the first permanent human settlement beyond Earth.',
        'China followed with Shackleton Outpost on the opposite rim in 2072. The two bases are three kilometres apart and officially do not speak to each other.',
        'The far side is a radio-quiet sanctuary. Whoever builds the great observatory there will hear the universe more clearly than anyone on Earth.'
      ] },
    { id: 'mars', name: 'Mars', icon: '🔴', unlock: 4, cost: 0.02, space: 2.5, rp: 3, econ: 0.001, orbit: 2, distance: '55–400 million km (months by chemical rocket)',
      gravity: '0.38 g', day: '24 h 37 min', temp: 'average −63 °C',
      resources: 'Subsurface ice, iron-rich soil, CO₂ atmosphere for fuel. A whole planet to terraform, given centuries.',
      lore: ['The red planet has been humanity\'s dream for two centuries. Its colonists will be the first humans who never see Earth\'s sky.', 'Dust storms can cover the whole planet for months. Domes must be self-sufficient.'] },
    { id: 'ceres', name: 'Ceres & the Belt', icon: '🪨', unlock: 5, cost: 0.025, space: 3, rp: 2, econ: 0.002, orbit: 3, distance: '2.8 AU from the Sun',
      gravity: '0.03 g', day: '9 h', temp: '−105 °C',
      resources: 'Metals, water and rare elements worth more than the whole Earth economy. The key to industry in space.',
      lore: ['The asteroid belt holds millions of rocks. Ceres, the largest, is a natural harbour for the miners who work them.'] },
    { id: 'europa', name: 'Europa', icon: '🧊', unlock: 6, cost: 0.03, space: 3, rp: 5, econ: 0.001, orbit: 4, distance: 'Moon of Jupiter, 5.2 AU',
      gravity: '0.13 g', day: '3.5 Earth days', temp: '−160 °C',
      resources: 'A global ocean under 20 km of ice. Perhaps the best place to find alien life.',
      lore: ['Jupiter\'s radiation is deadly on the surface. Colonists live deep in the ice, drilling towards the dark ocean below.'] },
    { id: 'ganymede', name: 'Ganymede', icon: '🌑', unlock: 6, cost: 0.03, space: 3.5, rp: 3, econ: 0.0015, orbit: 4, distance: 'Moon of Jupiter, 5.2 AU',
      gravity: '0.15 g', day: '7.2 Earth days', temp: '−163 °C',
      resources: 'The largest moon in the solar system, with its own magnetic field to shield settlers. A base for the outer planets.',
      lore: ['Ganymede is bigger than Mercury. Its magnetic field makes it the safest place to live near Jupiter.'] },
    { id: 'titan', name: 'Titan', icon: '🟠', unlock: 7, cost: 0.035, space: 4, rp: 3, econ: 0.0025, orbit: 5, distance: 'Moon of Saturn, 9.5 AU',
      gravity: '0.14 g', day: '16 Earth days', temp: '−179 °C',
      resources: 'Lakes of liquid methane and ethane: endless hydrocarbons for industry and fuel.',
      lore: ['Titan has a thick atmosphere: you could fly there with wings strapped to your arms. Its orange skies hide seas of liquid gas.'] },
    { id: 'venus', name: 'Venus (cloud cities)', icon: '🟡', unlock: 8, cost: 0.03, space: 3, rp: 3, econ: 0.002, orbit: 1, distance: '0.72 AU from the Sun',
      gravity: '0.9 g', day: '243 Earth days', temp: '+464 °C at the surface; ~20 °C at 55 km',
      resources: 'At 55 km altitude the pressure and temperature are Earth-like. Floating cities can harvest the acid clouds.',
      lore: ['The surface is hell, but the clouds are the most Earth-like place in the solar system. Cities float like ships on a sea of air.'] },
    { id: 'mercury', name: 'Mercury', icon: '⚫', unlock: 8, cost: 0.03, space: 5, rp: 2, econ: 0.003, orbit: 0.5, distance: '0.39 AU from the Sun',
      gravity: '0.38 g', day: '176 Earth days', temp: '−180 to +430 °C',
      resources: 'Endless sunlight and metal: the forge for the Dyson swarm.',
      lore: ['Mercury is being slowly mined to build solar collectors around the Sun. Some call it the first planet humanity will consume.'] },
    { id: 'proxima', name: 'Proxima b', icon: '🌍', unlock: 10, cost: 0.06, space: 6, rp: 8, econ: 0.003, orbit: 9, distance: '4.24 light-years away',
      gravity: '~1.1 g', day: 'Tidally locked: eternal day on one side', temp: 'Mild in the twilight zone',
      resources: 'A rocky world around the nearest star. A second home for humanity.',
      lore: ['The first colonists left Earth knowing they would never return. Messages home take more than four years each way.'] }
  ];
  var LEVELS = ['Outpost', 'Settlement', 'Colony', 'City', 'Metropolis'];
  var LEVEL_POP = [0.002, 0.05, 0.5, 3, 15]; // millions
  function body(id) { return BODIES.filter(function (b) { return b.id === id; })[0]; }

  function init() {
    S().colonies = [
      { id: 1, body: 'moon', nation: 'USA', name: 'Artemis Colony', level: 3, founded: 2065, pop: 0.4, autonomy: 10, grew: 2075 },
      { id: 2, body: 'moon', nation: 'CHN', name: 'Shackleton Outpost', level: 1, founded: 2072, pop: 0.002, autonomy: 0, grew: 2072 }
    ];
    S().colonySeq = 2;
  }
  function list() { if (!S().colonies) init(); return S().colonies; }
  function of(n) { return list().filter(function (c) { return c.nation === n.id; }); }
  function on(bodyId) { return list().filter(function (c) { return c.body === bodyId; }); }
  function unlocked(n, b) { return E().milestoneIndex(n) >= b.unlock; }

  // Colony names drawn from each culture's own pool: its scientists, explorers, myths and
  // space programmes. Names with a space stand alone; single words get a suffix (Base, Station...).
  // `moon` and `mars` lists are used on those worlds, `any` everywhere.
  var NAME_POOLS = {
    anglo: { moon: ['Armstrong', 'Aldrin', 'Tranquility', 'Eagle', 'Apollo', 'Shepard'],
      mars: ['Bradbury', 'New Houston', 'Sojourner', 'Curiosity', 'Perseverance', 'Ares'],
      any: ['Sagan', 'Glenn', 'Ride', 'Goddard', 'Liberty', 'Discovery', 'Hubble', 'Johnson', 'Frontier', 'Columbia', 'Challenger', 'New Horizon'] },
    euro: { moon: ['Galileo', 'Copernicus', 'Verne', 'Hergé'],
      mars: ['Schiaparelli', 'Beagle', 'Rosalind Franklin', 'Nouvelle Lyon'],
      any: ['Kepler', 'Huygens', 'Curie', 'Ariane', 'Columbus', 'Herschel', 'Rosetta', 'Leibniz', 'Nova Europa', 'Marconi', 'Cassini'] },
    slavic: { moon: ['Luna', 'Lunokhod', 'Tsiolkovsky', 'Mechta'],
      mars: ['Fobos', 'Krasnaya Zvezda', 'Mars-Grad'],
      any: ['Gagarin', 'Korolev', 'Tereshkova', 'Leonov', 'Mir', 'Vostok', 'Soyuz', 'Novaya Zarya', 'Zvezda', 'Salyut', 'Buran'] },
    chinese: { moon: ["Chang'e", 'Guanghan', 'Yutu', 'Queqiao', 'Wu Gang'],
      mars: ['Zhurong', 'Tianwen', 'Yinghuo', 'Huoxing'],
      any: ['Tiangong', 'Shenzhou', 'Kunlun', 'Penglai', 'Xihe', 'Kuafu', 'Shennong', 'Fuxi', 'Nuwa', 'Tianhe', 'Wentian', 'Mengtian', 'Taikong'] },
    indian: { moon: ['Chandra', 'Vikram', 'Pragyan', 'Shiv Shakti', 'Soma'],
      mars: ['Mangala', 'Mangalyaan'],
      any: ['Aryabhata', 'Bhaskara', 'Kalpana', 'Sarabhai', 'Kalam', 'Gaganyaan', 'Varahamihira', 'Ramanujan', 'Surya', 'Antariksh', 'Nakshatra'] },
    pacific: { moon: ['Kaguya', 'Tsukuyomi', 'Danuri', 'Dalnara'],
      mars: ['Nozomi', 'Kasei', 'Hwaseong'],
      any: ['Hayabusa', 'Akatsuki', 'Hikari', 'Hinode', 'Nuri', 'Hanbit', 'Shin-Edo', 'Mirai', 'Yamato', 'Arirang', 'Haneul', 'Kibo'] },
    african: { moon: ['Nyota', 'Mwezi', 'Sankofa'],
      mars: ['Mansa Musa', 'Kilimanjaro', 'Nubia'],
      any: ['Ubuntu', 'Timbuktu', 'Aksum', 'Zimbabwe', 'Lalibela', 'Maathai', 'Mandela', 'Nkrumah', 'Harambee', 'Uhuru', 'Kush'] },
    latin: { moon: ['Selene', 'Luna Nueva'],
      mars: ['Nueva Esperanza', 'Bolívar'],
      any: ['Libertad', 'Cruzeiro', 'San Martín', 'Amazonia', 'Cóndor', 'Vida Nueva', 'Neruda', 'Esperanza', 'Santos-Dumont', 'Andes'] },
    turkic: { moon: ['Ay Yıldız', 'Aydın', 'Ulugh Beg'],
      mars: ['Kızıl', 'Bozkurt'],
      any: ['Tengri', 'Gök', 'Altay', 'Yıldız', 'Ergenekon', 'Turan', 'Kök Türk', 'Bilge', 'Semerkand', 'Orhun'] },
    arabic: { moon: ['Al-Qamar', 'Hilal', 'Ibn Firnas'],
      mars: ['Al-Amal', 'Al-Mirrikh', 'Hope'],
      any: ['Al-Biruni', 'Ibn al-Haytham', 'Al-Sufi', 'Al-Khwarizmi', 'Rashid', 'Najm', 'Thuraya', 'Al-Battani', 'Suhail', 'Nur'] },
    seasian: { moon: ['Hang Nga', 'Chandra Siam', 'Mae Phosop'], mars: ['Lac Long', 'Angkor'], any: ['Mekong', 'Ayutthaya', 'Bagan', 'Thang Long', 'Naga', 'Garuda', 'Sukhothai', 'Halong', 'Irrawaddy', 'Champa'] },
    nordic: { moon: ['Måne', 'Mani', 'Tycho Brahe'],
      mars: ['Bifröst', 'Asgard', 'Nordstjärnan'],
      any: ['Celsius', 'Niels Bohr', 'Rømer', 'Birkeland', 'Nansen', 'Amundsen', 'Freya', 'Ymir', 'Valhalla', 'Aurora', 'Kalevala', 'Väinämöinen', 'Ørsted'] }
  };
  // Nations that share a culture with a bigger neighbour get pools of their own.
  var NATION_POOLS = {
    AUS: { moon: ['Woomera', 'Southern Cross'], mars: ['New Canberra', 'Uluru'], any: ['Endeavour', 'Kingsford', 'Parkes', 'Tidbinbilla', 'Coral Sea', 'Outback', 'Murray'] },
    CAS: { moon: ['Rainier', 'Evergreen'], mars: ['New Seattle', 'Cascadia Nova'], any: ['Cascade', 'Olympia', 'Columbia Gorge', 'Hood', 'Salish', 'Douglas', 'Puget'] },
    SIB: { moon: ['Baikal', 'Belka'], mars: ['Novosibirsk-2', 'Krasnoyarsk'], any: ['Taiga', 'Yenisei', 'Lena', 'Altai', 'Ob', 'Tunguska', 'Amur'] },
    SGP: { moon: ['Merlion', 'Bulan'], mars: ['Temasek'], any: ['Raffles', 'Lion City', 'Marina', 'Bintang', 'Sentosa', 'Straits'] },
    ATL: { moon: ['Britannia', 'Halley'], mars: ['New Avalon', 'Kelvin'], any: ['Newton', 'Darwin', 'Hawking', 'Faraday', 'Shackleton', 'Lovelace', 'Halifax', 'Cartier', 'Erin', 'Thule', 'Brendan'] },
    SAF: { moon: ['Kgwedi', 'Mapungubwe'], mars: ['New Cape', 'Kalahari'], any: ['Sutherland', 'Karoo', 'Okavango', 'Zambezi', 'Mosi-oa-Tunya', 'Drakensberg', 'Tutu', 'Kaunda', 'Namib', 'Great Zimbabwe'] },
    MAG: { moon: ['Al-Qamar', 'Hathor'], mars: ['Atlas', 'Nefertari'], any: ['Ibn Battuta', 'Al-Idrisi', 'Carthage', 'Alexandria', 'Sahara', 'Thoth', 'Amazigh', 'Khufu', 'Tassili', 'Imhotep'] },
    MESO: { moon: ['Metztli', 'Coyolxauhqui'], mars: ['Quetzal', 'Tenochtitlan'], any: ['Xochitl', 'Kukulcán', 'Tikal', 'Palenque', 'Itzamná', 'Copán', 'Juárez'] }
  };
  var SUFFIX = ['Base', 'Station', 'Colony', 'Settlement', 'Outpost'];
  function name(n, b) {
    var pool = NATION_POOLS[n.id] || NAME_POOLS[n.culture] || NAME_POOLS.anglo;
    var opts = (pool[b.id] || []).concat(pool.any);
    var fresh = opts.filter(function (x) { return !list().some(function (c) { return c.name.indexOf(x) === 0; }); });
    var pick = U.pick(fresh.length ? fresh : opts);
    return pick.indexOf(' ') >= 0 ? pick : pick + ' ' + U.pick(SUFFIX);
  }

  function foundCost(n, b) { return n.gdp * b.cost * E().diff().cost; }
  function expandCost(n, c) { var b = body(c.body); return n.gdp * b.cost * (0.6 + c.level * 0.4) * E().diff().cost; }
  function canExpand(c) { return c.level < LEVELS.length && S().year - c.grew >= 5; }

  function found(n, bodyId) {
    var b = body(bodyId);
    if (!b || !unlocked(n, b) || of(n).some(function (c) { return c.body === bodyId; })) return null;
    var c = { id: ++S().colonySeq, body: bodyId, nation: n.id, name: name(n, b), level: 1, founded: S().year, pop: LEVEL_POP[0], autonomy: 0, grew: S().year };
    list().push(c);
    var mine = n.id === S().player.nation;
    E().log('🚀 ' + n.name + ' founds ' + c.name + ' on ' + b.name + '.', mine ? 'player' : 'world');
    if (mine) S().player.legacy += 2;
    return c;
  }
  function expand(c) {
    if (!canExpand(c)) return false;
    c.level++; c.grew = S().year;
    var n = E().nation(c.nation);
    E().log('🏙️ ' + c.name + ' grows into a ' + LEVELS[c.level - 1].toLowerCase() + '.', n && n.id === S().player.nation ? 'player' : 'world');
    return true;
  }

  // Growth bonus from all of a nation's colonies (resources shipped home).
  function growth(n) { return Math.min(0.015, of(n).reduce(function (a, c) { return a + body(c.body).econ * c.level; }, 0)); }

  function year() {
    var s = S(), pid = s.player.nation;
    list().slice().forEach(function (c) {
      var n = E().nation(c.nation), b = body(c.body);
      if (!n || !n.alive) {
        // The homeland is gone: the colony goes its own way.
        if (c.nation) { E().log('🏴 ' + c.name + ' is cut off from its fallen homeland and declares itself free.', 'world'); c.nation = null; c.free = true; }
        return;
      }
      if (c.free) return;
      // People arrive and children are born, up to what the colony can hold.
      var cap = LEVEL_POP[c.level - 1] * 1.5;
      c.pop = Math.min(cap, c.pop * 1.06 + LEVEL_POP[c.level - 1] * 0.05);
      n.space += b.space * c.level * 0.5;
      G.research.ensure(n).bank += b.rp * c.level * 0.5;
      // Distant, large colonies drift towards self-rule; a stable homeland slows it.
      var drift = c.level * (b.orbit + 1) * 0.15 - (n.stability - 50) / 60 + (c.grantedRights ? -0.6 : 0);
      c.autonomy = U.clamp(c.autonomy + drift, 0, 100);
      if (c.autonomy >= 85 && U.chance(0.1)) {
        if (n.id === pid && E().isLeader()) G.events.queue({ id: 'colony-independence', ctx: { oid: n.id, otherName: n.name, colony: c.id, colonyName: c.name, bodyName: b.name } });
        else independence(c);
      }
    });
    // Independent settlements on the same world band together (at most one free colony per world).
    BODIES.forEach(function (b) {
      var free = list().filter(function (c) { return c.free && c.body === b.id; });
      if (free.length < 2) return;
      free.sort(function (x, y) { return y.pop - x.pop; });
      free.slice(1).forEach(function (c) { free[0].pop += c.pop; free[0].level = Math.max(free[0].level, c.level); });
      S().colonies = list().filter(function (c) { return free.indexOf(c) < 1; });
    });
    // A conqueror holding two colonies on one world merges them.
    E().alive().forEach(function (n) {
      BODIES.forEach(function (b) {
        var mine = list().filter(function (c) { return c.nation === n.id && c.body === b.id; });
        if (mine.length < 2) return;
        mine.sort(function (x, y) { return y.level - x.level; });
        mine.slice(1).forEach(function (c) { mine[0].pop += c.pop; });
        S().colonies = list().filter(function (c) { return mine.indexOf(c) < 1; });
      });
    });
    // AI nations found and grow colonies.
    E().alive().forEach(function (n) {
      if (n.id === pid && E().isLeader()) return;
      if (U.chance(0.05)) {
        var opts = BODIES.filter(function (b) { return unlocked(n, b) && !of(n).some(function (c) { return c.body === b.id; }); });
        if (opts.length && n.treasury > -n.gdp * 0.3) { var b = opts[0]; if (found(n, b.id)) n.treasury -= foundCost(n, b); }
      }
      of(n).forEach(function (c) { if (canExpand(c) && U.chance(0.06)) { n.treasury -= expandCost(n, c); expand(c); } });
    });
  }

  function independence(c) {
    var n = E().nation(c.nation);
    E().log('🏴 ' + c.name + ' declares independence from ' + (n ? n.name : 'Earth') + '!', n && n.id === S().player.nation ? 'player' : 'major');
    c.nation = null; c.free = true; c.autonomy = 100;
    if (n) E().addMod(n, 'approval', -5, 3);
  }

  G.events.defs.push({ id: 'colony-independence', w: 0, cond: function () { return false; },
    title: '{colonyName} wants independence',
    text: 'The people of {colonyName} on {bodyName} have voted to become a free nation. Their delegates await your answer.',
    choices: [
      { t: 'Grant independence and stay friends', r: function (c) { var col = list().filter(function (x) { return x.id === c.colony; })[0]; if (col) independence(col); E().pn().space += 10; return 'A new free world is born. It keeps trading with you.'; } },
      { t: 'Offer more self-rule instead', r: function (c) { var col = list().filter(function (x) { return x.id === c.colony; })[0]; if (col) { col.autonomy = 55; col.grantedRights = true; } return 'A colonial parliament is created. The movement calms down, for now.'; } },
      { t: 'Send in the marines', r: function (c) {
        var col = list().filter(function (x) { return x.id === c.colony; })[0];
        if (!col) return 'Too late.';
        if (U.chance(0.6)) { col.autonomy = 40; E().pn().treasury -= E().pn().gdp * 0.01; E().addMod(E().pn(), 'approval', -3, 2); return 'The rebellion is crushed. The colony obeys, sullenly.'; }
        independence(col); E().pn().treasury -= E().pn().gdp * 0.015; return 'The marines are defeated in the corridors of the colony. It is free.';
      } }
    ] });

  // Older saves: colonies named '<Place> <Type> (<Nation>)' get a name from their culture's pool.
  function renameOld() {
    list().forEach(function (c) {
      var n = c.nation && E().nation(c.nation), b = body(c.body);
      if (n && b && / \([^)]+\)$/.test(c.name)) c.name = name(n, b);
    });
  }

  return { renameOld: renameOld, NAME_POOLS: NAME_POOLS, BODIES: BODIES, LEVELS: LEVELS, body: body, init: init, list: list, of: of, on: on, unlocked: unlocked, found: found, expand: expand,
    canExpand: canExpand, foundCost: foundCost, expandCost: expandCost, growth: growth, year: year };
})();
