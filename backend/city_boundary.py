import json
from pathlib import Path
from functools import lru_cache
@lru_cache(maxsize=1)
def boundaries():
    return json.loads(Path(__file__).with_name('data.json').read_text(encoding='utf-8'))['boundaries']
def ring_contains(ring,x,y):
    inside=False
    for (a,b),(c,d) in zip(ring,ring[1:]+ring[:1]):
        if abs((x-a)*(d-b)-(y-b)*(c-a))<1e-12 and min(a,c)<=x<=max(a,c) and min(b,d)<=y<=max(b,d):return True
        if (b>y)!=(d>y) and x<(c-a)*(y-b)/(d-b)+a:inside=not inside
    return inside
def district(x,y):
    for f in boundaries():
        g=f['geometry'];polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
        for p in polys:
            if ring_contains(p[0],x,y) and not any(ring_contains(h,x,y) for h in p[1:]):return f['properties']['name']
    return None
