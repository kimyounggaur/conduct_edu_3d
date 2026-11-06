/**
 * 색 규칙 (DESIGN.md 5.6). 캔버스와 화면이 같은 값을 쓰도록 여기 한 곳에서 관리한다.
 * CSS 쪽 같은 값은 src/app/globals.css 의 --beat-* / --gesture-* 변수에 있다.
 */
export const palette = {
  // 박 세기
  strong: "#1D4ED8",
  medium: "#3B82F6",
  weak: "#93C5FD",
  // 특수 동작
  prep: "#F97316",
  cue: "#16A34A",
  cutoff: "#7C3AED",
  // 바탕
  paper: "#F3F5F8",
  sheet: "#FFFFFF",
  ink: "#18223A",
  graphite: "#5A6478",
  rule: "#D6DCE5",
  wash: "#E8EEF8",
  cork: "#C9A47E",
} as const;

export type Accent = "strong" | "medium" | "weak";

export function accentColor(accent: Accent): string {
  return palette[accent];
}

/** 약박 색(#93C5FD)은 흰 바탕 글자로 쓰기엔 흐리므로, 숫자 글자색은 따로 둔다. */
export function accentTextColor(accent: Accent): string {
  return accent === "weak" ? palette.ink : "#FFFFFF";
}
