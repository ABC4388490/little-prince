/* Chapter 03: independent layers and the same one-line/typewriter interaction as 01/02. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const lines = Object.freeze([
    { speaker: 'prince', name: '小王子', text: '我要离开一阵子。' },
    { speaker: 'rose', name: '玫瑰', text: '那就去吧。我自己也可以照顾好自己。' },
    { speaker: 'prince', name: '小王子', text: '我把玻璃罩留在这里。' },
    { speaker: 'rose', name: '玫瑰', text: '……谢谢你。' }
  ]);
  const heart = '其实，我只是想让你再留下来，陪我看一次日落。';
  function create({ onPrevious = () => location.assign('getting-closer.html'), onCover = () => location.assign('index.html') } = {}) {
    const element = document.createElement('section');
    element.className = 'scene farewell-scene'; element.id = 'farewell-scene';
    element.setAttribute('aria-labelledby', 'c03-title'); element.tabIndex = -1;
    element.innerHTML = `
      <div class="c03-camera">
        <img class="sky-background c03-sky" data-farewell-asset="sky" alt="" aria-hidden="true" draggable="false">
        <div class="c03-sunset" aria-hidden="true"></div><span class="c03-sun" aria-hidden="true"></span>
        <div class="c03-violet" aria-hidden="true"></div><span class="c03-star" aria-hidden="true">✦</span>
        <img class="planet c03-planet" data-farewell-asset="planet" alt="B612 星球，暖灰色岩石、陨石坑与小花" draggable="false">
        <div class="c03-rose-glow" aria-hidden="true"></div>
        <button class="rose-target c03-rose" id="c03-rose" type="button" aria-label="轻触玫瑰，听她没有说出口的话" aria-controls="c03-whisper" aria-expanded="false" disabled><img data-farewell-asset="rose" alt="夕阳下的玫瑰" draggable="false"></button>
        <div class="c03-dome" aria-hidden="true"><img data-farewell-asset="dome" alt="" draggable="false"><span></span></div>
        <div class="c03-prince" aria-label="小王子站在玫瑰右侧"><img class="c03-prince-front" data-farewell-asset="prince" alt="" draggable="false"><img class="c03-prince-reach" data-farewell-asset="reach" alt="" draggable="false"><img class="c03-prince-turn" data-farewell-asset="turn" alt="" draggable="false"><img class="c03-prince-back" data-farewell-asset="back" alt="" draggable="false"><img class="c03-prince-step-a" data-farewell-asset="stepA" alt="" draggable="false"><img class="c03-prince-step-b" data-farewell-asset="stepB" alt="" draggable="false"></div>
      </div>
      <header class="chapter-heading"><p class="eyebrow">A STORY ABOUT HER</p><h1 id="c03-title"><span>03</span><i>·</i>告别</h1><p class="english-title">THE FAREWELL</p></header>
      <p class="scene-margin" aria-hidden="true">有些不舍，<br>藏在没有说完的话里。</p>
      <div class="dialogue c03-dialogue" id="c03-dialogue" data-speaker="prince" hidden><p class="speaker" id="c03-speaker"></p><p class="spoken-line" id="c03-line" aria-hidden="true"></p><p class="sr-only" id="c03-accessible" aria-live="polite" aria-atomic="true"></p><button class="continue" id="c03-continue" type="button" aria-describedby="c03-accessible"><span id="c03-continue-label">补全这句话</span><span aria-hidden="true">↗</span></button></div>
      <div class="c03-whisper" id="c03-whisper" hidden><span>玫瑰没有说出口的话</span><p>「${heart}」</p><button id="c03-close-whisper" type="button">轻轻收起 ↙</button></div>
      <div class="scene-caption"><span class="caption-rule" aria-hidden="true"></span><p id="c03-status" role="status" aria-live="polite">正在准备黄昏的这一页……</p><span class="caption-rule" aria-hidden="true"></span></div>
      <span class="coordinate" aria-hidden="true">B612 · 黄昏</span><span class="page-number" aria-hidden="true">— 03 —</span>`;
    const extras = document.createElement('div'); extras.className = 'c03-extras';
    extras.innerHTML = `<nav class="chapter-nav c03-nav" aria-label="绘本章节导航，当前第三幕"><button class="previous" id="c03-previous" type="button"><span aria-hidden="true">←</span><span><small>上一幕</small>02 · 靠近</span></button><button class="replay" id="c03-replay" type="button" disabled><span aria-hidden="true">↻</span> 重新体验本幕</button><button class="next" id="c03-next" type="button" disabled><span><small>下一幕 · 未开放</small>04 · 等待</span><span aria-hidden="true">→</span></button></nav><div class="under-page"><span>有些告别，留在了日落里。</span><span class="page-dots" aria-label="共六幕，当前第三幕"><i></i><i></i><i></i><i class="current"></i><i></i><i></i></span><span>鼠标 / 触摸 · Tab 选择 · Enter 确认</span></div><details class="c03-notes" hidden><summary>素材与动作说明</summary><p>星球、玫瑰与玻璃罩沿用前两幕的独立水彩素材；放罩时罩子与人物同步移动，离场由少量背影姿态与位移组合。<a href="FAREWELL.md">查看第三幕说明</a> · <button class="text-button c03-cover" type="button">返回预览入口 ↗</button></p></details>`;
    extras.querySelector('.c03-notes').hidden = new URLSearchParams(location.search).get('debug') !== '1';
    const find = id => element.querySelector(`#${id}`) || extras.querySelector(`#${id}`);
    const rose = find('c03-rose'), dialogue = find('c03-dialogue'), line = find('c03-line'), next = find('c03-continue');
    const whisper = find('c03-whisper'), status = find('c03-status');
    const timers = new Set(), actionTimers = new Set();
    let active = false, ready = false, loading = null, attempt = 0, index = -1, typing = false, letter = 0, typingTimer, continueLock = 0, gestureSeen = false, liftStarted = 0, fourthStarted = 0, route04 = null, nextBusy = false, nextAfterDeparture = null, navigationEpoch = 0;
    function later(fn, delay, group = timers) { const timer = setTimeout(() => { timers.delete(timer); actionTimers.delete(timer); fn(); }, delay); timers.add(timer); if (group === actionTimers) actionTimers.add(timer); return timer; }
    function clearTimer(timer) { clearTimeout(timer); timers.delete(timer); actionTimers.delete(timer); }
    function clearTyping() { clearTimer(typingTimer); typing = false; }
    function clearActions() { [...actionTimers].forEach(clearTimer); }
    function clearAll() { navigationEpoch++; nextBusy = false; nextAfterDeparture = null; timers.forEach(clearTimeout); timers.clear(); actionTimers.clear(); typing = false; element.getAnimations({ subtree: true }).forEach(a => a.cancel()); }
    function phase(value) { element.dataset.state = value; }
    function updateContinue() { find('c03-continue-label').textContent = typing ? '补全这句话' : index === 3 ? '轻轻送他离开' : '轻触继续'; next.setAttribute('aria-label', typing ? '立即显示完整对白' : index === 3 ? '结束对白，送小王子离开' : '显示下一句对白'); }
    function finishTyping() { clearTyping(); line.textContent = lines[index].text; updateContinue(); }
    function type() { const text = lines[index].text; line.textContent = text.slice(0, ++letter); if (letter < text.length) typingTimer = later(type, 60); else { typing = false; updateContinue(); } }
    function showLine(n) {
      if (!active) return;
      clearTyping(); index = n; letter = 0; const current = lines[n];
      element.dataset.line = String(n); dialogue.dataset.speaker = current.speaker;
      find('c03-speaker').textContent = current.name; find('c03-accessible').textContent = `${current.name}：${current.text}`;
      dialogue.hidden = false; line.textContent = ''; typing = true; phase('dialogue'); status.textContent = `告别 · ${n + 1} / 4 句`;
      if (n === 2) {
        clearActions(); liftStarted = performance.now(); element.dataset.dome = 'lift'; element.dataset.gesture = 'reach';
        if (!motion.matches) later(() => { if (active && index === 2) { element.dataset.gesture = 'holding'; element.dataset.dome = 'held'; } }, 1400, actionTimers);
      }
      if (n === 3) {
        clearActions();
        if (motion.matches) { fourthStarted = performance.now(); element.dataset.dome = 'covered'; element.dataset.gesture = 'placing'; }
        else {
          // If the reader advances quickly, finish reaching for the dome before carrying it.
          const remainingLift = Math.max(0, 1400 - (performance.now() - liftStarted));
          const carryDelay = remainingLift ? remainingLift + 300 : 0;
          fourthStarted = performance.now() + carryDelay;
          if (remainingLift) later(() => { if (active && index === 3) { element.dataset.gesture = 'holding'; element.dataset.dome = 'held'; } }, remainingLift, actionTimers);
          const carry = () => { if (active && index === 3) { element.dataset.dome = 'carried'; element.dataset.gesture = 'carry'; } };
          if (carryDelay) later(carry, carryDelay, actionTimers); else carry();
          later(() => { if (active && index === 3) element.dataset.gesture = 'lower'; }, carryDelay + 1100, actionTimers);
          later(() => { if (active && index === 3) { element.dataset.dome = 'covered'; element.dataset.gesture = 'placing'; } }, carryDelay + 1600, actionTimers);
        }
      }
      if (motion.matches) finishTyping(); else { updateContinue(); typingTimer = later(type, 60); }
      next.focus({ preventScroll: true });
    }
    function complete() {
      clearActions(); element.dataset.dome = 'covered'; element.dataset.gesture = ''; element.dataset.exit = 'complete';
      phase('complete'); rose.disabled = false; status.textContent = '她仍在这里，等一颗星星亮起来。';
      rose.focus({ preventScroll: true });
      if (nextAfterDeparture) { const proceed = nextAfterDeparture; nextAfterDeparture = null; proceed(); }
    }
    function depart() {
      clearTyping(); if (index !== 3) clearActions(); dialogue.hidden = true; phase('departure'); rose.disabled = true;
      status.textContent = '他轻轻放稳玻璃罩。';
      if (motion.matches) { complete(); return; }
      const settle = Math.max(0, 2900 - (performance.now() - fourthStarted));
      // Finish placing before releasing the hands; keep the same ground
      // position while he pauses and turns, then begin the departure.
      later(() => { element.dataset.dome = 'covered'; element.dataset.exit = 'release'; element.dataset.gesture = ''; status.textContent = '他回头望了她一眼。'; }, settle + 200, actionTimers);
      later(() => { element.dataset.exit = 'turn'; status.textContent = '晚风轻轻吹过围巾。'; }, settle + 1250, actionTimers);
      later(() => { element.dataset.exit = 'step-ready'; }, settle + 2350, actionTimers);
      later(() => { element.dataset.exit = 'walking'; status.textContent = '他慢慢走向远方。'; }, settle + 2850, actionTimers);
      later(complete, settle + 7850, actionTimers);
    }
    function reset(focus = false) {
      clearAll(); index = -1; letter = 0; continueLock = 0; gestureSeen = false;
      element.dataset.line = ''; element.dataset.dome = 'aside'; element.dataset.gesture = ''; element.dataset.exit = '';
      dialogue.hidden = true; whisper.hidden = true; rose.setAttribute('aria-expanded', 'false'); rose.disabled = true;
      line.textContent = ''; find('c03-accessible').textContent = '';
      find('c03-replay').disabled = !ready; find('c03-next').disabled = !ready;
      phase(ready ? 'ready' : 'loading'); status.textContent = ready ? '夕阳慢慢落在他们之间。' : '正在准备黄昏的这一页……';
      if (focus && active && ready) showLine(0);
    }
    function loadAssets() {
      if (ready) return Promise.resolve(); if (loading) return loading; attempt++;
      loading = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Chapter 03 artwork timed out')), 15000);
        Promise.all([...element.querySelectorAll('[data-farewell-asset]')].map(img => new Promise((yes, no) => {
          img.onload = () => img.decode().then(yes, no); img.onerror = () => no(new Error(`Artwork failed: ${img.dataset.farewellAsset}`));
          const src = window.FAREWELL_ASSETS[img.dataset.farewellAsset]; img.src = src + (attempt > 1 ? `?retry=${attempt}` : '');
          if (img.complete && img.naturalWidth) img.decode().then(yes, no);
        }))).then(() => { clearTimeout(timeout); ready = true; reset(); resolve(); }, err => { clearTimeout(timeout); reject(err); });
      }).catch(err => { phase('error'); status.textContent = '这一页的插画未能载入，请返回重试。'; throw err; }).finally(() => { loading = null; });
      return loading;
    }
    function closeWhisper() { whisper.hidden = true; rose.setAttribute('aria-expanded', 'false'); phase('complete'); status.textContent = '她仍在这里，等一颗星星亮起来。'; rose.focus({ preventScroll: true }); }
    next.addEventListener('click', event => {
      if (!active || element.inert || element.dataset.state !== 'dialogue' || (event.detail > 1 && gestureSeen) || event.repeat || performance.now() < continueLock) return;
      gestureSeen = true; continueLock = performance.now() + 420;
      if (typing) finishTyping(); else if (index < lines.length - 1) showLine(index + 1); else depart();
    });
    rose.addEventListener('click', () => { if (!active || element.inert || rose.disabled || !['complete', 'whisper'].includes(element.dataset.state)) return; whisper.hidden = false; rose.setAttribute('aria-expanded', 'true'); phase('whisper'); status.textContent = '她把最后一句话留给了日落。'; find('c03-close-whisper').focus({ preventScroll: true }); });
    find('c03-close-whisper').addEventListener('click', closeWhisper);
    find('c03-previous').addEventListener('click', onPrevious);
    find('c03-replay').addEventListener('click', () => { if (!active) return; reset(); showLine(0); });
    find('c03-next').addEventListener('click', async () => {
      if (!active || element.inert || nextBusy) return;
      if (route04?.status === 'ready') {
        nextBusy = true; const epoch = navigationEpoch, button = find('c03-next'); button.disabled = true;
        const context = { from: '03', to: '04', scene: element, reducedMotion: motion.matches };
        const proceed = async () => { try { if (active && epoch === navigationEpoch) await route04.enter?.(context); } catch (_) { if (active && epoch === navigationEpoch) status.textContent = '下一页尚未准备好，先留在这里。'; } finally { if (active && epoch === navigationEpoch) { nextBusy = false; button.disabled = false; } } };
        try {
          await route04.prepare?.(context);
          if (!active || epoch !== navigationEpoch) return;
          if (['complete', 'whisper'].includes(element.dataset.state)) await proceed();
          else { nextAfterDeparture = proceed; if (element.dataset.state !== 'departure') depart(); }
        } catch (_) { if (active && epoch === navigationEpoch) { nextBusy = false; button.disabled = false; status.textContent = '下一页尚未准备好，先留在这里。'; } }
        return;
      }
      const previous = status.textContent; status.textContent = '04 · 等待尚未开放，先陪她看一会儿日落。';
      later(() => { if (active && status.textContent.startsWith('04 ·')) status.textContent = previous; }, 3400);
    });
    extras.querySelector('.c03-cover').addEventListener('click', onCover);
    document.addEventListener('keydown', event => { if (!active) return; if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); if (event.key === 'Escape' && !whisper.hidden) closeWhisper(); });
    motion.addEventListener('change', () => { if (!active || !motion.matches) return; if (typing) finishTyping(); if (element.dataset.state === 'departure') complete(); else if (index === 2 || index === 3) { clearActions(); element.dataset.dome = index === 3 ? 'covered' : 'lift'; element.dataset.gesture = index === 3 ? 'placing' : 'reach'; } });
    const initial = loadAssets(); initial.catch(() => {});
    return Object.freeze({ element, extras, ready: initial, loadAssets, reset,
      activate({ start = true } = {}) { active = true; element.hidden = false; element.inert = false; extras.hidden = false; reset(); if (start && ready) showLine(0); },
      start() { if (active && ready && element.dataset.state === 'ready') showLine(0); },
      deactivate() { active = false; clearAll(); element.hidden = true; element.inert = true; extras.hidden = true; },
      restoreComplete() { active = true; element.hidden = false; element.inert = false; extras.hidden = false; reset(); dialogue.hidden = true; complete(); },
      setNextChapter(config) { route04 = config; find('c03-next').querySelector('small').textContent = config?.status === 'ready' ? '下一幕' : '下一幕 · 未开放'; },
      get state() { return Object.freeze({ active, ready, phase: element.dataset.state, line: index, typing }); }
    });
  }
  window.FAREWELL_STORY = Object.freeze({ create, lines, heart });
})();
