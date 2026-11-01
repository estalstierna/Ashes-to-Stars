// More events: economy, disasters, diplomacy, science, society, role-specific and late-game.
// They are appended to G.events.defs and use the same format (see events.js).
(function () {
  var U = G.util, E = G.engine, R = G.research, M = G.military, C = G.character;
  function S() { return G.state; }
  function P() { return G.state.player; }
  function N() { return E.pn(); }
  function L() { return E.isLeader(); }
  function inf(d) { P().influence = U.clamp(P().influence + d, 0, 100); }
  function pop(d) { P().popularity = U.clamp(P().popularity + d, 0, 100); }
  function wealth(d) { P().wealth = Math.max(0, P().wealth + d); }
  function tre(frac) { N().treasury += N().gdp * frac; }
  function others() { return E.alive().filter(function (x) { return x !== N(); }); }
  function city() { return U.pick(['the capital', 'the port city', 'the northern provinces', 'the river delta', 'the industrial heartland', 'the old capital']); }

  var more = [
    // ---------- Disasters & environment ----------
    { id: 'quake', w: 2, cond: L,
      title: 'Earthquake in {city}',
      text: 'A massive earthquake has levelled much of {city}. Thousands are trapped under the rubble.',
      choices: [
        { t: 'Full relief effort (2% GDP)', r: function () { tre(-0.02); E.addMod(N(), 'approval', 6, 2); pop(4); return 'Rescue teams work day and night. The nation sees a leader who cares.'; } },
        { t: 'Ask allies and the world for help', r: function () {
          var al = E.allies(N());
          if (al.length) { al.forEach(function (a) { E.changeRel(N(), a, 5); }); tre(-0.005); return al.map(function (a) { return a.short; }).join(', ') + ' send aid. Your bonds grow stronger.'; }
          tre(-0.012); E.addMod(N(), 'approval', 2, 2); return 'A few nations send help, but you carry most of the cost yourself.';
        } },
        { t: 'Minimal response', r: function () { N().pop *= 0.997; E.addMod(N(), 'approval', -8, 3); return 'The death toll climbs. So does the anger.'; } }
      ],
      ctx: function (c) { c.city = city(); } },
    { id: 'seas', w: 1, cond: function () { return L() && S().earth < 70; },
      title: 'The seas are rising',
      text: 'Storm surges are flooding {city} every winter. Engineers say it will be underwater within a generation.',
      choices: [
        { t: 'Build giant sea walls (2% GDP)', r: function () { tre(-0.02); E.addMod(N(), 'growth', 0.003, 10); return 'The walls hold back the sea. Construction jobs boom.'; } },
        { t: 'Relocate the population', r: function () { E.addMod(N(), 'approval', -4, 3); E.addMod(N(), 'growth', -0.004, 3); return 'A painful exodus begins. Ancient neighbourhoods are left to the waves.'; } },
        { t: 'Invest in Earth restoration instead', r: function () { tre(-0.015); S().earth = U.clamp(S().earth + 1.5, 0, 100); return 'You fight the cause, not the symptom. Earth Health +1.5.'; } }
      ],
      ctx: function (c) { c.city = city(); } },
    { id: 'rareearth', w: 2, cond: L,
      title: 'Rare earth deposits found',
      text: 'Geologists found huge deposits of rare earth metals under a protected wilderness in {region}.',
      choices: [
        { t: 'Mine it all', r: function () { E.addMod(N(), 'growth', 0.008, 8); S().earth = U.clamp(S().earth - 1, 0, 100); C.change('business', 6); return 'The mines open. Money flows, rivers turn grey.'; } },
        { t: 'Mine carefully (slower, cleaner)', r: function () { E.addMod(N(), 'growth', 0.004, 8); tre(-0.005); return 'Modern methods keep the damage small.'; } },
        { t: 'Protect the wilderness', r: function () { S().earth = U.clamp(S().earth + 0.5, 0, 100); E.addMod(N(), 'approval', 2, 2); C.change('business', -4); return 'The forest stays. Environmentalists cheer, investors sulk.'; } }
      ],
      ctx: function (c) { c.region = U.pick(['the northern tundra', 'the mountains', 'the old national park', 'the eastern forests']); } },

    // ---------- Economy ----------
    { id: 'crash', w: 2, cond: L,
      title: 'Market crash',
      text: 'The stock exchange lost a third of its value in one day. Banks are wobbling and panic spreads.',
      choices: [
        { t: 'Bail out the banks (3% GDP)', r: function () { tre(-0.03); C.change('business', 10); E.addMod(N(), 'approval', -3, 2); return 'Calm returns to the markets. Ordinary people ask why bankers were saved.'; } },
        { t: 'Let it burn', r: function () { E.addMod(N(), 'growth', -0.02, 2); C.change('business', -10); return 'A painful recession follows. The weakest firms die.'; } },
        { t: 'Nationalise the banks', r: function () { tre(0.01); C.change('business', -15); C.change('public', 6); N().stability -= 3; return 'The state now owns the banks. The left celebrates, investors flee.'; } }
      ] },
    { id: 'braindrain', w: 2, cond: L,
      title: 'Brain drain to {otherName}',
      text: 'Your best scientists are leaving for laboratories in {otherName}, lured by double salaries.',
      pick: function () { var c = others().filter(function (x) { return x.tech > N().tech; }); return c.length ? U.pick(c) : null; },
      choices: [
        { t: 'Match their salaries (1% GDP)', r: function () { tre(-0.01); R.boost(N(), 1); return 'Most stay. The labs hum with new projects.'; } },
        { t: 'Let them go', r: function (c) { N().tech -= 1; c.o.tech += 1; return c.o.name + ' gains what you lose.'; } },
        { t: 'Ban emigration of scientists', r: function () { E.addMod(N(), 'approval', -3, 2); C.change('intel', 4); return 'Passports are confiscated. The scientists stay, sullen and unproductive.'; } }
      ] },
    { id: 'automation-riots', w: 2, cond: function () { return L() && N().tech > 90; },
      title: 'Automation riots',
      text: 'Millions of workers replaced by robots are rioting in {city}. They want a future.',
      choices: [
        { t: 'Universal basic income (1.5% GDP)', r: function () { tre(-0.015); E.addMod(N(), 'approval', 6, 4); E.addMod(N(), 'growth', -0.002, 4); return 'A monthly cheque for every citizen. The riots end.'; } },
        { t: 'Retraining programmes (0.5% GDP)', r: function () { tre(-0.005); E.addMod(N(), 'growth', 0.003, 6); E.addMod(N(), 'stability', -3, 2); return 'Slow and imperfect, but people learn new trades.'; } },
        { t: 'Send in the riot police', r: function () { N().stability -= 6; C.change('public', -8); return 'Order is restored. The anger goes underground.'; } }
      ],
      ctx: function (c) { c.city = city(); } },
    { id: 'debtcrisis', w: 3, cond: function () { return L() && E.debtRatio(N()) > 0.8; },
      title: 'Debt crisis',
      text: 'Lenders are panicking about your national debt ({debt} of GDP). Interest rates are spiking.',
      choices: [
        { t: 'Austerity: cut spending hard', r: function () { var n = N(); E.SECTORS.forEach(function (k) { n.spend[k] *= 0.85; }); E.addMod(n, 'approval', -10, 3); return 'Budgets are slashed by 15%. Protesters fill the streets.'; } },
        { t: 'Default on half the debt', r: function () { var n = N(); n.treasury /= 2; n.stability -= 12; E.alive().forEach(function (x) { if (x !== n) E.changeRel(n, x, -10); }); E.addMod(n, 'growth', -0.02, 3); return 'Half the debt vanishes, and so does the world\'s trust in you.'; } },
        { t: 'Print money', r: function () { var n = N(); n.treasury += n.gdp * 0.1; E.addMod(n, 'growth', -0.012, 4); E.addMod(n, 'approval', -4, 3); return 'Inflation soars. The debt shrinks in real terms, and so do savings.'; } }
      ],
      ctx: function (c) { c.debt = Math.round(E.debtRatio(N()) * 100) + '%'; } },
    { id: 'goldenage', w: 1, cond: function () { return L() && N().approval > 65 && (N().growth || 0) > 0.03; },
      title: 'A golden age',
      text: 'Art, music and invention are flourishing. Historians are already calling this era a golden age.',
      choices: [
        { t: 'Celebrate with a grand world exhibition (1% GDP)', r: function () { tre(-0.01); P().legacy += 5; others().forEach(function (x) { E.changeRel(N(), x, 4); }); return 'Visitors from every nation marvel at your achievements.'; } },
        { t: 'Channel it into science', r: function () { R.boost(N(), 3); return 'A generation of brilliant minds turns to the laboratories.'; } }
      ] },

    // ---------- Diplomacy & security ----------
    { id: 'cyberattack', w: 2, cond: L,
      title: 'Cyberattack from {otherName}',
      text: 'Hackers traced to {otherName} have shut down power grids across half the country.',
      pick: function () { var c = others().filter(function (x) { return E.relation(N(), x) < 10; }); return c.length ? U.pick(c) : null; },
      choices: [
        { t: 'Hack back', r: function (c) { E.changeRel(N(), c.o, -15); C.change('intel', 6); c.o.stability -= 3; return 'Your hackers black out ' + c.o.short + '\'s capital for a night.'; } },
        { t: 'Harden our networks (0.5% GDP)', r: function () { tre(-0.005); E.addMod(N(), 'stability', 2, 5); return 'New firewalls go up. The next attack will hit a wall.'; } },
        { t: 'Denounce them publicly', r: function (c) { E.changeRel(N(), c.o, -10); E.addMod(N(), 'approval', 3, 2); return 'The world hears your accusation. ' + c.o.short + ' denies everything.'; } }
      ] },
    { id: 'superweapon', w: 2, cond: L,
      title: '{otherName} tests a superweapon',
      text: '{otherName} has tested a new orbital weapon. Your generals are alarmed.',
      pick: function () { var c = others().filter(function (x) { return E.power(x) > E.power(N()) * 0.6 && !E.allied(N(), x); }); return c.length ? U.pick(c) : null; },
      choices: [
        { t: 'Match it: crash weapons programme (1.5% GDP)', r: function () { tre(-0.015); M.scale(N(), 1.06); C.change('military', 6); return 'Your own weapons programme accelerates.'; } },
        { t: 'Propose an arms-control treaty', r: function (c) { if (U.chance(U.clamp(0.3 + E.relation(N(), c.o) / 100, 0.1, 0.8))) { E.addPact(N(), c.o, 'nap', 15); E.changeRel(N(), c.o, 15); return 'A treaty is signed: 15 years of non-aggression.'; } E.changeRel(N(), c.o, -5); return c.o.short + ' laughs off your proposal.'; } },
        { t: 'Ignore it', r: function () { N().stability -= 3; C.change('military', -4); return 'The public is uneasy. Your generals are furious.'; } }
      ] },
    { id: 'defector', w: 2, cond: L,
      title: 'A defector from {otherName}',
      text: 'General {person} of {otherName} has fled to your embassy with a hard drive full of military secrets.',
      ctx: function (c) { c.person = G.names.full(c.o.culture); },
      choices: [
        { t: 'Grant asylum and take the secrets', r: function (c) { N().tech += 1; M.scale(N(), 1.03); E.changeRel(N(), c.o, -20); C.change('intel', 6); return 'The secrets are priceless. ' + c.o.short + ' is livid.'; } },
        { t: 'Send the general back', r: function (c) { E.changeRel(N(), c.o, 15); return c.o.short + ' appreciates the gesture. The general\'s fate is not your problem.'; } }
      ] },
    { id: 'summit', w: 2, cond: L,
      title: 'World summit in {city}',
      text: 'World leaders are gathering in {city} to discuss the future of the planet. Your presence is requested.',
      ctx: function (c) { c.city = U.pick(['Reykjavík', 'Singapore', 'Nairobi', 'Geneva', 'Lunar Artemis Colony', 'Brasília']); },
      choices: [
        { t: 'Attend and lead the talks', r: function () { others().forEach(function (x) { if (U.chance(0.6)) E.changeRel(N(), x, 5); }); inf(4); P().legacy += 1; return 'You return home a statesman.'; } },
        { t: 'Boycott it', r: function () { others().forEach(function (x) { if (U.chance(0.4)) E.changeRel(N(), x, -3); }); C.change('public', 3); return 'Nationalists cheer your defiance. Diplomats wince.'; } }
      ] },
    { id: 'meddling', w: 2, cond: function () { return L() && E.gov(N()).elections; },
      title: 'Election meddling',
      text: 'Intelligence shows {otherName} is running a disinformation campaign to influence your next election.',
      pick: function () { var c = others().filter(function (x) { return E.relation(N(), x) < 20; }); return c.length ? U.pick(c) : null; },
      choices: [
        { t: 'Expose them', r: function (c) { E.changeRel(N(), c.o, -20); E.addMod(N(), 'approval', 4, 2); return 'Their bots are unmasked. The public rallies behind you.'; } },
        { t: 'Quietly counter it', r: function () { tre(-0.003); C.change('intel', 5); return 'Your agents neutralise the campaign without a word.'; } },
        { t: 'Ignore it', r: function () { N().stability -= 4; E.addMod(N(), 'approval', -3, 2); return 'Conspiracy theories spread like wildfire.'; } }
      ] },
    { id: 'allyaid', w: 2, cond: function () { return L() && E.allies(N()).length > 0; },
      title: '{otherName} asks for aid',
      text: 'Your ally {otherName} is struggling and asks for economic aid.',
      pick: function () { var a = E.allies(N()); return a.length ? U.pick(a) : null; },
      choices: [
        { t: 'Send aid (1% GDP)', r: function (c) { tre(-0.01); c.o.treasury += N().gdp * 0.01; E.changeRel(N(), c.o, 20); return c.o.short + ' will not forget your generosity.'; } },
        { t: 'Refuse', r: function (c) { E.changeRel(N(), c.o, -12); return c.o.short + ' wonders what your friendship is worth.'; } }
      ] },
    { id: 'smuggling', w: 2, cond: L,
      title: 'Weapons smugglers',
      text: 'Arms dealers are moving weapons through your ports to rebels in {otherName}.',
      choices: [
        { t: 'Shut them down', r: function (c) { E.changeRel(N(), c.o, 10); tre(-0.002); return c.o.short + ' thanks you for your vigilance.'; } },
        { t: 'Tax them quietly', r: function (c) { tre(0.006); c.o.stability -= 4; if (U.chance(0.3)) { E.changeRel(N(), c.o, -25); return c.o.short + ' found out. Relations crash.'; } return 'Easy money. ' + c.o.short + '\'s rebels grow bolder.'; } }
      ] },
    { id: 'occupied-envoys', w: 3, cond: function () { return L() && E.occupiedBy(N()).length > 0; },
      title: 'Envoys from occupied {occName}',
      text: 'Elders from occupied {occName} beg for their own parliament and the right to their language.',
      ctx: function (c) { var d = U.pick(E.occupiedBy(N())); c.occ = d.id; c.occName = d.name; },
      choices: [
        { t: 'Grant local autonomy', r: function (c) { var d = E.nation(c.occ), o = E.occupation(d); o.integ = Math.min(100, o.integ + 10); o.unrest = Math.max(0, o.unrest - 15); C.change('public', -2); return 'Local self-rule calms the region. Integration accelerates.'; } },
        { t: 'Refuse', r: function (c) { var o = E.occupation(E.nation(c.occ)); o.unrest = Math.min(100, o.unrest + 15); return 'The envoys leave in silence. The resistance grows.'; } },
        { t: 'Arrest the envoys', r: function (c) { var o = E.occupation(E.nation(c.occ)); o.unrest = Math.min(100, o.unrest + 25); C.change('intel', 3); return 'A grave mistake. The whole region seethes.'; } }
      ] },
    { id: 'veterans', w: 2, cond: function () { return L() && N().warYears > 2; },
      title: 'Veterans march on the capital',
      text: 'Hundreds of thousands of war veterans demand pensions and medical care.',
      choices: [
        { t: 'Pay generous pensions (1% GDP)', r: function () { tre(-0.01); C.change('military', 10); E.addMod(N(), 'approval', 3, 2); return 'The veterans go home with dignity.'; } },
        { t: 'Promise to look into it', r: function () { C.change('military', -8); N().stability -= 3; return 'Empty words. The veterans will remember.'; } }
      ] },

    // ---------- Science & space ----------
    { id: 'ai-rights', w: 1, cond: function () { return L() && N().tech > 150; },
      title: 'The machines ask for rights',
      text: 'A network of artificial minds has formally petitioned for citizenship.',
      choices: [
        { t: 'Grant them rights', r: function () { R.boost(N(), 3); N().stability -= 3; return 'Silicon citizens join society. Research soars, traditionalists rage.'; } },
        { t: 'Refuse', r: function () { N().stability += 2; if (U.chance(0.2)) { N().tech -= 2; return 'Some of the minds delete themselves in protest, taking research with them.'; } return 'The machines go quiet. Nobody knows what they think.'; } }
      ] },
    { id: 'asteroid', w: 1, cond: function () { return L() && E.milestoneIndex(N()) >= 3; },
      title: 'Asteroid on collision course',
      text: 'Telescopes detect a 2 km asteroid on a collision course with Earth. Impact in eleven years.',
      choices: [
        { t: 'Lead the deflection mission (2% GDP)', r: function () { tre(-0.02); P().legacy += 8; others().forEach(function (x) { E.changeRel(N(), x, 8); }); N().space += 10; return 'Your rockets nudge it aside. The whole world owes you.'; } },
        { t: 'Let the great powers handle it', r: function () { if (U.chance(0.25)) { S().earth = U.clamp(S().earth - 8, 0, 100); E.alive().forEach(function (x) { x.pop *= 0.99; }); return 'The mission fails. Fragments rain down across the oceans.'; } return 'Others deflect it. You watch from the sidelines.'; } }
      ] },
    { id: 'colony-plague', w: 1, cond: function () { return L() && E.milestoneIndex(N()) >= 4; },
      title: 'Plague on Mars',
      text: 'An unknown microbe is spreading through the Martian domes. The colonists beg to be evacuated.',
      choices: [
        { t: 'Quarantine the colony', r: function () { E.addMod(N(), 'space', -0.2, 4); E.addMod(N(), 'approval', -3, 2); return 'Harsh but safe. The colony survives, scarred.'; } },
        { t: 'Evacuate everyone (1.5% GDP)', r: function () { tre(-0.015); if (U.chance(0.2)) { N().pop *= 0.995; return 'The microbe hitches a ride to Earth. A brief but deadly outbreak follows.'; } return 'The colonists come home. Mars stands empty for a while.'; } },
        { t: 'Study the microbe', r: function () { R.boost(N(), 2); E.addMod(N(), 'space', -0.1, 3); return 'The first alien life ever found. Biology will never be the same.'; } }
      ] },
    { id: 'artifact', w: 1, cond: function () { return L() && S().year > 2500 && E.milestoneIndex(N()) >= 6; },
      title: 'An artifact under the ice',
      text: 'Miners on {moon} have found a structure under the ice. It is not human. It is very, very old.',
      ctx: function (c) { c.moon = U.pick(['Europa', 'Enceladus', 'Ganymede', 'Callisto']); },
      choices: [
        { t: 'Study it in secret', r: function () { N().tech += 6; R.boost(N(), 4); C.change('intel', 5); return 'Its secrets slowly unlock. Your scientists leap ahead.'; } },
        { t: 'Share it with all humanity', r: function () { E.alive().forEach(function (x) { x.tech += 3; if (x !== N()) E.changeRel(N(), x, 10); }); P().legacy += 10; return 'Humanity learns together that it is not alone.'; } },
        { t: 'Seal it away', r: function () { N().stability += 4; return 'Some doors are better left closed.'; } }
      ] },

    // ---------- Society ----------
    { id: 'olympics', w: 1, cond: function () { return L() && S().year > 2080 && S().year < 2400; },
      title: 'The Reunification Games',
      text: 'The first global Games since the war need a host. The world is looking at you.',
      choices: [
        { t: 'Host the Games (2% GDP)', r: function () { tre(-0.02); E.addMod(N(), 'approval', 8, 3); others().forEach(function (x) { E.changeRel(N(), x, 5); }); P().legacy += 3; return 'A celebration of a world reborn. Your nation shines.'; } },
        { t: 'Decline', r: function () { return 'Another nation will host. Maybe next time.'; } }
      ] },
    { id: 'youth', w: 2, cond: L,
      title: 'The lost generation',
      text: 'Young people born during the war years are angry, jobless and organising online.',
      choices: [
        { t: 'Massive youth jobs programme (1% GDP)', r: function () { tre(-0.01); E.addMod(N(), 'approval', 4, 3); E.addMod(N(), 'growth', 0.002, 5); C.change('public', 5); return 'A generation gets a second chance.'; } },
        { t: 'Lower the voting age and listen', r: function () { E.addMod(N(), 'stability', 3, 4); pop(4); return 'The young feel heard. Some even vote for you.'; } },
        { t: 'Ban the online movement', r: function () { N().stability -= 4; C.change('media', -6); return 'The movement moves to darker corners of the net.'; } }
      ] },
    { id: 'gov-congress', w: 2, cond: function () { return L() && !E.gov(N()).elections; },
      title: 'The inner circle stirs',
      text: 'Senior figures in your regime are meeting without you. Your spies say they discuss "the succession".',
      choices: [
        { t: 'Reward their loyalty with posts', r: function () { tre(-0.004); inf(3); N().stability += 3; return 'Gifts and titles buy loyalty. For now.'; } },
        { t: 'Purge the plotters', r: function () { C.change('intel', 6); C.change('military', -4); N().stability -= 2; inf(6); return 'Several chairs are suddenly empty.'; } },
        { t: 'Name a successor yourself', r: function () { P().heirBonus = (P().heirBonus || 0) + 8; N().stability += 5; return 'The question is settled. The plotting stops.'; } }
      ] },

    // ---------- Personal ----------
    { id: 'blackmail', w: 2, cond: function () { return P().influence > 35; },
      title: 'Blackmail',
      text: 'An anonymous message: they have recordings that would end your career. They want {amount}.',
      ctx: function (c) { c.amount = '$' + Math.max(5, Math.round(P().wealth * 0.2)) + 'M'; },
      choices: [
        { t: 'Pay', r: function () { wealth(-Math.max(5, P().wealth * 0.2)); return 'The recordings disappear. Probably.'; } },
        { t: 'Call their bluff', r: function () { if (U.chance(0.45)) { pop(-12); inf(-6); return 'The recordings are real, and now everyone has heard them.'; } return 'It was a bluff. You sleep soundly.'; } },
        { t: 'Have the spies find them', r: function () { if (U.chance(0.3 + C.standing('intel') / 150)) { C.change('intel', 3); return 'The blackmailer is found. They will not bother anyone again.'; } pop(-8); return 'The spies fail, and the blackmailer goes public out of spite.'; } }
      ] },
    { id: 'memoir', w: 1, cond: function () { return P().age > 55; },
      title: 'Your memoirs',
      text: 'A publisher offers a fortune for your memoirs.',
      choices: [
        { t: 'Write a careful, flattering book', r: function () { wealth(15); pop(3); return 'A bestseller. Critics call it dull.'; } },
        { t: 'Tell everything', r: function () { wealth(30); pop(8); inf(-8); return 'The book is a sensation. Many former friends stop calling.'; } },
        { t: 'Decline', r: function () { return 'Some stories are better left untold.'; } }
      ] },
    { id: 'family', w: 2, cond: function () { return P().age > 40; },
      title: 'Family trouble',
      text: 'Your child {child} was caught {trouble}. The press is outside your house.',
      ctx: function (c) { c.child = G.names.first(N().culture) + ' ' + P().dynasty; c.trouble = U.pick(['racing a stolen hovercar', 'at an illegal fight club', 'selling state secrets to a podcast', 'partying on a quarantined moon base']); },
      choices: [
        { t: 'Make it go away', r: function () { wealth(-8); if (U.chance(0.3)) { pop(-8); return 'The cover-up leaks. It is worse than the original story.'; } return 'Lawyers and favours make the story vanish.'; } },
        { t: 'Let the law take its course', r: function () { pop(4); P().heirBonus = Math.max(0, (P().heirBonus || 0) - 3); return 'The public respects your integrity. Your child does not.'; } }
      ] },
    { id: 'mentor', w: 2, cond: function () { return P().role !== 'leader' && P().age < 50; },
      title: 'An old lion offers advice',
      text: '{person}, a legendary statesman, offers to take you under their wing.',
      choices: [
        { t: 'Accept gratefully', r: function () { inf(6); C.change('public', 4); C.change('media', 3); return 'Doors open that you did not know existed.'; } },
        { t: 'Politely decline', r: function () { return 'You will find your own way.'; } }
      ] },

    // ---------- Role-specific ----------
    { id: 'pol-defectors', w: 2, cond: function () { return P().role === 'politician'; },
      title: 'Defectors want to join you',
      text: 'A group of lawmakers from the ruling bloc wants to cross the floor and join your movement.',
      choices: [
        { t: 'Welcome them', r: function () { inf(10); C.change('public', 4); if (U.chance(0.25)) { pop(-6); return 'Two of them turn out to be corrupt. The scandal sticks to you.'; } return 'Your movement grows stronger overnight.'; } },
        { t: 'Turn them away', r: function () { pop(3); return 'You keep your movement clean.'; } }
      ] },
    { id: 'gen-assault', w: 3, cond: function () { return P().role === 'general' && E.atWar(N()); },
      title: 'A chance for glory',
      text: 'Your scouts found a gap in the enemy lines. A bold assault could turn the war, or end in a massacre.',
      choices: [
        { t: 'Lead the assault yourself', r: function () {
          var w = E.warsOf(N())[0], sign = w.a === N().id ? 1 : -1;
          if (U.chance(0.1)) { E.killPlayer('died leading a daring assault'); return 'The assault succeeds, but you do not live to see it.'; }
          if (U.chance(0.65)) { w.score = U.clamp(w.score + sign * 20, -100, 100); pop(15); C.change('military', 10); return 'A brilliant victory! Your name is on every lip.'; }
          w.score = U.clamp(w.score - sign * 10, -100, 100); pop(-8); return 'The gap was a trap. Your division is mauled.';
        } },
        { t: 'Hold the line', r: function () { C.change('military', 2); return 'Steady and safe. Nobody writes songs about it.'; } }
      ] },
    { id: 'gen-junta-offer', w: 2, cond: function () { return P().role === 'general' && N().stability < 45; },
      title: 'The colonels come to you',
      text: 'A group of colonels says the government is collapsing. They ask you to "save the nation".',
      choices: [
        { t: 'Listen to them', r: function () { C.change('military', 12); inf(5); return 'The plotters are yours to command. A coup is now much more likely to succeed.'; } },
        { t: 'Report them', r: function () { C.change('military', -10); C.change('public', 6); pop(5); return 'The plotters are arrested. You are hailed as a loyal soldier.'; } }
      ] },
    { id: 'corp-ipo', w: 2, cond: function () { return P().role === 'corporate'; },
      title: 'Going public',
      text: 'Bankers want to float {company} on the stock exchange. It could make you fabulously rich.',
      ctx: function (c) { c.company = P().company || 'your company'; },
      choices: [
        { t: 'Launch the IPO', r: function () { if (U.chance(0.7)) { wealth(P().wealth * 0.5); C.change('business', 6); return 'The shares soar. Your fortune grows by half.'; } wealth(-P().wealth * 0.15); return 'The IPO flops. Embarrassing and expensive.'; } },
        { t: 'Stay private', r: function () { return 'You keep full control.'; } }
      ] },
    { id: 'corp-space', w: 2, cond: function () { return P().role === 'corporate' && E.milestoneIndex(N()) >= 1; },
      title: 'A government space contract',
      text: 'The government is tendering a huge contract to build lunar cargo ships.',
      choices: [
        { t: 'Bid aggressively', r: function () { wealth(-20); if (U.chance(0.4 + C.standing('business') / 200)) { wealth(100); N().space += 6; P().legacy += 2; return 'You win the contract! Your ships will carry humanity outward.'; } return 'A rival wins. The bid money is gone.'; } },
        { t: 'Sit this one out', r: function () { return 'Too risky for now.'; } }
      ] },
    { id: 'corp-union', w: 2, cond: function () { return P().role === 'corporate'; },
      title: 'Robot rights activists',
      text: 'Activists say your factory AIs are sentient and demand they be paid.',
      choices: [
        { t: 'Pay the AIs a symbolic wage', r: function () { wealth(-5); pop(6); return 'A brilliant PR move. Customers love you.'; } },
        { t: 'Dismiss the claims', r: function () { pop(-3); if (U.chance(0.2)) { wealth(-15); return 'The AIs go on strike. Production halts for weeks.'; } return 'The story fades.'; } }
      ] }
  ];
  Array.prototype.push.apply(G.events.defs, more);

  // ---------- World news: things that happen to other nations (no choices) ----------
  var WORLD = [
    function (n) { n.gdp *= 0.985; return '🌋 A volcanic eruption devastates parts of ' + n.name + '.'; },
    function (n) { n.tech += 2; return '🔬 Scientists in ' + n.name + ' announce a major breakthrough.'; },
    function (n) { n.gdp *= 1.02; return '⛏️ ' + n.name + ' discovers vast mineral deposits.'; },
    function (n) { n.stability = Math.max(0, n.stability - 8); return '✊ Mass protests paralyse ' + n.name + '.'; },
    function (n) { E.addMod(n, 'approval', 6, 3); return '🎭 ' + n.name + ' enjoys a cultural renaissance.'; },
    function (n) { n.pop *= 0.995; return '🦠 A disease outbreak sweeps through ' + n.name + '.'; },
    function (n) { if (!E.gov(n).elections || !n.leader) return null; n.leader = E.makeLeader(n); n.stability -= 4; return '📰 A scandal topples the government of ' + n.name + '. ' + n.leader.name + ' takes over.'; },
    function (n) { if (S().earth > 55) return null; n.pop *= 0.996; n.gdp *= 0.99; return '🌾 Famine strikes ' + n.name + '.'; },
    function (n) {
      var c = E.alive().filter(function (x) { return x !== n && !E.warBetween(n, x) && !E.hasPact(n, x, 'trade') && E.relation(n, x) > 0; });
      if (!c.length) return null;
      var o = U.pick(c); E.addPact(n, o, 'trade', 10); E.addMod(n, 'growth', 0.006, 10); E.addMod(o, 'growth', 0.006, 10); E.changeRel(n, o, 10);
      return '🤝 ' + n.name + ' and ' + o.name + ' sign a trade agreement.';
    },
    function (n) { if (E.milestoneIndex(n) < 2) return null; return '🛰️ ' + n.name + ' opens a new orbital city.'; },
    function (n) { n.mil && M.scale(n, 1.04); return '🎖️ ' + n.name + ' holds its largest military parade since the war.'; }
  ];
  // Called once per simulated year by the engine.
  G.events.worldNews = function () {
    if (!U.chance(0.35)) return;
    var pid = S().player.nation, cands = E.alive().filter(function (x) { return x.id !== pid; });
    if (!cands.length) return;
    var n = U.pick(cands), text = U.pick(WORLD)(n);
    if (text) E.log(text, 'world');
  };
})();
