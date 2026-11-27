import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { SessionUserDto } from "@property-platform/contracts";
import { apiClient } from "../lib/api-client";

interface AuthContextValue {
  user: SessionUserDto | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUserDto | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const data = await apiClient<{ data: SessionUserDto }>(
        "/api/v1/auth/me",
        { schema: SessionUserDto },
      );
      setUser(data.data);
    } catch {
      // Leave the current user unchanged; a failed profile fetch must not
      // clear a user that just authenticated.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  async function login(email: string, password: string) {
    const result = await apiClient<{
      data: { id: string; email: string; role: SessionUserDto["role"] };
    }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Set a minimal user immediately so the auth gate opens and navigation
    // proceeds without waiting on the profile round-trip.
    setUser({
      id: result.data.id,
      email: result.data.email,
      role: result.data.role,
      propertyMemberships: [],
      tenantLink: null,
    });
    await fetchMe();
  }

  async function logout() {
    await apiClient("/api/v1/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}