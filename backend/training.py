"""Fictional training graph only. No actual coordinates or real resource identifiers."""
NODES={'O':[320,210],'N':[320,95],'NE':[485,95],'E':[485,210],'SE':[485,325],'S':[320,325],'SW':[155,325],'W':[155,210],'NW':[155,95],'X':[580,210]}
EDGES=[('O','N',230),('O','E',330),('O','S',230),('O','W',330),('N','NE',330),('N','NW',330),('E','NE',230),('E','SE',230),('S','SE',330),('S','SW',330),('W','SW',230),('W','NW',230),('E','X',190)]
CAMERAS=[('T01','N','생활방범','훈련 관제 A',30),('T02','NE','다목적','훈련 관제 A',30),('T03','E','재난재해','훈련 관제 B',30),('T04','S','생활방범','훈련 관제 A',30),('T05','SW','시설물관리','훈련 시설 C',None),('T06','W','어린이보호','훈련 관제 A',None),('T07','X','재난재해','훈련 관제 B',30),('T08','NW','다목적','훈련 관제 A',30)]
CASES={'urban':{'title':'도심 귀가 지연 훈련','origin':'O','speed':3,'blocked':[],'purpose':['생활방범','다목적','어린이보호']},'coast':{'title':'해안 안전사고 훈련','origin':'E','speed':2,'blocked':[('E','SE')],'purpose':['재난재해','다목적']},'hill':{'title':'산간 안전사고 훈련','origin':'W','speed':2,'blocked':[('W','NW'),('W','SW')],'purpose':['재난재해','다목적']}}
def compute(case,minutes):
    if case not in CASES or type(minutes)!=int or not 5<=minutes<=60: raise ValueError('훈련 조건 범위 확인')
    c=CASES[case]; dist={n:float('inf') for n in NODES};dist[c['origin']]=0;visited=set();blocked={frozenset(e) for e in c['blocked']}
    while len(visited)<len(NODES):
        u=min((n for n in NODES if n not in visited),key=lambda n:dist[n]);visited.add(u)
        if dist[u]==float('inf'):break
        for a,b,w in EDGES:
            if frozenset((a,b)) in blocked:continue
            v=b if a==u else a if b==u else None
            if v and dist[u]+w<dist[v]:dist[v]=dist[u]+w
    limit=c['speed']*1000*minutes/60
    rows=[]
    for id,n,p,a,days in CAMERAS:
        d=dist[n];reachable=d<=limit
        score=round(60*(1-d/max(limit,1))+25*(p in c['purpose'])+15*(days is not None),1) if reachable else None
        rows.append(dict(id=id,node=n,purpose=p,agency=a,days=days,distance=d if d!=float('inf') else None,reachable=reachable,score=score))
    rows.sort(key=lambda r:(r['score'] is None,-(r['score'] or 0),r['id']))
    return dict(case=case,title=c['title'],origin=c['origin'],minutes=minutes,speed=c['speed'],limit_m=round(limit),nodes=NODES,edges=EDGES,blocked=c['blocked'],distances={n:d if d!=float('inf') else None for n,d in dist.items()},rows=rows,mode='synthetic_training_only')
