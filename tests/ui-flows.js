// Mobile UI flow tests: map, treaties and calls to arms, end-turn reminder, research,
// military projects, economy charts. Fails on any page error or broken expectation.
// Usage: node tests/ui-flows.js   (needs Playwright with Chromium)
const { chromium, devices } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let failures = 0;
function check(cond, msg) { if (!cond) { failures++; console.log('  ✗ ' + msg); } else console.log('  ✓ ' + msg); }

async function newGame(browser, nation, role) {
  const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(URL);
  await page.click('[data-act=newgame]'); await page.click('[data-act=tocreate]');
  await page.fill('#cname', 'Test Person');
  await page.click(`[data-act=pnation][data-arg=${nation}]`); await page.click(`[data-act=prole][data-arg=${role}]`);
  await page.click('[data-act=start]');
  await page.evaluate(() => { G.uiKit.closeModal(); G.state.event = null; G.ui.render(); });
  return { page, errors };
}
async function clearModals(page) {
  for (let i = 0; i < 8; i++) {
    const el = await page.$('#modal [data-act=summaryok], #modal [data-act=evchoice], #modal [data-act=resultok], #modal [data-act=fighton], #modal [data-act=successor]');
    if (!el) break;
    await el.click();
  }
}
async function endTurn(page) {
  await clearModals(page);
  await page.click('[data-act=endturn]');
  for (let i = 0; i < 8; i++) {
    const el = await page.$('#modal [data-act=endturn-force], #modal [data-act=summaryok], #modal [data-act=evchoice], #modal [data-act=resultok], #modal [data-act=fighton], #modal [data-act=successor]');
    if (!el) break;
    await el.click();
  }
}

(async () => {
  const browser = await chromium.launch();

  console.log('Map');
  {
    const { page, errors } = await newGame(browser, 'SWE', 'leader');
    await page.click('[data-act=tab][data-arg=world]');
    check(await page.$('#world-map path[data-nation]'), 'map draws nations');
    const pos = await page.evaluate(() => { const t = document.querySelector('.map-label[data-nation=SWE]').getBoundingClientRect(); return { x: t.x + t.width / 2, y: t.y + t.height / 2 }; });
    await page.mouse.click(pos.x, pos.y);
    check((await page.textContent('#modal-box h2')).includes('Sweden'), 'tapping a nation opens its details');
    await page.click('#modal [data-act=close]');
    await page.click('[data-act=worldview][data-arg=diplo]');
    check((await page.textContent('.page')).includes('Your treaties'), 'diplomacy view renders');
    check(errors.length === 0, 'no page errors ' + errors.join('; '));
  }

  console.log('Treaties and calls to arms');
  {
    const { page, errors } = await newGame(browser, 'SWE', 'leader');
    const queued = await page.evaluate(() => {
      const E = G.engine; E.formAlliance(E.pn(), E.nation('EF'), 'alliance');
      E.declareWar(E.nation('USA'), E.nation('CAS')); // attacks our defensive partner
      E.declareWar(E.nation('EF'), E.nation('RUS'));  // our ally attacks someone
      return G.state.eventQueue.map(e => e.id);
    });
    check(queued.includes('call-to-arms') && queued.includes('call-to-offense'), 'both calls are queued');
    await page.click('[data-act=endturn]');
    await page.click('#modal [data-act=endturn-force]');
    await page.click('#modal [data-act=summaryok]');
    await page.click('#modal [data-act=evchoice][data-arg="1"]'); // refuse to defend
    await page.click('#modal [data-act=resultok]');
    await page.click('#modal [data-act=evchoice][data-arg="1"]'); // decline the attack
    const r = await page.evaluate(() => ({ cas: G.engine.allianceType(G.engine.pn(), G.engine.nation('CAS')), ef: G.engine.allianceType(G.engine.pn(), G.engine.nation('EF')) }));
    check(r.cas === null, 'refusing to defend breaks the defensive pact');
    check(r.ef === 'alliance', 'declining an attack keeps the alliance');
    check(errors.length === 0, 'no page errors ' + errors.join('; '));
  }

  console.log('End-turn reminder, research and projects');
  {
    const { page, errors } = await newGame(browser, 'SWE', 'leader');
    await page.click('[data-act=endturn]');
    const w = await page.$$eval('#modal [data-act=warngo]', els => els.map(e => e.getAttribute('data-arg')));
    check(w.includes('act') && w.includes('sci') && w.includes('mil'), 'reminder lists actions, research and projects');
    await page.click('#modal [data-act=warngo][data-arg=sci]');
    await page.click('[data-act=research][data-arg=fusion]');
    await page.click('[data-act=tab][data-arg=mil]');
    await page.click('[data-act=startproj][data-arg=drones]'); await page.click('[data-act=startproj][data-arg=exo]');
    await page.click('[data-act=endturn]');
    const w2 = await page.$$eval('#modal [data-act=warngo]', els => els.map(e => e.getAttribute('data-arg')));
    check(!w2.includes('sci') && !w2.includes('mil'), 'reminder clears once research and projects run');
    await page.click('#modal [data-act=endturn-force]');
    for (let i = 0; i < 3; i++) await endTurn(page);
    const done = await page.evaluate(() => G.state.nations.SWE.rs.done);
    check(done.includes('fusion'), 'research completes');
    check(errors.length === 0, 'no page errors ' + errors.join('; '));
  }

  console.log('Economy charts and budget');
  {
    const { page, errors } = await newGame(browser, 'USA', 'leader');
    for (let i = 0; i < 3; i++) await endTurn(page);
    await page.click('[data-act=tab][data-arg=econ]');
    check(await page.$('#ch-gdp svg'), 'GDP chart renders');
    await page.$eval('[data-input=spend][data-k=space]', el => { el.value = '12'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    check((await page.textContent('#budget-sum')).includes('Deficit'), 'overspending shows a deficit');
    check(errors.length === 0, 'no page errors ' + errors.join('; '));
  }

  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'ALL UI FLOWS OK');
  process.exit(failures ? 1 : 0);
})();
