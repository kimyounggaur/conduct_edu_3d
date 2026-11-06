"use client";

import { useEffect, useRef } from "react";
import type { PlaybackEngine } from "@/engine/playback";
import { CanvasRenderer, type RenderOptions } from "@/render/CanvasRenderer";
import { cn } from "@/lib/utils";

/**
 * 궤적 캔버스. 엔진이 움직이는 동안(재생·한 박씩 보기·플래시)에만 매 프레임 그리고,
 * 멈춰 있을 때는 바뀐 것이 있을 때만 한 번 그린다 (배터리 절약).
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
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;
    renderer.setOptions(options);
    let raf = 0;
    let running = false;

    const loop = () => {
      const pp = engine.getPrepared();
      if (pp) renderer.setPattern(pp);
      const frame = engine.frame();
      renderer.draw(frame, (t) => engine.positionAt(t));
      if (engine.isAnimating()) raf = requestAnimationFrame(loop);
      else running = false;
    };
    const kick = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    kickRef.current = kick;

    const measure = () => {
      const r = wrap.getBoundingClientRect();
      renderer.resize(r.width, r.height, Math.min(3, window.devicePixelRatio || 1));
      kick();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    measure();
    const unsub = engine.subscribe(kick);
    let alive = true;
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
      rendererRef.current = null;
    };
    // options는 아래 효과에서 따로 반영한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    rendererRef.current?.setOptions(options);
    kickRef.current();
  }, [options]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={label} />
      {children}
    </div>
  );
}
