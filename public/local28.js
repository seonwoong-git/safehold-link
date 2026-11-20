'use strict';
// Offline geographic display uses the distributed SGIS/OSM geometry. It never requests map tiles.
(()=>{
const canvas=$('localMap'),ctx=canvas.getContext('2d');
let roads=[],districts=[],lat=37.514,lon=129.065,extent=.245,marks=[],frame,drag=null;
const flags=command.layers;
function size(){return [canvas.clientWidth,canvas.clientHeight]}
function project(y,x){const [w,h]=size();return [w/2+(x-lon)*Math.cos(lat*Math.PI/180)*h/extent,h/2-(y-lat)*h/extent]}
function path(points,closed=false){if(!points.length)return;ctx.beginPath();points.forEach(([x,y],i)=>{const p=project(y,x);if(i)ctx.lineTo(...p);else ctx.moveTo(...p)});if(closed)ctx.closePath()}
function dot(y,x,r,color,fill=true){const p=project(y,x);ctx.beginPath();ctx.arc(...p,r,0,2*Math.PI);ctx.strokeStyle=color;ctx.fillStyle=color;if(fill)ctx.fill();else ctx.stroke();return p}
function paint(){
 if(map||!canvas.isConnected)return;const [w,h]=size();if(!w||!h)return;
 const scale=devicePixelRatio||1;canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);ctx.scale(scale,scale);
 ctx.fillStyle='#102533';ctx.fillRect(0,0,w,h);
 ctx.lineWidth=1;
 for(const f of districts){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const poly of polygons){path(poly[0],true);const count=data?.districts.find(d=>d.name===f.properties.name)?.cctv_public_aggregate||0;ctx.fillStyle=flags.areaLayer?'hsl(172,30%,'+(17+Math.min(30,count/15))+'%)':'#1c323d';ctx.fill();if(flags.boundary){ctx.strokeStyle='#59707b';ctx.stroke()}}}
 if(flags.roadLayer)for(const r of roads){path(r.path);ctx.strokeStyle=['footway','path','steps','pedestrian','cycleway'].includes(r.type)?'#4f998d':'#68777a';ctx.lineWidth=.7;ctx.stroke()}
 const m=window.commandMetrics?.();
 if(command.layers.area&&m){ctx.lineWidth=2;dot(...m.center,m.radius_m*h/(111195*extent),'#ffca78',false)}
 marks=[];const groups=window.regionalAssetGroups?.()||[];
 if(command.layers.assets){const cells=new Map();
 for(const g of groups){const [x,y]=project(g.lat,g.lon);const k=extent<.035?g.lat+','+g.lon:Math.floor(x/24)+','+Math.floor(y/24);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(g)}
 for(const list of cells.values()){const g=list[0],picked=list.some(a=>a.records.includes(command.asset));let color=command.layers.work&&list.some(g=>g.priority)?'#ffbf69':command.layers.work&&list.some(g=>g.status!=='unknown')?'#68dcac':'#bbccd1';const [x,y]=dot(g.lat,g.lon,list.length>1?8:4,color);if(picked)dot(g.lat,g.lon,11,'white',false);if(list.length>1){ctx.fillStyle='#14303f';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(list.length,x,y+3)}marks.push({x,y,action(){if(list.length>1){extent*=.45;lat=g.lat;lon=g.lon;schedule()}else{window.selectAssetRecord(g.records[0]);if(currentWorkspace!=='assets')showView('intake')}}})}}
 if(flags.cctvLayer&&data){ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillStyle='white';for(const d of data.districts){const [x,y]=project(...data.district_label_centers[d.name]);ctx.fillText(d.name+' '+d.cctv_public_aggregate+'대',x,y)}}
 if(command.layers.its)for(const c of window.trafficSources?.()||[]){const [x,y]=project(c.lat,c.lon);ctx.fillStyle='#51aff5';ctx.fillRect(x-5,y-5,10,10);if(command.camera===c)dot(c.lat,c.lon,10,'white',false);marks.push({x,y,action:()=>window.openTrafficCamera(c)})}
}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(paint)}
window.renderLocal=schedule;window.locateLocal=(y,x)=>{lat=y;lon=x;extent=.045;schedule()};
canvas.onwheel=e=>{e.preventDefault();extent=Math.max(.006,Math.min(.65,extent*(e.deltaY>0?1.3:.77)));schedule()};
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,lat,lon}};
canvas.onpointermove=e=>{if(!drag)return;lat=drag.lat+(e.clientY-drag.y)*extent/canvas.clientHeight;lon=drag.lon-(e.clientX-drag.x)*extent/(canvas.clientHeight*Math.cos(lat*Math.PI/180));schedule()};
canvas.onpointerup=e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5){const box=canvas.getBoundingClientRect();[...marks].reverse().find(m=>Math.hypot(m.x-(e.clientX-box.left),m.y-(e.clientY-box.top))<11)?.action()}drag=null};
canvas.onpointercancel=()=>drag=null;
for(const id of ['roadLayer','boundary','cctvLayer','areaLayer']){const b=$(id);b.disabled=false;setButton(id,flags[id]);b.addEventListener('click',e=>{if(map)return;e.stopImmediatePropagation();flags[id]=!flags[id];setButton(id,flags[id]);schedule()},true)}
new ResizeObserver(schedule).observe(canvas);
Promise.all([fetch('/roads.json').then(r=>r.json()),fetch('/data.json').then(r=>r.json())]).then(([r,d])=>{roads=r;districts=d.boundaries;schedule()}).catch(()=>$('mapModeNotice').textContent='로컬 공간자료 로딩 실패');
new MutationObserver(()=>{$('feedState').textContent='ITS '+(window.trafficInventoryCount?.()||0)+'건'}).observe($('deckCount'),{childList:true});
})();
