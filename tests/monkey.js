// Monkey test: plays many turns by tapping random buttons in every tab, for every role.
// Fails on any page error. Usage: node tests/monkey.js [turns] [seed]
const { chromium, devices } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const turns = +process.argv[2] || 40;
let seed = +process.argv[3] || 1;
function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

const setups = [['USA', 'leader', 'normal'], ['SWE', 'leader', 'brutal'], ['RUS', 'general', 'hard'], ['IND', 'politician', 'easy'], ['PAC', 'corporate', 'normal'], ['SGP', 'leader', 'hard']];
(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  for (const [nation, role, diff] of setups) {
    const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('dialog', d => d.accept());
    await page.goto(URL);
    await page.click('[data-act=newgame]'); await page.click('[data-act=tocreate]');
    await page.fill('#cname', 'Monkey ' + nation);
    await page.click(`[data-act=pnation][data-arg=${nation}]`); await page.click(`[data-act=prole][data-arg=${role}]`);
    await page.click(`[data-act=pdiff][data-arg=${diff}]`);
    await page.click('[data-act=start]');
    let clicks = 0;
    for (let t = 0; t < turns; t++) {
      // A few random taps per turn: tabs, sub-views, actions, map, modals.
      for (let k = 0; k < 5; k++) {
        const btns = await page.$$('#modal:not(.hidden) [data-act]:not([disabled]), .page [data-act]:not([disabled]), .tabs [data-act]');
        if (!btns.length) break;
        const b = btns[Math.floor(rnd() * btns.length)];
        const act = await b.getAttribute('data-act');
        if (['abandon', 'totitle', 'newgame', 'menu', 'endturn'].includes(act)) continue;
        try { await b.click({ timeout: 400 }); clicks++; } catch (e) { /* covered or detached: fine */ }
      }
      // Random slider changes when ruling.
      const sl = await page.$$('input[type=range][data-input]');
      if (sl.length && rnd() < 0.3) {
        const s = sl[Math.floor(rnd() * sl.length)];
        await s.evaluate((el, v) => { el.value = String(Number(el.min) + (Number(el.max) - Number(el.min)) * v); el.dispatchEvent(new Event('input', { bubbles: true })); }, rnd()).catch(() => {});
      }
      // Close whatever is open and end the turn.
      for (let i = 0; i < 12; i++) {
        const el = await page.$('#modal:not(.hidden) [data-act=evchoice], #modal:not(.hidden) [data-act=resultok], #modal:not(.hidden) [data-act=summaryok], #modal:not(.hidden) [data-act=successor], #modal:not(.hidden) [data-act=endturn-force], #modal:not(.hidden) [data-act=close], #modal:not(.hidden) [data-act=fighton]');
        if (!el) break;
        await el.click({ timeout: 400 }).catch(() => {});
      }
      await page.click('[data-act=endturn]', { timeout: 3000 }).catch(() => {});
      for (let i = 0; i < 12; i++) {
        const el = await page.$('#modal:not(.hidden) [data-act=endturn-force], #modal:not(.hidden) [data-act=summaryok], #modal:not(.hidden) [data-act=evchoice], #modal:not(.hidden) [data-act=resultok], #modal:not(.hidden) [data-act=successor], #modal:not(.hidden) [data-act=fighton]');
        if (!el) break;
        await el.click({ timeout: 400 }).catch(() => {});
      }
      // Every 10 turns: reload from the save and continue.
      if (t % 10 === 9) { await page.reload(); await page.click('[data-act=continue]', { timeout: 3000 }).catch(() => {}); }
      if (errors.length) break;
    }
    const year = await page.evaluate(() => G.state && G.state.year).catch(() => '?');
    console.log(`${nation}/${role}/${diff}: reached ${year}, ${clicks} taps, ${errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].slice(0, 5).join('\n  ') : 'no errors'}`);
    if (errors.length) failures++;
    await page.context().close();
  }
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
