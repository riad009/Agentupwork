import { publicEnv } from "@/lib/env";

interface Layout {
  heading: string;
  preheader: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

function layout({ heading, preheader, body, ctaLabel, ctaUrl, footerNote }: Layout): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
    <span style="display:none;font-size:1px;color:#f4f5f8;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e6ec;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #eef0f4;">
                <span style="font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#3b5bdb;">Upwork AI Job Hunter</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:650;">${heading}</h1>
                ${body}
                ${
                  ctaLabel && ctaUrl
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                        <tr><td style="background:#3b5bdb;border-radius:8px;">
                          <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${ctaLabel}</a>
                        </td></tr>
                      </table>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#fafbfc;border-top:1px solid #eef0f4;font-size:12px;color:#6b7280;">
                ${footerNote ?? "You are receiving this because notifications are enabled in your account settings."}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface ProposalsReadyStats {
  jobsAnalyzed: number;
  highQualityMatches: number;
  proposalsPrepared: number;
  demosCreated: number;
  estimatedConnects: number;
  topJobs: { title: string; score: number; budget: string; winProbability: number }[];
}

export function proposalsReadyEmail(stats: ProposalsReadyStats): { subject: string; html: string; text: string } {
  const subject = `${stats.proposalsPrepared} high-quality Upwork ${stats.proposalsPrepared === 1 ? "proposal is" : "proposals are"} ready for review`;

  const rows = [
    ["Jobs analyzed", String(stats.jobsAnalyzed)],
    ["High-quality matches", String(stats.highQualityMatches)],
    ["Proposals prepared", String(stats.proposalsPrepared)],
    ["Demos created", String(stats.demosCreated)],
    ["Estimated Connects", String(stats.estimatedConnects)],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">${label}</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;">${value}</td></tr>`,
    )
    .join("");

  const jobList = stats.topJobs
    .map(
      (job) =>
        `<tr><td style="padding:12px 0;border-top:1px solid #eef0f4;">
           <div style="font-size:14px;font-weight:600;">${job.title}</div>
           <div style="font-size:13px;color:#6b7280;margin-top:4px;">Score ${job.score}/100 · Win probability ${job.winProbability}% · ${job.budget}</div>
         </td></tr>`,
    )
    .join("");

  const body = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">
      Your latest automation run finished. Nothing has been submitted — every proposal is waiting for your approval before any Connects are spent.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f4;border-radius:10px;padding:8px 16px;">
      ${rows}
    </table>
    ${
      jobList
        ? `<h2 style="margin:28px 0 4px;font-size:15px;font-weight:650;">Top opportunities</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${jobList}</table>`
        : ""
    }`;

  const text = `${subject}

Jobs analyzed: ${stats.jobsAnalyzed}
High-quality matches: ${stats.highQualityMatches}
Proposals prepared: ${stats.proposalsPrepared}
Demos created: ${stats.demosCreated}
Estimated Connects: ${stats.estimatedConnects}

Nothing has been submitted. Review and approve at ${publicEnv.appUrl}/proposals`;

  return {
    subject,
    text,
    html: layout({
      heading: `${stats.proposalsPrepared} proposal${stats.proposalsPrepared === 1 ? "" : "s"} ready for review`,
      preheader: `${stats.highQualityMatches} high-quality matches from ${stats.jobsAnalyzed} jobs analyzed.`,
      body,
      ctaLabel: "Review proposals",
      ctaUrl: `${publicEnv.appUrl}/proposals`,
      footerNote: "Proposals are never submitted automatically. Connects are only spent after you confirm.",
    }),
  };
}

export function passwordResetEmail(resetUrl: string, expiresMinutes: number) {
  const subject = "Reset your Upwork AI Job Hunter password";
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">
      We received a request to reset your password. This link expires in ${expiresMinutes} minutes and can only be used once.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
      If you did not request this, you can safely ignore this email — your password will not change.
    </p>`;

  return {
    subject,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in ${expiresMinutes} minutes.`,
    html: layout({
      heading: "Reset your password",
      preheader: "A password reset was requested for your account.",
      body,
      ctaLabel: "Choose a new password",
      ctaUrl: resetUrl,
      footerNote: "This email was sent because a password reset was requested for your account.",
    }),
  };
}

export function automationFailedEmail(runId: string, message: string) {
  const subject = "Upwork automation run failed";
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">
      An automation run did not finish successfully. No Connects were spent.
    </p>
    <pre style="margin:0;padding:14px;background:#f7f8fa;border:1px solid #eef0f4;border-radius:8px;font-size:13px;color:#374151;white-space:pre-wrap;">${message.slice(0, 800)}</pre>`;

  return {
    subject,
    text: `Automation run ${runId} failed: ${message}`,
    html: layout({
      heading: "Automation run failed",
      preheader: message.slice(0, 120),
      body,
      ctaLabel: "View run details",
      ctaUrl: `${publicEnv.appUrl}/automation/${runId}`,
    }),
  };
}

export function submissionResultEmail(params: {
  jobTitle: string;
  success: boolean;
  connectsSpent: number | null;
  error?: string;
}) {
  const subject = params.success
    ? `Proposal submitted: ${params.jobTitle}`
    : `Proposal submission failed: ${params.jobTitle}`;

  const body = params.success
    ? `<p style="margin:0;font-size:15px;line-height:1.6;color:#4b5563;">
         Your proposal was submitted through the official Upwork API${
           params.connectsSpent !== null ? ` and used ${params.connectsSpent} Connects` : ""
         }.
       </p>`
    : `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#4b5563;">
         The submission did not go through, so no Connects were spent.
       </p>
       <pre style="margin:0;padding:14px;background:#fef2f2;border:1px solid #fee2e2;border-radius:8px;font-size:13px;color:#991b1b;white-space:pre-wrap;">${(params.error ?? "Unknown error").slice(0, 600)}</pre>`;

  return {
    subject,
    text: `${subject}${params.error ? `\n\n${params.error}` : ""}`,
    html: layout({
      heading: subject,
      preheader: params.success ? "Submitted through the official Upwork API." : "No Connects were spent.",
      body,
      ctaLabel: "Open dashboard",
      ctaUrl: `${publicEnv.appUrl}/proposals`,
    }),
  };
}
