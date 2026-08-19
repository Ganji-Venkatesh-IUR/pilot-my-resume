import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { profileService } from "@/services/profile.service";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CareerPilot AI" },
      { name: "description", content: "Manage the name shown on your generated resumes." },
      { property: "og:title", content: "Profile — CareerPilot AI" },
      { property: "og:description", content: "Your CareerPilot AI account details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      return profileService.getCurrent();
    },
  });

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await profileService.updateName(user.id, fullName);
    } catch {
      setSaving(false);
      toast.error("Could not save your profile.");
      return;
    }
    setSaving(false);
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  const initials = (fullName || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader title="Profile" description="This name appears on resumes you generate." />

      <div className="max-w-xl rounded-xl border border-border bg-card p-6 shadow-soft">
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{fullName || "Add your name"}</p>
                <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} readOnly disabled />
              <p className="text-xs text-muted-foreground">
                Your sign-in email can't be changed here.
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Save changes
            </Button>
          </form>
        )}
      </div>
    </>
  );
}
