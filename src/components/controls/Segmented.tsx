"use client";

import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

const ROOT = {
  /** 설정 서랍 안: 은은한 회색 바탕, 고른 칸은 흰색 */
  quiet: "bg-muted",
  /** 화면의 주 선택(박자 고르기): 흰 바탕에 고른 칸은 파란색 */
  primary: "bg-sheet shadow-[0_0_0_1px_var(--rule)]",
} as const;

const ITEM = {
  quiet:
    "text-graphite hover:text-ink data-[state=on]:bg-sheet data-[state=on]:font-semibold data-[state=on]:text-ink data-[state=on]:shadow-[0_0_0_1px_var(--rule)]",
  primary:
    "text-ink hover:bg-wash data-[state=on]:bg-primary data-[state=on]:font-semibold data-[state=on]:text-white data-[state=on]:hover:bg-primary",
} as const;

const SIZE = {
  /** 높이 36px(+바깥 8px = 44px) */
  md: "h-9 text-[14px]",
  /** 높이 40px(+바깥 8px = 48px) — 주 조작 버튼(재생 등)과 같은 높이 */
  lg: "h-10 text-[15px]",
} as const;

/** 하나만 고르는 버튼 묶음. 교실 태블릿에서도 누르기 쉽게 높이 44px 이상 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  variant = "quiet",
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  variant?: keyof typeof ROOT;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn("flex w-full gap-1 rounded-lg p-1", ROOT[variant], className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center rounded-md px-2 whitespace-nowrap transition-colors",
            SIZE[size],
            ITEM[variant],
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
