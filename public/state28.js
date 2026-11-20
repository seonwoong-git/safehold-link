'use strict';
const command={build:'32.1',traffic:{inventory:[],clips:[]},view:'intake',asset:null,camera:null,snapshot:null,layers:{assets:true,its:true,area:true,work:true,roadLayer:true,boundary:true,cctvLayer:false,areaLayer:false,trafficLayer:false}};
fetch('/api/status',{cache:'no-store'}).then(r=>r.json()).then(r=>{
 const ok=r.build===command.build;
 document.getElementById('buildState').textContent=ok?'V32 · 서버 일치':'버전 불일치 · V32 서버 재실행';
 if(!ok)document.body.classList.add('versionMismatch');
}).catch(()=>document.getElementById('buildState').textContent='서버 연결 실패');
