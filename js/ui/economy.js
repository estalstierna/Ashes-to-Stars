// Economy tab: growth breakdown, charts, national budget, trade and rankings.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events, M = G.military;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    rankStr = K.rankStr, wealthStr = K.wealthStr, on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, pctS = K.pctS,
    SECTOR_LABELS = K.SECTOR_LABELS, PACT_NAMES = K.PACT_NAMES, showResult = K.showResult;
  function render() { K.render(); }
  function resumePending() { K.resumePending(); }

  function treasuryStat(n) {
    if (n.treasury >= 0) return stat('Treasury', U.money(n.treasury));
    return stat('National debt', '<span class="bad">' + U.money(E.debt(n)) + '</span> <span class="small muted">' + Math.round(E.debtRatio(n) * 100) + '%</span>');
  }
  function balanceStat(n) {
    var b = E.balance(n);
    return stat('Budget / yr', '<span class="' + (b >= 0 ? 'good' : 'bad') + '">' + (b >= 0 ? '+' : '−') + U.money(Math.abs(b)) + '</span>');
  }

  function budgetCard(n) {
    var f = E.funds(n);
    return '<div class="card"><h3>National budget (per year)</h3>' +
      '<div class="slider-row"><div class="row"><span>💰 Tax rate <b id="taxv">' + Math.round(n.tax * 100) + '%</b></span><span class="good" id="revv">+' + U.money(E.revenue(n)) + '</span></div>' +
      '<input type="range" min="8" max="45" value="' + Math.round(n.tax * 100) + '" data-input="tax"></div>' +
      '<div class="small muted" style="margin:-2px 0 12px">Higher taxes bring in more money but hurt approval.</div>' +
      '<h3 style="margin-top:6px">Expenses <span class="small" style="text-transform:none;letter-spacing:0">(% of GDP)</span></h3>' +
      E.SECTORS.map(function (k) {
        return '<div class="slider-row"><div class="row"><span>' + SECTOR_LABELS[k] + ' <b id="sp-' + k + '">' + (n.spend[k] * 100).toFixed(1) + '%</b></span><span class="bad" id="sf-' + k + '">−' + U.money(f[k]) + '</span></div>' +
          '<input type="range" min="0" max="15" step="0.1" value="' + (n.spend[k] * 100).toFixed(1) + '" data-input="spend" data-k="' + k + '"></div>';
      }).join('') +
      '<div id="budget-sum">' + budgetSummary(n) + '</div></div>';
  }

  function line(label, value, cls, bold) {
    return '<div class="delta"' + (bold ? ' style="font-weight:700;font-size:15px"' : '') + '><span>' + label + '</span><span class="' + (cls || '') + '">' + value + '</span></div>';
  }

  function budgetSummary(n) {
    var rev = E.revenue(n), sp = E.spending(n), int = E.interest(n), bal = E.balance(n), pj = E.projectCost(n);
    var next = n.treasury + bal, dr = E.debtRatio(n);
    var h = '<div style="margin-top:8px">' +
      line('Tax revenue', '+' + U.money(rev), 'good') +
      line('Spending (' + (sp / n.gdp * 100).toFixed(1) + '% of GDP)', '−' + U.money(sp), 'bad') +
      (pj > 0 ? line('🎖️ Military projects', '−' + U.money(pj), 'bad') : '') +
      (int > 0 ? line('Interest on debt (' + (E.interestRate(n) * 100).toFixed(1) + '%)', '−' + U.money(int), 'bad') : '') +
      line(bal >= 0 ? 'Surplus' : 'Deficit', signedMoney(bal) + ' <span class="small muted">(' + (bal / n.gdp * 100).toFixed(1) + '% of GDP)</span>', bal >= 0 ? 'good' : 'bad', true) +
      '</div><div style="margin-top:10px">';
    if (n.treasury >= 0) h += line('🏦 Treasury', U.money(n.treasury));
    else h += line('📉 National debt', '<span class="bad">' + U.money(E.debt(n)) + '</span> <span class="small muted">(' + Math.round(dr * 100) + '% of GDP)</span>');
    h += line('Next year', next >= 0 ? U.money(next) + ' in treasury' : '<span class="bad">' + U.money(-next) + ' debt</span>', '');
    if (bal < 0 && n.treasury > 0) h += '<div class="small warn" style="margin-top:6px">At this rate the treasury runs dry in ' + Math.max(1, Math.ceil(n.treasury / -bal)) + ' year(s).</div>';
    if (dr > 0.9) h += '<div class="small bad" style="margin-top:6px">⚠️ Debt above 90% of GDP slows growth, raises interest and destabilises the nation.</div>';
    else if (dr > 0.6) h += '<div class="small warn" style="margin-top:6px">Debt above 60% of GDP makes lenders nervous: interest is rising.</div>';
    h += '<div class="small muted" style="margin-top:6px">Actions can be paid with borrowed money, up to ' + Math.round(E.borrowLimit(n) / n.gdp * 100) + '% of GDP in debt.</div>';
    return h + '</div>';
  }

  on('tax', function (v) {
    var n = E.pn(); n.tax = v / 100;
    $('taxv').textContent = v + '%'; $('revv').textContent = '+' + U.money(E.revenue(n));
    refreshBudget(); E.save();
  });
  on('spend', function (v, el) {
    var n = E.pn(), k = el.getAttribute('data-k');
    n.spend[k] = +v / 100;
    $('sp-' + k).textContent = (+v).toFixed(1) + '%';
    refreshBudget(); E.save();
  });
  function refreshBudget() {
    var n = E.pn(), f = E.funds(n);
    E.SECTORS.forEach(function (k) { var b = $('sf-' + k); if (b) b.textContent = '−' + U.money(f[k]); });
    var sum = $('budget-sum'); if (sum) sum.innerHTML = budgetSummary(n);
  }


  // ---------- economy ----------

  function economyTab() {
    var n = E.pn(), s = S(), gp = E.growthParts(n), lead = E.isLeader();
    var potential = U.clamp(gp.pc / gp.ceiling, 0, 2);
    var byGdp = function (x) { return x.gdp; }, byPc = function (x) { return x.gdp / x.pop; };
    var h = '';
    // Overview
    h += '<div class="card"><h2>💰 Economy of ' + esc(n.short) + '</h2><div class="grid2" style="margin-top:8px">' +
      stat('GDP #' + E.rank(n, byGdp), U.money(n.gdp)) +
      stat('Growth', '<span class="' + (gp.total >= 0 ? 'good' : 'bad') + '">' + pctS(gp.total) + '</span><span class="small muted">/yr</span>') +
      stat('Per person #' + E.rank(n, byPc), '$' + U.num(gp.pc * 1000)) +
      stat('Population', U.people(n.pop)) +
      treasuryStat(n) + balanceStat(n) +
      '</div>' +
      '<div style="margin-top:12px"><div class="row small"><span>Economic potential reached</span><b>' + Math.round(potential * 100) + '%</b></div>' + bar(potential * 100, potential > 0.9 ? 'warn' : 'good') +
      '<div class="small muted">Wealth per person is $' + U.num(gp.pc * 1000) + ' of a possible $' + U.num(gp.ceiling * 1000) + '. ' +
      (potential > 1 ? 'You are <b>above</b> the ceiling, so the economy is pulled back down. <b>Raise the ceiling</b> with technology, space milestones and by healing the Earth.' :
        potential > 0.9 ? 'You are close to the ceiling: <b>raise it</b> with technology, space milestones and by healing the Earth.' :
        'There is room to grow: the further below the ceiling, the faster you catch up.') + '</div></div></div>';

    // Growth breakdown
    h += '<div class="card"><h3>Why the economy grows ' + (gp.total >= 0 ? '' : '(or shrinks) ') + 'this year</h3>' +
      gp.parts.filter(function (p) { return Math.abs(p[1]) >= 0.0005; }).map(function (p) {
        return '<div class="delta"><span>' + p[0] + '</span><span class="' + (p[1] >= 0 ? 'good' : 'bad') + '">' + pctS(p[1], 2) + '</span></div>';
      }).join('') +
      '<div class="delta" style="font-weight:700"><span>Total growth' + (gp.raw !== gp.total ? ' (capped)' : '') + '</span><span class="' + (gp.total >= 0 ? 'good' : 'bad') + '">' + pctS(gp.total, 2) + '</span></div>' +
      '<div class="small muted" style="margin-top:8px">The ceiling ("potential") depends on <b>tech</b> (' + n.tech.toFixed(0) + '), your <b>space milestone</b> (' + esc(D.milestones[E.milestoneIndex(n)].name) + ') and <b>Earth Health</b> (' + Math.round(s.earth) + '/100).</div></div>';

    // Charts
    // Only history of the nation you belong to now (you may have moved after a conquest).
    var hist = (s.hist || []).filter(function (x) { return !x.n || x.n === n.id; });
    h += '<div class="card"><h3>GDP over time</h3>' + chartBox('ch-gdp') + '</div>';
    h += '<div class="card"><h3>Treasury / national debt over time</h3>' + chartBox('ch-debt') +
      '<div class="small muted" style="margin-top:4px">Above the line: money in the treasury. Below the line: national debt.</div></div>';
    chartData = {
      'ch-gdp': { pts: hist.map(function (x) { return [x.y, x.gdp]; }), fmt: U.money, color: '#4fc3f7' },
      'ch-debt': { pts: hist.map(function (x) { return [x.y, x.t]; }), fmt: function (v) { return v >= 0 ? U.money(v) + ' saved' : U.money(-v) + ' debt'; }, color: '#ffb35c', zero: true }
    };

    // Budget
    if (lead) h += budgetCard(n);
    else h += '<div class="card"><h3>National budget (per year)</h3><div id="budget-sum">' + budgetSummary(n) + '</div>' +
      '<div class="small warn" style="margin-top:8px">Read-only: only the head of state sets taxes and spending.</div></div>';

    // Trade
    var trade = s.pacts.filter(function (p) { return p.type === 'trade' && (p.a === n.id || p.b === n.id); });
    h += '<div class="card"><h3>Trade agreements</h3>' +
      (trade.length ? trade.map(function (p) {
        var o = E.nation(p.a === n.id ? p.b : p.a);
        return '<div class="row small" style="padding:4px 0"><span><span class="dot" style="background:' + o.color + '"></span>' + esc(o.name) + '</span><span class="muted">' + Math.max(0, p.until - s.year) + ' years left</span></div>';
      }).join('') + '<div class="small muted" style="margin-top:6px">Each agreement adds about +0.6% growth per year for both sides.</div>' :
        '<div class="small muted">No trade agreements. ' + (lead ? 'Sign one from the Actions tab or by tapping a nation on the World map (+0.6% growth for 10 years).' : '') + '</div>') + '</div>';

    // World ranking
    h += '<div class="card"><h3>World economies</h3>';
    E.alive().slice().sort(function (a, b) { return b.gdp - a.gdp; }).slice(0, 8).forEach(function (x, i) {
      h += '<div class="row small" style="padding:4px 0"><span>' + (i + 1) + '. <span class="dot" style="background:' + x.color + '"></span>' + esc(x.short) + (x === n ? ' (you)' : '') + '</span>' +
        '<span>' + U.money(x.gdp) + ' <span class="muted">· ' + pctS(x.growth || 0) + '</span></span></div>';
    });
    if (E.rank(n, byGdp) > 8) h += '<div class="row small" style="padding:4px 0"><span>' + E.rank(n, byGdp) + '. ' + esc(n.short) + ' (you)</span><span>' + U.money(n.gdp) + '</span></div>';
    return h + '</div>';
  }

  // ---------- line charts (single series, one axis, tap/hover for values) ----------
  var chartData = {};
  var CW = 340, CH = 170, PL = 58, PR = 12, PT = 12, PB = 26;
  function chartBox(id) { return '<div class="chart" id="' + id + '"></div>'; }
  function niceTicks(lo, hi) {
    var span = hi - lo || Math.abs(hi) || 1, step = Math.pow(10, Math.floor(Math.log10(span / 3)));
    [1, 2, 5, 10].some(function (m) { if (span / (step * m) <= 4) { step *= m; return true; } });
    var t = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + 1e-9; v += step) t.push(v);
    return t;
  }
  function drawChart(id) {
    var el = $(id), d = chartData[id];
    if (!el || !d) return;
    // Draw at the real pixel size so text is never stretched.
    CW = Math.max(280, el.clientWidth || 340); CH = 170;
    if (d.pts.length < 2) { el.innerHTML = '<div class="small muted" style="padding:20px 0;text-align:center">Not enough history yet: play a few turns.</div>'; return; }
    var xs = d.pts.map(function (p) { return p[0]; }), ys = d.pts.map(function (p) { return p[1]; });
    var x0 = xs[0], x1 = xs[xs.length - 1], y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (d.zero) { y0 = Math.min(0, y0); y1 = Math.max(0, y1); } else y0 = Math.min(y0, 0);
    if (y1 === y0) y1 = y0 + 1;
    var X = function (v) { return PL + (v - x0) / (x1 - x0 || 1) * (CW - PL - PR); };
    var Y = function (v) { return PT + (1 - (v - y0) / (y1 - y0)) * (CH - PT - PB); };
    var svg = '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="chart-svg">';
    niceTicks(y0, y1).forEach(function (t) {
      svg += '<line x1="' + PL + '" x2="' + (CW - PR) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" class="grid' + (t === 0 && d.zero ? ' zero' : '') + '"/>' +
        '<text x="' + (PL - 6) + '" y="' + Y(t) + '" class="ylab">' + esc(t === 0 ? '0' : U.money(t).replace('$', '$')) + '</text>';
    });
    svg += '<text x="' + PL + '" y="' + (CH - 6) + '" class="xlab" text-anchor="start">' + x0 + '</text>' +
      '<text x="' + (CW - PR) + '" y="' + (CH - 6) + '" class="xlab" text-anchor="end">' + x1 + '</text>';
    var path = d.pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join('');
    if (d.zero) svg += '<path d="' + path + 'L' + X(x1) + ',' + Y(0) + 'L' + X(x0) + ',' + Y(0) + 'Z" fill="' + d.color + '" fill-opacity="0.12"/>';
    svg += '<path d="' + path + '" fill="none" stroke="' + d.color + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
      '<line class="cross hidden" y1="' + PT + '" y2="' + (CH - PB) + '"/></svg>' +
      '<div class="chart-dot hidden" style="background:' + d.color + '"></div><div class="chart-tip hidden"></div>';
    el.innerHTML = svg;
    var svgEl = el.querySelector('svg'), cross = el.querySelector('.cross'), tip = el.querySelector('.chart-tip'), dot = el.querySelector('.chart-dot');
    function show(e) {
      var r = svgEl.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * CW;
      var yr = x0 + (vx - PL) / (CW - PL - PR) * (x1 - x0), best = 0;
      d.pts.forEach(function (p, i) { if (Math.abs(p[0] - yr) < Math.abs(d.pts[best][0] - yr)) best = i; });
      var p = d.pts[best], px = X(p[0]) / CW * r.width, py = Y(p[1]) / CH * r.height;
      cross.setAttribute('x1', X(p[0])); cross.setAttribute('x2', X(p[0])); cross.classList.remove('hidden');
      dot.style.left = px + 'px'; dot.style.top = py + 'px'; dot.classList.remove('hidden');
      tip.innerHTML = '<b>' + p[0] + '</b> · ' + esc(d.fmt(p[1]));
      tip.style.left = Math.min(Math.max(px, 60), r.width - 60) + 'px'; tip.classList.remove('hidden');
    }
    function hide() { cross.classList.add('hidden'); tip.classList.add('hidden'); dot.classList.add('hidden'); }
    svgEl.addEventListener('pointermove', show);
    svgEl.addEventListener('pointerdown', show);
    svgEl.addEventListener('pointerleave', hide);
  }
  function initCharts() { Object.keys(chartData).forEach(drawChart); }


  K.treasuryStat = treasuryStat; K.balanceStat = balanceStat;
  K.tabs.econ = { render: economyTab, after: initCharts };
})();
