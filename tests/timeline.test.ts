import { describe, expect, it } from "vitest";
import { getPattern } from "@/engine/patterns";
import {
  StepTrack,
  barDuration,
  beatDuration,
  buildTimeline,
  generateSteps,
  prepBeatFor,
} from "@/engine/timeline";
import type { TimelineEvent } from "@/engine/types";
import { close, exercise } from "./helpers";

const ictuses = (events: TimelineEvent[]) =>
  events.filter((e): e is Extract<TimelineEvent, { type: "ictus" }> => e.type === "ictus" && !e.sub);
const ofType = <T extends TimelineEvent["type"]>(events: TimelineEvent[], type: T) =>
  events.filter((e) => e.type === type) as Array<TimelineEvent & { type: T }>;

describe("타임라인: 박 시각 계산 (DESIGN.md 7.1 검증 1~4)", () => {
  it("검증1: 4/4 ♩=90 2마디 카운트인 없음 1박 시작 → 박점 8개, 간격 0.6667초, 첫 박점 1.5+0.6667초", () => {
    const tl = buildTimeline(getPattern("FOUR"), exercise({ tempo: { bpm: 90, unit: "♩" }, bars: 2 }));
    const ic = ictuses(tl.events);
    expect(ic).toHaveLength(8);
    expect(ic[0].t).toBeCloseTo(1.5 + 60 / 90, 9);
    for (let i = 1; i < ic.length; i++) expect(ic[i].t - ic[i - 1].t).toBeCloseTo(60 / 90, 9);
    expect(ic.map((e) => e.beat)).toEqual([1, 2, 3, 4, 1, 2, 3, 4]);
    expect(ic.map((e) => e.bar)).toEqual([1, 1, 1, 1, 2, 2, 2, 2]);
    expect(tl.finite).toBe(true);
  });

  it("검증2: 7/8(2+2+3) ♪=180 → 박 길이 0.667 / 0.667 / 1.0초, 마디 2.333초", () => {
    const p = getPattern("SEVEN8_IN3_223");
    expect(beatDuration(p, 0, 180)).toBeCloseTo(0.6667, 4);
    expect(beatDuration(p, 1, 180)).toBeCloseTo(0.6667, 4);
    expect(beatDuration(p, 2, 180)).toBeCloseTo(1.0, 9);
    expect(barDuration(p, 180)).toBeCloseTo(2.3333, 4);
    const ic = ictuses(buildTimeline(p, exercise({ patternId: p.id, tempo: { bpm: 180, unit: "♪" }, bars: 1 })).events);
    expect(ic[1].t - ic[0].t).toBeCloseTo(2 / 3, 9);
    expect(ic[2].t - ic[1].t).toBeCloseTo(2 / 3, 9);
  });

  it("검증3: 4/4에서 3박 시작 → 예비박은 2박 동작, 1박 시작 → 4박 동작", () => {
    const four = getPattern("FOUR");
    const prepOf = (beat: number) =>
      ofType(buildTimeline(four, exercise({ start: { beat } })).events, "prep")[0].beat;
    expect(prepOf(3)).toBe(2);
    expect(prepOf(1)).toBe(4);
  });

  it("검증4: 끝맺음(3마디 1박) → 끝맺음 준비 시각 = 끝맺음 시각 − 4박 길이", () => {
    const tl = buildTimeline(
      getPattern("FOUR"),
      exercise({ bars: 0, cutoff: { bar: 3, beat: 1, type: "circle", hand: "right" } }),
    );
    const prep = ofType(tl.events, "cutoffPrep");
    const cut = ofType(tl.events, "cutoff");
    expect(prep).toHaveLength(1);
    expect(cut).toHaveLength(1);
    expect(cut[0].t - prep[0].t).toBeCloseTo(beatDuration(getPattern("FOUR"), 3, 60), 9);
    // 끝맺음 박에는 소리 나는 박점이 없다: 박점은 2마디 4박까지 8개
    expect(ictuses(tl.events)).toHaveLength(8);
    expect(tl.finite).toBe(true);
  });
});

