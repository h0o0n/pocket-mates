const MENUS=[
  {name:'김치찌개',emoji:'🍲',type:'korean',taste:['spicy','savory'],temp:'hot',full:'full',price:'mid',tags:['얼큰한','한식','든든한']},
  {name:'삼겹살',emoji:'🥓',type:'korean',taste:['savory'],temp:'hot',full:'full',price:'high',tags:['고기','회식','든든한']},
  {name:'비빔밥',emoji:'🥗',type:'korean',taste:['spicy','fresh'],temp:'warm',full:'full',price:'mid',tags:['한식','채소','균형식']},
  {name:'칼국수',emoji:'🍜',type:'korean',taste:['mild','savory'],temp:'hot',full:'full',price:'low',tags:['따뜻한','면','가성비']},
  {name:'초밥',emoji:'🍣',type:'japanese',taste:['fresh','mild'],temp:'cool',full:'light',price:'high',tags:['깔끔한','일식','해산물']},
  {name:'돈카츠',emoji:'🍱',type:'japanese',taste:['savory'],temp:'hot',full:'full',price:'mid',tags:['바삭한','일식','든든한']},
  {name:'마라탕',emoji:'🌶️',type:'chinese',taste:['spicy','savory'],temp:'hot',full:'full',price:'mid',tags:['매운맛','중식','골라먹기']},
  {name:'짜장면',emoji:'🍜',type:'chinese',taste:['sweet','savory'],temp:'hot',full:'full',price:'low',tags:['중식','면','가성비']},
  {name:'피자',emoji:'🍕',type:'western',taste:['savory'],temp:'hot',full:'full',price:'high',tags:['치즈','양식','나눠먹기']},
  {name:'파스타',emoji:'🍝',type:'western',taste:['savory','mild'],temp:'hot',full:'full',price:'high',tags:['양식','분위기','면']},
  {name:'쌀국수',emoji:'🍜',type:'asian',taste:['fresh','mild'],temp:'hot',full:'light',price:'mid',tags:['국물','아시안','깔끔한']},
  {name:'팟타이',emoji:'🥢',type:'asian',taste:['sweet','savory'],temp:'hot',full:'full',price:'mid',tags:['아시안','면','새콤달콤']},
  {name:'샤브샤브',emoji:'🥘',type:'korean',taste:['fresh','mild'],temp:'hot',full:'full',price:'high',tags:['따뜻한','채소','함께']},
  {name:'포케',emoji:'🥗',type:'western',taste:['fresh','mild'],temp:'cool',full:'light',price:'mid',tags:['가벼운','채소','건강식']},
  {name:'떡볶이',emoji:'🍢',type:'korean',taste:['spicy','sweet'],temp:'hot',full:'light',price:'low',tags:['분식','매콤달콤','가성비']}
];
const QUESTIONS=[
  {key:'type',title:'오늘 끌리는 음식 종류는?',hint:'여러 개 골라도 좋아요',multi:true,options:[['korean','🍚','한식'],['japanese','🍣','일식'],['chinese','🥟','중식'],['western','🍝','양식'],['asian','🌿','아시안']]},
  {key:'taste',title:'지금 당기는 맛은?',hint:'최대 2개까지 선택해 주세요',multi:true,max:2,options:[['spicy','🌶️','매콤한 맛'],['savory','🧂','짭짤·감칠맛'],['mild','☁️','담백한 맛'],['sweet','🍯','달콤한 맛'],['fresh','🍋','상큼·깔끔한 맛']]},
  {key:'temp',title:'따뜻한 음식이 좋아요?',hint:'오늘의 기분과 날씨를 떠올려 보세요',options:[['hot','♨️','뜨끈한 음식'],['warm','🍚','상관없어요'],['cool','🧊','시원한 음식']]},
  {key:'full',title:'얼마나 든든하게 먹을까요?',hint:'지금 배고픈 정도를 알려주세요',options:[['light','🙂','가볍게'],['full','😋','든든하게']]},
  {key:'price',title:'1인당 예산은 어느 정도?',hint:'메뉴 가격을 기준으로 추천해요',options:[['low','🪙','1만원 이하'],['mid','💵','1~2만원'],['high','💳','2만원 이상']]},
  {key:'avoid',title:'오늘 피하고 싶은 것은?',hint:'여러 개 선택할 수 있어요',multi:true,options:[['spicy','🌶️','매운 음식'],['meat','🥩','고기'],['seafood','🐟','해산물'],['noodle','🍜','면'],['none','👌','없어요']]}
];
let state=JSON.parse(localStorage.getItem('menuTogether')||'null')||{members:[],answers:[],person:0,q:0,reroll:0};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function save(){localStorage.setItem('menuTogether',JSON.stringify(state))}function show(id){$$('.screen').forEach(x=>x.classList.toggle('active',x.id===id));scrollTo({top:0,behavior:'smooth'})}
const colors=['#ffd858','#b7d990','#ffb89f','#b9d9ef','#d9c0ec','#f6cf8d','#9cd8cf','#f4aebb'];
$('#today').textContent=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
$$('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go)); $('#startBtn').onclick=()=>show('members');
if(state.members.length>1){$('#resumeBtn').classList.remove('hidden');$('#resumeBtn').onclick=()=>{renderMembers();show('members')}}
function renderMembers(){const box=$('#memberList');box.innerHTML=state.members.map((n,i)=>`<div class="member"><span class="mini-avatar" style="background:${colors[i]}">${n[0]}</span><strong>${escapeHtml(n)}</strong><button aria-label="${escapeHtml(n)} 삭제" data-remove="${i}">×</button></div>`).join('');box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.members.splice(+b.dataset.remove,1);state.answers=[];save();renderMembers()});$('#beginQuestions').disabled=state.members.length<2}
function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
$('#memberForm').onsubmit=e=>{e.preventDefault();let v=$('#memberInput').value.trim();if(v&&state.members.length<8&&!state.members.includes(v)){state.members.push(v);$('#memberInput').value='';save();renderMembers()}};
$('#beginQuestions').onclick=()=>{state.answers=state.members.map(()=>({}));state.person=0;state.q=0;save();renderQuestion();show('questions')};
function currentSelection(){return state.answers[state.person]?.[QUESTIONS[state.q].key]||[]}
function renderQuestion(){const q=QUESTIONS[state.q],sel=currentSelection();$('#progress').style.width=`${((state.person*QUESTIONS.length+state.q+1)/(state.members.length*QUESTIONS.length))*100}%`;$('#questionCount').textContent=`${state.q+1} / ${QUESTIONS.length}`;$('#answeringName').textContent=state.members[state.person];$('#avatar').textContent=state.members[state.person][0];$('#avatar').style.background=colors[state.person];$('#questionBody').innerHTML=`<h2 class="question-title">${q.title}</h2><p class="question-hint">${q.hint}</p><div class="options ${q.multi?'multi':''}">${q.options.map(o=>`<button class="option ${sel.includes(o[0])?'selected':''}" data-value="${o[0]}"><span class="emoji">${o[1]}</span>${o[2]}</button>`).join('')}</div>`;$('#questionBody').querySelectorAll('.option').forEach(b=>b.onclick=()=>selectOption(b.dataset.value));$('#nextBtn').disabled=!sel.length;$('#nextBtn').innerHTML=state.q===QUESTIONS.length-1?(state.person===state.members.length-1?'결과 보기 <span>→</span>':'답변 완료 <span>→</span>'):'다음 <span>→</span>'}
function selectOption(v){const q=QUESTIONS[state.q];let a=currentSelection();if(q.multi){if(v==='none')a=['none'];else{a=a.filter(x=>x!=='none');a=a.includes(v)?a.filter(x=>x!==v):[...a,v];if(q.max&&a.length>q.max)a.shift()}}else a=[v];state.answers[state.person][q.key]=a;save();renderQuestion()}
function advance(){if(state.q<QUESTIONS.length-1){state.q++;save();renderQuestion()}else if(state.person<state.members.length-1){$('#doneName').textContent=state.members[state.person];$('#nextName').textContent=state.members[state.person+1];$('#nextAvatar').textContent=state.members[state.person+1][0];$('#nextAvatar').style.background=colors[state.person+1];show('handoff')}else{renderResults();show('results')}}
$('#nextBtn').onclick=advance;$('#skipBtn').onclick=()=>{state.answers[state.person][QUESTIONS[state.q].key]=[];save();advance()};$('#continueBtn').onclick=()=>{state.person++;state.q=0;save();renderQuestion();show('questions')};$('#questionBack').onclick=()=>{if(state.q>0){state.q--;renderQuestion()}else show('members')};
function scoreMenu(m){let total=0,min=99;state.answers.forEach(a=>{let s=0;if(a.type?.includes(m.type))s+=3;if(a.taste?.some(x=>m.taste.includes(x)))s+=3;if(a.temp?.includes(m.temp)||a.temp?.includes('warm'))s+=1;if(a.full?.includes(m.full))s+=2;let pi={low:0,mid:1,high:2},desired=a.price?.[0];if(desired)s+=Math.max(0,2-Math.abs(pi[desired]-pi[m.price]));let avoid=a.avoid||[];if((avoid.includes('spicy')&&m.taste.includes('spicy'))||(avoid.includes('meat')&&['삼겹살','돈카츠'].includes(m.name))||(avoid.includes('seafood')&&m.name==='초밥')||(avoid.includes('noodle')&&m.tags.includes('면')))s-=20;total+=s;min=Math.min(min,s)});return {total,min,score:total+min*1.4}}
function ranked(){return MENUS.map(m=>({...m,...scoreMenu(m)})).sort((a,b)=>b.score-a.score)}
function renderResults(){let list=ranked(),offset=(state.reroll*3)%Math.max(3,list.length-2),top=list.slice(offset,offset+3);if(top.length<3)top=list.slice(0,3);let max=QUESTIONS.length*11*state.members.length;$('#resultSummary').textContent=`${state.members.join(', ')} ${state.members.length}명의 답변에서 가장 많이 겹친 취향이에요.`;$('#resultGrid').innerHTML=top.map((m,i)=>{let match=Math.max(68,Math.min(98,Math.round(74+(m.total/max)*28)));return `<article class="result-card"><span class="rank">${i+1}위</span><span class="menu-emoji">${m.emoji}</span><h3>${m.name}</h3><div class="match">취향 일치 ${match}%</div><p class="reason">${i===0?'모두의 선택이 가장 고르게 겹쳤어요. 오늘의 1순위로 딱이에요!':i===1?'맛과 예산 선호가 잘 맞는 든든한 차선책이에요.':'색다르게 즐기면서도 공통 취향을 놓치지 않았어요.'}</p><div class="tags">${m.tags.map(t=>`<span>#${t}</span>`).join('')}</div></article>`}).join('')}
$('#rerollBtn').onclick=()=>{state.reroll++;save();renderResults()};$('#restartBtn').onclick=()=>{if(confirm('모든 답변을 지우고 다시 시작할까요?')){state={members:[],answers:[],person:0,q:0,reroll:0};save();renderMembers();show('home')}};renderMembers();
