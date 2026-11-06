"use client";

import { useEffect, useRef } from "react";
import type { PlaybackEngine } from "@/engine/playback";
import { CanvasRenderer, tipColor, type RenderOptions } from "@/render/CanvasRenderer";
import type { HandRenderer } from "@/render3d/HandRenderer";
import { cn } from "@/lib/utils";

/**
 * 궤적 캔버스. 엔진이 움직이는 동안(재생·한 박씩 보기·플래시)에만 매 프레임 그리고,
 * 멈춰 있을 때는 바뀐 것이 있을 때만 한 번 그린다 (배터리 절약).
 *
 * 입체 손을 켜면 2D 캔버스 위에 투명한 WebGL 캔버스를 하나 더 겹친다.
 * three.js는 처음 필요할 때 따로 불러오고, 준비되기 전이나 WebGL이 안 되는 기기에서는 2D 손을 그린다.
 */
export function ConductorCanvas({
  engine,
  options,
  label,
  className,
  children,
}: {
  engine: PlaybackEngine;
  options: RenderOptions;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const optionsRef = useRef(options);
  const kickRef = useRef<() => void>(() => {});
  const syncHandRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !gl) return;
    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;
    renderer.setOptions(optionsRef.current);
    let raf = 0;
    let running = false;
    let alive = true;
    let size = { w: 0, h: 0, dpr: 1 };

    // 입체 손: three.js를 불러오는 중 → 준비됨 / 실패(WebGL 없음 → 2D 손으로 계속)
    let hand: HandRenderer | null = null;
    let handState: "idle" | "loading" | "ready" | "failed" = "idle";
    let handContextOk = true;
    const poseOf = (o: RenderOptions) => (o.baton ? "grip" : "point");

    const loop = () => {
      const pp = engine.getPrepared();
      if (pp) renderer.setPattern(pp);
      const frame = engine.frame();
      const o = optionsRef.current;
      const want3d = !!hand && handState === "ready" && handContextOk && o.hand3d;
      const use3d = want3d && hand!.hasPose(poseOf(o));
      // 자세(지휘봉/맨손)가 아직 준비 중이면 그동안 2D 손을 그리고, 준비되면 다시 그린다
      if (want3d && !use3d) hand!.requestPose(poseOf(o)).then(() => alive && kick(), () => {});
      renderer.draw(frame, (t) => engine.positionAt(t), !use3d);
      if (hand && handState === "ready") hand.render(use3d && frame ? frame.pos : null, frame ? tipColor(frame) : "");
      if (engine.isAnimating()) raf = requestAnimationFrame(loop);
      else running = false;
    };
    const kick = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    kickRef.current = kick;

    const syncHand = () => {
      const o = optionsRef.current;
      if (hand) {
        hand.setOptions({ view: o.view, leftHanded: o.leftHanded, baton: o.baton });
        return;
      }
      if (!o.hand3d || handState !== "idle") return;
      handState = "loading";
      import("@/render3d/HandRenderer")
        .then(({ HandRenderer }) => {
          if (!alive) return;
          const opts = optionsRef.current;
          const h = new HandRenderer(gl, (ok) => {
            handContextOk = ok;
            kick();
          });
          h.resize(size.w, size.h, size.dpr);
          h.setOptions({ view: opts.view, leftHanded: opts.leftHanded, baton: opts.baton });
          hand = h;
          handState = "ready";
          return h.requestPose(poseOf(opts)).then(() => alive && kick());
        })
        .catch(() => {
          // WebGL을 못 쓰는 기기: 2D 손으로 계속
          handState = "failed";
          kick();
        });
    };
    syncHandRef.current = syncHand;

    const measure = () => {
      const r = wrap.getBoundingClientRect();
      size = { w: r.width, h: r.height, dpr: Math.min(3, window.devicePixelRatio || 1) };
      renderer.resize(size.w, size.h, size.dpr);
      hand?.resize(size.w, size.h, size.dpr);
      kick();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    measure();
    syncHand();
    const unsub = engine.subscribe(kick);
    document.fonts?.ready.then(() => {
      if (!alive) return;
      renderer.fontsChanged();
      kick();
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
      hand?.dispose();
      hand = null;
      rendererRef.current = null;
    };
    // options는 optionsRef로 읽고, 바뀌면 아래 효과에서 반영한다
  }, [engine]);

  useEffect(() => {
    optionsRef.current = options;
    rendererRef.current?.setOptions(options);
    syncHandRef.current();
    kickRef.current();
  }, [options]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={label} />
      <canvas ref={glRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
      {children}
    </div>
  );
}
