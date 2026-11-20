'use strict';
// Local-only role-play coordination. No connection to real agency identities or systems.
const agencyActions={'동해시 안전정보센터':['관리기관 및 열람권한 확인','영상 보존정책 확인'],'경찰':['공식 신고 접수 여부 확인','권한 있는 담당자에게 추가 확인사항 전달'],'소방':['현장 안전·구조 필요성 검토'],'해경':['해안 안전 및 구조 협조 검토'],'교통·버스·택시':['교통환경 및 운영기관 공식 협조 검토']};
agencyActions['복지']=['지원 대상자 연계 절차 확인'];agencyActions['군 지원']=['공식 지원 요청 및 임무 범위 확인'];
for(const role of ['복지','군 지원'])$('agencyRole').append(new Option(role,role));
const taskChecks=new Map();
const localChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('safehold29-'+(sessionStorage.getItem('sh29-case')||'SH-001')):null;
let messages=[];const sessionId=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now();
function renderAgency(){const el=$('agencyTasks'),role=$('agencyRole').value;el.replaceChildren();
 for(const label of agencyActions[role]){const row=node('label'),input=document.createElement('input');input.type='checkbox';
 const key=role+' / '+label;input.checked=!!taskChecks.get(key);input.onchange=()=>{if(input.checked)taskChecks.set(key,new Date().toISOString());else taskChecks.delete(key)};
 row.append(input,document.createTextNode(' '+label));el.append(row)}}
$('agencyRole').onchange=renderAgency;renderAgency();
function showMessages(){const log=$('chatLog');log.replaceChildren();if(!messages.length){log.append(node('p','공유된 안건이 없습니다.','small'));return}for(const m of messages){const row=node('div',undefined,'chatMsg');row.append(node('small',m.role+' · '+m.time+' · '+m.kind),node('p',m.text));if(window.convertChat){const b=node('button','업무로 등록');b.onclick=()=>window.convertChat(m);row.append(b)}log.append(row)}log.scrollTop=log.scrollHeight}
function receive(m){if(!m||typeof m.id!=='string'||typeof m.text!=='string'||m.text.length>1500||typeof m.role!=='string'||typeof m.time!=='string'||typeof m.kind!=='string'||messages.some(x=>x.id===m.id))return;window.recordChat?.(m);messages.push(m);if(messages.length>150)messages.shift();showMessages()}
if(localChannel)localChannel.onmessage=e=>{if(e.data?.sync==='request')localChannel.postMessage({sync:'response',messages});else if(e.data?.sync==='response'&&Array.isArray(e.data.messages))e.data.messages.forEach(receive);else receive(e.data)};if(localChannel)localChannel.postMessage({sync:'request'});showMessages();
function share(kind,text,role='AI 검토 초안'){if(!text){$('chatStatus').textContent='먼저 분석 또는 내용을 입력하세요.';return}if(!$('chatConsent').checked){$('chatStatus').textContent='협업 상황실의 시연 안건 확인란을 체크하세요.';showView('agencyDesk');return}if(/(?:01[016789][\s-]?\d{3,4}[\s-]?\d{4}|\d{6}\s*-\s*[1-8]\d{6}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/.test(text)){$('chatStatus').textContent='개인정보를 제외한 시연 안건만 공유하세요.';return}const m={id:sessionId(),role,kind,time:new Date().toLocaleTimeString('ko-KR',{hour12:false}),text:text.slice(0,1500)};receive(m);localChannel?.postMessage(m);$('chatStatus').textContent='시연 안건 등록 · 동일 브라우저 탭에 공유';}
$('sendChat').onclick=()=>{const text=$('chatText').value.trim();share($('msgKind').value,text,$('agencyRole').value+' (훈련)');if(text&&$('chatStatus').textContent.startsWith('시연 안건 등록'))$('chatText').value=''};
$('shareReport').onclick=()=>share('신고 분석',reportRun?.result?['사건 유형: '+reportRun.result.incident_type,'핵심 판단: '+reportRun.result.summary,'추가 확인: '+reportRun.result.missing_information.slice(0,2).join(' / ')].join('\n'):'');
$('shareBrief').onclick=()=>share('종합 분석',briefRun?.result);
$('shareVision').onclick=()=>share('환경 이미지',visionRun?.result);
$('shareTraining').onclick=()=>share('훈련 공간분석',labResult?`합성 훈련 · ${labResult.title} · ${labResult.minutes}분\n경로거리 한도 ${labResult.limit_m}m · 가상 후보 ${labResult.rows.filter(x=>x.reachable).length}개\n${labAIResult?.result||'AI 설명 미실행 · 기관별 보존정보 확인 필요'}`:'');
$('shareTransit').onclick=()=>share('교통 협조 검토',[$('busReview').checked?'버스 운영기관 공식 협조 여부 검토':'',$('taxiReview').checked?'택시 운영기관 공식 협조 여부 검토':''].filter(Boolean).join('\n'),'교통 협업 (훈련)');
$('printTasks').onclick=()=>{
 const view=window.open('','_blank');if(!view)return;
 const doc=view.document;doc.title='SafeHold LINK V30 | 기관별 검토표';
 for(const [role,items] of Object.entries(agencyActions)){
   const heading=doc.createElement('h2');heading.textContent=role;doc.body.append(heading);
   for(const label of items){const row=doc.createElement('p'),at=taskChecks.get(role+' / '+label);row.textContent=(at?'☑ ':'□ ')+label+(at?' · '+at:'');doc.body.append(row)}
 }
 for(const m of messages){const row=doc.createElement('p');row.textContent=[m.time,m.role,m.kind,m.text].join(' · ');doc.body.append(row)}
 view.print();
};
$('exportChat').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({mode:'local_training_only',checks:Object.fromEntries(taskChecks),messages},null,2)],{type:'application/json'}));a.href=url;a.download='SafeHold_V30_agency_review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
(async()=>{try{const r=await fetch('/data.json'),d=await r.json();for(const [name,count] of Object.entries(d.cctv_purposes))$('purposeCompact').append(metric(name,fmt(count)+'대'))}catch{$('purposeCompact').textContent='자료 조회 실패'}})();

// A user-supplied, provider-authorized public traffic stream is played locally, never fetched by server or AI.
const trafficVideo=$('trafficVideo');function stopTraffic(){trafficVideo.pause();trafficVideo.removeAttribute('src');trafficVideo.load();trafficVideo.hidden=true;$('trafficURL').value='';$('trafficConsent').checked=false;$('trafficStatus').textContent='재생 종료 · 영상 주소 저장하지 않음'}
$('trafficStop').onclick=stopTraffic;
$('trafficPlay').onclick=async()=>{if(!$('trafficConsent').checked){$('trafficStatus').textContent='제공기관 영상 재생 이용권한 확인 필요';return}try{const url=new URL($('trafficURL').value.trim());if(url.protocol!=='https:'||url.username||url.password)throw Error('HTTPS 영상 주소만 지원');trafficVideo.hidden=false;trafficVideo.src=url.href;$('trafficStatus').textContent='영상 수신 시도 중 · 제공기관 연결 확인 필요';await trafficVideo.play();$('trafficStatus').textContent='영상 재생 중 · 촬영시각/실시간 여부는 제공기관 확인'}catch(e){$('trafficStatus').textContent='재생 실패 · 직접 영상 주소, 브라우저 형식 지원 및 제공기관 권한 확인'}};
trafficVideo.addEventListener('error',()=>{$('trafficStatus').textContent='영상 재생 실패 · 공식 교통영상 페이지 이용'});
