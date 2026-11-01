// Player actions. Leaders spend national treasury; everyone else spends personal wealth.
var G = window.G || (window.G = {});

G.actions = (function () {
  var U = G.util, E = G.engine;
  function S() { return G.state; }
  function P() { return G.state.player; }
  function N() { return E.pn(); }
  function democratic(n) { return E.gov(n).elections; }

  // cost: fraction of GDP from treasury (leader) or $M of personal wealth (others).
  var list = [
    // ----- Leader: Politics -----
    { id: 'propaganda', cd: 2, cat: 'Politics', role: 'leader', name: 'National address', cost: 0.004,
      desc: 'Rally the nation behind your vision. Approval up, popularity up.',
      run: function () { var n = N(); E.addMod(n, 'approval', 7, 2); P().popularity = U.clamp(P().popularity + 5, 0, 100); G.character.change('media', 3); G.character.change('public', 3); return 'The nation listens. Approval is rising.'; } },
    { id: 'reforms', cd: 4, cat: 'Politics', role: 'leader', name: 'Institutional reforms', cost: 0.01,
      desc: 'Strengthen courts, police and bureaucracy. Stability up, slightly unpopular.',
      run: function () { var n = N(); E.addMod(n, 'stability', 10, 4); E.addMod(n, 'approval', -3, 2); P().influence = U.clamp(P().influence + 4, 0, 100); return 'Reforms pass. The state grows sturdier.'; } },
    { id: 'crackdown', cd: 3, cat: 'Politics', role: 'leader', name: 'Crack down on dissent', cost: 0.006,
      desc: 'Arrest agitators and silence critics. Big stability boost, approval falls, especially in democracies.',
      run: function () {
        var n = N(), k = E.gov(n).crack;
        n.stability = U.clamp(n.stability + 12, 0, 100);
        E.addMod(n, 'approval', -8 * k, 3);
        P().popularity = U.clamp(P().popularity - 6 * k, 0, 100);
        G.character.change('intel', 6); G.character.change('media', -8); G.character.change('public', -5);
        return 'Security forces sweep the streets. Order returns, at a price.';
      } },
    { id: 'purge', cd: 4, cat: 'Politics', role: 'leader', name: 'Purge rivals', cost: 0.005,
      cond: function () { return !democratic(N()); },
      desc: 'Remove potential traitors from the inner circle. Influence up, coup risk down.',
      run: function () {
        P().influence = U.clamp(P().influence + 12, 0, 100);
        G.character.change('intel', 8); G.character.change('military', 4);
        N().stability = U.clamp(N().stability + 5, 0, 100);
        E.addMod(N(), 'approval', -4, 2);
        if (U.chance(0.1)) { E.addMod(N(), 'stability', -10, 2); return 'The purge goes too far. Whispers of tyranny spread in the barracks.'; }
        return 'Several ministers vanish overnight. Nobody dares to ask questions.';
      } },
    { id: 'govchange', cd: 10, cat: 'Politics', role: 'leader', name: 'Change the system', cost: 0.015, target: 'gov',
      desc: 'Rewrite the constitution and change the form of government.',
      run: function (g) {
        var n = N(), old = E.gov(n).name;
        if (n.gov === g) return 'Nothing changes.';
        var toDem = g === 'democracy', fromDem = n.gov === 'democracy';
        n.gov = g;
        n.stability = U.clamp(n.stability - 15, 0, 100);
        if (toDem) { E.addMod(n, 'approval', 12, 4); n.lastElection = S().year - 3; }
        if (fromDem) { E.addMod(n, 'approval', -15, 5); P().influence = U.clamp(P().influence + 15, 0, 100); }
        E.log('📜 ' + n.name + ' transitions from ' + old + ' to ' + G.data.govs[g].name + '.', 'player');
        return toDem ? 'Free elections will be held next year. The people cheer, but will they vote for you?' :
          'The new order is proclaimed. ' + G.data.govs[g].desc;
      } },

    { id: 'pacify', cd: 3, cat: 'Politics', role: 'leader', name: 'Pacify occupied lands', cost: 0.008,
      cond: function () { return E.occupiedBy(N()).length > 0; },
      desc: 'Garrisons, curfews and rebuilding money in conquered territories. Unrest −20 there for now; the people at home grumble.',
      run: function () {
        E.occupiedBy(N()).forEach(function (d) { var o = E.occupation(d); o.unrest = Math.max(0, o.unrest - 20); });
        E.addMod(N(), 'approval', -2, 1);
        return 'The occupied territories fall quiet. For now.';
      } },
    { id: 'autonomy', cd: 5, cat: 'Politics', role: 'leader', name: 'Grant regional autonomy', cost: 0.004,
      cond: function () { return E.occupiedBy(N()).length > 0; },
      desc: 'Local parliaments and language rights for conquered peoples. Integration speeds up for 10 years and unrest falls.',
      run: function () {
        E.occupiedBy(N()).forEach(function (d) { var o = E.occupation(d); o.integ = Math.min(100, o.integ + 8); o.unrest = Math.max(0, o.unrest - 8); });
        E.addMod(N(), 'unrest', -10, 10);
        return 'Conquered peoples gain a voice. Many start to feel at home.';
      } },

    // Changing a law (done from Home → Laws, not listed in the Actions tab).
    { id: 'law', hidden: true, cat: 'Politics', role: 'leader', name: 'Change a law', cost: 0.002,
      desc: 'Pass a new law.',
      run: function (arg) {
        var parts = String(arg).split('|'), l = G.laws.law(parts[0]), o = G.laws.option(parts[0], parts[1]);
        if (!l || !o || G.laws.cooldown(N(), l.id) > 0) return 'That law cannot be changed right now.';
        G.laws.set(N(), l.id, o.id);
        E.log('📜 ' + N().name + ' adopts a new law: ' + o.name + ' (' + l.name + ').', 'player');
        return 'The law is passed: ' + o.name + '.';
      } },

    // ----- Rivals (done from Home → Cabinet) -----
    { id: 'rival-discredit', hidden: true, cat: 'Politics', role: 'any', name: 'Discredit a rival', cost: 5,
      desc: 'Dig up dirt and leak it.',
      run: function (id) {
        var r = G.cabinet.rival(id); if (!r) return 'No such rival.';
        r.power = Math.max(5, r.power - U.randInt(12, 22)); r.hostility = Math.min(100, r.hostility + 10);
        if (U.chance(0.2)) { P().popularity = U.clamp(P().popularity - 5, 0, 100); return 'The attack on ' + r.name + ' backfires: people think it was dirty politics.'; }
        return r.name + '\'s reputation takes a hit.';
      } },
    { id: 'rival-investigate', hidden: true, cat: 'Politics', role: 'any', name: 'Have the spies investigate', cost: 8,
      cond: function () { return G.character.standing('intel') >= 40; },
      desc: 'Your friends in the intelligence services look for a real scandal.',
      run: function (id) {
        var r = G.cabinet.rival(id); if (!r) return 'No such rival.';
        if (U.chance(G.character.standing('intel') / 120)) { r.power = Math.max(5, r.power - 35); E.log('🕵️ A scandal involving your rival ' + r.name + ' is exposed.', 'player'); return 'The spies find gold: ' + r.name + ' is caught in a scandal.'; }
        r.hostility = Math.min(100, r.hostility + 15); return 'The investigation finds nothing, and ' + r.name + ' finds out about it.';
      } },
    { id: 'rival-coopt', hidden: true, cat: 'Politics', role: 'leader', name: 'Offer a rival a ministry', cost: 0.001,
      desc: 'Bring them inside the tent.',
      run: function (id) {
        var r = G.cabinet.rival(id), c = S().cabinet; if (!r || !c) return 'Not possible.';
        if (!U.chance(U.clamp((100 - r.hostility) / 120, 0.05, 0.85))) { r.hostility = Math.min(100, r.hostility + 10); return r.name + ' publicly refuses your offer.'; }
        var post = G.cabinet.POST_IDS.slice().sort(function (a, b) { return G.cabinet.stars(c[a]) - G.cabinet.stars(c[b]); })[0];
        var traits = (r.traits || []).filter(function (t) { return t !== 'ambitious'; }).concat(['ambitious']);
        c[post] = { id: r.id, name: r.name, gender: r.gender, age: r.age, post: post, comp: U.randInt(2, 4), loyalty: 30, traits: traits, since: S().year };
        S().rivals = S().rivals.filter(function (x) { return x !== r; });
        E.log('🤝 Your rival ' + r.name + ' joins your cabinet as Minister of ' + G.cabinet.POSTS[post].name + '.', 'player');
        return r.name + ' accepts the ministry of ' + G.cabinet.POSTS[post].name + '. Keep an eye on them.';
      } },
    { id: 'rival-arrest', hidden: true, cat: 'Politics', role: 'leader', name: 'Arrest a rival', cost: 0.002,
      cond: function () { return !E.gov(N()).elections; },
      desc: 'Lock them up.',
      run: function (id) {
        var r = G.cabinet.rival(id); if (!r) return 'No such rival.';
        S().rivals = S().rivals.filter(function (x) { return x !== r; });
        N().stability = Math.max(0, N().stability - 3); G.character.change('media', -6); G.character.change('intel', 4);
        if (r.power > 60) E.addMod(N(), 'approval', -6, 3);
        E.log('⛓️ Your rival ' + r.name + ' is arrested.', 'player');
        return r.name + ' is behind bars. Their supporters will not forget.';
      } },

    // ----- Leader: Military -----
    { id: 'mobilize', cd: 3, cat: 'Military', role: 'leader', name: 'Call up reserves', cost: 0.01,
      desc: 'Instantly call up reservists: manpower +25% (it drifts back to your conscription level over a few years).',
      run: function () { var n = N(); n.mil.men *= 1.25; E.addMod(n, 'approval', -3, 1); return 'Reservists report to their units. The army swells.'; } },
    { id: 'weapons', cd: 3, cat: 'Military', role: 'leader', name: 'Emergency arms purchase', cost: 0.015,
      desc: 'Buy equipment off the shelf for every branch. Equipment +10%.',
      run: function () { G.military.scale(N(), 1.1); return 'New weapon systems roll off the production lines.'; } },
    { id: 'war', cat: 'Military', role: 'leader', name: 'Declare war', cost: 0.01, target: 'reachable',
      desc: 'Attack another nation with a war goal: conquer land, demand reparations, change their regime, annex them or liberate a nation they occupy.',
      run: function (arg) {
        var parts = String(arg).split('|'), t = E.nation(parts[0]), n = N(), goal = parts[1] || 'conquer';
        E.declareWar(n, t, { goal: goal });
        // Liberation wars are popular; wars of conquest less so.
        E.addMod(n, 'approval', goal === 'liberate' ? 6 : E.relation(n, t) < -40 ? 5 : -8, 2);
        return 'War! Goal: ' + G.war.GOALS[goal].name + '. Your forces cross into ' + t.name + '.';
      } },
    { id: 'offensive', cat: 'Military', role: 'leader', name: 'Major offensive', cost: 0.015, target: 'enemy',
      desc: 'Throw everything into a decisive push. Big swing in the war, heavy losses.',
      run: function (id) {
        var n = N(), t = E.nation(id), w = E.warBetween(n, t);
        var ratio = E.power(n) / (E.power(n) + E.power(t, true));
        var swing = (ratio - 0.35) * 60 + U.randInt(-10, 10);
        var sign = w.a === n.id ? 1 : -1;
        w.score = U.clamp(w.score + swing * sign, -100, 100);
        G.military.losses(n, 0.08); G.military.losses(t, 0.12);
        var mine = w.score * sign;
        if (mine >= 100) { E.capitulate(w, n, t); return 'The offensive breaks them! ' + t.name + ' collapses.'; }
        if (mine <= -100) { E.capitulate(w, t, n); return 'The offensive is a catastrophe. Your lines collapse.'; }
        return swing > 0 ? 'The offensive gains ground. War score: ' + Math.round(mine) + '.' : 'The offensive stalls in blood and mud. War score: ' + Math.round(mine) + '.';
      } },
    { id: 'peace', cat: 'Military', role: 'leader', name: 'Propose peace', cost: 0, target: 'enemy',
      desc: 'Negotiate an end to the war: choose your terms. They accept more readily the better the war goes for you.',
      run: function (arg) {
        var parts = String(arg).split('|'), id = parts[0];
        var n = N(), t = E.nation(id), w = E.warBetween(n, t);
        if (!w.independence) {
          var chosen = parts[1] ? parts[1].split(',').filter(Boolean) : [];
          return G.war.propose(w, n, chosen).text;
        }
        var mine = w.a === n.id ? w.score : -w.score;
        var years = S().year - w.start;
        var p = U.clamp(0.25 + mine / 120 + years * 0.04, 0.05, 0.95);
        if (w.independence) {
          // Peace with rebels: either they lay down arms (if losing) or you recognise their independence.
          var rebelsScore = w.a === t.id ? w.score : -w.score;
          if (rebelsScore < -25 && !U.chance(p)) return t.name + ' refuses to surrender. The uprising goes on.';
          E.resolveIndependence(w, rebelsScore >= -25);
          return rebelsScore >= -25 ? 'You recognise the independence of ' + t.name + '.' : 'The rebels lay down their arms.';
        }
        return '';
      } },

    // ----- Leader: Economy -----
    { id: 'infra', cd: 4, cat: 'Economy', role: 'leader', name: 'Rebuild infrastructure', cost: 0.03,
      desc: 'Rebuild cities, power grids and railways. +1.5% growth for 4 years.',
      run: function () { E.addMod(N(), 'growth', 0.015, 4); E.addMod(N(), 'approval', 3, 2); return 'Cranes rise over the ruins. The economy stirs.'; } },
    { id: 'welfare', cd: 3, cat: 'Economy', role: 'leader', name: 'Welfare package', cost: 0.02,
      desc: 'Food, housing and healthcare for survivors. Approval up, population grows.',
      run: function () { E.addMod(N(), 'approval', 8, 2); E.addMod(N(), 'pop', 0.004, 4); return 'Ration lines shrink. People believe in tomorrow again.'; } },
    { id: 'trade', cat: 'Economy', role: 'leader', name: 'Trade agreement', cost: 0.003, target: 'trade',
      desc: 'Sign a 10-year trade deal. Both economies grow; relations improve.',
      run: function (id) {
        var n = N(), t = E.nation(id);
        var p = U.clamp(0.4 + E.relation(t, n) / 100, 0.1, 0.95);
        if (!U.chance(p)) { E.changeRel(n, t, -3); return t.name + ' declines the deal.'; }
        E.addPact(n, t, 'trade', 10);
        E.addMod(n, 'growth', 0.006, 10); E.addMod(t, 'growth', 0.006, 10);
        E.changeRel(n, t, 15);
        E.log('🤝 ' + n.name + ' and ' + t.name + ' sign a trade agreement.', 'player');
        return 'Deal signed. Trade flows.';
      } },
    { id: 'green', cd: 2, cat: 'Economy', role: 'leader', name: 'Earth restoration', cost: 0.02,
      desc: 'Decontaminate wastelands and replant forests. Heals the planet (raises everyone\'s economic ceiling).',
      run: function () {
        var n = N(), share = n.gdp / E.alive().reduce(function (a, x) { return a + x.gdp; }, 0);
        var gain = 0.5 + share * 8;
        S().earth = U.clamp(S().earth + gain, 0, 100);
        E.addMod(n, 'approval', 2, 2);
        P().legacy += 1;
        return 'Earth Health +' + gain.toFixed(1) + '. The skies grow a little bluer.';
      } },

    // ----- Leader: Science & Space -----
    { id: 'research', cd: 2, cat: 'Science & Space', role: 'leader', name: 'Research grant', cost: 0.02,
      desc: 'Fund universities and labs. Tech +2.5 and two years of research points at once.',
      run: function () { N().tech += 2.5; G.research.boost(N(), 2); return 'Breakthroughs in fusion, AI and medicine.'; } },
    { id: 'mission', cd: 3, cat: 'Science & Space', role: 'leader', name: 'Crash space programme', cost: 0.025,
      desc: 'Pour resources into the next big leap. Space progress +50% for 3 years plus an immediate boost.',
      run: function () {
        var n = N();
        n.space += E.spaceRate(n) * 2 + 5;
        E.addMod(n, 'space', 0.5, 3);
        return 'Rockets thunder from the launch pads. The stars come closer.';
      } },

    // ----- Leader: Diplomacy -----
    { id: 'envoy', cat: 'Diplomacy', role: 'leader', name: 'Send envoys', cost: 0.002, target: 'other',
      desc: 'Improve relations with a nation.',
      run: function (id) { var t = E.nation(id); E.changeRel(N(), t, U.randInt(10, 20)); return 'Relations with ' + t.name + ' improve.'; } },
    { id: 'nap', cat: 'Diplomacy', role: 'leader', name: 'Non-aggression pact', cost: 0.002, target: 'nap',
      desc: 'A 15-year promise not to attack each other. Needs good relations (20+).',
      run: function (id) {
        var n = N(), t = E.nation(id);
        if (E.relation(n, t) < 20 && !U.chance(0.2)) { return t.name + ' does not trust you enough.'; }
        E.addPact(n, t, 'nap', 15); E.changeRel(n, t, 10);
        E.log('📜 ' + n.name + ' and ' + t.name + ' sign a non-aggression pact.', 'player');
        return 'Pact signed.';
      } },
    { id: 'defpact', cat: 'Diplomacy', role: 'leader', name: 'Propose defensive pact', cost: 0.002, target: 'defcand',
      desc: 'You defend each other only if one of you is attacked. Easier to get than a full alliance (relations 25+ to be likely).',
      run: function (id) {
        var n = N(), t = E.nation(id);
        var p = U.clamp((E.relation(n, t) - 5) / 50 + strengthAppeal(n, t), 0.04, 0.92);
        if (E.allies(t).length >= 4) p *= 0.4;
        if (!U.chance(p)) { E.changeRel(n, t, -2); return t.name + ' declines a defensive pact.'; }
        E.formAlliance(n, t, 'defensive');
        E.log('🛡️ ' + n.name + ' and ' + t.name + ' sign a defensive pact.', 'player');
        return 'Defensive pact signed with ' + t.name + '. If either of you is attacked, the other is expected to help.';
      } },
    { id: 'alliance', cat: 'Diplomacy', role: 'leader', name: 'Propose full alliance', cost: 0.003, target: 'allycand',
      desc: 'Defend each other AND possibly join each other\'s wars of aggression. Can upgrade a defensive pact. Needs strong relations (45+ to be likely).',
      run: function (id) {
        var n = N(), t = E.nation(id);
        var p = U.clamp((E.relation(n, t) - 25) / 50 + strengthAppeal(n, t) + (E.allianceType(n, t) === 'defensive' ? 0.1 : 0), 0.03, 0.9);
        if (E.allies(t).length >= 4 && !E.allied(n, t)) p *= 0.3;
        if (!U.chance(p)) { E.changeRel(n, t, -3); return t.name + ' declines a full alliance.'; }
        E.formAlliance(n, t, 'alliance');
        E.log('🤝 ' + n.name + ' and ' + t.name + ' form a military alliance.', 'player');
        return 'Full alliance signed with ' + t.name + '.';
      } },
    { id: 'breakally', cat: 'Diplomacy', role: 'leader', name: 'Cancel alliance or pact', cost: 0, target: 'allied',
      desc: 'End a defensive pact or alliance. Your former partner will be bitter.',
      run: function (id) {
        var n = N(), t = E.nation(id);
        E.breakAlliance(n, t); E.changeRel(n, t, -30);
        E.log('💔 ' + n.name + ' ends its treaty with ' + t.name + '.', 'player');
        return 'The treaty with ' + t.name + ' is over.';
      } },
    { id: 'tribute', cat: 'Diplomacy', role: 'leader', name: 'Demand tribute', cost: 0, target: 'weaker',
      desc: 'Threaten a much weaker nation into paying you. They might refuse, and they will hate you.',
      run: function (id) {
        var n = N(), t = E.nation(id), ratio = E.power(n) / E.power(t);
        E.changeRel(n, t, -25);
        if (U.chance(U.clamp((ratio - 1.5) / 4, 0.1, 0.9))) {
          var amt = t.gdp * 0.03; t.treasury -= amt; n.treasury += amt;
          return t.name + ' pays ' + U.money(amt) + ' in tribute.';
        }
        return t.name + ' refuses to bow. Their people rally against you.';
      } },

    // ----- Power base (everyone; paid from personal wealth) -----
    { id: 'pb-military', cat: 'Power base', role: 'any', name: 'Court the generals', cost: 3, fac: 'military',
      desc: 'Dinners at the officers\' club, promotions for friends. Military standing +12.',
      run: function () { G.character.change('military', U.randInt(10, 14)); return 'The generals raise their glasses to you.'; } },
    { id: 'pb-business', cat: 'Power base', role: 'any', name: 'Woo the business elite', cost: 10, fac: 'business',
      desc: 'Galas, board seats and quiet promises. Business standing +12.',
      run: function () { G.character.change('business', U.randInt(10, 14)); return 'The tycoons now take your calls.'; } },
    { id: 'pb-media', cat: 'Power base', role: 'any', name: 'Media charm offensive', cost: 6, fac: 'media',
      desc: 'Exclusive interviews and well-placed leaks. Media standing +12, popularity +3.',
      run: function () { G.character.change('media', U.randInt(10, 14)); P().popularity = U.clamp(P().popularity + 3, 0, 100); return 'The headlines are kind to you.'; } },
    { id: 'pb-public', cat: 'Power base', role: 'any', name: 'Tour the country', cost: 2, fac: 'public',
      desc: 'Town halls, factory floors and refugee camps. Standing with the people +10, popularity +4.',
      run: function () { G.character.change('public', U.randInt(8, 12)); P().popularity = U.clamp(P().popularity + 4, 0, 100); return 'Ordinary people feel heard.'; } },
    { id: 'pb-intel', cat: 'Power base', role: 'any', name: 'Cultivate the spies', cost: 5, fac: 'intel',
      desc: 'Favours for the intelligence chiefs. They will warn you, and dig dirt for you. Intelligence standing +12.',
      run: function () { G.character.change('intel', U.randInt(10, 14)); return 'Your phone is now the one that is not tapped.'; } },
    { id: 'pb-patronage', cat: 'Power base', role: 'any', name: 'Build a patronage network', cost: 20,
      desc: 'Jobs, contracts and favours for loyal people everywhere. Every faction +5.',
      run: function () { G.character.changeAll(5); return 'Loyal people now sit in every ministry.'; } },

    // ----- Personal (non-leaders) -----
    { id: 'network', cat: 'Personal', role: 'any-nonleader', name: 'Work the corridors', cost: 2,
      desc: 'Dinners, favours and back-room deals. Influence +6.',
      run: function () { P().influence = U.clamp(P().influence + U.randInt(4, 8), 0, 100); return 'You make useful friends.'; } },
    { id: 'public', cat: 'Personal', role: 'any-nonleader', name: 'Public appearances', cost: 2,
      desc: 'Rallies, interviews and charity work. Popularity +7.',
      run: function () { P().popularity = U.clamp(P().popularity + U.randInt(5, 9), 0, 100); return 'The crowds love you.'; } },

    // Politician
    { id: 'campaign', cat: 'Politics', role: 'politician', name: 'Grassroots campaign', cost: 5,
      desc: 'Build a movement across the nation. Popularity +12, influence +3.',
      run: function () { P().popularity = U.clamp(P().popularity + U.randInt(9, 14), 0, 100); P().influence = U.clamp(P().influence + 3, 0, 100); return 'Your movement grows.'; } },
    { id: 'attack', cat: 'Politics', role: 'politician', name: 'Attack the government', cost: 3,
      desc: 'Expose failures and scandals. Government approval falls, you gain popularity. Risky in non-democracies.',
      run: function () {
        var n = N();
        if (!democratic(n) && U.chance(0.25)) { P().influence = Math.max(0, P().influence - 15); P().popularity += 5; return 'The secret police raid your office. You lose allies, but gain martyrdom.'; }
        E.addMod(n, 'approval', -5, 2); P().popularity = U.clamp(P().popularity + 4, 0, 100);
        return 'Your speech goes viral. The government stumbles.';
      } },
    { id: 'candidacy', cat: 'Politics', role: 'any-nonleader', name: 'Declare candidacy', cost: 10,
      cond: function () { return democratic(N()) && !P().candidate && P().influence >= 20; },
      desc: 'Run for head of state in the next election. Needs influence 20+.',
      run: function () { P().candidate = true; var n = N(); return 'You are running for ' + E.title(n) + '! Next election: ' + (n.lastElection + 4) + '.'; } },
    { id: 'intrigue', cat: 'Politics', role: 'politician', name: 'Palace intrigue', cost: 20,
      cond: function () { return !democratic(N()); },
      desc: 'Plot to replace the ruler from inside. Chance depends on influence and instability. Failure is dangerous.',
      run: function () {
        var n = N(), p = P(), c = U.clamp((p.influence - 30) / 100 + (50 - n.stability) / 150 + G.character.standing('intel') / 300, 0.03, 0.75);
        if (U.chance(c)) { E.becomeLeader('👑 The plot succeeds! ' + p.name + ' takes power in ' + n.name + '.'); return 'You now rule ' + n.name + '.'; }
        if (U.chance(0.35)) { E.killPlayer('was arrested and executed for treason'); return 'The plot is discovered.'; }
        p.influence = Math.round(p.influence * 0.5); return 'The plot fails. You barely escape with your life and half your allies.';
      } },

    // General
    { id: 'loyalty', cat: 'Military', role: 'general', name: 'Secure troop loyalty', cost: 3,
      desc: 'Visit the bases, promote loyal officers. Influence +10.',
      run: function () { P().influence = U.clamp(P().influence + U.randInt(7, 12), 0, 100); return 'The soldiers chant your name.'; } },
    { id: 'lead', cat: 'Military', role: 'general', name: 'Lead from the front', cost: 2,
      cond: function () { return E.atWar(N()); },
      desc: 'Command a campaign personally. Improves the war, popularity up, but you might die.',
      run: function () {
        var n = N(), w = E.warsOf(n)[0], sign = w.a === n.id ? 1 : -1;
        if (U.chance(0.06)) { E.killPlayer('was killed leading troops at the front'); return 'A drone strike hits your command post.'; }
        w.score = U.clamp(w.score + sign * U.randInt(5, 15), -100, 100);
        P().popularity = U.clamp(P().popularity + 8, 0, 100); P().influence += 3;
        return 'Your brigades smash through enemy lines.';
      } },
    { id: 'coup', cat: 'Military', role: 'general', name: 'Stage a coup', cost: 30,
      desc: 'Seize power by force. Chance depends on your influence and the nation\'s instability. Failure means death or prison.',
      run: function () {
        var n = N(), p = P();
        var c = U.clamp(p.influence / 120 + (55 - n.stability) / 120 + G.character.standing('military') / 250, 0.03, 0.85);
        if (U.chance(c)) {
          if (['democracy', 'technocracy', 'corporate'].indexOf(n.gov) >= 0) n.gov = 'junta';
          n.stability = U.clamp(n.stability - 10, 15, 100);
          E.addMod(n, 'approval', -8, 3);
          E.becomeLeader('💥 Tanks roll into the capital. ' + p.name + ' seizes power in ' + n.name + '!');
          return 'You rule ' + n.name + ' now. Can you hold it?';
        }
        if (U.chance(0.5)) { E.killPlayer('was executed after a failed coup'); return 'The coup fails.'; }
        p.influence = 5; p.popularity = Math.max(0, p.popularity - 10);
        return 'The coup fails. You are stripped of rank and thrown in prison. Years later you emerge with nothing.';
      } },
    { id: 'lobbymil', cat: 'Military', role: 'general', name: 'Lobby for the army', cost: 2,
      desc: 'Push the government to raise military spending. Military up, influence up.',
      run: function () { var n = N(); n.alloc.mil *= 1.15; E.syncSpend(n); G.military.scale(n, 1.03); P().influence = U.clamp(P().influence + 3, 0, 100); return 'The budget committee bends to your will.'; } },

    // Corporate
    { id: 'expand', cat: 'Business', role: 'corporate', name: 'Expand the business', cost: 0,
      desc: 'New markets, new factories. Wealth grows (about +15%), and your company boosts the economy.',
      run: function () {
        var p = P(), g = p.wealth * U.randInt(8, 22) / 100 + 10;
        p.wealth += g; E.addMod(N(), 'growth', 0.002, 2);
        return p.company + ' grows. +' + U.money(g / 1000) + '.';
      } },
    { id: 'buypol', cat: 'Business', role: 'corporate', name: 'Fund politicians', cost: 40,
      desc: 'Money talks. Influence +12.',
      run: function () { P().influence = U.clamp(P().influence + U.randInt(9, 15), 0, 100); return 'Several lawmakers now owe you favours.'; } },
    { id: 'media', cat: 'Business', role: 'corporate', name: 'Buy a media network', cost: 60,
      desc: 'Control the narrative. Popularity +10 and you can sway government approval.',
      run: function () { P().popularity = U.clamp(P().popularity + 10, 0, 100); P().influence += 3; return 'Your face is on every screen.'; } },
    { id: 'spaceinv', cat: 'Business', role: 'corporate', name: 'Private space venture', cost: 80,
      desc: 'Launch your own rockets. Boosts the nation\'s space programme and your fame.',
      run: function () { N().space += 4 + P().wealth / 200; P().popularity += 4; P().legacy += 2; return P().company + ' launches a cargo ship to the Moon.'; } },
    { id: 'takeover', cat: 'Business', role: 'corporate', name: 'Hostile takeover of the state', cost: 150,
      desc: 'Buy the government. Works best in Corporate States; elsewhere you need huge influence.',
      run: function () {
        var n = N(), p = P();
        var biz = G.character.standing('business') / 400;
        var c = n.gov === 'corporate' ? U.clamp(p.influence / 100 + p.wealth / 3000 + biz, 0.05, 0.8) : U.clamp((p.influence - 50) / 150 + p.wealth / 10000 + biz, 0.02, 0.4);
        if (U.chance(c)) {
          if (n.gov !== 'corporate' && U.chance(0.5)) n.gov = 'corporate';
          E.becomeLeader('💼 In a stunning boardroom coup, ' + p.name + ' takes control of ' + n.name + '.');
          return 'The nation is now your company.';
        }
        p.influence = Math.max(0, p.influence - 10);
        return 'The board resists. Your bid fails and your rivals are on alert.';
      } }
  ];

  // A strong partner is attractive; a much weaker one is a liability.
  function strengthAppeal(n, t) { return U.clamp((E.power(n) / Math.max(1, E.power(t)) - 1) * 0.05, -0.1, 0.15); }

  function costFor(a) {
    if (a.role === 'leader') return a.cost * N().gdp * E.diff().cost;
    return a.cost;
  }

  // Years until an action can be used again (0 = ready). Cooldowns stop repeating the same
  // national programme every turn.
  function cooldown(a) {
    var n = N(); if (!a.cd || !n.cool) return 0;
    return Math.max(0, (n.cool[a.id] || 0) - S().year);
  }

  function available() {
    var p = P();
    return list.filter(function (a) {
      if (a.role === 'leader' && p.role !== 'leader') return false;
      if (a.role === 'any-nonleader' && p.role === 'leader') return false;
      if (a.role !== 'leader' && a.role !== 'any-nonleader' && a.role !== 'any' && a.role !== p.role) return false;
      if (a.target === 'enemy' && !E.atWar(N())) return false;
      if (a.cond && !a.cond()) return false;
      return true;
    });
  }

  function affordable(a) {
    if (cooldown(a) > 0) return false;
    var c = costFor(a), p = P();
    // Governments may borrow for actions, up to a debt limit.
    if (a.role === 'leader') return c === 0 || N().treasury - c >= -E.borrowLimit(N());
    return p.wealth >= c;
  }

  function targets(a) {
    var n = N(), all = E.alive().filter(function (x) { return x !== n; });
    switch (a.target) {
      case 'reachable': return all.filter(function (x) { return E.canReach(n, x) && !E.warBetween(n, x) && !E.allied(n, x); });
      case 'allycand': return all.filter(function (x) { return E.allianceType(n, x) !== 'alliance' && !E.warBetween(n, x); });
      case 'defcand': return all.filter(function (x) { return !E.allied(n, x) && !E.warBetween(n, x); });
      case 'allied': return E.allies(n);
      case 'enemy': return E.enemiesOf(n);
      case 'trade': return all.filter(function (x) { return !E.warBetween(n, x) && !E.hasPact(n, x, 'trade'); });
      case 'nap': return all.filter(function (x) { return !E.warBetween(n, x) && !E.hasPact(n, x, 'nap'); });
      case 'weaker': return all.filter(function (x) { return E.power(n) > E.power(x) * 1.5 && !E.warBetween(n, x) && !E.allied(n, x); });
      case 'other': return all;
      case 'gov': return Object.keys(G.data.govs).filter(function (g) { return g !== n.gov; });
      default: return null;
    }
  }

  function perform(id, target) {
    var s = S(), a = list.filter(function (x) { return x.id === id; })[0];
    if (!a || s.ap <= 0 || s.used.indexOf(id) >= 0 || !affordable(a)) return null;
    var c = costFor(a);
    if (a.role === 'leader') N().treasury -= c; else P().wealth -= c;
    s.ap--;
    s.used.push(id);
    if (a.cd) { var n = N(); n.cool = n.cool || {}; n.cool[a.id] = S().year + a.cd; }
    var res = a.run(target);
    E.save();
    return res;
  }

  return { list: list, available: available, affordable: affordable, cooldown: cooldown, costFor: costFor, targets: targets, perform: perform };
})();
