"use client";

import { useState, type ReactNode } from "react";
import { MenuIcon } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface AppShellProps {
  children: ReactNode;
  user: { name: string | null; email: string; image: string | null; role: "USER" | "ADMIN" };
  headerSlot?: ReactNode;
}

export function AppShell({ children, user, headerSlot }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-svh">
      <aside className="bg-sidebar border-sidebar-border hidden w-64 shrink-0 border-r lg:block">
        <div className="sticky top-0 h-svh">
          <SidebarNav role={user.role} />
        </div>
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="bg-sidebar top-0 left-0 h-svh max-w-72 translate-x-0 translate-y-0 rounded-none p-0 sm:max-w-72">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <SidebarNav role={user.role} onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <MenuIcon className="size-5" />
          </Button>
          <div className="flex-1">{headerSlot}</div>
          <UserMenu name={user.name} email={user.email} image={user.image} role={user.role} />
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
