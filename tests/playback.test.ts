import { describe, expect, it } from "vitest";
import { getPattern } from "@/engine/patterns";
import { PlaybackEngine, STEP_ANIM_SEC } from "@/engine/playback";
import type { ClickKind } from "@/engine/scheduler";
import { buildTimeline } from "@/engine/timeline";
import type { Exercise } from "@/engine/types";
import { exercise } from "./helpers";

/** 가짜 오디오 시계: 시간을 직접 움직인다. 출력 지연(latency)도 흉내 낸다 */
function rig(latency = 0.03) {
  let now = 0;
  let wall = 0;
  let onTick: (() => void) | null = null;
  const scheduled: Array<{ time: number; kind: ClickKind; cancelled: boolean }> = [];
  const engine = new PlaybackEngine({
    clock: { now: () => now, outputNow: () => now - latency },
    sink: {
      schedule: (time, kind) => scheduled.push({ time, kind, cancelled: false }),
      cancelFrom: (time) => {
        for (const s of scheduled) if (s.time >= time) s.cancelled = true;
      },
    },
    timer: {
      start: (cb) => {
        onTick = cb;
      },
      stop: () => {
        onTick = null;
      },
    },
    wallNow: () => wall,
  });
  /** dt초 동안 25ms마다 타이머를 돌린다 */
  const advance = (dt: number) => {
    const end = now + dt;
    while (now < end - 1e-9) {
      const step = Math.min(0.025, end - now);
      now += step;
      wall += step;
      onTick?.();
      engine.frame();
    }
  };
  const heard = () => scheduled.filter((s) => !s.cancelled);
  return {
    engine,
    advance,
    heard,
    scheduled,
    get now() {
      return now;
    },
    get latency() {
      return latency;
    },
  };
}

function load(engine: PlaybackEngine, ex: Exercise) {
  engine.load(getPattern(ex.patternId), ex);
}

describe("재생 엔진: 클릭 예약 (DESIGN.md 10.1)", () => {
  it("예약 누락·중복 없음: 카운트인 1마디 + 4마디 = 클릭 20개, 정확한 간격", () => {
    const r = rig();
    const ex = exercise({ tempo: { bpm: 120, unit: "♩" }, bars: 4, countIn: 1 });
    load(r.engine, ex);
    r.engine.play();
    r.advance(15);
    const clicks = r.heard();
    expect(clicks).toHaveLength(4 + 16);
    const times = clicks.map((c) => c.time);
    expect(new Set(times.map((t) => t.toFixed(6))).size).toBe(times.length);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeCloseTo(0.5, 9);
    expect(clicks.map((c) => c.kind).slice(4, 8)).toEqual(["strong", "weak", "medium", "weak"]);
    // 끝나면 멈추고, 손은 다음 1박 자리에서 쉰다
    expect(r.engine.getStatus()).toBe("stopped");
    const f = r.engine.frame()!;
    expect(f.atEnd).toBe(true);
    expect(f.pos).toEqual(r.engine.getPrepared()!.beats[0].P);
  });

  it("소리와 그림이 맞는다: 클릭이 스피커로 나오는 순간, 화면의 손은 그 박점에 있다", () => {
    const r = rig(0.04);
    load(r.engine, exercise({ tempo: { bpm: 90, unit: "♩" }, bars: 2 }));
    r.engine.play();
    r.advance(10);
    const clicks = r.heard();
    expect(clicks).toHaveLength(8);
    // 같은 연습을 다시 재생하며, 각 클릭 시각에 맞춰 화면을 확인한다
    const r2 = rig(0.04);
    load(r2.engine, exercise({ tempo: { bpm: 90, unit: "♩" }, bars: 2 }));
    r2.engine.play();
    const P = r2.engine.getPrepared()!.beats.map((b) => b.P);
    const order = [0, 1, 2, 3, 0, 1, 2, 3];
    clicks.forEach((c, i) => {
      // 출력 시각(outputNow)이 클릭 예약 시각이 될 때까지 진행
      r2.advance(c.time + r2.latency - r2.now);
      const f = r2.engine.frame()!;
      const p = f.pos;
      const target = P[order[i]];
      expect(Math.hypot(p[0] - target[0], p[1] - target[1])).toBeLessThan(0.02);
      expect(f.lastIctus!.beat).toBe(order[i] + 1);
    });
  });

  it("일시정지 → 재개: 같은 박 위치에서 이어가고 클릭이 빠지거나 겹치지 않는다", () => {
    const r = rig();
    load(r.engine, exercise({ tempo: { bpm: 60, unit: "♩" }, bars: 2 }));
    r.engine.play();
    r.advance(3.3); // 준비 1.5초 + 예비 1초 + 1박 지나고 2박 0.8초쯤
    const tauAtPause = r.engine.tau();
    r.engine.pause();
    expect(r.engine.getStatus()).toBe("paused");
    r.advance(5); // 멈춘 동안 시간이 흘러도
    expect(r.engine.tau()).toBeCloseTo(tauAtPause, 9);
    r.engine.play();
    r.advance(10);
    const clicks = r.heard();
    expect(clicks).toHaveLength(8);
    expect(clicks.map((c) => c.kind)).toEqual(["strong", "weak", "medium", "weak", "strong", "weak", "medium", "weak"]);
    // 재개 후 간격도 1초
    const after = clicks.slice(1).map((c) => c.time);
    for (let i = 2; i < after.length; i++) expect(after[i] - after[i - 1]).toBeCloseTo(1, 9);
  });

  it("BPM 변경은 다음 박부터 적용된다 (지금 박 길이는 그대로)", () => {
    const r = rig();
    load(r.engine, exercise({ tempo: { bpm: 60, unit: "♩" }, bars: 0 }));
    r.engine.play();
    r.advance(2.7); // 첫 박(τ=2.5)이 막 지난 뒤
    r.engine.setBpm(120);
    r.advance(4);
    const times = r.heard().map((c) => c.time);
    // 첫 박 → 둘째 박은 이전 빠르기(1초), 그 뒤는 0.5초
    expect(times[1] - times[0]).toBeCloseTo(1, 9);
    expect(times[2] - times[1]).toBeCloseTo(0.5, 9);
    expect(times[3] - times[2]).toBeCloseTo(0.5, 9);
  });

  it("정지하면 준비 자세로 돌아가고 남은 클릭은 취소된다", () => {
    const r = rig();
    load(r.engine, exercise({ bars: 0 }));
    r.engine.play();
    r.advance(4);
    r.engine.stop();
    expect(r.engine.getStatus()).toBe("stopped");
    expect(r.engine.tau()).toBe(0);
    const ready = r.engine.getPrepared()!.beats[3].P; // 1박 시작 → 4박 박점에서 기다림
    expect(r.engine.frame()!.pos).toEqual(ready);
    const pending = r.scheduled.filter((s) => s.time > r.now && !s.cancelled);
    expect(pending).toHaveLength(0);
  });
});

