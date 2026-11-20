'use strict';
(()=>{
const E=id=>document.getElementById(id);let pins=[],area=[],regions={},listenerMap=null,drawTimer=null,regionRun=0,regionAI=null;
const mapBrief=E('mapBrief');
window.overviewResourceActive=()=>mapViews.has(currentWorkspace);
window.regionalITSVisible=()=>command.layers.its;
const clear=a=>{a.forEach(x=>x.setMap(null));a.length=0};
function eligible(){return Boolean(map)}
function metrics(){const r=regions[E('regDistrict').value],m=r?.metrics[E('regRadius').value];return r&&m?{district:E('regDistrict').value,center:r.center,...m}:null}
function regionalMetrics(reset=true){const m=metrics();E('regMetrics').replaceChildren();if(!m)return;for(const [a,b] of [['환경 범위',fmt(m.radius_m)+'m'],['도로 선형',m.osm_road_km.toFixed(2)+'km'],['보행 선형',m.osm_foot_tag_km.toFixed(2)+'km']]){let d=node('div');d.append(node('small',a),node('b',b));E('regMetrics').append(d)}if(reset){regionRun++;regionAI=null;command.snapshot={id:'GIS-'+Date.now().toString(36)+'-'+regionRun,time:new Date().toISOString(),metrics:m};E('snapshotTime').textContent=command.snapshot.id+' · '+new Date().toLocaleTimeString('ko-KR');E('regResult').textContent=`${m.district} 기준점 · 도로 ${m.osm_feature_count}개 선형 교차.\n근거 · OSM 도로망과 행정동 대표점 기준.\n추가 확인 · 현장 통행 여부 및 자료 기준일.`}}
function selectGroup(g){window.selectAssetRecord(g.records[0]);if(currentWorkspace!=='assets')showView('intake')}
function selectedDetails(){
 const r=command.asset,sel=E('regRecordSelect');sel.hidden=!r;E('regAssetDetails').disabled=!r;
 if(!r){E('regRecordInfo').textContent='';E('regAssetInfo').textContent='설치점을 선택하면 원본 장비와 확인 상태가 표시됩니다.';return}
 const group=window.regionalAssetGroups().find(g=>g.records.includes(r));
 const records=group?.records||[r];
 sel.replaceChildren(...records.map(x=>new Option('#'+x.record+' · '+x.purpose,String(x.record))));
 sel.value=String(r.record);sel.onchange=()=>window.selectAssetRecord(records.find(x=>String(x.record)===sel.value));
 const w=window.assetWorkflow(r);
 E('regAssetInfo').textContent=r.district+' · '+r.count+'대 · '+r.purpose+' · '+({requested:'확인 요청',received:'자료 확보',done:'검토 완료'}[w.status]||'업무 미확인');
 E('regRecordInfo').textContent=[r.asset_id,r.agency,r.resolution?r.resolution+'만 화소':'화소 미기재',r.retention?r.retention+'일':'보관일수 미기재',r.date,w.operating||'운영 미확인',w.owner,w.updated].filter(Boolean).join(' · ');
}
E('regAssetDetails').onclick=()=>window.openRegionalAsset(command.asset);
function drawAssets(){clear(pins);if(!eligible()||!E('regAssets').checked)return;const groups=window.regionalAssetGroups?.()||[],level=map.getLevel?.()||6;const cells=new Map();const step=level>=7?0.012:level===6?0.006:level===5?0.0025:0;for(const g of groups){const key=step?Math.floor(g.lat/step)+','+Math.floor(g.lon/step):g.lat+','+g.lon;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(g)}for(const list of cells.values()){const g=list[0],count=list.reduce((n,x)=>n+x.count,0);const b=node('button',list.length>1?`${list.length}곳 · ${count}대`:`▣ ${count}`,'asset-pin '+(list.some(x=>x.priority)?'high':list.some(x=>x.status==='requested')?'requested':list.some(x=>x.status==='done')?'done':'unknown'));if(!command.layers.work)b.className='asset-pin unknown';if(list.some(g=>g.records.includes(command.asset)))b.classList.add('picked');b.title=list.length>1?'설치점 묶음 · 클릭해 확대':'공개 장비 위치 · 클릭해 장비정보 확인';b.onclick=()=>{if(list.length>1){map.setLevel(Math.max(3,level-2));map.panTo(new kakao.maps.LatLng(g.lat,g.lon));drawAssets()}else selectGroup(g)};const center=new kakao.maps.LatLng(list.reduce((n,x)=>n+x.lat,0)/list.length,list.reduce((n,x)=>n+x.lon,0)/list.length);pins.push(overlay(b,center,6))}}
function drawArea(){clear(area);const m=metrics();if(!eligible()||!m||!E('regArea').checked)return;const p=new kakao.maps.LatLng(...m.center);if(kakao.maps.Circle)area.push(new kakao.maps.Circle({map,center:p,radius:m.radius_m,strokeColor:'#f3c16d',strokeWeight:2,strokeOpacity:1,fillColor:'#f3c16d',fillOpacity:.08,zIndex:2}));else{const path=[];for(let i=0;i<=64;i++){let t=i*Math.PI/32;path.push(new kakao.maps.LatLng(m.center[0]+m.radius_m*Math.sin(t)/111195,m.center[1]+m.radius_m*Math.cos(t)/(111195*Math.cos(m.center[0]*Math.PI/180))))}area.push(new kakao.maps.Polygon({map,path,strokeColor:'#f3c16d',strokeWeight:2,strokeOpacity:1,fillColor:'#f3c16d',fillOpacity:.08}))}area.push(overlay(node('span',m.district+' 환경 검토 · '+fmt(m.radius_m)+'m','review-pin'),p,8))}
function fit(){const m=metrics();if(!eligible()||!m)return;const [y,x]=m.center,dy=m.radius_m/111195,dx=dy/Math.cos(y*Math.PI/180);if(kakao.maps.LatLngBounds&&map.setBounds){let b=new kakao.maps.LatLngBounds();b.extend(new kakao.maps.LatLng(y-dy,x-dx));b.extend(new kakao.maps.LatLng(y+dy,x+dx));map.setBounds(b,30,30,30,30)}else{map.setLevel(5);map.panTo(new kakao.maps.LatLng(y,x))}drawAssets()}
function draw(){selectedDetails();window.renderLocal?.();if(!eligible())return;drawAssets();drawArea();window.drawTrafficDeck?.();if(listenerMap!==map){listenerMap=map;kakao.maps.event.addListener(map,'zoom_changed',()=>{if(!eligible())return;clearTimeout(drawTimer);drawTimer=setTimeout(drawAssets,80)})}}
function update(){const a=window.overviewAssetSummary?.();E('ovSites').textContent=a?.sites.length?fmt(a.sites.length)+'개':'—';E('ovCount').textContent=a?.count?fmt(a.count)+'대':'—';E('ovTraffic').textContent=fmt(window.trafficInventoryCount?.()||0)+'건';draw()}
window.refreshAssetLayer=()=>{selectedDetails();drawAssets();window.renderLocal?.()};
window.updateOverview=update;window.updateOverviewMap=draw;
E('overviewReport').onclick=()=>{showView('intake');E('reportFold').open=true;E('report').focus()};
E('overviewResources').onclick=()=>{showView('training');if(currentWorkspace==='training')E('labPlay').click()};
for(const [id,key] of [['regAssets','assets'],['regITS','its'],['regArea','area'],['regWork','work']]){
 E(id).onchange=()=>{command.layers[key]=E(id).checked;
  if(key==='its')window.drawTrafficDeck();else if(key==='area')drawArea();else drawAssets();
  window.renderLocal?.();
 };
}
for(const id of ['regRadius','regDistrict'])E(id).onchange=()=>{regionalMetrics();drawArea();window.renderLocal?.()};
E('regFocus').onclick=()=>{if(map)fit();else if(metrics())window.locateLocal?.(...metrics().center)};
E('overviewFetch').onclick=()=>{if(!E('overviewConsent').checked){E('overviewFeedStatus').textContent='제공기관 이용조건 확인 후 조회하세요.';return}E('itsConsent').checked=true;E('itsRoad').value='its';E('itsTest').click()};
E('regAI').onclick=async()=>{const m=metrics();if(!m)return;const seq=++regionRun;regionAI=null;E('regAI').disabled=true;E('regResult').textContent='Gemini 지역환경 요약 요청 중…';try{const r=await call('/api/regional-brief',{district:m.district,radius:m.radius_m,consent:true});if(seq===regionRun){regionAI=r;E('regResult').textContent='Gemini · '+r.model+'\n'+r.result;}}catch(e){if(seq===regionRun)E('regResult').textContent='AI 호출 실패 · '+e.message+' / GIS 계산은 유지';}finally{E('regAI').disabled=false}};
E('regPrint').onclick=()=>{const m=metrics();if(!m)return;const w=window.open('','_blank');if(!w)return;const doc=w.document;doc.title='SafeHold LINK · 지역 환경 검토';const body=doc.body;body.style.cssText='font-family:system-ui;padding:32px;max-width:760px;margin:auto;line-height:1.7';for(const [t,v] of [['h1','SafeHold LINK | 지역환경 검토'],['p',new Date().toLocaleString('ko-KR')],['h2',m.district+' · '+fmt(m.radius_m)+'m'],['p','도로 선형 '+m.osm_road_km+'km / 보행 관련 '+m.osm_foot_tag_km+'km / 교차 선형 '+m.osm_feature_count+'개'],['p','자료: SGIS / OSM · '+command.snapshot.id],['p','담당자 확인 기록: '+JSON.stringify(window.assetWorkReport())],['h2','AI 요약'],['p',regionAI?.result||'실제 AI 미실행'],['p','공개 설치정보는 가용성이나 개인의 위치 예측이 아닙니다.']]){const e=doc.createElement(t);e.textContent=v;e.style.whiteSpace='pre-wrap';body.append(e)}w.print()};E('regExport').onclick=()=>{const m=metrics();if(!m)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify({mode:'independent_regional_review',snapshot:command.snapshot,source:'SGIS / OSM / review_areas.json',operator:window.assetWorkReport(),metrics:m,ai:regionAI,public_video_count:window.trafficInventoryCount?.()||0,note:'개인 동선/실시간 가용성 아님'},null,2)],{type:'application/json'}));a.href=u;a.download='SafeHold_V30_regional_review.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),500)};
window.overviewViewChanged=id=>{
 const yes=id==='intake';document.body.classList.toggle('overviewActive',yes);E('overviewControls').hidden=!yes;
 E('overviewTrafficControls').hidden=false;E('sharedMapTabs').hidden=true;
 E('regionalLayers').hidden=false;E('regPanel').hidden=false;E('reportFold').open=!!chosen&&yes;
 E('briefDock').append(mapBrief);E('multiDeck').hidden=false;
 E('overviewScope').textContent='운영 · 공개 인프라';requestAnimationFrame(()=>{map?.relayout?.();window.renderLocal?.()});
};
new MutationObserver(()=>E('overviewFeedStatus').textContent=E('itsStatus').textContent+' · 운영상태 미확인').observe(E('itsStatus'),{childList:true,subtree:true,characterData:true});
fetch('/review_areas.json').then(r=>r.json()).then(r=>{regions=r;for(const k of Object.keys(r))E('regDistrict').append(new Option(k,k));regionalMetrics();draw()}).catch(()=>E('regResult').textContent='지역 환경 자료 읽기 실패');
window.commandMetrics=metrics;window.overviewDiagnostics=()=>({resourcePins:pins.length,environmentPins:area.length,traffic:window.trafficInventoryCount?.()||0});window.overviewViewChanged(currentWorkspace);
E('foldDeck').onclick=()=>{const grid=E('multiGrid');grid.hidden=!grid.hidden;E('foldDeck').textContent=grid.hidden?'창 펼치기':'창 접기';E('foldDeck').setAttribute('aria-expanded',String(!grid.hidden));map?.relayout?.()};
})();
