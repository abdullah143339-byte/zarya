"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Save, Rocket, Sparkles, Loader2, Upload, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useAuth } from "@/providers/AuthProvider";
import api from "@/lib/api";
import { COVER_GRADIENTS, LOGOS, CATEGORY_POOL, TECH_POOL, TAG_POOL, normalizePostToProject, extractPost } from "@/components/projects/data";
import { aiGenerateDescription, aiSuggestTags, aiSuggestTechStack } from "@/components/projects/ai";
import type { ProjectRow, ProjectStatus, ProjectVisibility, ProjectTeamMember } from "@/components/projects/types";

const DRAFT_KEY = "novax_project_drafts";

interface DraftRecord {
  savedAt: string;
  editId?: string;
  form: ProjectFormState;
}

export interface ProjectFormState {
  cover: string;
  logo: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  isOpenSource: boolean;
  isAI: boolean;
  isStartup: boolean;
  techStack: string[];
  tags: string[];
  links: { github: string; demo: string; docs: string; download: string };
  license: string;
  team: ProjectTeamMember[];
  features: string[];
  screenshots: string[];
}

function defaultForm(): ProjectFormState {
  return {
    cover: COVER_GRADIENTS[0],
    logo: LOGOS[0],
    title: "",
    tagline: "",
    description: "",
    category: CATEGORY_POOL[0],
    status: "IDEA",
    visibility: "PUBLIC",
    isOpenSource: false,
    isAI: false,
    isStartup: false,
    techStack: [],
    tags: [],
    links: { github: "", demo: "", docs: "", download: "" },
    license: "MIT",
    team: [],
    features: [],
    screenshots: [],
  };
}

function toProject(form: ProjectFormState): ProjectRow {
  return {
    id: "form",
    title: form.title,
    tagline: form.tagline,
    description: form.description,
    cover: form.cover,
    logo: form.logo,
    category: form.category,
    techStack: form.techStack,
    tags: form.tags,
    status: form.status,
    visibility: form.visibility,
    isOpenSource: form.isOpenSource,
    isAI: form.isAI,
    isStartup: form.isStartup,
    creator: { name: "", username: "", verified: false, avatar: "🧑‍🚀" },
    stats: { likes: 0, views: 0, comments: 0, bookmarks: 0, shares: 0 },
    links: { ...form.links },
    license: form.license,
    features: form.features,
    roadmap: [],
    changelog: [],
    team: form.team,
    gallery: form.screenshots,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    draft: false,
    source: "post",
  };
}

function readDrafts(): Record<string, DraftRecord> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, DraftRecord>) : {};
  } catch {
    return {};
  }
}

let draftSeq = 0;

