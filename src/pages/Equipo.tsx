import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createCompanyUser, listCompanyUsers } from "../api";
import type { CompanyUserDTO } from "../api";
import AppModal from "../components/AppModal";
import LoadingIndicator from "../components/LoadingIndicator";
import PasswordInput from "../components/PasswordInput";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "../lib/passwordPolicy";
import { roleLabel } from "../lib/roles";

export default function Equipo() {
  const [rows, setRows] = useState<CompanyUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member" as "admin" | "member",
  });

  const load = () =>
    listCompanyUsers()
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar el equipo"))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  const members = useMemo(() => rows.filter((u) => u.role === "member").length, [rows]);

  function closeModal() {
    setOpen(false);
    setForm({ name: "", email: "", password: "", role: "member" });
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const policyError = getPasswordPolicyError(form.password);
    if (policyError) {
      setError(policyError);
      return;
    }
    try {
      await createCompanyUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      closeModal();
      setLoading(true);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {error && !open && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 whitespace-pre-wrap">{error}</div>
      )}
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
        <div className="border-b border-surface-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-ink">Equipo de la empresa</h2>
              <p className="mt-1 text-sm text-ink-muted">
                El admin ve toda la cartera. El vendedor (member) solo opera sobre los clientes que creó o que le asignaste.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Crear usuario
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            {rows.length} usuario{rows.length === 1 ? "" : "s"} · {members} vendedor{members === 1 ? "" : "es"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed text-xs sm:text-sm">
            <thead className="bg-surface/80 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-muted sm:text-xs">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-card">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10">
                    <div className="flex justify-center">
                      <LoadingIndicator />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                    Todavía no hay usuarios de empresa. Crea un vendedor para asignarle cartera.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.user_id} className="hover:bg-surface/40">
                    <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                    <td className="truncate px-4 py-3 text-ink-muted">{u.email}</td>
                    <td className="px-4 py-3 text-ink">{roleLabel(u.role)}</td>
                    <td className="px-4 py-3">
                      {u.is_active === false ? (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          Inactivo
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          Activo
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <AppModal onBackdropClick={closeModal}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Nuevo usuario</h2>
            <p className="mt-1 text-sm text-ink-muted">
              El rol vendedor corresponde a <span className="font-medium text-ink">member</span> en el sistema.
            </p>
            <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-ink">
                Nombre <span className="text-rose-600">*</span>
                <input
                  required
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Email <span className="text-rose-600">*</span>
                <input
                  required
                  type="email"
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <PasswordInput
                label="Contraseña"
                required
                value={form.password}
                onChange={(password) => setForm((f) => ({ ...f, password }))}
                autoComplete="new-password"
              />
              <p className="text-xs text-ink-muted">{PASSWORD_POLICY_HINT}</p>
              <label className="block text-sm font-medium text-ink">
                Rol
                <select
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm text-ink"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "admin" | "member" }))}
                >
                  <option value="member">Vendedor (member)</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}
    </div>
  );
}
