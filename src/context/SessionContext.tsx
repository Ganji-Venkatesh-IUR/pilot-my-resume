import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface SessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<SessionState | null>(null);

/**
 * Global auth state. Mounted once in the root route so every page reads the
 * same session object instead of opening its own Supabase listener.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register the listener before the initial read to avoid missing events.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<SessionState>(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSessionContext must be used inside <SessionProvider>.");
  return context;
}
