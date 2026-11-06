/**
 * 타임라인 엔진 (DESIGN.md 7.1)
 *
 * 연습(Exercise) + 패턴 → "스텝" 목록. 스텝 하나는 한 박 길이(준비 자세는 정해진 초)이며,
 * 그 시간 동안 손이 어떤 박의 궤적을 따라 움직이는지(또는 멈춰 있는지)와
 * 시작 순간에 소리(클릭)가 나는지를 담는다.
 *
 * 스텝은 필요할 때마다 하나씩 만든다(제너레이터). 그래서 재생 중 BPM을 바꾸면
 * 아직 만들지 않은 다음 박부터 새 빠르기가 적용되고, 지금 박의 위치는 그대로 유지된다.
 *
 * 마디 번호 규칙: 첫 박이 1박이면 그 마디가 1마디. 못갖춘마디(1박이 아닌 박에서 시작)는 0마디.
 * 카운트인·예비박이 들어가는 앞쪽 마디는 0, -1 … 로 센다.
 */
import type { Accent, CueDef, Exercise, PatternDef, TimelineEvent } from "./types";

export type StepKind = "ready" | "intro" | "play" | "cutoff" | "end";

export interface CueMark {
  phase: "look" | "prep" | "cue";
  cue: CueDef;
}

export interface Step {
  /** 스텝 순번 (0 = 준비 자세) */
  i: number;
  kind: StepKind;
  /** 시작 시각(초) */
  t: number;
  /** 길이(초). end는 Infinity */
  dur: number;
  /** 첫 '소리 나는 정박'(첫 play 스텝)을 0으로 한 박 위치 */
  q: number;
  bar: number;
  /** 이 스텝이 나타내는 박 번호(1부터). 움직이는 스텝이면 이 박의 궤적을 따라간다 */
  beat: number;
  accent: Accent;
  /** true면 beat 박의 궤적을 따라 움직인다. false면 holdBeat 박점에 멈춰 있다 */
  move: boolean;
  holdBeat: number;
  /** 시작 순간 카운트인 클릭 */
  countIn: boolean;
  /** 예비 동작 */
  prep: boolean;
  /** 시작 순간 소리 나는 박점 */
  ictus: boolean;
  /** 반 박 시작: 스텝 한가운데(t + dur/2)에서 첫 소리 */
  halfAttack: boolean;
  /** 끝맺음 바로 앞 박 (손을 들어 올려 끝맺음을 준비) */
  cutoffPrep: boolean;
  /** 분할 박점/클릭 위치 (dur에 대한 비율) */
  subFractions: number[];
  /** 분할 박점이 실제로 지휘되는지(분할 패턴) — 아니면 클릭만 */
  subVisible: boolean;
  cues: CueMark[];
}

