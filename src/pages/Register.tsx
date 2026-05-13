import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";
import { getDefaultHomePath, setToken } from "../lib/auth";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      nav(getDefaultHomePath(), { replace: true });
    } catch {
      setErr("Error de red. ¿Está flowpay-sso en marcha?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-surface px-4 py-8 sm:px-6 sm:py-12">
      <div className="fixed right-4 top-4 z-[160] sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>
      {loading && <LoadingOverlay message="Creando cuenta..." />}
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-soft sm:p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Crear cuenta</h1>
        <p className="mt-3 text-center text-sm text-ink-muted">
          Registras tu empresa en FlowPay y tu usuario admin. {PASSWORD_POLICY_HINT}
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
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
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60"
        >
          {loading ? "Creando…" : "Registrarme"}
        </button>
      </form>
        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link to="/login" className="font-medium text-brand hover:underline">
            Ya tengo cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
