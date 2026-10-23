const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index-main.js'), 'utf8');
const data = source.slice(source.indexOf('        const journeyChapters ='), source.indexOf('        const foxModal'));
function harness(reduced = false) {
  const classes = new Set();
  const modal = { classList: { contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c) }, setAttribute() {} };
  const pending = new Map();
  let timer = 0;
  const context = vm.createContext({
    window: { scrollY: 320, clearTimeout: id => pending.delete(id), setTimeout: fn => { pending.set(++timer, fn); return timer; }, requestAnimationFrame() {}, matchMedia: () => ({ matches: reduced }) },
    document: { body: {}, activeElement: { isConnected: true, getClientRects: () => [{}] } },
    location: { hash: '#journey' },
    history: { state: {}, pushState(state, _, url) { this.state = state; context.location.hash = url; }, replaceState(state, _, url) { this.state = state; context.location.hash = url; } },
    journeyChapterModal: modal,
    journeyChapterPanel: { focus() {}, hasPointerCapture() { return false; } },
    journeyChapterContent: { classList: { add() {}, remove() {} } },
    journeyMapNodes: [],
    rememberPageScroll() {}, layoutJourneyChapterSideNav() {},
    locks: 0, unlocks: 0, focuses: 0,
  });
  vm.runInContext(data + `
    let journeyModalIndex = 0, journeyModalScrollY = 320, journeySwitchTimer = null,
        journeySwipe = null, journeyOpener = null, journeyPendingIndex = null;
    function renderJourneyChapter(index) { journeyModalIndex = index; }
    function lockJourneyBackground() { locks++; }
    function unlockJourneyBackground() { unlocks++; }
    function restoreStoryFocus() { focuses++; }
  ` + source.slice(source.indexOf('        function cancelJourneySwitch()'), source.indexOf('        // 关闭：遮罩')) + `
    globalThis.api = { openJourneyChapter, closeJourneyChapter, switchJourneyTo, switchJourneyChapter,
      index: () => journeyModalIndex, chapters: journeyChapters, journeyChapterIndexForId };
  `, context);
  return { context, api: context.api, flush() {
    while (pending.size) { const [id, fn] = pending.entries().next().value; pending.delete(id); fn(); }
  }};
}

test('every map entrance has its own stable story ID, title and existing illustration', () => {
  const { api } = harness();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/class="journey-map__node"[^>]*data-target="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, 8);
  const titles = ['B612与玫瑰', '国王星球', '爱慕虚荣者', '酒鬼', '商人', '点灯人', '地理学家', '回到初心'];
  ids.forEach((id, i) => {
    const chapter = api.chapters[api.journeyChapterIndexForId(id)];
    assert.equal(chapter.title, titles[i]);
    assert.ok(fs.existsSync(path.join(root, chapter.image)), chapter.image);
    assert.ok(chapter.text.length >= 3);
  });
  assert.equal(api.journeyChapterIndexForId('planet-99'), -1);
});
test('closing during a delayed page turn cancels rendering and URL changes', () => {
  const h = harness(); h.api.openJourneyChapter(3); h.api.switchJourneyTo(4); h.api.closeJourneyChapter(); h.flush();
  assert.equal(h.api.index(), 3);
  assert.equal(h.context.location.hash, '#journey');
  assert.equal(h.context.unlocks, 1);
  assert.equal(h.context.focuses, 1);
});
test('rapid Next clicks advance from the pending target and keep only the latest turn', () => {
  const h = harness(); h.api.openJourneyChapter(0); h.api.switchJourneyChapter(1); h.api.switchJourneyChapter(1); h.flush();
  assert.equal(h.api.index(), 2);
  assert.equal(h.context.location.hash, '#planet-2');
});
test('reversing a pending turn restores the current chapter URL', () => {
  const h = harness(); h.api.openJourneyChapter(3); h.api.switchJourneyChapter(1); h.api.switchJourneyChapter(-1); h.flush();
  assert.equal(h.api.index(), 3);
  assert.equal(h.context.location.hash, '#planet-3');
});
test('duplicate route opens do not recapture the locked page scroll', () => {
  const h = harness(); h.api.openJourneyChapter(1, false); h.api.openJourneyChapter(1, false);
  assert.equal(h.context.locks, 1);
  h.api.closeJourneyChapter(false); h.api.closeJourneyChapter(false);
  assert.equal(h.context.unlocks, 1);
});
test('closed readers ignore turns and reduce-motion turns have no delayed task', () => {
  const h = harness(true); h.api.switchJourneyTo(3); assert.equal(h.api.index(), 0);
  h.api.openJourneyChapter(1); h.api.switchJourneyTo(2); assert.equal(h.api.index(), 2);
  h.api.closeJourneyChapter(); h.flush(); assert.equal(h.context.location.hash, '#journey');
});
test('passive map highlighting never changes the route', () => {
  const body = source.slice(source.indexOf('        function setActivePlanet('), source.indexOf('        function prepareJourneyQuotes('));
  let moves = 0;
  const c = vm.createContext({ journeyPlanetTargets: ['planet-0','planet-1'], journeyMapActiveIndex:0, journeyMapNodes:[], moveJourneyShipTo() { moves++; }, history: { replaceState() { throw Error('passive route mutation'); } } });
  vm.runInContext(body + 'setActivePlanet(1);', c);
  assert.equal(moves, 1);
});

function routeHarness() {
  const frames = new Map(); let frameId = 0;
  const c = vm.createContext({
    window: { scrollY: 0, requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame(id) { frames.delete(id); }, scrollTo(_x, y) { this.scrollY = y; } },
    history: { state: { pageScrollY: 275 }, replaceState() {} }, location: { hash: '#journey' },
    journeyChapterIndexForId: id => id === 'planet-1' ? 1 : -1,
    journeyChapterModal: { classList: { contains: () => false } },
    foxState: { isOpen: false }, document: { getElementById: () => ({ classList: { contains: () => false } }) },
    pages: [], opened: [], showPage(id) { c.pages.push(id); }, openJourneyChapter(i) { c.opened.push(i); },
    closeJourneyChapter() {}, closeB612ChatModal() {}, b612ChatModal: { classList: { contains: () => false } }, openB612ChatModal() {},
  });
  vm.runInContext(source.slice(source.indexOf('        let pendingRouteFrame ='), source.indexOf("        document.querySelectorAll('.nav-link').forEach((link) => {", source.indexOf('        function routeFromHash()'))) + '\nglobalThis.route = routeFromHash;', c);
  return { c, flush() { for (const [id, fn] of frames) { frames.delete(id); fn(); } } };
}
test('paired history events preserve the destination scroll restoration', () => {
  const h = routeHarness(); h.c.route(); h.c.route(); h.flush();
  assert.deepEqual([...h.c.pages], ['journey']);
  assert.equal(h.c.window.scrollY, 275);
});
test('a newer route cancels the scheduled opening of an old planet URL', () => {
  const h = routeHarness(); h.c.location.hash = '#planet-1'; h.c.route();
  h.c.location.hash = '#home'; h.c.route(); h.flush();
  assert.deepEqual([...h.c.pages], ['home']);
  assert.equal(h.c.opened.length, 0);
});
