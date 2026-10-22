import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { BRAND } from "@blip/db";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} Kitchen`, template: `%s · ${BRAND.name} Kitchen` },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { viewportFit: "cover", width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

const themeScript = `try{var t=localStorage.getItem("blip.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
