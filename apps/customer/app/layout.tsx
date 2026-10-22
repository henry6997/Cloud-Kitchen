import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { BRAND } from "@blip/db";
import { getRepo } from "@blip/db/server";
import { CartProvider } from "@/components/cart-provider";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  applicationName: BRAND.name,
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1210" },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Applies the saved light/dark choice before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem("blip.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getRepo().getSettings();
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CartProvider freeAtPaise={settings.freeDeliveryThresholdPaise}>{children}</CartProvider>
        <SwRegister />
      </body>
    </html>
  );
}
