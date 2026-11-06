/**
 * 재생 엔진: 타임라인·궤적·오디오 예약을 하나로 묶는다.
 *
 * 핵심 원칙 (DESIGN.md 7.3, 7.4)
 * - 소리와 그림은 같은 시계를 쓴다. 클릭은 오디오 시각 origin + τ에 예약하고,
 *   그림은 "지금 스피커에서 나오는 소리의 시각"(outputNow) − origin = τ 위치를 그린다.
 *   그래서 오래 재생해도 소리와 그림이 어긋나지 않는다.
 * - 클릭은 0.12초 앞까지만 미리 예약한다. 일시정지하면 아직 안 난 클릭을 취소한다.
 * - 스텝은 필요할 때만 만든다(StepTrack). BPM을 바꾸면 다음 박부터 적용된다.
 */
import type { AudioClock, ClickKind, ClickSink, TickTimer } from "./scheduler";
import { StepTrack, type Step } from "./timeline";
import { preparePattern, sampleBeat, type PreparedPattern } from "./trajectory";
import type { Accent, Exercise, ExerciseStyle, PatternDef, Vec3 } from "./types";

export type PlaybackStatus = "stopped" | "playing" | "paused";

export interface IctusInfo {
  t: number;
  beat: number;
  accent: Accent;
  sub: boolean;
  point: Vec3;
}

export interface FrameState {
  status: PlaybackStatus;
  tau: number;
  step: Step;
  /** 스텝 안에서의 진행률 0~1 */
  phase: number;
  pos: Vec3;
  /** 가장 최근에 지난 박점 (플래시용) */
  lastIctus: IctusInfo | null;
  /** 한 박씩 보기 애니메이션 중인지 */
  stepping: boolean;
  atEnd: boolean;
}

export interface BeatInfo {
  /** 화면에 크게 보일 박 번호 (없으면 null) */
  beat: number | null;
  accent: Accent;
  kind: "ready" | "countin" | "prep" | "play" | "end";
  bar: number;
  /** 바뀔 때마다 달라지는 값 (숫자 '통' 효과용) */
  key: number;
}

export interface EngineDeps {
  clock: AudioClock;
  sink: ClickSink;
  timer: TickTimer;
  /** 한 박씩 보기 애니메이션용 벽시계(초) */
  wallNow?: () => number;
}

/** 클릭을 미리 예약하는 범위(초) */
export const LOOKAHEAD = 0.12;
/** 재생 시작·재개 때 첫 소리까지 두는 여유(초) */
export const START_DELAY = 0.06;
/** 한 박씩 보기: 다음 박점까지 걸리는 시간(초) */
export const STEP_ANIM_SEC = 1.0;
/** 박점 플래시가 보이는 시간(초) */
export const FLASH_SEC = 0.15;

const EPS = 1e-6;

const clickKindOf = (accent: Accent): ClickKind => accent;

interface ClickEvent {
  tau: number;
  kind: ClickKind;
}

function clicksOf(step: Step): ClickEvent[] {
  const out: ClickEvent[] = [];
  if (step.kind === "intro") {
    if (step.countIn) out.push({ tau: step.t, kind: clickKindOf(step.accent) });
    if (step.halfAttack) out.push({ tau: step.t + step.dur / 2, kind: "weak" });
  } else if (step.kind === "play") {
    out.push({ tau: step.t, kind: clickKindOf(step.accent) });
    for (const f of step.subFractions) out.push({ tau: step.t + f * step.dur, kind: "sub" });
  }
  return out;
}

/** 스텝 안의 박점 시각들 (소리 나는 박점, 반 박 시작, 보이는 보조 박점) */
function ictusTimesOf(step: Step): Array<{ tau: number; sub: boolean }> {
  const out: Array<{ tau: number; sub: boolean }> = [];
  if (step.kind === "play") {
    out.push({ tau: step.t, sub: false });
    if (step.subVisible) for (const f of step.subFractions) out.push({ tau: step.t + f * step.dur, sub: true });
  } else if (step.kind === "intro" && step.halfAttack) {
    out.push({ tau: step.t + step.dur / 2, sub: false });
  }
  return out;
}

export class PlaybackEngine {
  private deps: EngineDeps;
  private pattern: PatternDef | null = null;
  private exercise: Exercise | null = null;
  private pendingExercise: Exercise | null = null;
  private prepared: PreparedPattern | null = null;
  private track: StepTrack | null = null;
  private bpm = 60;
  private status: PlaybackStatus = "stopped";
  private origin = 0;
  private frozenTau = 0;
  private resumeTau = 0;
  private scheduledUntil = 0;
  private atEnd = false;
  private anim: { from: number; to: number; start: number; kind: ClickKind | null } | null = null;
  private visualOffsetSec = 0;
  private listeners = new Set<() => void>();
  private beatListeners = new Set<(info: BeatInfo) => void>();
  private lastBeatKey = -1;

