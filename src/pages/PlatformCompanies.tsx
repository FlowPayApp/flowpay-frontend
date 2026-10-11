import axios from "axios";
import { Building2, Check, Filter, Mail, MessageCircle, Pencil, Plus, Trash2, UserCog, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  assignCompanyMailbox,
  assignCompanyWhatsApp,
  createCompany,
  deleteCompany,
  listCompanies,
  listSignupPlans,
  listPlatformMailboxes,
  listPlatformWhatsAppNumbers,
  updateCompany,
  type CompanyDTO,
  type CompanyMailbox,
  type SignupPlan,
} from "../api";
import AppModal from "../components/AppModal";
import AppSelect from "../components/AppSelect";
import FilterTray from "../components/FilterTray";
import IconActionButton from "../components/IconActionButton";
import PageLoading from "../components/PageLoading";
import RowMenu from "../components/RowMenu";
import ToggleSwitch from "../components/ToggleSwitch";
import { useToast } from "../components/Toast";
import { formatMoney } from "../lib/format";
import { initials } from "../lib/initials";
import { useMinLoading } from "../lib/useMinLoading";

function isCompanyActive(c: CompanyDTO): boolean {
  return c.is_active !== false;
}

function displayWhatsApp(raw: string): string {
  return raw.replace(/^whatsapp:/i, "");
}

const PLAN_LABELS: Record<string, string> = {
  esencial: "Esencial",
  crecimiento: "Crecimiento",
  empresa: "Empresa",
};

function formatPercent(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n);
}

function apiErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | string | undefined;
    if (data && typeof data === "object" && typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
    if (typeof data === "string" && data.trim()) return data;
  }
  if (e instanceof Error && e.message.trim()) return e.message;
  return fallback;
}

