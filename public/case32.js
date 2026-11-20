'use strict';
(()=>{
  const desk=window.caseDesk30, e=id=>document.getElementById(id);
  const box=document.createElement('section');box.className='caseVerdict';
  box.innerHTML='<h3>사건 종합판단</h3><div class="times32"></div><p class="finding32"></p><p class="priority32"></p><div class="progress32"></div><button class="place32">장소 검색</button> <button class="assign32">우선 확인 업무 등록</button>';
  const card=document.querySelector('.responseCard');card.prepend(box);
  const short=t=>t?t.replace('T',' ').slice(5,16):'미확인';
  const hh=t=>t?t.slice(11,16):'미확인';
  const taskKey=i=>'source-'+i.id;
  function findings(){
    const {intake:i,tasks}=desk.read();if(!i.id)return ['접수 대기'];
    const mins=(new Date(i.reported)-new Date(i.observed))/60000;
    const direct=[i.source||'출처 미입력',i.place||'장소 미확인',short(i.observed)].join(' · ');
    const pending=tasks.find(t=>!t.answered);
    const priority=!i.observed||!i.place?'마지막 확인 시각과 장소 확인':!i.source?'마지막 확인 출처 확인':i.witness?'추가 진술의 관찰 위치와 동일인 여부 확인':'추가 목격 여부 확인';
    const assigned=tasks.find(t=>t.intakeKey===taskKey(i));
    return ['마지막 확인 근거 · '+direct,'접수 '+short(i.reported)+(Number.isFinite(mins)&&mins>=0?' · 마지막 확인 후 약 '+mins+'분':''),
      i.witness?'추가 제보 · '+hh(i.witnessAt)+' '+i.witness:'추가 제보 없음',
      assigned?.answered?'확인 회신 · '+assigned.reply:'우선 확인 · '+priority,
      pending?'미조치 · '+pending.owner+' / '+pending.text:'미조치 업무 없음'];
  }
  window.caseFindings32=findings;
  function clockLabels(){
    const i=desk.read().intake;
    for(const opt of card.querySelector('.when').options){
      const m=Number(opt.value),dt=new Date(i.observed);
      const label=(Math.floor(m/60)?Math.floor(m/60)+'시간':'')+(m%60?' 30분':'');
      if(Number.isFinite(+dt)){
        dt.setMinutes(dt.getMinutes()+m);
        const next=dt.getDate()!==new Date(i.observed).getDate()?'다음날 ':'';
        opt.textContent=label.trim()+' · '+next+dt.toTimeString().slice(0,5);
      }else opt.textContent=label.trim();
    }
  }
  function render(){
    const {intake:i,tasks,timeline}=desk.read(),f=findings();clockLabels();
    const strip=box.querySelector('.times32');strip.replaceChildren();
    if(i.id)for(const [title,time] of [['마지막 확인',i.observed],['추가 제보',i.witnessAt],['신고 접수',i.reported]]){
      const n=node('div');n.append(node('small',title),node('strong',hh(time)));strip.append(n)}
    box.querySelector('.finding32').textContent=i.id?f.slice(0,3).join('\n'):'신고를 저장하면 확인 근거와 다음 조치가 표시됩니다.';
    box.querySelector('.priority32').textContent=i.id?f[3]:'';
    const done=tasks.filter(t=>t.answered).length;
    box.querySelector('.progress32').textContent=tasks.length?'업무 회신 '+done+'/'+tasks.length+'건 · '+Math.round(done/tasks.length*100)+'%':'배정 업무 없음';
    box.querySelector('.place32').hidden=!i.place;
    const b=box.querySelector('.assign32');b.hidden=!i.id;b.disabled=tasks.some(t=>t.intakeKey===taskKey(i));
    b.textContent=b.disabled?'우선 확인 업무 등록됨':'우선 확인 업무 등록';
    const list=e('meetingItems');list.replaceChildren();
    for(const item of timeline.filter(x=>['회의 안건','메모보고'].includes(x.kind)).reverse()){
      const d=document.createElement('details');d.append(node('summary',item.kind+' · '+item.title),node('p',item.text));
      const draft=node('button','결과보고 기안');draft.onclick=()=>{e('openDocs').click();e('docTitle').value=item.title+' 결과보고';e('docBody').value=[item.text,...findings(),...tasks.map(t=>t.owner+' · '+t.text+' · '+(t.reply||t.state))].join('\n')};d.append(draft);list.append(d);
    }
    window.updateSiteRequests32?.();
  }
  box.querySelector('.place32').onclick=()=>{
    const place=desk.read().intake.place||'';showView('intake');e('reportFold').open=true;
    e('query').value=place.replace(/\s*정문\s*앞$/,'');e('query').focus();
    if(!e('search').disabled)e('search').click();
    else {e('layerDrawer').open=e('mapSettings').open=true;e('mapKey').focus();e('saveNote').textContent='카카오맵 연결 후 장소 검색을 누르세요.'}
  };
  box.querySelector('.assign32').onclick=()=>{const i=desk.read().intake;if(i.id)desk.save('배정',{text:findings()[3],owner:'상황실',intakeKey:taskKey(i)},taskKey(i))};
  function store(kind){
    const title=e('memoTitle').value.trim(),body=e('memoBody').value.trim();
    if(!title||!body){e('memoNotice').textContent='제목과 검토 내용을 입력하세요.';return}
    if(desk.save(kind,{title,text:body})){e('memoTitle').value=e('memoBody').value='';e('memoNotice').textContent=kind+' 저장 완료'}
  }
  e('memoSave').onclick=()=>store('메모보고');e('agendaSave').onclick=()=>store('회의 안건');e('meetingLedger').onclick=()=>e('openDocs').click();
  window.updateCase32=render;render();
})();
