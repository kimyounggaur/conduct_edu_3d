import { describe, expect, it } from "vitest";
import { PATTERNS, getPattern } from "@/engine/patterns";
import { pathPolyline, preparePattern, sampleBeat } from "@/engine/trajectory";
import type { Articulation, Vec3 } from "@/engine/types";
import { isMirrored, makeTransform, toScreen } from "@/render/transform";

const ARTS: Articulation[] = ["legato", "neutral", "staccato", "marcato"];
const d = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("궤적: 박점과 루프 (DESIGN.md 7.2 검증 a·b)", () => {
  it("(a) phase 0 위치는 박점과 정확히 같다 — 모든 패턴·주법", () => {
    for (const p of PATTERNS)
      for (const a of ARTS) {
        const pp = preparePattern(p, { articulation: a });
        pp.beats.forEach((b, k) => expect(d(sampleBeat(pp, k, 0), b.P)).toBeLessThan(1e-12));
      }
  });

  it("(b) phase 1 위치는 다음 박점, 마지막 박은 1박으로 돌아와 루프가 된다", () => {
    for (const p of PATTERNS) {
      const pp = preparePattern(p);
      for (let k = 0; k < pp.n; k++) {
        const next = pp.beats[(k + 1) % pp.n].P;
        expect(d(sampleBeat(pp, k, 1), next)).toBeLessThan(1e-9);
      }
    }
  });
});

describe("궤적: 연속성과 속도 (검증 c)", () => {
  it("(c) 아주 잘게 나눠도 위치가 갑자기 튀지 않는다", () => {
    for (const p of PATTERNS)
      for (const a of ARTS) {
        const pp = preparePattern(p, { articulation: a });
        for (let k = 0; k < pp.n; k++) {
          let prev = sampleBeat(pp, k, 0);
          for (let j = 1; j <= 2000; j++) {
            const cur = sampleBeat(pp, k, j / 2000);
            // 한 박에 2000등분 → 한 칸 이동이 0.01(화면의 1%)을 넘지 않는다
            expect(d(prev, cur)).toBeLessThan(0.01);
            prev = cur;
          }
        }
      }
  });

  it("박점 근처는 빠르고 반동 정점 근처는 느리다 (튀는 공처럼)", () => {
    const pp = preparePattern(getPattern("FOUR"));
    const speed = (k: number, ph: number) => d(sampleBeat(pp, k, ph), sampleBeat(pp, k, ph + 0.01)) / 0.01;
    for (let k = 0; k < 4; k++) {
      const st = pp.beats[k].strokes[0];
      const r = st.rApex;
      expect(speed(k, 0)).toBeGreaterThan(speed(k, r) * 2);
      expect(speed(k, 0.985)).toBeGreaterThan(speed(k, r) * 2);
    }
  });

  it("반동 정점에는 r 시점에 도착한다", () => {
    const pp = preparePattern(getPattern("THREE"));
    for (const b of pp.beats) {
      const r = b.strokes[0].rApex;
      expect(d(sampleBeat(pp, b.index, r), b.apex)).toBeLessThan(1e-6);
    }
  });

  it("마지막 박은 꼭대기를 정점으로 삼고, 정점 시점이 보통 박보다 늦다", () => {
    const pp = preparePattern(getPattern("FOUR"));
    const up = pp.beats[3];
    expect(up.apex[1]).toBeCloseTo(0.95, 9);
    expect(up.strokes[0].rApex).toBeGreaterThan(pp.beats[0].strokes[0].rApex);
  });
});

describe("주법·크기·분할", () => {
  it("스타카토는 박점에 잠깐 머문다 (dwell 0.08)", () => {
    const pp = preparePattern(getPattern("FOUR"), { articulation: "staccato" });
    expect(d(sampleBeat(pp, 0, 0.05), pp.beats[0].P)).toBe(0);
    expect(d(sampleBeat(pp, 0, 0.12), pp.beats[0].P)).toBeGreaterThan(0);
  });

  it("마르카토 반동은 보통보다 높고, 레가토는 낮다", () => {
    const apexY = (a: Articulation) => preparePattern(getPattern("FOUR"), { articulation: a }).beats[0].apex[1];
    expect(apexY("marcato")).toBeGreaterThan(apexY("neutral"));
    expect(apexY("legato")).toBeLessThan(apexY("neutral"));
  });

  it("크기를 키워도 박점면(y=0)은 그대로이고 도형만 커진다", () => {
    const small = preparePattern(getPattern("FOUR"), { size: 0.6 });
    const big = preparePattern(getPattern("FOUR"), { size: 1.25 });
    expect(small.beats[0].P[1]).toBe(0);
    expect(big.beats[0].P[1]).toBe(0);
    expect(big.beats[1].P[0] / small.beats[1].P[0]).toBeCloseTo(1.25 / 0.6, 9);
  });

  it("분할 패턴: 박 한가운데(phase 0.5)에 보조 박점이 있다", () => {
    const pp = preparePattern(getPattern("SUB_FOUR_8"));
    for (const b of pp.beats) {
      expect(b.subIctus).toHaveLength(1);
      expect(d(sampleBeat(pp, b.index, 0.5), b.subIctus[0])).toBeLessThan(1e-9);
    }
  });

  it("고스트 도형은 끊김 없이 한 바퀴 이어진다", () => {
    const pp = preparePattern(getPattern("SIX_GERMAN"));
    const line = pathPolyline(pp);
    expect(d(line[0], line[line.length - 1])).toBeLessThan(1e-9);
    for (let i = 1; i < line.length; i++) expect(d(line[i - 1], line[i])).toBeLessThan(0.05);
  });

  it("번호끼리 겹치지 않는다 (최소 간격)", () => {
    for (const p of PATTERNS) {
      const xs = preparePattern(p)
        .beats.map((b) => b.label[0])
        .sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(0.12);
    }
  });
});

describe("화면 변환 (검증 d)", () => {
  it("(d) 시점·왼손잡이 반전은 x 부호만 바꾼다. 둘 다 켜면 원래대로", () => {
    expect(isMirrored("conductor", false)).toBe(false);
    expect(isMirrored("audience", false)).toBe(true);
    expect(isMirrored("conductor", true)).toBe(true);
    expect(isMirrored("audience", true)).toBe(false);
    const plain = makeTransform(800, 600, false);
    const flip = makeTransform(800, 600, true);
    const [x1, y1] = toScreen(plain, [0.5, 0.3]);
    const [x2, y2] = toScreen(flip, [0.5, 0.3]);
    expect(y1).toBe(y2);
    expect(x1 - 400).toBeCloseTo(-(x2 - 400), 9);
  });

  it("가로·세로 배율이 같아 도형이 찌그러지지 않는다", () => {
    for (const [w, h] of [
      [800, 600],
      [400, 400],
      [360, 300],
    ]) {
      const tf = makeTransform(w, h, false);
      const [x0, y0] = toScreen(tf, [0, 0]);
      const [x1] = toScreen(tf, [0.5, 0]);
      const [, y1] = toScreen(tf, [0, 0.5]);
      expect(x1 - x0).toBeCloseTo(y0 - y1, 9);
    }
  });
});
