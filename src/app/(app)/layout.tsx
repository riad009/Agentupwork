import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireSessionUser();

  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image, role: user.role }}>
      {children}
    </AppShell>
  );
}
