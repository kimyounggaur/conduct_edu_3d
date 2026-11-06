# 지휘 기초 웹앱 (conducting-trainer)

박자 패턴·예비박·끝맺음·진입 신호를 배우는 웹앱. 손과 지휘봉의 궤적을 메트로놈 박자에 맞춰 보여 준다.
사용자는 비개발자이며 AI와 대화하며 개발한다. 설명은 한국어로, 결론부터 쉽게.

## 작업 규칙
- 구현 전에 `docs/DESIGN.md`의 해당 장을 먼저 읽는다. 장 번호로 요청이 오면 그 장을 기준으로 구현한다.
- 설계와 다르게 구현한 부분은 `docs/IMPLEMENTATION_NOTES.md`에 이유와 함께 기록한다.
- 한 번에 한 Phase씩 진행하고, DESIGN.md 9장의 "완료 기준"을 확인한 뒤 다음 Phase로 넘어간다.
- `src/engine`은 순수 TypeScript다. React·DOM을 import하지 않는다. Web Audio·Worker 같은 브라우저 기능은 주입받는 인터페이스로 다룬다.
- 의존 방향: `app`/`components` → `store` → `engine`/`render`. `engine`은 다른 폴더를 import하지 않는다.
- 엔진을 바꾸면 `npm test`가 통과해야 한다. 패턴 좌표를 바꾸면 `npm run demo:trajectory`로 SVG를 다시 만들어 모양을 눈으로 확인한다.
- 화면 문구는 한국어, 쉬운 말. 용어는 DESIGN.md 2장 표를 따른다.
- 색은 DESIGN.md 5.6 규칙(강박·중강박·약박·예비박·큐·끝맺음)을 따른다. 값은 `src/lib/palette.ts` 한 곳에서 관리한다.

## 명령어
| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 (http://localhost:3000) |
| `npm test` | 엔진 단위 테스트 |
| `npm run typecheck` | 타입 검사 |
| `npm run lint` | 코드 규칙 검사 |
| `npm run build` | 배포용 빌드 |
| `npm run demo:trajectory` | 모든 패턴의 궤적을 `docs/pattern-previews/`에 SVG로 저장 |

## 폴더
- `src/engine` 패턴 데이터, 타임라인, 궤적, 재생 엔진, 오디오 예약
- `src/render` 캔버스 그리기
- `src/components` 화면 조각, `src/store` 설정·재생 상태
- `src/content` 레슨·연습 JSON (Phase 3부터)
- `tests` 단위 테스트, `scripts` 보조 스크립트
