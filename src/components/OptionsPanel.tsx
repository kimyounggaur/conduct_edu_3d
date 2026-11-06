"use client";

import { useId } from "react";
import { Segmented } from "@/components/controls/Segmented";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSettings, type ClickChoice } from "@/store/settings";

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[13px] font-semibold text-graphite">{title}</h3>
      {children}
      {hint && <p className="text-[12.5px] leading-relaxed text-graphite">{hint}</p>}
    </section>
  );
}

function SwitchRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-10 items-center justify-between gap-3 text-[14px] text-ink">
      {label}
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** 보기 옵션 (DESIGN.md 5.4 중 Phase 2 범위) */
export function OptionsPanel() {
  const s = useSettings();
  // 같은 화면에 설정 패널이 두 번 놓일 수 있어(화면 크기별) id가 겹치지 않게 한다
  const uid = useId();
  return (
    <div className="space-y-6">
      <Section
        title="시점"
        hint={
          s.view === "conductor"
            ? "거울을 보듯 내 오른손이 화면 오른쪽에 있어요. 따라 하기 쉬워요."
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
      </Section>

      <Section title="손">
        <Segmented
          label="손"
          value={s.leftHanded ? "left" : "right"}
          onChange={(v) => s.update({ leftHanded: v === "left" })}
          options={[
            { value: "right", label: "오른손" },
            { value: "left", label: "왼손잡이" },
          ]}
        />
        <SwitchRow id={`${uid}-baton`} label="지휘봉 들기" checked={s.baton} onChange={(baton) => s.update({ baton })} />
      </Section>

      <Section title="잔상">
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
      </Section>

      <Section title="그림에 표시">
        <div className="divide-y divide-rule">
          <SwitchRow id={`${uid}-ghost`} label="전체 도형" checked={s.showGhost} onChange={(showGhost) => s.update({ showGhost })} />
          <SwitchRow id={`${uid}-numbers`} label="박 번호" checked={s.showNumbers} onChange={(showNumbers) => s.update({ showNumbers })} />
          <SwitchRow id={`${uid}-plane`} label="박점면 (박이 찍히는 선)" checked={s.showPlane} onChange={(showPlane) => s.update({ showPlane })} />
        </div>
      </Section>

      <Section title="클릭 소리" hint="강박은 높고 크게, 약박은 낮고 작게 울려요.">
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
      </Section>
    </div>
  );
}