export interface ExercisePlan {
  /** 한 마디 박 수 */
  n: number;
  /** 첫 play 스텝의 절대 박 위치 (마디 × n + 박-1) */
  abs0: number;
  /** 움직이는 예비 스텝 수 */
  prepCount: number;
  countInSlots: number;
  /** 준비 자세 이후, 첫 play 스텝 전의 스텝 수 */
  introLen: number;
  /** play가 끝나는 위치(이 위치는 포함하지 않음). null = 무한 반복 */
  endQ: number | null;
  /** 준비 자세의 박(이 박의 박점에서 기다린다) */
  readyBeat: number;
  half: boolean;
  startBeat: number;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function beatWeights(pattern: PatternDef): number[] {
  return pattern.weights ?? pattern.beats.map(() => 1);
}

/** tempoUnit 하나의 길이(초) */
export function unitSeconds(bpm: number): number {
  return 60 / bpm;
}

/** 박 하나의 길이(초). beatIdx는 0부터 */
export function beatDuration(pattern: PatternDef, beatIdx: number, bpm: number): number {
  return unitSeconds(bpm) * beatWeights(pattern)[beatIdx];
}

export function barDuration(pattern: PatternDef, bpm: number): number {
  return beatWeights(pattern).reduce((s, w) => s + w, 0) * unitSeconds(bpm);
}

/** DESIGN.md 4.4: 예비박 = 시작 박의 바로 앞 박. 1박 시작이면 마지막 박 */
export function prepBeatFor(beatsPerBar: number, startBeat: number): number {
  return startBeat === 1 ? beatsPerBar : startBeat - 1;
}

/** 분할 클릭을 켰을 때 한 박을 몇으로 나누는지 */
export function subdivisionCount(pattern: PatternDef, beatIdx: number): number {
  if (pattern.subdivide) return pattern.subdivide;
  const w = pattern.weights?.[beatIdx];
  if (w && w > 1) return w;
  return pattern.tempoUnit === "♩." ? 3 : 2;
}

function fractions(count: number): number[] {
  const out: number[] = [];
  for (let j = 1; j < count; j++) out.push(j / count);
  return out;
}

export function planExercise(pattern: PatternDef, ex: Exercise): ExercisePlan {
  const n = pattern.beats.length;
  const startBeat = Math.min(n, Math.max(1, Math.round(ex.start.beat)));
  const half = !!ex.start.half;
  // 정박 시작: 시작 박이 첫 play. 반 박 시작: 시작 박은 예비(+첫 소리), 다음 박이 첫 play
  const k0 = half ? startBeat % n : startBeat - 1;
  const firstBar = k0 === 0 ? 1 : 0;
  const abs0 = firstBar * n + k0;
  const metric = (bar: number, beat: number) => bar * n + (beat - 1);

  const mode = ex.prep === "auto" ? (half ? "twoBeat" : "oneBeat") : ex.prep;
  let prepCount = mode === "twoBeat" ? 2 : mode === "oneBeat" ? 1 : 0;
  if (half) prepCount = Math.max(prepCount, 1); // 반 박 시작은 시작 박 동작이 반드시 필요
  const countInSlots = ex.countIn * n;
  const introLen = Math.max(countInSlots, prepCount);

  let endQ: number | null = null;
  if (ex.cutoff) endQ = Math.max(0, metric(ex.cutoff.bar, ex.cutoff.beat) - abs0);
  else if (ex.bars > 0) endQ = Math.max(0, metric(ex.bars + 1, 1) - abs0);

  const readyQ = prepCount > 0 ? -prepCount : 0;
  const readyBeat = mod(abs0 + readyQ, n) + 1;
  return { n, abs0, prepCount, countInSlots, introLen, endQ, readyBeat, half, startBeat };
}

function cueIndex(cues: CueDef[], plan: ExercisePlan): Map<number, CueMark[]> {
  const map = new Map<number, CueMark[]>();
  const add = (q: number, mark: CueMark) => {
    const list = map.get(q) ?? [];
    list.push(mark);
    map.set(q, list);
  };
  for (const cue of cues) {
    const qc = cue.bar * plan.n + (cue.beat - 1) - plan.abs0;
    add(qc - cue.lookBeatsBefore, { phase: "look", cue });
    add(qc - 1, { phase: "prep", cue });
    add(qc, { phase: "cue", cue });
  }
  return map;
}

/**
 * 스텝을 하나씩 만든다. getBpm은 스텝을 만들 때마다 읽으므로 재생 중 빠르기 변경이 다음 박부터 반영된다.
 */
export function* generateSteps(
  pattern: PatternDef,
  ex: Exercise,
  getBpm: () => number,
): Generator<Step, void, undefined> {
  const plan = planExercise(pattern, ex);
  const { n } = plan;
  const weights = beatWeights(pattern);
  const cues = cueIndex(ex.cues ?? [], plan);
  const posAt = (q: number) => {
    const m = plan.abs0 + q;
    return { bar: Math.floor(m / n), beatIdx: mod(m, n) };
  };
  const durOf = (beatIdx: number) => {
    const bpm = Math.min(400, Math.max(10, getBpm()));
    return unitSeconds(bpm) * weights[beatIdx];
  };

  let i = 0;
  let t = 0;

  const readyPos = posAt(plan.prepCount > 0 ? -plan.prepCount : 0);
  yield {
    i: i++,
    kind: "ready",
    t,
    dur: Math.max(0, ex.readyHoldSec),
    q: -plan.introLen - 1,
    bar: readyPos.bar,
    beat: plan.readyBeat,
    accent: pattern.beats[plan.readyBeat - 1].accent,
    move: false,
    holdBeat: plan.readyBeat,
    countIn: false,
    prep: false,
    ictus: false,
    halfAttack: false,
    cutoffPrep: false,
    subFractions: [],
    subVisible: false,
    cues: [],
  };
  t += Math.max(0, ex.readyHoldSec);

  // 카운트인 + 예비박
  for (let q = -plan.introLen; q < 0; q++) {
    const { bar, beatIdx } = posAt(q);
    const dur = durOf(beatIdx);
    const move = q >= -plan.prepCount;
    const halfAttack = plan.half && q === -1;
    yield {
      i: i++,
      kind: "intro",
      t,
      dur,
      q,
      bar,
      beat: beatIdx + 1,
      accent: pattern.beats[beatIdx].accent,
      move,
      holdBeat: plan.readyBeat,
      countIn: q >= -plan.countInSlots,
      prep: move,
      ictus: false,
      halfAttack,
      cutoffPrep: false,
      subFractions: [],
      subVisible: !!pattern.subdivide,
      cues: cues.get(q) ?? [],
    };
    t += dur;
  }

  // 소리 나는 박
  const endQ = plan.endQ;
  for (let q = 0; endQ === null || q < endQ; q++) {
    const { bar, beatIdx } = posAt(q);
    const dur = durOf(beatIdx);
    const withSubs = !!pattern.subdivide || !!ex.subdivisionClick;
    yield {
      i: i++,
      kind: "play",
      t,
      dur,
      q,
      bar,
      beat: beatIdx + 1,
      accent: pattern.beats[beatIdx].accent,
      move: true,
      holdBeat: beatIdx + 1,
      countIn: false,
      prep: false,
      ictus: true,
      halfAttack: false,
      cutoffPrep: !!ex.cutoff && endQ !== null && q === endQ - 1,
      subFractions: withSubs ? fractions(subdivisionCount(pattern, beatIdx)) : [],
      subVisible: !!pattern.subdivide,
      cues: cues.get(q) ?? [],
    };
    t += dur;
  }

  // 끝맺음 / 끝 (무한 반복이면 여기에 오지 않는다)
  const { bar, beatIdx } = posAt(endQ ?? 0);
  if (ex.cutoff) {
    const dur = durOf(beatIdx);
    yield {
      i: i++,
      kind: "cutoff",
      t,
      dur,
      q: endQ ?? 0,
      bar,
      beat: beatIdx + 1,
      accent: pattern.beats[beatIdx].accent,
      move: false,
      holdBeat: beatIdx + 1,
      countIn: false,
      prep: false,
      ictus: false,
      halfAttack: false,
      cutoffPrep: false,
      subFractions: [],
      subVisible: false,
      cues: cues.get(endQ ?? 0) ?? [],
    };
    t += dur;
  }
  yield {
    i: i++,
    kind: "end",
    t,
    dur: Infinity,
    q: (endQ ?? 0) + (ex.cutoff ? 1 : 0),
    bar,
    beat: beatIdx + 1,
    accent: pattern.beats[beatIdx].accent,
    move: false,
    holdBeat: beatIdx + 1,
    countIn: false,
    prep: false,
    ictus: false,
    halfAttack: false,
    cutoffPrep: false,
    subFractions: [],
    subVisible: false,
    cues: [],
  };
}

/** 스텝 하나를 DESIGN.md 6.4의 이벤트로 바꾼다 */
export function stepEvents(step: Step, ex: Exercise): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  switch (step.kind) {
    case "ready":
      out.push({ type: "ready", t: step.t });
      break;
    case "intro":
      if (step.countIn) out.push({ type: "countin", t: step.t, beat: step.beat });
      if (step.prep) out.push({ type: "prep", t: step.t, beat: step.beat, dur: step.dur });
      if (step.halfAttack)
        out.push({
          type: "ictus",
          t: step.t + step.dur / 2,
          bar: step.bar,
          beat: step.beat,
          accent: "weak",
          dur: step.dur / 2,
          half: true,
        });
      break;
    case "play":
      out.push({ type: "ictus", t: step.t, bar: step.bar, beat: step.beat, accent: step.accent, dur: step.dur });
      for (const f of step.subFractions)
        out.push({
          type: "ictus",
          t: step.t + f * step.dur,
          bar: step.bar,
          beat: step.beat,
          accent: "weak",
          dur: step.dur / (step.subFractions.length + 1),
          sub: true,
        });
      if (step.cutoffPrep && ex.cutoff)
        out.push({ type: "cutoffPrep", t: step.t, hand: ex.cutoff.hand, cutoffType: ex.cutoff.type });
      break;
    case "cutoff":
      if (ex.cutoff) out.push({ type: "cutoff", t: step.t, hand: ex.cutoff.hand, cutoffType: ex.cutoff.type });
      break;
    case "end":
      out.push({ type: "end", t: step.t });
      break;
  }
  for (const mark of step.cues) {
    const type = mark.phase === "look" ? "cueLook" : mark.phase === "prep" ? "cuePrep" : "cue";
    out.push({ type, t: step.t, section: mark.cue.section, gesture: mark.cue.gesture });
  }
  return out;
}