describe("한 박씩 보기 (◁ ▷)", () => {
  it("정지 상태에서 ▷: 예비 동작을 1초 동안 보여 주고 1박 박점에 멈춘다. 다시 ▷ → 2박, ◁ → 1박", () => {
    const r = rig();
    load(r.engine, exercise({ countIn: 1, bars: 2 }));
    const P = r.engine.getPrepared()!.beats.map((b) => b.P);
    const near = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;

    r.engine.stepForward();
    r.advance(STEP_ANIM_SEC / 2);
    const mid = r.engine.frame()!;
    expect(mid.stepping).toBe(true);
    expect(near(mid.pos, P[3])).toBe(false); // 움직이는 중
    r.advance(STEP_ANIM_SEC / 2 + 0.05);
    let f = r.engine.frame()!;
    expect(f.stepping).toBe(false);
    expect(near(f.pos, P[0])).toBe(true);
    expect(r.heard().at(-1)!.kind).toBe("strong"); // 도착하면 클릭

    r.engine.stepForward();
    r.advance(STEP_ANIM_SEC + 0.05);
    f = r.engine.frame()!;
    expect(near(f.pos, P[1])).toBe(true);

    r.engine.stepBackward();
    r.advance(STEP_ANIM_SEC + 0.05);
    f = r.engine.frame()!;
    expect(near(f.pos, P[0])).toBe(true);
  });

  it("한 박씩 보기 도중 재생을 누르면 그 자리에서 이어서 재생한다", () => {
    const r = rig();
    load(r.engine, exercise({ bars: 0 }));
    r.engine.stepForward();
    r.advance(0.5);
    const tauMid = r.engine.tau();
    r.engine.play();
    expect(r.engine.getStatus()).toBe("playing");
    expect(r.engine.tau()).toBeCloseTo(tauMid, 9);
  });
});

describe("Phase 2 완료 기준 (DESIGN.md 9장)", () => {
  it("5분 연속 재생: 클릭 간격이 끝까지 정확하고, 마지막 박에서도 그림이 박점에 있다", () => {
    const r = rig(0.03);
    load(r.engine, exercise({ tempo: { bpm: 120, unit: "♩" }, bars: 0 }));
    r.engine.play();
    r.advance(300);
    const times = r.heard().map((c) => c.time);
    expect(times.length).toBeGreaterThan(590);
    for (let i = 1; i < times.length; i++) expect(Math.abs(times[i] - times[i - 1] - 0.5)).toBeLessThan(1e-6);
    // 마지막 클릭이 스피커로 나오는 순간의 그림 위치
    const last = times[times.length - 1];
    r.advance(last + r.latency - r.now);
    const f = r.engine.frame()!;
    const target = r.engine.getPrepared()!.beats[f.lastIctus!.beat - 1].P;
    expect(Math.hypot(f.pos[0] - target[0], f.pos[1] - target[1])).toBeLessThan(0.02);
    expect(Math.abs(f.tau - f.lastIctus!.t)).toBeLessThan(0.026);
  });

  it("BPM 40·60·120·200에서 도형은 같고 빠르기만 다르다", () => {
    const shapeAt = (bpm: number) => {
      const r = rig(0);
      load(r.engine, exercise({ tempo: { bpm, unit: "♩" }, bars: 0, readyHoldSec: 0 }));
      r.engine.play();
      // 첫 박이 시작한 뒤 0.3박 위치 (예비박 1박 + 0.3박)
      const beat = 60 / bpm;
      r.advance(0.06 + beat * 1.3);
      return r.engine.frame()!.pos;
    };
    const ref = shapeAt(60);
    for (const bpm of [40, 120, 200]) {
      const p = shapeAt(bpm);
      expect(Math.hypot(p[0] - ref[0], p[1] - ref[1])).toBeLessThan(0.03);
    }
  });
});

describe("타임라인과 엔진의 시각이 같다", () => {
  it("엔진이 예약한 클릭 = buildTimeline의 박점 시각 + origin", () => {
    const ex = exercise({ tempo: { bpm: 100, unit: "♩" }, bars: 3, patternId: "THREE" });
    const tl = buildTimeline(getPattern("THREE"), ex);
    const expected = tl.events.filter((e) => e.type === "ictus").map((e) => e.t);
    const r = rig();
    load(r.engine, ex);
    r.engine.play();
    r.advance(12);
    const got = r.heard().map((c) => c.time);
    const origin = got[0] - expected[0];
    expect(got.map((t) => t - origin)).toEqual(expected.map((t) => expect.closeTo(t, 9)));
  });
});
