import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { listCompanyUsers, updateCompanyUser, type CompanyUserDTO } from "../api";
import AppSelect from "../components/AppSelect";
import PageLoading from "../components/PageLoading";
import ToggleSwitch from "../components/ToggleSwitch";
import { getSessionClaims } from "../lib/auth";
import { roleLabel } from "../lib/roles";

type Role = "admin" | "member";

const ROLE_OPTIONS = [
  { value: "member", label: "Vendedor" },
  { value: "admin", label: "Admin" },
];

function asRole(role: string): Role {
  return role === "admin" ? "admin" : "member";
}

export default function EquipoDetail() {
  const { userId } = useParams();
  const memberId = Number(userId);
  const selfId = getSessionClaims()?.uid ?? 0;
  const [member, setMember] = useState<CompanyUserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "member" as Role, is_active: true });

  useEffect(() => {
    if (!Number.isFinite(memberId) || memberId <= 0) {
      setLoading(false);
      setLoadError("Enlace de usuario no válido.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    listCompanyUsers()
      .then((users) => {
        const found = users.find((user) => user.user_id === memberId) ?? null;
        setMember(found);
        if (!found) setLoadError("No se encontró a esta persona en el equipo.");
      })
      .catch(() => {
        setMember(null);
        setLoadError("No se pudo cargar el usuario. ¿Existe y tienes permisos?");
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    if (!member) return;
    setForm({
      name: member.name,
      email: member.email,
      role: asRole(member.role),
      is_active: member.is_active,
    });
  }, [member?.user_id]);

  const isSelf = member?.user_id === selfId;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      is_active: form.is_active,
    };
    try {
      await updateCompanyUser(member.user_id, payload);
      setMember({ ...member, ...payload });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  if (loadError || !member) {
    return (
      <div className="max-w-lg rounded-2xl border border-danger/30 bg-surface-card p-6 text-danger shadow-soft">
        <p>{loadError ?? "Sin datos."}</p>
        <Link to="/equipo" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          Volver al equipo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>
      )}

      <Link to="/equipo" className="inline-flex text-sm font-medium text-brand hover:underline">
        ← Volver al equipo
      </Link>

      <section className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card to-surface p-5 shadow-soft sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Equipo</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{member.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{member.email}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-surface-border bg-surface-card px-2.5 py-1 text-xs font-semibold text-ink">
            {roleLabel(member.role)}
          </span>
          <span className="rounded-full border border-surface-border bg-surface-card px-2.5 py-1 text-xs font-semibold text-ink-muted">
            {member.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Editar datos</h2>
        <p className="mt-1 text-sm text-ink-muted">Nombre, email, rol y si puede entrar al sistema.</p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void onSave(e)}>
          <label className="block text-sm font-medium text-ink">
            Nombre <span className="text-danger">*</span>
            <input
              required
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Email <span className="text-danger">*</span>
            <input
              required
              type="email"
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Rol
            <AppSelect
              value={form.role}
              disabled={isSelf}
              onChange={(role) => setForm((current) => ({ ...current, role: role as Role }))}
              options={ROLE_OPTIONS}
            />
          </label>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border px-3 py-2.5 sm:mt-6">
            <div>
              <p className="text-sm font-medium text-ink">Activo</p>
              <p className="text-xs text-ink-muted">Si está inactivo, no puede iniciar sesión.</p>
            </div>
            <ToggleSwitch
              checked={form.is_active}
              disabled={isSelf}
              aria-label="Estado del usuario"
              onCheckedChange={(is_active) => setForm((current) => ({ ...current, is_active }))}
            />
          </div>
          {isSelf && (
            <p className="text-xs text-ink-muted sm:col-span-2">
              Tu rol y tu estado se mantienen. Puedes cambiar nombre y email.
            </p>
          )}
          <div className="flex justify-end sm:col-span-2">
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
