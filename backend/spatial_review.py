import json, math
from pathlib import Path
from functools import lru_cache
ROOT=Path(__file__).resolve().parent
R=6371008.8
FOOT={'footway','path','pedestrian','steps','cycleway'}
@lru_cache(maxsize=1)
def roads():return json.loads((ROOT/'roads.json').read_text(encoding='utf-8'))
def metrics(lat,lon,r):
 if type(lat) not in (float,int) or type(lon) not in (float,int) or not (37.42<=lat<=37.61 and 128.95<=lon<=129.17) or type(r)!=int or r not in (500,1000,1500):raise ValueError('공개 장소/환경 반경 확인')
 sx=math.pi/180*R*math.cos(math.radians(lat));sy=math.pi/180*R
 total=walk=0;features=0
 for f in roads():
  pts=[((x-lon)*sx,(y-lat)*sy) for x,y in f['path']];length=0
  for (x,y),(u,v) in zip(pts,pts[1:]):
   dx,dy=u-x,v-y;A=dx*dx+dy*dy
   if not A:continue
   B=2*(x*dx+y*dy);C=x*x+y*y-r*r;D=B*B-4*A*C
   if D<=0:continue
   t1=max(0,(-B-math.sqrt(D))/(2*A));t2=min(1,(-B+math.sqrt(D))/(2*A));length+=max(0,t2-t1)*math.sqrt(A)
  if length>0:features+=1;total+=length;walk+=length if f['type'] in FOOT else 0
 return {'radius_m':r,'area_km2':round(math.pi*(r/1000)**2,3),'osm_road_km':round(total/1000,2),'osm_foot_tag_km':round(walk/1000,2),'osm_feature_count':features}
