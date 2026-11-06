/**
 * 커리큘럼 개요 (DESIGN.md 4.7). Phase 3에서 레슨 JSON(src/content/lessons/ko)으로 채워진다.
 * patternId가 있는 레슨은 지금도 패턴 연습 화면에서 해당 패턴을 바로 열 수 있다.
 */
export interface CurriculumItem {
  level: number;
  title: string;
  summary: string;
  release: 1 | 2;
  patternId?: string;
}

export const CURRICULUM: CurriculumItem[] = [
  { level: 0, title: "오리엔테이션", summary: "바른 자세, 지휘면, 지휘봉 잡는 법. 박점과 반동이 무엇인지 봅니다.", release: 1 },
  { level: 1, title: "한 박 패턴", summary: "내려찍고 튀어 오르기. 모든 박이 찍히는 박점면을 느껴 봅니다.", release: 1, patternId: "ONE" },
  { level: 2, title: "2박자", summary: "아래, 그리고 바깥으로 살짝 벌리며 위로. 강-약.", release: 1, patternId: "TWO" },
  { level: 3, title: "3박자", summary: "아래, 오른쪽, 위. 강-약-약.", release: 1, patternId: "THREE" },
  { level: 4, title: "4박자", summary: "아래, 왼쪽, 오른쪽, 위. 셋째 박은 중간 세기.", release: 1, patternId: "FOUR" },
  { level: 5, title: "예비박 I — 1박에서 시작하기", summary: "준비 자세, 숨과 함께 올리는 예비박, 첫 소리.", release: 1 },
  { level: 6, title: "끝맺음 I", summary: "한 박 전에 들어 올리고 작은 원을 그리며 멈추기.", release: 1 },
  { level: 7, title: "예비박 II — 여린내기", summary: "2·3·4박에서 시작하기, 반 박에서 시작하기, 못갖춘마디.", release: 1 },
  { level: 8, title: "6박자", summary: "느린 6/8은 여섯 번, 빠른 6/8은 두 번 셉니다.", release: 1, patternId: "SIX_GERMAN" },
  { level: 9, title: "진입 신호 I", summary: "보고, 예비하고, 손바닥으로 '지금 들어와요'.", release: 1 },
  { level: 10, title: "진입 신호 II", summary: "돌림노래처럼 여러 파트가 차례로 들어올 때.", release: 1 },
  { level: 11, title: "5박자", summary: "3+2와 2+3. 한쪽을 두 번 갑니다.", release: 2, patternId: "FIVE_32" },
  { level: 12, title: "7박자와 불규칙 박", summary: "느린 7박, 빠른 5/8·7/8·8/8. 긴 박은 더 크게.", release: 2, patternId: "SEVEN8_IN3_223" },
  { level: 13, title: "분할 패턴", summary: "아주 느린 곡에서 박마다 '그리고'를 찍기.", release: 2, patternId: "SUB_FOUR_8" },
  { level: 14, title: "셈여림과 주법", summary: "크기로 셈여림을, 선의 성격으로 레가토·스타카토를.", release: 2 },
  { level: 15, title: "끝맺음 II", summary: "늘임표, 쉼표 앞 끝맺음, 왼손으로 끝맺기.", release: 2 },
  { level: 16, title: "종합 연습", summary: "준비부터 예비박, 패턴, 진입 신호, 끝맺음까지 한 곡으로.", release: 2 },
];
