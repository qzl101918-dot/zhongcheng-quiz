const BANK=globalThis.__QUIZ_BANK__;
if(!BANK)throw new Error('题库尚未解密');
import {STORAGE_KEY,typeLabels,shuffle,answerKeys,newRun,recordAnswer,summarize,finishRun,sanitizeStore,wrongRows,overall,searchQuestions} from './core.js';

const app=document.getElementById('app');
const all=[...BANK.questions,...BANK.subjective];
const byId=new Map(all.map(q=>[q.id,q]));
const topicMap=new Map(BANK.topics.map(t=>[t.id,t]));
let store;
let storageError=false;
try{store=sanitizeStore(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'),BANK.questions,BANK.subjective);}catch{store=sanitizeStore(null,BANK.questions,BANK.subjective);storageError=true;}
const ui={route:'home',mode:'all',count:50,query:'',type:'all',topic:'all',warnings:false,searchLimit:25,wrongFilter:'all',choices:{},result:null,reviewFilter:'wrong'};
const n=(tag,cls='',text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
const button=(text,fn,cls='btn')=>{const b=n('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
const paragraph=(text,cls='muted small-text')=>n('p',cls,text);
const group=(cls,...kids)=>{const e=n('div',cls);e.append(...kids.filter(Boolean));return e;};
const badge=(text,neutral=false)=>n('span',`tag${neutral?' neutral':''}`,text);
function toast(text){const e=document.getElementById('toast');e.textContent=text;e.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.hidden=true,3300);}
function showStorageStatus(){const e=document.getElementById('storage-note');e.hidden=!storageError;e.textContent='当前浏览器未能保存记录。本次仍可答题；若要保留成绩，请允许网站存储或导出学习记录。';}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store));storageError=false;}catch{storageError=true;}showStorageStatus();}
function shortId(q){const no=q.id.replace(/\D/g,'');return q.id.startsWith('SA')?`简答 ${no}`:q.id.startsWith('CA')?`案例 ${no}`:`${typeLabels[q.type]} ${no}`;}
function dateLabel(iso){const d=new Date(iso);return Number.isNaN(d.getTime())?'未记录时间':d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}
function ansText(q,keys=answerKeys(q)){if(q.type==='subjective')return q.answer;if(q.type==='tf')return keys.join('、');return keys.map(k=>{const o=q.options.find(o=>o.key===k);return o?`${k}. ${o.text}`:k;}).join('；');}
function pageTitle(title,description){const e=n('div','page-title');e.append(n('h1','',title));if(description)e.append(paragraph(description));return e;}
function statGrid(values){const g=n('div','stats-grid');values.forEach(([value,label,cls])=>{const s=n('div',`stat ${cls||''}`);s.append(n('b','',value),n('span','',label));g.append(s);});return g;}
function empty(title,text,action){const box=n('div','empty');box.append(n('b','',title),paragraph(text));if(action)box.append(action);return box;}
function modal(title,body,actions=[],onClose){
 const host=document.getElementById('modal-root');const previous=document.activeElement;host.replaceChildren();
 const backdrop=n('div','modal-backdrop'),box=n('section','modal');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');const titleId=`dialog-${Date.now()}`;box.setAttribute('aria-labelledby',titleId);const heading=n('h2','',title);heading.id=titleId;const content=n('div','modal-body');content.append(body);box.append(heading,content);
 let isClosed=false;const close=()=>{if(isClosed)return;isClosed=true;host.replaceChildren();document.removeEventListener('keydown',keyHandler);if(previous?.isConnected)previous.focus();onClose?.();};
 const buttons=n('div','modal-actions');actions.forEach(({label,fn,cls})=>buttons.append(button(label,()=>fn?.(close),cls||'btn')));if(!actions.length)buttons.append(button('知道了',close,'btn secondary'));box.append(buttons);backdrop.append(box);host.append(backdrop);
 const keyHandler=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focusables=[...box.querySelectorAll('button,input,textarea,select,a[href]')].filter(x=>!x.disabled);const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',keyHandler);box.querySelector('button,input,textarea,select')?.focus();return close;
}
function confirmModal(title,text,yesLabel='确认'){return new Promise(resolve=>{let decision=false;modal(title,paragraph(text),[{label:'取消',cls:'btn secondary',fn:c=>c()},{label:yesLabel,fn:c=>{decision=true;c();}}],()=>resolve(decision));});}
function go(route,scroll=true){ui.route=route;render();if(scroll)window.scrollTo({top:0,behavior:'instant'});}
function render(){
 app.replaceChildren();document.querySelectorAll('[data-route]').forEach(b=>{const active=b.dataset.route===ui.route||(b.dataset.route==='home'&&['round','result','subjective','knowledge'].includes(ui.route));b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 if(ui.route==='round'&&!store.active)ui.route='home';
 ({home:renderHome,round:renderRound,search:renderSearch,wrong:renderWrong,history:renderHistory,result:renderResult,subjective:renderSubjective,knowledge:renderKnowledge}[ui.route]||renderHome)();
}
function showBankInfo(){const body=n('div');body.append(paragraph('收录单选150题、多选200题、判断150题，以及简答8题、案例3题。判断题标题原标149题，按正文实际150题全部收录。'),paragraph(BANK.contentNote),paragraph('新增的记忆说明与原题库已有解析分别显示。标有“待核对”的题目包含具体的答案或表述提醒，尚未对整套题库作全面法规审定。'),paragraph('网站需输入专属访问码后才能解密题库。学习记录保存在答题者使用的浏览器中；不同设备的记录彼此独立，可通过导出、导入备份迁移。'));modal('题库与记录说明',body);}

function renderHome(){
 const total=overall(store);const hero=n('section','panel hero');const text=n('div');text.append(n('span','eyebrow','项目内部管理岗 · 晋升练习'),n('h1','','每天练一轮，重点记住易错题'),paragraph('500 道客观题随机交叉练习，作答后看解释；11 道简答与案例题可对照参考要点自查。'));
 const count=n('div','hero-badge');count.append(n('b','','500'),n('span','','道客观题'));hero.append(group('hero-top',text,count));app.append(hero);
 app.append(statGrid([[total.attempts,'累计作答'],[total.correct,'累计答对','good'],[total.wrong,'累计答错','error'],[total.wrongUnique,'历史错题数']]));
 if(store.active){const s=summarize(store.active);const copy=n('div');copy.append(n('h3','','继续上次练习'),paragraph(`${store.active.title} · 已答 ${s.answered}/${s.total} 题`));app.append(group('resume-card',copy,button('继续答题 →',()=>go('round'))));}
 app.append(group('section-row',n('h2','','开始一轮练习'),button('题库说明',showBankInfo,'text-link')));
 const panel=n('section','panel practice-config');const grid=n('div','config-grid');const typeBox=n('div');typeBox.append(n('label','','选择题型'));const modes=n('div','chips');[['all','混合'],['single','单选'],['multi','多选'],['tf','判断']].forEach(([value,label])=>modes.append(button(label,()=>{ui.mode=value;renderHomeRefresh();},`chip${ui.mode===value?' active':''}`)));typeBox.append(modes);
 const countBox=n('div');countBox.append(n('label','','本轮题量'));const counts=n('div','chips');[20,50,100,'all'].forEach(c=>counts.append(button(c==='all'?'全部':`${c}题`,()=>{ui.count=c;renderHomeRefresh();},`chip${ui.count===c?' active':''}`)));countBox.append(counts);grid.append(typeBox,countBox);panel.append(grid,button('开始随机练习 →',()=>startConfigured(),'btn wide'));panel.append(paragraph('每轮重新打乱题序。多选题须全部选对；每题权重相同，得分换算为100分。','note'));app.append(panel);
 const warningCount=all.filter(q=>q.warning).length;
 app.append(group('section-row',n('h2','','有针对性地记忆')));const shortcuts=n('div','shortcuts');[
 ['记忆卡片',`${BANK.topics.length} 个主题，先理解再背题`,()=>go('knowledge')],
 ['简答与案例','写下自己的要点，再展开参考答案',()=>go('subjective')],
 ['待核对题',`${warningCount} 题有答案或表述提醒`,()=>{ui.warnings=true;ui.query='';ui.type='all';ui.topic='all';go('search');}]
 ].forEach(([title,desc,fn])=>{const b=button('',fn,'shortcut');b.append(n('b','',title),n('span','',desc));shortcuts.append(b);});app.append(shortcuts);
 const footer=n('div','footer-info');footer.append(document.createTextNode('答案依原题库判分；记忆说明据题库整理。每位答题者的记录独立保存在自己的浏览器中。'));app.append(footer);
}
function renderHomeRefresh(){app.replaceChildren();renderHome();}
async function begin(pool,title,count='all'){
 if(!pool.length){toast('当前没有可练习的题目');return;}
 if(store.active&&!await confirmModal('开始新一轮练习？','上次尚未交卷的练习会被替换，已提交的累计答题记录和错题次数会保留。','开始新一轮'))return;
 const ids=shuffle(pool.map(q=>q.id));const selected=count==='all'?ids:ids.slice(0,Number(count));store.active=newRun(selected,title);ui.choices={};save();go('round');
}
function startConfigured(){const pool=ui.mode==='all'?BANK.questions:BANK.questions.filter(q=>q.type===ui.mode);const label=ui.mode==='all'?'混合练习':typeLabels[ui.mode];const count=ui.count==='all'?pool.length:Math.min(Number(ui.count),pool.length);begin(pool,`${label} · ${count}题`,ui.count);}
function questionMeta(q){const e=n('div','q-meta');e.append(badge(q.type==='subjective'?q.section:typeLabels[q.type]),badge(topicMap.get(q.topic)?.title||'综合',true),n('span','qid',q.id));return e;}
function warningBox(q){if(!q.warning)return null;const box=n('aside','notice');box.append(n('strong','',q.warning.title),paragraph(q.warning.text,''));if(q.warning.url){const a=n('a','','查看核对资料 ↗');a.href=q.warning.url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}return box;}
function memoryBlocks(q){const wrap=n('div');if(q.explanation){const original=n('section','explain-block');original.append(n('div','explain-label','题库原解析'),paragraph(q.explanation,'explain-copy'));wrap.append(original);}const memory=n('section','explain-block');memory.append(n('div','explain-label','通俗说明 · 据题库整理'),paragraph(q.memory,'explain-copy'));wrap.append(memory,group('mnemonic',n('b','','这样记'),n('span','',q.mnemonic)));const warning=warningBox(q);if(warning){warning.style.marginTop='14px';wrap.append(warning);}return wrap;}
function renderRound(){
 const r=store.active,q=byId.get(r.ids[r.index]),answer=r.answers[q.id],sum=summarize(r);const draft=ui.choices[q.id]||[];
 app.append(group('round-toolbar',button('← 练习首页',()=>go('home'),'text-link'),group('inline-actions',button('答题卡',answerCard,'btn secondary small'),button('交卷',finishCurrent,'btn secondary small'))));
 const panel=n('section','panel round-panel');panel.append(group('round-progress',group('',n('b','',r.index+1),n('span','muted',` / ${r.ids.length}`)),n('span','round-info',`已答 ${sum.answered} · 对 ${sum.correct} · 错 ${sum.wrong}`)));const p=n('progress');p.max=r.ids.length;p.value=sum.answered;p.setAttribute('aria-label','本轮已答题数');panel.append(p,questionMeta(q));
 if(q.warning&&!answer)panel.append(paragraph('此题有答案核对提示，作答后可查看。','warning-badge'));
 panel.append(n('h1','question',q.question));if(q.type==='multi')panel.append(paragraph('多选题：选完后点击“确认答案”，少选、多选均不计为答对。','help'));
 const options=n('div',`options${q.type==='multi'?' multi':''}`);const correct=answerKeys(q);const choices=q.type==='tf'?[{key:'对',text:'对'},{key:'错',text:'错'}]:q.options;
 choices.forEach(o=>{const selected=answer?answer.selected.includes(o.key):draft.includes(o.key);const b=button('',()=>{if(answer)return;if(q.type==='multi'){ui.choices[q.id]=selected?draft.filter(k=>k!==o.key):[...draft,o.key];renderRoundRefresh();const focus=app.querySelector(`[data-option="${o.key}"]`);focus?.focus({preventScroll:true});}else submit(q,[o.key]);},'option');b.dataset.option=o.key;b.setAttribute('aria-pressed',String(selected));if(selected)b.classList.add('selected');if(answer&&correct.includes(o.key))b.classList.add('right');if(answer&&selected&&!correct.includes(o.key))b.classList.add('wrong');b.disabled=Boolean(answer);b.append(n('span','option-letter',q.type==='tf'?(o.key==='对'?'✓':'×'):o.key),n('span','option-copy',o.text));if(answer&&correct.includes(o.key))b.append(n('span','option-status','正确选项'));else if(answer&&selected)b.append(n('span','option-status','你的选择'));options.append(b);});panel.append(options);
 if(!answer&&q.type==='multi'){const confirm=button('确认答案',()=>submit(q,ui.choices[q.id]||[]));confirm.disabled=!draft.length;panel.append(group('submit-row',confirm));}
 if(answer){const feedback=n('section',`feedback${answer.correct?'':' error'}`);feedback.setAttribute('aria-live','polite');feedback.append(n('div','feedback-title',answer.correct?'✓ 回答正确':'× 回答错误'),paragraph(`题库答案：${ansText(q)}`,'answer-text'),memoryBlocks(q));panel.append(feedback);}
 const previous=button('上一题',()=>goIndex(r.index-1),'btn secondary');previous.disabled=r.index===0;
 const next=button(r.index===r.ids.length-1?'交卷看成绩':answer?'下一题 →':'跳过并下一题 →',()=>r.index===r.ids.length-1?finishCurrent():goIndex(r.index+1));panel.append(group('question-actions',previous,next));app.append(panel);app.append(paragraph('已提交的答案不重复计次。未作答直接跳过，不增加累计错误次数；交卷时会单列未答题。','note'));
}
function renderRoundRefresh(){app.replaceChildren();renderRound();}
function submit(q,selected){if(recordAnswer(store,q,selected)){save();renderRoundRefresh();app.querySelector('.feedback')?.scrollIntoView({behavior:'smooth',block:'nearest'});}}
function goIndex(index){const r=store.active;if(!r||index<0||index>=r.ids.length)return;r.index=index;save();go('round');}
function answerCard(){const r=store.active;const body=n('div');body.append(paragraph('绿色＝答对，红色＝答错，灰色＝未答。点击题号可跳转。','legend'));const grid=n('div','answer-grid');let close=()=>{};r.ids.forEach((id,i)=>{const a=r.answers[id];const cls=`answer-cell${a?(a.correct?' correct':' error'):''}${i===r.index?' current':''}`;const b=button(i+1,()=>{close();goIndex(i);},cls);b.setAttribute('aria-label',`第${i+1}题，${a?(a.correct?'答对':'答错'):'未答'}`);grid.append(b);});body.append(grid);close=modal('本轮答题卡',body);}
async function finishCurrent(){const r=store.active;if(!r)return;const s=summarize(r);if(s.unanswered&&!await confirmModal('还有未作答的题目',`已答${s.answered}题，未答${s.unanswered}题。现在交卷将按全部${s.total}题计算得分，并单独显示未答数。`,'确认交卷'))return;ui.result=finishRun(store);ui.reviewFilter='wrong';save();go('result');}

function renderResult(){
 const r=ui.result;if(!r){go('history');return;}const s=summarize(r);app.append(group('toolbar',button('← 学习记录',()=>go('history'),'text-link'),n('span','muted small-text',dateLabel(r.finishedAt))));const hero=n('section','panel score-hero');hero.append(n('h1','',r.title),group('score-number',document.createTextNode(String(s.score)),n('small','','分')),paragraph('本轮百分制得分 = 答对题数 ÷ 本轮总题数 × 100','score-caption'));
 const stats=n('div','result-subgrid');[[s.correct,'答对','good'],[s.wrong,'答错','error'],[s.unanswered,'未答','']].forEach(([value,label,cls])=>{const st=n('div',`stat ${cls}`);st.append(n('b','',value),n('span','',label));stats.append(st);});hero.append(stats,group('center inline-actions',button('再刷这一组',()=>begin(r.ids.map(id=>byId.get(id)),r.title)),button('练习错题',()=>{const qs=r.ids.filter(id=>r.answers[id]&&!r.answers[id].correct).map(id=>byId.get(id));begin(qs,`本轮错题 · ${qs.length}题`);},'btn secondary')));app.append(hero);
 app.append(group('section-row',n('h2','','本轮题目回顾')));const tabs=n('div','chips');[['wrong','答错与未答'],['all','全部题目']].forEach(([value,label])=>tabs.append(button(label,()=>{ui.reviewFilter=value;go('result',false);},`chip${ui.reviewFilter===value?' active':''}`)));app.append(tabs);
 const list=n('section','result-review');const ids=r.ids.filter(id=>ui.reviewFilter==='all'||!r.answers[id]?.correct);if(!ids.length)list.append(empty('这一轮全部答对','可以再刷一轮，或换一个题型巩固记忆。'));ids.forEach(id=>{const q=byId.get(id),a=r.answers[id];const card=questionCard(q);const summary=card.querySelector('summary');summary.prepend(n('div',`review-status${a?.correct?' good':''}`,a?(a.correct?'答对':`答错 · 你的答案：${a.selected.join('、')}`):'未作答'));list.append(card);});app.append(list);
}
function questionDetail(q,practice=true){
 const detail=n('div','result-detail');if(q.type==='subjective'){detail.append(n('div','explain-label','原题库参考答案'),paragraph(q.answer,'explain-copy'));}else{if(q.type!=='tf'){const options=n('ul','option-list');q.options.forEach(o=>{const right=answerKeys(q).includes(o.key);options.append(n('li',right?'correct-option':'',`${o.key}. ${o.text}${right?' ✓':''}`));});detail.append(options);}detail.append(paragraph(`题库答案：${ansText(q)}`,'answer-text'));}detail.append(memoryBlocks(q));if(practice&&q.type!=='subjective')detail.append(group('detail-actions',button('单独练这题',()=>begin([q],`${shortId(q)} · 单题练习`),'btn small'),button('分享此题',()=>shareQuestion(q),'btn secondary small')));return detail;
}
function questionCard(q){const details=n('details','result-card');const summary=n('summary');summary.append(questionMeta(q),paragraph(q.question,'result-title'));if(q.warning)summary.append(n('span','warning-badge','待核对'));details.append(summary);details.addEventListener('toggle',()=>{if(details.open&&!details.dataset.loaded){details.append(questionDetail(q));details.dataset.loaded='true';}});return details;}
function selectField(options,value,fn,label){const select=n('select','field');select.setAttribute('aria-label',label);options.forEach(([val,text])=>{const option=n('option','',text);option.value=val;option.selected=val===value;select.append(option);});select.addEventListener('change',()=>fn(select.value));return select;}
function renderSearch(){
 app.append(pageTitle('题库搜索','输入关键词或题号，如“维修资金”“飞线充电”“S31”，也可以用空格组合关键词。'));
 const panel=n('section','panel search-panel');const input=n('input','field search-input');input.type='search';input.placeholder='搜索题目、选项或记忆说明';input.value=ui.query;input.setAttribute('aria-label','搜索题库');panel.append(input);
 const results=n('section');const update=()=>{ui.searchLimit=25;renderSearchResults(results);};input.addEventListener('input',()=>{ui.query=input.value;update();});
 const type=selectField([['all','全部题型'],['single','单选题 · 150'],['multi','多选题 · 200'],['tf','判断题 · 150'],['subjective','简答与案例 · 11']],ui.type,value=>{ui.type=value;update();},'筛选题型');
 const topic=selectField([['all','全部主题'],...BANK.topics.map(t=>[t.id,t.title])],ui.topic,value=>{ui.topic=value;update();},'筛选主题');panel.append(group('filter-row',type,topic));
 const warningLabel=n('label','checkbox-row');const checkbox=n('input');checkbox.type='checkbox';checkbox.checked=ui.warnings;checkbox.addEventListener('change',()=>{ui.warnings=checkbox.checked;update();});warningLabel.append(checkbox,document.createTextNode('只看有答案或表述核对提示的题目'));panel.append(warningLabel);app.append(panel,results);renderSearchResults(results);
}
function renderSearchResults(container){const matches=searchQuestions(all,{query:ui.query,type:ui.type,topic:ui.topic,warnings:ui.warnings});container.replaceChildren();container.append(paragraph(`找到 ${matches.length} 题 · 展开可看题库答案、通俗说明和记忆提示`,'results-count'));if(!matches.length){container.append(empty('没有找到匹配的题目','可缩短关键词，或切换为全部题型、全部主题。'));return;}matches.slice(0,ui.searchLimit).forEach(q=>container.append(questionCard(q)));if(matches.length>ui.searchLimit)container.append(button('加载更多题目',()=>{ui.searchLimit+=25;renderSearchResults(container);},'btn secondary wide'));}

function renderWrong(){
 const rows=wrongRows(store,BANK.questions,ui.wrongFilter);app.append(group('wrong-heading',pageTitle('错题本','按累计答错次数从高到低排列；答对后仍保留历史记录。'),n('span','hero-badge',`${rows.length}题`)));
 const chips=n('div','chips');[['all','全部历史错题'],['pending','最近仍答错'],['corrected','最近已答对']].forEach(([value,label])=>chips.append(button(label,()=>{ui.wrongFilter=value;go('wrong',false);},`chip${ui.wrongFilter===value?' active':''}`)));app.append(chips);
 if(!rows.length){app.append(empty('这里暂时没有错题',ui.wrongFilter==='all'?'提交过的错误答案会自动进入这里，并累计错误次数。':'切换其他筛选查看历史错题。',button('去练习',()=>go('home'))));return;}
 app.append(group('section-row',n('span','muted small-text','排序：累计答错次数 ↓'),group('inline-actions',button('随机练20题',()=>begin(rows.map(x=>x.q),'错题随机练习',20),'btn small'),button('练全部',()=>begin(rows.map(x=>x.q),'全部错题练习'),'btn secondary small'))));
 rows.forEach(({q,stats},index)=>{const card=questionCard(q);const summary=card.querySelector('summary');const top=group('wrong-topline',n('span','rank',`#${index+1} · 共练 ${stats.attempts} 次`),n('span','error-count',`答错 ${stats.wrong} 次`));summary.prepend(top);summary.append(n('span',stats.lastCorrect?'last-right':'last-wrong',stats.lastCorrect?'最近一次已答对':'最近一次答错'));app.append(card);});
}
function renderHistory(){
 app.append(pageTitle('学习记录','累计统计包含重复练习；每轮得分单独记录。'));
 const t=overall(store);app.append(statGrid([[t.attempts,'累计作答'],[t.correct,'累计答对','good'],[t.wrong,'累计答错','error'],[`${t.accuracy}%`,'累计正确率']]));
 app.append(paragraph(`已练过 ${t.unique}/500 道客观题，历史错题 ${t.wrongUnique} 道。`));
 const backup=n('section','panel');backup.append(n('h3','','保存与迁移记录'),paragraph('学习记录保存在当前浏览器。可导出备份，再在另一台设备上导入；分享网站链接不会带出你的个人答题记录。'));backup.append(group('backup-actions',button('导出学习记录',exportRecords,'btn secondary small'),button('导入学习记录',importRecords,'btn secondary small')));app.append(backup,group('section-row',n('h2','','最近30轮练习')));
 if(!store.sessions.length){app.append(empty('还没有交卷记录','完成一轮练习并交卷后，这里会显示本轮对错、未答数和得分。'));return;}
 store.sessions.forEach(session=>{const s=summarize(session),card=n('article','history-card');const copy=n('div');copy.append(n('h3','',session.title),paragraph(`${dateLabel(session.finishedAt)} · 对${s.correct} / 错${s.wrong} / 未答${s.unanswered}`));const score=n('div','history-score');score.append(document.createTextNode(String(s.score)),n('small','',' 分'));card.append(group('row',copy,score),button('查看本轮题目',()=>{ui.result=session;ui.reviewFilter='wrong';go('result');},'text-link small-text'));app.append(card);});
}
function renderKnowledge(){
 app.append(group('toolbar',button('← 练习首页',()=>go('home'),'text-link')));app.append(pageTitle('主题记忆卡片','先记住责任边界和处理顺序，再到相关题目里反复练习。说明据题库整理。'));
 const grid=n('div','card-grid');BANK.topics.forEach(t=>{const count=all.filter(q=>q.topic===t.id).length;if(!count)return;const card=n('article','knowledge-card');card.append(n('div','topic-count',`${count} 道相关题目`),n('h2','',t.title),paragraph(t.note),group('mnemonic',n('b','','这样记'),n('span','',t.tip)),button('查看相关题目 →',()=>{ui.query='';ui.type='all';ui.topic=t.id;ui.warnings=false;go('search');},'text-link small-text'));grid.append(card);});app.append(grid);
}
function renderSubjective(){
 app.append(group('toolbar',button('← 练习首页',()=>go('home'),'text-link')));app.append(pageTitle('简答与案例练习','先在下面写出自己的要点，再展开原题库参考答案。主观题不计入客观题自动得分。'));
 BANK.subjective.forEach(q=>{const card=n('article','panel');card.style.marginBottom='14px';card.append(questionMeta(q),n('h2','question',q.question));const area=n('textarea','subject-area');area.placeholder='先写下你想到的答题要点…';area.value=store.drafts[q.id]||'';area.maxLength=10000;area.setAttribute('aria-label',`${q.title}的练习笔记`);area.addEventListener('input',()=>{store.drafts[q.id]=area.value;save();});const reference=n('details','subject-reference');reference.append(n('summary','','展开原题库参考答案'),paragraph(q.answer,'explain-copy'),memoryBlocks(q));card.append(area,reference);app.append(card);});
}
function downloadJSON(filename,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=n('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function exportRecords(){downloadJSON(`众城刷题学习记录_${new Date().toISOString().slice(0,10)}.json`,{format:'zhongcheng-quiz-records',bankVersion:BANK.version,exportedAt:new Date().toISOString(),data:store});toast('学习记录已导出');}
function importRecords(){const input=n('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;if(file.size>5*1024*1024){toast('文件超过5MB，请选择导出的学习记录');return;}try{const raw=JSON.parse(await file.text());if(raw.format!=='zhongcheng-quiz-records'||!raw.data)throw new Error('invalid');const imported=sanitizeStore(raw.data,BANK.questions,BANK.subjective);const t=overall(imported);if(!await confirmModal('导入这份学习记录？',`备份包含累计作答${t.attempts}次、历史错题${t.wrongUnique}道。导入会替换当前浏览器的学习记录；如有需要请先导出当前记录。`,'确认导入'))return;store=imported;ui.choices={};save();go('history');toast('学习记录已导入');}catch{toast('无法识别这份记录，请选择本网站导出的JSON备份');}});input.click();}
function publicURL(q){if(!/^https?:$/.test(location.protocol)||['localhost','127.0.0.1','0.0.0.0','[::1]'].includes(location.hostname))return null;const url=new URL(location.href);url.search='';url.hash='';if(q)url.searchParams.set('q',q.id);return url.href;}
function shareQuestion(q){shareLink(q);}
function shareLink(q=null){const url=publicURL(q);if(!url){modal('网站分享',paragraph('网站发布后，这里可以复制公开访问的网址。当前预览地址不作为分享链接。'));return;}const body=n('div');body.append(paragraph(q?`分享 ${q.id} 这道题，对方打开后可直接找到它。`:'把此网址和对方的专属访问码分别发给对方。输入访问码后即可使用。'));const input=n('input','field copy-input');input.readOnly=true;input.value=url;input.setAttribute('aria-label','分享网址');input.addEventListener('click',()=>input.select());body.append(input,paragraph('对方使用自己的浏览器独立记录成绩和错题。','note'));const actions=[{label:'关闭',cls:'btn secondary',fn:c=>c()},{label:'复制链接',fn:async()=>{try{await navigator.clipboard.writeText(url);toast('分享链接已复制');}catch{input.focus();input.select();toast('请复制已选中的网址');}}}];if(navigator.share)actions.push({label:'系统分享',fn:async()=>{try{await navigator.share({title:BANK.title,text:'一起练习物业晋升题库',url});}catch{}}});modal('分享给朋友',body,actions);}
document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.route)));
document.getElementById('share').addEventListener('click',()=>shareLink());
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();go('home');});
window.addEventListener('storage',e=>{if(e.key!==STORAGE_KEY)return;try{store=sanitizeStore(JSON.parse(e.newValue||'null'),BANK.questions,BANK.subjective);if(!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))render();}catch{}});
const initialQuestion=new URLSearchParams(location.search).get('q');if(initialQuestion&&byId.has(initialQuestion)){ui.query=initialQuestion;ui.route='search';}
showStorageStatus();render();
