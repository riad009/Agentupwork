import { KIT_SOURCE } from "@/services/templates/kit-source";
import { getTemplate } from "@/services/templates/registry";
import type { DemoPlan } from "@/schemas/ai";

export interface GeneratedFile {
  path: string;
  contents: string;
}

export interface ScaffoldInput {
  plan: DemoPlan;
  templateKey: string;
  projectSlug: string;
  demoEmail: string;
  demoPassword: string;
  jobTitle: string;
  preparedBy: string;
}

export interface DemoConfigShape {
  projectTitle: string;
  tagline: string;
  industry: string;
  preparedFor: string;
  preparedBy: string;
  welcome: string;
  credentials: { email: string; password: string };
  nav: { route: string; name: string }[];
  coverage: { requirement: string; demoSolution: string }[];
  productionScope: string[];
  futureEnhancements: string[];
}

function shade(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = Number.parseInt(value.slice(0, 2), 16) || 37;
  const g = Number.parseInt(value.slice(2, 4), 16) || 99;
  const b = Number.parseInt(value.slice(4, 6), 16) || 235;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isValidHex(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

const PACKAGE_JSON = (slug: string) =>
  JSON.stringify(
    {
      name: slug,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        next: "16.3.4",
        react: "19.2.8",
        "react-dom": "19.2.8",
        "lucide-react": "^1.42.0",
      },
      devDependencies: {
        "@tailwindcss/postcss": "^4.3.3",
        "@types/node": "^22.18.13",
        "@types/react": "^19.2.18",
        "@types/react-dom": "^19.2.7",
        postcss: "^8.5.28",
        tailwindcss: "^4.3.3",
        typescript: "^5.9.3",
      },
    },
    null,
    2,
  );

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./src/*"] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  },
  null,
  2,
);

const NEXT_CONFIG = String.raw`/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`;

const POSTCSS_CONFIG = String.raw`const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;

const GITIGNORE = String.raw`node_modules
.next
out
build
.DS_Store
.env*.local
.vercel
*.tsbuildinfo
next-env.d.ts
`;

const ROOT_LAYOUT = String.raw`import type { Metadata } from "next";
import type { ReactNode } from "react";
import { demoConfig } from "@/demo.config";
import "./globals.css";

export const metadata: Metadata = {
  title: demoConfig.projectTitle,
  description: demoConfig.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--surface)] text-[var(--ink)] antialiased">{children}</body>
    </html>
  );
}
`;

const WELCOME_PAGE = String.raw`import Link from "next/link";
import { ArrowRightIcon, LayersIcon, ListChecksIcon, ShieldCheckIcon } from "lucide-react";
import { demoConfig } from "@/demo.config";

export default function WelcomePage() {
  const firstRoute = demoConfig.nav[0]?.route ?? "coverage";

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--brand)] uppercase">
        Interactive project concept
      </span>

      <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
        {demoConfig.projectTitle}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-[var(--ink-muted)]">{demoConfig.tagline}</p>

      <p className="mt-8 max-w-3xl text-base leading-relaxed text-[var(--ink-muted)]">{demoConfig.welcome}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <LayersIcon className="size-5 text-[var(--brand)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">Prepared for this brief</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Built around the requirements described in {demoConfig.preparedFor}.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <ListChecksIcon className="size-5 text-[var(--brand)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">Intentionally lightweight</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {demoConfig.nav.length} screens with sample data, focused on the core workflows.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <ShieldCheckIcon className="size-5 text-[var(--brand)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">Nothing is faked</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            No payments, messages or integrations run here. Interactions are prototype only.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href={"/" + firstRoute}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Explore the prototype
          <ArrowRightIcon className="size-4" />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)]"
        >
          Use demo account
        </Link>
        <Link
          href="/coverage"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-[var(--brand)] transition hover:underline"
        >
          What this demo covers
        </Link>
      </div>

      <p className="mt-12 text-xs text-[var(--ink-muted)]">
        Prototype prepared by {demoConfig.preparedBy}. Production development would add the complete backend,
        integrations, security, testing and deployment architecture.
      </p>
    </main>
  );
}
`;

const LOGIN_PAGE = String.raw`"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { demoConfig } from "@/demo.config";

export default function DemoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const firstRoute = demoConfig.nav[0]?.route ?? "coverage";

  function signIn(nextEmail: string, nextPassword: string) {
    if (
      nextEmail.trim().toLowerCase() === demoConfig.credentials.email.toLowerCase() &&
      nextPassword === demoConfig.credentials.password
    ) {
      setError(null);
      router.push("/" + firstRoute);
      return;
    }
    setError("Use the demo credentials shown below.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-[var(--brand)] uppercase">Demo access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)]">Sign in to the prototype</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Authentication here is simulated in the browser. The production build would use a real identity provider
          with sessions, roles and audit logging.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            signIn(email, password);
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[var(--ink)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              placeholder={demoConfig.credentials.email}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[var(--ink)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              placeholder="••••••••"
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setEmail(demoConfig.credentials.email);
            setPassword(demoConfig.credentials.password);
            signIn(demoConfig.credentials.email, demoConfig.credentials.password);
          }}
          className="mt-3 w-full rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)]"
        >
          Use demo account
        </button>

        <div className="mt-6 rounded-lg bg-[var(--surface)] p-4 text-sm">
          <p className="font-medium text-[var(--ink)]">Demo credentials</p>
          <p className="mt-1 text-[var(--ink-muted)]">Email: {demoConfig.credentials.email}</p>
          <p className="text-[var(--ink-muted)]">Password: {demoConfig.credentials.password}</p>
        </div>

        <Link href="/" className="mt-6 block text-center text-sm text-[var(--brand)] hover:underline">
          Back to the concept overview
        </Link>
      </div>
    </main>
  );
}
`;

const DEMO_LAYOUT = String.raw`import type { ReactNode } from "react";
import Link from "next/link";
import { demoConfig } from "@/demo.config";
import { DemoNav } from "@/components/demo-nav";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-[var(--line)] bg-white lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">
            {demoConfig.projectTitle.slice(0, 1)}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[var(--ink)]">{demoConfig.projectTitle}</p>
            <p className="text-[11px] text-[var(--ink-muted)]">Prototype</p>
          </div>
        </div>
        <DemoNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-6 py-3">
          <p className="text-sm text-[var(--ink-muted)]">{demoConfig.tagline}</p>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 ring-inset">
              Interactive prototype — sample data
            </span>
            <Link href="/coverage" className="text-sm font-medium text-[var(--brand)] hover:underline">
              Demo coverage
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
`;

const DEMO_NAV = String.raw`"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { demoConfig } from "@/demo.config";

export function DemoNav() {
  const pathname = usePathname();

  const items = [...demoConfig.nav, { route: "coverage", name: "Demo coverage" }];

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const href = "/" + item.route;
        const active = pathname === href;
        return (
          <Link
            key={item.route}
            href={href}
            className={
              "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition " +
              (active
                ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]")
            }
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
`;

const COVERAGE_PAGE = String.raw`import { CheckIcon } from "lucide-react";
import { demoConfig } from "@/demo.config";
import { Card, CardContent, CardHeader, CardTitle, PageIntro, SectionHeading } from "@/components/kit";

export default function CoveragePage() {
  return (
    <div>
      <PageIntro
        title="What this demo covers"
        description="A deliberately lightweight prototype built around the requirements in the project brief. It shows the proposed experience and the core workflows, not a finished production system."
      />

      <SectionHeading
        title="Your requirements, represented in the demo"
        description="Each item below was taken from the project description."
      />
      <div className="grid gap-3">
        {demoConfig.coverage.map((item) => (
          <Card key={item.requirement}>
            <CardContent className="flex gap-3 py-4">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 ring-inset">
                <CheckIcon className="size-3" />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">{item.requirement}</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{item.demoSolution}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Full project implementation</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mb-4 text-sm text-[var(--ink-muted)]">
              This prototype focuses on interface and workflow. Production delivery would include the following, none of
              which is implemented here.
            </p>
            <ul className="space-y-2">
              {demoConfig.productionScope.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-[var(--ink)]">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Potential future enhancements</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mb-4 text-sm text-[var(--ink-muted)]">
              Ideas beyond the current scope, listed separately so they are not mistaken for included work.
            </p>
            <ul className="space-y-2">
              {demoConfig.futureEnhancements.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-[var(--ink)]">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-xs text-[var(--ink-muted)]">
        Nothing in this prototype processes payments, sends messages, calls external services or runs a model. Every
        value shown is sample data.
      </p>
    </div>
  );
}
`;

function globalsCss(primary: string): string {
  const brand = isValidHex(primary) ? primary.trim() : "#2563eb";
  return `@import "tailwindcss";

:root {
  --brand: ${brand};
  --brand-soft: ${shade(brand, 0.1)};
  --brand-ring: ${shade(brand, 0.25)};
  --surface: #f7f8fa;
  --line: #e5e7eb;
  --ink: #111827;
  --ink-muted: #6b7280;
}

html,
body {
  background: var(--surface);
}

* {
  border-color: var(--line);
}
`;
}

function demoConfigFile(config: DemoConfigShape): string {
  return `export const demoConfig = ${JSON.stringify(config, null, 2)} as const;

export type DemoConfig = typeof demoConfig;
`;
}

function readme(plan: DemoPlan, jobTitle: string, preparedBy: string): string {
  return `# ${plan.projectTitle}

${plan.tagline}

An interactive concept prototype prepared for the project brief: **${jobTitle}**.

## What this is

A deliberately lightweight, frontend-only prototype. It demonstrates the proposed user experience and the core
workflows described in the brief. It uses sample data throughout.

## What this is not

There is no backend, database, authentication service or third-party integration behind these screens. Nothing here
processes payments, sends messages or runs a model. Production delivery would add:

${plan.productionScope.map((item) => `- ${item}`).join("\n")}

## Screens

${plan.pages.map((page) => `- **${page.name}** (\`/${page.route}\`) — ${page.purpose}`).join("\n")}
- **Demo coverage** (\`/coverage\`) — how each requirement from the brief is represented here

## Running locally

\`\`\`bash
npm install
npm run dev
\`\`\`

---

Prepared by ${preparedBy}.
`;
}

/**
 * Produces every file of the demo application except the generated screens.
 * Because this scaffold is fixed and known to compile, the model only has to
 * write page bodies, which keeps token usage and build failures low.
 */
export function buildScaffold(input: ScaffoldInput): {
  files: GeneratedFile[];
  config: DemoConfigShape;
} {
  const template = getTemplate(input.templateKey);
  const primary = isValidHex(input.plan.primaryColor) ? input.plan.primaryColor : template.primaryColor;

  const config: DemoConfigShape = {
    projectTitle: input.plan.projectTitle,
    tagline: input.plan.tagline,
    industry: input.plan.industry || template.industry,
    preparedFor: input.jobTitle,
    preparedBy: input.preparedBy,
    welcome: `This prototype was created specifically around the requirements described in your project brief. It demonstrates the proposed user experience and several of the core workflows. The production version would include the complete backend, integrations, security, testing and deployment architecture.`,
    credentials: { email: input.demoEmail, password: input.demoPassword },
    nav: input.plan.pages.map((page) => ({ route: page.route, name: page.name })),
    coverage: input.plan.coverage.map((item) => ({
      requirement: item.requirement,
      demoSolution: item.demoSolution,
    })),
    productionScope: input.plan.productionScope,
    futureEnhancements: input.plan.futureEnhancements,
  };

  const files: GeneratedFile[] = [
    { path: "package.json", contents: PACKAGE_JSON(input.projectSlug) },
    { path: "tsconfig.json", contents: TSCONFIG },
    { path: "next.config.mjs", contents: NEXT_CONFIG },
    { path: "postcss.config.mjs", contents: POSTCSS_CONFIG },
    { path: ".gitignore", contents: GITIGNORE },
    { path: "README.md", contents: readme(input.plan, input.jobTitle, input.preparedBy) },
    { path: "src/demo.config.ts", contents: demoConfigFile(config) },
    { path: "src/app/globals.css", contents: globalsCss(primary) },
    { path: "src/app/layout.tsx", contents: ROOT_LAYOUT },
    { path: "src/app/page.tsx", contents: WELCOME_PAGE },
    { path: "src/app/login/page.tsx", contents: LOGIN_PAGE },
    { path: "src/app/(demo)/layout.tsx", contents: DEMO_LAYOUT },
    { path: "src/app/(demo)/coverage/page.tsx", contents: COVERAGE_PAGE },
    { path: "src/components/kit.tsx", contents: KIT_SOURCE },
    { path: "src/components/demo-nav.tsx", contents: DEMO_NAV },
  ];

  return { files, config };
}

export const RESERVED_ROUTES = new Set(["coverage", "login", ""]);
