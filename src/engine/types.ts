/**
 * 지휘 엔진의 데이터 형태 (DESIGN.md 6장).
 * 이 폴더(src/engine)는 React·DOM에 의존하지 않는 순수 TypeScript다.
 */

/** 정규화 좌표. x: -1~1 (지휘자의 오른쪽이 +), y: 0=박점면 ~ 1=지휘면 꼭대기, z: 앞(+)/뒤(-) — 3D용 */
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec = Vec2 | Vec3;

export type Accent = "strong" | "medium" | "weak";
export type TempoUnit = "♩" | "♪" | "♩.";
export type Articulation = "legato" | "neutral" | "staccato" | "marcato";

/** 한 박의 모양 (DESIGN.md 4.3, 6.2) */
export interface BeatDef {
  /** 박 번호 (1부터) */
  n: number;
  /** 박점: 박이 찍히는 위치 */
  P: Vec;
  /** 반동 정점: 박점을 찍고 튀어 오른 최고점 */
  A: Vec;
  /** 다음 박점으로 가는 길의 경유점 (마지막 박은 꼭대기) */
  via?: Vec[];
  accent: Accent;
  /** 반동 정점 도달 시점 (박 길이 비율). 생략하면 주법 기본값 */
  r?: number;
  /** 번호 표시 위치. 생략하면 박점 아래 */
  label?: Vec;
}

export interface PatternDef {
  id: string;
  nameKo: string;
  /** 난이도 (DESIGN.md 4.2) */
  level: number;
  beats: BeatDef[];
  meters: string[];
  /** BPM이 가리키는 음표 */
  tempoUnit: TempoUnit;
  /** 파생 패턴이면 원본 id */
  base?: string;
  /** 박 길이 가중치 (불규칙 박). 예: 7/8(2+2+3) = [2,2,3] */
  weights?: number[];
  /** 분할 패턴이면 한 박을 나누는 수 */
  subdivide?: 2 | 3;
  /** 마지막 박이 올라가는 꼭대기. 기본 [0, 0.95] */
  topPoint?: Vec;
  /** 목록에 보일 박자표. 예: "4/4" */
  timeSignature: string;
  /** 한 줄 설명 */
  summary: string;
  /** 1 = 1차 출시 기본 패턴, 2 = 2차(고급) */
  release: 1 | 2;
  /** 처음 열었을 때의 빠르기 */
  defaultBpm: number;
}

export interface ExerciseStyle {
  articulation: Articulation;
  /** 크기(셈여림) 배율. p=0.6, mf=1.0, f=1.25 */
  size: number;
  reboundScale: number;
}

export type CutoffType = "circle" | "inward" | "outward" | "leftFist";
export type Hand = "right" | "left";
export type CueGesture = "palm" | "point" | "nod" | "eyes";

export interface CueDef {
  bar: number;
  beat: number;
  section: string;
  gesture: CueGesture;
  lookBeatsBefore: 1 | 2;
}

/** 무엇을 재생할지 (DESIGN.md 6.3) */
export interface Exercise {
  id: string;
  patternId: string;
  tempo: { bpm: number; unit: TempoUnit };
  /** 재생 마디 수. 0 = 무한 반복 */
  bars: number;
  countIn: 0 | 1 | 2;
  /** 준비 자세 정지 시간(초) */
  readyHoldSec: number;
  /** 시작 박(1부터). half=true면 그 박의 뒷 반 박('그리고')에서 시작 */
  start: { beat: number; half?: boolean };
  /**
   * auto: 4.4 규칙 (정박 시작은 한 박, 반 박 시작은 두 박 예비)
   * oneBeat / twoBeat: 예비박 수를 직접 지정, none: 예비박 없음
   */
  prep: "auto" | "oneBeat" | "twoBeat" | "none";
  cutoff?: { bar: number; beat: number; type: CutoffType; hand: Hand };
  cues?: CueDef[];
  style: ExerciseStyle;
  subdivisionClick?: boolean;
  /** 2차 */
  fermata?: { bar: number; beat: number; holdSec: number };
}

/** 타임라인 이벤트 (DESIGN.md 6.4). t = 재생 시작 기준 초 */
export type TimelineEvent =
  | { type: "ready"; t: number }
  | { type: "countin"; t: number; beat: number }
  | { type: "prep"; t: number; beat: number; dur: number }
  | {
      type: "ictus";
      t: number;
      bar: number;
      beat: number;
      accent: Accent;
      dur: number;
      sub?: boolean;
      /** 반 박('그리고')에서 시작하는 첫 소리 */
      half?: boolean;
    }
  | { type: "cueLook" | "cuePrep" | "cue"; t: number; section: string; gesture: CueGesture }
  | { type: "cutoffPrep" | "cutoff"; t: number; hand: Hand; cutoffType: CutoffType }
  | { type: "fermataHold"; t: number; dur: number }
  | { type: "end"; t: number };

export const DEFAULT_STYLE: ExerciseStyle = {
  articulation: "neutral",
  size: 1,
  reboundScale: 1,
};
