// Static game data: governments, nations in 2077, space milestones, lore.
var G = window.G || (window.G = {});

G.data = (function () {
  var govs = {
    democracy:   { name: 'Democracy',        title: 'President',       elections: true,  stab: 0,  sci: 1.0,  crack: 2.0, desc: 'Leaders face elections every 4 years. Crackdowns are deeply unpopular.' },
    oneparty:    { name: 'One-Party State',  title: 'Chairman',        elections: false, stab: 12, sci: 1.05, crack: 0.8, desc: 'The Party rules. Stable, but rivals plot behind closed doors.' },
    autocracy:   { name: 'Autocracy',        title: 'Supreme Leader',  elections: false, stab: 10, sci: 0.9,  crack: 0.7, desc: 'One ruler, total control. Coups are the only way out.' },
    junta:       { name: 'Military Junta',   title: 'Marshal',         elections: false, stab: 6,  sci: 0.85, crack: 0.6, desc: 'The army rules. Military funding keeps the generals loyal.' },
    corporate:   { name: 'Corporate State',  title: 'Chief Executive', elections: false, stab: 5,  sci: 1.1,  crack: 1.0, desc: 'Megacorporations govern. Wealth buys a seat on the board.' },
    technocracy: { name: 'Technocracy',      title: 'Director',        elections: false, stab: 4,  sci: 1.3,  crack: 1.2, desc: 'Experts and algorithms govern. Science advances fastest here.' },
    monarchy:    { name: 'Monarchy',         title: 'Monarch',         elections: false, stab: 14, sci: 0.9,  crack: 0.7, desc: 'A royal house rules. Heirs inherit the throne.' }
  };

  // Default budget weights: mil, econ, welfare, sci, space (any scale, normalised).
  function A(mil, econ, welfare, sci, space) { return { mil: mil, econ: econ, welfare: welfare, sci: sci, space: space }; }

  // pop in millions, gdp in billions USD, tech index, space points, army multiplier vs equilibrium.
  var nations = [
    { id: 'USA', name: 'United States of America', short: 'USA', color: '#4f8cff', gov: 'democracy', culture: 'anglo', tier: 'Superpower',
      pop: 270, gdp: 23000, tech: 86, space: 165, stability: 52, approval: 44, tax: 0.22, aggression: 0.5, armyMult: 0.8,
      alloc: A(30, 25, 20, 13, 12), neighbors: ['CAS', 'MESO', 'RUS'],
      desc: 'Battered but standing. Founded Artemis Colony on the Moon in 2065 and leads the space race. Lost Cascadia to secession in 2068.' },
    { id: 'EF', name: 'European Federation', short: 'Euro Fed', color: '#f2c94c', gov: 'democracy', title: 'Chancellor', culture: 'euro', tier: 'Superpower',
      pop: 360, gdp: 20000, tech: 83, space: 70, stability: 55, approval: 50, tax: 0.26, aggression: 0.3, armyMult: 0.75,
      alloc: A(22, 26, 28, 14, 10), neighbors: ['SWE', 'RUS', 'TUR', 'PAU'],
      desc: 'Forged in the fires of the war from the old EU. Rich, bureaucratic and determined never to bleed like that again.' },
    { id: 'RUS', name: 'Russian Federation', short: 'Russia', color: '#d9534f', gov: 'autocracy', title: 'President', culture: 'slavic', tier: 'Great Power',
      pop: 90, gdp: 4200, tech: 66, space: 60, stability: 48, approval: 40, tax: 0.24, aggression: 0.75, armyMult: 0.9,
      alloc: A(42, 22, 12, 12, 12), neighbors: ['EF', 'SWE', 'SIB', 'TUR', 'CHN', 'USA'],
      desc: 'Lost Siberia in the war but kept its arsenal. Wants its empire, and the Moon, back.' },
    { id: 'CHN', name: "People's Republic of China", short: 'China', color: '#e74c3c', gov: 'oneparty', culture: 'chinese', tier: 'Superpower',
      pop: 980, gdp: 25000, tech: 85, space: 130, stability: 62, approval: 55, tax: 0.24, aggression: 0.55, armyMult: 0.85,
      alloc: A(30, 30, 14, 14, 12), neighbors: ['RUS', 'SIB', 'IND', 'PAC', 'TUR'],
      desc: 'The largest economy on Earth. Its lunar outpost at Shackleton Crater races the Americans for dominance.' },
    { id: 'IND', name: 'Republic of India', short: 'India', color: '#ff9f43', gov: 'democracy', title: 'Prime Minister', culture: 'indian', tier: 'Superpower',
      pop: 1150, gdp: 15500, tech: 74, space: 75, stability: 50, approval: 52, tax: 0.21, aggression: 0.4, armyMult: 0.8,
      alloc: A(26, 30, 18, 14, 12), neighbors: ['CHN', 'GULF', 'TUR', 'SGP'],
      desc: 'The most populous nation on Earth and rising fast. Its space agency vows a crewed Mars landing before 2090.' },
    { id: 'PAC', name: 'Pacific Accord', short: 'Pacific Accord', color: '#9b59b6', gov: 'technocracy', culture: 'pacific', tier: 'Great Power',
      pop: 145, gdp: 9000, tech: 90, space: 55, stability: 60, approval: 55, tax: 0.25, aggression: 0.3, armyMult: 0.8,
      alloc: A(24, 24, 16, 24, 12), neighbors: ['CHN', 'SIB', 'AUS'],
      desc: 'Japan and a reunified Korea, merged under an algorithmic technocracy. The most advanced nation on Earth.' },
    { id: 'PAU', name: 'Pan-African Union', short: 'Pan-Africa', color: '#27ae60', gov: 'democracy', culture: 'african', tier: 'Rising Power',
      pop: 1050, gdp: 8500, tech: 52, space: 10, stability: 42, approval: 48, tax: 0.18, aggression: 0.35, armyMult: 0.7,
      alloc: A(22, 36, 22, 12, 8), neighbors: ['EF', 'GULF'],
      desc: 'Largely spared from the bombs. A young, enormous union with vast resources and fragile institutions.' },
    { id: 'SAC', name: 'South American Compact', short: 'S. America', color: '#1abc9c', gov: 'democracy', culture: 'latin', tier: 'Rising Power',
      pop: 320, gdp: 5300, tech: 56, space: 14, stability: 46, approval: 47, tax: 0.2, aggression: 0.3, armyMult: 0.7,
      alloc: A(20, 34, 24, 12, 10), neighbors: ['MESO'],
      desc: 'A continental bloc led from Brasília. The Amazon Restoration Project makes it the green lung of a dying world.' },
    { id: 'TUR', name: 'Turkic Union', short: 'Turkic Union', color: '#e67e22', gov: 'autocracy', title: 'Khagan', culture: 'turkic', tier: 'Regional Power',
      pop: 155, gdp: 3600, tech: 58, space: 8, stability: 50, approval: 46, tax: 0.22, aggression: 0.6, armyMult: 0.9,
      alloc: A(36, 28, 14, 12, 10), neighbors: ['EF', 'RUS', 'CHN', 'IND', 'GULF'],
      desc: 'From Istanbul to Almaty: a new power born from the chaos at the crossroads of the world.' },
    { id: 'GULF', name: 'Gulf Concordat', short: 'Gulf', color: '#c9a227', gov: 'monarchy', title: 'Emir', culture: 'arabic', tier: 'Regional Power',
      pop: 75, gdp: 3800, tech: 62, space: 16, stability: 58, approval: 52, tax: 0.15, aggression: 0.35, armyMult: 0.9,
      alloc: A(32, 30, 18, 10, 10), neighbors: ['IND', 'TUR', 'PAU'],
      desc: 'Oil is dead, but the sovereign funds survived. Building solar empires and buying influence across the world.' },
    { id: 'MESO', name: 'Mesoamerican League', short: 'Mesoamerica', color: '#16a085', gov: 'democracy', culture: 'latin', tier: 'Regional Power',
      pop: 185, gdp: 2700, tech: 50, space: 3, stability: 44, approval: 45, tax: 0.19, aggression: 0.3, armyMult: 0.7,
      alloc: A(24, 34, 22, 12, 8), neighbors: ['USA', 'SAC'],
      desc: 'Mexico and Central America united by necessity. Caught between the Americans and the Compact.' },
    { id: 'AUS', name: 'Austral Directorate', short: 'Australia', color: '#f39c12', gov: 'corporate', culture: 'anglo', tier: 'Minor Power',
      pop: 32, gdp: 2300, tech: 72, space: 15, stability: 55, approval: 50, tax: 0.2, aggression: 0.3, armyMult: 0.8,
      alloc: A(22, 30, 14, 16, 18), neighbors: ['PAC', 'SGP'],
      desc: "Mining conglomerates took over when Canberra fell silent. Home to the southern hemisphere's biggest spaceport." },
    { id: 'CAS', name: 'Republic of Cascadia', short: 'Cascadia', color: '#2ecc71', gov: 'democracy', culture: 'anglo', tier: 'Minor Power',
      pop: 24, gdp: 2100, tech: 82, space: 8, stability: 50, approval: 55, tax: 0.24, aggression: 0.2, armyMult: 0.6,
      alloc: A(18, 28, 24, 20, 10), neighbors: ['USA'],
      desc: 'The Pacific Northwest seceded from the USA in 2068. A tech haven living in the shadow of its former master.' },
    { id: 'SIB', name: 'Siberian Free Republic', short: 'Siberia', color: '#7f8c8d', gov: 'junta', culture: 'slavic', tier: 'Minor Power',
      pop: 17, gdp: 850, tech: 55, space: 4, stability: 40, approval: 42, tax: 0.24, aggression: 0.5, armyMult: 1.0,
      alloc: A(40, 30, 12, 10, 8), neighbors: ['RUS', 'CHN', 'PAC'],
      desc: 'Broke away from Moscow during the war. Sitting on the richest untouched resources on Earth. Everyone wants it.' },
    { id: 'SWE', name: 'Republic of Sweden', short: 'Sweden', color: '#3d9bd6', gov: 'democracy', title: 'Prime Minister', culture: 'nordic', tier: 'Small Nation',
      pop: 9, gdp: 680, tech: 80, space: 4, stability: 60, approval: 56, tax: 0.3, aggression: 0.15, armyMult: 0.7,
      alloc: A(18, 26, 28, 18, 10), neighbors: ['EF', 'RUS'],
      desc: 'Left the European Federation in 2071 after the war ended. Small, smart and stubborn. Could it become the world leader in everything?' },
    { id: 'SGP', name: 'Free City of Singapore', short: 'Singapore', color: '#ff6b81', gov: 'corporate', culture: 'chinese', tier: 'City-State',
      pop: 6, gdp: 880, tech: 86, space: 3, stability: 62, approval: 56, tax: 0.18, aggression: 0.1, armyMult: 0.7,
      alloc: A(18, 34, 16, 20, 12), neighbors: ['IND', 'AUS'],
      desc: 'A neutral city-state of bankers and brokers. Tiny, unimaginably rich, and very hard to protect.' }
  ];

  // Space milestones. points = cumulative space points needed.
  // ceil = multiplier on the GDP-per-capita ceiling, techBoost one-time tech gain.
  var milestones = [
    { name: 'Orbital Stations',        points: 0,      ceil: 1.0,  desc: 'Low-orbit stations and satellites.' },
    { name: 'Lunar Outpost',           points: 50,     ceil: 1.02, desc: 'A permanent crewed base on the Moon.' },
    { name: 'Lunar Colony',            points: 150,    ceil: 1.05, desc: 'A self-sustaining settlement on the Moon.' },
    { name: 'Mars Landing',            points: 320,    ceil: 1.07, desc: 'Human boots on Mars.' },
    { name: 'Mars Colony',             points: 700,    ceil: 1.12, desc: 'A growing city under Martian domes.' },
    { name: 'Asteroid Mining',         points: 1400,   ceil: 1.3,  desc: 'Industrial mining of the asteroid belt. Raw materials flood the economy.' },
    { name: 'Jovian Settlements',      points: 3000,   ceil: 1.45, desc: 'Habitats on Europa and Ganymede.' },
    { name: 'Titan Industrial Zone',   points: 6000,   ceil: 1.6,  desc: 'Hydrocarbon refineries and cities on Titan.' },
    { name: 'Dyson Swarm (Phase I)',   points: 12000,  ceil: 2.0,  desc: 'Solar collectors in orbit around the Sun.' },
    { name: 'Interstellar Probe',      points: 60000,  ceil: 2.2,  desc: 'The first human-made craft sent to another star.' },
    { name: 'First Exoplanet Colony',  points: 150000, ceil: 2.6,  desc: 'Humanity lives under an alien sun.' },
    { name: 'Kardashev II: Space God', points: 350000, ceil: 3.5,  desc: 'Your civilisation commands the full energy of a star.' }
  ];

  var roles = {
    leader:     { name: 'Head of State',       icon: '👑', desc: 'You rule the nation. Set the budget, wage war and shape history. Everyone wants your seat.' },
    politician: { name: 'Politician',          icon: '🎙️', desc: 'An opposition figure with big ambitions. Build influence and popularity, then take power through elections or intrigue.' },
    general:    { name: 'General',             icon: '🎖️', desc: 'A senior military commander. Win the loyalty of the troops. When the time is right, take power by force.' },
    corporate:  { name: 'Corporate Executive', icon: '💼', desc: 'A megacorp executive. Build wealth, buy politicians and pull the strings from the boardroom.' }
  };

  var lore = [
    'In 2062 a border clash in the Arctic spiralled into the Long War. For fifteen years the great powers bled each other with drones, orbital strikes and engineered plagues.',
    'When the Treaty of Reykjavík was signed in 2077, almost a third of humanity was gone. Nations had fallen and new ones had risen from the ashes.',
    'Above the ruins, a new race had already begun. The United States founded Artemis Colony on the Moon in 2065, and every power is now scrambling to follow it into the stars.',
    'The year is 2077. The world can be rebuilt or burned again. The choice starts with you.'
  ];

  return { govs: govs, nations: nations, milestones: milestones, roles: roles, lore: lore };
})();
