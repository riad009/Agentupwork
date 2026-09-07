import type { ProjectBrief } from "@/schemas/ai";

export interface BriefScreenshot {
  label: string;
  dataUri: string;
}

export interface BriefRenderInput {
  brief: ProjectBrief;
  preparedBy: string;
  preparedFor: string;
  demoUrl: string | null;
  demoEmail: string | null;
  demoPassword: string | null;
  screenshots: BriefScreenshot[];
  companyName: string | null;
  portfolioUrl: string | null;
  generatedOn: Date;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function list(items: string[], className = ""): string {
  if (items.length === 0) return "";
  return `<ul class="checklist ${className}">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

const STYLES = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #16202f;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 10.5pt;
    line-height: 1.55;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 22mm 20mm 24mm;
    page-break-after: always;
    position: relative;
    background: #ffffff;
  }
  .page:last-child { page-break-after: auto; }
  .cover {
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: linear-gradient(160deg, #10203c 0%, #1d3f78 55%, #2563eb 100%);
    color: #ffffff;
  }
  .cover-inner { padding: 26mm 20mm 0; }
  .cover-footer { padding: 0 20mm 22mm; }
  .eyebrow {
    font-size: 8.5pt;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 700;
    opacity: 0.78;
  }
  .cover h1 { font-size: 30pt; line-height: 1.15; margin-top: 10mm; font-weight: 700; letter-spacing: -0.5pt; }
  .cover p { color: #ffffff; margin-bottom: 0; }
  .cover .category { margin-top: 6mm; font-size: 11.5pt; color: rgba(255, 255, 255, 0.82); }
  .cover .summary { margin-top: 10mm; font-size: 12pt; line-height: 1.65; max-width: 150mm; color: rgba(255, 255, 255, 0.94); }
  .cover-shot {
    margin-top: 12mm;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 18px 40px rgba(5, 15, 35, 0.35);
    background: #ffffff;
  }
  .cover-shot img { display: block; width: 100%; height: auto; }
  .cover-facts {
    margin-top: 14mm;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5mm;
    max-width: 150mm;
  }
  .cover-fact {
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 5mm;
    background: rgba(255, 255, 255, 0.06);
  }
  .cover-fact .k {
    font-size: 8pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.65);
    margin-bottom: 2mm;
  }
  .cover-fact .v { font-size: 10.5pt; color: #ffffff; line-height: 1.5; }
  .cover-meta { display: flex; gap: 14mm; font-size: 9.5pt; opacity: 0.9; }
  .cover-meta strong { display: block; font-size: 8pt; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.7; margin-bottom: 1.5mm; }
  h2 {
    font-size: 17pt;
    font-weight: 700;
    letter-spacing: -0.3pt;
    margin-bottom: 3mm;
  }
  h3 { font-size: 11pt; font-weight: 700; margin-bottom: 2mm; }
  .section-label {
    font-size: 8pt;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 700;
    color: #2563eb;
    margin-bottom: 3mm;
  }
  .rule { height: 2px; width: 18mm; background: #2563eb; border-radius: 2px; margin: 4mm 0 7mm; }
  p { margin-bottom: 4mm; color: #33415a; }
  .lead { font-size: 11.5pt; color: #16202f; }
  .card {
    border: 1px solid #e3e8f0;
    border-radius: 8px;
    padding: 6mm;
    margin-bottom: 5mm;
    background: #fbfcfe;
  }
  .card h3 { color: #16202f; }
  .card p:last-child { margin-bottom: 0; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .checklist { list-style: none; margin: 0 0 5mm; }
  .checklist li {
    position: relative;
    padding-left: 6mm;
    margin-bottom: 2.6mm;
    color: #33415a;
  }
  .checklist li::before {
    content: "";
    position: absolute;
    left: 1mm;
    top: 2.3mm;
    width: 1.9mm;
    height: 1.9mm;
    border-radius: 50%;
    background: #2563eb;
  }
  .checklist.muted li::before { background: #94a3b8; }
  .coverage-row {
    display: grid;
    grid-template-columns: 62mm 1fr;
    gap: 5mm;
    padding: 4mm 0;
    border-bottom: 1px solid #eaeef5;
  }
  .coverage-row:last-child { border-bottom: none; }
  .coverage-row .req { font-weight: 700; color: #16202f; }
  .coverage-row .sol { color: #475569; }
  .outcome {
    padding: 4.5mm 0;
    border-bottom: 1px solid #eaeef5;
  }
  .outcome:last-child { border-bottom: none; }
  .outcome .title { font-weight: 700; color: #16202f; margin-bottom: 1.5mm; }
  .outcome .body { color: #475569; }
  .shot {
    border: 1px solid #e3e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 5mm;
    background: #ffffff;
  }
  .shot img { display: block; width: 100%; height: auto; }
  .shot .caption {
    font-size: 8.5pt;
    color: #64748b;
    padding: 2.5mm 4mm;
    border-top: 1px solid #eef1f6;
    background: #fafbfd;
  }
  .demo-panel {
    border: 1px solid #c7d7fb;
    background: #f2f6ff;
    border-radius: 8px;
    padding: 6mm;
    margin-bottom: 5mm;
  }
  .demo-panel .label { font-size: 8pt; letter-spacing: 0.14em; text-transform: uppercase; color: #2563eb; font-weight: 700; }
  .demo-panel a { color: #1d4ed8; font-weight: 700; word-break: break-all; text-decoration: none; }
  .creds { display: flex; gap: 12mm; margin-top: 4mm; font-size: 10pt; }
  .creds strong { display: block; font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin-bottom: 1mm; }
  .phase { display: flex; gap: 5mm; padding: 4mm 0; border-bottom: 1px solid #eaeef5; }
  .phase:last-child { border-bottom: none; }
  .phase .num {
    flex: 0 0 9mm;
    height: 9mm;
    border-radius: 50%;
    background: #eaf0ff;
    color: #1d4ed8;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10pt;
  }
  .note {
    font-size: 9pt;
    color: #64748b;
    border-left: 2px solid #cbd5e1;
    padding-left: 4mm;
  }
  .footnote { position: absolute; bottom: 12mm; left: 20mm; right: 20mm; font-size: 8pt; color: #94a3b8; }
`;

/** Builds the print-ready HTML for the client project brief. */
export function renderBriefHtml(input: BriefRenderInput): string {
  const { brief } = input;
  const cover = input.screenshots[0];
  const gallery = input.screenshots.slice(1, 4);
  const coverageShots = input.screenshots.slice(0, 2);

  const demoPanel = input.demoUrl
    ? `<div class="demo-panel">
         <p class="label">Live interactive demo</p>
         <p style="margin:2mm 0 0"><a href="${escapeHtml(input.demoUrl)}">${escapeHtml(input.demoUrl)}</a></p>
         ${
           input.demoEmail
             ? `<div class="creds">
                  <div><strong>Email</strong>${escapeHtml(input.demoEmail)}</div>
                  <div><strong>Password</strong>${escapeHtml(input.demoPassword ?? "")}</div>
                </div>`
             : ""
         }
       </div>`
    : "";

  const pages: string[] = [];

  // Page 1 — cover
  pages.push(`<section class="page cover">
    <div class="cover-inner">
      <p class="eyebrow">Project concept</p>
      <h1>${escapeHtml(brief.projectTitle)}</h1>
      <p class="category">${escapeHtml(brief.category)}</p>
      <p class="summary">${escapeHtml(brief.summary)}</p>
      ${
        cover
          ? `<div class="cover-shot"><img src="${cover.dataUri}" alt="${escapeHtml(cover.label)}" /></div>`
          : `<div class="cover-facts">
               <div class="cover-fact"><div class="k">Primary users</div><div class="v">${escapeHtml(
                 brief.users.slice(0, 3).join(", ") || "Described in the brief",
               )}</div></div>
               <div class="cover-fact"><div class="k">Core modules</div><div class="v">${escapeHtml(
                 brief.proposedSolution.modules.slice(0, 4).join(", ") || "Scoped from your requirements",
               )}</div></div>
             </div>`
      }
    </div>
    <div class="cover-footer">
      <div class="cover-meta">
        <div><strong>Prepared for</strong>${escapeHtml(input.preparedFor)}</div>
        <div><strong>Prepared by</strong>${escapeHtml(input.companyName ?? input.preparedBy)}</div>
        <div><strong>Date</strong>${input.generatedOn.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}</div>
      </div>
    </div>
  </section>`);

  // Page 2 — understanding the problem
  pages.push(`<section class="page">
    <p class="section-label">Understanding your project</p>
    <h2>The problem behind the brief</h2>
    <div class="rule"></div>
    <p class="lead">${escapeHtml(brief.currentProblem)}</p>

    <div class="card">
      <h3>Project goal</h3>
      <p>${escapeHtml(brief.projectGoal)}</p>
    </div>

    <h3 style="margin-top:6mm">Who will use it</h3>
    ${list(brief.users)}

    ${
      brief.assumptions.length
        ? `<h3 style="margin-top:4mm">Assumptions we made</h3>
           <p class="note">These were not stated in the brief. We have listed them so they can be confirmed or corrected before work starts.</p>
           ${list(brief.assumptions, "muted")}`
        : ""
    }
  </section>`);

  // Page 3 — proposed solution
  pages.push(`<section class="page">
    <p class="section-label">Proposed solution</p>
    <h2>How we would approach it</h2>
    <div class="rule"></div>
    <p class="lead">${escapeHtml(brief.proposedSolution.approach)}</p>

    <div class="grid-2">
      <div class="card">
        <h3>Key workflows</h3>
        ${list(brief.proposedSolution.workflows)}
      </div>
      <div class="card">
        <h3>Core modules</h3>
        ${list(brief.proposedSolution.modules)}
      </div>
    </div>

    <h3 style="margin-top:4mm">Technical direction</h3>
    <p>${escapeHtml(brief.proposedSolution.technicalDirection)}</p>
  </section>`);

  // Page 4 — what the demo covers
  pages.push(`<section class="page">
    <p class="section-label">Demo coverage</p>
    <h2>What the prototype shows</h2>
    <div class="rule"></div>
    <p>Each requirement below comes from your brief. The prototype represents it visually; it does not implement it as production software.</p>

    <div style="margin-top:4mm">
      ${brief.demoCoverage
        .map(
          (item) => `<div class="coverage-row">
            <div class="req">${escapeHtml(item.requirement)}</div>
            <div class="sol">${escapeHtml(item.representation)}</div>
          </div>`,
        )
        .join("")}
    </div>

    ${coverageShots
      .map(
        (shot) =>
          `<div class="shot" style="margin-top:5mm"><img src="${shot.dataUri}" alt="${escapeHtml(shot.label)}" /><div class="caption">${escapeHtml(shot.label)}</div></div>`,
      )
      .join("")}
  </section>`);

  // Page 5 — demo preview
  if (input.demoUrl || gallery.length > 0) {
    pages.push(`<section class="page">
      <p class="section-label">Demo preview</p>
      <h2>Explore the prototype</h2>
      <div class="rule"></div>
      ${demoPanel}
      ${gallery
        .map(
          (shot) =>
            `<div class="shot"><img src="${shot.dataUri}" alt="${escapeHtml(shot.label)}" /><div class="caption">${escapeHtml(shot.label)}</div></div>`,
        )
        .join("")}
      <p class="note">The prototype runs on sample data. No payments, messages, integrations or models are active in it.</p>
    </section>`);
  }

  // Page 6 — business outcomes
  pages.push(`<section class="page">
    <p class="section-label">Outcomes</p>
    <h2>Problems this solves</h2>
    <div class="rule"></div>
    <div>
      ${brief.businessOutcomes
        .map(
          (outcome) => `<div class="outcome">
            <div class="title">${escapeHtml(outcome.title)}</div>
            <div class="body">${escapeHtml(outcome.outcome)}</div>
          </div>`,
        )
        .join("")}
    </div>
  </section>`);

  // Page 7 — deliverables, future scope and roadmap
  pages.push(`<section class="page">
    <p class="section-label">Scope</p>
    <h2>What you would receive</h2>
    <div class="rule"></div>
    ${list(brief.deliverables)}

    <h3 style="margin-top:6mm">Potential future enhancements</h3>
    <p class="note">Listed separately. These are not part of the requested scope.</p>
    ${list(brief.futureEnhancements, "muted")}

    <h3 style="margin-top:6mm">Implementation approach</h3>
    <div>
      ${brief.phases
        .map(
          (phase, index) => `<div class="phase">
            <div class="num">${index + 1}</div>
            <div>
              <div class="title" style="font-weight:700">${escapeHtml(phase.name)}</div>
              <div class="body" style="color:#475569">${escapeHtml(phase.detail)}</div>
            </div>
          </div>`,
        )
        .join("")}
    </div>
  </section>`);

  // Page 8 — next step
  pages.push(`<section class="page">
    <p class="section-label">Next step</p>
    <h2>Where we go from here</h2>
    <div class="rule"></div>
    <p class="lead">${escapeHtml(brief.closingNote)}</p>
    ${demoPanel}
    <div class="card">
      <h3>Prepared by</h3>
      <p>${escapeHtml(input.companyName ?? input.preparedBy)}${
        input.portfolioUrl ? ` — <a href="${escapeHtml(input.portfolioUrl)}" style="color:#1d4ed8">${escapeHtml(input.portfolioUrl)}</a>` : ""
      }</p>
    </div>
    <p class="footnote">This brief was prepared specifically for ${escapeHtml(input.preparedFor)}.</p>
  </section>`);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(brief.projectTitle)} — Project Brief</title>
    <style>${STYLES}</style>
  </head>
  <body>${pages.join("")}</body>
</html>`;
}
