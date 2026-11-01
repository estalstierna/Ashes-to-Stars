// Mobile UI smoke test: create a character, play turns, screenshot each tab. Fails on any page error.
const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const out = process.argv[2] || '/tmp/shots';
  require('fs').mkdirSync(out, { recursive: true });
  const shot = async n => { await page.waitForTimeout(350); return page.screenshot({ path: path.join(out, n + '.png') }); };
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await shot('01-title');
  await page.click('[data-act=newgame]');
  await shot('02-lore');
  await page.click('[data-act=tocreate]');
  await page.fill('#cname', 'Astrid Lindberg');
  await page.click('[data-act=pnation][data-arg=SWE]');
  await page.click('[data-act=prole][data-arg=leader]');
  await shot('03-create');
  await page.click('[data-act=start]');
  // Resolve any pending event/result modals.
  async function clearModals() {
    for (let i = 0; i < 10; i++) {
      if (await page.isHidden('#modal')) return;
      for (const sel of ['[data-act=evchoice]', '[data-act=resultok]', '[data-act=summaryok]', '[data-act=successor]', '[data-act=close]']) {
        const el = await page.$('#modal ' + sel);
        if (el) { await el.click(); break; }
      }
    }
  }
  if (!(await page.isHidden('#modal'))) await shot('04-event');
  await clearModals();
  await shot('05-home');
  await page.click('[data-act=tab][data-arg=act]');
  await shot('06-actions');
  await page.click('[data-act=doaction][data-arg=infra]');
  await page.click('[data-act=doaction][data-arg=research]').catch(() => {});
  await page.click('[data-act=tab][data-arg=world]');
  await shot('07-world');
  await page.click('[data-act=nation][data-arg=RUS]');
  await shot('08-nation');
  await page.click('#modal [data-act=close]');
  await page.click('[data-act=tab][data-arg=space]');
  await shot('09-space');
  for (let t = 0; t < 30; t++) {
    await clearModals();
    await page.click('[data-act=endturn]');
    if (t === 0) await shot('10-summary');
    await clearModals();
  }
  await page.click('[data-act=tab][data-arg=log]');
  await shot('11-log');
  await page.click('[data-act=tab][data-arg=home]');
  await shot('12-home-later');
  // Reload: save should persist.
  await page.reload();
  const cont = await page.textContent('[data-act=continue]');
  console.log('Continue button:', cont);
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('UI OK');
})();