export interface BuiltTimeline {
  steps: Step[];
  events: TimelineEvent[];
  /** 끝(end)까지의 길이. 무한 반복이면 만든 스텝까지의 길이 */
  duration: number;
  finite: boolean;
}

/** 정해진 빠르기로 타임라인 전체를 만든다 (무한 반복이면 maxSteps까지) */
export function buildTimeline(
  pattern: PatternDef,
  ex: Exercise,
  opts: { bpm?: number; maxSteps?: number } = {},
): BuiltTimeline {
  const bpm = opts.bpm ?? ex.tempo.bpm;
  const max = opts.maxSteps ?? 5000;
  const steps: Step[] = [];
  for (const st of generateSteps(pattern, ex, () => bpm)) {
    steps.push(st);
    if (st.kind === "end" || steps.length >= max) break;
  }
  const last = steps[steps.length - 1];
  const finite = last.kind === "end";
  const events = steps
    .flatMap((s) => stepEvents(s, ex))
    .map((e, idx) => ({ e, idx }))
    .sort((a, b) => a.e.t - b.e.t || a.idx - b.idx)
    .map(({ e }) => e);
  return { steps, events, duration: finite ? last.t : last.t + last.dur, finite };
}

/**
 * 재생 중에 쓰는 스텝 저장소. 필요한 시각까지만 스텝을 만들고, 시각으로 스텝을 찾는다.
 */
