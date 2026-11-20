"""Fixed fictional exercise network. Coordinates are local east/north metres."""
import heapq
import math

STEP = 240
PACE = 1000  # metres per hour, a scenario setting
DIRECTIONS = ("북", "북동", "동", "남동", "남", "남서", "서", "북서")


def build_network():
    points = {"O": (0, 0)}
    links = {"O": {}}
    cameras = {}
    for ring in range(1, 82):
        for arm, angle in enumerate((335, 253, 202)):
            key = f"{arm}-{ring}"
            parent = f"{arm}-{ring-1}" if ring > 1 else "O"
            bearing = math.radians(angle + 14 * math.sin(ring + arm))
            x, y = points[parent]
            points[key] = (round(x + STEP * math.sin(bearing)), round(y + STEP * math.cos(bearing)))
            links[key] = {}
            links[key][parent] = links[parent][key] = STEP
            if ring % 2 == 1:
                cameras[key] = f"SIM-{'ABC'[arm]}{ring:02d}"
        if ring in (2, 5, 12, 20):
            for arm in (0, 1):
                a, b = f"{arm}-{ring}", f"{arm+1}-{ring}"
                links[a][b] = links[b][a] = round(math.dist(points[a], points[b]))
    return points, links, cameras


POINTS, LINKS, CAMERAS = build_network()


def snapshot(minutes, pace=1000, walking=100):
    if pace not in (500,1000,1500) or walking not in (50,75,100):
        raise ValueError("가정 속도 및 이동시간 비율 확인")
    if type(minutes) is not int or minutes not in range(30, 721, 30):
        raise ValueError("30분 단위로 30분~12시간을 선택하세요.")
    distance, prev, queue = {"O": 0}, {}, [(0, "O")]
    while queue:
        d, u = heapq.heappop(queue)
        if d != distance[u]:
            continue
        for v, weight in LINKS[u].items():
            cost = d + weight
            if cost < distance.get(v, math.inf):
                distance[v], prev[v] = cost, u
                heapq.heappush(queue, (cost, v))
    lower, upper = (minutes - 30) * pace * walking / 6000, minutes * pace * walking / 6000
    rows = []
    for key, camera in CAMERAS.items():
        d = distance[key]
        if lower < d <= upper:
            path, u = [POINTS[key]], key
            while u != "O":
                u = prev[u]
                path.append(POINTS[u])
            x, y = POINTS[key]
            direction = DIRECTIONS[round(math.atan2(x, y) / (math.pi / 4)) % 8]
            rows.append(dict(id=camera, direction=direction, distance=d, junction=len(LINKS[key])>2,
                             arrival=round(d*6000/(pace*walking),1), path=path[::-1]))
    rows.sort(key=lambda r: (not r["junction"], -r["distance"], r["id"]))
    for index,row in enumerate(rows):
        row['rank']=1+sum((r['junction'],r['distance'])>(row['junction'],row['distance']) for r in rows)
        row['tied']=sum((r['junction'],r['distance'])==(row['junction'],row['distance']) for r in rows)>1
    return dict(minutes=minutes, start=minutes-30, limit=round(upper), rows=rows,
                pace=pace, walking=walking, mode="synthetic_training_only")
