import { LoginView } from "@/components/login-view";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const { next, mode } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
  return <LoginView next={safe} initialMode={mode === "signup" ? "signup" : "signin"} />;
}
