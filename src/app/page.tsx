import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  BrainCircuitIcon,
  GaugeCircleIcon,
  MonitorPlayIcon,
  RadarIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/session";

const PIPELINE = [
  "Discover jobs through the official Upwork API",
  "Score every job across skills, client quality, competition and risk",
  "Rank and shortlist the strongest opportunities",
  "Write a proposal grounded in your real portfolio",
  "Build a lightweight concept demo for exceptional jobs only",
  "Hold everything for your approval — Connects are never spent automatically",
];

const FEATURES = [
  {
    icon: RadarIcon,
    title: "Official API discovery",
    body: "Search profiles run against the authorised Upwork API. No scraping, no browser automation, no bypassing platform rules.",
  },
  {
    icon: BrainCircuitIcon,
    title: "Honest scoring",
    body: "Claude grades skill fit, client quality, competition, budget and scam risk, then blends it with hard marketplace signals.",
  },
  {
    icon: MonitorPlayIcon,
    title: "Lightweight demos",
    body: "For the rare exceptional job, a small polished prototype is generated, deployed and screenshotted — never the client's whole product.",
  },
  {
    icon: ShieldCheckIcon,
    title: "You approve everything",
    body: "Proposals wait as pending approval. Submission happens only after you confirm the Connects cost.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="bg-background min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <RadarIcon className="size-4.5" />
          </span>
          <span className="font-semibold">Upwork AI Job Hunter</span>
        </span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="surface-grid border-b">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
            <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              <GaugeCircleIcon className="size-3.5" />
              Decision support, not proposal spam
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              Spend your Connects on the jobs you can actually win.
            </h1>

            <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
              Every few hours the pipeline pulls fresh Upwork jobs through the official API, scores each one honestly,
              shortlists the best, and prepares a proposal grounded in your real portfolio. For the rare exceptional
              opportunity it builds and deploys a small concept demo. Then it stops and waits for you.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Create your account
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">What happens on every run</h2>
              <ol className="mt-6 space-y-4">
                {PIPELINE.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="bg-card rounded-xl border p-5">
                  <feature.icon className="text-primary size-5" />
                  <p className="mt-3 font-medium">{feature.title}</p>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="text-muted-foreground mx-auto max-w-3xl px-6 py-14 text-center text-sm">
            This product helps a freelancer make better decisions. It never scrapes Upwork, never bypasses platform
            restrictions, never mass-submits proposals, and never spends a Connect without an explicit confirmation.
          </div>
        </section>
      </main>
    </div>
  );
}
