// Main UI: title screen, character creation, the frame around the tabs, menu and turn flow.
var G = window.G || (window.G = {});

G.ui = (function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, showResult = K.showResult;
  var app, create = null;

  // ---------- title & creation ----------
  function titleScreen() {
    closeModal();
    var cont = E.hasSave() && E.load();
    app.innerHTML =
      '<div class="title-screen">' +
      '<div class="logo">ASHES<br>TO <span>STARS</span></div>' +
      '<div class="tagline">2077. The Long War is over. A third of humanity is gone.<br>Rebuild the world, or burn it again, and reach for the stars.</div>' +
      (cont ? '<button class="btn primary" data-act="continue">Continue: ' + esc(S().player.name) + ', ' + S().year + '</button>' : '') +
      '<button class="btn ' + (cont ? '' : 'primary') + '" data-act="newgame">New Game</button>' +
      '<button class="btn" data-act="howto">How to play</button>' +
      '<p class="muted small" style="margin-top:24px;text-align:center">Prototype v0.1</p>' +
      '</div>';
  }
  on('continue', function () { K.view.tab = 'home'; render(); window.scrollTo(0, 0); resumePending(); });
  on('newgame', function () {
    if (E.hasSave() && !confirm('Start a new game? Your current save will be overwritten.')) return;
    intro();
  });
  on('howto', function () {
    modal('<div class="kicker">How to play</div><h2>Ashes to Stars</h2>' +
      '<p>Every turn you get <b>2 actions</b>. Then press <b>End Turn</b> and the world moves forward: economies grow, wars rage, elections are held and rivals plot.</p>' +
      '<p><b>The world pushes back.</b> Every war you start and every land you take raises how much the world <b>fears</b> you (see World → Diplomacy). High fear sours relations, makes nations sign defensive pacts against you and can bring a whole coalition into your next war. National programmes (like infrastructure or research grants) have cooldowns, and investment has diminishing returns, so balance matters more than maxing one budget line.</p>' +
      '<p>The <b>Science</b> tab holds the research tree: pick discoveries that give permanent bonuses. Your <b>power base</b> (Home) decides where your influence is heading. Win over the military, business, media, the people and the spies.</p>' +
      '<p>The <b>Economy</b> tab explains your growth, shows charts over time and holds the national budget. <b>Alliances</b> pull allies into each other\'s wars, and you will be called to arms if an ally is attacked.</p>' +
      '<p>The <b>Military</b> tab shows your manpower, equipment and branches. As head of state you set conscription and start multi-year military projects there.</p>' +
      '<p><b>Heads of State</b> set taxes and spending, wage wars, sign treaties and run the space programme. Spend more than you earn and the deficit becomes <b>national debt</b>. Debt costs interest, and too much of it slows growth and destabilises the nation.</p>' +
      '<p><b>Politicians, Generals and Executives</b> spend their personal wealth to build influence and popularity, and must seize power through elections, coups or boardroom takeovers.</p>' +
      '<p>Your character ages and can die, lose elections or be overthrown. When that happens you continue as an <b>heir</b> or <b>protégé</b>. Your legacy lives on.</p>' +
      '<p>Turns are 1 year until 2150, then 5, 10 and finally 25 years. How far can you go? The year 3000? Kardashev II?</p>' +
      '<button class="btn primary" data-act="close">Got it</button>');
  });
  on('close', closeModal);

  function intro() {
    app.innerHTML = '<div class="title-screen lore"><h3>The world in 2077</h3>' +
      D.lore.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<button class="btn primary" data-act="tocreate">Create your character</button></div>';
  }
  on('tocreate', function () {
    create = { name: '', gender: 'female', nation: null, role: null, age: 40, difficulty: 'normal' };
    createScreen();
  });

  function createScreen() {
    var c = create;
    var nations = D.nations.slice().sort(function (a, b) { return b.gdp - a.gdp; });
    var html = '<div class="page" style="padding-bottom:40px">' +
      '<h2 style="margin-top:10px">Create your character</h2>' +
      '<label class="field">Name</label>' +
      '<input type="text" id="cname" maxlength="40" placeholder="e.g. Astrid Lindberg" value="' + esc(c.name) + '" data-input="cname">' +
      '<button class="btn sm" style="margin-top:8px" data-act="randname">🎲 Random name</button>' +
      '<label class="field">Gender</label><div class="seg">' +
      ['female', 'male', 'nonbinary'].map(function (g) {
        return '<button class="' + (c.gender === g ? 'sel' : '') + '" data-act="gender" data-arg="' + g + '">' + { female: 'Female', male: 'Male', nonbinary: 'Non-binary' }[g] + '</button>';
      }).join('') + '</div>' +
      '<label class="field">Age: <span id="agev">' + c.age + '</span></label>' +
      '<input type="range" min="25" max="70" value="' + c.age + '" data-input="age">' +
      '<label class="field">Nation</label>' +
      nations.map(function (n) {
        return '<button class="choice ' + (c.nation === n.id ? 'sel' : '') + '" data-act="pnation" data-arg="' + n.id + '">' +
          '<div class="row"><div class="t"><span class="dot" style="background:' + n.color + '"></span>' + esc(n.name) + '</div><span class="tag">' + n.tier + '</span></div>' +
          '<div class="d">' + D.govs[n.gov].name + ' · Pop ' + U.people(n.pop) + ' · GDP ' + U.money(n.gdp) + '</div>' +
          (c.nation === n.id ? '<div class="d" style="color:#c9d2e0;margin-top:6px">' + esc(n.desc) + '</div>' : '') +
          '</button>';
      }).join('') +
      '<label class="field">Difficulty</label><div class="seg">' +
      Object.keys(E.DIFFICULTY).map(function (k) {
        return '<button class="' + (c.difficulty === k ? 'sel' : '') + '" data-act="pdiff" data-arg="' + k + '">' + E.DIFFICULTY[k].name + '</button>';
      }).join('') + '</div><div class="small muted" style="margin-top:6px">' + esc(E.DIFFICULTY[c.difficulty].desc) + '</div>' +
      '<label class="field">Starting role</label>' +
      Object.keys(D.roles).map(function (r) {
        var ro = D.roles[r];
        return '<button class="choice ' + (c.role === r ? 'sel' : '') + '" data-act="prole" data-arg="' + r + '">' +
          '<div class="t">' + ro.icon + ' ' + ro.name + '</div><div class="d">' + esc(ro.desc) + '</div></button>';
      }).join('') +
      '<button class="btn primary" data-act="start" ' + (c.name.trim() && c.nation && c.role ? '' : 'disabled') + '>Begin in 2077</button>' +
      '</div>';
    app.innerHTML = html;
  }
  on('cname', function (v) {
    create.name = v;
    var b = document.querySelector('[data-act=start]');
    if (b) b.disabled = !(v.trim() && create.nation && create.role);
  });
  on('age', function (v) { create.age = +v; $('agev').textContent = v; });
  on('gender', function (g) { create.gender = g; createScreen(); });
  on('pnation', function (id) { create.nation = id; keepScroll(createScreen); });
  on('pdiff', function (d) { create.difficulty = d; keepScroll(createScreen); });
  on('prole', function (r) { create.role = r; keepScroll(createScreen); });
  on('randname', function () {
    var cul = create.nation ? D.nations.filter(function (n) { return n.id === create.nation; })[0].culture : U.pick(['anglo', 'nordic', 'euro', 'latin', 'pacific']);
    // Names use the game RNG which needs a state; use a temporary one.
    var had = G.state; G.state = { rng: (Math.random() * 4294967296) >>> 0 };
    create.name = G.names.full(cul, create.gender === 'nonbinary' ? null : create.gender);
    G.state = had;
    keepScroll(createScreen);
  });
  on('start', function () {
    if (!(create.name.trim() && create.nation && create.role)) return;
    E.newGame({ name: create.name.trim(), gender: create.gender, nation: create.nation, role: create.role, age: create.age, difficulty: create.difficulty });
    S().event = EV.roll();
    E.save();
    K.view.tab = 'home';
    render();
    window.scrollTo(0, 0);
    resumePending();
  });

  // ---------- main game frame ----------
  function render() {
    var s = S(), view = K.view;
    var yrs = E.yearsPerTurn(s.year);
    var head = '<div class="topbar"><div class="row"><div><div class="year">' + s.year + '</div>' +
      '<div class="era">' + E.era(s.year) + ' · ' + (yrs === 1 ? '1 year' : yrs + ' years') + ' per turn</div></div>' +
      '<div class="row"><span class="tag">⚡ ' + s.ap + ' action' + (s.ap === 1 ? '' : 's') + '</span><button class="icon-btn" data-act="menu">☰</button></div></div></div>';
    var t = K.tabs[view.tab] || K.tabs.home;
    var body = t.render();
    var tabs = TABS;
    app.innerHTML = '<div class="page">' + head + body + '</div>' +
      '<div class="bottom"><div class="bottom-inner">' +
      '<button class="btn primary endturn" data-act="endturn">End Turn ▸ ' + (s.year + yrs) + '</button>' +
      '<div class="tabs">' + tabs.map(function (x) {
        return '<button class="' + (view.tab === x[0] ? 'on' : '') + '" data-act="tab" data-arg="' + x[0] + '"><span class="i">' + x[1] + '</span>' + x[2] + '</button>';
      }).join('') + '</div></div></div>';
    if (t.after) t.after();
  }
  var TABS = [['home', '🏛️', 'Home'], ['act', '⚡', 'Actions'], ['econ', '💰', 'Economy'], ['mil', '🎖️', 'Military'], ['world', '🌍', 'World'], ['sci', '🔬', 'Science'], ['space', '🚀', 'Space'], ['log', '📰', 'News']];
  on('tab', function (t) { K.view.tab = t; render(); window.scrollTo(0, 0); });

  // ---------- menu ----------
  on('menu', function () {
    var p = S().player;
    modal('<div class="kicker">Menu</div><h2>' + esc(p.dynasty) + ' legacy</h2>' +
      '<p class="small muted">Generation ' + p.generation + ' · Legacy ' + Math.round(p.legacy) + ' · Achievements: ' + (S().achievements.length || 'none yet') + '</p>' +
      '<button class="btn" data-act="howto">How to play</button>' +
      '<button class="btn" data-act="totitle">Save & exit to title</button>' +
      '<button class="btn danger" data-act="abandon">Abandon game</button>' +
      '<button class="btn" data-act="close">Close</button>');
  });
  on('totitle', function () { E.save(); titleScreen(); });
  on('abandon', function () { if (confirm('Delete this save and return to the title screen?')) { E.wipe(); G.state = null; titleScreen(); } });

  // ---------- turn flow ----------
  // Things the player could still do this turn.
  function turnWarnings() {
    var s = S(), n = E.pn(), out = [];
    if (s.ap > 0) out.push({ icon: '⚡', text: 'You have ' + s.ap + ' unused action' + (s.ap === 1 ? '' : 's') + '.', tab: 'act', btn: 'Actions' });
    if (E.isLeader()) {
      var rs = G.research.ensure(n);
      if (!rs.active && G.research.available(n).length && G.research.rate(n) > 0)
        out.push({ icon: '🔬', text: 'Nothing is being researched' + (rs.bank >= 1 ? ' (' + Math.floor(rs.bank) + ' RP waiting)' : '') + '.', tab: 'sci', btn: 'Science' });
      var M = G.military, free = M.slots(n) - n.mil.active.length;
      var canStart = M.PROJECTS.some(function (pr) { return M.projectState(n, pr) === 'available'; });
      if (free > 0 && canStart && n.treasury > -E.borrowLimit(n) * 0.8)
        out.push({ icon: '🎖️', text: free + ' military project slot' + (free === 1 ? ' is' : 's are') + ' free.', tab: 'mil', btn: 'Military' });
    }
    return out;
  }
  on('endturn', function () {
    if (S().event) { showEvent(); return; }
    if (S().succession) { showSuccession(); return; }
    var warn = turnWarnings();
    if (warn.length) {
      modal('<div class="kicker">Before you end the turn</div><h2>Anything left to do?</h2>' +
        warn.map(function (w) {
          return '<div class="action"><div class="row"><div class="name">' + w.icon + ' ' + esc(w.text) + '</div>' +
            '<button class="btn sm blue" data-act="warngo" data-arg="' + w.tab + '">' + w.btn + ' ›</button></div></div>';
        }).join('') +
        '<button class="btn primary" data-act="endturn-force">End turn anyway</button><button class="btn" data-act="close">Cancel</button>');
      return;
    }
    doEndTurn();
  });
  on('warngo', function (t) { closeModal(); K.view.tab = t; if (t === 'sci') K.view.sci = 'research'; render(); window.scrollTo(0, 0); });
  on('endturn-force', function () { closeModal(); doEndTurn(); });
  function doEndTurn() {
    E.endTurn();
    render();
    window.scrollTo(0, 0);
    showSummary();
  }

  function showSummary() {
    var s = S(), sm = s.summary, n = E.pn(), p = s.player;
    if (!sm) { resumePending(); return; }
    var f = sm.from;
    function d(label, a, b, fmt, pctMode) {
      var diff = b - a, cls = diff > 0.0001 ? 'good' : diff < -0.0001 ? 'bad' : 'muted';
      var ds = pctMode ? U.signed((b / a - 1) * 100, 1) + '%' : U.signed(diff, 0);
      return '<div class="delta"><span>' + label + '</span><span>' + fmt(b) + ' <span class="' + cls + '">' + ds + '</span></span></div>';
    }
    var html = '<div class="kicker">' + f.year + ' → ' + s.year + '</div><h2>' + (sm.years === 1 ? 'A year passes' : sm.years + ' years pass') + '</h2>';
    if (f.nation === n.id) {
      html += d('GDP', f.gdp, n.gdp, U.money, true) + d('Population', f.pop, n.pop, U.people, true) +
        d('Military power', f.army, E.power(n), function (v) { return U.num(v); }, true) +
        d('Approval', f.approval, n.approval, Math.round) + d('Stability', f.stability, n.stability, Math.round) +
        d('Tech', f.tech, n.tech, function (v) { return v.toFixed(1); });
      if (f.treasury !== undefined) {
        var tdiff = n.treasury - f.treasury;
        html += '<div class="delta"><span>' + (n.treasury >= 0 ? 'Treasury' : 'National debt') + '</span><span>' +
          U.money(Math.abs(n.treasury)) + ' <span class="' + (tdiff >= 0 ? 'good' : 'bad') + '">' + signedMoney(tdiff) + '</span></span></div>';
      }
    }
    html += d('Your influence', f.influence, p.influence, Math.round) + d('Your popularity', f.popularity, p.popularity, Math.round);
    var news = sm.news.filter(function (x) { return x.type !== 'world'; }).concat(sm.news.filter(function (x) { return x.type === 'world'; })).slice(0, 12);
    if (news.length) html += '<h3 style="margin-top:14px">Headlines</h3>' + news.map(function (x) { return '<div class="log-item ' + x.type + '">' + esc(x.text) + '</div>'; }).join('');
    html += '<button class="btn primary" data-act="summaryok">Continue</button>';
    s.summary = null;
    E.save();
    modal(html);
  }
  on('summaryok', function () { closeModal(); resumePending(); });

  function resumePending() {
    var s = S();
    if (s.succession) return showSuccession();
    if (s.event) return showEvent();
    render();
  }

  function showEvent() {
    var ev = S().event, v = EV.view(ev);
    modal('<div class="kicker">' + S().year + ' · Event</div><h2>' + esc(v.title) + '</h2><p style="font-size:16px">' + esc(v.text) + '</p>' +
      v.choices.map(function (c, i) { return '<button class="choice" data-act="evchoice" data-arg="' + i + '"><div class="t">' + esc(c) + '</div></button>'; }).join(''));
  }
  on('evchoice', function (i) {
    var res = EV.choose(S().event, +i);
    render();
    showResult(res, resumePending);
  });

  function showSuccession() {
    var s = S(), sc = s.succession, p = s.player;
    var opts = E.successorOptions();
    succOpts = opts;
    var html = '<div class="kicker">' + (sc.dead ? 'The end of a chapter' : 'A setback') + '</div><h2>' + (sc.dead ? esc(p.name) : 'Out of power') + '</h2><p style="font-size:16px">' + esc(sc.text) + '</p>';
    if (!sc.dead) html += '<button class="choice sel" data-act="fighton"><div class="t">Fight on as ' + esc(p.name) + '</div><div class="d">Stay in the game as a ' + D.roles[p.role].name + ' and plot your comeback.</div></button>';
    html += '<h3 style="margin-top:12px">' + (sc.dead ? 'Who carries on?' : 'Or pass the torch') + '</h3>';
    opts.forEach(function (o, i) {
      html += '<button class="choice" data-act="successor" data-arg="' + i + '"><div class="t">' + esc(o.name) + ' (' + o.age + ')</div>' +
        '<div class="d">' + (o.kind === 'heir' ? 'Heir' : 'Protégé') + ' · ' + esc(D.roles[o.role].name) + '. ' + esc(o.desc) + '</div></button>';
    });
    modal(html);
  }
  var succOpts = [];
  on('fighton', function () { E.continueAfterLoss(); E.save(); closeModal(); K.view.tab = 'act'; resumePending(); });
  on('successor', function (i) {
    E.applySuccessor(succOpts[+i]);
    S().event = null;
    E.save();
    closeModal();
    K.view.tab = 'home';
    render();
    toast('A new chapter begins.');
  });

  K.render = render;
  K.resumePending = resumePending;

  function start() {
    app = $('app');
    titleScreen();
  }

  return { start: start, render: render };
})();
