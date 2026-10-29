/* 01 → 02 uses two live DOM scenes in one stage. No page navigation, modal or screenshot swapping. */
(() => {
  'use strict';
  const first = document.getElementById('scene'), next = document.getElementById('next');
  const book = first.parentElement, motion = matchMedia('(prefers-reduced-motion: reduce)');
  const firstURL = new URL(location.href); firstURL.hash = '';
  const firstTitle = document.title;
  const firstExtras = [...book.children].filter(el => el !== first);
  const savedHidden = new Map(firstExtras.map(el => [el, el.hidden]));
  const firstNav = book.querySelector('.chapter-nav');
  const stage = document.createElement('div'); stage.className = 'story-stage';
  first.before(stage); stage.append(first);
  const note = document.createElement('p'); note.className = 'chapter-navigation-status'; note.setAttribute('role', 'status'); note.setAttribute('aria-live', 'polite'); note.hidden = true;
  const chapter = window.CLOSER_STORY.create({
    onPrevious: () => returnFirst(),
    onCover: () => document.querySelector('.page-masthead .back-link').click()
  });
  chapter.deactivate(); stage.append(chapter.element); book.append(chapter.extras, note);
  let current = '01', active = null, entries = 0;
  const animations = run => run.animations;
  function add(run, element, frames, options = {}) {
    const animation = element.animate(frames, { duration: 1400, fill: 'both', easing: 'ease-in-out', ...options });
    animations(run).push(animation); animation.finished.catch(() => {}); return animation;
  }
  function signalChange() { window.dispatchEvent(new CustomEvent('storybook:chapterchange', { detail: { chapter: current } })); }
  function hideFirst() {
    savedHidden.forEach((_, el) => { el.hidden = true; }); first.hidden = true; first.inert = true;
  }
  function showFirst() {
    first.hidden = false; first.inert = false;
    savedHidden.forEach((value, el) => { el.hidden = value; });
    firstNav.inert = false; next.disabled = false; next.removeAttribute('aria-busy');
  }
  function cleanup(run) {
    run.animations.forEach(a => a.cancel()); run.title?.remove(); run.petal?.remove();
    delete stage.dataset.transitioning;
    if (active === run) { active = null; next.disabled = false; next.removeAttribute('aria-busy'); firstNav.inert = false; }
  }
  function cancel({ focus = true } = {}) {
    if (!active) return;
    const run = active; run.cancelled = true; cleanup(run); chapter.deactivate();
    if (current === '01') showFirst(); note.hidden = true;
    if (focus) next.focus({ preventScroll: true });
  }
  function commit({ history = true, focus = true } = {}) {
    hideFirst(); current = '02'; document.body.dataset.chapter = '02';
    chapter.element.hidden = false; chapter.element.inert = false; chapter.extras.hidden = false;
    chapter.element.querySelector('.c02-camera').style.transform = 'scale(1.025)';
    document.title = '02 · 靠近 — 关于她 · 互动绘本';
    note.hidden = true; entries++;
    if (history) window.history.pushState({ storybookChapter: '02' }, '', `${firstURL.pathname}${firstURL.search}#chapter-02`);
    if (focus) chapter.element.querySelector('#c02-water').focus({ preventScroll: true });
    signalChange();
  }
  async function request() {
    if (active || current === '02') return;
    if (first.dataset.phase === 'loading') { note.textContent = '第一幕插画仍在准备，请稍候再翻页。'; note.hidden = false; return; }
    const run = { animations: [], cancelled: false, title: null, petal: null };
    active = run; next.disabled = true; next.setAttribute('aria-busy', 'true'); first.inert = true; firstNav.inert = true;
    try {
      if (!chapter.state.assetsReady) { note.textContent = '正在准备下一页的水彩……'; note.hidden = false; }
      await chapter.loadAssets(); await document.fonts.ready;
      if (run.cancelled) return;
      note.hidden = true; chapter.activate({ focus: false }); chapter.extras.hidden = true; chapter.element.inert = true;
      stage.dataset.transitioning = 'true';
      if (!motion.matches) {
        for (const node of first.querySelectorAll('.dialogue,.heart-whisper,.bloom-hint,.chapter-heading,.scene-margin,.scene-caption')) add(run, node, [{ opacity: 1 }, { opacity: 0 }], { duration: 280 });
        add(run, first, [
          { opacity: 1, transform: 'scale(1)', transformOrigin: '60% 65%', offset: 0 },
          { opacity: 1, offset: .16 },
          { opacity: 0, offset: .86 },
          { opacity: 0, transform: 'scale(1.025)', transformOrigin: '60% 65%', offset: 1 }
        ]);
        const arrival = add(run, chapter.element, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .16 }, { opacity: 1, offset: .86 }, { opacity: 1, offset: 1 }]);
        add(run, chapter.element.querySelector('.c02-camera'), [{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }]);
        // Match both figures' live geometry throughout the crossfade. The new
        // closer composition must not create two heads at different positions.
        const firstFigure = first.querySelector('.character'), closerFigure = chapter.element.querySelector('.c02-prince');
        const firstRose = first.querySelector('.rose-target'), closerRose = chapter.element.querySelector('.c02-rose');
        const firstFigureBox = firstFigure.getBoundingClientRect(), closerFigureBox = closerFigure.getBoundingClientRect();
        const dx = closerFigureBox.left - firstFigureBox.left, ratio = closerFigureBox.width / firstFigureBox.width;
        add(run, firstFigure, [{ transform: 'translateX(0) scale(1)', transformOrigin: '0 100%' }, { transform: `translateX(${dx}px) scale(${ratio})`, transformOrigin: '0 100%' }]);
        add(run, closerFigure, [{ transform: `translateX(${-dx}px) scale(${1 / ratio})` }, { transform: 'translateX(0) scale(1)' }]);
        const roseDX = closerRose.getBoundingClientRect().left - firstRose.getBoundingClientRect().left;
        add(run, firstRose, [{ transform: 'translateX(0)' }, { transform: `translateX(${roseDX}px)` }]);
        add(run, closerRose, [{ transform: `translateX(${-roseDX}px)` }, { transform: 'translateX(0)' }]);
        for (const node of chapter.element.querySelectorAll('.chapter-heading,.scene-margin,.scene-caption,.c02-can,.c02-dome')) add(run, node, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .78 }, { opacity: 1, offset: 1 }]);
        const title = document.createElement('div'); title.className = 'chapter-bridge-title'; title.setAttribute('aria-hidden', 'true');
        title.innerHTML = '<h2>02 · 靠近</h2><p>GETTING CLOSER</p>'; stage.append(title); run.title = title;
        add(run, title, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .25 }, { opacity: 1, offset: .43 }, { opacity: 1, offset: .70 }, { opacity: 0, offset: 1 }]);
        const petal = document.createElement('img'); petal.className = 'chapter-bridge-petal'; petal.src = window.CLOSER_ASSETS.petal; petal.alt = ''; stage.append(petal); run.petal = petal;
        add(run, petal, [{ opacity: 0, transform: 'translate(0,0) rotate(0deg)', offset: 0 }, { opacity: .65, offset: .22 }, { opacity: 0, transform: 'translate(-65px,-80px) rotate(-55deg)', offset: 1 }]);
        await arrival.finished.catch(() => {});
      }
      if (run.cancelled) return;
      commit(); cleanup(run);
    } catch (_) {
      if (!run.cancelled) {
        cleanup(run); chapter.deactivate(); showFirst();
        note.textContent = '第二幕插画未能载入，仍留在初见。请再点一次下一幕重试。'; note.hidden = false; next.focus({ preventScroll: true });
      }
    }
  }
  function returnFirst({ history = true, focus = true } = {}) {
    cancel({ focus: false }); chapter.deactivate(); showFirst(); current = '01';
    document.body.dataset.chapter = '01'; document.title = firstTitle; note.hidden = true;
    if (history) window.history.replaceState({ storybookChapter: '01' }, '', `${firstURL.pathname}${firstURL.search}`);
    if (focus) next.focus({ preventScroll: true }); signalChange();
  }
  // Returning through the experiment's outer replay also resets the correct page.
  document.getElementById('replay').addEventListener('click', () => { if (current === '02') returnFirst({ focus: false }); }, true);
  document.addEventListener('keydown', event => {
    if (active && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel(); }
  }, true);
  motion.addEventListener('change', () => { if (motion.matches && active) active.animations.forEach(a => { try { a.finish(); } catch (_) {} }); });
  window.addEventListener('resize', () => cancel({ focus: false }));
  window.addEventListener('popstate', async () => {
    cancel({ focus: false });
    if (location.hash === '#chapter-02') {
      try { await chapter.loadAssets(); if (location.hash !== '#chapter-02') return; chapter.activate({ focus: false }); commit({ history: false }); }
      catch (_) { returnFirst({ history: false }); }
    } else returnFirst({ history: false });
  });
  window.addEventListener('pagehide', () => { cancel({ focus: false }); if (current === '02') chapter.deactivate(); });
  window.addEventListener('pageshow', event => { if (event.persisted && current === '02') { chapter.activate({ focus: false }); commit({ history: false, focus: false }); } });
  if (location.hash === '#chapter-02') chapter.ready.then(() => { if (location.hash !== '#chapter-02') return; chapter.activate({ focus: false }); commit({ history: false, focus: false }); }).catch(() => {});
  window.STORY_CHAPTER_NAVIGATION = Object.freeze({
    request, cancel, returnFirst,
    prepareLaterChapter() { hideFirst(); chapter.deactivate(); current = '02'; },
    async restoreCloser() { await chapter.loadAssets(); if (current !== '02') { chapter.activate({ focus: false }); commit({ history: false, focus: false }); } },
    register(id, config) { if (id !== '03') throw new Error('02 is already implemented; register the future chapter 03'); chapter.setNextChapter(config); },
    get status() { return 'ready'; },
    get current() { return current; },
    get transitioning() { return !!active; },
    get entries() { return entries; },
    chapter
  });
  if (window.FAREWELL_BRIDGE) window.FAREWELL_BRIDGE.mount({ chapter, book });
})();