describe("예비박 규칙 (DESIGN.md 4.4 표 전체)", () => {
  const table: Array<[string, number, number]> = [
    ["TWO", 1, 2],
    ["TWO", 2, 1],
    ["THREE", 1, 3],
    ["THREE", 2, 1],
    ["THREE", 3, 2],
    ["FOUR", 1, 4],
    ["FOUR", 2, 1],
    ["FOUR", 3, 2],
    ["FOUR", 4, 3],
    ["SIX_GERMAN", 1, 6],
    ["SIX_GERMAN", 4, 3],
  ];
  it.each(table)("%s, %i박 시작 → 예비박은 %i박 동작", (id, start, expected) => {
    const p = getPattern(id);
    expect(prepBeatFor(p.beats.length, start)).toBe(expected);
    const tl = buildTimeline(p, exercise({ patternId: id, start: { beat: start } }));
    const prep = ofType(tl.events, "prep");
    expect(prep).toHaveLength(1);
    expect(prep[0].beat).toBe(expected);
    // 준비 자세는 예비박 박점에서 기다린다
    expect(tl.steps[0].holdBeat).toBe(expected);
    // 첫 소리는 시작 박
    expect(ictuses(tl.events)[0].beat).toBe(start);
    // 예비박은 첫 소리 정확히 한 박 전
    expect(ictuses(tl.events)[0].t - prep[0].t).toBeCloseTo(prep[0].dur, 9);
  });
});

describe("카운트인·못갖춘마디·반 박 시작", () => {
  it("카운트인 1마디: 클릭 4번, 손은 준비 자세에 있다가 마지막 카운트인 박에서 예비 동작", () => {
    const tl = buildTimeline(getPattern("FOUR"), exercise({ countIn: 1 }));
    const counts = ofType(tl.events, "countin");
    expect(counts.map((c) => c.beat)).toEqual([1, 2, 3, 4]);
    const intro = tl.steps.filter((s) => s.kind === "intro");
    expect(intro.map((s) => s.move)).toEqual([false, false, false, true]);
    expect(ofType(tl.events, "prep")[0].t).toBeCloseTo(counts[3].t, 9);
    expect(ictuses(tl.events)[0].t - counts[3].t).toBeCloseTo(1, 9);
  });

  it("카운트인 2마디 + 3박 시작: 카운트인은 시작 박 바로 앞에서 끝난다", () => {
    const tl = buildTimeline(getPattern("FOUR"), exercise({ countIn: 2, start: { beat: 3 } }));
    const counts = ofType(tl.events, "countin");
    expect(counts.map((c) => c.beat)).toEqual([3, 4, 1, 2, 3, 4, 1, 2]);
    expect(ictuses(tl.events)[0].beat).toBe(3);
  });

  it("4/4 4박 시작(못갖춘마디): 첫 소리는 0마디 4박, 다음이 1마디 1박, 2마디를 채우고 끝", () => {
    const tl = buildTimeline(getPattern("FOUR"), exercise({ start: { beat: 4 }, bars: 2 }));
    const ic = ictuses(tl.events);
    expect([ic[0].bar, ic[0].beat]).toEqual([0, 4]);
    expect([ic[1].bar, ic[1].beat]).toEqual([1, 1]);
    expect(ic).toHaveLength(1 + 8);
  });

  it("4/4 4박 뒷 반 박 시작: 두 박 예비(3박→4박 동작), 첫 소리는 4박 한가운데", () => {
    const tl = buildTimeline(getPattern("FOUR"), exercise({ start: { beat: 4, half: true } }));
    const preps = ofType(tl.events, "prep");
    expect(preps.map((p) => p.beat)).toEqual([3, 4]);
    const first = ictuses(tl.events)[0];
    expect(first.half).toBe(true);
    expect(first.t).toBeCloseTo(preps[1].t + 0.5, 9);
    const second = ictuses(tl.events)[1];
    expect([second.bar, second.beat]).toEqual([1, 1]);
  });

  it("반 박 시작에서 한 박 예비를 고르면 4박 동작 하나만", () => {
    const tl = buildTimeline(getPattern("FOUR"), exercise({ start: { beat: 4, half: true }, prep: "oneBeat" }));
    expect(ofType(tl.events, "prep").map((p) => p.beat)).toEqual([4]);
  });
});

