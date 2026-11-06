import { describe, expect, it } from "vitest";
import { PATTERNS, PATTERN_GROUPS, getPattern, hasPattern } from "@/engine/patterns";

describe("패턴 데이터", () => {
  it("모든 패턴의 박 번호가 1부터 차례대로다", () => {
    for (const p of PATTERNS) {
      expect(p.beats.map((b) => b.n)).toEqual(p.beats.map((_, i) => i + 1));
    }
  });

  it("1박은 항상 강박이다", () => {
    for (const p of PATTERNS) expect(p.beats[0].accent).toBe("strong");
  });

  it("모든 패턴이 라이브러리 묶음 중 정확히 한 곳에 들어 있다", () => {
    const listed = PATTERN_GROUPS.flatMap((g) => g.patternIds);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(PATTERNS.map((p) => p.id).sort());
  });

  it("불규칙 박의 가중치 개수가 박 수와 같다", () => {
    for (const p of PATTERNS) if (p.weights) expect(p.weights.length).toBe(p.beats.length);
  });

  it("파생 패턴은 원본과 좌표를 공유하지 않는다 (복사본)", () => {
    const derived = getPattern("SEVEN8_IN3_223");
    const base = getPattern("THREE");
    expect(derived.base).toBe("THREE");
    expect(derived.beats[0].P).toEqual(base.beats[0].P);
    expect(derived.beats[0].P).not.toBe(base.beats[0].P);
  });

  it("4박자 박점: 1 가운데, 2 왼쪽, 3 오른쪽, 4는 가운데와 3 사이", () => {
    const [b1, b2, b3, b4] = getPattern("FOUR").beats;
    expect(b2.P[0]).toBeLessThan(b1.P[0]);
    expect(b3.P[0]).toBeGreaterThan(b1.P[0]);
    expect(b4.P[0]).toBeGreaterThan(b1.P[0]);
    expect(b4.P[0]).toBeLessThan(b3.P[0]);
  });

  it("모든 박점은 박점면 근처(y ≤ 0.1)에 있다", () => {
    for (const p of PATTERNS) for (const b of p.beats) expect(b.P[1]).toBeLessThanOrEqual(0.1);
  });

  it("없는 패턴을 찾으면 오류", () => {
    expect(hasPattern("NOPE")).toBe(false);
    expect(() => getPattern("NOPE")).toThrow();
  });
});
