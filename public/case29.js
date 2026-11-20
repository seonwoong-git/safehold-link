'use strict';
(()=>{
const E=id=>document.getElementById(id),room=sessionStorage.getItem('sh29-case')||'SH-001';
const prefix='safehold29:event:'+room+':',roleNames=Object.keys(agencyActions);
const now=()=>new Date().toISOString(),clock=v=>new Date(v).toLocaleString('ko-KR',{hour12:false});
function button(label,cb){const b=node('button',label);b.onclick=cb;return b}
function events(){return Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>JSON.parse(localStorage[k])).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id))}
function save(kind,fields,id=crypto.randomUUID()){
 const record={...fields,kind,id,at:now()};
 try{if(!localStorage.getItem(prefix+id))localStorage.setItem(prefix+id,JSON.stringify(record))}
 catch{E('actionNote').textContent=E('saveNote').textContent='브라우저 기록 저장 실패 · 저장 공간과 권한 확인';return null}
 refresh();return record;
}
function derive(){
 const list=events(),tasks=new Map();let intake={};
 for(const e of list){
  if(e.kind==='접수')intake=e;
  if(e.kind==='배정')tasks.set(e.id,{...e,state:'확인 요청'});
  if(e.kind==='회신'&&tasks.has(e.task))Object.assign(tasks.get(e.task),{state:'회신 완료',reply:e.text,answered:e.at});
 }
 return {caseId:room,intake,tasks:[...tasks.values()],timeline:list};
}
function note(s){E('actionNote').textContent=s}
function assign(text,owner,props={}){
 if(!text.trim()){note('확인할 내용을 입력하세요.');return}
 const result=save('배정',{text:text.trim(),owner,due:E('taskDue').value||'',...props});
 if(result)note(owner+' 담당으로 등록했습니다.');return result
}
function reply(task,input){
 const text=input.value.trim();if(!text){input.focus();note('확인 결과를 입력하세요.');return}
 if(save('회신',{task:task.id,text,owner:task.owner},'reply-'+task.id)){
 shareLocal('기관 회신',task.owner,text);note('회신을 사건 기록에 반영했습니다.')}
}
function shareLocal(kind,role,text){
 const m={id:sessionId(),role,kind,time:new Date().toLocaleTimeString('ko-KR'),text};
 receive(m);localChannel?.postMessage(m)
}
window.recordChat=m=>save('채팅',{message:m},'chat-'+m.id);
window.convertChat=m=>assign(m.text,E('taskOwner').value,{from:m.id});
const getCandidate=()=>labResult?.rows.find(r=>r.id===labSelected)||labResult?.rows.find(r=>r.reachable);
window.refreshCandidate=()=>{
 const r=getCandidate();E('assignCandidate').disabled=!r?.reachable;
 const tasks=derive().tasks.filter(t=>t.scenario===labResult?.case&&t.candidate===r?.id);
 E('candidateWork').textContent=r?'가상 '+r.id+' · '+(tasks.at(-1)?.state||'미배정'):'도달 가능한 후보 없음';
};
function refresh(){
 const state=derive(),open=state.tasks.filter(t=>!t.answered);
 E('caseBadge').textContent=room;const intake=state.intake;
 E('caseSummary').replaceChildren(...[
 '접수 '+(intake.reported?.replace('T',' ')||'시각 미확인'),
 '마지막 확인 '+(intake.observed?.replace('T',' ')||'시각 미확인')+' / '+(intake.place||'장소 미확인'),
 '미조치 '+open.length+'건 · '+(open.at(0)?.text||(!intake.observed?'마지막 확인 시각 확인 필요':'담당 조치 확인'))
 ].map(s=>node('p',s)));
 E('workRows').replaceChildren();
 for(const t of state.tasks.slice().reverse()){
  const row=node('div',undefined,'workrow');row.append(node('strong',t.text),node('small',t.owner+' · '+t.state+(t.due?' · 기한 '+t.due.replace('T',' '):'')+(t.candidate?' · 합성 '+t.candidate:'')));
  if(t.reply)row.append(node('p',t.reply));else{const input=document.createElement('input');input.placeholder='담당자 확인 결과';input.maxLength=300;row.append(input,button('회신 완료',()=>reply(t,input)))}
  E('workRows').append(row);
 }
 E('caseTimeline').replaceChildren(...state.timeline.slice().reverse().map(e=>node('p',clock(e.at)+' · '+e.kind+' · '+(e.text||e.message?.text||''))));
 window.refreshCandidate();window.update30?.();window.updateCase32?.();
}
for(const role of roleNames)E('taskOwner').append(new Option(role));
E('addTask').onclick=()=>{if(assign(E('taskText').value,E('taskOwner').value))E('taskText').value=''};
function storeIntake(){
 if(!E('report').value.trim()){E('saveNote').textContent='신고 내용을 입력하세요.';return}
 if(E('observedAt').value&&E('reportedAt').value&&E('observedAt').value>E('reportedAt').value){E('saveNote').textContent='마지막 확인 시각과 접수 시각의 순서를 확인하세요.';return}
 if(save('접수',{text:E('report').value.trim(),reported:E('reportedAt').value,observed:E('observedAt').value,place:E('lastPlace').value.trim(),source:E('lastSource').value.trim(),witness:E('witnessNote').value.trim(),witnessAt:E('witnessAt').value}))E('saveNote').textContent='신고 접수 저장 완료';
}
E('saveIntake').onclick=storeIntake;
E('exampleCase').onclick=()=>{
 const date=new Date().toLocaleDateString('sv-SE');
 E('report').value='[가상 신고 예시] 15시 20분 보호자가 7세 아동 실종을 신고했다. 보호자가 마지막으로 아이를 직접 본 때는 15시 10분경 동해삼육중학교 정문 앞이었다. 신고된 옷차림은 노란 겉옷, 짙은 바지, 파란 작은 가방이다. 목격자 한 명은 15시 12분경 비슷한 옷차림의 아이가 정문을 등지고 오른쪽 보도로 걸었다고 진술했다. 동일인 여부와 이후 목격·영상 확인 결과는 미확인이다.';
 E('report').dispatchEvent(new Event('input'));E('reportedAt').value=date+'T15:20';E('observedAt').value=date+'T15:10';E('lastPlace').value='동해삼육중학교 정문 앞';E('lastSource').value='보호자 직접 목격 진술';E('witnessAt').value=date+'T15:12';E('witnessNote').value='목격자 1명 · 정문을 등지고 오른쪽 보도 · 동일인 미확인';E('saveNote').textContent='가상 예시 입력됨 · 접수 저장 후 종합판단 표시';
};
E('topReport').onclick=()=>E('overviewReport').click();
E('enterSim').onclick=()=>{showView('training');if(currentWorkspace==='training')E('labCase').focus()};
E('assignCandidate').onclick=()=>{
 const r=getCandidate();if(!r?.reachable)return;
 const prev=derive().tasks.find(t=>t.scenario===labResult.case&&t.candidate===r.id&&!t.answered);
 if(!prev)assign('가상 '+r.id+' 보존정보 및 열람권한 확인',r.agency,{candidate:r.id,scenario:labResult.case,minutes:labResult.minutes,distance:r.distance,rank:labResult.rows.indexOf(r)+1});
 renderLab();showView('agencyDesk');E('caseDesk').scrollIntoView({block:'start'});
};
window.decorateRoute=(r,svg)=>{
 const ns=svg.namespaceURI,prior=Math.max(0,...[0,5,15,30,60].filter(t=>t<r.minutes)),limit=prior*r.speed*1000/60;
 const selected=getCandidate(),tasks=derive().tasks;
 function line(p,q,color,width){const l=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:p[0],y1:p[1],x2:q[0],y2:q[1],stroke:color,'stroke-width':width,'pointer-events':'none'}))l.setAttribute(k,v);svg.insertBefore(l,svg.querySelector('circle'))}
 for(const [a,b,w] of r.edges){if(r.blocked.some(e=>e.includes(a)&&e.includes(b)))continue;
 for(const [u,v] of [[a,b],[b,a]]){const f=Math.min(1,(limit-r.distances[u])/w);if(f<=0)continue;const p=r.nodes[u],q=r.nodes[v];line(p,[p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f],'#53867f',6)}}
 if(selected?.reachable){let n=selected.node;while(n!==r.origin){const edge=r.edges.find(([a,b,w])=>(a===n||b===n)&&!r.blocked.some(e=>e.includes(a)&&e.includes(b))&&r.distances[a===n?b:a]+w===r.distances[n]);if(!edge)break;const prev=edge[0]===n?edge[1]:edge[0];line(r.nodes[n],r.nodes[prev],'#ffd580',4);n=prev}}
 for(const [idx,row] of r.rows.entries()){
  const marker=svg.querySelector('[aria-label="'+row.id+'"]');if(!marker)continue;
  const label=marker.nextElementSibling;if(row.reachable&&label){label.textContent=(idx+1)+'·'+row.id;label.setAttribute('font-size','10')}
  if(tasks.some(t=>t.scenario===r.case&&t.candidate===row.id&&t.answered))marker.setAttribute('fill','#347947')
 }
};
function listCases(){const ids=new Set(['SH-001',room]);Object.keys(localStorage).filter(k=>k.startsWith('safehold29:case:')).forEach(k=>ids.add(k.split(':').pop()));E('casePick').replaceChildren(...[...ids].map(id=>new Option(id,id)));E('casePick').value=room}
function switchCase(id){if(id===room)return;sessionStorage.setItem('sh29-case',id);location.reload()}
E('newCase').onclick=()=>{const id='SH-'+crypto.randomUUID().slice(0,8).toUpperCase();localStorage.setItem('safehold29:case:'+id,'1');switchCase(id)};
E('casePick').onchange=()=>switchCase(E('casePick').value);
E('draftSMS').onclick=()=>{const s=derive();E('smsText').hidden=false;E('smsText').value='[모의 상황 / '+room+'] '+(s.tasks.find(t=>!t.answered)?.text||'상황 확인 요청')+'. 담당기관은 확인 결과를 상황실에 회신해 주세요.';note('문자 초안 작성 · 실제 발송 전')};
E('copySMS').onclick=async()=>{if(E('smsText').hidden)E('draftSMS').click();try{await navigator.clipboard.writeText(E('smsText').value);note('초안 복사 완료')}catch{E('smsText').select();note('Ctrl+C로 복사하세요.')}};
function report(){return {...derive(),checks:Object.fromEntries(taskChecks),created:now(),mode:'local_case_review'}}
E('caseJSON').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));a.href=u;a.download=room+'-사건보고서.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
E('casePrint').onclick=()=>{const w=window.open('','_blank');if(!w)return;const d=w.document,s=report();d.title=room+' 사건보고서';for(const [tag,str] of [['h1',d.title],['p',s.intake.text||'미접수'],['p','접수 '+(s.intake.reported||'미확인')+' / 마지막 확인 '+(s.intake.observed||'미확인')+' / '+(s.intake.place||'장소 미확인')],['h2','업무 및 회신'],...s.tasks.map(t=>['p',t.owner+' · '+t.text+' · '+t.state+' · '+(t.reply||'회신 대기')]),['h2','사건 타임라인'],...s.timeline.map(t=>['p',clock(t.at)+' · '+t.kind+' · '+(t.text||t.message?.text||'')])]){const p=d.createElement(tag);p.textContent=str;d.body.append(p)}w.print()};
const actors=['시청 상황실','경찰 연락 담당','관제 담당','현장 연락 담당'],speeches=['신고 접수 시각과 마지막 확인 시각을 구분해 기록합니다.','담당기관과 확인할 내용을 조정합니다.','영상 보존정보와 열람 권한을 확인합니다.','현장 확인 결과와 미확인 항목을 상황실에 회신합니다.'];
let turn=0,timer=null;
function drawMeeting(){E('roomPeople').replaceChildren(...actors.map((role,i)=>{const b=button('',()=>{turn=i;drawMeeting()});b.className=turn===i?'speaking':'';const img=document.createElement('img');img.alt=role+' 모의 참가자';img.src='/room'+i+'.gif';b.append(img,node('span',role));return b}));E('speakerImage').src='/room'+turn+'.gif';E('roomSpeaker').textContent=actors[turn]+' · 발언';E('roomAgenda').textContent=speeches[turn]+'  '+(derive().tasks.find(t=>!t.answered)?.text||'');E('roomStart').textContent=timer?'일시정지':'30초 자동 회의'}
function stop(){clearInterval(timer);timer=null;drawMeeting()}
window.stopCaseMeeting=stop;
E('roomStart').onclick=()=>{if(timer){stop();return}timer=setInterval(()=>{if(turn===3){stop();return}turn++;drawMeeting()},7500);if(turn===3)turn=0;drawMeeting()};
E('roomPrev').onclick=()=>{turn=(turn+3)%4;drawMeeting()};E('roomNext').onclick=()=>{turn=(turn+1)%4;drawMeeting()};E('roomFull').onclick=()=>document.fullscreenElement?document.exitFullscreen():E('roomBox').requestFullscreen().catch(()=>note('전체화면 사용 불가'));
E('roomDecision').onclick=()=>{const text=E('decisionText').value.trim();if(assign(text,E('taskOwner').value,{source:'합동회의'})){shareLocal('결정사항',actors[turn],text);E('decisionText').value=''}};
const checkKey='safehold29:checks:'+room;
function restoreChecks(){taskChecks.clear();for(const [k,v] of Object.entries(JSON.parse(localStorage.getItem(checkKey)||'{}')))taskChecks.set(k,v);renderAgency()}
restoreChecks();E('agencyTasks').addEventListener('change',()=>localStorage.setItem(checkKey,JSON.stringify(Object.fromEntries(taskChecks))));
const first=derive();for(const m of first.timeline.filter(e=>e.message))if(!messages.some(x=>x.id===m.message.id))messages.push(m.message);
showMessages();for(const [id,key] of [['report','text'],['reportedAt','reported'],['observedAt','observed'],['lastPlace','place'],['lastSource','source'],['witnessNote','witness'],['witnessAt','witnessAt']])E(id).value=first.intake[key]||'';
window.addEventListener('storage',e=>{if(e.key===checkKey)restoreChecks();else if(e.key?.startsWith(prefix)){refresh();if(currentWorkspace==='training')renderLab()}else if(e.key?.startsWith('safehold29:case:'))listCases()});
E('singleClip').onclick=()=>{if(!command.camera)return;const solo=E('multiGrid').classList.toggle('solo');E('singleClip').textContent=solo?'4분할 보기':'선택 영상 확대';E('multiGrid').hidden=false};
E('refetchClip').onclick=()=>{if(currentWorkspace==='trafficDesk')E('itsTest').click();else E('overviewFetch').click()};
window.caseDesk30={read:derive,save,room};listCases();refresh();drawMeeting();if(labData)renderLab();
})();
