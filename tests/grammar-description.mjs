import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8'),js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js);const a=js.indexOf('const $=id=>'),b=js.indexOf('// Πλήρεις γραμματικές'),c=js.indexOf('const presets={',b);
const shuffle='function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}';
const {rows,label,buildQuiz,quizFor}=new Function(js.slice(0,a)+'\n'+shuffle+'\n'+js.slice(b,c)+'\nreturn {rows,label,buildQuiz,quizFor};')();
const get=q=>rows.find(x=>Object.entries(q).every(([k,v])=>x[k]===v));
const samples=[
 [{verb:'λύω',tense:'Παρατατικός',voice:'Ενεργητική',mood:'Οριστική',person:'α΄',number:'ενικός'},'α΄ πρόσωπο, ενικού αριθμού, παρατατικού, οριστικής, ενεργητικής φωνής, του ρήματος λύω.'],
 [{verb:'λύω',tense:'Παρατατικός',voice:'Ενεργητική',mood:'Οριστική',person:'γ΄',number:'πληθυντικός'},'γ΄ πρόσωπο, πληθυντικού αριθμού, παρατατικού, οριστικής, ενεργητικής φωνής, του ρήματος λύω.'],
 [{verb:'λύω',tense:'Μέλλοντας',voice:'Ενεργητική',kind:'Απαρέμφατο'},'απαρέμφατο μέλλοντα, ενεργητικής φωνής, του ρήματος λύω.'],
 [{verb:'λύω',tense:'Παρακείμενος',voice:'Ενεργητική',kind:'Μετοχή',gramCase:'Ονομαστική',gender:'Αρσενικό',number:'Πληθυντικός'},'Ονομαστική πτώση, αρσενικού γένους, πληθυντικού αριθμού, μετοχή παρακειμένου, ενεργητικής φωνής, του ρήματος λύω.']
];
for(const [query,correct] of samples){const x=get(query);assert.ok(x);assert.equal(label(x),correct);}
assert.equal(rows.length,956);
for(const x of rows){const text=label(x);assert.ok(text.endsWith('του ρήματος '+x.verb+'.'));assert.ok(!text.includes('undefined'));}
const cfg={verb:'all3',tense:'all',mood:'all',voice:'all',kind:'all',person:'all',number:'all',gender:'all',gramCase:'all',tier:3,taskMode:'both',count:-1};
const quiz=buildQuiz(cfg);assert.equal(quiz.length,956);assert.equal(new Set(quiz.map(q=>q.x._id)).size,956);
for(const q of quiz){assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.ok(q.choices.includes(q.answer));}
const ambiguous=get(samples[3][0]);assert.equal(quizFor(ambiguous,rows,{...cfg,taskMode:'analyse'}).task,'form');
const distinct=get({verb:'λύω',tense:'Αόριστος',voice:'Ενεργητική',mood:'Οριστική',person:'α΄',number:'ενικός'});
assert.equal(quizFor(distinct,rows,{...cfg,taskMode:'analyse'}).task,'analyse');
assert.ok(html.includes('analysis-options')&&html.includes('is-description'));
console.log('PASS: 956 grammatical descriptions, all four sample strings, recognition/form questions and ambiguity-safe choices.');
