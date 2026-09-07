import type { FreelancerContext, JobContext } from "@/types/domain";

function bullets(items: string[]): string {
  if (items.length === 0) return "  (none provided)";
  return items.map((item) => `  - ${item}`).join("\n");
}

export function renderFreelancerContext(context: FreelancerContext): string {
  const portfolio =
    context.portfolio.length === 0
      ? "  (no portfolio entries recorded — do not invent any)"
      : context.portfolio
          .map((project, index) => {
            const lines = [
              `  ${index + 1}. ${project.title}`,
              `     Description: ${project.description}`,
              `     Technologies: ${project.technologies.join(", ") || "not specified"}`,
            ];
            if (project.clientIndustry) lines.push(`     Industry: ${project.clientIndustry}`);
            if (project.projectType) lines.push(`     Project type: ${project.projectType}`);
            if (project.url) lines.push(`     Live URL: ${project.url}`);
            if (project.githubUrl) lines.push(`     Repository: ${project.githubUrl}`);
            if (project.achievements.length) lines.push(`     Outcomes: ${project.achievements.join("; ")}`);
            return lines.join("\n");
          })
          .join("\n");

  return `FREELANCER PROFILE
  Name: ${context.name}
  Professional title: ${context.professionalTitle ?? "not specified"}
  Years of experience: ${context.yearsOfExperience ?? "not specified"}
  Hourly rate: ${context.hourlyRate ? `$${context.hourlyRate}/hr` : "not specified"}
  Minimum acceptable budget: ${context.minimumBudget ? `$${context.minimumBudget}` : "not specified"}
  Preferred project size: ${context.preferredProjectSize ?? "not specified"}
  Availability: ${context.availability ?? "not specified"}
  Preferred tone: ${context.preferredTone ?? "direct, warm and technically specific"}
  Bio: ${context.bio ?? "not provided"}

PREFERRED TECHNOLOGIES
${bullets(context.preferredTechnologies)}

TARGET INDUSTRIES
${bullets(context.industries)}

COUNTRIES THE FREELANCER AVOIDS
${bullets(context.countriesToAvoid)}

VERIFIED PORTFOLIO (the only real experience that may be referenced)
${portfolio}`;
}

export function renderJobContext(job: JobContext): string {
  const budget =
    job.projectType === "HOURLY"
      ? `Hourly range: ${job.hourlyMin ? `$${job.hourlyMin}` : "?"} – ${job.hourlyMax ? `$${job.hourlyMax}` : "?"} /hr`
      : `Fixed budget: ${job.budgetAmount ? `$${job.budgetAmount}` : "not stated"}`;

  const ageHours = Math.max(0, Math.round((Date.now() - job.postedAt.getTime()) / 3_600_000));

  return `UPWORK JOB
  Title: ${job.title}
  Project type: ${job.projectType}
  Experience level requested: ${job.experienceLevel}
  ${budget}
  Estimated duration: ${job.estimatedDuration ?? "not stated"}
  Connects required: ${job.connectsRequired ?? "unknown"}
  Posted: ${ageHours} hours ago
  Required skills: ${job.skills.join(", ") || "not listed"}

CLIENT SIGNALS
  Country: ${job.clientCountry ?? "unknown"}
  Payment verified: ${job.clientPaymentVerified ? "yes" : "no"}
  Rating: ${job.clientRating ?? "no rating yet"}
  Hire rate: ${job.clientHireRate !== null ? `${job.clientHireRate}%` : "unknown"}
  Total spent: ${job.clientTotalSpent !== null ? `$${job.clientTotalSpent}` : "unknown"}
  Jobs posted: ${job.clientJobsPosted ?? "unknown"}
  Total hires: ${job.clientTotalHires ?? "unknown"}

COMPETITION SIGNALS
  Proposals: ${job.proposalsCount ?? job.proposalsRange ?? "unknown"}
  Interviews so far: ${job.interviewCount ?? "unknown"}
  Invites sent: ${job.invitesSent ?? "unknown"}
  Unanswered invites: ${job.unansweredInvites ?? "unknown"}

JOB DESCRIPTION
"""
${job.description.slice(0, 9_000)}
"""`;
}
