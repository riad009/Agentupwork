import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { PortfolioManager } from "@/components/portfolio/portfolio-manager";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Portfolio" };
export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await requireSessionUser();

  const projects = await prisma.portfolioProject.findMany({
    where: { userId: user.id },
    orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio knowledge base"
        description="The only experience proposals are allowed to reference."
      />

      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>Proposals never invent experience</AlertTitle>
        <AlertDescription>
          Claude is instructed to reference at most one project per proposal, and only when it genuinely maps to the
          job. If nothing here is relevant, the proposal says what is relevant honestly instead of fabricating a
          project.
        </AlertDescription>
      </Alert>

      <PortfolioManager
        projects={projects.map((project) => ({
          id: project.id,
          title: project.title,
          description: project.description,
          technologies: project.technologies,
          url: project.url,
          githubUrl: project.githubUrl,
          clientIndustry: project.clientIndustry,
          projectType: project.projectType,
          achievements: project.achievements,
          highlighted: project.highlighted,
        }))}
      />
    </div>
  );
}
