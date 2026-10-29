/* Chapter 02 is a reusable scene/controller. It never reads or rewrites chapter 01 dialogue. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const scripts = Object.freeze({
    water: [
      { speaker: 'prince', name: '小王子', text: '今天也给你浇一点水吧。' },
      { speaker: 'rose', name: '玫瑰', text: '不要太多，我可不想弄湿花瓣。' }
    ],
    glass: [
      { speaker: 'rose', name: '玫瑰', text: '今晚可能会很冷。' },
      { speaker: 'prince', name: '小王子', text: '那我把玻璃罩留在这里。' }
    ]
  });
  const whisperText = '其实，我只是希望你能多陪我一会儿。';

  function create({ onPrevious = () => location.assign('first-meeting.html?v=closer-v1'), onCover = () => location.assign('index.html') } = {}) {
    const element = document.createElement('section');
    element.className = 'scene closer-scene'; element.id = 'closer-scene';
    element.setAttribute('aria-labelledby', 'c02-title'); element.tabIndex = -1;
    element.dataset.state = 'loading'; element.dataset.interaction = '';
    element.innerHTML = `
      <div class="c02-camera">
        <img class="sky-background c02-sky" data-closer-asset="sky" alt="" aria-hidden="true" draggable="false">
        <div class="c02-daylight" aria-hidden="true"></div>
        <img class="planet" data-closer-asset="planet" alt="与初见相同的 B612 星球，暖灰岩石与细小的花" draggable="false">
        <div class="character c02-prince"><img class="c02-pose c02-pose-rest" data-closer-asset="prince" alt="小王子蹲在玫瑰旁，轻轻照料她" draggable="false"><img class="c02-pose c02-pose-holding" data-closer-asset="princeHolding" alt="" aria-hidden="true" draggable="false"><img class="c02-pose c02-pose-pouring" data-closer-asset="princePouring" alt="" aria-hidden="true" draggable="false"></div>
        <div class="c02-glow" aria-hidden="true"></div>
        <button class="rose-target c02-rose" id="c02-petal" type="button" aria-label="轻触玫瑰花瓣，听听她的心声" aria-controls="c02-whisper" aria-expanded="false" disabled><img data-closer-asset="rose" alt="盛开的玫瑰" draggable="false"></button>
        <button class="c02-prop c02-can" id="c02-water" type="button" aria-label="拿起水壶，为玫瑰浇水" disabled><img data-closer-asset="wateringCan" alt="水壶" draggable="false"></button>
        <button class="c02-prop c02-dome" id="c02-glass" type="button" aria-label="轻触放在玫瑰旁边的空玻璃罩" disabled><img data-closer-asset="dome" alt="放在玫瑰旁、尚未盖下的玻璃罩" draggable="false"><span class="c02-reflection" aria-hidden="true"></span></button>
        <div class="c02-drops" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i class="c02-drop" style="--delay:${i * .12}s;--drift:${(i % 3 - 1) * 3}px"></i>`).join('')}</div>
        <span class="c02-stardust" aria-hidden="true"></span>
      </div>
      <div class="c02-sunset" aria-hidden="true"></div>
      <header class="chapter-heading"><p class="eyebrow">A STORY ABOUT HER</p><h1 id="c02-title"><span>02</span><i>·</i>靠近</h1><p class="english-title">GETTING CLOSER</p></header>
      <p class="scene-margin" aria-hidden="true">从那天起，<br>每天的小事，慢慢有了名字。</p>
      <div class="dialogue c02-dialogue" id="c02-dialogue" data-speaker="prince" hidden>
        <p class="speaker" id="c02-speaker"></p><p class="spoken-line" id="c02-line" aria-hidden="true"></p>
        <p class="sr-only" id="c02-accessible" aria-live="polite" aria-atomic="true"></p>
        <button class="continue" id="c02-continue" type="button" aria-describedby="c02-accessible"><span id="c02-continue-label">补全这句话</span><span aria-hidden="true">↗</span></button>
      </div>
      <div class="c02-whisper" id="c02-whisper" hidden><span>玫瑰没有说出口的话</span><p>「${whisperText}」</p><button id="c02-close-whisper" type="button">轻轻收起 ↙</button></div>
      <div class="scene-caption"><span class="caption-rule" aria-hidden="true"></span><p id="c02-status" role="status" aria-live="polite">正在准备白天的这一页……</p><span class="caption-rule" aria-hidden="true"></span></div>
      <span class="coordinate" aria-hidden="true">B612 · 白天</span><span class="page-number" aria-hidden="true">— 02 —</span>`;
    const extras = document.createElement('div'); extras.className = 'c02-extras';
    extras.innerHTML = `
      <nav class="chapter-nav c02-nav" aria-label="绘本章节导航，当前第二幕">
        <button class="previous" id="c02-previous" type="button"><span aria-hidden="true">←</span><span><small>上一幕</small>01 · 初见</span></button>
        <button class="replay" id="c02-replay" type="button" disabled><span aria-hidden="true">↻</span> 重新体验本幕</button>
        <button class="next" id="c02-next" type="button" aria-describedby="c02-status"><span><small>下一幕 · 未开放</small>03 · 告别</span><span aria-hidden="true">→</span></button>
      </nav>
      <div class="under-page"><span>水壶 · 玻璃罩 · 花瓣，均可轻触</span><span class="page-dots" aria-label="共六幕，当前第二幕"><i></i><i></i><i class="current"></i><i></i><i></i><i></i></span><span>鼠标 / 触摸 · Tab 选择 · Enter 确认</span></div>
      <details class="c02-notes" hidden><summary>素材与动作说明</summary><p>星球、玫瑰、天空与原人物沿用第一幕。新增水彩水壶、空玻璃罩及同角色持壶／倾倒姿态，保留透明独立图层；双手与持壶绘在同一姿态层内，避免手与壶脱节。动作采用姿态交叉淡入，含拿起、倾倒和放回，并非连续逐帧动画。暖色天空为独立光色层。<a href="assets/closer/ART-DIRECTION.md">查看素材制作记录</a> · <button class="text-button c02-cover" type="button">返回预览入口 ↗</button></p></details>`;
    extras.querySelector('.c02-notes').hidden = new URLSearchParams(location.search).get('debug') !== '1';
    const find = id => element.querySelector(`#${id}`) || extras.querySelector(`#${id}`);
    const water = find('c02-water'), glass = find('c02-glass'), petal = find('c02-petal');
    const hotspots = { water, glass, petal };
    const dialogue = find('c02-dialogue'), line = find('c02-line'), continueButton = find('c02-continue');
    const whisper = find('c02-whisper'), caption = find('c02-status');
    const timers = new Set();
    let active = false, assetsReady = false, assetAttempt = 0, loading;
    let selected = '', index = -1, typing = false, letter = 0, typingTimer;
    let continueLock = 0, hotspotLock = 0, readGestureSeen = false, nextChapter = null, nextBusy = false, nextGeneration = 0;
    let duskTimer, duskRestoreTimer;
    const actionTimers = new Set();
    function later(fn, delay) { const timer = setTimeout(() => { timers.delete(timer); fn(); }, delay); timers.add(timer); return timer; }
    function clearTimer(timer) { clearTimeout(timer); timers.delete(timer); }
    function clearAction() {
      actionTimers.forEach(clearTimer); actionTimers.clear();
      element.dataset.action = ''; element.dataset.waterStep = 'rest';
      water.removeAttribute('aria-busy');
    }
    function actionLater(fn, delay) {
      const timer = later(() => { actionTimers.delete(timer); fn(); }, delay); actionTimers.add(timer);
    }
    function placeWater() {
      // Anchor drops to the painted spout, not to a fixed point in the sky.
      const camera = element.querySelector('.c02-camera').getBoundingClientRect();
      const figure = element.querySelector('.c02-prince').getBoundingClientRect();
      const flower = petal.getBoundingClientRect(), anchor = window.CLOSER_ASSETS.poseRegistration.mouth;
      const x = figure.left + figure.width * anchor[0], y = figure.top + figure.height * anchor[1];
      const drops = element.querySelector('.c02-drops');
      drops.style.left = `${(x - camera.left) / camera.width * 100}%`;
      drops.style.top = `${(y - camera.top) / camera.height * 100}%`;
      // Soil at the near edge of the root area; a short arc, never across petals.
      drops.style.setProperty('--water-dx', `${(flower.left + flower.width * .43 - x) / camera.width * element.clientWidth}px`);
      drops.style.setProperty('--water-dy', `${(flower.top + flower.height * .94 - y) / camera.height * element.clientHeight}px`);
    }
    function startAction(kind) {
      clearAction(); void element.offsetWidth;
      if (kind === 'glass') {
        element.dataset.action = 'glass'; actionLater(clearAction, motion.matches ? 0 : 1250); return;
      }
      if (motion.matches) return; // Text interaction remains; no moving poses/drops.
      placeWater(); element.dataset.action = 'water'; element.dataset.waterStep = 'lift';
      water.setAttribute('aria-busy', 'true');
      actionLater(() => { element.dataset.waterStep = 'pour'; }, 780);
      actionLater(() => { element.dataset.waterStep = 'lower'; }, 2650);
      actionLater(() => { element.dataset.waterStep = 'rest'; }, 3350);
      actionLater(clearAction, 3850);
    }
    function clearTyping() { clearTimer(typingTimer); typing = false; }
    function clearAll() { clearAction(); timers.forEach(clearTimeout); timers.clear(); typing = false; nextBusy = false; nextGeneration++; element.getAnimations({ subtree: true }).forEach(a => a.cancel()); }
    function phase(value) { element.dataset.state = value; }
    function updateContinue() {
      find('c02-continue-label').textContent = typing ? '补全这句话' : index === 0 ? '轻触继续' : '把这件小事记住';
      continueButton.setAttribute('aria-label', typing ? '立即显示完整对白' : index === 0 ? '显示下一句对白' : '收起这段对白');
    }
    function finishTyping() { clearTyping(); line.textContent = scripts[selected][index].text; updateContinue(); }
    function type() {
      const text = scripts[selected][index].text; line.textContent = text.slice(0, ++letter);
      if (letter < text.length) typingTimer = later(type, 60); else { typing = false; updateContinue(); }
    }
    function showLine(value) {
      clearTyping(); index = value; letter = 0;
      const current = scripts[selected][index];
      dialogue.dataset.speaker = current.speaker; dialogue.dataset.line = String(index);
      find('c02-speaker').textContent = current.name; find('c02-accessible').textContent = `${current.name}：${current.text}`;
      line.textContent = ''; dialogue.hidden = false; typing = true;
      phase('dialogue'); caption.textContent = `靠近 · ${index + 1} / 2 句`;
      if (motion.matches) finishTyping(); else { updateContinue(); typingTimer = later(type, 60); }
      continueButton.focus({ preventScroll: true });
    }
    function closeWhisper() { whisper.hidden = true; petal.setAttribute('aria-expanded', 'false'); element.dataset.interaction = ''; phase('idle'); caption.textContent = '有些心声，只愿说给靠近的人听。'; petal.focus({ preventScroll: true }); }
    function choose(kind, event) {
      if (!active || element.inert || !assetsReady || nextBusy || event?.detail > 1 || event?.repeat || performance.now() < hotspotLock) return;
      hotspotLock = performance.now() + 180; continueLock = 0; readGestureSeen = false;
      clearTyping(); clearAction(); clearTimer(duskTimer); clearTimer(duskRestoreTimer);
      dialogue.hidden = true; whisper.hidden = true; petal.setAttribute('aria-expanded', 'false');
      element.dataset.evening = 'false'; element.dataset.action = ''; void element.offsetWidth;
      selected = kind; element.dataset.interaction = kind;
      if (kind === 'petal') {
        phase('whisper'); whisper.hidden = false; petal.setAttribute('aria-expanded', 'true');
        caption.textContent = '玫瑰把一句话，藏在了花瓣里。'; find('c02-close-whisper').focus({ preventScroll: true }); return;
      }
      startAction(kind);
      showLine(0);
    }
    function reset(focus = false) {
      clearAll(); selected = ''; index = -1; continueLock = 0; hotspotLock = 0;
      element.dataset.interaction = ''; element.dataset.action = ''; element.dataset.evening = 'false';
      dialogue.hidden = true; whisper.hidden = true; line.textContent = ''; find('c02-accessible').textContent = '';
      petal.setAttribute('aria-expanded', 'false');
      phase(assetsReady ? 'idle' : 'loading'); caption.textContent = assetsReady ? '照料，是每天认真做的小事。' : '正在准备白天的这一页……';
      Object.values(hotspots).forEach(button => button.disabled = !assetsReady);
      find('c02-replay').disabled = !assetsReady; find('c02-next').disabled = !assetsReady;
      if (focus && assetsReady) water.focus({ preventScroll: true });
    }
    function loadAssets() {
      if (assetsReady) return Promise.resolve();
      if (loading) return loading;
      assetAttempt++; phase('loading');
      const attempt = assetAttempt;
      loading = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Chapter 02 artwork timed out')), 15000);
        Promise.all([...element.querySelectorAll('[data-closer-asset]')].map(img => new Promise((yes, no) => {
          img.onload = async () => { try { await img.decode(); yes(); } catch (error) { no(error); } };
          img.onerror = () => no(new Error(`Artwork failed: ${img.dataset.closerAsset}`));
          const src = window.CLOSER_ASSETS[img.dataset.closerAsset];
          img.src = src + (attempt > 1 ? `?retry=${attempt}` : '');
          if (img.complete && img.naturalWidth) img.decode().then(yes, no);
        }))).then(() => { clearTimeout(timeout); assetsReady = true; reset(); resolve(); }, error => { clearTimeout(timeout); reject(error); });
      }).catch(error => { phase('error'); caption.textContent = '这一页的插画尚未载入，请重新进入或刷新重试。'; throw error; }).finally(() => { loading = null; });
      return loading;
    }
    async function goNext() {
      if (!active || element.inert || !assetsReady || nextBusy) return;
      const generation = ++nextGeneration, route = nextChapter;
      // A finished next chapter owns the transition. Keep the current dialogue
      // visible until its scene can fade it out, instead of hiding it abruptly.
      if (route?.status === 'ready') {
        clearAction(); nextBusy = true; find('c02-next').disabled = true;
        const context = { from: '02', to: '03', reducedMotion: motion.matches, scene: element };
        try {
          await route.prepare?.(context);
          if (!active || generation !== nextGeneration) return;
          if (route.enter) await route.enter(context);
          else if (route.href) {
            const url = new URL(route.href, location.href);
            if (url.origin !== location.origin) throw new Error('Chapter must be same-origin');
            location.assign(url.href);
          }
        } catch (_) { if (active && generation === nextGeneration) caption.textContent = '下一页尚未准备好，先留在这里。'; }
        finally { if (generation === nextGeneration) { nextBusy = false; find('c02-next').disabled = false; } }
        return;
      }
      clearTyping(); clearAction(); dialogue.hidden = true; whisper.hidden = true; petal.setAttribute('aria-expanded', 'false');
      element.dataset.action = ''; element.dataset.interaction = ''; nextBusy = true; find('c02-next').disabled = true;
      element.dataset.evening = 'true'; phase('evening');
      const readyNext = route?.status === 'ready';
      caption.textContent = readyNext ? '天色渐暖，下一页正在靠近。' : '03 · 告别仍在绘制，先陪她再坐一会儿。';
      duskTimer = later(async () => {
        if (!active) return;
        try {
          if (readyNext) {
            const context = { from: '02', to: '03', reducedMotion: motion.matches, scene: element };
            await route.prepare?.(context);
            if (!active || generation !== nextGeneration) return;
            if (route.enter) await route.enter(context);
            else if (route.href) {
              const url = new URL(route.href, location.href);
              if (url.origin !== location.origin) throw new Error('Chapter must be same-origin');
              location.assign(url.href);
            }
          }
        } catch (_) { if (active && generation === nextGeneration) caption.textContent = '下一页尚未准备好，先留在这里。'; }
        finally { if (generation === nextGeneration) { nextBusy = false; find('c02-next').disabled = false; if (active) phase('idle'); } }
      }, motion.matches ? 0 : 850);
      duskRestoreTimer = later(() => { element.dataset.evening = 'false'; }, motion.matches ? 0 : 3200);
    }
    Object.entries(hotspots).forEach(([kind, button]) => button.addEventListener('click', event => choose(kind, event)));
    continueButton.addEventListener('click', event => {
      if (!active || element.inert || element.dataset.state !== 'dialogue' || (event.detail > 1 && readGestureSeen) || event.repeat || performance.now() < continueLock) return;
      continueLock = performance.now() + 420; readGestureSeen = true;
      if (typing) finishTyping();
      else if (index === 0) showLine(1);
      else { dialogue.hidden = true; phase('idle'); caption.textContent = '她认真记住了这件小事。'; hotspots[selected].focus({ preventScroll: true }); }
    });
    find('c02-close-whisper').addEventListener('click', closeWhisper);
    find('c02-replay').addEventListener('click', () => reset(true));
    find('c02-previous').addEventListener('click', onPrevious);
    find('c02-next').addEventListener('click', goNext);
    extras.querySelector('.c02-cover').addEventListener('click', onCover);
    function onKey(event) {
      if (!active) return;
      if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault();
      if (event.key !== 'Escape') return;
      if (!whisper.hidden) closeWhisper();
      else if (!dialogue.hidden) { clearTyping(); dialogue.hidden = true; phase('idle'); hotspots[selected]?.focus({ preventScroll: true }); }
      else if (nextBusy) { clearTimer(duskTimer); clearTimer(duskRestoreTimer); nextGeneration++; nextBusy = false; element.dataset.evening = 'false'; phase('idle'); find('c02-next').disabled = false; }
    }
    document.addEventListener('keydown', onKey);
    motion.addEventListener('change', () => { if (active && motion.matches) { clearAction(); if (typing) finishTyping(); } });
    const ready = loadAssets(); ready.catch(() => {});
    return Object.freeze({
      element, extras, ready, loadAssets,
      activate({ focus = true } = {}) { active = true; element.hidden = false; element.inert = false; extras.hidden = false; reset(); if (focus && assetsReady) water.focus({ preventScroll: true }); },
      deactivate() { active = false; clearAll(); element.hidden = true; element.inert = true; extras.hidden = true; },
      reset, setNextChapter(config) { nextChapter = config; find('c02-next').querySelector('small').textContent = config?.status === 'ready' ? '下一幕' : '下一幕 · 未开放'; },
      get state() { return Object.freeze({ phase: element.dataset.state, selected, line: index, typing, assetsReady, active }); }
    });
  }
  window.CLOSER_STORY = Object.freeze({ create, scripts, whisperText });
})();
