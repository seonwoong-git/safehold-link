'use strict';
(()=>{
const el=id=>document.getElementById(id),caseDesk=window.caseDesk30;
function btn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b}
const docks=['routeIntake','routeAssets'].map(el);
const panel=document.createElement('section');panel.className='route30';panel.hidden=true;
panel.innerHTML='<strong>예상 이동로 · 확인할 CCTV</strong><small>합성 훈련 전용 · 가상 좌표와 가상 장비</small><div class="routeTools"><select aria-label="훈련 지형"><option value="urban">도심</option><option value="coast">해안</option><option value="hill">산간</option></select><select aria-label="훈련 시간"></select><button type="button">훈련 상세</button></div><div class="routePair"><div class="miniMap"></div><div class="shortlist"></div></div><small class="routeResult" role="status"></small>';
const [scene,minutes]=panel.querySelectorAll('select');
for(let m=5;m<=60;m+=5)minutes.add(new Option(m+'분',String(m)));
scene.onchange=()=>{el('labCase').value=scene.value;el('labCase').dispatchEvent(new Event('change'))};
minutes.onchange=()=>{el('labTime').value=minutes.value;el('labTime').dispatchEvent(new Event('input'))};
panel.querySelector('button').onclick=()=>showView('training');
function renderRoute(){
 if(!labResult){panel.querySelector('.routeResult').textContent='합성 도로망을 불러오는 중';return}
 const r=labResult,list=panel.querySelector('.shortlist'),mapBox=panel.querySelector('.miniMap');
 scene.value=r.case;minutes.value=r.minutes;
 const svg=el('labMap').querySelector('svg')?.cloneNode(true);
 if(svg){svg.removeAttribute('id');svg.querySelectorAll('[tabindex]').forEach(a=>a.removeAttribute('tabindex'));svg.setAttribute('aria-label','합성 도로망과 선택한 가상 후보까지의 연결 경로');mapBox.replaceChildren(svg);
 svg.querySelectorAll('rect[aria-label]').forEach(a=>{a.onclick=()=>{labSelected=a.getAttribute('aria-label');renderLab()}})}
 const candidates=r.rows.filter(row=>row.reachable),selected=candidates.find(row=>row.id===labSelected)||candidates[0];
 list.replaceChildren(...candidates.map((row,i)=>{const b=btn((i+1)+' · '+row.id+'　'+row.distance+'m',()=>{labSelected=row.id;renderLab()});b.setAttribute('aria-pressed',String(selected===row));return b}));
 if(!candidates.length)list.textContent='도달 범위 내 가상 후보 0건';
 panel.querySelector('.routeResult').textContent=r.minutes+'분 · 거리 한도 '+r.limit_m+'m · 가상 후보 '+candidates.length+'건'+(selected?' · '+selected.id+' '+selected.purpose:'');
}
window.routeView30=(id,from)=>{if(id==='intake'||id==='assets'){const d=docks[id==='assets'?1:0];if(panel.parentNode!==d)d.append(panel);if(from!==id)el(id).scrollTop=0;renderRoute()}};
const dialog=el('docDialog'),notice=msg=>el('docNotice').textContent=msg;
function documents(){const docs=new Map();for(const e of caseDesk.read().timeline){
 if(e.kind==='문서 기안')docs.set(e.id,{...e,status:'기안',history:[e]});
 if(e.kind==='결재 처리'&&docs.has(e.doc)){const d=docs.get(e.doc);d.status=e.status;d.external=e.external||d.external;d.history.push(e)}
}return [...docs.values()]}
function prefill(){const s=caseDesk.read();el('docTitle').value=s.caseId+' 상황 조치 보고';el('docBody').value=[s.intake.text||'접수 내용 미확인','접수 시각 '+(s.intake.reported||'미확인'),'마지막 확인 '+(s.intake.observed||'미확인')+' / '+(s.intake.place||'미확인'),...(window.caseFindings32?.()||[]),...s.tasks.map(t=>[t.owner,t.text,t.state,t.reply].filter(Boolean).join(' · '))].join('\n')}
function download(d){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({format:'SafeHold local handoff 1',caseId:caseDesk.room,document:d,externalDispatch:false},null,2)],{type:'application/json'}));a.href=url;a.download=d.number+'-인계.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function printDoc(d){const w=window.open('','_blank');if(!w){notice('인쇄 창을 허용하세요.');return}
 w.document.title=d.number;for(const [tag,t] of [['h1',d.title],['p',caseDesk.room+' · '+d.number+' · '+d.status],['p','기안 '+d.dept+' / 결재 담당 '+d.reviewer],['pre',d.body],['p','온나라 수동 등록번호 '+(d.external||'미확인')]]){const n=w.document.createElement(tag);n.textContent=t;n.style.whiteSpace='pre-wrap';w.document.body.append(n)}w.print()}
