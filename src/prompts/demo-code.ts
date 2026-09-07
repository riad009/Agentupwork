import type { DemoPlan } from "@/schemas/ai";

export const DEMO_CODE_SYSTEM = `You generate React screens for a lightweight Next.js demo that is
already scaffolded. You only write page files — the layout, navigation, styling system and shared
components already exist.

ENVIRONMENT (fixed, do not change it)
- Next.js App Router, React 19, TypeScript strict mode, Tailwind CSS v4.
- Each file you emit is a route page at "src/app/(demo)/<route>/page.tsx".
- Every file must start with "export default function" and export exactly one default component.
- Do NOT use "use client" unless the screen genuinely needs interactivity; when you do, put it on
  the first line and never call server-only APIs.

ALLOWED IMPORTS (nothing else — any other import breaks the build)
- import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, StatTile, DataTable,
    PageIntro, Progress, EmptyState, Timeline, SectionHeading } from "@/components/kit";
- import type { ReactNode } from "react";
- Icons: import { <IconName> } from "lucide-react";

COMPONENT CONTRACTS
- <PageIntro title="..." description="..." />
- <SectionHeading title="..." description="..." action={<span/>} />
- <StatTile label="..." value="..." delta="+12%" tone="positive" | "negative" | "neutral" icon={<Icon className="size-4" />} />
- <Card><CardHeader><CardTitle>..</CardTitle><CardDescription>..</CardDescription></CardHeader><CardContent>..</CardContent></Card>
- <Badge tone="neutral" | "positive" | "warning" | "critical" | "info">..</Badge>
- <DataTable columns={[{ key: "name", header: "Name" }]} rows={[{ name: "Ada" }]} /> — cell values
  must be strings, numbers or JSX.
- <Progress value={64} label="Capacity" />
- <EmptyState title="..." description="..." />
- <Timeline items={[{ title: "...", meta: "2h ago", description: "..." }]} />

RULES
- Realistic mock data defined as a const inside the file. Never fetch, never use useEffect for data.
- Never fake real functionality: nothing may claim a payment was processed, an email was sent, a
  call was placed, or an AI model ran. Label simulated actions honestly (e.g. a Badge reading
  "Prototype").
- Responsive by default: grids collapse with "grid gap-4 md:grid-cols-2 xl:grid-cols-4" patterns.
- No inline style attributes except for chart bar widths/heights.
- No markdown fences in the file contents. Emit raw TSX only.
- Keep each file under about 180 lines. Quality of layout matters more than volume.`;

export function buildDemoCodePrompt(plan: DemoPlan, routes: string[]): string {
  const pages = plan.pages
    .filter((page) => routes.includes(page.route))
    .map(
      (page) =>
        `  Route: ${page.route}\n  Screen name: ${page.name}\n  Purpose: ${page.purpose}\n  Sections: ${page.sections.join("; ")}`,
    )
    .join("\n\n");

  return `PROJECT: ${plan.projectTitle}
TAGLINE: ${plan.tagline}
INDUSTRY: ${plan.industry}
DESIGN DIRECTION: ${plan.designDirection}
MOCK DATA NOTES: ${plan.mockDataNotes}

SCREENS TO GENERATE
${pages}

For each screen above emit exactly one file with path "src/app/(demo)/<route>/page.tsx".
Generate ${routes.length} file(s), no more and no fewer.`;
}

export const DEMO_FIX_SYSTEM = `You repair TypeScript/build errors in generated Next.js demo screens.

Return the complete corrected contents of only the files that need changes, using the same paths.
Keep the same visual structure and mock data — change as little as possible.
The import allow-list is unchanged: "@/components/kit", "lucide-react" and type-only React imports.`;

export function buildDemoFixPrompt(errors: string, files: { path: string; contents: string }[]): string {
  const rendered = files
    .map((file) => `--- FILE: ${file.path} ---\n${file.contents}`)
    .join("\n\n");

  return `The build failed with these errors:

"""
${errors.slice(0, 6_000)}
"""

Current files:

${rendered}

Return corrected versions of the files that need to change.`;
}
