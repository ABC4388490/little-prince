/* Independent chapter navigation. No first-meeting story state is rewritten. */
(() => {
  'use strict';
  const dialog = document.getElementById('next-preview');
  const next = document.getElementById('next');
  const scene = document.getElementById('scene');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = new Map([['02', Object.freeze({
    status: 'preview', title: '02 · 靠近', english: 'GETTING CLOSER', href: null,
    transition: { duration: 1600, cameraScale: 1.035, warmLight: true, petals: true }
  })]]);
  let active, notice;

  function announce(text) {
    if (!notice) { notice = document.createElement('p'); notice.className = 'chapter-transfer-status'; notice.setAttribute('role', 'status'); document.body.append(notice); }
    notice.textContent = text; notice.hidden = false;
  }
  function resetNotice() { if (notice) notice.hidden = true; }
  function cleanup(run) {
    run.animations.forEach(a => a.cancel()); run.layer?.remove();
    if (active === run) {
      next.disabled = false; next.removeAttribute('aria-busy');
      scene.inert = run.previousInert; active = null;
    }
  }
  function cancel() {
    if (!active) return;
    const run = active; run.controller.abort(); cleanup(run); resetNotice();
    next.focus({ preventScroll: true });
  }
  function checkedHref(value) {
    if (!value) return null;
    const url = new URL(value, location.href);
    if (url.origin !== location.origin || !['http:', 'https:', 'file:'].includes(url.protocol)) throw new Error('Invalid chapter destination');
    if (url.href === location.href) throw new Error('Chapter destination is the current page');
    return url.href;
  }
  async function animateTransfer(chapter, run) {
    if (motion.matches) return;
    const rect = scene.getBoundingClientRect(), options = chapter.transition || {};
    const duration = Math.max(1000, Math.min(2200, options.duration || 1600));
    const layer = document.createElement('div'); layer.className = 'chapter-transfer'; layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    const light = document.createElement('div'); light.className = 'transfer-light';
    const title = document.createElement('div'); title.className = 'transfer-title';
    const heading = document.createElement('h2'); heading.textContent = chapter.title;
    const english = document.createElement('p'); english.textContent = chapter.english;
    title.append(heading, english); layer.append(light, title); document.body.append(layer); run.layer = layer;
    const add = (el, keyframes, extra = {}) => {
      const animation = el.animate(keyframes, { duration, fill: 'both', easing: 'ease-in-out', ...extra });
      run.animations.push(animation); return animation;
    };
    add(scene, [{ transform: 'scale(1)', transformOrigin: '68% 48%' }, { transform: `scale(${Math.min(1.06, options.cameraScale || 1.035)})`, transformOrigin: '68% 48%' }]);
    add(light, [{ opacity: 0 }, { opacity: options.warmLight === false ? 0 : 1 }]);
    const titleAnimation = add(title, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .25 }, { opacity: 1, offset: .45 }, { opacity: 1, offset: .72 }, { opacity: 0, offset: 1 }]);
    if (options.petals !== false) for (let i = 0; i < 3; i++) {
      const petal = document.createElement('img'); petal.className = 'transfer-petal'; petal.alt = '';
      petal.src = window.FIRST_MEETING_ASSETS?.petal || 'assets/watercolor/rose-petal-v1.png'; layer.append(petal);
      add(petal, [{ opacity: 0, transform: 'translate(0, 0) rotate(-10deg)', offset: 0 }, { opacity: .65, offset: .2 }, { opacity: 0, transform: `translate(${-90 - i * 70}px, ${-80 - i * 25}px) rotate(${-65 - i * 30}deg)`, offset: 1 }], { delay: i * 90, duration: duration - i * 90 });
    }
    run.complete = () => run.animations.forEach(a => { try { a.finish(); } catch (_) { /* cancelled */ } });
    await titleAnimation.finished;
  }
  async function request(id = '02') {
    if (active) return;
    const chapter = chapters.get(id);
    if (!chapter || chapter.status !== 'ready') { if (!dialog.open) dialog.showModal(); return; }
    const run = { controller: new AbortController(), animations: [], layer: null, previousInert: scene.inert };
    active = run; resetNotice(); next.disabled = true; next.setAttribute('aria-busy', 'true'); scene.inert = true;
    try {
      const href = checkedHref(chapter.href);
      if (!href && typeof chapter.enter !== 'function') throw new Error('Chapter is not connected');
      const context = { from: '01', to: id, href, signal: run.controller.signal, reducedMotion: motion.matches };
      // Future chapter code can wait for its real layers, fonts and interaction
      // controller here, before showing the non-blocking transition.
      if (chapter.prepare) await chapter.prepare(context);
      else if (href && location.protocol !== 'file:') {
        const response = await fetch(href, { signal: context.signal, credentials: 'same-origin', cache: 'force-cache' });
        if (!response.ok) throw new Error('Chapter failed to load');
        await response.text();
      }
      if (context.signal.aborted) return;
      announce('正在翻到下一幕……按 Esc 可留在初见。');
      await animateTransfer(chapter, run);
      if (context.signal.aborted) return;
      if (chapter.enter) await chapter.enter(context); else location.assign(href);
      resetNotice();
    } catch (error) {
      if (!run.controller.signal.aborted) { run.failed = true; announce('这一页暂未准备好，请稍后再试。'); }
    } finally { cleanup(run); if (run.failed && !active) next.focus({ preventScroll: true }); }
  }
  function register(id, chapter) {
    if (id !== '02') throw new Error('Only the next chapter is supported here');
    if (!['preview', 'ready'].includes(chapter.status)) throw new Error('Unknown chapter status');
    chapters.set(id, Object.freeze({ ...chapters.get(id), ...chapter }));
    const label = next.querySelector('small');
    if (label) label.textContent = chapter.status === 'ready' ? '下一幕' : '下一幕 · 预告';
  }
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled)')].filter(button => button.getClientRects().length);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  // Capture prevents the old generic next-button listener from opening a second
  // dialog. All bloom, dialogue and replay handlers remain in the original file.
  next.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); request('02'); }, true);
  document.addEventListener('keydown', event => { if (active && event.key === 'Escape') { event.preventDefault(); cancel(); } });
  motion.addEventListener('change', () => { if (motion.matches) active?.complete?.(); });
  window.addEventListener('pagehide', cancel);
  window.addEventListener('resize', () => { if (active) cancel(); });
  window.STORY_CHAPTER_NAVIGATION = Object.freeze({ request, register, cancel, get status() { return chapters.get('02').status; } });
})();
