/**
 * 궤적 생성기 (DESIGN.md 7.2)
 *
 * "박 k의 몇 %(phase)인가" → 지휘봉 끝 위치.
 *
 * 한 박의 움직임은 하나 이상의 '획(stroke)'으로 이루어진다.
 *   획 = 박점 → (경유점) → 정점 → (경유점) → 다음 박점
 * - 박점에서 반동 정점까지는 점점 느려지고(튀어 오른 공처럼), 정점에서 다음 박점까지는 점점 빨라진다.
 * - 박점은 '뾰족하게' 찍힌다: 들어오는 선과 나가는 선을 따로 그려 박점에서 방향이 꺾인다.
 * - 경로 모양은 구심 Catmull-Rom 스플라인으로 잇고, 시간 진행은 길이(호 길이) 기준으로 나눈다.
 *
 * 마지막 박(위로 가는 박)은 반동 정점 A를 지나 꼭대기까지 계속 올라가므로, 꼭대기를 정점으로 본다.
 * 분할 패턴은 박 안에 작은 획(보조 박점)을 더 넣는다.
 */
import type { Accent, Articulation, ExerciseStyle, PatternDef, Vec, Vec3 } from "./types";
import { DEFAULT_STYLE } from "./types";

export interface ArticulationParams {
  /** 반동 정점 도달 시점 (획 길이 비율) */
  r: number;
  /** 박점에 머무는 시간 (획 길이 비율) */
  dwell: number;
  /** 반동 높이 배율 */
  rebound: number;
  /** 경유점 가중치: 1 = 데이터 그대로(곡선), 0 = 직선 위로 당김 */
  viaWeight: number;
  /** 정점에서의 최저 속도 비율 (0이면 정점에서 완전히 멈춤) */
  minSpeed: number;
  /** 가감속 곡선 */
  curve: "quad" | "sine";
}

/** DESIGN.md 7.2 주법 파라미터 표 (+ 정점 최저 속도·곡선 종류) */
export const ARTICULATION: Record<Articulation, ArticulationParams> = {
  legato: { r: 0.45, dwell: 0, rebound: 0.8, viaWeight: 1.0, minSpeed: 0.35, curve: "sine" },
  neutral: { r: 0.35, dwell: 0, rebound: 1.0, viaWeight: 0.8, minSpeed: 0.12, curve: "quad" },
  staccato: { r: 0.25, dwell: 0.08, rebound: 1.0, viaWeight: 0.3, minSpeed: 0, curve: "quad" },
  marcato: { r: 0.3, dwell: 0.05, rebound: 1.25, viaWeight: 0.5, minSpeed: 0.05, curve: "quad" },
};

/** 마지막 박은 꼭대기까지 올라가므로 정점 시점을 이만큼 늦춘다 (보통 0.35 → 0.5) */
export const UPBEAT_APEX_DELAY = 0.15;
/** 분할 패턴: 보조 박점 간격, 보조 반동 높이, 보조 정점 시점 (DESIGN.md 7.2) */
export const SUB_ICTUS_STEP = 0.12;
export const SUB_REBOUND_HEIGHT = 0.15;
export const SUB_APEX_R = 0.4;
export const DEFAULT_TOP: Vec3 = [0, 0.95, 0];
/** 번호 기본 위치: 박점 아래 */
export const LABEL_OFFSET = 0.11;

const SAMPLES_PER_SEGMENT = 32;
const EPS = 1e-6;

export interface Stroke {
  /** 박 안에서 이 획이 차지하는 구간 (0~1) */
  t0: number;
  t1: number;
  dwell: number;
  rApex: number;
  minSpeed: number;
  curve: "quad" | "sine";
  /** 촘촘한 경로 점과 누적 길이 */
  samples: Vec3[];
  cum: number[];
  /** samples 안에서 정점의 위치 */
  apexSample: number;
  /** 제어점 (디버그·미리보기용) */
  controls: Vec3[];
  apexIndex: number;
}

