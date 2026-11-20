'use strict';
(()=>{
  const byId=id=>document.getElementById(id);
  const desk=window.caseDesk30;
  const card=document.createElement('section');
  card.className='responseCard';
  card.innerHTML=`<h2>시간대별 대응 계획</h2>
    <div class="planFields"><label>점검 시간<select class="when"></select></label>
    <label>대응 거점<select class="post"><option value="">거점 선택</option></select></label></div>
    <p class="planStatus" role="status"></p><div class="sites"></div>
    <div class="planActions" hidden><button class="savePost">거점 지정</button>
    <button class="requestSite">선택 장비 확인 요청</button><button class="summarize">AI 종합 판단</button></div><p class="answer" aria-live="polite"></p>`;
  const el=selector=>card.querySelector(selector);
  const when=el('.when'),post=el('.post'),sites=el('.sites'),status=el('.planStatus'),answer=el('.answer');
  const slots=()=>new Map(desk.read().timeline.filter(e=>e.kind==='대응 거점 지정').map(e=>[e.minutes,e.district]));
  const timeLabel=m=>[Math.floor(m/60)?Math.floor(m/60)+'시간':'',m%60?'30분':''].filter(Boolean).join(' ');
  for(let m=30;m<=720;m+=30)when.add(new Option(timeLabel(m),String(m)));
  const available=new Set(['intake','assets','brief']);
  let current=null,markers=[],seq=0,selection=0,aiSeq=0;
  const cache=new Map(),aiCache=new Map();
  function clear(){for(const obj of markers)obj.setMap(null);markers=[]}
  async function load(district,minutes){
    const key=district+'-'+minutes;
    if(!cache.has(key)){
      const res=await fetch('/api/response-plan?'+new URLSearchParams({district,minutes}));
      if(!res.ok)throw Error('장비대장을 불러오지 못했습니다.');
      cache.set(key,await res.json());
    }
    return cache.get(key);
  }
  function selectSite(i){
    selection=i;draw(false);
    if(current?.sites[i]&&map)map.panTo(new kakao.maps.LatLng(...current.sites[i].coords));
  }
  const siteKey=s=>'site-'+current.minutes+'-'+s.records[0];
  function siteState(s){return desk.read().tasks.find(t=>t.id===siteKey(s))}
  function updateRequests(){
    const site=current?.sites[selection],task=site&&siteState(site),b=el('.requestSite');
    b.disabled=!site||!!task;b.textContent=task?(task.answered?'회신 완료 · '+task.reply:'장비 확인 요청됨'):'선택 장비 확인 요청';
  }
  window.updateSiteRequests32=()=>{aiSeq++;aiCache.clear();answer.textContent='';if(current)draw(false)};
  el('.requestSite').onclick=()=>{const s=current?.sites[selection];if(s)desk.save('배정',{text:timeLabel(current.minutes)+' '+current.district+' 장비 #'+s.records[0]+' 운영·자료 보존 여부 확인',owner:'관제 담당',record:s.records[0],minutes:current.minutes},siteKey(s))};
  function draw(fit){
    clear();sites.replaceChildren();if(!current||!available.has(currentWorkspace))return;
    const shown=current.sites.slice(0,5);updateRequests();
    for(const [i,s] of shown.entries()){
      const b=node('button',(i+1)+'　대장 #'+s.records[0]+'　·　'+s.meters+'m　·　'+s.count+'대'+(siteState(s)?' · '+siteState(s).state:''));
      b.setAttribute('aria-pressed',String(i===selection));b.onclick=()=>selectSite(i);sites.append(b);
    }
    if(card.hidden||!map)return;
    const xy=c=>new kakao.maps.LatLng(...c);
    const pins=[xy(current.center)];
    function pin(text,position,selected,click){
      const b=node('button',text,'horizonPin'+(selected?' selected':''));b.onclick=click;
      markers.push(overlay(b,position,selected?28:24));
    }
    pin('대응 거점 · '+current.district,pins[0],false,()=>draw(true));
    shown.forEach((s,i)=>{const pos=xy(s.coords);pins.push(pos);pin((i+1)+' · #'+s.records[0],pos,i===selection,()=>selectSite(i))});
    const previous=current.previous;
    if(previous&&previous.district!==current.district){
      const start=xy(previous.center);pins.push(start);
      markers.push(new kakao.maps.Polyline({map,path:[start,pins[0]],strokeStyle:'shortdash',strokeColor:'#ffcc68',strokeWeight:4,zIndex:12}));
      pin('이전 거점 · '+previous.district,start,false,()=>draw(true));
    }
    if(fit){
      if(kakao.maps.LatLngBounds&&map.setBounds){
        const bounds=new kakao.maps.LatLngBounds();pins.forEach(pos=>bounds.extend(pos));map.setBounds(bounds);
      }else{map.setLevel(5);map.panTo(pins[0])}
    }
  }
  async function refresh(fit=true){
    const run=++seq;aiSeq++;current=null;selection=0;clear();sites.replaceChildren();answer.textContent='';
    el('.planActions').hidden=true;
    if(!post.value){status.textContent='이 시간에 점검할 거점을 선택하세요.';return}
    status.textContent='주변 설치점 조회 중…';
    try{
      const minutes=Number(when.value),district=post.value,p=await load(district,minutes);
      const prior=[...slots()].filter(([m])=>m<minutes).sort((a,b)=>b[0]-a[0])[0];
      const previous=prior?await load(prior[1],prior[0]):null;
      if(run!==seq)return;
      current={...p,previous};
      status.textContent=(previous?previous.district+' → ':'')+district+' 대표점 · 반경 1km · '+p.sites.length+'곳 · 가까운 순 상위 5곳'+(previous?' · 점선은 거점 간 계획선':'');
      if(!p.sites.length)status.textContent+=' · 대장 기준 '+p.date+' · 행정동 전체 설치 수와 다를 수 있습니다.';
      el('.planActions').hidden=false;answer.textContent=aiCache.get(district+'-'+minutes)||'';
      draw(fit);
    }catch(e){if(run===seq)status.textContent=e.message}
  }
  post.onchange=()=>refresh();when.onchange=()=>{post.value=slots().get(Number(when.value))||'';refresh()};
  el('.savePost').onclick=()=>{
    if(!current)return;
    if(desk.save('대응 거점 지정',{minutes:current.minutes,district:current.district,text:timeLabel(current.minutes)+' · '+current.district+' 대표점'}))status.textContent+=' · 사건에 저장됨';
  };
  el('.summarize').onclick=async()=>{
    if(!current)return;
    const token=++aiSeq,key=current.district+'-'+current.minutes;
    const state=desk.read(),i=state.intake;const evidence={hasTime:!!i.observed,hasSource:!!i.source,hasWitness:!!i.witness,assigned:state.tasks.length,replied:state.tasks.filter(t=>t.answered).length};
    answer.textContent='공개 장비 집계로 Gemini 분석 중…';
    try{
      const j=await call('/api/training-brief',{case:'response-post',minutes:current.minutes,district:current.district,evidence,consent:true});
      const text='Gemini · '+j.result;aiCache.set(key,text);if(token===aiSeq)answer.textContent=text;
    }catch(e){if(token===aiSeq)answer.textContent='Gemini · '+e.message+'　위 목록은 GIS 거리 계산 결과입니다.'}
  };
  window.pauseResponseMap=()=>{clear();card.hidden=true};
  window.responseMapReady=()=>{if(!card.hidden)draw(true)};
  window.responseView=id=>{
    byId('trafficDrawer').open=id==='trafficDesk';
    if(available.has(id)){card.hidden=false;byId(id).prepend(card);draw(false)}
    else clear();
  };
  const assume=node('button','가정 경로 보기');assume.onclick=()=>window.openAssumedRoutes();byId('layerDrawer').before(assume);
  window.responseView(currentWorkspace);
  fetch('/api/response-posts').then(r=>{if(!r.ok)throw Error();return r.json()}).then(names=>{
    for(const name of names)post.add(new Option(name,name));
    post.value=slots().get(Number(when.value))||'';refresh(false)
  }).catch(()=>status.textContent='대응 거점 자료 로드 실패 · 서버 연결을 확인하세요.');
})();
