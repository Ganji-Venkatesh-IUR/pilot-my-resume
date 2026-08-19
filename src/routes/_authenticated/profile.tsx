import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { profileService } from "@/services/profile.service";
import { toErrorMessage } from "@/services/api-client";
import { useSession } from "@/hooks/useSession";
import { fieldErrors, profileSchema, type ProfileInput } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CareerPilot AI" },
      {
        name: "description",
        content: "Manage the name, headline and links shown on your generated resumes.",
      },
      { property: "og:title", content: "Profile — CareerPilot AI" },
      { property: "og:description", content: "Your CareerPilot AI account details." },
    ],
  }),
  component: ProfilePage,
});

const EMPTY: ProfileInput = {
  fullName: "",
  headline: "",
  location: "",
  githubUrl: "",
  linkedinUrl: "",
  websiteUrl: "",
};

function ProfilePage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileService.getCurrent(),
  });

  // Mirror the loaded profile into local form state whenever it changes.
  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.full_name ?? "",
      headline: profile.headline ?? "",
      location: profile.location ?? "",
      githubUrl: profile.github_url ?? "",
      linkedinUrl: profile.linkedin_url ?? "",
      websiteUrl: profile.website_url ?? "",
    });
  }, [profile]);

  function set<K extends keyof ProfileInput>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function cancelEdit() {
    setErrors({});
    setEditing(false);
    if (profile) {
      setForm({
        fullName: profile.full_name ?? "",
        headline: profile.headline ?? "",
        location: profile.location ?? "",
        githubUrl: profile.github_url ?? "",
        linkedinUrl: profile.linkedin_url ?? "",
        websiteUrl: profile.website_url ?? "",
      });
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await profileService.update(user.id, parsed.data);
      toast.success("Profile updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  }

  const initials = (form.fullName || user?.email || "?").slice(0, 2).toUpperCase();

  const fields: Array<{ key: keyof ProfileInput; label: string; placeholder: string }> = [
    { key: "fullName", label: "Full name", placeholder: "Alex Morgan" },
    { key: "headline", label: "Headline", placeholder: "Senior Frontend Engineer" },
    { key: "location", label: "Location", placeholder: "Berlin, Germany" },
    { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/username" },
    { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
    { key: "websiteUrl", label: "Website", placeholder: "https://yoursite.com" },
  ];

  return (
    <>
      <PageHeader
        title="Profile"
        description="These details appear on the resumes you generate."
        actions={
          !isLoading && !editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
              Edit profile
            </Button>
          ) : null
        }
      />

      <div className="max-w-2xl rounded-xl border border-border bg-card p-6 shadow-soft">
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-6" noValidate>
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{form.fullName || "Add your name"}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {form.headline || user?.email}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    value={form[field.key]}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    readOnly={!editing}
                    aria-invalid={Boolean(errors[field.key])}
                  />
                  {errors[field.key] && (
                    <p className="text-sm text-destructive">{errors[field.key]}</p>
                  )}
                </div>
              ))}

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} readOnly disabled />
                <p className="text-xs text-muted-foreground">
                  Your sign-in email can't be changed here.
                </p>
              </div>
            </div>

            {editing && (
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" aria-hidden />
                  )}
                  Save changes
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                  <X className="size-4" aria-hidden />
                  Cancel
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
    </>
  );
}
