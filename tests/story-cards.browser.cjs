/* Run with Playwright installed, STORY_BASE_URL optional. All API fixtures are synthetic. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:8766';
const output = process.env.STORY_SCREENSHOTS;
const results = [];
const pass = name => { results.push(name); console.log('PASS', name); };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
  const page = await context.newPage();
  const errors = [], badAssets = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && /story-cards|storybook/.test(response.url())) badAssets.push(response.url()); });
  await context.route('**/api/**', async route => {
    const request = route.request(); requests.push({ url: request.url(), method: request.method() });
    const url = new URL(request.url());
    let value = { messages: [], profile: {}, conversations: [] };
    if (url.pathname.endsWith('/session')) value = { authVersion: 1, sessionToken: 'A'.repeat(43) };
    if (url.pathname.endsWith('/chat')) value = { assistant: { content: '测试回信：我在这里，听你慢慢说。', createdAt: '2026-10-16T12:00:00Z' } };
    if (url.pathname.endsWith('/messages') && request.method() === 'POST') value = { id: 'test-message', assistant: { content: '测试回信：我在这里。', createdAt: '2026-10-16T12:00:00Z' } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
  });
  const ticket = action => page.locator(`[data-story="${action}"]`);
  const isCurrent = action => ticket(action).getAttribute('aria-current');
  async function start() {
    await page.goto(base + '/index.html#home', { waitUntil: 'networkidle' });
    await page.locator('.story-carousel.is-ready').waitFor();
    await page.evaluate(() => { window.storyEntries = []; document.addEventListener('storybook:enter', event => window.storyEntries.push(event.detail.action)); });
  }
  async function select(action) { await ticket(action).focus(); assert.equal(await isCurrent(action), 'true'); }
  async function back() {
    if (await page.locator('#storyModal.active').count()) await page.locator('[data-rose-action="close"]').click();
    if (await page.locator('#foxTamingModal.active').count()) await page.locator('.fox-taming-modal__close').click();
    await page.locator('.nav-link[data-page="home"]').click();
    await page.waitForTimeout(500);
  }
  async function destination(action) {
    const selector = { rose: '#storyModal.active', fox: '#foxTamingModal.active', journey: '#journey.active', b612: '#b612.active' }[action];
    await page.locator(selector).waitFor({ state: 'visible' });
  }
  async function drag(locator, dx, dy = 0) {
    const box = await locator.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await start();
  assert.equal(await page.locator('[data-story]').count(), 6);
  assert.equal(await page.locator('.story-ticket__art').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
  assert.equal(requests.length, 0); pass('six real illustrated cards; browsing homepage makes no API requests');
  await select('rose');
  await page.locator('[data-carousel-next]').click(); assert.equal(await isCurrent('journey'), 'true');
  await page.locator('[data-carousel-prev]').click(); assert.equal(await isCurrent('rose'), 'true');
  await page.locator('[data-carousel-prev]').click(); assert.equal(await isCurrent('flight'), 'true'); pass('next, previous, wraparound and reduced motion navigation');
  await select('rose');
  await ticket('journey').locator('.story-ticket__enter').click();
  assert.equal(await isCurrent('journey'), 'true'); assert.deepEqual(await page.evaluate(() => storyEntries), []);
  pass('first pointer click on a side ticket selects without entering');
  await select('rose'); await page.keyboard.press('ArrowRight');
  assert.equal(await isCurrent('journey'), 'true');
  assert.equal(await ticket('journey').evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('ArrowLeft'); assert.equal(await isCurrent('rose'), 'true'); pass('arrow keys move focus and centered ticket together');
  for (const action of ['rose', 'journey', 'fox', 'b612']) {
    await select(action); await ticket(action).locator('[data-home-action]').click(); await destination(action);
    assert.equal(await page.evaluate(() => storyEntries.at(-1)), action);
    await back();
    assert.equal(await ticket(action).locator('[data-tear]').isEnabled(), true);
    assert.equal(await page.locator('.story-ticket.is-torn').count(), 0);
  }
  pass('all four regular entry buttons keep original destinations and restore after return');
  const extras = await context.newPage();
  await extras.goto(base + '/index.html#home');
  await extras.locator('[data-story="flight"]').focus();
  await extras.locator('[data-home-action="flight"]').click();
  await extras.locator('#flightLogModal.active').waitFor();
  await extras.locator('#closeFlightLog').click();
  await extras.locator('[data-story="mailbox"]').focus();
  await extras.locator('[data-home-action="mailbox"]').click();
  await extras.waitForURL('**/star-mailbox.html');
  await extras.goBack(); await extras.locator('.story-carousel.is-ready').waitFor();
  await extras.close(); pass('two new destinations open real flight log and starry mailbox; browser back restores carousel');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (await page.locator('[data-carousel-pause]').getAttribute('aria-pressed') !== 'true') await page.locator('[data-carousel-pause]').click();
  await select('rose');
  let before = await page.evaluate(() => storyEntries.length);
  await drag(ticket('rose').locator('[data-tear]'), 35);
  assert.equal(await page.evaluate(() => storyEntries.length), before);
  assert.equal(await ticket('rose').locator('[data-tear]').evaluate(element => element.style.transform), '');
  pass('short tear returns to place without opening a story');
  for (const action of ['rose', 'journey', 'fox', 'b612']) {
    await select(action); before = await page.evaluate(() => storyEntries.length);
    await drag(ticket(action).locator('[data-tear]'), 100); await destination(action);
    assert.equal(await page.evaluate(() => storyEntries.length), before + 1);
    assert.equal(await page.evaluate(() => storyEntries.at(-1)), action);
    await back(); assert.equal(await page.locator('.story-ticket.is-torn').count(), 0);
  }
  pass('four real pointer tears enter exactly once and reset on return');
  await select('rose'); await drag(ticket('rose').locator('.story-ticket__art'), -220);
  await page.waitForTimeout(1300); assert.notEqual(await isCurrent('rose'), 'true');
  before = await page.evaluate(() => storyEntries.length);
  assert.equal(before, 8); pass('body drag rotates with momentum and never navigates');
  await select('fox'); await ticket('fox').locator('[data-tear]').focus(); await page.keyboard.press('Enter');
  await destination('fox'); await back(); pass('keyboard can tear a ticket and enter');
  await select('rose');
  const box = await ticket('rose').locator('[data-tear]').boundingBox();
  await page.mouse.move(box.x + 15, box.y + 100); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 100, { steps: 8 });
  await page.locator('.nav-link[data-page="journey"]').dispatchEvent('click'); await page.mouse.up();
  await page.waitForTimeout(600); assert.equal(await page.locator('#journey.active').count(), 1);
  await back(); assert.equal(await page.locator('.is-tearing, .is-torn').count(), 0); pass('navigation interrupts an unfinished tear without delayed entry');
  await select('rose');
  await page.locator('#openFlightLog').click();
  const stopped = await ticket('rose').evaluate(element => element.style.transform);
  await page.waitForTimeout(300); assert.equal(await ticket('rose').evaluate(element => element.style.transform), stopped);
  await page.locator('#closeFlightLog').click(); pass('flight log still opens and carousel stops behind overlay');
  await page.locator('.nav-link[data-page="journey"]').click();
  await page.locator('.journey-map__node').first().click(); await page.locator('#journeyChapterModal.active').waitFor();
  await page.locator('button[data-journey-modal-close]').click(); pass('planet map chapter still opens and closes');
  await page.locator('.nav-link[data-page="b612"]').click();
  await page.locator('#b612InlineInput').fill('这是本地回归测试');
  await page.locator('#b612InlineSend').click();
  await page.locator('#b612ChatModal.active').waitFor();
  await page.waitForFunction(() => document.querySelector('#b612ChatList').textContent.includes('测试回信'));
  assert.ok(requests.some(request => request.method === 'POST' && /\/chat$/.test(request.url)));
  await page.locator('#b612ChatClose').click(); await back(); pass('B612 sends an actual request and renders synthetic response');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await select('rose');
  for (const width of [1440, 1024, 768, 600, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${width}`);
    const front = await ticket('rose').boundingBox();
    assert.ok(front.x >= 0 && front.x + front.width <= width, `front clipped ${width}`);
    assert.equal(await ticket('rose').locator('.story-ticket__words').evaluate(element => element.scrollWidth > element.clientWidth), false);
    await ticket('rose').locator('[data-home-action]').click(); await destination('rose'); await back();
  }
  pass('1440 / 1024 / 768 / 600 / 390 / 320: readable card, clickable entry, no horizontal scroll');
  // Real touch events: horizontal swipe rotates, vertical swipe can scroll the page.
  const cdp = await context.newCDPSession(page);
  await page.setViewportSize({ width: 390, height: 844 }); await select('rose');
  const mobile = await ticket('rose').locator('.story-ticket__art').boundingBox();
  const tx = mobile.x + mobile.width / 2, ty = mobile.y + mobile.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx - i * 17, y: ty }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.notEqual(await isCurrent('rose'), 'true'); pass('mobile touch swipe selects another story');
  await select('rose');
  const scrollBefore = await page.evaluate(() => scrollY);
  const verticalBox = await ticket('rose').locator('.story-ticket__art').boundingBox();
  const vx = verticalBox.x + 90, vy = verticalBox.y + 110;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vx, y: vy }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: vx, y: vy - i * 15 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
  assert.ok(await page.evaluate(before => document.documentElement.scrollHeight <= innerHeight || scrollY > before, scrollBefore));
  assert.equal(await isCurrent('rose'), 'true'); pass('vertical touch gesture scrolls the page without rotating or entering');
  await select('rose'); await page.mouse.move(0, 0);
  await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
  if (output) { fs.mkdirSync(output, { recursive: true }); await page.screenshot({ path: path.join(output, '首页收藏卡_手机.png'), clip: { x: 0, y: 0, width: 390, height: await page.evaluate(() => document.documentElement.scrollHeight) } }); }
  await page.setViewportSize({ width: 1440, height: 1000 }); await select('rose');
  await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
  if (output) await page.screenshot({ path: path.join(output, '首页收藏卡_桌面.png'), fullPage: true });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Restore autoplay after explicit pause, then remove keyboard/pointer focus.
  if (await page.locator('[data-carousel-pause]').getAttribute('aria-pressed') === 'true') await page.locator('[data-carousel-pause]').click();
  await page.evaluate(() => document.activeElement.blur()); await page.mouse.move(0, 0);
  const initial = await ticket('rose').evaluate(element => element.style.transform);
  await page.waitForTimeout(3000); assert.notEqual(await ticket('rose').evaluate(element => element.style.transform), initial);
  const hoverBox = await ticket('rose').boundingBox();
  await page.mouse.move(hoverBox.x + hoverBox.width / 2, hoverBox.y + hoverBox.height / 2);
  const hover = await ticket('rose').evaluate(element => element.style.transform);
  await page.waitForTimeout(200); assert.equal(await ticket('rose').evaluate(element => element.style.transform), hover);
  pass('autoplay resumes after delay and pauses on hover');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.mouse.move(0, 0); await page.evaluate(() => document.activeElement.blur());
  const reducedTransform = await ticket('rose').evaluate(element => element.style.transform);
  await page.waitForTimeout(2600); assert.equal(await ticket('rose').evaluate(element => element.style.transform), reducedTransform); pass('reduced motion disables autoplay');
  const fallback = await context.newPage();
  await fallback.route('**/story-cards.js*', route => route.abort());
  await fallback.goto(base + '/index.html');
  assert.equal(await fallback.locator('.story-carousel.is-ready').count(), 0);
  await fallback.locator('[data-home-action="rose"]').click(); await fallback.locator('#storyModal.active').waitFor();
  pass('blocked carousel module leaves static cards and original entry usable');
  assert.deepEqual(errors, []); assert.deepEqual(badAssets, []);
  if (output) fs.writeFileSync(path.join(output, '首页收藏卡_测试结果.json'), JSON.stringify({ results, errors, badAssets, apiMode: 'synthetic fixtures' }, null, 2));
  await browser.close(); console.log(`ALL ${results.length} BROWSER SCENARIOS PASS`);
})().catch(error => { console.error(error); process.exit(1); });
