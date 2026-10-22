"use client";
import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

export function Sheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ov" />
        <Dialog.Content className="sheet" aria-describedby={undefined}>
          <Dialog.Title asChild>
            <h2>{title}</h2>
          </Dialog.Title>
          <Dialog.Close asChild>
            <button type="button" className="ib close" aria-label="Close">✕</button>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
