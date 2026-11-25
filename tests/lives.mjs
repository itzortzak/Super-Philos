import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('index.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js);
new vm.Script(js);
assert.match(html, /const MAX_LIVES=7;/);
assert.match(html, /id="endMenuBtn"/);
assert.match(html, /\$\('againBtn'\)\.onclick=reset;/);
const excerpt=(start,end)=>{
 const a=js.indexOf(start),b=js.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Expected '+start+' and '+end);
 return js.slice(a,b);
};
const damage=excerpt('function loseLife(reason,x,cause){','function saveCampaign(){');
const results=excerpt('function endRun(isDefeat,reason=', 'function showMenu(){');
const reset=excerpt('function reset(){','function resumeCampaign(){');
const restore=excerpt('function resumeCampaign(){','function updateHud(){');
const localStore=new Map();
const elMap=new Map();
function node(){
 return {textContent:'',hidden:false,style:{},children:[],
  appendChild(child){this.children.push(child);this.lastChild=child;},
  replaceChildren(){this.children=[];this.lastChild=null;}};
}
const $=id=>{if(!elMap.has(id))elMap.set(id,node());return elMap.get(id);};
const document={createElement:()=>node()};
const localStorage={
 getItem:k=>localStore.has(k)?localStore.get(k):null,
 setItem:(k,v)=>localStore.set(k,String(v)),
 removeItem:k=>localStore.delete(k)
};
const MAX_LIVES=7,GROUND=354,SAVE_KEY='test_save',SEGMENT_SIZE=8;
let saves=0,updates=0;
const state={
 mode:'running',cfg:{count:-1},questions:[{x:{_id:0}},{x:{_id:1}}],
 qid:1,history:[{index:1,question:'δοκιμή',response:'Α',correct:'Α',ok:true}],
 right:1,score:120,lives:7,enemyHits:0,falls:0,playMs:65000,quizMs:12000,
 hero:{x:300,y:GROUND-46,w:34,h:46,vx:0,vy:0,onGround:true},keys:{},invul:0
};
const setMode=m=>{state.mode=m;};
const updateHud=()=>{updates++;$('hLives').textContent='♥ '+state.lives+'/'+MAX_LIVES;};
const nearestSafeBefore=x=>Math.max(65,x-95);
const saveCampaign=()=>{saves++;};
const fmt=ms=>{const x=Math.floor(ms/1000);return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0');};
const f=new Function('state','$','setMode','document','localStorage','SAVE_KEY','MAX_LIVES','GROUND','updateHud','saveCampaign','fmt','nearestSafeBefore',damage+'\n'+results+'\nreturn {loseLife,gameOver,finish};');
const {loseLife,finish}=f(state,$,setMode,document,localStorage,SAVE_KEY,MAX_LIVES,GROUND,updateHud,saveCampaign,fmt,nearestSafeBefore);
for(let i=0;i<6;i++)loseLife('Σύγκρουση με εχθρό',300,'enemy');
assert.equal(state.lives,1);assert.equal(state.enemyHits,6);assert.equal(state.mode,'running');
assert.equal(state.falls,0);assert.equal(state.qid,1);
localStorage.setItem(SAVE_KEY,'old progress');
loseLife('Πτώση σε χάσμα',420,'fall');
assert.equal(state.lives,0);assert.equal(state.enemyHits,6);assert.equal(state.falls,1);
assert.equal(state.mode,'end');assert.equal($('endTitle').textContent,'Τέλος παιχνιδιού');
assert.equal($('resGates').textContent,'1/2');
assert.equal($('resLives').textContent,'0/7');
assert.equal($('resEnemyHits').textContent,6);assert.equal($('resFalls').textContent,1);
assert.equal($('resCorrect').textContent,'1/1');assert.equal($('resPlay').textContent,'01:05');
assert.equal(localStorage.getItem(SAVE_KEY),null,'game over must clear resumable campaign');
loseLife('Πτώση σε χάσμα',400,'fall');
assert.equal(state.falls,1);assert.equal(state.lives,0,'no losses can occur after game over');
// The real reset() must restore seven lives, counters and all other session statistics.
const resetFn=new Function('state','MAX_LIVES','getCfg','buildQuiz','ensureFreshOpening','getPool','getSegment','updateHud','$','setMode','saveCampaign','localStorage','SAVE_KEY','SCENES','rarityLabel',reset+'\nreturn reset;')(
 state,MAX_LIVES,()=>({count:2,tier:1}),
 ()=>[{x:{_id:0}},{x:{_id:1}}],()=>{},()=>[1,2],()=>{},updateHud,$,setMode,saveCampaign,localStorage,SAVE_KEY,[{},{}],()=> 'βασικό'
);
resetFn();
assert.equal(state.lives,7);assert.equal(state.enemyHits,0);assert.equal(state.falls,0);
assert.equal(state.qid,0);assert.equal(state.right,0);assert.equal(state.score,0);assert.equal(state.history.length,0);
assert.equal(state.mode,'running');
assert.ok($('hLives').textContent.includes('0/7')||state.lives===7);
// The existing end-of-course success screen must continue working.
state.qid=2;state.history=[{index:1,question:'q',response:'a',correct:'a',ok:true}];state.right=1;
finish();
assert.equal(state.mode,'end');assert.equal($('endTitle').textContent,'Ολοκλήρωσες την περιπέτεια!');
assert.equal($('resGates').textContent,'2/2');
// Resume logic uses saved counters (and defaults to seven for older saves).
const fakeRows=[{_id:0},{_id:1}];
let saved={version:3,cfg:{count:-1},ids:[0,1],tasks:['form','form'],qid:1,right:0,score:4,history:[],playMs:4000,quizMs:2000,worldSeed:0,lives:3,enemyHits:2,falls:2};
const resumeFn=new Function('state','persisted','rows','quizFor','SEGMENT_SIZE','getSegment','updateHud','setMode','MAX_LIVES','alert',restore+'\nreturn resumeCampaign;')(
 state,()=>saved,fakeRows,(x)=>({x,task:'form'}),SEGMENT_SIZE,()=>{},updateHud,setMode,MAX_LIVES,()=>{throw Error('Unexpected alert')}
);
resumeFn();assert.equal(state.lives,3);assert.equal(state.enemyHits,2);assert.equal(state.falls,2);
delete saved.lives;delete saved.enemyHits;delete saved.falls;
resumeFn();assert.equal(state.lives,7);assert.equal(state.enemyHits,0);assert.equal(state.falls,0);
console.log('PASS: seven lives, enemy collisions, final fall, game over, results, restart, success and saved-session restoration.');
