(() => {
  'use strict';
  const art = document.getElementById('planet-art');
  const links = [...document.querySelectorAll('[data-enter-story]')];
  const status = document.getElementById('entry-status');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let entering = false;
  let timer;
  let target;
  let opener;
  let prefetched = false;
  document.getElementById('cover-debug').hidden = new URLSearchParams(location.search).get('debug') !== '1';

  function prepareNextPage() {
    if (prefetched || navigator.connection?.saveData) return;
    prefetched = true;
    // Same-site, read-only prefetch; never starts or navigates into the story.
    for (const href of ['first-meeting.html', 'first-meeting.css?v=watercolor-v1', 'assets/watercolor/dawn-sky-v1.png']) {
      const link = document.createElement('link');
      link.rel = 'prefetch'; link.href = href;
      document.head.appendChild(link);
    }
  }
  function reset() {
    clearTimeout(timer); entering = false;
    document.body.dataset.coverPhase = 'ready';
    links.forEach(link => link.removeAttribute('aria-disabled'));
    status.textContent = '';
  }
  function arrive() { if (entering) location.assign(target); }
  function enter(event) {
    // Modified clicks retain native new-tab/window behavior; no-JS links work.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (entering) return;
    entering = true; opener = event.currentTarget; target = opener.href;
    prepareNextPage();
    if (motion.matches) { arrive(); return; }
    links.forEach(link => link.setAttribute('aria-disabled', 'true'));
    status.textContent = '书页正轻轻翻过，故事回到清晨。按 Esc 可停留在封面。';
    document.body.dataset.coverPhase = 'entering';
    timer = setTimeout(arrive, 1600);
  }
  links.forEach(link => {
    link.addEventListener('click', enter);
    link.addEventListener('pointerenter', prepareNextPage, { once: true });
    link.addEventListener('focus', prepareNextPage, { once: true });
  });
  document.addEventListener('keydown', event => {
    if (entering && event.key === 'Escape') { reset(); opener?.focus({ preventScroll: true }); }
    if (entering && event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault();
  });
  motion.addEventListener('change', () => { if (motion.matches && entering) { clearTimeout(timer); arrive(); } });
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', reset);
  art.addEventListener('error', () => { document.getElementById('art-error').hidden = false; });
  if (art.complete && !art.naturalWidth) document.getElementById('art-error').hidden = false;
})();
