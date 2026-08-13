import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import { api, setUnauthorizedHandler } from "./api";

type Status = "checking" | "authed" | "anon";

interface AuthCtx {
  status: Status;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let alive = true;
    // Any 401 from a data endpoint (expired session) bounces back to login.
    setUnauthorizedHandler(() => setStatus("anon"));
    api.authSession()
      .then((r) => { if (alive) setStatus(r.authenticated ? "authed" : "anon"); })
      .catch(() => { if (alive) setStatus("anon"); });
    return () => {
      alive = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = async (code: string) => {
    await api.login(code); // throws on wrong code
    setStatus("authed");
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setStatus("anon");
    }
  };

  return <Ctx.Provider value={{ status, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
