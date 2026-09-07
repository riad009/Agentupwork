"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RadarIcon } from "lucide-react";
import { primaryNav, secondaryNav } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: "USER" | "ADMIN";
  onNavigate?: () => void;
}

export function SidebarNav({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2" onClick={onNavigate}>
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <RadarIcon className="size-4.5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Job Hunter</span>
          <span className="text-muted-foreground text-[11px]">Upwork AI</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className={cn("size-4", isActive(item.href) && "text-primary")} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-1 border-t pt-3">
        {secondaryNav
          .filter((item) => !item.adminOnly || role === "ADMIN")
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className={cn("size-4", isActive(item.href) && "text-primary")} />
              {item.label}
            </Link>
          ))}
      </div>
    </div>
  );
}
