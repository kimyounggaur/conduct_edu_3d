"use client";

import { useId } from "react";
import { Segmented } from "@/components/controls/Segmented";
import { TapTempoButton } from "@/components/controls/TapTempo";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { FINITE_BARS, useLibrary } from "@/store/library";
import { useSettings, type ClickChoice } from "@/store/settings";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="border-b border-rule pb-2 text-[13px] font-semibold text-graphite">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[14px] font-medium text-ink">{label}</div>
      {children}
      {hint && <p className="text-[12.5px] leading-relaxed text-graphite">{hint}</p>}
    </div>
  );
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-10 items-center justify-between gap-3 text-[14px] text-ink">
        {label}
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </label>
      {hint && <p className="text-[12.5px] leading-relaxed text-graphite">{hint}</p>}
    </div>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ["Space", "재생/일시정지"],
  ["Esc", "정지"],
  ["← →", "한 박씩"],
  ["↑ ↓", "빠르기 (Shift는 10씩)"],
  ["L", "반복"],
  ["M", "소리 끄기"],
  ["1–9", "패턴 고르기"],
];

/**
 * '설정' 서랍의 내용. 평소에는 닫혀 있어서 연습 화면에는 보이지 않는다.
 * 연습(카운트인·반복·탭) → 보기 → 소리 → 단축키 순서.
 */
export function OptionsPanel() {
  const s = useSettings();
  const lib = useLibrary();
  // 같은 화면에 설정이 두 번 놓일 일은 없지만, 라벨 연결용 id는 겹치지 않게 만든다
  const uid = useId();
  return (
    <div className="space-y-8">
      <Group title="연습">
        <Field label="카운트인" hint="재생 전에 박자만 먼저 들려 줘요.">
          <Segmented
            label="카운트인"
            value={String(lib.countIn) as "0" | "1" | "2"}
            onChange={(v) => lib.setCountIn(Number(v) as 0 | 1 | 2)}
            options={[
              { value: "0", label: "없음" },
              { value: "1", label: "1마디" },
              { value: "2", label: "2마디" },
            ]}
          />
        </Field>
        <SwitchRow
          id={`${uid}-loop`}
          label="반복 재생"
          hint={`끄면 ${FINITE_BARS}마디만 재생하고 멈춰요.`}
          checked={lib.loop}
          onChange={lib.setLoop}
        />
        <Field label="빠르기 탭" hint="박자에 맞춰 여러 번 누르면 그 빠르기로 맞춰요.">
          <TapTempoButton />
        </Field>
      </Group>

      <Group title="보기">
        <Field
          label="시점"
          hint={
            s.view === "conductor"
              ? "지휘자 뒤에서 본 모습이에요. 내 오른손이 화면 오른쪽에 있어 따라 하기 쉬워요."
              : "연주자 자리에서 지휘자를 바라본 모습이에요. 좌우가 반대로 보여요."
          }
        >
          <Segmented
            label="시점"
            value={s.view}
            onChange={(view) => s.update({ view })}
            options={[
              { value: "conductor", label: "지휘자" },
              { value: "audience", label: "청중" },
            ]}
          />
        </Field>
        <Field label="손">
          <Segmented
            label="손"
            value={s.leftHanded ? "left" : "right"}
            onChange={(v) => s.update({ leftHanded: v === "left" })}
            options={[
              { value: "right", label: "오른손" },
              { value: "left", label: "왼손잡이" },
            ]}
          />
        </Field>
        <Field label="잔상 길이">
          <div className="flex items-center gap-3">
            <Slider
              className="flex-1 py-3 [&_[data-slot=slider-thumb]]:size-5"
              min={0}
              max={1500}
              step={100}
              value={[s.trailMs]}
              onValueChange={(v) => s.update({ trailMs: v[0] })}
              aria-label="잔상 길이"
            />
            <span className="w-12 text-right text-[14px] tabular-nums text-ink">
              {s.trailMs === 0 ? "끔" : `${(s.trailMs / 1000).toFixed(1)}초`}
            </span>
          </div>
        </Field>
        <div className="divide-y divide-rule">
          <SwitchRow id={`${uid}-baton`} label="지휘봉 들기" checked={s.baton} onChange={(baton) => s.update({ baton })} />
          <SwitchRow
            id={`${uid}-hand3d`}
            label="입체 손 (3D)"
            hint="끄면 손을 평면 그림으로 보여요. 기기가 느리면 꺼 보세요."
            checked={s.hand3d}
            onChange={(hand3d) => s.update({ hand3d })}
          />
          <SwitchRow id={`${uid}-ghost`} label="전체 도형" checked={s.showGhost} onChange={(showGhost) => s.update({ showGhost })} />
          <SwitchRow id={`${uid}-numbers`} label="박 번호" checked={s.showNumbers} onChange={(showNumbers) => s.update({ showNumbers })} />
          <SwitchRow
            id={`${uid}-plane`}
            label="박점면 (박이 찍히는 선)"
            checked={s.showPlane}
            onChange={(showPlane) => s.update({ showPlane })}
          />
        </div>
      </Group>

      <Group title="소리">
        <Field label="클릭 소리">
          <Segmented<ClickChoice>
            label="클릭 소리"
            value={s.click}
            onChange={(click) => s.update({ click })}
            options={[
              { value: "wood", label: "우드블록" },
              { value: "beep", label: "비프" },
              { value: "off", label: "끔" },
            ]}
          />
        </Field>
      </Group>

      <Group title="단축키">
        <dl className="hidden gap-x-4 gap-y-2 text-[13.5px] md:grid md:grid-cols-[auto_1fr]">
          {SHORTCUTS.map(([key, what]) => (
            <div key={key} className="contents">
              <dt>
                <kbd className="rounded border border-rule bg-sheet px-1.5 py-px font-sans text-[12px] text-ink">{key}</kbd>
              </dt>
              <dd className="text-graphite">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[13px] text-graphite md:hidden">키보드가 있는 기기에서는 Space로 재생, 숫자 키로 박자를 고를 수 있어요.</p>
      </Group>
    </div>
  );
}
