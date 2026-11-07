/**
 * 2D 렌더러 (DESIGN.md 7.4)
 * 레이어(아래→위): 정적(박점면·고스트·번호, 미리 그려 둠) → 잔상 → 지휘봉/손 → 박점 플래시
 * 매 프레임 엔진이 주는 τ(오디오 시계 기준)로 그리므로 소리와 그림이 어긋나지 않는다.
 */
import type { FrameState } from "@/engine/playback";
import type { PreparedPattern } from "@/engine/trajectory";
import type { Vec3 } from "@/engine/types";
import { accentColor, palette } from "@/lib/palette";
import { drawBaton } from "./layers/baton";
import { drawFlash } from "./layers/flash";
import { drawStatic, type StaticOptions } from "./layers/ghost";
import { drawTrail } from "./layers/trail";
import { makeTransform, type ViewMode, type ViewTransform } from "./transform";

export interface RenderOptions extends StaticOptions {
  mirror: boolean;
  /** 입체 손 레이어가 시점·손을 따로 알아야 해서 mirror와 별도로 둔다 */
  view: ViewMode;
  leftHanded: boolean;
  baton: boolean;
  /** 손과 지휘봉을 입체(3D)로 그리기. 안 되는 기기에서는 2D로 그린다 */
  hand3d: boolean;
  /** 잔상 길이(밀리초) */
  trailMs: number;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  mirror: false,
  view: "conductor",
  leftHanded: false,
  baton: true,
  hand3d: true,
  trailMs: 700,
  showGhost: true,
  showNumbers: true,
  showPlane: true,
};

/** 지휘봉 끝점 색: 박을 치는 동안은 박 세기 색, 준비·대기 중에는 회색 */
export function tipColor(frame: FrameState): string {
  const step = frame.step;
  return step.kind === "play" || (step.kind === "intro" && step.halfAttack && frame.phase >= 0.5)
    ? accentColor(step.accent)
    : palette.graphite;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private staticCanvas: HTMLCanvasElement;
  private staticCtx: CanvasRenderingContext2D;
  private staticKey = "";
  private prepared: PreparedPattern | null = null;
  private opts: RenderOptions = DEFAULT_RENDER_OPTIONS;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private tf: ViewTransform = makeTransform(1, 1, false);
  private fontsVersion = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.staticCanvas = document.createElement("canvas");
    this.staticCtx = this.staticCanvas.getContext("2d")!;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    if (cssW === this.cssW && cssH === this.cssH && dpr === this.dpr) return;
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    const pw = Math.max(1, Math.round(cssW * dpr));
    const ph = Math.max(1, Math.round(cssH * dpr));
    this.canvas.width = pw;
    this.canvas.height = ph;
    this.staticCanvas.width = pw;
    this.staticCanvas.height = ph;
    this.tf = makeTransform(cssW, cssH, this.opts.mirror);
    this.staticKey = "";
  }

  setOptions(opts: RenderOptions): void {
    this.opts = opts;
    this.tf = makeTransform(this.cssW || 1, this.cssH || 1, opts.mirror);
    this.staticKey = "";
  }

  setPattern(pp: PreparedPattern): void {
    if (pp !== this.prepared) {
      this.prepared = pp;
      this.staticKey = "";
    }
  }

  /** 웹 글꼴이 늦게 도착하면 번호를 다시 그린다 */
  fontsChanged(): void {
    this.fontsVersion++;
    this.staticKey = "";
  }

  /** hand=false면 손·지휘봉은 그리지 않는다 (입체 손 레이어가 대신 그릴 때) */
  draw(frame: FrameState | null, positionAt: (tau: number) => Vec3, hand = true): void {
    const { ctx } = this;
    if (!this.prepared || this.cssW === 0) return;
    this.ensureStatic();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.staticCanvas, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!frame) return;

    const color = tipColor(frame);
    drawTrail(ctx, this.tf, frame.tau, this.opts.trailMs / 1000, positionAt, color);
    drawFlash(ctx, this.tf, frame.tau, frame.lastIctus);
    if (hand) drawBaton(ctx, this.tf, frame.pos, this.opts.baton, color);
  }

  private ensureStatic(): void {
    const o = this.opts;
    const key = [this.cssW, this.cssH, this.dpr, o.mirror, o.showGhost, o.showNumbers, o.showPlane, this.fontsVersion].join("|");
    if (key === this.staticKey || !this.prepared) return;
    this.staticKey = key;
    const c = this.staticCtx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawStatic(c, this.cssW, this.cssH, this.tf, this.prepared, o);
  }
}
