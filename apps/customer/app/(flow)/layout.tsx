import { ToastProvider } from "@blip/ui";

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider flow>{children}</ToastProvider>;
}
