/* Native progressive enhancement. No storage, API calls or third-party runtime. */
(() => {
  'use strict';
  const root = document.querySelector('[data-story-carousel]');
  if (!root || !window.PointerEvent || !CSS.supports('perspective', '1000px')) return;
  const cards = [...root.querySelectorAll('[data-story]')];
  const stage = root.querySelector('.story-carousel__stage');
  const pauseButton = root.querySelector('[data-carousel-pause]');
  const position = root.querySelector('.story-carousel__position');
  const home = document.getElementById('home');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const step = 360 / cards.length;
  const initial = Math.max(0, cards.findIndex(card => card.dataset.story === 'fox'));
  let angle = -initial * step, target = angle, velocity = 0, active = -1, frame = 0, last = 0;
  let settling = false, paused = false, hovering = false, focused = false, blocked = false;
  let resumeAt = performance.now() + 2400, gesture = null, busy = false, tearTimer = 0;
  let dispatching = false, visible = true, pointerCard = null;
  const wrap = n => ((n % cards.length) + cards.length) % cards.length;
  const current = () => wrap(Math.round(-angle / step));
  const isBlocked = () => !home.classList.contains('active') || document.hidden || !visible ||
    !!document.querySelector('#storyModal.active, #foxTamingModal.active, #flightLogModal.active, #b612ChatModal.active') ||
    document.body.classList.contains('modal-open');
  function alignCardFocus() {
    // A completed touch swipe must not leave keyboard focus on the old rear card.
    if (document.activeElement?.matches('[data-story]') && document.activeElement !== cards[current()]) {
      cards[current()].focus({ preventScroll: true });
    }
  }

  function render() {
    const width = stage.clientWidth;
    const mobile = width < 600;
    const radius = mobile ? Math.min(245, width * .76) : Math.min(cards.length > 4 ? 400 : 320, width * .36);
    const next = current();
    cards.forEach((card, i) => {
      const rad = (i * step + angle) * Math.PI / 180;
      const depth = (Math.cos(rad) + 1) / 2;
      const x = Math.sin(rad) * radius - (1 - depth) * (mobile ? 35 : 92);
      const y = (1 - depth) * -100;
      card.style.transform = `translate3d(${x}px, ${y}px, ${-120 * (1 - depth)}px) rotateY(${-Math.sin(rad) * 30}deg) scale(${.72 + depth * .28})`;
      card.style.zIndex = String(Math.round(depth * 100));
      card.style.opacity = String(.68 + .32 * depth);
      card.classList.toggle('is-current', i === next);
      card.querySelectorAll('button').forEach(button => { button.tabIndex = i === next ? 0 : -1; });
      if (i === next) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
    });
    if (active !== next) {
      active = next;
      position.textContent = `${String(next + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')} · ${cards[next].querySelector('h2').textContent}`;
    }
  }
  function shouldAnimate() {
    return !blocked && (settling || Math.abs(velocity) > .2 || (!paused && !reduced.matches && !hovering && !focused && !gesture && !busy));
  }
  function schedule() {
    if (!frame && shouldAnimate()) { last = performance.now(); frame = requestAnimationFrame(tick); }
  }
  function tick(now) {
    frame = 0;
    if (blocked) return;
    const dt = Math.min((now - last) / 1000, .04); last = now;
    if (!gesture && !busy) {
      if (Math.abs(velocity) > .2) {
        angle += velocity * dt;
        velocity *= Math.exp(-7 * dt);
        if (Math.abs(velocity) < 8) { velocity = 0; snap(); }
      } else if (settling) {
        angle += (target - angle) * (1 - Math.exp(-13 * dt));
        if (Math.abs(target - angle) < .04) { angle = target; settling = false; alignCardFocus(); }
      } else if (!paused && !reduced.matches && !hovering && !focused && now > resumeAt) {
        angle -= 8 * dt;
      }
    }
    render(); schedule();
  }
  function snap() { target = Math.round(angle / step) * step; settling = true; }
  function go(index, immediate = reduced.matches) {
    if (busy) return;
    let delta = -index * step - angle;
    delta = ((delta + 540) % 360 + 360) % 360 - 180;
    target = angle + delta; velocity = 0; settling = !immediate;
    resumeAt = performance.now() + 2400;
    if (immediate) angle = target;
    render(); schedule();
  }
  function resetTicket() {
    clearTimeout(tearTimer); tearTimer = 0; busy = false;
    cards.forEach(card => {
      card.classList.remove('is-torn', 'is-tearing');
      card.querySelector('.story-ticket__stub').style.removeProperty('transform');
      card.querySelectorAll('button').forEach(button => { button.disabled = false; });
    });
  }
  function enter(card, torn) {
    if (busy || blocked) return;
    busy = true; velocity = 0; settling = false;
    // Finish in the centered position before starting the tear.
    angle = Math.round(angle / step) * step; render();
    card.querySelectorAll('button').forEach(button => { button.disabled = true; });
    if (torn) { card.classList.add('is-torn'); card.querySelector('.story-ticket__stub').style.removeProperty('transform'); }
    const open = () => {
      tearTimer = 0;
      // Navigation away during a tear cancels the pending destination.
      if (!home.classList.contains('active') || document.hidden) { resetTicket(); return; }
      dispatching = true;
      document.dispatchEvent(new CustomEvent('storybook:enter', { detail: { action: card.dataset.story } }));
      dispatching = false;
      resetTicket(); sync();
    };
    if (torn && !reduced.matches) tearTimer = setTimeout(open, 450);
    else open();
  }
  function cancelGesture() {
    if (!gesture) return;
    const { card, capture, id } = gesture;
    if (capture?.hasPointerCapture(id)) capture.releasePointerCapture(id);
    if (card) { card.classList.remove('is-tearing'); card.querySelector('.story-ticket__stub').style.removeProperty('transform'); }
    gesture = null; root.classList.remove('is-dragging'); velocity = 0;
    snap(); if (reduced.matches) { angle = target; settling = false; } render(); schedule();
  }
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || busy || blocked) return;
    const card = event.target.closest('[data-story]');
    pointerCard = { card, side: card !== cards[current()] };
    const stub = event.target.closest('[data-tear]');
    if (event.target.closest('button') && !stub) return;
    const tear = stub && card === cards[current()];
    velocity = 0; settling = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, angle, sensitivity: stage.clientWidth < 600 ? .42 : .3,
      lastX: event.clientX, time: performance.now(), moved: false, tear, card, capture: tear ? stub : stage };
  });
  stage.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const g = gesture, dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (!g.moved && Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx)) { cancelGesture(); return; }
    if (!g.moved && Math.abs(dx) < 7) return;
    if (!g.moved) { g.moved = true; g.capture.setPointerCapture(event.pointerId); }
    event.preventDefault();
    if (g.tear) {
      g.card.classList.add('is-tearing');
      const pull = Math.max(0, Math.min(dx, 130));
      g.capture.style.transform = `translate(${pull * .48}px, ${Math.min(18, pull * .1)}px) rotate(${pull * .1}deg)`;
    } else {
      root.classList.add('is-dragging'); angle = g.angle + dx * g.sensitivity;
      const now = performance.now(); velocity = Math.max(-220, Math.min(220, (event.clientX - g.lastX) * g.sensitivity / Math.max(.008, (now - g.time) / 1000)));
      g.lastX = event.clientX; g.time = now; render();
    }
  }, { passive: false });
  stage.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const g = gesture; gesture = null;
    if (g.capture.hasPointerCapture(g.id)) g.capture.releasePointerCapture(g.id);
    root.classList.remove('is-dragging');
    if (g.card) g.card.classList.remove('is-tearing');
    resumeAt = performance.now() + 2400;
    if (g.moved) {
      // Consume only the click synthesized by this completed pointer gesture.
      const consume = event => { event.preventDefault(); event.stopImmediatePropagation(); };
      stage.addEventListener('click', consume, { once: true, capture: true });
      setTimeout(() => stage.removeEventListener('click', consume, true), 0);
      if (g.tear) {
        if (event.clientX - g.x >= 75) enter(g.card, true);
        else g.capture.style.removeProperty('transform');
      } else {
        if (performance.now() - g.time > 100 || reduced.matches) velocity = 0;
        if (!velocity) snap();
        if (reduced.matches) { angle = target; settling = false; render(); alignCardFocus(); }
      }
    }
    schedule();
  });
  stage.addEventListener('pointercancel', cancelGesture);
  stage.addEventListener('lostpointercapture', event => {
    // Touch releases implicit capture from the original descendant when the stage
    // takes ownership. Only losing our explicit capture cancels the gesture.
    if (gesture && event.target === gesture.capture && event.pointerId === gesture.id) cancelGesture();
  });
  stage.addEventListener('click', event => {
    const card = event.target.closest('[data-story]');
    if (!card) return;
    const selectionOnly = event.detail > 0 && pointerCard?.card === card && pointerCard.side;
    pointerCard = null;
    if (selectionOnly) { go(cards.indexOf(card)); return; }
    if (card !== cards[current()]) { go(cards.indexOf(card)); return; }
    if (event.target.closest('[data-tear]')) enter(card, true);
    else if (event.target.closest('[data-home-action]')) enter(card, false);
  });
  root.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const index = event.target.closest('[data-story]');
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = wrap(current() + (event.key === 'ArrowRight' ? 1 : -1));
      go(next, !!index || reduced.matches);
      if (index) cards[next].focus({ preventScroll: true });
    }
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-story]')) {
      event.preventDefault(); enter(event.target, false);
    }
    if (event.key === 'Escape') { cancelGesture(); resetTicket(); sync(); }
  });
  root.querySelector('[data-carousel-prev]').addEventListener('click', () => go(current() - 1));
  root.querySelector('[data-carousel-next]').addEventListener('click', () => go(current() + 1));
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? '继续自动轮转' : '暂停自动轮转');
    pauseButton.textContent = paused ? '▷' : 'Ⅱ';
    if (paused) go(current()); else resumeAt = performance.now() + 2000;
    schedule();
  });
  root.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovering = true; });
  root.addEventListener('pointerleave', () => { hovering = false; resumeAt = performance.now() + 2000; schedule(); });
  root.addEventListener('focusin', event => {
    focused = true;
    const card = event.target.closest('[data-story]');
    if (card && !gesture) go(cards.indexOf(card), true);
  });
  root.addEventListener('focusout', () => queueMicrotask(() => {
    focused = root.contains(document.activeElement); resumeAt = performance.now() + 2000; schedule();
  }));
  function sync() {
    const next = isBlocked();
    if (next && !blocked) {
      cancelGesture(); velocity = 0; settling = false;
      angle = Math.round(angle / step) * step;
      if (!dispatching) resetTicket();
    }
    blocked = next;
    if (blocked && frame) { cancelAnimationFrame(frame); frame = 0; }
    if (!blocked) { resumeAt = performance.now() + 2400; render(); schedule(); }
  }
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sync).observe(home, { attributes: true, attributeFilter: ['class'] });
  document.querySelectorAll('#storyModal, #foxTamingModal, #flightLogModal, #b612ChatModal').forEach(modal => {
    new MutationObserver(sync).observe(modal, { attributes: true, attributeFilter: ['class'] });
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { cancelGesture(); resetTicket(); if (frame) cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', sync);
  window.addEventListener('resize', () => { cancelGesture(); render(); });
  reduced.addEventListener('change', () => { cancelGesture(); velocity = 0; go(current(), true); schedule(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; sync();
  }).observe(root);
  resetTicket();
  root.classList.add('is-ready');
  render(); sync();
})();
