// Procedural events. Each turn one event may fire, chosen from those whose conditions hold.
// Templates use {placeholders} filled from a randomly generated context.
var G = window.G || (window.G = {});

G.events = (function () {
  var U = G.util, E = G.engine;
  function S() { return G.state; }
  function P() { return G.state.player; }
  function N() { return E.pn(); }
  function L() { return E.isLeader(); }
  function inf(d) { P().influence = U.clamp(P().influence + d, 0, 100); }
  function pop(d) { P().popularity = U.clamp(P().popularity + d, 0, 100); }
  function wealth(d) { P().wealth = Math.max(0, P().wealth + d); }
  function tre(frac) { N().treasury += N().gdp * frac; }

  var defs = [
    // ---------- Leader events ----------
    { id: 'refugees', w: 3, cond: function () { return L(); },
      title: 'Refugees at the border',
      text: '{amount} survivors from {other} are massing at the border, fleeing hunger and chaos. They beg to be let in.',
      choices: [
        { t: 'Open the gates', r: function (c) { N().pop += c.m; E.addMod(N(), 'approval', -3, 2); E.changeRel(N(), c.o, 10); E.addMod(N(), 'growth', 0.003, 5); return 'They pour in, hungry but eager to work.'; } },
        { t: 'Seal the border', r: function (c) { E.addMod(N(), 'approval', 2, 1); E.changeRel(N(), c.o, -8); return 'The gates stay shut. Some call it cruelty, others prudence.'; } }
      ],
      ctx: function (c) { c.m = Math.max(0.05, N().pop * 0.01); c.amount = U.people(c.m); } },
    { id: 'plague', w: 2,
      title: 'The Grey Fever returns',
      text: 'A mutated strain of a wartime bioweapon is spreading in {region}. Doctors warn it could kill millions.',
      cond: function () { return L(); },
      choices: [
        { t: 'Emergency vaccine programme (' + '2% GDP)', r: function () { tre(-0.02); N().tech += 0.5; return 'Labs work around the clock. The outbreak is contained.'; } },
        { t: 'Strict quarantine', r: function () { E.addMod(N(), 'growth', -0.02, 2); E.addMod(N(), 'approval', -4, 2); N().pop *= 0.995; return 'Cities lock down. The economy grinds, but the fever slows.'; } },
        { t: 'Downplay it', r: function () { N().pop *= 0.97; E.addMod(N(), 'approval', -10, 3); return 'The fever burns through the population. Your denials age badly.'; } }
      ],
      ctx: function (c) { c.region = U.pick(['the southern provinces', 'the capital', 'the refugee camps', 'the border towns', 'the industrial belt']); } },
    { id: 'munitions', w: 2, cond: function () { return L(); },
      title: 'A cache of orbital munitions',
      text: 'Engineers have found an intact stockpile of Long War kinetic warheads. {other} has quietly offered to buy them.',
      choices: [
        { t: 'Dismantle them safely', r: function () { tre(-0.005); S().earth = U.clamp(S().earth + 0.5, 0, 100); return 'The warheads are destroyed. One less nightmare on Earth.'; } },
        { t: 'Sell to {otherName}', r: function (c) { tre(0.025); E.changeRel(N(), c.o, 15); G.military.scale(c.o, 1.05); return 'The money is good. You try not to think about where they will land.'; } },
        { t: 'Keep them', r: function () { G.military.scale(N(), 1.06); return 'Your arsenal grows. Neighbours take note.'; } }
      ] },
    { id: 'aicore', w: 1, cond: function () { return L(); },
      title: 'Pre-war AI core recovered',
      text: 'Soldiers recovered a dormant military AI from a bunker. Scientists say it could leap your research forward a decade. Or wake up angry.',
      choices: [
        { t: 'Study it', r: function () { if (U.chance(0.2)) { N().stability -= 15; G.military.scale(N(), 0.92); return 'The AI breaks containment and sabotages the defence grid before it is shut down.'; } N().tech += 5; return 'The AI is a goldmine. Tech +5.'; } },
        { t: 'Destroy it', r: function () { pop(2); return 'Some things are better left buried.'; } }
      ] },
    { id: 'separatists', w: 2, cond: function () { return L() && N().stability < 55; },
      title: 'Separatists in {province}',
      text: 'Armed militias in {province} declare independence. They demand autonomy, or they will fight.',
      choices: [
        { t: 'Negotiate autonomy', r: function () { N().pop *= 0.99; N().stability += 8; E.addMod(N(), 'approval', -3, 2); return 'A deal is struck. The nation is a little smaller but calmer.'; } },
        { t: 'Crush them', r: function () { G.military.scale(N(), 0.95); N().stability += 4; E.addMod(N(), 'approval', E.gov(N()).elections ? -6 : 2, 2); return 'The rebellion is crushed. The scars will last.'; } },
        { t: 'Let them go', r: function () { N().pop *= 0.94; N().gdp *= 0.95; N().stability += 12; return 'The province leaves. Peace, at the cost of land.'; } }
      ],
      ctx: function (c) { c.province = U.pick(['the North', 'the coastal region', 'the eastern highlands', 'the old capital', 'the mining districts']); } },
    { id: 'border', w: 3, cond: function () { return L(); },
      title: 'Border incident with {otherName}',
      text: 'A patrol from {otherName} fired on your border guards. Three are dead. The nation demands a response.',
      pick: function () { var n = N(); var nb = E.alive().filter(function (x) { return n.neighbors.indexOf(x.id) >= 0 && !E.warBetween(n, x); }); return nb.length ? U.pick(nb) : null; },
      choices: [
        { t: 'Demand an apology', r: function (c) { E.changeRel(N(), c.o, -10); if (U.chance(0.5)) { E.changeRel(N(), c.o, 8); return c.o.name + ' apologises. Crisis averted.'; } return c.o.name + ' refuses. Tensions are rising.'; } },
        { t: 'Retaliate', r: function (c) { E.changeRel(N(), c.o, -30); E.addMod(N(), 'approval', 4, 1); if (U.chance(0.25)) { E.declareWar(c.o, N()); return 'Retaliation escalates. ' + c.o.name + ' declares war!'; } return 'Your artillery answers. The message is received.'; } },
        { t: 'Let it go', r: function () { E.addMod(N(), 'approval', -3, 1); pop(-3); return 'You avoid war, but some call you weak.'; } }
      ] },
    { id: 'fusion', w: 1, cond: function () { return L() && N().tech > 70; },
      title: 'Fusion breakthrough',
      text: 'Researchers at {lab} report a stable fusion reaction. Scaling it up will be expensive.',
      choices: [
        { t: 'Fund it fully (3% GDP)', r: function () { tre(-0.03); E.addMod(N(), 'growth', 0.012, 8); N().tech += 2; return 'Fusion plants begin rising across the nation.'; } },
        { t: 'Sell the patents', r: function () { tre(0.02); return 'Others will reap the benefits. Your treasury is happy.'; } }
      ],
      ctx: function (c) { c.lab = U.pick(['the National Institute', 'Tycho Labs', 'the Polytechnic', 'a startup in the capital']); } },
    { id: 'spy', w: 2, cond: function () { return L(); },
      title: 'Spy from {otherName}',
      text: 'Counter-intelligence has caught a spy from {otherName} copying military files.',
      choices: [
        { t: 'Execute publicly', r: function (c) { E.changeRel(N(), c.o, -20); E.addMod(N(), 'approval', 3, 1); return 'A clear message to ' + c.o.name + '.'; } },
        { t: 'Turn them into a double agent', r: function (c) { if (U.chance(0.6)) { N().tech += 2; c.o.tech -= 1; return 'The double agent feeds you secrets for years.'; } return 'The spy escapes back home with even more files.'; } },
        { t: 'Trade them back quietly', r: function (c) { E.changeRel(N(), c.o, 8); tre(0.004); return 'A discreet exchange. ' + c.o.name + ' owes you one.'; } }
      ] },
    { id: 'ruins', w: 2, cond: function () { return L() && S().year < 2150; },
      title: 'The ruins of {city}',
      text: '{city} still lies in ruins from the war. Architects propose a grand reconstruction to make it a symbol of rebirth.',
      choices: [
        { t: 'Build a new capital of hope (4% GDP)', r: function () { tre(-0.04); E.addMod(N(), 'approval', 10, 4); E.addMod(N(), 'growth', 0.01, 5); P().legacy += 3; return 'A gleaming city rises from the ashes.'; } },
        { t: 'Leave it as a memorial', r: function () { E.addMod(N(), 'stability', 3, 3); return 'The ruins remain a monument to the dead.'; } }
      ],
      ctx: function (c) { c.city = U.pick(['the old capital', 'New Harbor', 'Port Meridian', 'the twin cities', 'the southern metropolis']); } },
    { id: 'mercs', w: 2, cond: function () { return L() && E.atWar(N()); },
      title: 'Mercenaries for hire',
      text: 'The {merc}, a battle-hardened private army, offers their services for the war.',
      choices: [
        { t: 'Hire them (1.5% GDP)', r: function () { tre(-0.015); G.military.scale(N(), 1.2); return 'The mercenaries join your lines.'; } },
        { t: 'Decline', r: function () { return 'They sign with someone else.'; } }
      ],
      ctx: function (c) { c.merc = U.pick(['Iron Wolves', 'Black Meridian Group', 'Ashfall Company', 'Ares Contractors']); } },
    { id: 'famine', w: 2, cond: function () { return L() && S().earth < 60; },
      title: 'Crop failure',
      text: 'Ash in the atmosphere has ruined the harvest. Food prices triple overnight.',
      choices: [
        { t: 'Import food (2% GDP)', r: function () { tre(-0.02); return 'Ships arrive with grain. Crisis averted.'; } },
        { t: 'Ration strictly', r: function () { E.addMod(N(), 'approval', -8, 2); N().pop *= 0.995; return 'Hunger spreads, but the state survives.'; } }
      ] },
    { id: 'general', w: 2, cond: function () { return L() && N().stability < 65; },
      title: 'An ambitious general',
      text: 'General {person} is growing popular with the troops and has started making political speeches.',
      choices: [
        { t: 'Promote them to your cabinet', r: function () { inf(-4); N().stability += 4; return 'Keep your friends close, and your rivals closer.'; } },
        { t: 'Force them to retire', r: function () { if (U.chance(0.2)) { N().stability -= 15; return 'The general refuses and takes several regiments with them. A dangerous rift.'; } inf(5); return 'The general retires quietly. For now.'; } },
        { t: 'Arrest them', r: function () { inf(8); N().stability -= 5; E.addMod(N(), 'approval', E.gov(N()).elections ? -5 : 0, 2); return 'The general is in a cell. The army is watching you.'; } }
      ] },
    { id: 'donation', w: 2, cond: function () { return L(); },
      title: 'A generous donation',
      text: '{company} offers a massive donation to the state, asking only for some regulatory flexibility in return.',
      choices: [
        { t: 'Accept', r: function () { tre(0.02); E.addMod(N(), 'approval', -3, 2); if (U.chance(0.25)) { pop(-8); return 'Journalists expose the deal. Scandal!'; } return 'The money flows in. Nobody asks questions. Yet.'; } },
        { t: 'Refuse', r: function () { pop(3); return 'You cannot be bought. The public notices.'; } }
      ] },
    { id: 'vault', w: 1, cond: function () { return L(); },
      title: 'Seed vault discovered',
      text: 'Explorers found a pre-war seed and gene vault, intact under {place}.',
      choices: [
        { t: 'Share it with the world', r: function () { S().earth = U.clamp(S().earth + 3, 0, 100); E.alive().forEach(function (x) { if (x !== N()) E.changeRel(N(), x, 5); }); P().legacy += 3; return 'Every nation benefits. Your name is praised worldwide.'; } },
        { t: 'Keep it for ourselves', r: function () { E.addMod(N(), 'growth', 0.008, 6); S().earth = U.clamp(S().earth + 1, 0, 100); return 'Your farms will be the envy of the world.'; } }
      ],
      ctx: function (c) { c.place = U.pick(['a glacier', 'an abandoned bunker', 'a collapsed university', 'the old botanical gardens']); } },
    { id: 'alliance', w: 2, cond: function () { return L(); },
      title: '{otherName} proposes a pact',
      text: 'Envoys from {otherName} propose a non-aggression pact and closer trade ties.',
      pick: function () { var c = E.alive().filter(function (x) { return x !== N() && !E.warBetween(N(), x) && !E.hasPact(N(), x, 'nap') && E.relation(N(), x) > -10; }); return c.length ? U.pick(c) : null; },
      choices: [
        { t: 'Accept', r: function (c) { E.addPact(N(), c.o, 'nap', 15); E.changeRel(N(), c.o, 15); E.addMod(N(), 'growth', 0.003, 10); return 'Pact signed with ' + c.o.name + '.'; } },
        { t: 'Decline', r: function (c) { E.changeRel(N(), c.o, -8); return c.o.name + ' is offended.'; } }
      ] },
    { id: 'spaceaccident', w: 2, cond: function () { return L() && N().space > 20; },
      title: 'Disaster in orbit',
      text: 'The {ship} exploded during launch. All crew are lost. The nation is in shock.',
      choices: [
        { t: 'Honest investigation', r: function () { E.addMod(N(), 'space', -0.3, 2); pop(3); return 'The truth hurts, but the programme will be safer.'; } },
        { t: 'Cover it up', r: function () { if (U.chance(0.4)) { pop(-10); E.addMod(N(), 'approval', -6, 2); return 'Leaked footage destroys your credibility.'; } return 'The story is buried. The launches go on.'; } },
        { t: 'Push on harder', r: function () { E.addMod(N(), 'space', 0.3, 3); E.addMod(N(), 'approval', -3, 2); return 'Their sacrifice will not be in vain.'; } }
      ],
      ctx: function (c) { c.ship = U.pick(['Odyssey VII', 'Pathfinder Ares', 'Hope of Dawn', 'Ironclad Lifter', 'Vanguard-9']); } },
    { id: 'colonyind', w: 2, cond: function () { return L() && E.milestoneIndex(N()) >= 2; },
      title: 'The colonists demand rights',
      text: 'Your off-world colonists complain of "taxation without representation" and threaten to stop shipments.',
      choices: [
        { t: 'Grant them representation', r: function () { N().stability += 3; E.addMod(N(), 'space', 0.2, 5); return 'The colonies rejoice. Productivity soars.'; } },
        { t: 'Send in the marines', r: function () { E.addMod(N(), 'space', -0.2, 3); G.military.scale(N(), 0.98); return 'Order is restored. Resentment simmers in the domes.'; } }
      ] },
    { id: 'cult', w: 1, cond: function () { return L(); },
      title: 'The Children of the Ash',
      text: 'An apocalyptic movement preaching that humanity must abandon Earth is gaining millions of followers.',
      choices: [
        { t: 'Channel them into the space programme', r: function () { E.addMod(N(), 'space', 0.25, 5); N().stability -= 3; return 'The faithful volunteer for the colony ships in droves.'; } },
        { t: 'Ban the movement', r: function () { N().stability += 2; E.addMod(N(), 'approval', -4, 2); return 'The movement goes underground.'; } },
        { t: 'Ignore it', r: function () { N().stability -= 5; return 'The movement keeps growing.'; } }
      ] },
    { id: 'strike', w: 2, cond: function () { return L(); },
      title: 'General strike',
      text: 'Workers in {sector} walk off the job, demanding higher wages and safer conditions.',
      choices: [
        { t: 'Meet their demands', r: function () { tre(-0.01); E.addMod(N(), 'approval', 4, 2); return 'Work resumes. The unions remember who helped them.'; } },
        { t: 'Break the strike', r: function () { E.addMod(N(), 'approval', -6, 2); N().stability -= 3; return 'Strikers are replaced by automation. Anger festers.'; } }
      ],
      ctx: function (c) { c.sector = U.pick(['the fusion plants', 'the shipyards', 'the mining sector', 'the transport network', 'the orbital factories']); } },
    { id: 'tribute-demand', w: 2, cond: function () { if (!L()) return false; var n = N(); return E.alive().some(function (x) { return E.power(x) > E.power(n) * 2 && E.relation(x, n) < 10; }); },
      title: 'An ultimatum from {otherName}',
      text: '{otherName} demands tribute from you, or "consequences will follow".',
      pick: function () { var n = N(); var c = E.alive().filter(function (x) { return E.power(x) > E.power(n) * 2 && E.relation(x, n) < 10 && !E.warBetween(n, x); }); return c.length ? U.pick(c) : null; },
      choices: [
        { t: 'Pay (2% GDP)', r: function (c) { tre(-0.02); c.o.treasury += N().gdp * 0.02; E.changeRel(N(), c.o, 10); E.addMod(N(), 'approval', -5, 2); return 'You pay. The humiliation stings.'; } },
        { t: 'Refuse', r: function (c) { E.changeRel(N(), c.o, -20); E.addMod(N(), 'approval', 5, 2); if (U.chance(0.35)) { E.declareWar(c.o, N()); return c.o.name + ' makes good on its threat. War!'; } return 'They bluster, but do not strike. For now.'; } }
      ] },

    // ---------- Personal events (all roles) ----------
    { id: 'assassin', w: 1, cond: function () { return L() || P().influence > 50; },
      title: 'Assassination attempt',
      text: 'An assassin\'s drone was intercepted metres from you. Your security chief warns there will be more.',
      choices: [
        { t: 'Tighten security', r: function () { if (L()) tre(-0.004); else wealth(-5); return 'Armoured cars and body doubles. You feel safer.'; } },
        { t: 'Show no fear', r: function () { pop(6); if (U.chance(0.15 * (1 - G.character.standing('intel') / 150))) { E.killPlayer('was killed by an assassin'); return 'The next attempt does not miss.'; } return 'Your courage inspires the nation.'; } }
      ] },
    { id: 'scandal', w: 2,
      title: 'Scandal!',
      text: 'A tabloid claims you {scandal}. Your rivals smell blood.',
      choices: [
        { t: 'Deny everything', r: function () { if (U.chance(0.5)) { pop(-10); return 'Evidence surfaces. The denial makes it worse.'; } return 'The story fades.'; } },
        { t: 'Confess and apologise', r: function () { pop(-4); inf(-2); return 'Honesty costs you, but the story dies quickly.'; } },
        { t: 'Bribe the journalist', r: function () { wealth(-10); if (U.chance(0.3)) { pop(-15); return 'The bribe is recorded and published. Disaster.'; } return 'The story disappears.'; } }
      ],
      ctx: function (c) { c.scandal = U.pick(['hoarded food during the war', 'have a secret family on the Moon', 'took money from ' + G.names.company(), 'faked your war record', 'sold medicine on the black market']); } },
    { id: 'heir', w: 1, cond: function () { return P().age > 35 && P().heirBonus < 10; },
      title: 'The next generation',
      text: 'Your child, {child}, wants to follow in your footsteps.',
      choices: [
        { t: 'Mentor them personally', r: function () { P().heirBonus += 10; inf(-2); return '{child} learns the art of power at your side.'; } },
        { t: 'Keep them out of it', r: function () { return 'You want a better life for them.'; } }
      ],
      ctx: function (c) { c.child = G.names.first(N().culture) + ' ' + P().dynasty; } },
    { id: 'health', w: 2, cond: function () { return P().age > 62; },
      title: 'Health scare',
      text: 'Your doctors find something worrying. At {age}, they recommend you slow down.',
      choices: [
        { t: 'Expensive gene therapy', r: function () { wealth(-Math.min(P().wealth, 20)); P().age -= 3; return 'The treatment works. You feel younger.'; } },
        { t: 'Ignore it and keep working', r: function () { if (U.chance(0.15)) { E.killPlayer('collapsed and died while working'); return 'Your body gives out.'; } return 'You push on. For now.'; } },
        { t: 'Retire and pass the torch', r: function () { S().succession = { reason: 'retire', dead: true, wasLeader: L(), text: P().name + ' retires from public life. Who carries on the legacy?' }; return 'You step down.'; } }
      ],
      ctx: function (c) { c.age = P().age; } },

    // ---------- Role-specific ----------
    { id: 'pol-debate', w: 3, cond: function () { return P().role === 'politician'; },
      title: 'Televised debate',
      text: 'You are invited to debate {leader}, the {title}, live in front of the nation.',
      choices: [
        { t: 'Go on the attack', r: function () { if (U.chance(0.5 + (P().popularity - 40) / 100)) { pop(10); E.addMod(N(), 'approval', -4, 1); return 'You crush the debate. The nation is talking about you.'; } pop(-6); return 'You come across as bitter and angry.'; } },
        { t: 'Stay calm and visionary', r: function () { pop(5); inf(2); return 'A solid performance. Your vision resonates.'; } },
        { t: 'Decline', r: function () { pop(-2); return 'Your rivals call you a coward.'; } }
      ],
      ctx: function (c) { c.leader = N().leader ? N().leader.name : 'the ruler'; c.title = E.title(N()); } },
    { id: 'pol-offer', w: 2, cond: function () { return P().role === 'politician'; },
      title: 'An offer from the government',
      text: '{leader} offers you a ministry in exchange for ending your opposition.',
      choices: [
        { t: 'Accept the ministry', r: function () { inf(12); pop(-8); return 'You are inside the system now. Some supporters feel betrayed.'; } },
        { t: 'Refuse publicly', r: function () { pop(8); inf(-3); return 'Your integrity wins hearts.'; } }
      ],
      ctx: function (c) { c.leader = N().leader ? N().leader.name : 'The government'; } },
    { id: 'gen-order', w: 3, cond: function () { return P().role === 'general'; },
      title: 'Orders from above',
      text: '{leader} orders you to suppress protests in {city} with live ammunition.',
      choices: [
        { t: 'Obey', r: function () { inf(5); pop(-10); N().stability += 5; return 'The protests end in blood. The regime trusts you more.'; } },
        { t: 'Refuse', r: function () { pop(12); inf(-8); if (U.chance(0.2)) { inf(-10); return 'You are relieved of command and lose many allies.'; } return 'Your men stand down. The people hail you as a hero.'; } },
        { t: 'Side with the protesters', r: function () { pop(15); N().stability -= 10; inf(4); return 'Your troops join the crowds. The government is shaken.'; } }
      ],
      ctx: function (c) { c.leader = N().leader ? N().leader.name : 'The government'; c.city = U.pick(['the capital', 'the port city', 'the industrial belt', 'the university district']); } },
    { id: 'gen-contract', w: 2, cond: function () { return P().role === 'general'; },
      title: 'An arms dealer\'s offer',
      text: 'A representative from {company} offers you a "consulting fee" to recommend their new drone system.',
      choices: [
        { t: 'Take the money', r: function () { wealth(25); if (U.chance(0.25)) { pop(-10); inf(-5); return 'Military police find the payments. Scandal.'; } return 'Your bank account grows.'; } },
        { t: 'Report them', r: function () { pop(5); inf(3); return 'You are seen as incorruptible.'; } }
      ] },
    { id: 'corp-merger', w: 3, cond: function () { return P().role === 'corporate'; },
      title: 'Merger opportunity',
      text: '{company} is struggling. You could buy it cheaply, but it has toxic debts.',
      choices: [
        { t: 'Buy it', r: function () { wealth(-30); if (U.chance(0.65)) { wealth(90); inf(4); return 'The merger pays off brilliantly.'; } return 'The debts are worse than you thought. Expensive lesson.'; } },
        { t: 'Pass', r: function () { return 'A rival snaps it up instead.'; } }
      ] },
    { id: 'corp-black', w: 2, cond: function () { return P().role === 'corporate'; },
      title: 'Black market contract',
      text: 'Smugglers want to use your shipping lanes to move weapons to {otherName}. The pay is enormous.',
      choices: [
        { t: 'Accept', r: function (c) { wealth(120); G.military.scale(c.o, 1.03); if (U.chance(0.3)) { inf(-15); pop(-12); return 'Customs agents raid your warehouses. Your reputation is in tatters.'; } return 'The money comes in. You sleep less well.'; } },
        { t: 'Decline', r: function () { return 'You keep your hands clean.'; } }
      ] },
    { id: 'corp-strike', w: 2, cond: function () { return P().role === 'corporate'; },
      title: 'Workers revolt',
      text: 'Workers at your {site} demand better conditions and have occupied the facility.',
      choices: [
        { t: 'Raise wages', r: function () { wealth(-20); pop(6); return 'Production resumes. The press praises you.'; } },
        { t: 'Replace them with robots', r: function () { wealth(10); pop(-8); return 'The factory hums with machines. Outside, the protests grow.'; } }
      ],
      ctx: function (c) { c.site = U.pick(['orbital shipyard', 'lithium mine', 'fusion plant', 'arcology', 'drone factory']); } },

    // ---------- Late-game ----------
    { id: 'signal', w: 1, cond: function () { return S().year > 2300 && L(); },
      title: 'A signal from the stars',
      text: 'Deep-space arrays detect a repeating, artificial signal from {star}. The world holds its breath.',
      choices: [
        { t: 'Reply', r: function () { N().tech += 5; S().earth += 1; E.alive().forEach(function (x) { x.stability -= 3; }); P().legacy += 5; return 'Humanity speaks to the cosmos. Society is shaken, but science leaps forward.'; } },
        { t: 'Classify it', r: function () { N().tech += 3; inf(5); return 'Only your scientists know. Their research accelerates in secret.'; } }
      ],
      ctx: function (c) { c.star = U.pick(['Tau Ceti', 'Proxima Centauri', 'TRAPPIST-1', 'Epsilon Eridani', 'Gliese 581']); } },
    { id: 'mars-rebel', w: 1, cond: function () { return E.milestoneIndex(N()) >= 4 && L(); },
      title: 'Martian independence movement',
      text: 'Second-generation Martians no longer feel loyal to Earth. A movement called Red Dawn wants full independence.',
      choices: [
        { t: 'Grant broad autonomy', r: function () { E.addMod(N(), 'space', 0.15, 10); E.addMod(N(), 'growth', -0.003, 5); return 'Mars governs itself, but trades freely with you.'; } },
        { t: 'Hold on at all costs', r: function () { G.military.scale(N(), 0.95); N().stability -= 4; E.addMod(N(), 'space', 0.05, 5); return 'Troopships head for Mars. This will not be the last uprising.'; } }
      ] },
    // ---------- Queued (not random) ----------
    { id: 'call-to-arms', w: 0, cond: function () { return false; },
      title: '{otherName} calls you to arms',
      text: '{enemyName} has gone to war with your ally {otherName}. Your treaty says you must fight at their side.',
      choices: [
        { t: 'Honour the alliance: declare war on {enemyName}', r: function (c) {
          var enemy = E.nation(c.eid), me = N();
          if (!enemy || !enemy.alive || !c.o || !c.o.alive) return 'The war is already over.';
          if (E.warBetween(me, enemy)) return 'You are already at war with ' + enemy.name + '.';
          var parentAlive = G.state.wars.some(function (w) { return w.id === c.war; });
          E.declareWar(me, enemy, { parent: parentAlive ? c.war : null, quiet: true });
          E.log('🛡️ ' + me.name + ' honours its alliance with ' + c.o.name + ' and declares war on ' + enemy.name + '!', 'player');
          E.changeRel(me, c.o, 15);
          return 'Your forces mobilise alongside ' + c.o.name + '.';
        } },
        { t: 'Stay out of it (breaks the alliance)', r: function (c) {
          if (c.o) { E.breakAlliance(N(), c.o); E.changeRel(N(), c.o, -40); }
          pop(-5);
          E.log('🐍 ' + N().name + ' refuses to help ' + (c.o ? c.o.name : 'its ally') + '. The alliance is broken.', 'player');
          return 'You keep out of the war. Your former ally will not forget this.';
        } }
      ] }
  ];

  // Events that must be shown (e.g. calls to arms) wait in a queue ahead of random events.
  function queue(ev) {
    var s = G.state;
    s.eventQueue = s.eventQueue || [];
    if (s.eventQueue.some(function (x) { return x.id === ev.id && x.ctx.oid === ev.ctx.oid && x.ctx.eid === ev.ctx.eid; })) return;
    s.eventQueue.push(ev);
  }
  function next() {
    var s = G.state;
    if (s.eventQueue && s.eventQueue.length) return s.eventQueue.shift();
    return roll();
  }
  function hasQueued() { return !!(G.state.eventQueue && G.state.eventQueue.length); }

  function eligible() {
    return defs.filter(function (d) { return !d.cond || d.cond(); });
  }

  function roll() {
    if (!U.chance(0.75)) return null;
    var pool = eligible();
    if (!pool.length) return null;
    var total = pool.reduce(function (a, d) { return a + d.w; }, 0), r = U.rand() * total, d = pool[0];
    for (var i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { d = pool[i]; break; } }
    var o = d.pick ? d.pick() : U.pick(E.alive().filter(function (x) { return x !== N(); }));
    if (!o) return null;
    var c = { o: o, otherName: o.name, other: o.name, person: G.names.full(N().culture), company: G.names.company() };
    if (d.ctx) d.ctx(c);
    // Store only serialisable context.
    var store = {};
    for (var k in c) if (k !== 'o') store[k] = c[k];
    store.oid = o.id;
    return { id: d.id, ctx: store };
  }

  function view(ev) {
    var d = defs.filter(function (x) { return x.id === ev.id; })[0];
    return {
      title: U.fill(d.title, ev.ctx),
      text: U.fill(d.text, ev.ctx),
      choices: d.choices.map(function (ch) { return U.fill(ch.t, ev.ctx); })
    };
  }

  function choose(ev, i) {
    var d = defs.filter(function (x) { return x.id === ev.id; })[0];
    var c = Object.assign({}, ev.ctx, { o: E.nation(ev.ctx.oid) });
    var res = U.fill(d.choices[i].r(c) || '', ev.ctx);
    // Show queued events (calls to arms) next, if any.
    G.state.event = hasQueued() ? G.state.eventQueue.shift() : null;
    E.save();
    return res;
  }

  return { roll: roll, next: next, queue: queue, hasQueued: hasQueued, view: view, choose: choose, defs: defs };
})();