  constructor(deps: EngineDeps) {
    this.deps = deps;
  }

  // ---------- 구성 ----------

  /** 패턴·연습을 바꾼다. 재생 중이면 멈추고 준비 자세로 돌아간다 */
  load(pattern: PatternDef, exercise: Exercise): void {
    this.halt();
    this.pattern = pattern;
    this.exercise = exercise;
    this.pendingExercise = null;
    this.bpm = exercise.tempo.bpm;
    this.prepared = preparePattern(pattern, exercise.style);
    this.resetTrack();
    this.frozenTau = 0;
    this.atEnd = false;
    this.emit();
  }

  /** 연습 설정(루프·카운트인 등)을 바꾼다. 재생 중이면 다음 재생부터 적용 */
  setExercise(exercise: Exercise): void {
    if (!this.pattern) return;
    if (this.status === "playing" || this.status === "paused") {
      this.pendingExercise = exercise;
      return;
    }
    this.exercise = exercise;
    this.resetTrack();
    this.frozenTau = 0;
    this.atEnd = false;
    this.emit();
  }

  setStyle(style: ExerciseStyle): void {
    if (!this.pattern || !this.exercise) return;
    this.exercise = { ...this.exercise, style };
    this.prepared = preparePattern(this.pattern, style);
    this.emit();
  }

  /** 빠르기 변경: 아직 만들지 않은 다음 박부터 적용된다 */
  setBpm(bpm: number): void {
    this.bpm = Math.min(400, Math.max(10, bpm));
  }

  getBpm(): number {
    return this.bpm;
  }

  /** 화면 지연 보정(초). 블루투스 스피커처럼 소리가 늦게 나는 기기용 */
  setVisualOffset(sec: number): void {
    this.visualOffsetSec = sec;
  }

  getPrepared(): PreparedPattern | null {
    return this.prepared;
  }

  getPattern(): PatternDef | null {
    return this.pattern;
  }

  getStatus(): PlaybackStatus {
    return this.status;
  }

  /** 유한 연습이 끝까지 재생되어 멈춘 상태인지 */
  isAtEnd(): boolean {
    return this.atEnd;
  }

