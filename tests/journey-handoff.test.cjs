const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../index-main.js'), 'utf8');
function fixture() {
  const ids = new Map();
  const input = () => ({ value: '', readOnly: false, disabled: false, dispatchEvent() {}, focus() {} });
  const c = vm.createContext({
    document: { getElementById(id) { if (!ids.has(id)) ids.set(id, {}); return ids.get(id); } },
    b612ChatInput: input(), b612InlineInput: input(), b612Input: input(), b612ChatSend: { disabled: false },
    journeyChapters: [{planetId:'planet-5',title:'点灯人',chatPrompt:'想聊聊忙碌与休息。'}],
    journeyModalIndex: 0, journeyModalScrollY: 240, pageScrollPositions: new Map(),
    history: { state: {}, pushState(state, _, url) { this.state = state; this.url = url; } },
    closeJourneyChapter() {}, closeB612ChatModal() {}, rememberPageScroll() {},
    routes: 0, routeFromHash() { c.routes++; }, Event: class {},
    sendB612Message() { throw Error('Topic handoff must never send automatically'); },
  });
  vm.runInContext(source.slice(source.indexOf('        let journeyChatHandoff = null;'), source.indexOf("        document.getElementById('journeyChatEntry')")) + '\nglobalThis.api={beginJourneyChat,useJourneyChatTopic,returnToJourneyStory,renderJourneyChatTopic,journeyTopicBlocked};', c);
  return { c, ids, api: c.api };
}
test('opening a story topic navigates without writing input or sending', () => {
  const f = fixture(); f.api.beginJourneyChat();
  assert.equal(f.c.history.url, '#b612-chat');
  assert.equal(f.c.b612ChatInput.value, '');
  assert.equal(f.c.routes, 1);
});
test('explicitly using a topic only fills the chat composer', () => {
  const f = fixture(); f.api.beginJourneyChat(); f.api.useJourneyChatTopic();
  assert.equal(f.c.b612ChatInput.value, '想聊聊忙碌与休息。');
  assert.equal(f.c.b612InlineInput.value, '');
  assert.equal(f.c.b612Input.value, '');
  assert.equal(f.c.routes, 1);
});
for (const field of ['b612ChatInput','b612InlineInput','b612Input']) {
  test(`${field} draft is preserved and blocks topic insertion`, () => {
    const f = fixture(); f.c[field].value = '我的未发送文字';
    f.api.beginJourneyChat(); f.api.useJourneyChatTopic();
    assert.equal(f.c[field].value, '我的未发送文字');
    assert.equal(f.ids.get('journeyChatUse').disabled, true);
    if (field !== 'b612ChatInput') assert.equal(f.c.b612ChatInput.value, '');
  });
}
test('readonly, disabled and sending states block insertion even with an empty composer', () => {
  for (const flag of ['readOnly','disabled','sending']) {
    const f = fixture(); f.api.beginJourneyChat();
    if (flag === 'sending') f.c.b612ChatSend.disabled = true; else f.c.b612ChatInput[flag] = true;
    f.api.useJourneyChatTopic(); assert.equal(f.c.b612ChatInput.value, '');
    assert.equal(f.ids.get('journeyChatUse').disabled, true);
  }
});
test('returning selects the originating planet and its prior scroll position without clearing input', () => {
  const f = fixture(); f.api.beginJourneyChat(); f.c.b612ChatInput.value = '还没有说完'; f.api.returnToJourneyStory();
  assert.equal(f.c.history.url, '#planet-5');
  assert.equal(f.c.history.state.pageScrollY, 240);
  assert.equal(f.c.b612ChatInput.value, '还没有说完');
});
