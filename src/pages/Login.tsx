import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { firstPasswordChange } from "../api";
import AuthShell from "../components/AuthShell";
import AuthLoadingOverlay from "../components/AuthLoadingOverlay";
import PasswordInput from "../components/PasswordInput";
import Toast, { type ToastNotice } from "../components/Toast";
import { getDefaultHomePath, setToken } from "../lib/auth";
import { prefetchHome } from "../lib/homePrefetch";
import { useMinLoading, waitMinLoading } from "../lib/useMinLoading";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [loadingRaw, setLoading] = useState(false);
  const loading = useMinLoading(loadingRaw);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const startedAt = Date.now();
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
      const home = getDefaultHomePath();
      await prefetchHome(home);
      await waitMinLoading(startedAt);
      nav(home, { replace: true });
    } catch {
      setErr("Error de red. No pudimos conectar. Intenta de nuevo.");
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
      setErr(null);
      setToast({ text: "Contraseña actualizada. Inicia sesión nuevamente.", tone: "success" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No se pudo actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Iniciar sesión"
      footer={
        <p className="text-center sm:text-left">
          ¿Primera vez?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Crear cuenta y empresa
          </Link>
        </p>
      }
    >
      {toast && (
        <Toast key={`${toast.tone}:${toast.text}`} notice={toast} onClose={() => setToast(null)} />
      )}
      {loading && (
        <AuthLoadingOverlay message={mustChangePassword ? "Actualizando tu contraseña…" : "Entrando a tu cuenta…"} />
      )}
        <form className="space-y-4" onSubmit={mustChangePassword ? onFirstChangePassword : onSubmit}>
        <label className="block text-sm font-medium text-ink">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-base sm:text-sm"
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
        {err && <p className="text-sm text-danger">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Procesando…" : mustChangePassword ? "Actualizar contraseña" : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