describe("진입 신호와 분할", () => {
  it("큐(2마디 1박, 2박 전 시선): 시선 → 예비(1박 전) → 신호 순서와 시각", () => {
    const tl = buildTimeline(
      getPattern("FOUR"),
      exercise({ bars: 3, cues: [{ bar: 2, beat: 1, section: "소프라노", gesture: "palm", lookBeatsBefore: 2 }] }),
    );
    const cue = ofType(tl.events, "cue")[0];
    const prep = ofType(tl.events, "cuePrep")[0];
    const look = ofType(tl.events, "cueLook")[0];
    const target = ictuses(tl.events).find((e) => e.bar === 2 && e.beat === 1)!;
    expect(cue.t).toBeCloseTo(target.t, 9);
    expect(cue.t - prep.t).toBeCloseTo(1, 9);
    expect(cue.t - look.t).toBeCloseTo(2, 9);
    expect(cue.section).toBe("소프라노");
  });

  it("4박자 분할: 한 마디에 박점 4개 + 보조 박점 4개, 보조 박점은 박 한가운데", () => {
    const p = getPattern("SUB_FOUR_8");
    const tl = buildTimeline(p, exercise({ patternId: p.id, tempo: { bpm: 40, unit: "♩" }, bars: 1 }));
    const main = ictuses(tl.events);
    const sub = tl.events.filter((e) => e.type === "ictus" && e.sub);
    expect(main).toHaveLength(4);
    expect(sub).toHaveLength(4);
    expect(sub[0].t - main[0].t).toBeCloseTo(0.75, 9);
  });

  it("분할 클릭(일반 패턴): 6/8 빠르게(♩.)는 한 박을 셋으로", () => {
    const p = getPattern("SIX8_IN2");
    const tl = buildTimeline(p, exercise({ patternId: p.id, bars: 1, subdivisionClick: true }));
    expect(tl.steps.find((s) => s.kind === "play")!.subFractions).toEqual([1 / 3, 2 / 3]);
  });
});

describe("재생 중 빠르기 변경과 무한 반복", () => {
  it("BPM을 바꾸면 다음 박부터 새 빠르기, 이미 지난 박의 위치는 그대로", () => {
    let bpm = 60;
    const gen = generateSteps(getPattern("FOUR"), exercise({ bars: 0 }), () => bpm);
    const ready = gen.next().value!;
    const prep = gen.next().value!;
    const b1 = gen.next().value!;
    expect(b1.dur).toBeCloseTo(1, 9);
    bpm = 120;
    const b2 = gen.next().value!;
    expect(b2.t).toBeCloseTo(ready.dur + prep.dur + b1.dur, 9);
    expect(b2.dur).toBeCloseTo(0.5, 9);
  });

  it("bars 0이면 끝없이 이어지고, StepTrack은 필요한 시각까지만 만든다", () => {
    const track = new StepTrack(getPattern("THREE"), exercise({ bars: 0, patternId: "THREE" }), () => 120);
    expect(track.steps.length).toBe(1);
    track.ensureUntil(100);
    const st = track.stepAt(100);
    expect(st.t).toBeLessThanOrEqual(100);
    expect(st.t + st.dur).toBeGreaterThan(100);
    expect(track.ended).toBe(false);
    // 100초 근처까지만 만들었다 (한두 박 여유)
    expect(track.last.t).toBeLessThan(101);
  });

  it("StepTrack.indexAt: 스텝 경계에서는 새 스텝을 돌려준다", () => {
    const track = new StepTrack(getPattern("FOUR"), exercise(), () => 60);
    track.ensureUntil(5);
    const firstPlay = track.steps.find((s) => s.kind === "play")!;
    expect(track.stepAt(firstPlay.t).i).toBe(firstPlay.i);
    expect(track.stepAt(firstPlay.t - 1e-6).i).toBe(firstPlay.i - 1);
    expect(close(track.stepAt(0).t, 0)).toBe(true);
  });

  it("유한 연습은 end 스텝에서 멈춘다 (마지막 박 다음 1박 자리)", () => {
    const tl = buildTimeline(getPattern("FOUR"), exercise({ bars: 1 }));
    const end = tl.steps[tl.steps.length - 1];
    expect(end.kind).toBe("end");
    expect(end.holdBeat).toBe(1);
    expect(end.dur).toBe(Infinity);
  });
});
