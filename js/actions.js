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
    { id: 'propaganda', cat: 'Politics', role: 'leader', name: 'National address', cost: 0.004,
      desc: 'Rally the nation behind your vision. Approval up, popularity up.',
      run: function () { var n = N(); E.addMod(n, 'approval', 7, 2); P().popularity = U.clamp(P().popularity + 5, 0, 100); G.character.change('media', 3); G.character.change('public', 3); return 'The nation listens. Approval is rising.'; } },
    { id: 'reforms', cat: 'Politics', role: 'leader', name: 'Institutional reforms', cost: 0.01,
      desc: 'Strengthen courts, police and bureaucracy. Stability up, slightly unpopular.',
      run: function () { var n = N(); E.addMod(n, 'stability', 10, 4); E.addMod(n, 'approval', -3, 2); P().influence = U.clamp(P().influence + 4, 0, 100); return 'Reforms pass. The state grows sturdier.'; } },
    { id: 'crackdown', cat: 'Politics', role: 'leader', name: 'Crack down on dissent', cost: 0.006,
      desc: 'Arrest agitators and silence critics. Big stability boost, approval falls, especially in democracies.',
      run: function () {
        var n = N(), k = E.gov(n).crack;
        n.stability = U.clamp(n.stability + 12, 0, 100);
        E.addMod(n, 'approval', -8 * k, 3);
        P().popularity = U.clamp(P().popularity - 6 * k, 0, 100);
        G.character.change('intel', 6); G.character.change('media', -8); G.character.change('public', -5);
        return 'Security forces sweep the streets. Order returns, at a price.';
      } },
    { id: 'purge', cat: 'Politics', role: 'leader', name: 'Purge rivals', cost: 0.005,
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
    { id: 'govchange', cat: 'Politics', role: 'leader', name: 'Change the system', cost: 0.015, target: 'gov',
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

    // ----- Leader: Military -----
    { id: 'mobilize', cat: 'Military', role: 'leader', name: 'Call up reserves', cost: 0.01,
      desc: 'Instantly call up reservists: manpower +25% (it drifts back to your conscription level over a few years).',
      run: function () { var n = N(); n.mil.men *= 1.25; E.addMod(n, 'approval', -3, 1); return 'Reservists report to their units. The army swells.'; } },
    { id: 'weapons', cat: 'Military', role: 'leader', name: 'Emergency arms purchase', cost: 0.015,
      desc: 'Buy equipment off the shelf for every branch. Equipment +10%.',
      run: function () { G.military.scale(N(), 1.1); return 'New weapon systems roll off the production lines.'; } },
    { id: 'war', cat: 'Military', role: 'leader', name: 'Declare war', cost: 0.01, target: 'reachable',
      desc: 'Attack another nation. Win and you take territory, or conquer them entirely if they are small.',
      run: function (id) {
        var t = E.nation(id), n = N();
        E.declareWar(n, t);
        E.addMod(n, 'approval', E.relation(n, t) < -40 ? 5 : -8, 2);
        return 'War! Your forces cross into ' + t.name + '.';
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
      desc: 'Negotiate an end to the war. They are more willing if they are losing.',
      run: function (id) {
        var n = N(), t = E.nation(id), w = E.warBetween(n, t);
        var mine = w.a === n.id ? w.score : -w.score;
        var years = S().year - w.start;
        var p = U.clamp(0.25 + mine / 120 + years * 0.04, 0.05, 0.95);
        if (U.chance(p)) {
          if (mine > 25) { E.cede(n, t, mine / 100 * 0.15); E.endWar(w, '🕊️ ' + t.name + ' accepts peace and cedes territory to ' + n.name + '.'); return 'Peace with victory. Territory is yours.'; }
          if (mine < -25) { E.cede(t, n, -mine / 100 * 0.15); E.endWar(w, '🕊️ ' + n.name + ' buys peace from ' + t.name + ' by ceding territory.'); return 'Peace, but you had to give up land.'; }
          E.endWar(w, '🕊️ ' + n.name + ' and ' + t.name + ' sign a white peace.');
          return 'The guns fall silent. Status quo restored.';
        }
        return t.name + ' rejects your offer. The war goes on.';
      } },

    // ----- Leader: Economy -----
    { id: 'infra', cat: 'Economy', role: 'leader', name: 'Rebuild infrastructure', cost: 0.03,
      desc: 'Rebuild cities, power grids and railways. +1.5% growth for 4 years.',
      run: function () { E.addMod(N(), 'growth', 0.015, 4); E.addMod(N(), 'approval', 3, 2); return 'Cranes rise over the ruins. The economy stirs.'; } },
    { id: 'welfare', cat: 'Economy', role: 'leader', name: 'Welfare package', cost: 0.02,
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
    { id: 'green', cat: 'Economy', role: 'leader', name: 'Earth restoration', cost: 0.02,
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
    { id: 'research', cat: 'Science & Space', role: 'leader', name: 'Research grant', cost: 0.02,
      desc: 'Fund universities and labs. Tech +2.5 and two years of research points at once.',
      run: function () { N().tech += 2.5; G.research.boost(N(), 2); return 'Breakthroughs in fusion, AI and medicine.'; } },
    { id: 'mission', cat: 'Science & Space', role: 'leader', name: 'Crash space programme', cost: 0.025,
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
    { id: 'alliance', cat: 'Diplomacy', role: 'leader', name: 'Propose alliance', cost: 0.003, target: 'allycand',
      desc: 'A military alliance: if either of you is attacked, the other joins the war. Needs good relations (40+ to be likely).',
      run: function (id) {
        var n = N(), t = E.nation(id);
        var p = U.clamp((E.relation(n, t) - 20) / 60, 0.05, 0.9);
        if (E.allies(t).length >= 3) p *= 0.3;
        if (!U.chance(p)) { E.changeRel(n, t, -3); return t.name + ' declines your alliance.'; }
        E.formAlliance(n, t);
        E.log('🤝 ' + n.name + ' and ' + t.name + ' form a military alliance.', 'player');
        return 'Alliance signed with ' + t.name + '. An attack on one is an attack on both.';
      } },
    { id: 'breakally', cat: 'Diplomacy', role: 'leader', name: 'Leave alliance', cost: 0, target: 'allied',
      desc: 'End a military alliance. Your former ally will be bitter.',
      run: function (id) {
        var n = N(), t = E.nation(id);
        E.breakAlliance(n, t); E.changeRel(n, t, -30);
        E.log('💔 ' + n.name + ' leaves its alliance with ' + t.name + '.', 'player');
        return 'The alliance with ' + t.name + ' is over.';
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

  function costFor(a) {
    if (a.role === 'leader') return a.cost * N().gdp;
    return a.cost;
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
    var c = costFor(a), p = P();
    // Governments may borrow for actions, up to a debt limit.
    if (a.role === 'leader') return c === 0 || N().treasury - c >= -E.borrowLimit(N());
    return p.wealth >= c;
  }

  function targets(a) {
    var n = N(), all = E.alive().filter(function (x) { return x !== n; });
    switch (a.target) {
      case 'reachable': return all.filter(function (x) { return E.canReach(n, x) && !E.warBetween(n, x) && !E.allied(n, x); });
      case 'allycand': return all.filter(function (x) { return !E.allied(n, x) && !E.warBetween(n, x); });
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
    var res = a.run(target);
    E.save();
    return res;
  }

  return { list: list, available: available, affordable: affordable, costFor: costFor, targets: targets, perform: perform };
})();
