import { ToastProvider } from "@blip/ui";
import { CartBar } from "@/components/cart-bar";
import { TabBar } from "@/components/tab-bar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <CartBar />
      <TabBar />
    </ToastProvider>
  );
}