const actions={'기안':['상신'],'상신':['승인','반려'],'승인':['대장 등록'],'대장 등록':['외부등록 기록']};
function advance(d,status,input){
 const current=documents().find(x=>x.id===d.id);
 if(!actions[current?.status]?.includes(status)){notice('현재 문서 상태를 확인하세요.');return}
 const external=status==='외부등록 기록'?input.value.trim():'',reason=status==='반려'?input.value.trim():'';
 if(status==='외부등록 기록'&&!external||status==='반려'&&!reason){notice(status==='반려'?'반려 사유를 입력하세요.':'온나라에서 확인한 등록번호를 입력하세요.');input.focus();return}
 if(caseDesk.save('결재 처리',{doc:d.id,status,external,text:d.number+' · '+status+(reason?' · '+reason:'')+(external?' · '+external:'')}))notice('로컬 대장에 '+status+' 기록');
}
function renderDocs(){
 if(!dialog.open)return;const list=el('docList');list.replaceChildren();
 for(const d of documents().reverse()){
 const item=document.createElement('article');item.className='casecard';item.append(node('strong',d.title),node('p',[d.number,d.status,d.dept,d.reviewer,d.external].filter(Boolean).join(' · ')));
 const info=document.createElement('details');info.append(node('summary','본문·처리 이력'),node('pre',d.body+'\n\n'+d.history.map(e=>e.at+' '+(e.status||'기안')).join('\n')));item.append(info);
 const input=document.createElement('input');if(['상신','대장 등록'].includes(d.status)){input.placeholder=d.status==='상신'?'반려 시 사유 입력':'온나라 공식 등록번호 (수동 확인)';input.maxLength=120;item.append(input)}
 for(const status of actions[d.status]||[])item.append(btn(status,()=>navigator.locks?navigator.locks.request('safehold-doc-'+d.id,()=>advance(d,status,input)):advance(d,status,input)));
 if(d.status==='반려')item.append(btn('수정 재기안',()=>{el('docTitle').value=d.title;el('docBody').value=d.body;el('docReviewer').value=d.reviewer;el('docDept').value=d.dept;el('docBody').focus()}));
 item.append(btn('인계 JSON',()=>download(d)),btn('인쇄',()=>printDoc(d)));list.append(item)}
 if(!list.children.length)list.textContent='이 사건의 기안 문서가 없습니다.';
}
el('openDocs').onclick=()=>{el('docCase').textContent=caseDesk.room;dialog.showModal();if(!el('docTitle').value)prefill();renderDocs()};
el('closeDocs').onclick=()=>dialog.close();el('docPrefill').onclick=prefill;
el('docCreate').onclick=()=>{const [title,dept,reviewer,body]=['docTitle','docDept','docReviewer','docBody'].map(k=>el(k).value.trim());if(!title||!dept||!reviewer||!body){notice('제목·부서·결재 담당·본문을 입력하세요.');return}
 const id=crypto.randomUUID();if(caseDesk.save('문서 기안',{title,dept,reviewer,body,text:title,number:'SHD-'+id.slice(0,8).toUpperCase()},id)){notice('기안 저장 완료');el('docTitle').value=el('docBody').value=''}};
window.update30=()=>{renderRoute();renderDocs()};window.routeView30(currentWorkspace,'');window.update30();
})();
