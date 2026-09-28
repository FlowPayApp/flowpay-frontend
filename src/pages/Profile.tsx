import { FormEvent, useEffect, useState } from "react";
import { useMinLoading } from "../lib/useMinLoading";
import { Loader2, Moon, Sun } from "lucide-react";
import { getMyProfile, updateMyProfile } from "../api";
import PageLoading from "../components/PageLoading";
import PasswordInput from "../components/PasswordInput";
import { useToast } from "../components/Toast";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";
import { useTheme, type ThemeMode } from "../theme";

const THEME_OPTIONS: { value: ThemeMode; label: string; hint: string }[] = [
  { value: "light", label: "Claro", hint: "Fondo claro para el día." },
  { value: "dark", label: "Oscuro", hint: "Fondo oscuro para la noche." },
];

export default function Profile() {
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [loadingRaw, setLoading] = useState(true);
  const loading = useMinLoading(loadingRaw);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        setForm({ name: profile.name, email: profile.email, password: "", confirmPassword: "" });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "No se pudo cargar el perfil.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const password = form.password.trim();
    const confirmPassword = form.confirmPassword.trim();
    if (password || confirmPassword) {
      const policyError = getPasswordPolicyError(password);
      if (policyError) {
        toast.error(policyError);
        return;
      }
      if (password !== confirmPassword) {
        toast.error("La confirmación de contraseña no coincide.");
        return;
      }
    }
    setSaving(true);
    try {
      await updateMyProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        password: password || undefined,
      });
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      toast.success("Perfil actualizado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Perfil</h1>
        <p className="mt-1 text-sm text-ink-muted">Tus datos de acceso y cómo se ve la aplicación.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>
      )}
      <section className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Apariencia</h2>
        <p className="mt-1 text-sm text-ink-muted">El modo se guarda en este dispositivo.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Modo de color">
          {THEME_OPTIONS.map((option) => {
            const selected = theme === option.value;
            const Icon = option.value === "dark" ? Moon : Sun;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(option.value)}
                className={[
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left",
                  selected
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-surface-border text-ink hover:bg-surface",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                <span>
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className={selected ? "block text-xs text-brand" : "block text-xs text-ink-muted"}>
                    {option.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Datos de acceso</h2>
        <p className="mt-1 text-sm text-ink-muted">Nombre, correo y, si quieres, una contraseña nueva.</p>
        <form className="mt-5 space-y-4" onSubmit={(e) => void onSave(e)}>
          <label className="block text-sm font-medium text-ink">
            Nombre
            <input
              required
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Correo
            <input
              required
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
            />
          </label>
          <PasswordInput
            label="Nueva contraseña (opcional)"
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordInput
            label="Confirmar nueva contraseña"
            value={form.confirmPassword}
            onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
            autoComplete="new-password"
            minLength={8}
          />
          <p className="-mt-1 text-xs text-ink-muted">{PASSWORD_POLICY_HINT}</p>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
