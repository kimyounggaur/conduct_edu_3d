/**
 * 주소로 요청한 패턴 읽기
 * - 앱:        /library?pattern=FOUR
 * - 미리보기:  #library-four  (한 파일 미리보기는 해시 이름만 쓸 수 있어 소문자·하이픈으로 바꾼다)
 */
export function patternHashName(id: string): string {
  return `library-${id.toLowerCase().replace(/_/g, "-")}`;
}

export function readRequestedPattern(knownIds: readonly string[]): string | null {
  if (typeof window === "undefined") return null;
  const fromQuery = new URLSearchParams(window.location.search).get("pattern");
  if (fromQuery && knownIds.includes(fromQuery)) return fromQuery;
  const hash = window.location.hash.replace(/^#/, "");
  return knownIds.find((id) => patternHashName(id) === hash) ?? null;
}
