import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EntryEditor } from "@/components/career/EntryEditor";
import { careerService } from "@/services/career.service";
import {
  CAREER_KINDS,
  KIND_META,
  blankEntry,
  profileCompleteness,
  type CareerEntry,
  type CareerKind,
  type CareerPersonal,
} from "@/lib/career-schema";

export const Route = createFileRoute("/_authenticated/career")({
  head: () => ({
    meta: [
      { title: "Career knowledge profile — CareerPilot AI" },
      {
        name: "description",
        content:
          "One structured record of your experience, education, skills, projects, certifications and achievements — the source of truth behind every generated resume.",
      },
      { property: "og:title", content: "Career knowledge profile — CareerPilot AI" },
      {
        property: "og:description",
        content: "Keep every career fact in one place and let CareerPilot reuse it everywhere.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareerProfilePage,
});

function CareerProfilePage() {
  const queryClient = useQueryClient();
  const [activeKind, setActiveKind] = useState<CareerKind>("experience");

  const profileQuery = useQuery({
    queryKey: ["career-profile"],
    queryFn: () => careerService.get(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["career-profile"] });

  const createMutation = useMutation({
    mutationFn: (kind: CareerKind) =>
      careerService.create({ ...blankEntry(kind, 999), kind }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "Could not add that item."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CareerEntry> }) =>
      careerService.update(id, patch),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "Could not save that change."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => careerService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Removed");
    },
    onError: (e: Error) => toast.error(e.message || "Could not remove that item."),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => careerService.reorder(ids),
    onSuccess: invalidate,
  });

  if (profileQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading your career profile…
      </p>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">We couldn&apos;t load your career profile.</p>
        <Button className="mt-4" variant="outline" onClick={() => profileQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const profile = profileQuery.data;
  const completeness = profileCompleteness(profile);
  const entries = profile.entries.filter((e) => e.kind === activeKind);
  const meta = KIND_META[activeKind];

  function move(index: number, direction: -1 | 1) {
    const next = [...entries];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item as CareerEntry);
    reorderMutation.mutate(next.map((e) => e.id));
  }

  return (
    <>
      <PageHeader
        title="Career knowledge profile"
        description="Everything CareerPilot knows about you. Resume generation and job matching read from here — keep it accurate and they stay truthful."
      />

      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="min-w-[200px] flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Profile completeness</span>
            <span className="text-muted-foreground">{completeness}%</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Career profile completeness"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden />
          {completeness >= 80
            ? "Rich enough for strong tailored resumes."
            : "Add more detail for sharper generation and matching."}
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <PersonalInfoCard personal={profile.personal} onSaved={invalidate} />

        <section aria-labelledby="sections-heading">
          <h2 id="sections-heading" className="sr-only">
            Career sections
          </h2>

          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Career sections">
            {CAREER_KINDS.map((kind) => {
              const count = profile.entries.filter((e) => e.kind === kind).length;
              const selected = kind === activeKind;
              return (
                <button
                  key={kind}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveKind(kind)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {KIND_META[kind].label}
                  <span className="ml-1.5 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{meta.emptyHint}</p>
            <Button
              onClick={() => createMutation.mutate(activeKind)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              Add {meta.singular}
            </Button>
          </div>

          {entries.length > 0 ? (
            <ul className="space-y-3">
              {entries.map((entry, index) => (
                <EntryEditor
                  key={entry.id}
                  entry={entry}
                  saving={updateMutation.isPending && updateMutation.variables?.id === entry.id}
                  onChange={(patch) => updateMutation.mutate({ id: entry.id, patch })}
                  onDelete={() => deleteMutation.mutate(entry.id)}
                  onMove={(direction) => move(index, direction)}
                  canMoveUp={index > 0}
                  canMoveDown={index < entries.length - 1}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium">Nothing here yet</p>
              <p className="mt-1 text-sm text-muted-foreground">{meta.emptyHint}</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/** Personal info block — saved explicitly so identity fields aren't half-written. */
function PersonalInfoCard({
  personal,
  onSaved,
}: {
  personal: CareerPersonal;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(personal);
  const initial = useRef(personal);

  // Keep the form in sync when the query refetches with server values.
  useEffect(() => {
    if (JSON.stringify(initial.current) !== JSON.stringify(personal)) {
      initial.current = personal;
      setForm(personal);
    }
  }, [personal]);

  const mutation = useMutation({
    mutationFn: (values: CareerPersonal) => careerService.savePersonal(values),
    onSuccess: () => {
      toast.success("Personal info saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message || "Could not save your details."),
  });

  const set = (key: keyof CareerPersonal) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <section
      aria-labelledby="personal-heading"
      className="h-fit rounded-xl border border-border bg-card p-5 shadow-soft"
    >
      <h2
        id="personal-heading"
        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
      >
        Personal info
      </h2>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="p-name" label="Full name" value={form.fullName} onChange={set("fullName")} />
          <TextField
            id="p-title"
            label="Current title"
            value={form.jobTitle}
            onChange={set("jobTitle")}
            placeholder="Frontend Engineer"
          />
          <TextField id="p-email" label="Email" value={form.email} onChange={() => {}} disabled />
          <TextField id="p-phone" label="Phone" value={form.phone} onChange={set("phone")} />
          <TextField
            id="p-location"
            label="Location"
            value={form.location}
            onChange={set("location")}
          />
          <TextField
            id="p-headline"
            label="Headline"
            value={form.headline}
            onChange={set("headline")}
            placeholder="React + Node, 4 yrs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-summary">Professional summary</Label>
          <Textarea
            id="p-summary"
            rows={4}
            value={form.summary}
            onChange={(e) => set("summary")(e.target.value)}
            placeholder="Two or three sentences on what you do and the impact you've had."
          />
        </div>

        <div className="space-y-4">
          <TextField
            id="p-github"
            label="GitHub"
            value={form.githubUrl}
            onChange={set("githubUrl")}
            placeholder="https://github.com/username"
          />
          <TextField
            id="p-linkedin"
            label="LinkedIn"
            value={form.linkedinUrl}
            onChange={set("linkedinUrl")}
            placeholder="https://linkedin.com/in/username"
          />
          <TextField
            id="p-website"
            label="Portfolio"
            value={form.websiteUrl}
            onChange={set("websiteUrl")}
            placeholder="https://yoursite.dev"
          />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden /> Save personal info
            </>
          )}
        </Button>
      </form>
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
