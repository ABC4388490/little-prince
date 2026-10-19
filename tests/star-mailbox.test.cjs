const test = require('node:test');
const assert = require('node:assert/strict');
const { MailboxStore, validateLetter, shortTitle, chatCandidatesFor, canTryNextChatService } = require('../star-mailbox.js');

function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
}
const record = (date, text = '你好', favorite = false) => ({ date, messages: [{ role: 'user', text }], favorite });
const receipt = { id: 'receipt-1', user: '今天有点累', reply: '慢慢说，我在听。', createdAt: '2026-10-15T12:00:00Z' };

test('first visit is empty and performs no writes', () => {
  const data = storage();
  assert.deepEqual(new MailboxStore(data).load(), []);
  assert.equal(data.getItem('b612_diary'), null);
});
test('migrates history chronologically into daily records without changing history', () => {
  const raw = JSON.stringify([{ user: '后一句', reply: '后回复', createdAt: '2026-10-15T12:00:00Z' }, { user: '先一句', reply: '先回复', createdAt: '2026-10-15T10:00:00Z' }]);
  const data = storage({ b612_history: raw });
  const items = new MailboxStore(data).load();
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].messages.map(x => x.text), ['先一句', '先回复', '后一句', '后回复']);
  assert.equal(data.getItem('b612_history'), raw);
});
test('empty saved diary does not resurrect deleted historical letters', () => {
  const data = storage({ b612_diary: '[]', b612_history: JSON.stringify([{ ...receipt }]) });
  assert.deepEqual(new MailboxStore(data).load(), []);
});
test('corrupt diary is reported rather than replaced by other history', () => {
  const data = storage({ b612_diary: '{invalid', b612_history: '[]' });
  const store = new MailboxStore(data);
  assert.throws(() => store.favorite('2026-10-15'));
  assert.equal(data.getItem('b612_diary'), '{invalid');
});
test('non-array messages cannot be overwritten through normal actions', () => {
  const raw = JSON.stringify([{ date: '2026-10-15', messages: {} }]);
  const data = storage({ b612_diary: raw });
  assert.throws(() => new MailboxStore(data).remove('2026-10-15'));
  assert.equal(data.getItem('b612_diary'), raw);
});
test('favorite changes persist and retain unknown record and message metadata', () => {
  const item = { ...record('2026-10-15'), futureMetadata: 42 };
  item.messages[0].id = 'existing-message-id';
  const data = storage({ b612_diary: JSON.stringify([item]) });
  new MailboxStore(data).favorite(item.date);
  const saved = new MailboxStore(data).load()[0];
  assert.equal(saved.favorite, true);
  assert.equal(saved.futureMetadata, 42);
  assert.equal(saved.messages[0].id, 'existing-message-id');
});
test('mutations re-read storage and do not discard another tab’s new day', () => {
  const data = storage({ b612_diary: JSON.stringify([record('2026-10-14')]) });
  const firstTab = new MailboxStore(data);
  firstTab.load();
  data.setItem('b612_diary', JSON.stringify([record('2026-10-15'), record('2026-10-14')]));
  assert.equal(firstTab.favorite('2026-10-14').length, 2);
});
test('deleting the final day remains empty after a fresh store loads', () => {
  const data = storage({ b612_diary: JSON.stringify([record('2026-10-15')]) });
  new MailboxStore(data).remove('2026-10-15');
  assert.deepEqual(new MailboxStore(data).load(), []);
});
test('undo preserves newer messages that arrived for the deleted day', () => {
  const data = storage({ b612_diary: JSON.stringify([record('2026-10-15', '原来的信')]) });
  const store = new MailboxStore(data);
  const { removed } = store.remove('2026-10-15');
  data.setItem('b612_diary', JSON.stringify([record('2026-10-15', '新来的信', true)]));
  const [restored] = store.restore(removed);
  assert.deepEqual(restored.messages.map(x => x.text), ['原来的信', '新来的信']);
  assert.equal(restored.favorite, true);
});
test('received letters update both existing schemas and preserve same-day favorite', () => {
  const date = new Date(receipt.createdAt);
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const data = storage({ b612_diary: JSON.stringify([record(local, '早些时候', true)]) });
  const [saved] = new MailboxStore(data).append(receipt);
  assert.equal(saved.messages.length, 3);
  assert.equal(saved.favorite, true);
  assert.deepEqual(JSON.parse(data.getItem('b612_history'))[0], receipt);
});
test('saving the same received response twice does not duplicate messages', () => {
  const data = storage();
  const store = new MailboxStore(data);
  store.append(receipt);
  store.append(receipt);
  assert.equal(store.load()[0].messages.length, 2);
  assert.equal(JSON.parse(data.getItem('b612_history')).length, 1);
});
test('a history quota failure rolls diary back and permits saving the receipt later', () => {
  const raw = JSON.stringify([record('2026-10-14')]);
  const data = storage({ b612_diary: raw, b612_history: '[]' });
  const set = data.setItem;
  let fail = true;
  data.setItem = (key, value) => { if (key === 'b612_history' && fail) { fail = false; throw new Error('quota'); } set(key, value); };
  const store = new MailboxStore(data);
  assert.throws(() => store.append(receipt));
  assert.equal(data.getItem('b612_diary'), raw);
  assert.equal(data.getItem('b612_history'), '[]');
  assert.equal(store.append(receipt).length, 2);
});
test('corrupt history cannot be silently discarded by a new letter', () => {
  const data = storage({ b612_history: '{invalid' });
  assert.throws(() => new MailboxStore(data).append(receipt));
  assert.equal(data.getItem('b612_history'), '{invalid');
  assert.equal(data.getItem('b612_diary'), null);
});
test('history retains the pre-existing 200-entry limit', () => {
  const data = storage({ b612_diary: '[]', b612_history: JSON.stringify(Array.from({ length: 200 }, (_, i) => ({ id: `old-${i}` }))) });
  new MailboxStore(data).append(receipt);
  const history = JSON.parse(data.getItem('b612_history'));
  assert.equal(history.length, 200);
  assert.equal(history[0].id, receipt.id);
});
test('content validation rejects whitespace and excess length', () => {
  assert.ok(validateLetter(' \n '));
  assert.ok(validateLetter('a'.repeat(4001)));
  assert.equal(validateLetter('今天你好'), '');
});
test('non-BMP characters are not split in visible summaries', () => {
  assert.equal(shortTitle(record('2026-10-15', '🌹🌹🌹'), 2), '🌹🌹…');
});