export interface PreparedBeat {
  index: number;
  n: number;
  accent: Accent;
  /** 박점 */
  P: Vec3;
  /** 다음 박점 */
  next: Vec3;
  /** 시간상 정점 (반동 정점 또는 꼭대기) */
  apex: Vec3;
  label: Vec3;
  strokes: Stroke[];
  /** 분할 패턴의 보조 박점들 */
  subIctus: Vec3[];
}

export interface PreparedPattern {
  pattern: PatternDef;
  style: ExerciseStyle;
  params: ArticulationParams;
  n: number;
  beats: PreparedBeat[];
}

// ---------- 벡터 도우미 ----------
const v3 = (v: Vec): Vec3 => [v[0], v[1], v.length > 2 ? (v as Vec3)[2] : 0];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const mid = (a: Vec3, b: Vec3) => lerp(a, b, 0.5);
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l < EPS ? [0, 1, 0] : [a[0] / l, a[1] / l, a[2] / l];
};
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** 구심 Catmull-Rom (alpha = 0.5): p1 → p2 구간의 t(0~1) 위치 */
export function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const k = (a: Vec3, b: Vec3) => Math.max(Math.sqrt(dist(a, b)), EPS);
  const t0 = 0;
  const t1 = t0 + k(p0, p1);
  const t2 = t1 + k(p1, p2);
  const t3 = t2 + k(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const A1 = lerp(p0, p1, (tt - t0) / (t1 - t0));
  const A2 = lerp(p1, p2, (tt - t1) / (t2 - t1));
  const A3 = lerp(p2, p3, (tt - t2) / (t3 - t2));
  const B1 = lerp(A1, A2, (tt - t0) / (t2 - t0));
  const B2 = lerp(A2, A3, (tt - t1) / (t3 - t1));
  return lerp(B1, B2, (tt - t1) / (t2 - t1));
}

function easeOut(x: number, m: number, curve: "quad" | "sine"): number {
  const e = curve === "sine" ? Math.sin((x * Math.PI) / 2) : 1 - (1 - x) * (1 - x);
  return (1 - m) * e + m * x;
}

function easeIn(x: number, m: number, curve: "quad" | "sine"): number {
  const e = curve === "sine" ? 1 - Math.cos((x * Math.PI) / 2) : x * x;
  return (1 - m) * e + m * x;
}

/** 경유점을 '정점→다음 박점' 직선 쪽으로 당긴다 (weight 0 = 직선 위, 1 = 그대로) */
function straighten(v: Vec3, s: Vec3, e: Vec3, weight: number): Vec3 {
  const se = sub(e, s);
  const len2 = dot(se, se);
  const t = len2 < EPS ? 0 : clamp(dot(sub(v, s), se) / len2, 0, 1);
  const onLine = add(s, mul(se, t));
  return add(onLine, mul(sub(v, onLine), weight));
}

function buildStroke(
  controls: Vec3[],
  apexIndex: number,
  t0: number,
  t1: number,
  rApex: number,
  params: ArticulationParams,
): Stroke {
  const last = controls.length - 1;
  // 양 끝은 반사점으로 이어 붙여, 박점에서 선이 꺾이도록(박점을 찍는 느낌) 한다
  const ext = [
    sub(mul(controls[0], 2), controls[1]),
    ...controls,
    sub(mul(controls[last], 2), controls[last - 1]),
  ];
  const samples: Vec3[] = [controls[0]];
  for (let s = 0; s < last; s++) {
    for (let j = 1; j <= SAMPLES_PER_SEGMENT; j++) {
      samples.push(catmullRom(ext[s], ext[s + 1], ext[s + 2], ext[s + 3], j / SAMPLES_PER_SEGMENT));
    }
  }
  const cum = [0];
  for (let j = 1; j < samples.length; j++) cum.push(cum[j - 1] + dist(samples[j - 1], samples[j]));
  return {
    t0,
    t1,
    dwell: params.dwell,
    rApex: clamp(rApex, 0.05, 0.95),
    minSpeed: params.minSpeed,
    curve: params.curve,
    samples,
    cum,
    apexSample: apexIndex * SAMPLES_PER_SEGMENT,
    controls,
    apexIndex,
  };
}

