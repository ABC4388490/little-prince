(() => {
  'use strict';
  const scene = document.getElementById('scene');
  const rose = document.getElementById('rose');
  const dialogue = document.getElementById('dialogue');
  const line = document.getElementById('spoken-line');
  const accessibleLine = document.getElementById('accessible-line');
  const nextLine = document.getElementById('continue');
  const continueLabel = document.getElementById('continue-label');
  const whisper = document.getElementById('heart-whisper');
  const status = document.getElementById('scene-status');
  const preview = document.getElementById('next-preview');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelector('.production-note').hidden = new URLSearchParams(location.search).get('debug') !== '1';
  const lines = Object.freeze([
    { speaker: 'rose', name: '玫瑰', text: '你是在等我开花吗？' },
    { speaker: 'prince', name: '小王子', text: '我只是很好奇，你会是什么样子。' },
    { speaker: 'rose', name: '玫瑰', text: '那你现在看见了。' },
    { speaker: 'prince', name: '小王子', text: '嗯。比我想象中还要特别。' }
  ]);

  let phase = 'loading';
  let lineIndex = -1;
  let letterIndex = 0;
  let typing = false;
  let assetsReady = false;
  let typingTimer;
  let inputLockedUntil = 0;
  const scheduled = new Set();

  function later(callback, delay) {
    const timer = window.setTimeout(() => { scheduled.delete(timer); callback(); }, delay);
    scheduled.add(timer);
    return timer;
  }
  function cancelTimers() {
    scheduled.forEach(window.clearTimeout);
    scheduled.clear();
    typingTimer = undefined;
  }
  function setPhase(value) { phase = value; scene.dataset.phase = value; }
  function acceptInput(event) {
    // Treat a double click / key repeat as a single reading gesture.
    if (event.detail > 1 || performance.now() < inputLockedUntil) return false;
    inputLockedUntil = performance.now() + 420;
    return true;
  }
  function updateContinue() {
    continueLabel.textContent = typing ? '补全这句话' : lineIndex === lines.length - 1 ? '把这一刻记住' : '轻触继续';
    nextLine.setAttribute('aria-label', typing ? '立即显示完整对白' : lineIndex === lines.length - 1 ? '结束对白，聆听玫瑰心声' : '显示下一句对白');
  }
  function finishTyping() {
    window.clearTimeout(typingTimer);
    scheduled.delete(typingTimer);
    typing = false;
    line.textContent = lines[lineIndex].text;
    updateContinue();
  }
  function typeLetter() {
    line.textContent = lines[lineIndex].text.slice(0, ++letterIndex);
    if (letterIndex < lines[lineIndex].text.length) typingTimer = later(typeLetter, 65);
    else { typing = false; updateContinue(); }
  }
  function showLine(index) {
    lineIndex = index;
    letterIndex = 0;
    const current = lines[index];
    scene.dataset.speaking = current.speaker;
    dialogue.dataset.speaker = current.speaker;
    dialogue.dataset.line = String(index);
    document.getElementById('speaker').textContent = current.name;
    // Announce the whole sentence once, rather than every typewriter character.
    accessibleLine.textContent = `${current.name}：${current.text}`;
    line.textContent = '';
    dialogue.hidden = false;
    typing = true;
    if (motion.matches) finishTyping();
    else { updateContinue(); typingTimer = later(typeLetter, 65); }
    status.textContent = `初见 · ${index + 1} / ${lines.length} 句`;
  }
  function finishBloom() {
    if (phase !== 'blooming') return;
    cancelTimers();
    scene.dataset.rose = 'open';
    setPhase('dialogue');
    rose.disabled = true;
    rose.setAttribute('aria-label', '玫瑰已经盛开，请继续阅读对白');
    showLine(0);
    if (!preview?.open) nextLine.focus({ preventScroll: true });
  }
  function bloom(event) {
    if (phase !== 'idle' || !acceptInput(event)) return;
    setPhase('blooming');
    rose.disabled = true;
    status.textContent = '她正慢慢醒来。';
    if (motion.matches) { finishBloom(); return; }
    later(() => { scene.dataset.rose = 'half'; }, 480);
    later(() => { scene.dataset.rose = 'open'; }, 1650);
    later(() => { scene.classList.add('petals-falling'); }, 2200);
    later(finishBloom, 3600);
  }
  function completeDialogue() {
    setPhase('complete');
    dialogue.hidden = true;
    delete scene.dataset.speaking;
    rose.disabled = false;
    rose.setAttribute('aria-label', '聆听玫瑰没有说出口的话');
    rose.setAttribute('aria-expanded', 'false');
    rose.setAttribute('aria-controls', 'heart-whisper');
    status.textContent = '轻触玫瑰，听听她的心声。';
    rose.focus({ preventScroll: true });
  }
  function closeWhisper() {
    whisper.hidden = true;
    rose.setAttribute('aria-expanded', 'false');
    status.textContent = '轻触玫瑰，听听她的心声。';
    rose.focus({ preventScroll: true });
  }
  function reset(focusRose = true) {
    cancelTimers();
    scene.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    setPhase(assetsReady ? 'idle' : 'loading');
    scene.dataset.rose = 'bud';
    delete scene.dataset.speaking;
    scene.classList.remove('petals-falling');
    lineIndex = -1;
    typing = false;
    inputLockedUntil = 0;
    dialogue.hidden = true;
    whisper.hidden = true;
    line.textContent = '';
    accessibleLine.textContent = '';
    rose.disabled = !assetsReady;
    rose.setAttribute('aria-label', '轻触花苞，让玫瑰绽放');
    rose.removeAttribute('aria-expanded');
    rose.removeAttribute('aria-controls');
    status.textContent = assetsReady ? '在一个清晨，他等到了一朵花。' : '正在准备这一页……';
    if (focusRose && assetsReady) rose.focus({ preventScroll: true });
  }

  rose.addEventListener('click', event => {
    if (phase === 'idle') bloom(event);
    else if (phase === 'complete' && acceptInput(event)) {
      whisper.hidden = !whisper.hidden;
      rose.setAttribute('aria-expanded', String(!whisper.hidden));
      status.textContent = whisper.hidden ? '轻触玫瑰，听听她的心声。' : '有些话，只愿说给懂得的人听。';
      if (!whisper.hidden) document.getElementById('close-whisper').focus({ preventScroll: true });
    }
  });
  nextLine.addEventListener('click', event => {
    if (phase !== 'dialogue' || !acceptInput(event)) return;
    if (typing) finishTyping();
    else if (lineIndex < lines.length - 1) showLine(lineIndex + 1);
    else completeDialogue();
  });
  document.getElementById('close-whisper').addEventListener('click', closeWhisper);
  document.getElementById('replay').addEventListener('click', () => reset());
  document.getElementById('next').addEventListener('click', () => {
    if (window.STORY_CHAPTER_NAVIGATION) window.STORY_CHAPTER_NAVIGATION.request('02');
    else location.assign('getting-closer.html');
  });
  preview?.addEventListener('click', event => {
    const rect = preview.getBoundingClientRect();
    if (event.target === preview && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) preview.close();
  });
  document.addEventListener('keydown', event => {
    if (scene.hidden || scene.inert) return;
    if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault();
    if (event.key === 'Escape' && !whisper.hidden && !preview?.open) closeWhisper();
  });
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    if (phase === 'blooming') finishBloom();
    else if (typing) finishTyping();
  });
  window.addEventListener('storybook:chapterchange', event => {
    if (event.detail?.chapter !== '01') {
      if (phase === 'blooming' || phase === 'dialogue') reset(false);
      else cancelTimers();
    }
  });
  window.addEventListener('pagehide', cancelTimers);
  window.addEventListener('pageshow', event => { if (event.persisted) reset(false); });

  // Bind independently replaceable assets and wait for every state before enabling bloom.
  const loads = Array.from(document.querySelectorAll('[data-asset]'), img => new Promise((resolve, reject) => {
    const decoded = () => img.decode().then(resolve, reject);
    img.addEventListener('load', decoded, { once: true });
    img.addEventListener('error', reject, { once: true });
    img.loading = 'eager';
    img.src = window.FIRST_MEETING_ASSETS[img.dataset.asset];
    // Cached images can already be ready when their URL is assigned.
    if (img.complete && img.naturalWidth > 0) decoded();
  }));
  const loadTimeout = later(() => {
    document.getElementById('asset-error').hidden = false;
    status.textContent = '插画载入较慢，可以刷新后再试。';
  }, 12000);
  Promise.all(loads).then(() => {
    window.clearTimeout(loadTimeout);
    scheduled.delete(loadTimeout);
    assetsReady = true;
    document.getElementById('replay').disabled = false;
    document.getElementById('asset-error').hidden = true;
    reset(false);
  }).catch(() => {
    cancelTimers();
    document.getElementById('asset-error').hidden = false;
    status.textContent = '插画未能载入，请刷新重试。';
  });
})();
