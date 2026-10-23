/* Mailbox-only components. Existing index-main.js and memory credentials are untouched. */
(function () {
  'use strict';

  const DIARY_KEY = 'b612_diary';
  const HISTORY_KEY = 'b612_history';

  function dayKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function readArray(storage, key) {
    const raw = storage.getItem(key);
    const value = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error('Invalid local record');
    return value;
  }

  function validateDiary(items) {
    if (items.some(item => !item || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Array.isArray(item.messages))) {
      throw new Error('Invalid local diary');
    }
    return items;
  }

  function sortDiary(items) {
    return [...items].sort((a, b) => b.date.localeCompare(a.date));
  }

  class MailboxStore {
    constructor(storage) {
      this.storage = storage;
    }

    load() {
      // A saved [] means the user emptied the diary. Never resurrect old history.
      if (this.storage.getItem(DIARY_KEY) !== null) {
        return sortDiary(validateDiary(readArray(this.storage, DIARY_KEY)));
      }
      const grouped = new Map();
      const history = [...readArray(this.storage, HISTORY_KEY)].sort((a, b) => new Date(a && a.createdAt) - new Date(b && b.createdAt));
      for (const entry of history) {
        if (!entry) continue;
        const date = dayKey(entry.createdAt);
        if (!date) continue;
        if (!grouped.has(date)) grouped.set(date, { date, messages: [], favorite: false });
        const record = grouped.get(date);
        if (typeof entry.user === 'string' && entry.user.trim()) record.messages.push({ role: 'user', text: entry.user });
        if (typeof entry.reply === 'string' && entry.reply.trim()) record.messages.push({ role: 'prince', text: entry.reply });
      }
      return sortDiary([...grouped.values()].filter(item => item.messages.length));
    }

    update(change) {
      // Read again before mutation to preserve changes from another tab.
      const current = this.load();
      const next = sortDiary(validateDiary(change(current)));
      this.storage.setItem(DIARY_KEY, JSON.stringify(next));
      return next;
    }

    favorite(date) {
      return this.update(items => items.map(item => item.date === date ? { ...item, favorite: !item.favorite } : item));
    }

    remove(date) {
      let removed = null;
      const items = this.update(records => records.filter(item => {
        if (item.date !== date) return true;
        removed = item;
        return false;
      }));
      return { items, removed };
    }

    restore(record) {
      return this.update(items => {
        const existing = items.find(item => item.date === record.date);
        // New messages may have arrived while the deletion toast was visible.
        if (existing) return items.map(item => item.date === record.date ? { ...item, messages: [...record.messages, ...item.messages] } : item);
        return [...items, record];
      });
    }

    append(receipt) {
      const date = dayKey(receipt.createdAt);
      if (!date || !receipt.user.trim() || !receipt.reply.trim()) throw new Error('Invalid receipt');
      const beforeDiary = this.storage.getItem(DIARY_KEY);
      const beforeHistory = this.storage.getItem(HISTORY_KEY);
      const diary = this.load();
      const history = readArray(this.storage, HISTORY_KEY);
      // Make retries of a received-but-unsaved response idempotent.
      if (history.some(item => item && item.id === receipt.id)) return diary;
      let record = diary.find(item => item.date === date);
      if (!record) {
        record = { date, messages: [], favorite: false };
        diary.push(record);
      }
      record.messages.push({ role: 'user', text: receipt.user }, { role: 'prince', text: receipt.reply });
      const entry = { id: receipt.id, user: receipt.user, reply: receipt.reply, createdAt: receipt.createdAt };
      try {
        this.storage.setItem(DIARY_KEY, JSON.stringify(sortDiary(diary)));
        this.storage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, 200)));
      } catch (error) {
        // Preserve the pre-existing data if either browser write fails.
        if (beforeDiary === null) this.storage.removeItem(DIARY_KEY);
        else this.storage.setItem(DIARY_KEY, beforeDiary);
        if (beforeHistory === null) this.storage.removeItem(HISTORY_KEY);
        else this.storage.setItem(HISTORY_KEY, beforeHistory);
        throw error;
      }
      return sortDiary(diary);
    }
  }

  function summary(record) {
    const message = record.messages.find(item => item && item.role === 'user' && String(item.text || '').trim());
    return message ? String(message.text).trim() : '那天，和小王子说过的话';
  }

  function shortTitle(record, length = 30) {
    const chars = Array.from(summary(record));
    return chars.slice(0, length).join('') + (chars.length > length ? '…' : '');
  }

  function validateLetter(content) {
    if (!content.trim()) return '先写下一句话，再把信交给星星吧。';
    if (content.length > 4000) return '这封信有些长，请控制在 4000 字以内。';
    return '';
  }

  function isLocalPreview(pageLocation) {
    return pageLocation.protocol !== 'https:' && ['localhost', '127.0.0.1'].includes(pageLocation.hostname);
  }

  function chatCandidatesFor(pageLocation, queryApiBase, envApiBase) {
    const candidates = [];
    const add = value => {
      const clean = String(value || '').trim().replace(/\/+$/, '').replace(/\/messages$/, '');
      if (clean && !candidates.includes(clean)) candidates.push(clean);
    };
    add(queryApiBase);
    add(envApiBase);
    if (isLocalPreview(pageLocation)) {
      add('http://127.0.0.1:5000/api');
      add('http://localhost:5000/api');
    }
    add('/api');
    // A static preview has no POST route. Use the existing deployed chat service
    // after local routes explicitly reject the operation; no API key is exposed.
    if (isLocalPreview(pageLocation)) add('https://little-prince.xyz/api');
    add('https://little-prince-message-api-production-a183.up.railway.app/api');
    return candidates;
  }

  function canTryNextChatService(error, base, pageLocation) {
    if (error.name === 'AbortError') return false;
    if ([404, 405].includes(error.status)) return true;
    if (error.status === 501 && isLocalPreview(pageLocation)) {
      const target = new URL(base, pageLocation.href);
      if (['127.0.0.1', 'localhost'].includes(target.hostname)) return true;
    }
    // A network-level failure has no usable HTTP response. Auth, rate-limit,
    // upstream errors and invalid replies never trigger another POST.
    return !error.status && error instanceof TypeError;
  }

  // Export pure data components for dependency-free regression tests.
  if (typeof module !== 'undefined' && module.exports) module.exports = { MailboxStore, dayKey, validateLetter, shortTitle, chatCandidatesFor, canTryNextChatService };
  if (typeof document === 'undefined') return;

  const $ = selector => document.querySelector(selector);
  const list = $('#letter-list');
  const panel = $('#letters-panel');
  const reader = $('#letter-reader');
  const readerSheet = reader.querySelector('.reader-sheet');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let browserStorage;
  try { browserStorage = window.localStorage; }
  catch (error) { browserStorage = { getItem() { throw error; }, setItem() { throw error; } }; }
  const store = new MailboxStore(browserStorage);
  const state = { letters: [], filter: 'all', selected: null, removed: null, opener: null, opening: false, sending: false, pendingReceipt: null, storageBroken: false };
  let listAnimation = null;

  function storageNotice(message) {
    $('#storage-notice').textContent = message;
    $('#storage-notice').hidden = !message;
  }

  function reloadLetters() {
    try {
      state.letters = store.load();
      state.storageBroken = false;
      storageNotice('');
    } catch (error) {
      state.storageBroken = true;
      storageNotice('暂时无法读取这个浏览器里的信件。原始记录未被改动，请检查浏览器存储设置后刷新。');
    }
  }

  function mutate(action) {
    try {
      state.letters = action();
      storageNotice('');
      render();
      return true;
    } catch (error) {
      storageNotice('这次修改未能保存，原始信件未被改动。请检查浏览器存储空间或访问权限。');
      return false;
    }
  }

  function updateUnderline() {
    const selected = $('.mail-tab[aria-selected="true"]');
    $('.tab-underline').style.width = `${selected.offsetWidth}px`;
    $('.tab-underline').style.transform = `translateX(${selected.offsetLeft}px)`;
  }

  function emptyState(query) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const image = document.createElement('img');
    image.src = 'letter-mailbox-cutout.png';
    image.alt = '';
    image.width = 145;
    image.height = 150;
    const title = document.createElement('h2');
    title.textContent = query ? '这句话，暂时没有找到' : state.filter === 'favorite' ? '还没有珍藏的星光。' : '第一封信，还在路上。';
    const description = document.createElement('p');
    description.textContent = query ? '换一个词，或一段日期，再找找看。' : state.filter === 'favorite' ? '等你遇见想留下的话，就点亮那颗星星吧。' : '等你有想说的话，就来这里坐一会儿。';
    empty.append(image, title, description);
    if (query) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.textContent = '清除搜索';
      clear.onclick = () => { $('#letter-search').value = ''; render(); $('#letter-search').focus(); };
      empty.append(clear);
    } else if (state.filter === 'all') {
      const write = document.createElement('a');
      write.href = '#compose';
      write.textContent = '写下第一封信 ↗';
      empty.append(write);
    }
    return empty;
  }

  function setFavorite(button, record) {
    button.setAttribute('aria-pressed', String(!!record.favorite));
    button.setAttribute('aria-label', `${record.favorite ? '取消珍藏' : '珍藏'}：${shortTitle(record)}`);
  }

  function createEnvelope(record, index) {
    const fragment = $('#letter-template').content.cloneNode(true);
    const article = fragment.querySelector('.letter');
    const envelope = fragment.querySelector('.envelope');
    const favorite = fragment.querySelector('.favorite-star');
    const time = fragment.querySelector('time');
    article.dataset.date = record.date;
    article.style.animationDelay = `${Math.min(index * 45, 180)}ms`;
    fragment.querySelector('.letter-paper__summary').textContent = shortTitle(record, 32);
    fragment.querySelector('.letter-paper__recipient').textContent = `致 · ${typeof record.recipient === 'string' && record.recipient.trim() ? record.recipient : '那天的自己'}`;
    envelope.setAttribute('aria-label', `拆开 ${record.date} 的信：${shortTitle(record)}`);
    envelope.onclick = () => openEnvelope(record.date, envelope);
    setFavorite(favorite, record);
    favorite.onclick = () => toggleFavorite(record.date, true);
    time.dateTime = record.date;
    time.textContent = record.date.replace(/-/g, '. ');
    return fragment;
  }

  function animateList() {
    if (reducedMotion.matches || !list.animate) return;
    if (listAnimation) listAnimation.cancel();
    // Opacity only: never stretch the list or animate the page height.
    listAnimation = list.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
  }

  function render(animate = false) {
    const query = $('#letter-search').value.trim().toLocaleLowerCase();
    const visible = state.letters.filter(record => (state.filter === 'all' || record.favorite) && [record.date, ...record.messages.map(message => message && message.text || '')].join(' ').toLocaleLowerCase().includes(query));
    $('#all-count').textContent = String(state.letters.length).padStart(2, '0');
    $('#favorite-count').textContent = String(state.letters.filter(record => record.favorite).length).padStart(2, '0');
    $('#collection-label').textContent = query ? '寻找信件中的那句话' : state.filter === 'favorite' ? '那些被你点亮的星光' : '来自那些值得记住的日子';
    $('#results-status').textContent = `找到 ${visible.length} 封信件。`;
    list.replaceChildren();
    if (!visible.length) list.append(emptyState(query));
    else visible.forEach((record, index) => list.append(createEnvelope(record, index)));
    if (animate) animateList();
    updateUnderline();
  }

  function findEnvelope(date) {
    return [...list.querySelectorAll('.letter')].find(item => item.dataset.date === date);
  }

  function toggleFavorite(date, pop = false) {
    if (!mutate(() => store.favorite(date))) return;
    if (reader.open) updateReaderFavorite();
    const current = findEnvelope(date);
    if (current && pop) {
      const button = current.querySelector('.favorite-star');
      button.classList.add('is-popping');
      button.focus({ preventScroll: true });
    } else if (!reader.open && pop) {
      $('.mail-tab[aria-selected="true"]').focus({ preventScroll: true });
    }
  }

  function fillReader(date) {
    const record = state.letters.find(item => item.date === date);
    if (!record) return false;
    state.selected = date;
    $('#reader-date').textContent = record.date.replace(/-/g, '. ');
    $('#reader-date').dateTime = record.date;
    $('#reader-title').textContent = shortTitle(record, 60);
    $('.reader-recipient').textContent = `致 · ${typeof record.recipient === 'string' && record.recipient.trim() ? record.recipient : '那天的自己'}`;
    $('#reader-messages').replaceChildren();
    for (const message of record.messages) {
      if (!message) continue;
      const block = document.createElement('section');
      block.className = 'reader-message';
      const heading = document.createElement('h3');
      heading.textContent = message.role === 'user' ? '那天的你' : '小王子的回信';
      const content = document.createElement('p');
      content.textContent = String(message.text || '');
      block.append(heading, content);
      $('#reader-messages').append(block);
    }
    updateReaderFavorite();
    readerSheet.scrollTop = 0;
    return true;
  }

  function updateReaderFavorite() {
    const record = state.letters.find(item => item.date === state.selected);
    if (!record) return;
    const button = $('#reader-favorite');
    button.setAttribute('aria-pressed', String(!!record.favorite));
    button.firstElementChild.textContent = record.favorite ? '★' : '☆';
    button.lastChild.textContent = record.favorite ? ' 已珍藏星光' : ' 珍藏星光';
  }

  async function openEnvelope(date, envelope) {
    if (state.opening || reader.open || !state.letters.some(item => item.date === date)) return;
    state.opening = true;
    state.opener = { date, element: envelope };
    envelope.classList.add('is-opening');
    try {
      if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 430));
      if (!fillReader(date)) return;
      reader.showModal();
      document.body.style.overflow = 'hidden';
      if (!reducedMotion.matches && readerSheet.animate) {
        // Reading sheets fade in at their final size and position.
        const motion = readerSheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.22,.61,.36,1)' });
        await motion.finished.catch(() => {});
      }
      if (reader.open) $('.reader-close').focus({ preventScroll: true });
    } finally {
      envelope.classList.remove('is-opening');
      state.opening = false;
    }
  }

  function closeReader() {
    reader.close();
  }

  reader.addEventListener('close', () => {
    document.body.style.overflow = '';
    const card = state.opener && findEnvelope(state.opener.date);
    const target = card ? card.querySelector('.envelope') : $('.mail-tab[aria-selected="true"]');
    target.focus({ preventScroll: true });
  });
  reader.addEventListener('click', event => {
    if (event.target !== reader) return;
    const rect = reader.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeReader();
  });
  $('.reader-close').onclick = closeReader;
  $('#reader-favorite').onclick = () => toggleFavorite(state.selected);
  $('#reader-remove').onclick = () => {
    if (!window.confirm('要把这一天的信件移出信箱吗？移出后可在本页撤销。')) return;
    const done = mutate(() => {
      const result = store.remove(state.selected);
      state.removed = result.removed;
      return result.items;
    });
    if (done) {
      closeReader();
      $('#undo-toast').hidden = !state.removed;
    }
  };
  $('#undo-remove').onclick = () => {
    if (state.removed && mutate(() => store.restore(state.removed))) {
      state.removed = null;
      $('#undo-toast').hidden = true;
    }
  };

  function selectTab(tab) {
    state.filter = tab.dataset.filter;
    for (const item of document.querySelectorAll('.mail-tab')) {
      item.setAttribute('aria-selected', String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', tab.id);
    render(true);
  }
  $('.mail-tabs').addEventListener('click', event => {
    const tab = event.target.closest('.mail-tab');
    if (tab) selectTab(tab);
  });
  $('.mail-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll('.mail-tab')];
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(document.activeElement) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[index]);
    tabs[index].focus();
  });
  $('#letter-search').addEventListener('input', () => render());
  window.addEventListener('resize', updateUnderline);
  if (document.fonts) document.fonts.ready.then(updateUnderline);

  function setComposeStatus(message, tone = '') {
    $('#compose-status').textContent = message;
    $('#compose-status').dataset.tone = tone;
  }

  function chatCandidates() {
    return chatCandidatesFor(location, new URLSearchParams(location.search).get('api'), window.LITTLE_PRINCE_API_BASE);
  }

  async function requestReply(content) {
    const messages = [...state.letters].reverse().flatMap(record => record.messages.filter(message => message && ['user', 'prince', 'assistant'].includes(message.role)).map(message => ({ role: message.role === 'user' ? 'user' : 'assistant', content: String(message.text || '') }))).slice(-9);
    messages.push({ role: 'user', content });
    let lastError;
    for (const base of chatCandidates()) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        // No anonymous memory token is sent to chat, and no cloud-history writes are added.
        const response = await fetch(`${base}/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }), signal: controller.signal
        });
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          error.status = response.status;
          throw error;
        }
        const result = await response.json();
        // server.js returns content; deployed Vercel/Railway return assistant.content.
        const reply = result && (result.assistant && result.assistant.content || result.content);
        if (typeof reply !== 'string' || !reply.trim()) throw new Error('Invalid reply');
        const timestamp = result.assistant && result.assistant.createdAt;
        return { reply: reply.trim(), createdAt: dayKey(timestamp) ? timestamp : new Date().toISOString() };
      } catch (error) {
        lastError = error;
        // Missing routes (including local static-server 501) can select another service.
        // Never retry an ambiguous timed-out POST or an authentication/upstream failure.
        if (!canTryNextChatService(error, base, location)) throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError || new Error('Chat service unavailable');
  }

  function finishReceipt() {
    try {
      state.letters = store.append(state.pendingReceipt);
      state.pendingReceipt = null;
      state.filter = 'all';
      $('#letter-search').value = '';
      selectTab($('#all-tab'));
      $('#letter-body').value = '';
      $('#letter-length').textContent = '0 / 4000';
      $('#save-receipt').hidden = true;
      $('#send-letter').disabled = false;
      setComposeStatus('你的信，已经被星星收下了。来信与回信已保存在此浏览器。');
      $('#compose').classList.remove('is-sent');
      requestAnimationFrame(() => $('#compose').classList.add('is-sent'));
      return true;
    } catch (error) {
      // Do not re-send an already accepted letter if local storage failed.
      $('#save-receipt').hidden = false;
      $('#send-letter').disabled = true;
      setComposeStatus('小王子已回信，但暂时无法保存到浏览器。请勿刷新，释放存储空间后点击重试保存；不需要再次寄出。', 'error');
      return false;
    }
  }

  $('#letter-body').addEventListener('input', event => {
    $('#letter-length').textContent = `${event.target.value.length} / 4000`;
    event.target.removeAttribute('aria-invalid');
  });
  $('#letter-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (state.sending || state.pendingReceipt) return;
    const field = $('#letter-body');
    const error = validateLetter(field.value);
    if (error) {
      field.setAttribute('aria-invalid', 'true');
      setComposeStatus(error, 'error');
      field.focus();
      return;
    }
    try {
      state.letters = store.load();
      // Validate both records before sending; never replace corrupt stored history.
      readArray(store.storage, HISTORY_KEY);
    } catch (error) {
      setComposeStatus('暂时无法读取本地信件，请先检查浏览器存储。你的草稿仍在。', 'error');
      return;
    }
    const content = field.value.trim();
    state.sending = true;
    field.readOnly = true;
    $('#letter-form').setAttribute('aria-busy', 'true');
    $('#send-letter').disabled = true;
    $('#send-letter').classList.add('is-sending');
    $('#send-letter').firstElementChild.textContent = '正在寄出…';
    setComposeStatus('信正在飞往 B612，小王子正在等候。');
    try {
      const result = await requestReply(content);
      state.pendingReceipt = { id: crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}-${Math.random().toString(16).slice(2)}`, user: content, reply: result.reply, createdAt: result.createdAt };
      finishReceipt();
    } catch (error) {
      setComposeStatus(error.name === 'AbortError' ? '等待回信超时，暂时无法确认投递结果。草稿仍在，请稍后再试。' : '这次没有收到有效回信，未新增信件。草稿仍在，请稍后再试。', 'error');
    } finally {
      state.sending = false;
      field.readOnly = false;
      $('#letter-form').removeAttribute('aria-busy');
      $('#send-letter').disabled = !!state.pendingReceipt;
      $('#send-letter').classList.remove('is-sending');
      $('#send-letter').firstElementChild.textContent = '寄往 B612';
    }
  });
  $('#save-receipt').onclick = finishReceipt;
  $('#letter-body').addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      $('#letter-form').requestSubmit();
    }
  });
  window.addEventListener('beforeunload', event => {
    if (state.sending || state.pendingReceipt) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  window.addEventListener('storage', event => {
    if (![null, DIARY_KEY, HISTORY_KEY].includes(event.key)) return;
    reloadLetters();
    state.removed = null;
    $('#undo-toast').hidden = true;
    if (reader.open) {
      if (!state.letters.some(item => item.date === state.selected)) closeReader();
      else fillReader(state.selected);
    }
    render();
  });
  reloadLetters();
  render();

  // Reveal each section once, without translation or changes to layout height.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const targets = [...document.querySelectorAll('#letters-panel, #compose, .illustration, .original-footer')];
    const reveal = element => {
      element.classList.remove('scroll-fade-pending');
      element.classList.add('scroll-fade-visible');
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px 24px 0px' });
    targets.forEach(element => {
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.classList.add('scroll-fade-pending');
      observer.observe(element);
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) { targets.forEach(reveal); observer.disconnect(); }
    });
    document.addEventListener('focusin', event => {
      const element = event.target.closest?.('.scroll-fade-pending');
      if (element) { reveal(element); observer.unobserve(element); }
    });
  }
})();
