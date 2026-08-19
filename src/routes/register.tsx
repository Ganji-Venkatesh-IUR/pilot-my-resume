import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — CareerPilot AI" },
      {
        name: "description",
        content: "Create a free CareerPilot AI account and generate an ATS-friendly resume today.",
      },
      { property: "og:title", content: "Create your account — CareerPilot AI" },
      { property: "og:description", content: "Start building AI resumes in minutes." },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
