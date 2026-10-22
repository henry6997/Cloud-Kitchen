"use client";
import * as RadixSwitch from "@radix-ui/react-switch";

export function Switch({ checked, onCheckedChange, label, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <RadixSwitch.Root className="sw" checked={checked} onCheckedChange={onCheckedChange} aria-label={label} disabled={disabled}>
      <RadixSwitch.Thumb asChild>
        <span />
      </RadixSwitch.Thumb>
    </RadixSwitch.Root>
  );
}
