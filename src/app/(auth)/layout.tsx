import type { ReactNode } from "react";
import Link from "next/link";
import { RadarIcon } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/30 flex min-h-svh flex-col">
      <header className="mx-auto w-full max-w-6xl px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <RadarIcon className="size-4.5" />
          </span>
          <span className="font-semibold">Upwork AI Job Hunter</span>
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pt-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
