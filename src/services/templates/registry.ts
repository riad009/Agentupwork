export type TemplateKey =
  | "admin-dashboard"
  | "crm"
  | "healthcare"
  | "booking"
  | "analytics"
  | "ai-saas"
  | "marketplace"
  | "fintech"
  | "ecommerce"
  | "project-management";

export interface DemoTemplate {
  key: TemplateKey;
  name: string;
  industry: string;
  /** Design direction handed to the generator so screens match the client's sector. */
  designDirection: string;
  primaryColor: string;
  surfaceTint: string;
  defaultRoutes: { route: string; name: string; purpose: string }[];
  keywords: string[];
}

export const TEMPLATES: Record<TemplateKey, DemoTemplate> = {
  "admin-dashboard": {
    key: "admin-dashboard",
    name: "Operations Admin Dashboard",
    industry: "General SaaS",
    designDirection:
      "Neutral, dense and utilitarian. Clear hierarchy, generous whitespace between groups, subdued accent colour used only for primary metrics and active navigation.",
    primaryColor: "#2563eb",
    surfaceTint: "#f8fafc",
    defaultRoutes: [
      { route: "overview", name: "Overview", purpose: "Key operational metrics and recent activity" },
      { route: "records", name: "Records", purpose: "Primary data table with filters and status" },
      { route: "reports", name: "Reports", purpose: "Trends and exportable summaries" },
    ],
    keywords: ["admin", "dashboard", "internal tool", "operations", "back office"],
  },
  crm: {
    key: "crm",
    name: "Customer Relationship Manager",
    industry: "Sales",
    designDirection:
      "Warm and people-focused. Avatars and names lead every row, pipeline stages read as coloured chips, activity feels chronological and human.",
    primaryColor: "#7c3aed",
    surfaceTint: "#faf8ff",
    defaultRoutes: [
      { route: "pipeline", name: "Pipeline", purpose: "Deal stages with values and owners" },
      { route: "contacts", name: "Contacts", purpose: "Searchable customer directory" },
      { route: "activity", name: "Activity", purpose: "Timeline of recent touchpoints" },
    ],
    keywords: ["crm", "sales", "leads", "pipeline", "contacts"],
  },
  healthcare: {
    key: "healthcare",
    name: "Clinical Operations Portal",
    industry: "Healthcare",
    designDirection:
      "Clean, calm and trustworthy. High contrast text, soft teal accents, roomy touch targets, no aggressive reds except for genuine alerts. Accessibility-first spacing.",
    primaryColor: "#0d9488",
    surfaceTint: "#f5fbfa",
    defaultRoutes: [
      { route: "schedule", name: "Schedule", purpose: "Appointments by clinician and status" },
      { route: "patients", name: "Patients", purpose: "Patient directory with key details" },
      { route: "insights", name: "Insights", purpose: "Utilisation and no-show trends" },
    ],
    keywords: ["clinic", "patient", "appointment", "medical", "health", "practice"],
  },
  booking: {
    key: "booking",
    name: "Scheduling & Booking System",
    industry: "Services",
    designDirection:
      "Calendar-forward and immediate. Time slots dominate, availability states are colour-coded, confirmation actions are unmissable.",
    primaryColor: "#0284c7",
    surfaceTint: "#f4faff",
    defaultRoutes: [
      { route: "calendar", name: "Calendar", purpose: "Day and week view of bookings" },
      { route: "bookings", name: "Bookings", purpose: "List of upcoming and past bookings" },
      { route: "resources", name: "Resources", purpose: "Staff, rooms or equipment availability" },
    ],
    keywords: ["booking", "scheduling", "calendar", "appointments", "reservations"],
  },
  analytics: {
    key: "analytics",
    name: "Analytics Workspace",
    industry: "Data",
    designDirection:
      "Chart-led and precise. Tabular numbers, restrained palette, one accent per series, deliberate use of small multiples over one crowded chart.",
    primaryColor: "#0891b2",
    surfaceTint: "#f5fbfd",
    defaultRoutes: [
      { route: "performance", name: "Performance", purpose: "Headline metrics and trend charts" },
      { route: "segments", name: "Segments", purpose: "Breakdown by channel, cohort or product" },
      { route: "exports", name: "Exports", purpose: "Saved reports and scheduled exports" },
    ],
    keywords: ["analytics", "reporting", "dashboard", "metrics", "bi", "data"],
  },
  "ai-saas": {
    key: "ai-saas",
    name: "AI Product Console",
    industry: "AI SaaS",
    designDirection:
      "Modern, minimal and intelligent. Lots of negative space, mono type for model and token details, a single vivid accent, subtle borders instead of heavy cards.",
    primaryColor: "#4f46e5",
    surfaceTint: "#f8f8ff",
    defaultRoutes: [
      { route: "workspace", name: "Workspace", purpose: "Assistant interface with sources and history" },
      { route: "runs", name: "Runs", purpose: "Execution history with status and cost" },
      { route: "usage", name: "Usage", purpose: "Token consumption and quality signals" },
    ],
    keywords: ["ai", "llm", "assistant", "openai", "claude", "rag", "chatbot", "agent"],
  },
  marketplace: {
    key: "marketplace",
    name: "Two-Sided Marketplace",
    industry: "Marketplace",
    designDirection:
      "Listing-first and photographic. Card grids, clear supply/demand split in the navigation, trust signals such as ratings shown prominently.",
    primaryColor: "#db2777",
    surfaceTint: "#fff7fb",
    defaultRoutes: [
      { route: "listings", name: "Listings", purpose: "Browse and manage marketplace listings" },
      { route: "orders", name: "Orders", purpose: "Transactions between both sides" },
      { route: "providers", name: "Providers", purpose: "Supply side directory with ratings" },
    ],
    keywords: ["marketplace", "two-sided", "vendors", "listings", "gig", "rental"],
  },
  fintech: {
    key: "fintech",
    name: "Financial Operations Console",
    industry: "FinTech",
    designDirection:
      "Professional, data-dense and secure-looking. Tabular figures everywhere, dark navy accents, conservative use of colour, status pills for reconciliation states.",
    primaryColor: "#1d4ed8",
    surfaceTint: "#f6f8ff",
    defaultRoutes: [
      { route: "accounts", name: "Accounts", purpose: "Balances and account health" },
      { route: "transactions", name: "Transactions", purpose: "Ledger with reconciliation status" },
      { route: "compliance", name: "Compliance", purpose: "Review queue and audit trail" },
    ],
    keywords: ["fintech", "payments", "banking", "stripe", "invoice", "billing", "ledger"],
  },
  ecommerce: {
    key: "ecommerce",
    name: "Commerce Operations",
    industry: "E-commerce",
    designDirection:
      "Product-focused and conversion-oriented. Imagery placeholders with strong aspect ratios, revenue metrics up top, inventory risk highlighted.",
    primaryColor: "#ea580c",
    surfaceTint: "#fff9f5",
    defaultRoutes: [
      { route: "storefront", name: "Storefront", purpose: "Sales performance and top products" },
      { route: "orders", name: "Orders", purpose: "Fulfilment queue and order states" },
      { route: "inventory", name: "Inventory", purpose: "Stock levels and reorder alerts" },
    ],
    keywords: ["ecommerce", "shopify", "store", "products", "orders", "inventory", "retail"],
  },
  "project-management": {
    key: "project-management",
    name: "Project Delivery Workspace",
    industry: "Project Management",
    designDirection:
      "Structured and progress-oriented. Status columns, progress bars, owner avatars, and a clear separation between planned and in-flight work.",
    primaryColor: "#0f766e",
    surfaceTint: "#f5fbfa",
    defaultRoutes: [
      { route: "projects", name: "Projects", purpose: "Portfolio of active projects with health" },
      { route: "tasks", name: "Tasks", purpose: "Work items grouped by status" },
      { route: "team", name: "Team", purpose: "Capacity and assignment overview" },
    ],
    keywords: ["project management", "tasks", "kanban", "construction", "agency", "workflow"],
  },
};

export function getTemplate(key: string): DemoTemplate {
  return TEMPLATES[key as TemplateKey] ?? TEMPLATES["admin-dashboard"];
}

/** Keyword fallback used when the model does not supply a usable template key. */
export function inferTemplate(text: string): DemoTemplate {
  const haystack = text.toLowerCase();
  let best: { template: DemoTemplate; hits: number } = {
    template: TEMPLATES["admin-dashboard"],
    hits: 0,
  };

  for (const template of Object.values(TEMPLATES)) {
    const hits = template.keywords.filter((keyword) => haystack.includes(keyword)).length;
    if (hits > best.hits) best = { template, hits };
  }

  return best.template;
}

export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];
