/**
 * Web Audio 클릭음과 오디오 시계 (DESIGN.md 7.3)
 *
 * - 클릭음은 미리 계산한 짧은 소리(버퍼)를 정확한 오디오 시각에 재생한다.
 *   우드블록: 나무를 두드린 듯한 짧은 소리(직접 합성). 비프: 맑은 전자음.
 *   강박 > 중강박 > 약박 > 보조박 순으로 높고 크다.
 * - outputNow(): 지금 스피커로 나오고 있는 소리의 시각. 화면 동기화의 기준.
 * - 모바일 브라우저는 사용자가 버튼을 눌러야 소리를 낼 수 있어서, unlock()은
 *   반드시 버튼을 누른 순간(이벤트 처리 안)에서 부른다.
 *
 * 브라우저 전용 코드다. 서버 렌더링 중에는 만들지 않는다.
 */
import type { AudioClock, ClickKind, ClickSink } from "./scheduler";

export type ClickSound = "wood" | "beep" | "off";

const KINDS: ClickKind[] = ["strong", "medium", "weak", "sub"];

/** DESIGN.md 7.3 비프음: 강 1000Hz·60ms, 중강 850Hz·50ms, 약 700Hz·40ms, 보조 600Hz·25ms */
const BEEP: Record<ClickKind, { freq: number; ms: number; gain: number }> = {
  strong: { freq: 1000, ms: 60, gain: 0.9 },
  medium: { freq: 850, ms: 50, gain: 0.72 },
  weak: { freq: 700, ms: 40, gain: 0.6 },
  sub: { freq: 600, ms: 25, gain: 0.32 },
};

/** 우드블록 기본 주파수와 세기 */
const WOOD: Record<ClickKind, { freq: number; gain: number }> = {
  strong: { freq: 1250, gain: 1.0 },
  medium: { freq: 1100, gain: 0.78 },
  weak: { freq: 980, gain: 0.62 },
  sub: { freq: 1500, gain: 0.32 },
};

function makeBeep(ctx: BaseAudioContext, kind: ClickKind): AudioBuffer {
  const { freq, ms, gain } = BEEP[kind];
  const len = Math.round((ctx.sampleRate * ms) / 1000);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const attack = ctx.sampleRate * 0.002;
  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    const env = Math.min(1, i / attack) * Math.exp((-t / (ms / 1000)) * 3.5);
    d[i] = gain * env * Math.sin(2 * Math.PI * freq * t);
  }
  return buf;
}

function makeWood(ctx: BaseAudioContext, kind: ClickKind): AudioBuffer {
  const { freq, gain } = WOOD[kind];
  const len = Math.round(ctx.sampleRate * 0.09);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // 정해진 씨앗으로 만든 잡음(매번 같은 소리)
  let seed = 12345 + freq;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 1073741824 - 1;
  };
  let lp = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    // 나무 막대의 비조화 배음 + 짧은 타격 잡음
    const body =
      Math.exp(-t / 0.014) * Math.sin(2 * Math.PI * freq * t) +
      0.45 * Math.exp(-t / 0.008) * Math.sin(2 * Math.PI * freq * 2.37 * t) +
      0.2 * Math.exp(-t / 0.004) * Math.sin(2 * Math.PI * freq * 4.1 * t);
    lp += 0.35 * (rand() - lp);
    const strike = 0.35 * Math.exp(-t / 0.0015) * lp;
    d[i] = body + strike;
    peak = Math.max(peak, Math.abs(d[i]));
  }
  for (let i = 0; i < len; i++) d[i] = (d[i] / peak) * gain * 0.9;
  return buf;
}

type AudioCtor = typeof AudioContext;

export class WebAudioRuntime implements AudioClock, ClickSink {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers: Partial<Record<Exclude<ClickSound, "off">, Record<ClickKind, AudioBuffer>>> = {};
  private live: Array<{ time: number; node: AudioBufferSourceNode }> = [];
  private lastOut = 0;
  private sound: ClickSound = "wood";
  private volume = 0.9;

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === "running";
  }

  get supported(): boolean {
    const w = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    return !!(w.AudioContext || w.webkitAudioContext);
  }

  /** 버튼을 누른 순간에 불러 오디오를 깨운다 (모바일 자동재생 정책) */
  async unlock(): Promise<void> {
    const w = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    const Ctor = w.AudioContext || w.webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) {
      // iOS: 무음 스위치를 켜 둬도 소리가 나도록 '재생' 용도로 알린다 (지원하는 Safari에서만)
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      try {
        if (nav.audioSession) nav.audioSession.type = "playback";
      } catch {
        /* 지원하지 않으면 무시 */
      }
      this.ctx = new Ctor({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.sound === "off" ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    // 아주 짧은 무음을 한 번 재생하면 iOS에서 오디오가 확실히 깨어난다
    const silent = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    const src = this.ctx.createBufferSource();
    src.buffer = silent;
    src.connect(this.ctx.destination);
    src.start(0);
    if (this.ctx.state !== "running") {
      try {
        await this.ctx.resume();
      } catch {
        /* 사용자가 다시 누르면 재시도 */
      }
    }
  }

  setSound(sound: ClickSound): void {
    this.sound = sound;
    if (this.master) this.master.gain.value = sound === "off" ? 0 : this.volume;
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.sound !== "off") this.master.gain.value = this.volume;
  }

  now(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  outputNow(): number {
    const ctx = this.ctx;
    if (!ctx) return performance.now() / 1000;
    const cur = ctx.currentTime;
    let t = cur - (ctx.outputLatency || ctx.baseLatency || 0);
    if (typeof ctx.getOutputTimestamp === "function") {
      const ts = ctx.getOutputTimestamp();
      if (ts.contextTime && ts.performanceTime) {
        const est = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
        // 일부 브라우저가 엉뚱한 값을 줄 때를 걸러낸다
        if (est <= cur + 0.05 && est >= cur - 0.5) t = est;
      }
    }
    // 화면이 뒤로 가지 않게 한다
    if (t < this.lastOut && this.lastOut - t < 0.1) t = this.lastOut;
    this.lastOut = t;
    return t;
  }

  schedule(time: number, kind: ClickKind): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.sound === "off") return;
    const set = (this.buffers[this.sound] ??= this.buildSet(ctx, this.sound));
    const node = ctx.createBufferSource();
    node.buffer = set[kind];
    node.connect(this.master);
    node.start(Math.max(time, ctx.currentTime));
    const entry = { time, node };
    this.live.push(entry);
    node.onended = () => {
      const i = this.live.indexOf(entry);
      if (i >= 0) this.live.splice(i, 1);
      node.disconnect();
    };
  }

  cancelFrom(time: number): void {
    for (const e of [...this.live]) {
      if (e.time >= time) {
        try {
          e.node.stop();
        } catch {
          /* 이미 끝난 소리 */
        }
      }
    }
  }

  /** 출력 지연(초): 기기가 알려 주는 값. 화면 지연 보정 안내에 쓴다 */
  latency(): number {
    if (!this.ctx) return 0;
    return this.ctx.outputLatency || this.ctx.baseLatency || 0;
  }

  private buildSet(ctx: BaseAudioContext, sound: Exclude<ClickSound, "off">): Record<ClickKind, AudioBuffer> {
    const out = {} as Record<ClickKind, AudioBuffer>;
    for (const k of KINDS) out[k] = sound === "wood" ? makeWood(ctx, k) : makeBeep(ctx, k);
    return out;
  }
}