const localPage = new URL('http://127.0.0.1:8766/star-mailbox.html');
const hostedPage = new URL('https://little-prince.xyz/star-mailbox.html');
test('static localhost previews include the existing production chat service', () => {
  const candidates = chatCandidatesFor(localPage, null, null);
  assert.ok(candidates.includes('https://little-prince.xyz/api'));
  assert.ok(candidates.indexOf('/api') < candidates.indexOf('https://little-prince.xyz/api'));
});
test('local static-server 501 permits fallback but a hosted 501 does not', () => {
  const error = Object.assign(new Error('HTTP 501'), { status: 501 });
  assert.equal(canTryNextChatService(error, '/api', localPage), true);
  assert.equal(canTryNextChatService(error, 'https://little-prince.xyz/api', localPage), false);
  assert.equal(canTryNextChatService(error, '/api', hostedPage), false);
});
test('explicit API configuration stays first and hosted routing stays same-origin first', () => {
  assert.equal(chatCandidatesFor(localPage, 'https://custom.example/api/', null)[0], 'https://custom.example/api');
  assert.equal(chatCandidatesFor(hostedPage, null, null)[0], '/api');
  assert.equal(chatCandidatesFor(hostedPage, null, null).filter(x => x === 'https://little-prince.xyz/api').length, 0);
});
test('timeouts, auth failures, rate limits and upstream errors cannot cause duplicate POSTs', () => {
  assert.equal(canTryNextChatService(Object.assign(new Error('timeout'), { name: 'AbortError' }), '/api', localPage), false);
  for (const status of [401, 403, 429, 500, 502, 503, 504]) {
    assert.equal(canTryNextChatService(Object.assign(new Error('error'), { status }), '/api', localPage), false);
  }
});
test('connection refusal and a missing route can try the next service, malformed replies cannot', () => {
  assert.equal(canTryNextChatService(new TypeError('Failed to fetch'), '/api', localPage), true);
  assert.equal(canTryNextChatService(Object.assign(new Error('missing'), { status: 404 }), '/api', localPage), true);
  assert.equal(canTryNextChatService(new Error('Invalid reply'), '/api', localPage), false);
});
