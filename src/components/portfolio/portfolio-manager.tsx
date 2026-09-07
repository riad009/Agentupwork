"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLinkIcon,
  FolderGit2Icon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { portfolioSchema } from "@/schemas/portfolio";

export interface PortfolioProjectView {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  url: string | null;
  githubUrl: string | null;
  clientIndustry: string | null;
  projectType: string | null;
  achievements: string[];
  highlighted: boolean;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  technologies: "",
  url: "",
  githubUrl: "",
  clientIndustry: "",
  projectType: "",
  achievements: "",
  highlighted: false,
};

type FormState = typeof EMPTY_FORM;

function toFormState(project: PortfolioProjectView): FormState {
  return {
    title: project.title,
    description: project.description,
    technologies: project.technologies.join(", "),
    url: project.url ?? "",
    githubUrl: project.githubUrl ?? "",
    clientIndustry: project.clientIndustry ?? "",
    projectType: project.projectType ?? "",
    achievements: project.achievements.join("\n"),
    highlighted: project.highlighted,
  };
}

function splitList(value: string, separator: "," | "\n"): string[] {
  return value
    .split(separator)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function PortfolioManager({ projects }: { projects: PortfolioProjectView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioProjectView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function startEdit(project: PortfolioProjectView) {
    setEditing(project);
    setForm(toFormState(project));
    setError(null);
    setOpen(true);
  }

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function save() {
    setError(null);

    const payload = {
      title: form.title,
      description: form.description,
      technologies: splitList(form.technologies, ","),
      url: form.url || undefined,
      githubUrl: form.githubUrl || undefined,
      clientIndustry: form.clientIndustry || undefined,
      projectType: form.projectType || undefined,
      achievements: splitList(form.achievements, "\n"),
      highlighted: form.highlighted,
    };

    const parsed = portfolioSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/portfolio/${editing.id}` : "/api/portfolio", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error?.message ?? "Could not save this project.");
        return;
      }

      toast.success(editing ? "Project updated" : "Project added");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save this project.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete this project.");
      return;
    }
    toast.success("Project removed");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={startCreate}>
          <PlusIcon className="size-4" />
          Add project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2Icon}
          title="No portfolio projects yet"
          description="Proposals may only reference experience recorded here. Nothing is ever invented, so an empty portfolio produces vaguer proposals."
          action={
            <Button size="sm" onClick={startCreate}>
              Add your first project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {project.highlighted ? <StarIcon className="text-warning size-4 shrink-0" /> : null}
                      <span className="line-clamp-1">{project.title}</span>
                    </CardTitle>
                    {project.clientIndustry || project.projectType ? (
                      <CardDescription>
                        {[project.clientIndustry, project.projectType].filter(Boolean).join(" · ")}
                      </CardDescription>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => startEdit(project)}>
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon-sm" variant="ghost" className="text-destructive">
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this project?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Future proposals will no longer be able to reference it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(project.id)}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground line-clamp-3 text-sm">{project.description}</p>

                {project.technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {project.technologies.slice(0, 8).map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-[10px]">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {project.achievements.length > 0 ? (
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    {project.achievements.slice(0, 3).map((achievement) => (
                      <li key={achievement}>• {achievement}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex gap-2">
                  {project.url ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={project.url} target="_blank" rel="noreferrer noopener">
                        <ExternalLinkIcon className="size-3.5" />
                        Live
                      </a>
                    </Button>
                  ) : null}
                  {project.githubUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={project.githubUrl} target="_blank" rel="noreferrer noopener">
                        <FolderGit2Icon className="size-3.5" />
                        Code
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit project" : "Add a project"}</DialogTitle>
            <DialogDescription>
              Record only real work. Proposals reference this verbatim and never invent experience.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <div className="space-y-2">
              <Label htmlFor="title">Project title</Label>
              <Input id="title" value={form.title} onChange={(event) => update("title", event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="What the client needed, what you built, and what the outcome was."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="technologies">Technologies (comma separated)</Label>
                <Input
                  id="technologies"
                  value={form.technologies}
                  onChange={(event) => update("technologies", event.target.value)}
                  placeholder="Next.js, TypeScript, Stripe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientIndustry">Client industry</Label>
                <Input
                  id="clientIndustry"
                  value={form.clientIndustry}
                  onChange={(event) => update("clientIndustry", event.target.value)}
                  placeholder="Healthcare"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectType">Project type</Label>
                <Input
                  id="projectType"
                  value={form.projectType}
                  onChange={(event) => update("projectType", event.target.value)}
                  placeholder="SaaS dashboard"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Live URL</Label>
                <Input id="url" value={form.url} onChange={(event) => update("url", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="githubUrl">Repository URL</Label>
                <Input
                  id="githubUrl"
                  value={form.githubUrl}
                  onChange={(event) => update("githubUrl", event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="achievements">Outcomes (one per line)</Label>
              <Textarea
                id="achievements"
                rows={3}
                value={form.achievements}
                onChange={(event) => update("achievements", event.target.value)}
                placeholder="Cut checkout drop-off by 22%"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="highlighted">Highlight this project</Label>
                <p className="text-muted-foreground text-xs">Highlighted projects are shown to Claude first.</p>
              </div>
              <Switch
                id="highlighted"
                checked={form.highlighted}
                onCheckedChange={(checked) => update("highlighted", checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Add project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
