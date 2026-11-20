"""Vercel HTTP adapter; existing server kept in backend/."""
import os, sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl, urlencode
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from server import Handler

GET_ROUTES = {"status", "its-status", "response-posts", "response-plan", "horizon", "training-data", "config"}
POST_ROUTES = {"report", "environment", "synthesis", "training-brief", "regional-brief", "its-sample"}

class handler(Handler):
    def route(self, allowed):
        u = urlsplit(self.path)
        query = parse_qsl(u.query, keep_blank_values=True)
        direct = u.path.removeprefix("/api/")
        mapped = [v for k,v in query if k == "__route"]
        name = direct if direct in allowed else (mapped[0] if len(mapped) == 1 else "")
        if name not in allowed:
            self.send(404, {"error": "API 경로 없음"})
            return None
        rest = urlencode([(k,v) for k,v in query if k != "__route"])
        self.path = "/api/" + name + ("?" + rest if rest else "")
        return name

    def do_GET(self):
        name = self.route(GET_ROUTES)
        if name == "config":
            return self.send(200, {"kakao_js_key": os.getenv("KAKAO_JS_KEY", "").strip()})
        if name:
            return super().do_GET()

    def do_POST(self):
        if self.route(POST_ROUTES):
            # Hosted demo must be access-code protected before using provider keys.
            if not os.getenv("DEMO_ACCESS_CODE", "").strip():
                return self.send(503, {"error": "배포용 DEMO_ACCESS_CODE 설정 필요", "message": "배포용 DEMO_ACCESS_CODE 설정 필요"})
            return super().do_POST()
