import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path kept alive: /auth now lives at /login. */
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
  component: () => null,
});