function pointAtLength(st: Stroke, L: number): Vec3 {
  const { cum, samples } = st;
  if (L <= 0) return samples[0];
  const total = cum[cum.length - 1];
  if (L >= total) return samples[samples.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] <= L) lo = m;
    else hi = m;
  }
  const seg = cum[hi] - cum[lo];
  return lerp(samples[lo], samples[hi], seg < EPS ? 0 : (L - cum[lo]) / seg);
}

/** 획 안의 진행률 s(0~1) → 위치 */
export function sampleStroke(st: Stroke, s: number): Vec3 {
  if (s <= st.dwell) return st.samples[0];
  const x = clamp((s - st.dwell) / (1 - st.dwell), 0, 1);
  const Lapex = st.cum[st.apexSample];
  const Ltotal = st.cum[st.cum.length - 1];
  if (x < st.rApex) {
    return pointAtLength(st, easeOut(x / st.rApex, st.minSpeed, st.curve) * Lapex);
  }
  const u = easeIn((x - st.rApex) / (1 - st.rApex), st.minSpeed, st.curve);
  return pointAtLength(st, Lapex + u * (Ltotal - Lapex));
}

/** 불규칙 박: 긴 박일수록 반동을 높게 (DESIGN.md 7.2) */
function weightFactor(pattern: PatternDef, k: number): number {
  if (!pattern.weights) return 1;
  const mean = pattern.weights.reduce((s, w) => s + w, 0) / pattern.weights.length;
  return 0.7 + (0.3 * pattern.weights[k]) / mean;
}

function prepareBeat(pattern: PatternDef, k: number, style: ExerciseStyle, params: ArticulationParams): PreparedBeat {
  const n = pattern.beats.length;
  const size = style.size;
  const scale = (v: Vec): Vec3 => mul(v3(v), size);
  const beat = pattern.beats[k];
  const next = pattern.beats[(k + 1) % n];
  const P = scale(beat.P);
  const Pn = scale(next.P);
  const isUpbeat = n > 1 && k === n - 1;
  const rebound = params.rebound * style.reboundScale * weightFactor(pattern, k);
  const A = add(P, mul(sub(scale(beat.A), P), rebound));
  const vias = (beat.via ?? []).map(scale);

  let pre: Vec3[] = [];
  let apex: Vec3;
  let post: Vec3[] = [];
  let r: number;
  if (isUpbeat) {
    // 마지막 박: A를 지나 꼭대기까지 올라간 뒤 1박으로 떨어진다
    const top = vias.length ? vias[vias.length - 1] : scale(pattern.topPoint ?? DEFAULT_TOP);
    pre = [A, ...vias.slice(0, -1)];
    apex = top;
    r = beat.r ?? clamp(params.r + UPBEAT_APEX_DELAY, 0.1, 0.9);
  } else {
    apex = A;
    post = vias.map((v) => straighten(v, A, Pn, params.viaWeight));
    r = beat.r ?? params.r;
  }

  const strokes: Stroke[] = [];
  const subIctus: Vec3[] = [];
  const parts = pattern.subdivide ?? 1;
  let start = P;
  if (parts > 1) {
    const dir = isUpbeat ? ([0, 1, 0] as Vec3) : unit(sub(Pn, P));
    const ictus: Vec3[] = [P];
    for (let j = 1; j < parts; j++) ictus.push(add(P, mul(dir, SUB_ICTUS_STEP * size * j)));
    for (let j = 0; j < parts - 1; j++) {
      const hop = add(mid(ictus[j], ictus[j + 1]), [0, SUB_REBOUND_HEIGHT * size * style.reboundScale, 0]);
      strokes.push(buildStroke([ictus[j], hop, ictus[j + 1]], 1, j / parts, (j + 1) / parts, SUB_APEX_R, params));
    }
    subIctus.push(...ictus.slice(1));
    start = ictus[parts - 1];
  }
  const controls = [start, ...pre, apex, ...post, Pn];
  strokes.push(buildStroke(controls, pre.length + 1, (parts - 1) / parts, 1, r, params));

  // 번호는 박점 아래 한 줄에 놓는다 (겹침은 layoutLabels가 정리). 데이터에 label이 있으면 그 위치를 쓴다
  const label = beat.label ? scale(beat.label) : ([P[0], -LABEL_OFFSET, 0] as Vec3);
  return { index: k, n: beat.n, accent: beat.accent, P, next: Pn, apex, label, strokes, subIctus };
}

