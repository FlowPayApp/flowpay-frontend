import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link, useNavigate } from "react-router-dom";
import { confirmPasswordReset, firstPasswordChange, requestPasswordReset } from "../api";
import AuthShell from "../components/AuthShell";
import AuthLoadingOverlay from "../components/AuthLoadingOverlay";
import PasswordInput from "../components/PasswordInput";
import { useToast } from "../components/Toast";
import { getDefaultHomePath, setToken } from "../lib/auth";
import { prefetchHome } from "../lib/homePrefetch";
import { useMinLoading, waitMinLoading } from "../lib/useMinLoading";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"login" | "forgot" | "reset">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [qr, setQr] = useState("");
  const toast = useToast();
  const [loadingRaw, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const loading = useMinLoading(loadingRaw);

  useEffect(() => {
    if (!mfaSetup?.otpauth) {
      setQr("");
      return;
    }
    let cancel = false;
    void QRCode.toDataURL(mfaSetup.otpauth, { margin: 1, width: 220, errorCorrectionLevel: "M" }).then((url) => {
      if (!cancel) setQr(url);
    });
    return () => {
      cancel = true;
    };
  }, [mfaSetup]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const startedAt = Date.now();
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        access_token?: string;
        error?: string;
        mfa_required?: boolean;
        mfa_setup?: boolean;
        mfa_token?: string;
        secret?: string;
        otpauth_url?: string;
      };
      if (!res.ok) {
        if ((data as { requires_password_change?: boolean }).requires_password_change) {
          setMustChangePassword(true);
          toast.show({ text: "Debes cambiar la contraseña temporal para continuar.", tone: "info" });
          return;
        }
        toast.error(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      if ((data.mfa_required || data.mfa_setup) && data.mfa_token) {
        setMfaToken(data.mfa_token);
        setMfaCode("");
        setMfaSetup(data.mfa_setup && data.secret ? { secret: data.secret, otpauth: data.otpauth_url ?? "" } : null);
        return;
      }
      if (!data.access_token) {
        toast.error("Respuesta inválida del servidor");
        return;
      }
      await finishLogin(data.access_token, startedAt);
    } catch {
      toast.error("Error de red. No pudimos conectar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function finishLogin(accessToken: string, startedAt: number) {
    setToken(accessToken);
    const home = getDefaultHomePath();
    await prefetchHome(home);
    await waitMinLoading(startedAt);
    nav(home, { replace: true });
  }

  async function onMfa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const startedAt = Date.now();
    try {
      const res = await fetch("/auth/login/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfa_token: mfaToken, code: mfaCode }),
      });
      const data = (await res.json()) as { access_token?: string; error?: string };
      if (!res.ok || !data.access_token) {
        toast.error(data.error ?? "Código inválido");
        return;
      }
      await finishLogin(data.access_token, startedAt);
    } catch {
      toast.error("Error de red. No pudimos conectar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function openRecovery() {
    setResetEmail(email.trim());
    setResetCode("");
    setResetPassword("");
    setConfirmResetPassword("");
    setView("forgot");
  }

  function backToLogin() {
    setView("login");
    setResetCode("");
    setResetPassword("");
    setConfirmResetPassword("");
  }

  async function sendResetCode() {
    setSendingCode(true);
    setLoading(true);
    try {
      const message = await requestPasswordReset(resetEmail.trim());
      setResetCode("");
      setView("reset");
      toast.show({ text: message, tone: "info" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el código");
    } finally {
      setLoading(false);
      setSendingCode(false);
    }
  }

  function onRequestReset(e: React.FormEvent) {
    e.preventDefault();
    void sendResetCode();
  }

  async function onConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    const policyError = getPasswordPolicyError(resetPassword);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    if (resetPassword !== confirmResetPassword) {
      toast.error("La confirmación de contraseña no coincide.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset({
        email: resetEmail.trim(),
        code: resetCode,
        new_password: resetPassword,
      });
      setEmail(resetEmail.trim());
      setPassword("");
      backToLogin();
      toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  }

  async function onFirstChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const policyError = getPasswordPolicyError(newPassword);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("La confirmación de contraseña no coincide.");
      return;
    }
    setLoading(true);
    try {
      await firstPasswordChange({ email, password, new_password: newPassword });
      setMustChangePassword(false);
      setPassword(newPassword);
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Contraseña actualizada. Inicia sesión nuevamente.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={view === "login" ? "Iniciar sesión" : view === "forgot" ? "Recuperar contraseña" : "Restablecer contraseña"}
      lede={
        view === "forgot"
          ? "Escribe el correo de tu cuenta. Si está registrado, te enviamos un código."
          : view === "reset"
            ? "Si el correo está registrado, el código ya va en camino. Vence en 15 minutos y permite 5 intentos."
            : undefined
      }
      footer={
        <p className="text-center sm:text-left">
          ¿Primera vez?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Crear cuenta y empresa
          </Link>
        </p>
      }
    >
      {loading && (
        <AuthLoadingOverlay
          message={
            view === "forgot" || sendingCode
              ? "Enviando el código…"
              : view === "reset"
                ? "Actualizando tu contraseña…"
                : mustChangePassword
                  ? "Actualizando tu contraseña…"
                  : mfaToken
                    ? "Comprobando el código…"
                    : "Entrando a tu cuenta…"
          }
        />
      )}
      {view === "forgot" ? (
        <form className="space-y-4" onSubmit={onRequestReset}>
          <label className="block text-sm font-medium text-ink">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-base sm:text-sm"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Procesando…" : "Enviar código"}
          </button>
          <button type="button" className="w-full text-sm font-semibold text-brand hover:underline" onClick={backToLogin}>
            Volver a iniciar sesión
          </button>
        </form>
      ) : view === "reset" ? (
        <form className="space-y-4" onSubmit={onConfirmReset}>
          <p className="break-all text-sm text-ink-muted">{resetEmail.trim()}</p>
          <label className="block text-sm font-medium text-ink">
            Código
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-base tracking-widest sm:text-sm"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
          <PasswordInput
            label="Nueva contraseña"
            value={resetPassword}
            onChange={setResetPassword}
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="-mt-2 text-xs text-ink-muted">{PASSWORD_POLICY_HINT}</p>
          <PasswordInput
            label="Confirmar nueva contraseña"
            value={confirmResetPassword}
            onChange={setConfirmResetPassword}
            autoComplete="new-password"
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={loading || resetCode.length !== 6}
            className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Procesando…" : "Restablecer contraseña"}
          </button>
          <div className="flex items-center justify-between gap-3 text-sm">
            <button type="button" className="font-semibold text-brand hover:underline" onClick={backToLogin}>
              Volver
            </button>
            <button
              type="button"
              className="font-semibold text-brand hover:underline disabled:opacity-60"
              disabled={loading}
              onClick={() => void sendResetCode()}
            >
              Reenviar código
            </button>
          </div>
        </form>
      ) : mfaToken ? (
        <form className="space-y-4" onSubmit={onMfa}>
          {mfaSetup ? (
            <div className="space-y-3 text-sm text-ink-muted">
              <p>Escanea este código con tu app de authenticator. Se muestra una sola vez.</p>
              {qr && (
                <img
                  src={qr}
                  alt="Código QR para agregar GeldFlus"
                  className="mx-auto h-52 w-52 rounded-xl bg-white p-2"
                />
              )}
              <div className="space-y-2">
                <p className="text-xs">Si no puedes escanearlo, escribe esta clave.</p>
                <p className="break-all rounded-xl border border-surface-border bg-surface px-3 py-2.5 font-mono text-sm font-medium leading-5 text-ink">
                  {mfaSetup.secret}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Ingresa el código de 6 dígitos de tu app.</p>
          )}
          <label className="block text-sm font-medium text-ink">
            Código
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-base tracking-widest sm:text-sm"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
          <button
            type="submit"
            disabled={loading || mfaCode.length !== 6}
            className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Procesando…" : "Confirmar código"}
          </button>
        </form>
      ) : (
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
        {!mustChangePassword && (
          <div className="flex justify-end">
            <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={openRecovery}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Procesando…" : mustChangePassword ? "Actualizar contraseña" : "Entrar"}
        </button>
      </form>
      )}
    </AuthShell>
  );
}
