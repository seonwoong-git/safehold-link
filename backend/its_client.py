"""Independent official traffic video sample check, not connected to incident reports."""
import json, os, time, math
from urllib.request import Request, urlopen
from urllib.parse import urlencode, urlsplit
from urllib.error import HTTPError, URLError
from threading import Lock
from city_boundary import district
ENDPOINT='https://openapi.its.go.kr:9443/cctvInfo'
# Fixed citywide traffic region derived from bundled administrative boundaries, not incident coordinates.
BOUNDS={'minX':'128.95','maxX':'129.17','minY':'37.42','maxY':'37.61'}
ERRORS={4001:'월간 호출 한도 초과',4002:'요청변수 오류',4004:'API 요청 경로 오류',4005:'인증키/신청 서비스/등록 URL 확인 필요',4009:'ITS 연계 시스템 오류'}
LOCK=Lock(); LAST=0; COUNT=0

def parse(raw):
    if not isinstance(raw,dict):raise ValueError('응답 형식')
    res=raw.get('response',raw)
    if not isinstance(res,dict):raise ValueError('응답 형식')
    for node in (raw,res,raw.get('header',{}),res.get('header',{})):
        if not isinstance(node,dict):continue
        for field in ('resultCode','resultcode','code'):
            if field in node:
                try: code=int(node[field])
                except (ValueError,TypeError):continue
                if code in ERRORS:return {'ok':False,'message':f'ITS {code}: {ERRORS[code]}','code':code}
    rows=res.get('data',[])
    if isinstance(rows,dict):rows=rows.get('item',[])
    if not isinstance(rows,list):raise ValueError('CCTV 목록 형식')
    count=res.get('datacount',len(rows))
    try: count=max(0,int(count))
    except (TypeError,ValueError):raise ValueError('CCTV 수량 형식')
    if not rows and 'datacount' not in res:raise ValueError('목록/수량 누락')
    # Return citywide provider inventory; the UI limits concurrent playback to four.
    samples=[]; seen=set(); outside=0
    for row in rows:
        if not isinstance(row,dict):continue
        u=row.get('cctvurl','')
        if not isinstance(u,str) or len(u)>4096:continue
        try:
            p=urlsplit(u); host=p.hostname or ''
            if p.scheme=='https' and not p.username and not p.password and (host=='ktict.co.kr' or host.endswith('.ktict.co.kr')) and str(row.get('cctvtype','5'))=='5':
                x,y=float(row.get('coordx')),float(row.get('coordy'))
                if not (math.isfinite(x) and math.isfinite(y) and float(BOUNDS['minX'])<=x<=float(BOUNDS['maxX']) and float(BOUNDS['minY'])<=y<=float(BOUNDS['maxY'])):continue
                name=str(row.get('cctvname') or '공개 교통영상')[:120]
                if (name,x,y) in seen:continue
                seen.add((name,x,y)); area=district(x,y)
                if not area:outside+=1;continue
                samples.append({'name':name,'lon':x,'lat':y,'url':u,'district':area})
                # Keep the full valid provider list.
        except (ValueError,TypeError):continue
    if samples:
        first=samples[0];return {'ok':True,'count':count,'outside':outside,'samples':samples,'sample_url':first['url'],'sample':{k:first[k] for k in ('name','lat','lon')},'message':'동해시 행정경계 내 ITS 응답 · HTTPS MP4 재생 확인 필요'}
    return {'ok':True,'count':count,'outside':outside,'samples':[],'message':'ITS 응답 수신 · 동해시 행정경계 내 유효 HTTPS MP4 없음'}

def check(road,key):
    if road not in ('ex','its'):raise ValueError('도로 유형 오류')
    params={'apiKey':key,'type':road,'cctvType':'5','getType':'json',**BOUNDS}
    req=Request(ENDPOINT+'?'+urlencode(params),headers={'Accept':'application/json'},method='GET')
    try:
        with urlopen(req,timeout=20) as r: return parse(json.loads(r.read(1_000_000)))
    except HTTPError as e:
        try:
            result=parse(json.loads(e.read(65536)))
            if not result.get('ok'):return result
        except (ValueError,TypeError,UnicodeError):pass
        return {'ok':False,'message':f'ITS HTTP {e.code}: 인증키·서비스 설정 또는 제공처 확인'}
    except (URLError,TimeoutError,OSError):return {'ok':False,'message':'ITS 네트워크 접속 실패 (포트 9443 또는 서버 상태 확인)'}
    except (ValueError,TypeError,UnicodeError):return {'ok':False,'message':'ITS 응답 형식 확인 필요'}

def limited_check(road,key):
    global LAST,COUNT
    with LOCK:
        now=time.monotonic()
        if COUNT>=12 or (LAST and now-LAST<15):return {'ok':False,'message':'로컬 시험 호출 제한: 15초 간격, 실행당 12회'}
        LAST=now;COUNT+=1
    return check(road,key)
