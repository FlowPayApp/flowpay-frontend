import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import AuthLoadingOverlay from "../components/AuthLoadingOverlay";
import PasswordInput from "../components/PasswordInput";
import { getDefaultHomePath, setToken } from "../lib/auth";
import { prefetchHome } from "../lib/homePrefetch";
import { useMinLoading, waitMinLoading } from "../lib/useMinLoading";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loadingRaw, setLoading] = useState(false);
  const loading = useMinLoading(loadingRaw);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const policyError = getPasswordPolicyError(password);
    if (policyError) {
      setErr(policyError);
      return;
    }
    if (password !== confirmPassword) {
      setErr("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const startedAt = Date.now();
    try {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          company_name: companyName,
        }),
      });
      const data = (await res.json()) as { access_token?: string; error?: string };
      if (!res.ok) {
        setErr(data.error ?? "No se pudo registrar");
        return;
      }
      if (!data.access_token) {
        setErr("Respuesta inválida");
        return;
      }
      setToken(data.access_token);
      const home = getDefaultHomePath();
      await prefetchHome(home);
      await waitMinLoading(startedAt);
      nav(home, { replace: true });
    } catch {
      setErr("Error de red. ¿Está flowpay-sso en marcha?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crear cuenta"
      lede={`Registras tu empresa y tu usuario admin. ${PASSWORD_POLICY_HINT}`}
      footer={
        <p className="text-center sm:text-left">
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Ya tengo cuenta
          </Link>
        </p>
      }
    >
      {loading && <AuthLoadingOverlay message="Creando tu cuenta…" />}
        <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-ink">
          Nombre del negocio
          <input
            required
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Tu nombre
          <input
            required
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <PasswordInput
          label="Contraseña"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PasswordInput
          label="Confirmar contraseña"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          minLength={8}
          autoComplete="new-password"
        />
        {err && <p className="text-sm text-danger">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Creando…" : "Registrarme"}
        </button>
      </form>
    </AuthShell>
  );
}
