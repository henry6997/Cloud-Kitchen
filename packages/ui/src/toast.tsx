"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastFn = (text: string) => void;
const Ctx = createContext<ToastFn>(() => undefined);

/** Every action gets an immediate visible response (law 20). */
export function ToastProvider({ children, flow = false }: { children: ReactNode; flow?: boolean }) {
  const [text, setText] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback<ToastFn>((t) => {
    setText(t);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 1800);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className={`toast${flow ? " flow" : ""}${show ? " show" : ""}`} role="status" aria-live="polite">
        {text}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = (): ToastFn => useContext(Ctx);
