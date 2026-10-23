const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../index-main.js'), 'utf8');
const keySource = source.slice(source.indexOf('        function isB612SendKey('),source.indexOf('        async function sendB612Message('));
const keys = vm.createContext({}); vm.runInContext(keySource+'\nglobalThis.key=isB612SendKey;',keys);
test('IME candidate confirmation never sends, including the keyCode 229 fallback',()=>{
 for(const multiline of [false,true]) {
  assert.equal(keys.key({key:'Enter',isComposing:true,ctrlKey:true},multiline),false);
  assert.equal(keys.key({key:'Enter',keyCode:229,metaKey:true},multiline),false);
 }
});
test('single-line Enter sends while the multiline entry requires Ctrl or Cmd',()=>{
 assert.equal(keys.key({key:'Enter'}),true);
 assert.equal(keys.key({key:'Enter'},true),false);
 assert.equal(keys.key({key:'Enter',ctrlKey:true},true),true);
 assert.equal(keys.key({key:'Enter',metaKey:true},true),true);
});
function senderFixture() {
 const field=()=>({value:'',setAttribute(){},removeAttribute(){},focus(){}});
 let release, reject;
 const c=vm.createContext({
  b612Btn:{disabled:false},b612ChatSend:{disabled:false},b612InlineSend:{disabled:false},b612Input:field(),b612ChatInput:field(),b612InlineInput:field(),
  document:{createElement:()=>({addEventListener(_event,handler){this.click=handler;}})},
  b612Toast:{},b612GenStatus:{},openB612ChatModal(){},randomPercent:()=>50,playTinyBell(){},playStarFlight(){},
  appendChatMessage:(role,content,_at,_class,meta)=>{if(content && !meta?.skipRecent && content !== '小王子正在看星星…') c.recent.push({role,content}); return {msg:{remove(){}},bubble:{appendChild(button){c.retryButton=button;}}};},updateLittlePrinceMemoryFromUser:()=>({}),buildMemorySummary:()=>'',getRecentChatForApi:(n)=>c.recent.slice(-n),
  PRINCE_SYSTEM_PROMPT:'test',PRINCE_API_PLACEHOLDER_REPLIES:new Set(),b612SessionContext:null,requests:0,stored:[],recent:[],pushRecentMessage(role,content){c.recent.push({role,content});},saveAISource(){},typewriterToBubble:async()=>{},
  fingerprintEchoPick:()=> 'offline',appendB612HistoryEntry(entry){c.stored.push(entry);},
  fetchChatWithFallback:()=>{c.requests++;return new Promise((resolve,rejectFn)=>{release=resolve;reject=rejectFn;});}
 });
 vm.runInContext(source.slice(source.indexOf('        async function sendB612Message('),source.indexOf("        b612Btn.addEventListener('click'"))+'\nglobalThis.send=sendB612Message;',c);
 return {c,release:()=>release({assistant:{content:'模拟回复'}}),fail:()=>reject(new Error('模拟断网'))};
}
test('an in-flight request blocks a second submission and preserves a new unsent draft',async()=>{
 const f=senderFixture();const first=f.c.send('第一条');
 assert.equal(f.c.requests,1);f.c.b612InlineInput.value='还在写的第二条';
 await f.c.send('还在写的第二条');assert.equal(f.c.requests,1);assert.equal(f.c.b612InlineInput.value,'还在写的第二条');
 f.release();await first;assert.equal(f.c.b612ChatSend.disabled,false);assert.equal(f.c.stored.length,1);
 const next=f.c.send('下一条');f.release();await next;assert.equal(f.c.requests,2);
});
test('an empty message never creates a request',async()=>{const f=senderFixture();await f.c.send('');assert.equal(f.c.requests,0);});

test('a failed request releases the lock without storing a fabricated reply',async()=>{
 const f=senderFixture();const pending=f.c.send('第一条');f.fail();await pending;
 assert.equal(f.c.b612ChatSend.disabled,false);assert.equal(f.c.b612Btn.disabled,false);
 assert.match(f.c.b612Toast.textContent,/连接失败/);assert.equal(f.c.stored.length,0);
 const retry=f.c.send('下一条');f.release();await retry;assert.equal(f.c.requests,2);
});

test('retry resends the same turn without duplicating the user or polluting context',async()=>{
 const f=senderFixture();const pending=f.c.send('最近过得好吗');f.fail();await pending;
 assert.equal(f.c.recent.length,1);assert.equal(f.c.recent[0].role,'user');
 f.c.retryButton.click();assert.equal(f.c.requests,2);assert.equal(f.c.recent.length,1);
 f.release();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.c.stored.length,1);assert.equal(f.c.recent.length,2);
});
test('an obsolete retry cannot answer a newer turn',async()=>{
 const f=senderFixture();const pending=f.c.send('旧消息');f.fail();await pending;
 const retry=f.c.retryButton;const next=f.c.send('新话题');f.release();await next;
 retry.click();assert.equal(f.c.requests,2);assert.equal(retry.disabled,true);
});
test('an old service fallback is treated as a failure and never saved as AI output',async()=>{
 const f=senderFixture();f.c.PRINCE_API_PLACEHOLDER_REPLIES.add('模拟回复');
 const pending=f.c.send('你好');f.release();await pending;
 assert.equal(f.c.stored.length,0);assert.match(f.c.b612Toast.textContent,/连接失败/);
});