export default function PlatformCompanies() {
  const [rows, setRows] = useState<CompanyDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [loadingRaw, setLoadingRaw] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState<{ company: string; email: string; temporary_password: string } | null>(null);
  const [openFilters, setOpenFilters] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [plans, setPlans] = useState<SignupPlan[]>([]);
  const [commercial, setCommercial] = useState<{
    company: CompanyDTO;
    plan: string;
    customPrice: boolean;
    price: string;
    customCommission: boolean;
    commission: string;
  } | null>(null);
  const [savingCommercial, setSavingCommercial] = useState(false);
  const [waByCompany, setWaByCompany] = useState<Record<number, string>>({});
  const [waEdit, setWaEdit] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [mailByCompany, setMailByCompany] = useState<Record<number, CompanyMailbox>>({});
  const [mailEdit, setMailEdit] = useState<{
    id: number;
    name: string;
    from_name: string;
    from_email: string;
    smtp_host: string;
    smtp_port: string;
    smtp_username: string;
    smtp_password: string;
    password_set: boolean;
  } | null>(null);
  const [filters, setFilters] = useState<{ name: string; status: "all" | "active" | "inactive" }>({
    name: "",
    status: "all",
  });
  const loading = useMinLoading(loadingRaw);

  const load = async () => {
    const [data, numbers, mailboxes] = await Promise.all([
      listCompanies(),
      listPlatformWhatsAppNumbers(),
      listPlatformMailboxes(),
    ]);
    const map: Record<number, string> = {};
    for (const n of numbers) {
      if (n.phone_number) map[n.company_id] = n.phone_number;
    }
    const mailMap: Record<number, CompanyMailbox> = {};
    for (const m of mailboxes) {
      if (m.from_email) mailMap[m.company_id] = m;
    }
    setRows(Array.isArray(data) ? data : []);
    setWaByCompany(map);
    setMailByCompany(mailMap);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      load(),
      listSignupPlans()
        .then((data) => {
          if (!cancelled) setPlans(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setPlans([]);
        }),
    ])
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoadingRaw(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: React.FormEvent): Promise<boolean> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createCompany(form);
      setForm({ name: "" });
      await load();
      toast.success("Empresa creada.");
      return true;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear la empresa.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    setError(null);
    setBusy(true);
    try {
      await updateCompany(editing.id, { name: editing.name });
      setEditing(null);
      await load();
      toast.success("Empresa guardada.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la empresa.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveWhatsApp(phone: string) {
    if (!waEdit) return;
    const companyId = waEdit.id;
    setError(null);
    setBusy(true);
    try {
      const saved = await assignCompanyWhatsApp(companyId, phone.trim());
      setWaByCompany((prev) => {
        const next = { ...prev };
        if (saved.phone_number) next[companyId] = saved.phone_number;
        else delete next[companyId];
        return next;
      });
      setWaEdit(null);
      toast.success(saved.phone_number ? "WhatsApp Business asignado." : "WhatsApp Business quitado.");
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "No se pudo guardar el WhatsApp."));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveMailbox(clear: boolean) {
    if (!mailEdit) return;
    const companyId = mailEdit.id;
    setError(null);
    setBusy(true);
    try {
      const saved = await assignCompanyMailbox(
        companyId,
        clear
          ? { from_name: "", from_email: "", smtp_host: "", smtp_port: "", smtp_username: "", smtp_password: "" }
          : {
              from_name: mailEdit.from_name.trim(),
              from_email: mailEdit.from_email.trim(),
              smtp_host: mailEdit.smtp_host.trim(),
              smtp_port: mailEdit.smtp_port.trim() || "587",
              smtp_username: mailEdit.smtp_username.trim(),
              smtp_password: mailEdit.smtp_password,
            },
      );
      setMailByCompany((prev) => {
        const next = { ...prev };
        if (saved.from_email) next[companyId] = saved;
        else delete next[companyId];
        return next;
      });
      setMailEdit(null);
      toast.success(saved.from_email ? "Correo de la empresa guardado." : "Correo de la empresa quitado.");
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "No se pudo guardar el correo."));
    } finally {
      setBusy(false);
    }
  }

  async function onSetActive(id: number, active: boolean) {
    setError(null);
    setBusy(true);
    try {
      const saved = await updateCompany(id, { is_active: active });
      const company = rows.find((row) => row.id === id);
      await load();
      if (active && saved.temporary_password) {
        setIssuedPassword({
          company: company?.name ?? "la empresa",
          email: saved.email || company?.contact_email || "",
          temporary_password: saved.temporary_password,
        });
      }
      toast.success(active ? "Empresa activada." : "Empresa desactivada.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
    } finally {
      setBusy(false);
    }
  }

  function labelFor(id: string | undefined): string {
    if (!id) return "";
    return plans.find((plan) => plan.id === id)?.label || PLAN_LABELS[id] || id;
  }

  function openCommercial(company: CompanyDTO) {
    setCommercial({
      company,
      plan: company.requested_plan ?? "",
      customPrice: company.price_clp_override != null,
      price: company.price_clp_override != null ? String(company.price_clp_override) : "",
      customCommission: company.commission_percent_override != null,
      commission: company.commission_percent_override != null ? String(company.commission_percent_override).replace(".", ",") : "",
    });
  }

  async function onSaveCommercial() {
    if (!commercial) return;
    const price = Number(commercial.price.replace(/\./g, "").replace(",", "."));
    const commission = Number(commercial.commission.replace(/\./g, "").replace(",", "."));
    if (commercial.customPrice && (!Number.isFinite(price) || price < 0)) {
      toast.error("El precio mensual no es válido.");
      return;
    }
    if (commercial.customCommission && (!Number.isFinite(commission) || commission < 0 || commission > 100)) {
      toast.error("La comisión va de 0 a 100.");
      return;
    }
    setSavingCommercial(true);
    try {
      await updateCompany(commercial.company.id, {
        requested_plan: commercial.plan,
        ...(commercial.customPrice
          ? { price_clp_override: Math.round(price) }
          : { clear_price_override: true }),
        ...(commercial.customCommission
          ? { commission_percent_override: commission }
          : { clear_commission_override: true }),
      });
      setCommercial(null);
      await load();
      toast.success("Condiciones de la empresa guardadas.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar las condiciones.");
    } finally {
      setSavingCommercial(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = filters.name.trim().toLowerCase();
    return rows.filter((c) => {
      const haystack = `${c.name} ${c.contact_email ?? ""} ${c.contact_phone ?? ""} ${c.contact_name ?? ""}`.toLowerCase();
      const nameOk = q === "" || haystack.includes(q);
      const active = isCompanyActive(c);
      const statusOk =
        filters.status === "all" ||
        (filters.status === "active" && active) ||
        (filters.status === "inactive" && !active);
      return nameOk && statusOk;
    });
  }, [rows, filters]);

  const openWaEdit = (c: CompanyDTO) =>
    setWaEdit({ id: c.id, name: c.name, phone: displayWhatsApp(waByCompany[c.id] ?? "") });

  const openMailEdit = (c: CompanyDTO) => {
    const current = mailByCompany[c.id];
    setMailEdit({
      id: c.id,
      name: c.name,
      from_name: current?.from_name ?? "",
      from_email: current?.from_email ?? "",
      smtp_host: current?.smtp_host ?? "",
      smtp_port: current?.smtp_port || "587",
      smtp_username: current?.smtp_username ?? "",
      smtp_password: "",
      password_set: Boolean(current?.password_set),
    });
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((c) => isCompanyActive(c)).length;
    const inactive = total - active;
    const clients = rows.reduce((acc, c) => acc + (c.client_count ?? 0), 0);
    const admins = rows.reduce((acc, c) => acc + (c.admin_count ?? 0), 0);
    return { total, active, inactive, clients, admins };
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-6xl px-0">
      {loading && <PageLoading />}
      {error && <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniKpi icon={<Building2 className="h-4 w-4" />} label="Empresas" value={String(stats.total)} />
        <MiniKpi icon={<Check className="h-4 w-4" />} label="Activas" value={String(stats.active)} tone="success" />
        <MiniKpi icon={<X className="h-4 w-4" />} label="Inactivas" value={String(stats.inactive)} tone="danger" />
        <MiniKpi icon={<Users className="h-4 w-4" />} label="Clientes" value={String(stats.clients)} />
        <MiniKpi icon={<UserCog className="h-4 w-4" />} label="Admins" value={String(stats.admins)} />
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Empresas</h1>
        <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={openFilters}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium sm:flex-none ${
                  openFilters
                    ? "border-brand/40 bg-brand-soft text-brand"
                    : "border-surface-border bg-surface-card text-ink-muted hover:bg-surface hover:text-ink"
                }`}
                onClick={() => setOpenFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover sm:flex-none"
                onClick={() => {
                  setError(null);
                  setOpenCreateModal(true);
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Crear
              </button>
        </div>
      </div>
      <section className="rounded-2xl border border-surface-border bg-surface-card shadow-soft">
          <FilterTray open={openFilters}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-ink-muted">
                Empresa
                <input
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  placeholder="Buscar por nombre o correo..."
                  value={filters.name}
                  onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="text-sm text-ink-muted">
                Estado
                <AppSelect
                  value={filters.status}
                  onChange={(status) =>
                    setFilters((f) => ({
                      ...f,
                      status: status as "all" | "active" | "inactive",
                    }))
                  }
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Activas" },
                    { value: "inactive", label: "Inactivas" },
                  ]}
                />
              </label>
            </div>
          </FilterTray>
        <ul className="divide-y divide-surface-border lg:hidden">
          {filteredRows.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-ink-muted">No hay empresas para los filtros aplicados.</li>
          ) : (
            filteredRows.map((c) => {
              const active = isCompanyActive(c);
              const status = c.is_active === false ? (c.requested_plan && !c.approved ? "Pendiente" : "Inactiva") : "Activa";
              const plan = [labelFor(c.requested_plan), c.price_clp_override != null || c.commission_percent_override != null ? "a medida" : ""]
                .filter(Boolean)
                .join(" · ");
              const wa = waByCompany[c.id];
              const mail = mailByCompany[c.id]?.from_email;
              return (
                <li key={c.id} className={`py-3.5 pl-4 pr-2 ${active ? "" : "opacity-80"}`}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                      {initials(c.name)}
                    </span>
                    {editing?.id === c.id ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          className="h-9 w-full min-w-0 rounded-lg border border-surface-border px-2.5 text-sm"
                          value={editing.name}
                          onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                          autoFocus
                        />
                        <IconActionButton icon={Check} label="Guardar nombre" variant="accent" disabled={busy} onClick={() => void onSaveEdit()} />
                        <IconActionButton icon={X} label="Cancelar edición" disabled={busy} onClick={() => setEditing(null)} />
                      </div>
                    ) : (
                      <>
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openCommercial(c)}>
                          <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
                          <p className="mt-0.5 truncate text-xs text-ink-muted">
                            {c.contact_email || c.contact_name || "Sin correo de contacto"}
                          </p>
                          <p className={`mt-0.5 truncate text-xs font-medium ${active ? "text-brand" : "text-ink-muted"}`}>
                            {status}
                            {plan ? <span className="font-normal text-ink-muted"> · {plan}</span> : null}
                          </p>
                        </button>
                        <ToggleSwitch
                          checked={active}
                          onCheckedChange={(next) => {
                            if (next !== active) void onSetActive(c.id, next);
                          }}
                          disabled={busy}
                          aria-label={active ? "Empresa activa" : "Empresa inactiva"}
                        />
                        <RowMenu
                          label={`Acciones de ${c.name}`}
                          items={[
                            { label: "Condiciones", icon: Building2, onSelect: () => openCommercial(c) },
                            { label: "WhatsApp", icon: MessageCircle, onSelect: () => openWaEdit(c) },
                            { label: "Correo de envío", icon: Mail, onSelect: () => openMailEdit(c) },
                            { label: "Editar nombre", icon: Pencil, onSelect: () => setEditing({ id: c.id, name: c.name }) },
                            { label: "Borrar", icon: Trash2, danger: true, onSelect: () => setDeleteTarget(c) },
                          ]}
                        />
                      </>
                    )}
                  </div>
                  <div className="ml-[3.25rem] mt-2 flex flex-wrap gap-x-3 gap-y-1 pr-2 text-xs text-ink-muted">
                    <span>
                      <span className="font-medium tabular-nums text-ink">{c.client_count ?? 0}</span> clientes
                    </span>
                    <span>
                      <span className="font-medium tabular-nums text-ink">{c.admin_count ?? 0}</span> admins
                    </span>
                    <button type="button" className="inline-flex items-center gap-1 text-brand" onClick={() => openWaEdit(c)}>
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                      {wa ? displayWhatsApp(wa) : "Asignar WhatsApp"}
                    </button>
                    <button type="button" className="inline-flex min-w-0 max-w-full items-center gap-1 text-brand" onClick={() => openMailEdit(c)}>
                      <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                      <span className="truncate">{mail || "Asignar correo"}</span>
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <div className="hidden min-w-0 overflow-x-auto lg:block">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-xs sm:text-sm">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[18%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[18%]" />
              <col className="w-[20%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead className="bg-surface/70 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 sm:px-6">ID</th>
                <th className="px-3 py-3 sm:px-5">Nombre</th>
                <th className="px-3 py-3 text-center sm:px-5">Clientes</th>
                <th className="px-3 py-3 text-center sm:px-5">Admins</th>
                <th className="px-3 py-3 text-center sm:px-5">WhatsApp</th>
                <th className="px-3 py-3 text-center sm:px-5">Correo de envío</th>
                <th className="px-4 py-3 text-center sm:px-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink-muted">
                    No hay empresas para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((c) => (
                  <tr key={c.id} className="hover:bg-surface/40">
                    <td className="px-4 py-3 tabular-nums sm:px-6">{c.id}</td>
                    <td className="max-w-0 px-3 py-3 sm:px-5">
                      {editing?.id === c.id ? (
                        <input
                          className="w-full min-w-0 rounded-lg border border-surface-border px-2 py-1.5 text-sm"
                          value={editing.name}
                          onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                          autoFocus
                        />
                      ) : (
                        <button type="button" className="block w-full text-left" onClick={() => openCommercial(c)}>
                          <span className="line-clamp-2 break-words font-medium text-ink">{c.name}</span>
                          {c.contact_name ? <span className="mt-0.5 block break-words text-xs text-ink-muted">{c.contact_name}</span> : null}
                          {c.contact_email ? <span className="mt-0.5 block break-all text-xs text-ink">{c.contact_email}</span> : (
                            <span className="mt-0.5 block text-xs text-ink-muted">Sin correo de contacto</span>
                          )}
                          {c.contact_phone ? <span className="mt-0.5 block text-xs text-ink-muted">{c.contact_phone}</span> : null}
                          <span className="mt-0.5 block text-xs text-ink-muted">
                            {c.is_active === false ? (c.requested_plan && !c.approved ? "Pendiente" : "Inactiva") : "Activa"}
                            {labelFor(c.requested_plan) ? ` · ${labelFor(c.requested_plan)}` : ""}
                            {c.price_clp_override != null || c.commission_percent_override != null ? " · a medida" : ""}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums sm:px-5">{c.client_count ?? 0}</td>
                    <td className="px-3 py-3 text-center tabular-nums sm:px-5">{c.admin_count ?? 0}</td>
                    <td className="px-3 py-3 text-center sm:px-5">
                      <button
                        type="button"
                        className="max-w-full truncate rounded-lg px-2 py-1 font-mono text-xs text-brand hover:bg-brand-soft"
                        onClick={() => openWaEdit(c)}
                      >
                        {waByCompany[c.id] ? displayWhatsApp(waByCompany[c.id]) : "Asignar"}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center sm:px-5">
                      <button
                        type="button"
                        className="inline-flex max-w-full items-center gap-1 truncate rounded-lg px-2 py-1 text-xs text-brand hover:bg-brand-soft"
                        onClick={() => openMailEdit(c)}
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{mailByCompany[c.id]?.from_email || "Asignar"}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center sm:px-6">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <ToggleSwitch
                          checked={isCompanyActive(c)}
                          onCheckedChange={(next) => {
                            if (next !== isCompanyActive(c)) void onSetActive(c.id, next);
                          }}
                          disabled={busy}
                          aria-label={isCompanyActive(c) ? "Empresa activa" : "Empresa inactiva"}
                        />
                        {editing?.id === c.id ? (
                          <>
                            <IconActionButton
                              icon={Check}
                              label="Guardar nombre"
                              variant="accent"
                              disabled={busy}
                              onClick={() => void onSaveEdit()}
                            />
                            <IconActionButton
                              icon={X}
                              label="Cancelar edición"
                              disabled={busy}
                              onClick={() => setEditing(null)}
                            />
                          </>
                        ) : (
                          <IconActionButton
                            icon={Pencil}
                            label="Editar nombre"
                            disabled={busy || deleting}
                            onClick={() => setEditing({ id: c.id, name: c.name })}
                          />
                        )}
                        <IconActionButton
                          icon={Trash2}
                          label="Borrar empresa"
                          variant="danger"
                          disabled={busy || deleting}
                          onClick={() => setDeleteTarget(c)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {commercial && (
        <AppModal onBackdropClick={() => !savingCommercial && setCommercial(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">{commercial.company.name}</h2>
            <p className="mt-1 text-sm text-ink-muted">Contacto de quien pidió la cuenta y condiciones comerciales.</p>
            <dl className="mt-4 space-y-2 rounded-xl bg-surface px-4 py-3 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Persona</dt>
                <dd className="text-ink">{commercial.company.contact_name || "Sin nombre"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Correo</dt>
                <dd className="break-all text-ink">{commercial.company.contact_email || "Sin correo"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Teléfono</dt>
                <dd className="text-ink">{commercial.company.contact_phone || "Sin teléfono"}</dd>
              </div>
            </dl>
            <label className="mt-4 block text-sm text-ink-muted">
              Plan
              <AppSelect
                value={commercial.plan}
                onChange={(plan) => setCommercial((current) => (current ? { ...current, plan } : current))}
                options={[
                  { value: "", label: "Sin plan" },
                  ...plans.map((plan) => ({ value: plan.id, label: `${plan.label} · ${plan.price}` })),
                ]}
              />
            </label>
            {(() => {
              const catalog = plans.find((plan) => plan.id === commercial.plan);
              return catalog ? (
                <p className="mt-2 text-xs text-ink-muted">
                  Tarifa del plan: {catalog.price} al mes
                  {catalog.commission_percent ? ` · comisión ${formatPercent(catalog.commission_percent)}% por pago` : ""}.
                </p>
              ) : null;
            })()}
            <label className="mt-4 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={commercial.customPrice}
                onChange={(e) => setCommercial((current) => (current ? { ...current, customPrice: e.target.checked } : current))}
              />
              Precio mensual distinto
            </label>
            {commercial.customPrice ? (
              <label className="mt-2 block text-sm text-ink-muted">
                Precio en pesos
                <input
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  value={commercial.price}
                  onChange={(e) => setCommercial((current) => (current ? { ...current, price: e.target.value } : current))}
                />
                <span className="mt-1 block text-xs">{formatMoney(Number(commercial.price.replace(/\./g, "").replace(",", ".")))}</span>
              </label>
            ) : null}
            <label className="mt-4 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={commercial.customCommission}
                onChange={(e) => setCommercial((current) => (current ? { ...current, customCommission: e.target.checked } : current))}
              />
              Comisión distinta
            </label>
            {commercial.customCommission ? (
              <label className="mt-2 block text-sm text-ink-muted">
                Porcentaje por pago cobrado
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-ink"
                  value={commercial.commission}
                  onChange={(e) => setCommercial((current) => (current ? { ...current, commission: e.target.value } : current))}
                />
              </label>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                disabled={savingCommercial}
                onClick={() => setCommercial(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingCommercial}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                onClick={() => void onSaveCommercial()}
              >
                {savingCommercial ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {deleteTarget && (
        <AppModal onBackdropClick={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">¿Borrar esta empresa?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Se borra <span className="font-semibold text-ink">{deleteTarget.name}</span>, sus clientes, cobros y mensajes, y las cuentas que solo pertenecen a esta empresa. No se puede deshacer.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => {
                  const target = deleteTarget;
                  setDeleting(true);
                  void deleteCompany(target.id)
                    .then(async () => {
                      setDeleteTarget(null);
                      if (editing?.id === target.id) setEditing(null);
                      await load();
                      toast.success("Empresa borrada.");
                    })
                    .catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : "No se pudo borrar la empresa.");
                    })
                    .finally(() => setDeleting(false));
                }}
              >
                {deleting ? "Borrando…" : "Borrar"}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {issuedPassword && (
        <AppModal onBackdropClick={() => setIssuedPassword(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Contraseña de acceso</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {issuedPassword.company} quedó activa. Entrégale esta contraseña a {issuedPassword.email || "la persona que solicitó la cuenta"}. Al ingresar deberá cambiarla.
            </p>
            <code className="mt-4 block break-all rounded-xl bg-surface px-3 py-3 font-mono text-base font-semibold text-ink">
              {issuedPassword.temporary_password}
            </code>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                onClick={() => {
                  void navigator.clipboard.writeText(issuedPassword.temporary_password);
                  toast.success("Contraseña copiada.");
                }}
              >
                Copiar
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                onClick={() => setIssuedPassword(null)}
              >
                Listo
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {openCreateModal && (
        <AppModal>
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-ink">Crear empresa</h2>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                const ok = await onCreate(e);
                if (ok) setOpenCreateModal(false);
              }}
            >
              <Input label="Nombre de empresa" value={form.name} onChange={(v) => setForm({ name: v })} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface" onClick={() => setOpenCreateModal(false)}>
                  Cancelar
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover" type="submit">
                  <Plus className="h-4 w-4" />
                  Crear empresa
                </button>
              </div>
            </form>
          </div>
        </AppModal>
      )}

      {waEdit && (
        <AppModal onBackdropClick={() => setWaEdit(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">WhatsApp Business</h2>
            <p className="mt-1 text-sm text-ink-muted">{waEdit.name}</p>
            <p className="mt-3 text-sm text-ink-muted">
              Este número envía los recordatorios y recibe las respuestas de los clientes de esta empresa. Tiene que ser un
              remitente de WhatsApp en la misma cuenta de Twilio.
            </p>
            <label className="mt-4 block text-sm font-medium text-ink">
              Número
              <input
                className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 font-mono text-sm"
                placeholder="+56912345678"
                value={waEdit.phone}
                onChange={(e) => setWaEdit({ ...waEdit, phone: e.target.value })}
                autoFocus
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {waByCompany[waEdit.id] && (
                <button
                  type="button"
                  className="mr-auto rounded-xl px-4 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
                  disabled={busy}
                  onClick={() => void onSaveWhatsApp("")}
                >
                  Quitar
                </button>
              )}
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                onClick={() => setWaEdit(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                disabled={busy}
                onClick={() => void onSaveWhatsApp(waEdit.phone)}
              >
                Guardar
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {mailEdit && (
        <AppModal onBackdropClick={() => setMailEdit(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Correo de la empresa</h2>
            <p className="mt-1 text-sm text-ink-muted">{mailEdit.name}</p>
            <p className="mt-3 text-sm text-ink-muted">
              Los recordatorios por correo salen desde este buzón, al email que tenga el cliente. El texto lo escribe la empresa en Configuración, en Mensajes, con Agregar.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-ink">
                Nombre visible
                <input
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  placeholder="Cobranzas Jumbo"
                  value={mailEdit.from_name}
                  onChange={(e) => setMailEdit({ ...mailEdit, from_name: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Correo
                <input
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  placeholder="cobranzas@empresa.cl"
                  value={mailEdit.from_email}
                  onChange={(e) => setMailEdit({ ...mailEdit, from_email: e.target.value })}
                  autoFocus
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                <label className="block text-sm font-medium text-ink">
                  Servidor SMTP
                  <input
                    className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                    placeholder="smtp.gmail.com"
                    value={mailEdit.smtp_host}
                    onChange={(e) => setMailEdit({ ...mailEdit, smtp_host: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-medium text-ink">
                  Puerto
                  <input
                    className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                    value={mailEdit.smtp_port}
                    onChange={(e) => setMailEdit({ ...mailEdit, smtp_port: e.target.value })}
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-ink">
                Usuario SMTP
                <input
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  placeholder="cobranzas@empresa.cl"
                  value={mailEdit.smtp_username}
                  onChange={(e) => setMailEdit({ ...mailEdit, smtp_username: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Contraseña
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
                  placeholder={mailEdit.password_set ? "Dejar en blanco para no cambiarla" : "Contraseña o clave de aplicación"}
                  value={mailEdit.smtp_password}
                  onChange={(e) => setMailEdit({ ...mailEdit, smtp_password: e.target.value })}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {mailByCompany[mailEdit.id] && (
                <button
                  type="button"
                  className="mr-auto rounded-xl px-4 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
                  disabled={busy}
                  onClick={() => void onSaveMailbox(true)}
                >
                  Quitar
                </button>
              )}
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
                onClick={() => setMailEdit(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                disabled={busy}
                onClick={() => void onSaveMailbox(false)}
              >
                Guardar
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {props.label}
      <input
        className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required
      />
    </label>
  );
}

function MiniKpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-brand/20 bg-brand-soft text-brand"
      : tone === "danger"
        ? "border-danger/20 bg-danger-soft text-danger"
        : "border-surface-border bg-surface-card text-ink-muted";

  return (
    <div className={`rounded-2xl border px-3 py-3 shadow-soft sm:px-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}
