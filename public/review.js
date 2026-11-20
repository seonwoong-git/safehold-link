'use strict';
// City infrastructure context uses fixed district reference points, never a person's location, speed or route.
(()=>{
let roads=null,drawn=[],visible=true,view='intake',signature='',lastDistrict='',distanceOn=false,videoLabel='ITS 동해권 영상: 미조회';
const radius=()=>Number($('reviewRadius').value);
window.reviewRadiusValue=radius;
let memoKey='',memo=null;
function evidence(){if(!chosen||!context||!roads)return null;const center=[chosen.lat,chosen.lon],r=radius(),key=JSON.stringify([center,r]);if(key===memoKey)return memo;const sx=Math.PI/180*6371008.8*Math.cos(center[0]*Math.PI/180),sy=Math.PI/180*6371008.8,foot=new Set(['footway','path','pedestrian','steps','cycleway']);let total=0,walk=0,count=0;for(const f of roads){let length=0;for(let i=1;i<f.path.length;i++){const a=f.path[i-1],b=f.path[i],x=(a[0]-center[1])*sx,y=(a[1]-center[0])*sy,dx=(b[0]-center[1])*sx-x,dy=(b[1]-center[0])*sy-y,A=dx*dx+dy*dy;if(!A)continue;const B=2*(x*dx+y*dy),C=x*x+y*y-r*r,D=B*B-4*A*C;if(D<=0)continue;const t1=Math.max(0,(-B-Math.sqrt(D))/(2*A)),t2=Math.min(1,(-B+Math.sqrt(D))/(2*A));length+=Math.max(0,t2-t1)*Math.sqrt(A);}if(length>0){count++;total+=length;if(foot.has(f.type))walk+=length;}} memoKey=key;return memo={district:context.name,center,radius_m:r,area_km2:+(Math.PI*(r/1000)**2).toFixed(3),osm_road_km:+(total/1000).toFixed(2),osm_foot_tag_km:+(walk/1000).toFixed(2),osm_feature_count:count};}
window.reviewEvidence=evidence;
function remove(){drawn.forEach(x=>x.setMap(null));drawn=[];signature='';}
function addMetric(label,value){$('mapMetrics').append(metric(label,value));}
function reflect(){
 const e=evidence(),b=$('mapBriefResult');$('mapSynthesis').disabled=$('synthesize').disabled||!e;
 $('mapBriefStatus').textContent=$('briefStatus').textContent;
 b.textContent=$('briefResult').textContent||(e?'지리 분석 완료 · AI 종합 분석을 실행하세요.':'공개 장소를 선택하면 실제 행정동 및 도로환경을 연결합니다.');
}
function refresh(force=false){
 const e=evidence(),inTraffic=false;$('mapBrief').hidden=inTraffic;$('reviewBar').hidden=inTraffic||!e;
 $('mapMetrics').replaceChildren();if(e){addMetric('행정동',e.district);addMetric('검토 범위',e.radius_m+'m');addMetric('선택 반경 안 도로 총연장',e.osm_road_km.toFixed(2)+'km');addMetric('선택 반경 안 보행 관련 선형',e.osm_foot_tag_km.toFixed(2)+'km');addMetric('CCTV · 동 전체',fmt(context.cctv_public_aggregate)+'대');$('reviewLabel').textContent=chosen.name+' 중심 · 환경 범위';}
 else{addMetric('공간 결합','대기');addMetric('CCTV 설치','동 전체 집계');}
 $('mapVideoStatus').textContent=videoLabel;reflect();
 if(!map||!e||inTraffic||!visible){remove();if(!e)lastDistrict='';return;}
 const dist=Math.round(Number($("distanceMinutes").value)*Number($("distanceSpeed").value)*1000/60);$("distanceValue").textContent=fmt(dist)+"m";const sig=JSON.stringify([e.center,e.radius_m]);if(!force&&sig===signature)return;remove();
 const center=new kakao.maps.LatLng(...e.center);
 if(kakao.maps.Circle){drawn.push(new kakao.maps.Circle({map,center,radius:e.radius_m,strokeWeight:3,strokeColor:'#55cfff',strokeOpacity:1,strokeStyle:'solid',fillColor:'#55cfff',fillOpacity:.13,zIndex:8}));}
 else{const points=[];for(let i=0;i<=96;i++){const t=2*Math.PI*i/96;points.push(new kakao.maps.LatLng(e.center[0]+e.radius_m*Math.sin(t)/111195,e.center[1]+e.radius_m*Math.cos(t)/(111195*Math.cos(e.center[0]*Math.PI/180))))}drawn.push(new kakao.maps.Polygon({map,path:points,strokeWeight:3,strokeColor:'#55cfff',strokeOpacity:1,fillColor:'#55cfff',fillOpacity:.13}));}
 const label=node('span','공개 장소 환경 범위 · '+e.radius_m+'m','review-pin place-circle-label');drawn.push(overlay(label,center,9));signature=sig;
 if(view==='intake'&&lastDistrict!==e.center.join(',')){lastDistrict=e.center.join(',');fit(e);}
}
function fit(e){if(!map||!e)return;if(kakao.maps.LatLngBounds&&map.setBounds){const b=new kakao.maps.LatLngBounds(),dy=e.radius_m/111195,dx=dy/Math.cos(e.center[0]*Math.PI/180);b.extend(new kakao.maps.LatLng(e.center[0]-dy,e.center[1]-dx));b.extend(new kakao.maps.LatLng(e.center[0]+dy,e.center[1]+dx));if(chosen)b.extend(new kakao.maps.LatLng(chosen.lat,chosen.lon));map.setBounds(b,36,36,36,36);}else{map.setLevel(e.radius_m>=1500?7:6);map.panTo(new kakao.maps.LatLng(...e.center));}}
window.refreshReview=refresh;window.reviewViewChanged=id=>{view=id;refresh()};window.reviewVideoStatus=s=>{videoLabel=s;refresh()};
$('reviewRadius').onchange=()=>{invalidateBrief();refresh(true);if(visible)fit(evidence())};
$('reviewToggle').onclick=()=>{visible=!visible;setButton('reviewToggle',visible);refresh(true)};
$('reviewFocus').onclick=()=>{const e=evidence();if(!map||!e)return;fit(e);};
$('distanceToggle').onclick=()=>showView('training');for(const id of ['distanceMinutes','distanceSpeed'])$(id).onchange=()=>refresh(true);
$('mapSynthesis').onclick=()=>$('synthesize').click();
const observer=new MutationObserver(reflect);for(const id of ['briefStatus','briefResult'])observer.observe($(id),{childList:true,subtree:true,characterData:true});observer.observe($('synthesize'),{attributes:true,attributeFilter:['disabled']});
fetch('/roads.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(r=>{roads=r;refresh()}).catch(()=>{$('mapBriefResult').textContent='지역환경 검토 자료를 읽지 못했습니다. ZIP 전체 압축 해제 필요.'});
})();
