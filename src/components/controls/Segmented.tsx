"use client";

import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

/** 하나만 고르는 버튼 묶음. 교실 태블릿에서도 누르기 쉽게 높이 40px */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn("flex w-full gap-1 rounded-lg bg-muted p-1", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            "flex h-9 min-w-0 flex-1 items-center justify-center rounded-md px-2 text-[14px] whitespace-nowrap text-graphite transition-colors",
            "hover:text-ink data-[state=on]:bg-sheet data-[state=on]:font-semibold data-[state=on]:text-ink data-[state=on]:shadow-[0_0_0_1px_var(--rule)]",
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
