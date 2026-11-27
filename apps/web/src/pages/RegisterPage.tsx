import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth";
import { apiClient } from "../lib/api-client";
import { Card } from "../components/ui/Card";

type RegisterRole = "LANDLORD" | "MANAGER" | "TENANT";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterRole>("TENANT");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiClient("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof Error && "status" in err) {
        const apiError = err as {
          status: number;
          details?: { error?: { message?: string } };
        };
        if (apiError.status === 409) {
          setError("An account with that email already exists");
        } else if (apiError.status === 400) {
          setError(
            apiError.details?.error?.message ??
              "Password must be at least 12 characters",
          );
        } else {
          setError(apiError.details?.error?.message ?? "Registration failed");
        }
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">Create account</h1>

        {error ? (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="font-medium">Email</span>
            <div className="mt-1 relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-3"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block text-sm">
            <span className="font-medium">Password</span>
            <div className="mt-1 relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-10"
                placeholder="At least 12 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </label>

          <label className="block text-sm">
            <span className="font-medium">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RegisterRole)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="TENANT">Tenant</option>
              <option value="LANDLORD">Landlord</option>
              <option value="MANAGER">Property manager</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}