  /** 한 박씩 보기 애니메이션 중인지 */
  isStepping(): boolean {
    return !!this.anim;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** 박이 바뀔 때마다 알림 (큰 숫자 표시용) */
  onBeat(fn: (info: BeatInfo) => void): () => void {
    this.beatListeners.add(fn);
    return () => this.beatListeners.delete(fn);
  }

  // ---------- 재생 조작 ----------

  play(): void {
    if (!this.track || this.status === "playing") return;
    this.finishAnim("interrupt");
    if (this.status === "stopped") {
      this.applyPending();
      if (this.atEnd || this.frozenTau > 0) this.resetTrack();
      this.frozenTau = 0;
      this.atEnd = false;
    }
    const { clock } = this.deps;
    const startTau = this.frozenTau;
    // 첫 소리를 예약할 수 있도록 '지금(currentTime)'보다 조금 뒤를 τ=startTau 로 잡는다
    this.origin = clock.now() + START_DELAY - startTau;
    this.resumeTau = startTau;
    this.scheduledUntil = startTau;
    this.status = "playing";
    this.deps.timer.start(() => this.tick());
    this.tick();
    this.emit();
  }

  pause(): void {
    if (this.status !== "playing") return;
    const tau = this.tau();
    this.halt();
    this.status = "paused";
    this.frozenTau = tau;
    this.emit();
  }

  toggle(): void {
    if (this.status === "playing") this.pause();
    else this.play();
  }

  /** 정지: 처음(준비 자세)으로 되돌린다 */
  stop(): void {
    this.halt();
    this.anim = null;
    this.status = "stopped";
    this.applyPending();
    this.resetTrack();
    this.frozenTau = 0;
    this.atEnd = false;
    this.emit();
    this.emitBeat(true);
  }

  /** 다음 박점까지 1초 동안 천천히 움직이고 멈춘다 */
  stepForward(): void {
    this.beginStep(1);
  }

  /** 이전 박점으로 1초 동안 천천히 되돌아간다 */
  stepBackward(): void {
    this.beginStep(-1);
  }

  // ---------- 시각과 위치 ----------

  /** 지금 화면에 그릴 타임라인 시각 τ */
  tau(): number {
    if (this.status === "playing") {
      const t = this.deps.clock.outputNow() - this.origin - this.visualOffsetSec;
      // 재생 직후 소리가 나오기 전까지는 손을 시작 위치에 둔다 (뒤로 튀지 않게)
      return Math.max(this.resumeTau, t);
    }
    if (this.anim) {
      const k = Math.min(1, Math.max(0, (this.wallNow() - this.anim.start) / STEP_ANIM_SEC));
      return this.anim.from + (this.anim.to - this.anim.from) * k;
    }
    return this.frozenTau;
  }

  positionAt(tau: number): Vec3 {
    const track = this.track!;
    const prepared = this.prepared!;
    const step = track.stepAt(Math.max(0, tau));
    if (!step.move) return prepared.beats[step.holdBeat - 1].P;
    const phase = step.dur > 0 ? (tau - step.t) / step.dur : 1;
    return sampleBeat(prepared, step.beat - 1, phase);
  }

  /** 매 프레임 호출: 그릴 상태를 돌려주고 한 박씩 보기 애니메이션을 마무리한다 */
  frame(): FrameState | null {
    if (!this.track || !this.prepared) return null;
    if (this.anim && this.wallNow() - this.anim.start >= STEP_ANIM_SEC) this.finishAnim("complete");
    if (this.status === "playing") this.checkEnd();
    const tau = this.tau();
    const step = this.track.stepAt(Math.max(0, tau));
    const phase = step.dur > 0 && Number.isFinite(step.dur) ? Math.min(1, (tau - step.t) / step.dur) : 0;
    const frame: FrameState = {
      status: this.status,
      tau,
      step,
      phase,
      pos: this.positionAt(tau),
      lastIctus: this.lastIctusAt(tau),
      stepping: !!this.anim,
      atEnd: this.atEnd,
    };
    this.emitBeat(false, step, tau);
    return frame;
  }

  /** 계속 다시 그려야 하는 상태인지 (재생 중·한 박씩 보기·플래시) */
  isAnimating(): boolean {
    if (this.status === "playing" || this.anim) return true;
    const last = this.track ? this.lastIctusAt(this.frozenTau) : null;
    return !!last && this.frozenTau - last.t < FLASH_SEC;
  }

  dispose(): void {
    this.halt();
    this.listeners.clear();
    this.beatListeners.clear();
  }

  // ---------- 내부 ----------

  private wallNow(): number {
    return this.deps.wallNow ? this.deps.wallNow() : this.deps.clock.now();
  }

  private resetTrack(): void {
    if (!this.pattern || !this.exercise) return;
    this.track = new StepTrack(this.pattern, this.exercise, () => this.bpm);
  }

  private applyPending(): void {
    if (this.pendingExercise) {
      this.exercise = this.pendingExercise;
      this.pendingExercise = null;
    }
  }

  /** 타이머를 멈추고 아직 나지 않은 클릭을 취소한다 */
  private halt(): void {
    this.deps.timer.stop();
    this.deps.sink.cancelFrom(this.deps.clock.now());
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  private emitBeat(force: boolean, step?: Step, tau?: number): void {
    if (!this.track) return;
    const st = step ?? this.track.stepAt(Math.max(0, this.frozenTau));
    const t = tau ?? this.frozenTau;
    let info: BeatInfo;
    const accent = st.accent;
    if (st.kind === "ready") info = { beat: null, accent, kind: "ready", bar: st.bar, key: st.i };
    else if (st.kind === "intro") {
      const attacked = st.halfAttack && t >= st.t + st.dur / 2;
      if (attacked) info = { beat: st.beat, accent: "weak", kind: "play", bar: st.bar, key: st.i * 2 + 1 };
      else
        info = {
          beat: st.countIn ? st.beat : null,
          accent,
          kind: st.countIn ? "countin" : "prep",
          bar: st.bar,
          key: st.i * 2,
        };
    } else if (st.kind === "play") info = { beat: st.beat, accent, kind: "play", bar: st.bar, key: st.i * 2 };
    else info = { beat: null, accent, kind: "end", bar: st.bar, key: st.i * 2 };
    if (!force && info.key === this.lastBeatKey) return;
    this.lastBeatKey = info.key;
    for (const fn of this.beatListeners) fn(info);
  }

  /** 재생 중 25ms마다: LOOKAHEAD 앞까지 클릭을 예약한다 */
  private tick(): void {
    if (this.status !== "playing" || !this.track) return;
    const { clock, sink } = this.deps;
    const now = clock.now();
    const horizon = now + LOOKAHEAD - this.origin;
    if (horizon <= this.scheduledUntil) return;
    const track = this.track;
    track.ensureUntil(horizon);
    let idx = track.indexAt(this.scheduledUntil);
    const steps = track.steps;
    for (; idx < steps.length && steps[idx].t < horizon; idx++) {
      for (const c of clicksOf(steps[idx])) {
        if (c.tau < this.scheduledUntil - EPS || c.tau >= horizon) continue;
        if (c.tau <= this.resumeTau + EPS && this.resumeTau > 0) continue; // 재개 지점의 박은 이미 났다
        const when = this.origin + c.tau;
        if (when < now - 0.005) continue; // 늦은 클릭은 버린다 (탭이 잠들었다 깨어난 경우 등)
        sink.schedule(when, c.kind);
      }
    }
    this.scheduledUntil = horizon;
    track.trim(this.tau());
  }

  private checkEnd(): void {
    const track = this.track!;
    if (!track.ended) return;
    const end = track.last;
    const tau = this.tau();
    if (tau >= end.t) {
      this.halt();
      this.status = "stopped";
      this.frozenTau = end.t;
      this.atEnd = true;
      this.emit();
    }
  }

  private lastIctusAt(tau: number): IctusInfo | null {
    const track = this.track!;
    const prepared = this.prepared!;
    let idx = track.indexAt(Math.max(0, tau));
    for (let guard = 0; idx >= 0 && guard < 4; idx--, guard++) {
      const step = track.steps[idx];
      const times = ictusTimesOf(step).filter((x) => x.tau <= tau + EPS);
      if (times.length) {
        const last = times[times.length - 1];
        const beat = prepared.beats[step.beat - 1];
        const point = last.sub ? this.positionAt(last.tau) : step.halfAttack ? this.positionAt(last.tau) : beat.P;
        return { t: last.tau, beat: step.beat, accent: last.sub ? "weak" : step.accent, sub: last.sub, point };
      }
      if (step.kind === "ready") break;
    }
    return null;
  }

  private beginStep(dir: 1 | -1): void {
    if (!this.track) return;
    if (this.status === "playing") this.pause();
    this.finishAnim("jump");
    if (this.status === "stopped") {
      if (this.atEnd) return dir === 1 ? undefined : this.stepFromEnd();
      this.status = "paused";
    }
    const tau = this.frozenTau;
    const target = dir === 1 ? this.nextIctus(tau) : this.prevIctus(tau);
    if (!target) {
      if (dir === -1) this.stop();
      return;
    }
    let from = tau;
    if (dir === 1) {
      // 멈춰 있는 구간(준비 자세·카운트인)은 건너뛰고 움직이는 구간만 천천히 보여 준다
      const host = this.track.stepAt(Math.max(0, target.tau - EPS));
      if (host.move && host.t > from) from = host.t;
      if (!host.move) from = target.tau;
    }
    this.anim = { from, to: target.tau, start: this.wallNow(), kind: target.kind };
    this.emit();
  }

  private stepFromEnd(): void {
    // 끝난 상태에서 ◁: 마지막 박점으로 되돌아간다
    this.status = "paused";
    this.atEnd = false;
    const target = this.prevIctus(this.frozenTau);
    if (!target) return;
    this.anim = { from: this.frozenTau, to: target.tau, start: this.wallNow(), kind: target.kind };
    this.emit();
  }

  /**
   * 한 박씩 보기 애니메이션 정리
   * - complete: 끝까지 갔다 → 목표 박점에 멈추고 클릭
   * - jump: ◁▷를 또 눌렀다 → 목표 박점으로 바로 건너뛴다
   * - interrupt: 재생을 눌렀다 → 지금 보이는 위치에서 이어서 재생
   */
  private finishAnim(mode: "complete" | "jump" | "interrupt"): void {
    if (!this.anim) return;
    const { to, kind } = this.anim;
    const current = this.tau();
    this.anim = null;
    this.frozenTau = mode === "interrupt" ? current : to;
    if (mode === "complete" && kind) this.deps.sink.schedule(this.deps.clock.now() + 0.005, kind);
    this.emit();
  }

  private nextIctus(tau: number): { tau: number; kind: ClickKind } | null {
    const track = this.track!;
    let idx = track.indexAt(Math.max(0, tau));
    for (let guard = 0; guard < 64; guard++) {
      const step = track.steps[idx];
      if (!step) {
        const last = track.last;
        if (last.kind === "end" || !track.ensureNext(last.i + 1)) return null;
        idx = track.steps.length - 1;
        continue;
      }
      for (const x of ictusTimesOf(step)) {
        if (x.tau > tau + EPS) return { tau: x.tau, kind: x.sub ? "sub" : step.halfAttack ? "weak" : step.accent };
      }
      if (step.kind === "end") return null;
      if (idx === track.steps.length - 1 && !track.ensureNext(step.i + 1)) return null;
      idx++;
    }
    return null;
  }

  private prevIctus(tau: number): { tau: number; kind: ClickKind } | null {
    const track = this.track!;
    for (let idx = track.indexAt(Math.max(0, tau)); idx >= 0; idx--) {
      const step = track.steps[idx];
      const times = ictusTimesOf(step);
      for (let j = times.length - 1; j >= 0; j--) {
        if (times[j].tau < tau - EPS)
          return { tau: times[j].tau, kind: times[j].sub ? "sub" : step.halfAttack ? "weak" : step.accent };
      }
    }
    return null;
  }
}
