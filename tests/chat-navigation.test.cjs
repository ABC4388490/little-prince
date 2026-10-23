const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../index-main.js'), 'utf8');
function fixture() {
  const classes = new Set(['active']);
  const c = vm.createContext({});
  const control = () => ({getClientRects:()=>[{}], closest:()=>null, focus() { c.document.activeElement=this; }});
  const first = control(), last = control(), opener = control();
  Object.assign(c, {
    document: {activeElement: opener, getElementById:()=>null, querySelector:()=>opener},
    window: {scrollY:240}, location:{hash:'#b612-chat'},
    history: {state:{keep:'existing'}, replaceState(state, _, url) { this.state=state; c.location.hash=url; }},
    b612ChatModal:{inert:false, classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:n=>classes.delete(n)},setAttribute(){},querySelectorAll:()=>[first,last]},
    b612ChatInput:last, journeyChatHandoff:null,
    startB612Sync(){}, ensureOpeningAssistantMessage(){}, maybeOpenWithFoxContext(){}, renderJourneyChatTopic(){},
    restoreStoryFocus(node){node?.focus();},
  });
  vm.runInContext(source.slice(source.indexOf('        let b612ChatOpener = null;'),source.indexOf('        let journeyChatHandoff = null;')) +
    source.slice(source.indexOf('        function closeB612ChatModal('), source.indexOf("        b612ChatModal?.addEventListener('keydown'")) +
    '\nglobalThis.api={openB612ChatModal,closeB612ChatModal,cycleB612ChatFocus};',c);
  return {c,first,last,opener,api:c.api};
}
test('closing chat hides controls, restores its opener and leaves a closed URL',()=>{
 const f=fixture(); f.c.b612ChatModal.classList.remove('active'); f.api.openB612ChatModal(); f.api.closeB612ChatModal();
 assert.equal(f.c.b612ChatModal.inert,true); assert.equal(f.c.location.hash,'#b612');
 assert.equal(f.c.document.activeElement,f.opener); assert.equal(f.c.history.state.keep,'existing');
});
test('navigation can close chat without changing destination or stealing focus',()=>{
 const f=fixture(); f.c.location.hash='#planet-5'; f.c.document.activeElement=f.last;
 f.api.closeB612ChatModal(false,false); assert.equal(f.c.location.hash,'#planet-5');
 assert.equal(f.c.document.activeElement,f.last); f.api.closeB612ChatModal();
 assert.equal(f.c.location.hash,'#planet-5');
});
test('Tab and Shift+Tab wrap within the open chat',()=>{
 const f=fixture();let prevented=0; f.c.document.activeElement=f.last;
 f.api.cycleB612ChatFocus({key:'Tab',shiftKey:false,preventDefault(){prevented++;}});
 assert.equal(f.c.document.activeElement,f.first);
 f.api.cycleB612ChatFocus({key:'Tab',shiftKey:true,preventDefault(){prevented++;}});
 assert.equal(f.c.document.activeElement,f.last); assert.equal(prevented,2);
});
test('closed chat does not intercept Tab and repeated opens preserve the original opener',()=>{
 const f=fixture(); f.c.b612ChatModal.classList.remove('active'); f.api.openB612ChatModal();
 f.api.openB612ChatModal(); f.api.closeB612ChatModal(); assert.equal(f.c.document.activeElement,f.opener);
 f.api.cycleB612ChatFocus({key:'Tab',preventDefault(){throw Error('closed chat trapped focus');}});
});
test('a direct chat URL returns focus to navigation rather than document body',()=>{
 const f=fixture(); f.c.document.body=f.opener; f.c.document.querySelector=()=>f.first;
 f.c.b612ChatModal.classList.remove('active'); f.api.openB612ChatModal(); f.api.closeB612ChatModal();
 assert.equal(f.c.document.activeElement,f.first);
});
test('legacy reading dialogs use the same Tab boundary without an open chat',()=>{
 const f=fixture(); f.c.b612ChatModal.classList.remove('active');f.c.document.activeElement=f.last;
 const scope={classList:{contains:()=>true},querySelectorAll:()=>[f.first,f.last]};
 f.api.cycleB612ChatFocus({key:'Tab',shiftKey:false,preventDefault(){}},scope);
 assert.equal(f.c.document.activeElement,f.first);
});
test('the fox handoff keeps its answers and replaces a stale planet suggestion without sending',()=>{
 const c=vm.createContext({foxState:{quote:'关系箴言',answers:{answer1:'答案'}},pendingFoxContext:null,b612SessionContext:null,journeyChatHandoff:{planetId:'planet-5'},
 closeFoxModal(){},rememberPageScroll(){},pageScrollPositions:new Map(),history:{pushState(_state,_unused,url){this.url=url;}},routeFromHash(){},openB612ChatModal(){throw Error('must route once');}});
 vm.runInContext(source.slice(source.indexOf('        function bridgeFoxToB612()'),source.indexOf('        if (foxModal) {',source.indexOf('        function bridgeFoxToB612()'))) + '\nbridgeFoxToB612();',c);
 assert.equal(c.history.url,'#b612-chat'); assert.equal(c.pendingFoxContext.answers.answer1,'答案'); assert.equal(c.journeyChatHandoff,null);
});
