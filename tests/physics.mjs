import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('index.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js);
new vm.Script(js);
const slice=(a,b)=>{const x=js.indexOf(a),y=js.indexOf(b,x);assert.ok(x>=0&&y>x,a);return js.slice(x,y);};
// Διατηρούμε την πραγματική γεωμετρία της εφαρμογής και ελέγχουμε την επαναληπτική κατασκευή της.
const defs=slice('const UPPER_RISE=','function fmt(');
const segment=slice('function getSegment(startIndex){','function saveCampaign(){');
const physics=slice('function updateEnemies(t){','function tick(now){');
const create = new Function(`
 const GROUND=354,HEIGHT=440;
 const $=()=>({textContent:'',style:{}});
 ${defs}
 ${segment}
 let opened=false;function showQuestion(){opened=true;state.mode='question';}
 function updateHud(){}
 ${physics}
 state.cfg={difficulty:'normal'};state.questions=Array.from({length:956},(_,i)=>({id:i}));
 return {state,getSegment,advanceHero,updateEnemies,groundSolidAt,requestGate:()=>opened};
`);
const GROUND=354;
const game=create();
const {state,getSegment,advanceHero,updateEnemies,groundSolidAt}=game;
for(const difficulty of ['easy','normal','hard']){
 state.cfg.difficulty=difficulty;let gaps=0,raised=0,enemies=0;
 for(let base=0;base<956;base+=8){
  getSegment(base);gaps+=state.gaps.length;raised+=state.gates.filter(g=>g.upper).length;enemies+=state.enemies.length;
  for(const gap of state.gaps){assert.ok(gap.w>=90&&gap.w<=130);assert.ok(state.gates.every(g=>g.x<gap.x||g.x>gap.x+gap.w));}
  for(const gate of state.gates.filter(g=>g.upper))assert.ok(state.platforms.some(p=>p.role==='gate'&&p.x<gate.x&&p.x+p.w>gate.x));
 }
 assert.ok(gaps>100&&raised>50&&enemies>200,{difficulty,gaps,raised,enemies});
}
state.cfg.difficulty='normal';getSegment(0);
assert.equal(state.gates[0].upper,false);
assert.equal(state.gates[3].upper,true);
assert.ok(state.platforms.some(p=>p.role==='branch'));
assert.equal(state.gaps[0].w,114);
const bat=state.enemies.find(m=>m.kind==='bat'&&m.amplitude);
assert.ok(bat);
const heights=[],xs=[];
for(let i=0;i<150;i++){updateEnemies(i*50);heights.push(bat.y);xs.push(bat.x);}
assert.ok(Math.max(...heights)-Math.min(...heights)>200,'airborne enemy must fly high and low');
assert.ok(Math.max(...xs)-Math.min(...xs)>140,'airborne enemy must patrol widely');
// Βατή επάνω πλατφόρμα: ένα άλμα αρκεί για να ανέβει.
state.mode='running';state.qid=3;
const p=state.platforms.find(p=>p.role==='branch');
state.hero={x:p.x-70,y:GROUND-46,w:34,h:46,vx:0,vy:0,onGround:true};
state.keys={right:true};let landed=false;
for(let i=0;i<85;i++){
 state.keys.jump=i>=5&&i<=9;advanceHero(1);
 if(state.hero.onGround&&Math.abs(state.hero.y+state.hero.h-p.y)<1)landed=true;
}
assert.ok(landed,'must land on upper platform');
// Κενό χωρίς υπερυψωμένη γέφυρα: ο παίκτης πρέπει να πηδήσει.
getSegment(0);state.qid=5;state.mode='running';
const gap=state.gaps.find(g=>g.id===4);
state.hero={x:gap.x-90,y:GROUND-46,w:34,h:46,vx:0,vy:0,onGround:true};state.keys={right:true};
let cleared=false;
for(let i=0;i<85;i++){state.keys.jump=i>=6&&i<=10;advanceHero(1);if(state.hero.x>gap.x+gap.w+38){cleared=true;break;}}
assert.ok(cleared,'the 114-unit gap must be jumpable');
console.log('Physics checks: 120 stages, 3 settings, 114-unit gaps, elevated landings, flying patrols — passed.');