/** 번호끼리 겹치지 않게 가로 간격을 벌린다 (데이터에 label을 직접 준 박은 그대로 둔다) */
export const LABEL_MIN_GAP = 0.13;

function layoutLabels(pattern: PatternDef, beats: PreparedBeat[]): void {
  const free = beats.filter((b) => !pattern.beats[b.index].label).sort((a, b) => a.P[0] - b.P[0]);
  if (free.length < 2) return;
  const target = free.map((b) => b.P[0]);
  const x = [...target];
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < x.length; i++) if (x[i] - x[i - 1] < LABEL_MIN_GAP) x[i] = x[i - 1] + LABEL_MIN_GAP;
    // 붙어 있는 묶음마다 원래 위치의 평균에 맞춰 가운데로 되돌린다
    let s = 0;
    while (s < x.length) {
      let e = s;
      while (e + 1 < x.length && x[e + 1] - x[e] <= LABEL_MIN_GAP + 1e-9) e++;
      let shift = 0;
      for (let i = s; i <= e; i++) shift += target[i] - x[i];
      shift /= e - s + 1;
      for (let i = s; i <= e; i++) x[i] += shift;
      s = e + 1;
    }
  }
  free.forEach((b, i) => {
    b.label = [x[i], b.label[1], 0];
  });
}

/** 패턴 + 주법/크기 → 바로 샘플링할 수 있는 형태 (재생 전에 한 번 계산) */
export function preparePattern(pattern: PatternDef, style: Partial<ExerciseStyle> = {}): PreparedPattern {
  const full: ExerciseStyle = { ...DEFAULT_STYLE, ...style };
  const params = ARTICULATION[full.articulation];
  const beats = pattern.beats.map((_, k) => prepareBeat(pattern, k, full, params));
  layoutLabels(pattern, beats);
  return { pattern, style: full, params, n: pattern.beats.length, beats };
}

/** 박 k(0부터)의 phase(0~1) 위치 */
export function sampleBeat(pp: PreparedPattern, k: number, phase: number): Vec3 {
  const beat = pp.beats[((k % pp.n) + pp.n) % pp.n];
  const p = clamp(phase, 0, 1);
  let st = beat.strokes[beat.strokes.length - 1];
  for (const s of beat.strokes) {
    if (p <= s.t1) {
      st = s;
      break;
    }
  }
  const span = st.t1 - st.t0;
  return sampleStroke(st, span < EPS ? 1 : (p - st.t0) / span);
}

/** 한 마디 전체 도형(고스트)을 그릴 촘촘한 점 목록 */
export function pathPolyline(pp: PreparedPattern): Vec3[] {
  const out: Vec3[] = [];
  for (const beat of pp.beats) {
    for (const st of beat.strokes) {
      out.push(...(out.length ? st.samples.slice(1) : st.samples));
    }
  }
  return out;
}

/** 박마다 같은 시간 간격으로 찍은 점 (속도 확인용: 점이 촘촘하면 느리고, 듬성하면 빠르다) */
export function timingBeads(pp: PreparedPattern, perBeat = 12): Vec3[] {
  const out: Vec3[] = [];
  for (let k = 0; k < pp.n; k++) {
    for (let j = 0; j < perBeat; j++) out.push(sampleBeat(pp, k, j / perBeat));
  }
  return out;
}
