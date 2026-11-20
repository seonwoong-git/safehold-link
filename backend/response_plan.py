"""Equipment review at operator-selected public response posts."""
import json
import math
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent


@lru_cache(maxsize=1)
def sources():
    areas = json.loads((ROOT / 'review_areas.json').read_text(encoding='utf8'))
    assets = json.loads((ROOT / 'asset_catalog.json').read_text(encoding='utf8'))
    date = max(a['date'] for a in assets)
    return areas, [a for a in assets if a['date'] == date and a['lat'] and a['lon']], date


def distance(a, b):
    lat, lon, lat2, lon2 = map(math.radians, [*a, *b])
    h = math.sin((lat2-lat)/2)**2 + math.cos(lat)*math.cos(lat2)*math.sin((lon2-lon)/2)**2
    return 12742000 * math.asin(math.sqrt(h))


def review(district, minutes):
    areas, assets, date = sources()
    if district not in areas or type(minutes) is not int or minutes not in range(30, 721, 30):
        raise ValueError('거점 및 점검 시간 확인')
    center = areas[district]['center']
    sites = {}
    for a in assets:
        xy = (a['lat'], a['lon'])
        meters = distance(center, xy)
        if meters > 1000:
            continue
        site = sites.setdefault(xy, dict(coords=xy, meters=round(meters), records=[], count=0))
        site['count'] += a['count']
        site['records'].append(a['record'])
    return dict(district=district, minutes=minutes, center=center, date=date,
                sites=sorted(sites.values(), key=lambda s:(s['meters'], s['records'][0])))
