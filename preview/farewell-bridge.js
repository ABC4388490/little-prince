/* The shared 02→03 stage: all drawings stay live DOM layers throughout. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function mount({ chapter, book }) {
    let stage = chapter.element.parentElement;
    if (!stage.classList.contains('story-stage')) {
      stage = document.createElement('div'); stage.className = 'story-stage';
      chapter.element.before(stage); stage.append(chapter.element);
    }
    const third = window.FAREWELL_STORY.create({ onPrevious: () => returnCloser(), onCover: () => document.querySelector('.page-masthead .back-link').click() });
    third.deactivate(); stage.append(third.element); book.append(third.extras);
    let run = null, inThird = false;
    const oldTitle = () => '02 · 靠近 — 关于她 · 互动绘本';
    const base = `${location.pathname}${location.search}`;
    function signal(chapterName) { window.dispatchEvent(new CustomEvent('storybook:chapterchange', { detail: { chapter: chapterName } })); }
    function add(r, node, frames, options = {}) {
      const animation = node.animate(frames, { duration: 1900, fill: 'both', easing: 'ease-in-out', ...options });
      r.animations.push(animation); animation.finished.catch(() => {}); return animation;
    }
    function clean(r) { r.animations.forEach(a => a.cancel()); r.title?.remove(); r.petal?.remove(); delete stage.dataset.transitioning; if (run === r) run = null; }
    function cancel({ focus = true } = {}) {
      if (!run) return; const r = run; r.cancelled = true; clean(r); third.deactivate();
      chapter.element.inert = false; chapter.extras.inert = false; chapter.extras.hidden = false;
      if (focus) chapter.extras.querySelector('#c02-next').focus({ preventScroll: true });
    }
    function commit({ history = true, start = true } = {}) {
      chapter.deactivate(); inThird = true; document.body.dataset.chapter = '03';
      third.element.hidden = false; third.element.inert = false; third.extras.hidden = false;
      third.element.querySelector('.c03-camera').style.transform = 'scale(1)';
      document.title = '03 · 告别 — 关于她 · 互动绘本';
      if (history) window.history.pushState({ storybookChapter: '03' }, '', `${base}#chapter-03`);
      if (start) third.start(); signal('03');
    }
    async function enter() {
      if (run || inThird) return;
      const r = { animations: [], cancelled: false, title: null, petal: null }; run = r;
      chapter.element.inert = true; chapter.extras.inert = true;
      third.activate({ start: false }); third.extras.hidden = true; third.element.inert = true;
      stage.dataset.transitioning = 'true';
      try {
        if (!motion.matches) {
          const fromCamera = chapter.element.querySelector('.c02-camera'), toCamera = third.element.querySelector('.c03-camera');
          toCamera.style.transform = 'scale(1.025)';
          const scale = fromCamera.getBoundingClientRect().width / stage.getBoundingClientRect().width;
          const fromRose = chapter.element.querySelector('.c02-rose'), toRose = third.element.querySelector('.c03-rose');
          const fromBoy = chapter.element.querySelector('.c02-prince'), toBoy = third.element.querySelector('.c03-prince');
          const moveTogether = (from, to) => {
            const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
            const dx = (b.left - a.left) / scale, sx = b.width / a.width, sy = b.height / a.height;
            add(r, from, [{ transform: 'translateX(0) scale(1)', transformOrigin: '0 100%' }, { transform: `translateX(${dx}px) scale(${sx},${sy})`, transformOrigin: '0 100%' }]);
            add(r, to, [{ transform: `translateX(${-dx}px) scale(${1 / sx},${1 / sy})`, transformOrigin: '0 100%' }, { transform: 'translateX(0) scale(1)', transformOrigin: '0 100%' }]);
          };
          moveTogether(fromRose, toRose); moveTogether(fromBoy, toBoy);
          // The compositions place the boy and rose on opposite sides. Let
          // the boy and props fade in sequence while the rose travels; showing
          // both character silhouettes simultaneously would overlap faces.
          add(r, fromBoy, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: .16 }, { opacity: 0, offset: .38 }, { opacity: 0, offset: 1 }]);
          add(r, toBoy, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .62 }, { opacity: 1, offset: .86 }, { opacity: 1, offset: 1 }]);
          for (const node of chapter.element.querySelectorAll('.c02-can,.c02-dome')) add(r, node, [{ opacity: 1, offset: 0 }, { opacity: 0, offset: .3 }, { opacity: 0, offset: 1 }]);
          add(r, third.element.querySelector('.c03-dome'), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .76 }, { opacity: 1, offset: 1 }]);
          for (const node of chapter.element.querySelectorAll('.c02-dialogue,.c02-whisper,.chapter-heading,.scene-margin,.scene-caption')) add(r, node, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
          add(r, fromCamera, [{ transform: 'scale(1.025)' }, { transform: 'scale(1)' }]);
          add(r, toCamera, [{ transform: 'scale(1.025)' }, { transform: 'scale(1)' }]);
          add(r, chapter.element, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: .2 }, { opacity: 0, offset: .88 }, { opacity: 0, offset: 1 }]);
          const arrival = add(r, third.element, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .2 }, { opacity: 1, offset: .88 }, { opacity: 1, offset: 1 }]);
          for (const node of third.element.querySelectorAll('.chapter-heading,.scene-margin,.scene-caption')) add(r, node, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .8 }, { opacity: 1, offset: 1 }]);
          const title = document.createElement('div'); title.className = 'chapter-bridge-title c03-bridge-title'; title.setAttribute('aria-hidden', 'true'); title.innerHTML = '<h2>03 · 告别</h2><p>THE FAREWELL</p>'; stage.append(title); r.title = title;
          add(r, title, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .28 }, { opacity: 1, offset: .45 }, { opacity: 1, offset: .68 }, { opacity: 0, offset: 1 }]);
          const petal = document.createElement('img'); petal.className = 'chapter-bridge-petal'; petal.src = window.FAREWELL_ASSETS.petal; petal.alt = '';
          const box = fromRose.getBoundingClientRect(), outer = stage.getBoundingClientRect(); petal.style.left = `${(box.left + box.width * .5 - outer.left) / outer.width * 100}%`; petal.style.top = `${(box.top + box.height * .2 - outer.top) / outer.height * 100}%`;
          stage.append(petal); r.petal = petal;
          add(r, petal, [{ opacity: 0, transform: 'translate(0,0) rotate(0deg)', offset: 0 }, { opacity: .7, offset: .2 }, { opacity: 0, transform: 'translate(-75px,-75px) rotate(-65deg)', offset: 1 }]);
          await arrival.finished.catch(() => {});
        }
        if (r.cancelled) return;
        commit(); clean(r);
      } catch (error) { cancel(); throw error; }
    }
    function returnCloser({ history = true } = {}) {
      cancel({ focus: false }); third.deactivate(); inThird = false;
      chapter.activate({ focus: false }); chapter.extras.inert = false;
      document.body.dataset.chapter = '02'; document.title = oldTitle();
      if (history) window.history.replaceState({ storybookChapter: '02' }, '', `${base}#chapter-02`);
      chapter.extras.querySelector('#c02-next').focus({ preventScroll: true }); signal('02');
    }
    const config = { status: 'ready', prepare: () => third.loadAssets(), enter };
    if (window.STORY_CHAPTER_NAVIGATION) window.STORY_CHAPTER_NAVIGATION.register('03', config); else chapter.setNextChapter(config);
    document.addEventListener('keydown', event => { if (run && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel(); } }, true);
    motion.addEventListener('change', () => { if (motion.matches && run) run.animations.forEach(a => { try { a.finish(); } catch (_) {} }); });
    window.addEventListener('resize', () => { if (run) cancel({ focus: false }); });
    window.addEventListener('popstate', async event => {
      if (window.LETTER_NAVIGATION && (window.LETTER_NAVIGATION.active || window.LETTER_NAVIGATION.transitioning || location.hash === '#chapter-05')) { event.stopImmediatePropagation(); window.LETTER_NAVIGATION.handleHistory(); return; }
      if (window.WAITING_NAVIGATION && (window.WAITING_NAVIGATION.active || window.WAITING_NAVIGATION.transitioning || location.hash === '#chapter-04')) { event.stopImmediatePropagation(); window.WAITING_NAVIGATION.handleHistory(); return; }
      if (!inThird && location.hash !== '#chapter-03') return;
      event.stopImmediatePropagation(); cancel({ focus: false });
      if (location.hash === '#chapter-03') {
        try { await third.loadAssets(); third.activate({ start: false }); commit({ history: false }); } catch (_) { returnCloser({ history: false }); }
      } else if (location.hash === '#chapter-02' || !window.STORY_CHAPTER_NAVIGATION) returnCloser({ history: false });
      else { third.deactivate(); inThird = false; window.STORY_CHAPTER_NAVIGATION.returnFirst({ history: false }); }
    }, true);
    window.addEventListener('pagehide', () => { cancel({ focus: false }); if (inThird) third.deactivate(); });
    window.addEventListener('pageshow', e => { if (e.persisted && inThird) { third.activate({ start: false }); commit({ history: false }); } });
    // The cover experiment can replay chapter 01 outside this component.
    window.addEventListener('storybook:chapterchange', event => {
      if (inThird && event.detail?.chapter === '01') { third.deactivate(); inThird = false; chapter.extras.inert = false; }
    });
    window.FAREWELL_NAVIGATION = Object.freeze({ enter, returnCloser, cancel, third, get transitioning() { return !!run; }, get current() { return inThird ? '03' : '02'; }, register04: config04 => third.setNextChapter(config04), restoreThird({ history = true } = {}) { inThird = true; third.restoreComplete(); document.body.dataset.chapter = '03'; document.title = '03 · 告别 — 关于她 · 互动绘本'; if (history) window.history.replaceState({ storybookChapter: '03' }, '', `${base}#chapter-03`); signal('03'); } });
    if (window.WAITING_STORY) window.WAITING_STORY.mount({ stage, book, third, navigation: window.FAREWELL_NAVIGATION });
    if (location.hash === '#chapter-03') {
      Promise.all([chapter.loadAssets(), third.loadAssets()]).then(async () => {
        if (location.hash !== '#chapter-03') return;
        if (window.STORY_CHAPTER_NAVIGATION) await window.STORY_CHAPTER_NAVIGATION.restoreCloser();
        if (location.hash !== '#chapter-03') return;
        third.activate({ start: false }); commit({ history: false });
      }).catch(() => {});
    }
    return window.FAREWELL_NAVIGATION;
  }
  window.FAREWELL_BRIDGE = Object.freeze({ mount });
})();
