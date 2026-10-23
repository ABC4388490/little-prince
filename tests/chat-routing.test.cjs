const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../index-main.js'), 'utf8');
const fn = source.slice(source.indexOf('        async function fetchChatWithFallback('), source.indexOf('        function formatTime('));
const production = 'https://little-prince-message-api-production-a183.up.railway.app/api';
function fixture(overrides = {}) {
  const calls = [], timers = [];
  const context = vm.createContext({
    queryApiBase: '', envApiBase: '', location: { hostname: 'little-prince.xyz' },
    CHAT_API_CANDIDATES: ['/api', production], normalizeApiBase: base => base.replace(/\/+$/, ''),
    AbortController, window: { setTimeout(fn, ms) { timers.push(ms); return 1; }, clearTimeout() {} },
    memoryClient: { request: async () => ({ memory: true }) },
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ assistant: { content: '你好呀' } }) }; },
    ...overrides,
  });
  vm.runInContext(fn + '\nglobalThis.request = fetchChatWithFallback;', context);
  return { context, calls, timers };
}
test('a public visitor uses the deployed service with a bounded request, without localhost', async () => {
  const f = fixture(); await f.context.request('/chat', { method: 'POST' });
  assert.equal(f.calls[0].url, production + '/chat');
  assert.ok(f.calls[0].options.signal); assert.equal(f.timers[0], 25000);
  assert.ok(f.calls.every(call => !call.url.includes('localhost') && !call.url.includes('127.0.0.1')));
});
test('production failure can fall back to the same-origin chat service', async () => {
  const calls = [];
  const f = fixture({ fetch: async url => { calls.push(url); if (calls.length === 1) throw new Error('network'); return { ok: true, json: async () => ({ assistant: { content: '恢复了' } }) }; } });
  const result = await f.context.request('/chat', { method: 'POST' });
  assert.deepEqual(calls, [production + '/chat', '/api/chat']); assert.equal(result.assistant.content, '恢复了');
});
test('an explicit developer endpoint retains priority', async () => {
  const f = fixture({ queryApiBase: 'https://preview.example/api', CHAT_API_CANDIDATES: ['https://preview.example/api', '/api', production] });
  await f.context.request('/chat', { method: 'POST' });
  assert.equal(f.calls[0].url, 'https://preview.example/api/chat');
});
test('profile authentication stays with the memory client instead of chat fallbacks', async () => {
  const f = fixture(); assert.equal((await f.context.request('/profile')).memory, true); assert.equal(f.calls.length, 0);
});
