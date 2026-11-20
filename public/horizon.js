'use strict';
(()=>{
  const supported = new Set(['training']);
  let onMain=false;
  const panel = document.createElement('section');
  panel.className = 'horizon';
  panel.innerHTML = `<h3>시간대별 이동로 · CCTV 우선순위</h3>
    <p>합성 훈련 · 고정 출발점 · 가상 CCTV</p>
    <label>경과 시간 <select aria-label="경과 시간"></select></label>
    <details><summary>보행 가정</summary><label>속도 <select class="pace"><option value="500">느림 0.5km/h</option><option value="1000" selected>기본 1km/h</option><option value="1500">빠름 1.5km/h</option></select></label><label>이동 시간 비율 <select class="walking"><option>50</option><option>75</option><option selected>100</option></select>%</label><small>시나리오 설정값 · 아동 실측 통계 미적용</small></details>
    <button class="openRoute">지도에서 분석</button>
    <div class="result" hidden><p class="status" role="status"></p>
    <div class="schematic"></div><div class="rank"></div>
    <p class="basis"></p><label><input type="checkbox"> 시간 변경 시 Gemini 자동 분석에 동의</label>
    <button class="analyze">Gemini 최종 종합 분석</button><p class="ai" aria-live="polite"></p>
    <button class="closeRoute">경로 닫기</button></div>`;
  const get = selector => panel.querySelector(selector);
  const select = get('select'), consent = get('input');
  const label = m => m%60 ? (m>=60?Math.floor(m/60)+'시간 ':'')+'30분' : m/60+'시간';
  for(let m=30;m<=720;m+=30) select.add(new Option(label(m),String(m)));
  let periods, loadedConfig, active=false, pick='', objects=[], original=null, generation=0;
  const cache=new Map(), pending=new Map();
  const period=()=>periods?.find(p=>p.minutes===Number(select.value));
  function clearObjects(){for(const o of objects)o.setMap(null);objects=[]}
  function restore(){
    clearObjects();
    if(map&&original){map.setLevel(original.level);map.panTo(original.center)}
    original=null;
  }
  function close(){
    active=false;generation++;restore();get('.result').hidden=true;
    if(onMain){onMain=false;panel.remove();document.getElementById('compactState').textContent='실제 지도 · 공개 장비';window.responseView?.(currentWorkspace)}
  }
  window.horizonView=id=>{
    if(!supported.has(id)){if(onMain&&id==='intake')return;if(active)close();panel.remove();return}
    const side=document.getElementById(id);
    if(panel.parentElement!==side)side.prepend(panel);
    if(active)draw(false);
  };
  function point([x,y]){
    // Fixed exercise frame, independent of the report, device inventory and map selection.
    return new kakao.maps.LatLng(37.52+y/111000,129.10+x/88000);
  }
  function draw(fit){
    const p=period();if(!p||!active)return;
    const winner=p.rows.find(r=>r.id===pick)||p.rows[0];
    const box=get('.schematic');box.replaceChildren();clearObjects();
    const rank=get('.rank');rank.replaceChildren();
    for(const [i,r] of p.rows.entries()){
      const b=document.createElement('button');
      b.textContent=(r.tied?'공동 ':'')+r.rank+'순위　'+r.id+' · '+r.direction+'측 · '+r.distance.toLocaleString()+'m';
      b.setAttribute('aria-pressed',String(r===winner));
      b.onclick=()=>{pick=r.id;draw(false)};rank.append(b);
    }
    const span=p.start+'~'+p.minutes+'분';
    get('.basis').textContent='GIS 종합판단 · '+span+' 신규 후보 '+p.rows.length+'곳. '+'우선 후보 '+(p.rows.filter(r=>r.rank===1).map(r=>r.id).join(' · ')||'없음')+' · '+p.pace/1000+'km/h × 이동 '+p.minutes*p.walking/100+'분 · 한도 '+p.limit+'m. 분기점과 거리 조건이 같으면 공동 우선입니다.';
    get('.status').textContent=(onMain&&map?'카카오맵 · 가정 경로':'가정 검토용 경로도')+' · '+span+' · 금색은 선택 경로';
    if(!onMain||!map){
      const all=p.rows.flatMap(r=>r.path),xs=all.map(v=>v[0]),ys=all.map(v=>-v[1]);
      const minX=Math.min(0,...xs),minY=Math.min(0,...ys),width=Math.max(1,...xs)-minX,height=Math.max(1,...ys)-minY;
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
      svg.setAttribute('viewBox','0 0 280 126');svg.setAttribute('aria-label','합성 경로도');
      const xy=([x,y])=>[17+(x-minX)*220/width,12+(-y-minY)*94/height];
      for(const r of [...p.rows].sort((a,b)=>Number(a===winner)-Number(b===winner))){
        const line=document.createElementNS(ns,'polyline');line.setAttribute('points',r.path.map(v=>xy(v).join(',')).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke',r===winner?'#ffd272':'#72cfcb');line.setAttribute('stroke-width','3');svg.append(line);
        const t=document.createElementNS(ns,'text'),[x,y]=xy(r.path.at(-1));t.setAttribute('x',x);t.setAttribute('y',y+10);t.setAttribute('fill','white');t.setAttribute('font-size','9');t.textContent=r.id;svg.append(t);
      }
      box.append(svg);return;
    }
    if(!original)original={level:map.getLevel(),center:map.getCenter()};
    const bounds=kakao.maps.LatLngBounds?new kakao.maps.LatLngBounds():null;
    function pin(text,position,click,selected){
      const b=document.createElement('button');b.className='horizonPin'+(selected?' selected':'');b.textContent=text;b.onclick=click;
      objects.push(overlay(b,position,selected?22:20));
    }
    for(const [i,r] of p.rows.entries()){
      const path=r.path.map(point);for(const pos of path)bounds?.extend(pos);
      objects.push(new kakao.maps.Polyline({map,path,strokeWeight:r===winner?6:3,strokeColor:r===winner?'#ffba39':'#27b8b3',strokeOpacity:.95,zIndex:r===winner?15:13}));
      pin((r.tied?'공동 ':'')+r.rank+' · '+r.id,path.at(-1),()=>{pick=r.id;draw(false)},r===winner);
    }
    pin('훈련 출발',point([0,0]),()=>draw(true),false);
    if(fit&&p.rows.length){if(bounds&&map.setBounds)map.setBounds(bounds);else{map.setLevel(6);map.panTo(point([0,0]))}}
  }
  async function analyze(){
    const p=period(),token=++generation,msg=get('.ai');
    if(!active||!p)return;const key=[p.minutes,p.pace,p.walking].join('-');
    if(!consent.checked){msg.textContent='Gemini 분석을 실행하려면 위 전송 동의란을 선택하세요.';return}
    msg.textContent='Gemini 분석 중…';
    try{
      if(!cache.has(key)){
        if(!pending.has(key))pending.set(key,call('/api/training-brief',{case:'horizon',minutes:p.minutes,pace:p.pace,walking:p.walking,consent:true}).finally(()=>pending.delete(key)));
        cache.set(key,await pending.get(key));
      }
      const j=cache.get(key);
      if(token===generation)msg.textContent='Gemini · '+label(p.minutes)+'\n'+j.result;
    }catch(e){if(token===generation)msg.textContent='Gemini 응답 없음 · '+e.message+' · GIS 순위는 위 목록에서 확인하세요.'}
  }
  async function open(){
    const token=++generation;active=true;get('.result').hidden=false;
    get('.ai').textContent='';get('.status').textContent='합성 도로자료 로딩 중';
    try{
      const query=new URLSearchParams({pace:get('.pace').value,walking:get('.walking').value}).toString();
      if(!periods||query!==loadedConfig){
        const res=await fetch('/api/horizon?'+query);
        if(!res.ok)throw Error('가정 도로자료 조회 실패');
        const data=await res.json();if(token!==generation||!active)return;
        periods=data;loadedConfig=query;
      }
      if(token!==generation||!active)return;
      pick='';draw(true);if(consent.checked)analyze();
    }catch(e){if(token===generation)get('.status').textContent=e.message+' · 지도에서 분석을 눌러 재시도하세요.'}
  }
  get('.pace').onchange=get('.walking').onchange=select.onchange=open;get('.openRoute').onclick=open;get('.closeRoute').onclick=close;
  get('.analyze').onclick=analyze;consent.onchange=()=>{if(consent.checked)analyze();else{generation++;get('.ai').textContent=''}};
  window.openAssumedRoutes=()=>{
    showView('intake');window.pauseResponseMap?.();onMain=true;
    document.getElementById('intake').prepend(panel);
    document.getElementById('compactState').textContent='가정 시나리오 · 가상 위치';
    open();
  };
  window.horizonReady=()=>{if(active)draw(true)};
  window.horizonView(currentWorkspace);
})();
