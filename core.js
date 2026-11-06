export const STORAGE_KEY='zc-private-study-v1-'+(globalThis.__QUIZ_ACCESS_ID__||'locked');
export const typeLabels={single:'单选题',multi:'多选题',tf:'判断题',subjective:'主观题'};
export function shuffle(values,rng=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function answerKeys(q){return q.type==='tf'?[q.answer]:[...String(q.answer)].sort();}
export function grade(q,selected){const valid=q.type==='tf'?['对','错']:q.options.map(o=>o.key);const a=answerKeys(q);const b=[...new Set(selected)].sort();return b.length>0&&b.every(k=>valid.includes(k))&&a.length===b.length&&a.every((k,i)=>k===b[i]);}
export function emptyStore(){return {schema:2,questionStats:{},sessions:[],active:null,drafts:{}};}
const integer=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(1000000,Math.floor(Number(v)))):0;
const text=(v,max=10000)=>typeof v==='string'?v.slice(0,max):'';
export function sanitizeStore(raw,questions,subjective=[]){
 const out=emptyStore();if(!raw||typeof raw!=='object')return out;
 const map=new Map(questions.map(q=>[q.id,q]));
 for(const [id,s]of Object.entries(raw.questionStats||{})){if(!map.has(id)||!s||typeof s!=='object')continue;const correct=integer(s.correct),wrong=integer(s.wrong);out.questionStats[id]={attempts:correct+wrong,correct,wrong,lastAt:text(s.lastAt,40),lastCorrect:s.lastCorrect===true};}
 function cleanRun(r){if(!r||typeof r!=='object'||!Array.isArray(r.ids))return null;const ids=[...new Set(r.ids.filter(id=>map.has(id)))].slice(0,questions.length);if(!ids.length)return null;const answers={};for(const id of ids){const a=r.answers?.[id];if(!a||!Array.isArray(a.selected))continue;const q=map.get(id);const valid=q.type==='tf'?['对','错']:q.options.map(o=>o.key);const selected=[...new Set(a.selected.filter(k=>valid.includes(k)))];if(!selected.length)continue;answers[id]={selected,correct:grade(q,selected),at:text(a.at,40)};}return {id:text(r.id,80)||'restored',title:text(r.title,100)||'恢复的练习',ids,index:Math.min(integer(r.index),ids.length-1),answers,startedAt:text(r.startedAt,40),finishedAt:text(r.finishedAt,40)};}
 out.active=cleanRun(raw.active);out.sessions=(Array.isArray(raw.sessions)?raw.sessions:[]).slice(0,30).map(cleanRun).filter(Boolean);
 const subjectiveIds=new Set(subjective.map(q=>q.id));for(const [id,value]of Object.entries(raw.drafts||{})){if(subjectiveIds.has(id))out.drafts[id]=text(value);}
 return out;
}
export function newRun(ids,title,now=new Date().toISOString()){return {id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,title,ids:[...ids],index:0,answers:{},startedAt:now,finishedAt:''};}
export function recordAnswer(store,q,selected,now=new Date().toISOString()){
 const r=store.active;if(!r||!r.ids.includes(q.id)||r.answers[q.id]||!selected.length)return false;
 const valid=q.type==='tf'?['对','错']:q.options.map(o=>o.key);if(selected.some(k=>!valid.includes(k)))return false;
 const unique=[...new Set(selected)];const correct=grade(q,unique);r.answers[q.id]={selected:unique,correct,at:now};
 const old=store.questionStats[q.id]||{attempts:0,correct:0,wrong:0,lastAt:'',lastCorrect:false};
 store.questionStats[q.id]={attempts:old.attempts+1,correct:old.correct+(correct?1:0),wrong:old.wrong+(correct?0:1),lastAt:now,lastCorrect:correct};return true;
}
export function summarize(r){const total=r.ids.length;const answered=Object.keys(r.answers).length;const correct=Object.values(r.answers).filter(a=>a.correct).length;return {total,answered,correct,wrong:answered-correct,unanswered:total-answered,score:total?Math.round(correct/total*1000)/10:0};}
export function finishRun(store,now=new Date().toISOString()){if(!store.active)return null;const result=structuredClone(store.active);result.finishedAt=now;store.sessions.unshift(result);store.sessions=store.sessions.slice(0,30);store.active=null;return result;}
export function wrongRows(store,questions,filter='all'){return questions.filter(q=>{const s=store.questionStats[q.id];return s?.wrong>0&&(filter==='all'||(filter==='pending'?!s.lastCorrect:s.lastCorrect));}).map(q=>({q,stats:store.questionStats[q.id]})).sort((a,b)=>b.stats.wrong-a.stats.wrong||b.stats.lastAt.localeCompare(a.stats.lastAt)||a.q.id.localeCompare(b.q.id));}
export function overall(store){const all=Object.values(store.questionStats);const attempts=all.reduce((n,s)=>n+s.attempts,0),correct=all.reduce((n,s)=>n+s.correct,0),wrong=all.reduce((n,s)=>n+s.wrong,0);return {attempts,correct,wrong,unique:all.filter(s=>s.attempts>0).length,wrongUnique:all.filter(s=>s.wrong>0).length,accuracy:attempts?Math.round(correct/attempts*100):0};}
export function searchQuestions(all,{query='',type='all',topic='all',warnings=false}={}){const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);return all.filter(q=>{if(type!=='all'&&q.type!==type)return false;if(topic!=='all'&&q.topic!==topic)return false;if(warnings&&!q.warning)return false;const n=q.id.replace(/\D/g,'');const alias=q.type==='single'?`单选${n}`:q.type==='multi'?`多选${n}`:q.type==='tf'?`判断${n}`:q.title;const hay=[q.id,alias,q.question,q.answer,...(q.options||[]).map(o=>o.text),q.memory,q.mnemonic,q.explanation,q.warning?.text].join(' ').toLocaleLowerCase();return terms.every(term=>hay.includes(term));});}
