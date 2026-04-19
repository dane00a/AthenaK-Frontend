import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/api";

export function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.authLogin(password);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-lg border border-muted p-6">
      <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-foreground/60">
            Password
          </span>
          <input
            autoFocus
            type="password"
            className="w-full rounded-md border border-muted bg-muted/40 px-3 py-1.5 text-sm outline-none focus:border-accent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={!password || loading}
          className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
