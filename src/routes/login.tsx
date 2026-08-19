import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CareerPilot AI" },
      {
        name: "description",
        content: "Sign in to CareerPilot AI to build and export ATS-friendly resumes with AI.",
      },
      { property: "og:title", content: "Sign in — CareerPilot AI" },
      { property: "og:description", content: "Access your AI resume workspace." },
    ],
  }),
  component: () => <AuthForm mode="signin" />,
});