export class StepTrack {
  private list: Step[] = [];
  private gen: Generator<Step, void, undefined>;
  private finished = false;

  constructor(
    readonly pattern: PatternDef,
    readonly exercise: Exercise,
    getBpm: () => number,
  ) {
    this.gen = generateSteps(pattern, exercise, getBpm);
    this.pull();
  }

  get steps(): readonly Step[] {
    return this.list;
  }

  get last(): Step {
    return this.list[this.list.length - 1];
  }

  get ended(): boolean {
    return this.last.kind === "end";
  }

  private pull(): boolean {
    if (this.finished) return false;
    const r = this.gen.next();
    if (r.done) {
      this.finished = true;
      return false;
    }
    this.list.push(r.value);
    return true;
  }

  /** 시각 t를 포함하는 스텝이 생길 때까지 만든다 */
  ensureUntil(t: number): void {
    while (!this.ended && this.last.t + this.last.dur <= t) {
      if (!this.pull()) break;
    }
  }

  /** 다음 스텝을 하나 더 만든다 (한 박씩 보기용) */
  ensureNext(index: number): boolean {
    while (this.list[this.list.length - 1].i < index) {
      if (this.ended || !this.pull()) return false;
    }
    return true;
  }

  /** 시각 t를 포함하는 스텝의 배열 위치 (t가 시작 전이면 0) */
  indexAt(t: number): number {
    this.ensureUntil(t);
    let lo = 0;
    let hi = this.list.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.list[mid].t <= t) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  stepAt(t: number): Step {
    return this.list[this.indexAt(t)];
  }

  /** 오래된 스텝을 지워 메모리를 아낀다 (현재 시각보다 keepSec 이전) */
  trim(now: number, keepSec = 120): void {
    if (this.list.length < 4000) return;
    let cut = 0;
    while (cut < this.list.length - 2 && this.list[cut].t + this.list[cut].dur < now - keepSec) cut++;
    if (cut > 0) this.list.splice(0, cut);
  }
}
