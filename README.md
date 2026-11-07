# 지휘 기초 (conducting-trainer)

지휘봉의 궤적을 메트로놈 박자에 맞춰 보여 주며 박자 패턴·예비박·끝맺음·진입 신호를 배우는 웹앱.
설계는 [`docs/DESIGN.md`](docs/DESIGN.md), 설계와 달라진 점은 [`docs/IMPLEMENTATION_NOTES.md`](docs/IMPLEMENTATION_NOTES.md).

## 진행 상황

| 단계 | 내용 | 상태 |
|---|---|---|
| Phase 0 | 프로젝트 준비 | 완료 (GitHub·Vercel 연결은 사용자 작업) |
| Phase 1 | 패턴 데이터 · 타임라인 · 궤적 엔진 | 완료 |
| Phase 2 | 궤적 시각화 + 박자 재생 (`/library`) | 완료, 실제 기기 확인 필요 |
| Phase 3 | 레슨 시스템 | 다음 단계 |

## 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev          # http://localhost:3000
```

| 명령 | 하는 일 |
|---|---|
| `npm test` | 단위 테스트 (70개) |
| `npm run typecheck` | 타입 검사 |
| `npm run lint` | 코드 규칙 검사 |
| `npm run build` | 배포용 빌드 |
| `npm run demo:trajectory` | 모든 패턴의 궤적을 `docs/pattern-previews/`에 SVG로 저장 |

## 화면
- `/` 홈: 소개 한 줄, 4박자 시연, "연습 시작" 버튼
- `/library` 패턴 연습: 한 줄기 화면 — 박자 고르기(한 박·2·3·4박자) → 궤적 → 정지·한 박씩·재생·빠르기
  - 지휘봉을 쥔 손은 입체(3D)로 보임. 지휘자 시점은 뒤에서, 청중 시점은 앞에서 본 손
  - "다른 박자" 서랍: 나머지 18개 패턴 (6박자·5박자·7박자·분할·불규칙 박)
  - "설정" 서랍: 연습(카운트인·반복·빠르기 탭) · 보기(시점·손·지휘봉·입체 손·잔상·표시) · 소리 · 단축키

키보드: Space 재생/일시정지, Esc 정지, ←→ 한 박씩, ↑↓ 빠르기(Shift는 10씩), L 반복, M 소리 끄기, 1~9 패턴 고르기

## 폴더
```
src/engine     패턴 데이터, 타임라인, 궤적, 재생 엔진, Web Audio 클릭음 (React 없음)
src/render     캔버스 그리기 (2D)
src/render3d   입체 손·지휘봉 (three.js, 켤 때만 불러옴)
src/components 화면 조각
src/store      설정·라이브러리·재생 상태 (Zustand)
src/content    커리큘럼 개요 (Phase 3부터 레슨 JSON)
tests          단위 테스트
docs           설계문서, 구현 메모, 패턴 미리보기 SVG
```

## 글꼴과 라이선스
- Pretendard — SIL Open Font License 1.1
- `src/app/fonts/podium-numerals.woff2` — Bravura(© Steinberg Media Technologies)에서 박자표·음표 글자만 뽑아 이름을 바꾼 파생 글꼴, SIL OFL 1.1 (`podium-numerals.LICENSE.txt`)
- 앱의 설명문과 그림은 자체 제작. 참고 자료(Berklee 등)의 문장·그림은 쓰지 않음
