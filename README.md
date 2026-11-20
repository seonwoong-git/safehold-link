# SafeHold LINK V32.1 — Vercel 배포 준비판
원본 V32 Final의 화면·공간자료·업무 분석 코드를 보존하고 Vercel 실행 구조만 추가한 버전입니다.
실제 Vercel 배포 또는 제공기관 API 호출은 아직 하지 않았습니다.

1. ZIP을 풀고 이 README와 vercel.json이 있는 폴더의 내용 전체를 새 비공개 GitHub 저장소 루트에 올립니다. ZIP 자체만 올리지 않습니다.
2. Vercel Add New Project에서 새 저장소를 Import합니다. Framework Other, Root ./, Build/Output은 vercel.json 설정(정적 public + Python API)을 사용합니다.
3. Production 환경변수: GEMINI_API_KEY, ITS_API_KEY, KAKAO_JS_KEY, DEMO_ACCESS_CODE. 선택적으로 GEMINI_MODEL, AI_MAX_CALLS, AI_CALLS_PER_MIN.
4. 카카오 개발자 콘솔의 해당 JavaScript 키 SDK 도메인에 실제 Vercel 주소(https://...vercel.app)를 등록합니다. ITS에도 등록 사이트 변경 및 클라우드 접근 허용 여부를 확인합니다.
5. Deploy 또는 Redeploy 후 /api/status 와 /api/its-status를 확인합니다. 지도는 자동 연결을 시도합니다. 기존 수동 연결 기능도 유지됩니다.
6. 시연 접속 코드 팝업에 DEMO_ACCESS_CODE 값을 입력합니다. 이 값은 API 키가 아닙니다. 공개 웹페이지 자체 접근을 제한하는 기능은 아니므로 필요 시 Vercel 배포 접근 보호를 별도 설정합니다.
7. 가상 사건/비식별 환경 자료만 사용하고 AI/ITS 실제 호출 및 영상 재생을 점검합니다.
8. API 키를 GitHub·HTML·채팅에 입력하지 않습니다. 카카오 JavaScript 키만 SDK 특성상 브라우저에 공개되는 도메인 제한 키입니다.
9. 로컬 기록은 기기 간 공유되지 않음. 실제 온나라·관제·신고망 미연동. 제공기관 공개/재배포 조건을 확인하기 전 공개 URL을 불특정 다수에게 배포하지 않습니다.
10. 기존 호출 제한은 프로세스 단위이므로 Vercel 여러 인스턴스에 걸친 전역 한도는 아닙니다. 실제 제공기관 한도를 설정하고 필요하면 공유 rate limiter 추가.

검증: 로컬 HTTP 어댑터 12개 점검 통과(조회, 직접/변환 경로, 접근 코드 차단, 공개 지도설정). HTML 참조 정적 파일 누락 없음. 실제 Vercel 빌드·rewrite·SDK·Gemini·ITS 연동 미검증.
변경: Python 진입점 및 환경변수 기반 지도 자동 연결 추가, 기존 초기 지도 중심 경도 132.108을 129.065로 수정. 서버 API POST는 배포 접속 코드가 설정되지 않으면 차단.
