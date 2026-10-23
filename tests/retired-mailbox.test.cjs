const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

test('retired mailbox has no public page, script, or navigation entry', () => {
  for (const file of ['star-mailbox.html', 'star-mailbox.js', 'star-mailbox.css']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
  }
  for (const file of ['index.html', 'index-main.js', 'story-cards.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /star-mailbox|data-home-action=["']mailbox["']/);
  }
});

test('chat history still saves old and new messages without writing the retired diary', () => {
  const source = fs.readFileSync(path.join(root, 'index-main.js'), 'utf8');
  const fn = source.slice(source.indexOf('        function appendB612HistoryEntry('), source.indexOf('        function formatB612HistoryClock('));
  let saved;
  const previous = { id: 'existing', user: '之前的话', reply: '之前的回复' };
  const context = vm.createContext({
    loadB612History: () => [previous],
    saveB612History: rows => { saved = rows; },
    crypto: { randomUUID: () => 'new' },
    localStorage: { setItem() { throw new Error('Unexpected diary write'); } },
  });
  vm.runInContext(fn + '\nappendB612HistoryEntry({user:"今天散步了",reply:"路上有什么？",createdAt:"2026-10-24T01:00:00Z"});', context);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].id, 'new');
  assert.equal(saved[0].user, '今天散步了');
  assert.equal(saved[1], previous);
});