export function CreateProjectForm({ editId }: { editId?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ProjectFormState>(defaultForm);
  const [techDraft, setTechDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [featureDraft, setFeatureDraft] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamRole, setTeamRole] = useState("Founder");
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState<"desc" | "tags" | "tech" | null>(null);
  const [coverFile, setCoverFile] = useState<string | null>(null);
  const [uploadingShot, setUploadingShot] = useState(false);

  useEffect(() => {
    if (!editId) return;
    if (editId.startsWith("draft-")) {
      const raf = requestAnimationFrame(() => {
        const drafts = readDrafts();
        const record = drafts[editId];
        if (record) {
          setForm((prev) => ({ ...prev, ...record.form }));
        } else {
          alert("Draft not found in this browser.");
        }
        setLoadingEdit(false);
      });
      return () => cancelAnimationFrame(raf);
    }
    const targetId = editId;
    let mounted = true;
    const raf = requestAnimationFrame(() => {
      async function load() {
        try {
          const res = await api.getPost(targetId);
          const post = extractPost(res.data);
          if (post && user) {
            const p = normalizePostToProject(post);
            if (mounted) {
              setForm((prev) => ({
                ...prev,
                cover: p.cover,
                logo: p.logo,
                title: p.title,
                tagline: p.tagline,
                description: p.description,
                techStack: p.techStack,
                tags: p.tags,
                features: p.features,
                screenshots: p.gallery,
                links: { ...prev.links, ...p.links },
              }));
            }
          }
        } catch {
          if (mounted) alert("Could not load this project for editing.");
        } finally {
          if (mounted) setLoadingEdit(false);
        }
      }
      void load();
    });
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [editId, user]);

  function patch(partial: Partial<ProjectFormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function addTech() {
    const v = techDraft.trim();
    if (!v) return;
    if (!form.techStack.includes(v)) patch({ techStack: [...form.techStack, v] });
    setTechDraft("");
  }

  function addTag() {
    const v = tagDraft.trim().toLowerCase().replace(/\s+/g, "-");
    if (!v) return;
    if (!form.tags.includes(v)) patch({ tags: [...form.tags, v] });
    setTagDraft("");
  }

  function addFeature() {
    const v = featureDraft.trim();
    if (!v) return;
    if (!form.features.includes(v)) patch({ features: [...form.features, v] });
    setFeatureDraft("");
  }

  async function addScreenshot(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Screenshots must be image files (PNG, JPG, WebP, etc).");
      return;
    }
    setUploadingShot(true);
    try {
      const res = await api.uploadFile(file, "post");
      const url = (res as { data?: { url?: string } }).data?.url;
      if (!url) throw new Error("Upload returned no URL");
      patch({ screenshots: [...form.screenshots, url] });
    } catch {
      alert("Failed to upload screenshot. Try again.");
    } finally {
      setUploadingShot(false);
    }
  }

  function addTeamMember() {
    const name = teamName.trim();
    if (!name) return;
    patch({ team: [...form.team, { name, username: name.toLowerCase().replace(/\s+/g, "-"), role: teamRole }] });
    setTeamName("");
    setTeamRole("Founder");
  }

  function buildContent(): string {
    const url = form.links.demo || form.links.github || form.links.docs || "";
    return [`Project: ${form.title}`, form.tagline, form.description, url ? `URL: ${url}` : ""].filter(Boolean).join("\n");
  }

  async function publish() {
    if (!form.title.trim() || !user) return;
    setSaving(true);
    try {
      if (editId) await api.deletePost(editId);
      await api.createPost({
        content: buildContent(),
        type: "TEXT",
        tags: ["project", ...form.techStack, ...form.tags],
        media: [{ kind: "project", features: form.features, screenshots: form.screenshots }],
      });
      router.push("/dashboard/projects");
    } catch {
      alert("Failed to publish project");
    } finally {
      setSaving(false);
    }
  }

  function saveDraft() {
    try {
      const drafts = readDrafts();
      draftSeq += 1;
      const id = editId || `draft-${draftSeq}`;
      drafts[id] = { savedAt: new Date().toISOString(), editId, form };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
      alert("Draft saved to this browser (backend drafts API pending).");
    } catch {
      alert("Failed to save draft");
    }
  }

  async function runAI(kind: "desc" | "tags" | "tech") {
    setAiBusy(kind);
    try {
      if (kind === "desc") {
        const res = await aiGenerateDescription(toProject(form));
        if (res.text) patch({ description: res.text });
      } else if (kind === "tags") {
        const res = await aiSuggestTags(toProject(form));
        const tags = res.text.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean).slice(0, 8);
        patch({ tags });
      } else {
        const res = await aiSuggestTechStack(toProject(form));
        const stack = res.text.split(",").map((t) => t.trim().split(" for ")[0]).filter(Boolean).slice(0, 6);
        patch({ techStack: stack });
      }
    } catch {
      alert("AI service unavailable right now.");
    } finally {
      setAiBusy(null);
    }
  }

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const inputCls =
    "w-full h-10 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const textareaCls =
    "w-full rounded-xl bg-muted border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{editId ? "Edit Project" : "Create a Project"}</h1>
          <p className="text-xs text-muted-foreground mt-1">Showcase your work to the NOVAX community. Publish as a post, refine with AI.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={saveDraft}>
            <Save className="w-4 h-4" /> Save Draft
          </Button>
          <Button size="sm" onClick={() => void publish()} disabled={saving || !form.title.trim()}>
            <Rocket className="w-4 h-4" /> {saving ? "Publishing..." : editId ? "Update Project" : "Publish"}
          </Button>
        </div>
      </div>

      <GlassCard>
        <h2 className="font-bold text-foreground mb-3">Cover & Logo</h2>
        <div className={cn("relative rounded-2xl aspect-[3/1] bg-gradient-to-br overflow-hidden", form.cover)}>
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
          {coverFile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverFile} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/40 text-white text-[11px] font-medium backdrop-blur">Cover preview</span>
          )}
          <span className="absolute bottom-3 left-4 w-12 h-12 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center text-2xl select-none">
            {form.logo}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = () => {
                const file = input.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => setCoverFile(String(reader.result));
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-muted border border-border text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Upload cover
          </button>
          <span className="text-[11px] text-muted-foreground">or pick a gradient:</span>
          {COVER_GRADIENTS.map((g, i) => (
            <button
              key={g}
              type="button"
              aria-label={`Gradient ${i + 1}`}
              onClick={() => patch({ cover: g })}
              className={cn("w-7 h-7 rounded-lg bg-gradient-to-br border-2 transition-transform", g, form.cover === g ? "border-primary scale-110" : "border-transparent")}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-[11px] text-muted-foreground">Logo:</span>
          {LOGOS.map((l) => (
            <button
              key={l}
              type="button"
              aria-label={`Logo ${l}`}
              onClick={() => patch({ logo: l })}
              className={cn(
                "w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center text-lg border-2 transition-transform",
                form.logo === l ? "border-primary scale-110" : "border-transparent"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-bold text-foreground mb-3">Basics</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Project Title *</label>
            <input type="text" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g. NexusMind" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tagline</label>
            <input type="text" value={form.tagline} onChange={(e) => patch({ tagline: e.target.value })} placeholder="One line that sells the idea" className={inputCls} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">Description</label>
              <button
                type="button"
                onClick={() => void runAI("desc")}
                disabled={aiBusy !== null}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {aiBusy === "desc" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Description
              </button>
            </div>
            <textarea rows={5} value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="What does it do? What problem does it solve?" className={textareaCls} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Category</label>
              <select value={form.category} onChange={(e) => patch({ category: e.target.value })} className={inputCls}>
                {CATEGORY_POOL.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Status</label>
              <select value={form.status} onChange={(e) => patch({ status: e.target.value as ProjectStatus })} className={inputCls}>
                <option value="IDEA">Idea</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.visibility === "PRIVATE"} onChange={(e) => patch({ visibility: e.target.checked ? "PRIVATE" : "PUBLIC" })} className="accent-primary" />
              Private (only you)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.isOpenSource} onChange={(e) => patch({ isOpenSource: e.target.checked })} className="accent-primary" />
              Open Source
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.isAI} onChange={(e) => patch({ isAI: e.target.checked })} className="accent-primary" />
              AI Powered
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.isStartup} onChange={(e) => patch({ isStartup: e.target.checked })} className="accent-primary" />
              Startup
            </label>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground">Tech Stack & Tags</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void runAI("tech")}
              disabled={aiBusy !== null}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {aiBusy === "tech" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Tech
            </button>
            <button
              type="button"
              onClick={() => void runAI("tags")}
              disabled={aiBusy !== null}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {aiBusy === "tags" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Tags
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Technologies</label>
            <div className="flex gap-2">
              <input list="tech-suggestions" value={techDraft} onChange={(e) => setTechDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }} placeholder="Type & press Enter (e.g. Next.js)" className={inputCls} />
              <datalist id="tech-suggestions">
                {TECH_POOL.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <Button type="button" size="sm" variant="secondary" onClick={addTech}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.techStack.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                    {t}
                    <button type="button" aria-label={`Remove ${t}`} onClick={() => patch({ techStack: form.techStack.filter((x) => x !== t) })} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tags</label>
            <div className="flex gap-2">
              <input list="tag-suggestions" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Type & press Enter (e.g. open-source)" className={inputCls} />
              <datalist id="tag-suggestions">
                {TAG_POOL.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <Button type="button" size="sm" variant="secondary" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    #{t}
                    <button type="button" aria-label={`Remove ${t}`} onClick={() => patch({ tags: form.tags.filter((x) => x !== t) })} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-bold text-foreground mb-3">Links & License</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {(
            [
              { key: "github", label: "GitHub URL" },
              { key: "demo", label: "Demo URL" },
              { key: "docs", label: "Docs URL" },
              { key: "download", label: "Download URL" },
            ] as const
          ).map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{f.label}</label>
              <input
                type="url"
                value={form.links[f.key]}
                onChange={(e) => patch({ links: { ...form.links, [f.key]: e.target.value } })}
                placeholder="https://"
                className={inputCls}
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">License</label>
            <select value={form.license} onChange={(e) => patch({ license: e.target.value })} className={inputCls}>
              {["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "MPL-2.0", "Proprietary", "Unlicense"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-bold text-foreground mb-3">Features</h2>
        <div className="flex gap-2">
          <input value={featureDraft} onChange={(e) => setFeatureDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} placeholder="Type a feature & press Enter" className={inputCls} />
          <Button type="button" size="sm" variant="secondary" onClick={addFeature}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {form.features.length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-1.5 mt-3">
            {form.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                <span className="text-green-500">✓</span>
                <span className="flex-1">{f}</span>
                <button type="button" aria-label={`Remove ${f}`} onClick={() => patch({ features: form.features.filter((x) => x !== f) })} className="text-muted-foreground hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard>
        <h2 className="font-bold text-foreground mb-1">Screenshots</h2>
        <p className="text-xs text-muted-foreground mb-3">Upload screenshots to showcase your project. Shown in the project gallery.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {form.screenshots.map((src, i) => (
            <div key={`${src}-${i}`} className="relative group rounded-xl overflow-hidden border border-border aspect-video bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Screenshot ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                aria-label={`Remove screenshot ${i + 1}`}
                onClick={() => patch({ screenshots: form.screenshots.filter((_, idx) => idx !== i) })}
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.multiple = true;
              input.onchange = () => {
                const files = Array.from(input.files || []);
                for (const file of files) void addScreenshot(file);
              };
              input.click();
            }}
            disabled={uploadingShot}
            className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary text-xs font-semibold disabled:opacity-50"
          >
            {uploadingShot ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            {uploadingShot ? "Uploading..." : "Add screenshots"}
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-bold text-foreground mb-3">Team</h2>
        <div className="flex flex-wrap gap-2">
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Member name" className={cn(inputCls, "flex-1 min-w-[180px]")} />
          <select value={teamRole} onChange={(e) => setTeamRole(e.target.value)} className={inputCls}>
            {["Founder", "Co-founder", "Lead Engineer", "ML Engineer", "Product Designer", "Data Scientist"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="secondary" onClick={addTeamMember}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
        {form.team.length > 0 && (
          <ul className="space-y-1.5 mt-3">
            {form.team.map((m, i) => (
              <li key={`${m.username}-${i}`} className="flex items-center gap-2 text-sm text-foreground/90">
                <span>👤 {m.name}</span>
                <span className="text-xs text-muted-foreground">· {m.role}</span>
                <button
                  type="button"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => patch({ team: form.team.filter((_, idx) => idx !== i) })}
                  className="ml-auto text-muted-foreground hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <div className="flex flex-wrap justify-end gap-2 pb-6">
        <Button variant="secondary" onClick={saveDraft}>
          <Save className="w-4 h-4" /> Save Draft
        </Button>
        <Button onClick={() => void publish()} disabled={saving || !form.title.trim()}>
          <Rocket className="w-4 h-4" /> {saving ? "Publishing..." : editId ? "Update Project" : "Publish Project"}
        </Button>
      </div>
    </div>
  );
}
