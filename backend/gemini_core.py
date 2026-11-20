"""Shared Gemini request client and local HTTP response helper."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode, urlparse
from datetime import datetime, timezone, timedelta
from xml.etree import ElementTree as ET
from urllib.error import HTTPError, URLError
from threading import Lock, BoundedSemaphore
from collections import deque
import json, os, time, hmac, base64
ROOT = Path(__file__).resolve().parent
WINDOW = deque(); LOCK = Lock(); SLOT = BoundedSemaphore(2); TOTAL = 0

def limit(name,default,lo,hi):
    try: return max(lo,min(hi,int(os.getenv(name,str(default)))))
    except ValueError: return default

DEFAULT_MODEL = 'gemini-3.5-flash-lite'

def gemini_request(parts,key,model,schema=None):
    import re
    if not re.fullmatch(r'gemini-[a-zA-Z0-9.-]+',model): raise ValueError('model name')
    config={'maxOutputTokens':4096,'temperature':0.2}
    if schema: config.update({'responseMimeType':'application/json','responseJsonSchema':schema})
    payload={'contents':[{'role':'user','parts':parts}],'generationConfig':config}
    req=Request('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',data=json.dumps(payload,ensure_ascii=False).encode(),headers={'x-goog-api-key':key,'Content-Type':'application/json'},method='POST')
    with urlopen(req,timeout=45) as resp: raw=json.load(resp)
    choice=raw['candidates'][0]
    if choice.get('finishReason')!='STOP':
        reason=choice.get('finishReason','UNKNOWN')
        print('Gemini incomplete response:', reason if reason in ('MAX_TOKENS','SAFETY','RECITATION','STOP','OTHER') else 'UNKNOWN',flush=True)
        raise ValueError('incomplete answer')
    result=''.join(part.get('text','') for part in choice['content']['parts'] if not part.get('thought'))
    if not result.strip() or len(result)>12000: raise ValueError('empty or oversized response')
    usage=raw.get('usageMetadata') or {}
    return result,raw.get('modelVersion',model),{k:usage[v] for k,v in [('prompt_tokens','promptTokenCount'),('completion_tokens','candidatesTokenCount'),('total_tokens','totalTokenCount')] if isinstance(usage.get(v),int)}

def status_data():
    return {'provider':'Gemini','configured':bool(os.getenv('GEMINI_API_KEY','').strip()),'model':os.getenv('GEMINI_MODEL',DEFAULT_MODEL),'access_required':bool(os.getenv('DEMO_ACCESS_CODE')),'max_calls':limit('AI_MAX_CALLS',20,1,500),'remaining':max(0,limit('AI_MAX_CALLS',20,1,500)-TOTAL)}

def provider_error(e):
    messages={400:'요청 형식 또는 API 키 오류. AI Studio 키와 모델을 확인하세요.',401:'API 인증 실패. 키를 확인하세요.',403:'API 접근 권한 또는 지역/프로젝트 설정을 확인하세요.',404:'이 프로젝트에서 사용 가능한 모델인지 확인하세요.',429:'무료 할당량 또는 호출 속도 제한. AI Studio 사용량/비율 제한을 확인하세요.',500:'Google AI 서버 내부 오류.',503:'Google AI 서비스 일시 불가.'}
    # Only print an allowlisted provider status, never raw response or keys.
    status='UNKNOWN'
    try:
        raw=json.loads(e.read(65536)); candidate=raw.get('error',{}).get('status','')
        if candidate in ('INVALID_ARGUMENT','UNAUTHENTICATED','PERMISSION_DENIED','NOT_FOUND','RESOURCE_EXHAUSTED','FAILED_PRECONDITION','UNAVAILABLE','INTERNAL','DEADLINE_EXCEEDED'): status=candidate
    except (ValueError,TypeError,AttributeError,OSError): pass
    print(f'Gemini upstream HTTP {e.code} ({status})',flush=True)
    return {'error':f'Gemini HTTP {e.code} ({status}): '+messages.get(e.code,'제공자 응답 오류. AI Studio 설정을 확인하세요.'),'provider_status':e.code,'provider_error':status}

class Handler(BaseHTTPRequestHandler):
    def send(self,code,body,typ='application/json; charset=utf-8'):
        if isinstance(body,(dict,list)): body=json.dumps(body,ensure_ascii=False)
        if isinstance(body,str): body=body.encode()
        self.send_response(code);self.send_header('Content-Type',typ);self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
