import {
  BarChart3Icon,
  BriefcaseIcon,
  FileTextIcon,
  FolderGit2Icon,
  LayoutDashboardIcon,
  MonitorPlayIcon,
  SettingsIcon,
  ShieldIcon,
  SparklesIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  adminOnly?: boolean;
}

export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon, description: "Pipeline overview" },
  { label: "Jobs", href: "/jobs", icon: BriefcaseIcon, description: "Every discovered job" },
  { label: "Top Matches", href: "/top-matches", icon: SparklesIcon, description: "Ranked opportunities" },
  { label: "Proposals", href: "/proposals", icon: FileTextIcon, description: "Review and approve" },
  { label: "Demos", href: "/demos", icon: MonitorPlayIcon, description: "Concept prototypes" },
  { label: "Portfolio", href: "/portfolio", icon: FolderGit2Icon, description: "Your real experience" },
  { label: "Automation", href: "/automation", icon: WorkflowIcon, description: "Runs and logs" },
  { label: "Analytics", href: "/analytics", icon: BarChart3Icon, description: "Performance trends" },
];

export const secondaryNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: SettingsIcon },
  { label: "Admin", href: "/admin", icon: ShieldIcon, adminOnly: true },
];

export const settingsNav = [
  { label: "Account", href: "/settings/account" },
  { label: "Upwork", href: "/settings/upwork" },
  { label: "Claude AI", href: "/settings/claude" },
  { label: "GitHub", href: "/settings/github" },
  { label: "Vercel", href: "/settings/vercel" },
  { label: "Email", href: "/settings/email" },
  { label: "Automation", href: "/settings/automation" },
  { label: "Job Preferences", href: "/settings/job-preferences" },
  { label: "Proposal Preferences", href: "/settings/proposal-preferences" },
  { label: "Notifications", href: "/settings/notifications" },
];
