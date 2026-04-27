import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { firstPasswordChange } from "../api";
import LoadingOverlay from "../components/LoadingOverlay";
import PasswordInput from "../components/PasswordInput";
import { getDefaultHomePath, setToken } from "../lib/auth";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { access_token?: string; error?: string };
      if (!res.ok) {
        if ((data as { requires_password_change?: boolean }).requires_password_change) {
          setMustChangePassword(true);
          setErr("Debes cambiar la contraseña temporal para continuar.");
          return;
        }
        setErr(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      if (!data.access_token) {
        setErr("Respuesta inválida del servidor");
        return;
      }
      setToken(data.access_token);
      nav(getDefaultHomePath(), { replace: true });
    } catch {
      setErr("Error de red. ¿Está flowpay-sso en :9090 y el proxy /auth activo?");
    } finally {
      setLoading(false);
    }
  }

  async function onFirstChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const policyError = getPasswordPolicyError(newPassword);
    if (policyError) {
      setErr(policyError);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErr("La confirmación de contraseña no coincide.");
      return;
    }
    setLoading(true);
    try {
      await firstPasswordChange({ email, password, new_password: newPassword });
      setMustChangePassword(false);
      setPassword(newPassword);
      setNewPassword("");
      setConfirmNewPassword("");
      setErr("Contraseña actualizada. Inicia sesión nuevamente.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No se pudo actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-surface px-4 py-8 sm:px-6 sm:py-12">
      {loading && <LoadingOverlay message="Procesando acceso..." />}
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Iniciar sesión</h1>
        <form className="mt-8 space-y-4" onSubmit={mustChangePassword ? onFirstChangePassword : onSubmit}>
        <label className="block text-sm font-medium text-ink">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <PasswordInput
          label={mustChangePassword ? "Contraseña temporal" : "Contraseña"}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        {mustChangePassword && (
          <>
            <PasswordInput
              label="Nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="-mt-2 text-xs text-ink-muted">{PASSWORD_POLICY_HINT}</p>
            <PasswordInput
              label="Confirmar nueva contraseña"
              value={confirmNewPassword}
              onChange={setConfirmNewPassword}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </>
        )}
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60"
        >
          {loading ? "Procesando…" : mustChangePassword ? "Actualizar contraseña" : "Entrar"}
        </button>
      </form>
        <p className="mt-6 text-center text-sm text-ink-muted">
          ¿Primera vez?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Crear cuenta y empresa
          </Link>
        </p>
      </div>
    </div>
  );
}
