/* Chapter 04 reuses the established B612 artwork as separate layers. */
(() => {
  'use strict';
  const thoughts = ['他现在，会在哪一颗星球上呢？', '他离开以后，我也学会了一个人迎接日出。', '如果他也在看星星，希望有一颗能替我告诉他：我很好。'];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function mount({ stage, book, third, navigation }) {
    const scene = document.createElement('section'); scene.className = 'scene waiting-scene'; scene.id = 'waiting-scene'; scene.hidden = true; scene.inert = true; scene.setAttribute('aria-labelledby', 'c04-title');
    scene.innerHTML = `<div class="c04-camera"><img class="sky-background" data-art="sky" alt=""><div class="c04-night"></div><div class="c04-landscape"><img class="planet" data-art="planet" alt="B612 星球，暖灰色岩石、陨石坑与小花"><div class="c04-rose"><img data-art="rose" alt="玻璃罩中的玫瑰"></div><div class="c04-dome"><img data-art="dome" alt=""><span class="c04-moonlight"></span></div></div><div class="c04-decor" aria-hidden="true"><span>✧</span><span>·</span><span>✦</span><span>·</span></div><div class="c04-stars">${thoughts.map((_, i) => `<button class="c04-star c04-star-${i+1}" type="button" aria-label="星星 ${i+1}，听玫瑰的心声" aria-pressed="false"><span aria-hidden="true">✦</span></button>`).join('')}</div><span class="c04-convergence" aria-hidden="true"></span></div><header class="chapter-heading"><p class="eyebrow">A STORY ABOUT HER</p><h1 id="c04-title"><span>04</span><i>·</i>等待</h1><p class="english-title">WAITING</p></header><p class="scene-margin">他离开以后，<br>玫瑰开始学着和星星说话。</p><div class="c04-thought" aria-live="polite" aria-atomic="true"><p></p></div><div class="scene-caption"><span class="caption-rule"></span><p id="c04-status">轻触星星，听听她的心事。</p><span class="caption-rule"></span></div><span class="coordinate">B612 · 夜晚</span><span class="page-number">— 04 —</span>`;
    const extras = document.createElement('div'); extras.className = 'c04-extras'; extras.hidden = true;
    extras.innerHTML = `<nav class="chapter-nav" aria-label="绘本章节导航，当前第四幕"><button class="previous" id="c04-previous" type="button"><span aria-hidden="true">←</span><span><small>上一幕</small>03 · 告别</span></button><button class="replay" id="c04-replay" type="button"><span aria-hidden="true">↻</span> 重新体验本幕</button><button class="next" id="c04-next" type="button"><span><small>下一幕 · 未开放</small>05 · 没寄出的信</span><span aria-hidden="true">→</span></button></nav><div class="under-page"><span>有些心事，讲给星星听。</span><span class="page-dots" aria-label="共六幕，当前第四幕"><i></i><i></i><i></i><i></i><i class="current"></i><i></i></span><span>触摸 / 点击 · Tab 选择 · Enter 确认</span></div>`;
    stage.append(scene); book.append(extras);
    const loadError = document.createElement('p'); loadError.className = 'chapter-navigation-status'; loadError.setAttribute('role', 'alert'); loadError.hidden = true; loadError.innerHTML = '这一页的插画未能载入，请刷新页面重试。 <a href="index.html">返回故事封面</a>'; book.append(loadError);
    function showLoadError() { if (location.hash === '#chapter-04') { loadError.hidden = false; document.body.dataset.chapter = '04'; } }
    const stars = [...scene.querySelectorAll('.c04-star')], thought = scene.querySelector('.c04-thought'), text = thought.querySelector('p'), status = scene.querySelector('#c04-status');
    let route05 = null;
    let active = false, running = false, selected = -1, read = new Set(), timers = new Set(), animations = [], generation = 0, nightGlow = null;
    function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); }
    function clear() { generation++; nightGlow?.dispose(); nightGlow = null; timers.forEach(clearTimeout); timers.clear(); animations.forEach(a => a.cancel()); animations = []; running = false; delete scene.dataset.leaving; }
    function reset() { clear(); selected = -1; read.clear(); text.textContent = ''; thought.classList.remove('visible'); stars.forEach(s => { s.dataset.read = 'false'; s.setAttribute('aria-pressed', 'false'); }); status.textContent = '轻触星星，听听她的心事。'; }
    function load() { return Promise.all([...scene.querySelectorAll('[data-art]')].map(img => { img.src = window.FAREWELL_ASSETS[img.dataset.art]; return img.decode(); })); }
    function select(i) { if (!active || running) return; selected = i; read.add(i); stars.forEach((s, n) => { s.dataset.read = String(read.has(n)); s.setAttribute('aria-pressed', String(n === i)); }); thought.classList.remove('visible'); const token = ++generation; const show = () => { if (!active || token !== generation) return; text.textContent = thoughts[i]; thought.classList.add('visible'); }; if (motion.matches || !text.textContent) show(); else later(show, 220); scene.classList.remove('respond'); void scene.offsetWidth; scene.classList.add('respond'); }
    stars.forEach((s, i) => s.addEventListener('click', () => select(i)));
    function activate({ history = true, intro = false } = {}) { loadError.hidden = true; active = true; scene.hidden = false; scene.inert = false; extras.hidden = false; document.body.dataset.chapter = '04'; document.title = '04 · 等待 — 关于她 · 互动绘本'; if (history) historyPush(); if (intro) { scene.classList.add('arriving'); later(() => scene.classList.remove('arriving'), motion.matches ? 0 : 3400); } window.dispatchEvent(new CustomEvent('storybook:chapterchange', {detail:{chapter:'04'}})); }
    function historyPush() { window.history.pushState({storybookChapter:'04'}, '', `${location.pathname}${location.search}#chapter-04`); }
    function deactivate() { active = false; third.extras.inert = false; third.element.querySelector('.c03-prince').style.visibility = ''; reset(); scene.hidden = true; scene.inert = true; extras.hidden = true; scene.classList.remove('arriving'); }
    async function enter() {
      if (running || active) return;
      reset(); running = true; const token = generation;
      scene.hidden = false; scene.inert = true; extras.hidden = true; third.extras.inert = true;
      const prince = third.element.querySelector('.c03-prince'); prince.style.visibility = 'hidden';
      if (!motion.matches) {
        // A local WebGL atmosphere enriches the existing live scene. If WebGL
        // is unavailable, the regular DOM crossfade remains usable.
        try { const effect = await import('./farewell-night-glow.js'); if (token !== generation) return; nightGlow = effect.createNightGlow(third.element); } catch (_) { /* CSS transition remains the fallback. */ }
        if (token !== generation) return;
        const duration = 6000;
        for (const node of third.element.querySelectorAll('.chapter-heading,.scene-margin,.scene-caption,.coordinate,.page-number,.c03-whisper')) {
          const fade = node.animate([{opacity:1},{opacity:0}], {duration:500,fill:'both',easing:'ease-out'}); animations.push(fade); fade.finished.catch(() => {});
        }
        if (nightGlow) { const atmosphere=nightGlow.canvas.animate([{opacity:0},{opacity:1}],{duration,fill:'both',easing:'ease-in-out'}); animations.push(atmosphere); atmosphere.finished.catch(()=>{}); }
        const sun=third.element.querySelector('.c03-sun').animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(25px)',offset:.65},{opacity:0}],{duration,fill:'both',easing:'ease-in-out'});animations.push(sun);sun.finished.catch(()=>{});
        const a = scene.animate([{opacity:0,offset:0},{opacity:0,offset:.36},{opacity:1,offset:1}], {duration, fill:'both', easing:'ease-in-out'}); animations.push(a);
        scene.classList.add('arriving'); await a.finished.catch(() => {});
      }
      if (token !== generation) return;
      third.deactivate(); prince.style.visibility = ''; third.extras.inert = false;
      animations.forEach(a => a.cancel()); animations = []; nightGlow?.dispose(); nightGlow = null;
      running = false; activate({intro:false}); scene.classList.remove('arriving');
    }
    extras.querySelector('#c04-previous').addEventListener('click', () => { deactivate(); navigation.restoreThird(); document.querySelector('#c03-next').focus({preventScroll:true}); });
    extras.querySelector('#c04-replay').addEventListener('click', () => { reset(); stars[0].focus({preventScroll:true}); });
    extras.querySelector('#c04-next').addEventListener('click', async () => {
      if (!active || running) return;
      running = true; generation++; thought.classList.remove('visible'); scene.dataset.leaving = 'true'; status.textContent = '星光正为下一页汇聚……';
      if (route05?.status === 'ready') {
        try { await route05.enter({ from:'04', to:'05', scene, reducedMotion:motion.matches }); return; }
        catch (_) { if (!active) return; delete scene.dataset.leaving; running = false; if (selected !== -1) thought.classList.add('visible'); status.textContent = '05 · 信件插画未能载入，请重试或刷新页面。'; return; }
      }
      later(() => { if (!active) return; delete scene.dataset.leaving; running = false; if (selected !== -1) thought.classList.add('visible'); status.textContent = '05 · 没寄出的信尚未开放，星光会在这里等你。'; }, motion.matches ? 0 : 2800);
    });
    navigation.register04({ status:'ready', prepare:load, enter });
    window.WAITING_NAVIGATION = Object.freeze({ get active() { return active; }, get transitioning() { return running && !active; }, suspend() { active = false; clear(); scene.hidden = true; scene.inert = true; extras.hidden = true; }, restore() { clear(); activate({history:false}); if (selected !== -1) thought.classList.add('visible'); }, register05(config) { route05 = config; extras.querySelector('#c04-next small').textContent = config?.status === 'ready' ? '下一幕' : '下一幕 · 未开放'; }, get state() { return {active, running, selected, read:[...read]}; }, handleHistory() { if (location.hash === '#chapter-04') { load().then(() => { third.deactivate(); reset(); activate({history:false}); }).catch(showLoadError); } else { deactivate(); if (location.hash === '#chapter-03') navigation.restoreThird({history:false}); else navigation.returnCloser({history:false}); } } });
    if (window.LETTER_STORY) window.LETTER_STORY.mount({ stage, book, waiting: window.WAITING_NAVIGATION, waitingScene:scene, waitingExtras:extras });
    window.addEventListener('storybook:chapterchange', event => { if (event.detail?.chapter !== '04') loadError.hidden = true; });
    window.addEventListener('pagehide', () => { if (active || running) deactivate(); });
    if (location.hash === '#chapter-04') { window.STORY_CHAPTER_NAVIGATION?.prepareLaterChapter(); load().then(() => { third.deactivate(); reset(); activate({history:false}); }).catch(showLoadError); }
  }
  window.WAITING_STORY = Object.freeze({mount, thoughts});
})();
