import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { Banknote, CreditCard, KeyRound, Landmark, Repeat } from "lucide-react";
import { fetchPaymentCredentials, savePaymentCredentials, type PaymentCredentialStatus, type PaymentCredentialUpdate } from "../api";
import { useToast } from "../components/Toast";
import { useMessagingForm } from "../pages/MessagingSettings";

const INPUT =
  "w-full rounded-xl border border-surface-border bg-[rgb(var(--color-field))] px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/50";
const ROW_BUTTON =
  "inline-flex h-9 w-full items-center justify-center rounded-lg border border-surface-border bg-surface-card text-sm font-semibold text-ink hover:border-brand/40 hover:text-brand disabled:opacity-60";

type Field = {
  name: keyof PaymentCredentialUpdate;
  label: string;
  secret: boolean;
};

const PROVIDERS: {
  id: keyof PaymentCredentialStatus;
  title: string;
  detail: string;
  icon: typeof KeyRound;
  fields: Field[];
}[] = [
  {
    id: "khipu",
    title: "Khipu",
    detail: "Transferencia",
    icon: KeyRound,
    fields: [{ name: "khipu_api_key", label: "API key", secret: true }],
  },
  {
    id: "webpay",
    title: "Webpay",
    detail: "Tarjeta",
    icon: CreditCard,
    fields: [
      { name: "webpay_commerce_code", label: "Código de comercio", secret: false },
      { name: "webpay_api_key", label: "Llave", secret: true },
    ],
  },
  {
    id: "oneclick",
    title: "Oneclick",
    detail: "Cargo a tarjeta",
    icon: Repeat,
    fields: [
      { name: "oneclick_mall_code", label: "Código mall", secret: false },
      { name: "oneclick_store_code", label: "Código tienda", secret: false },
      { name: "oneclick_api_key", label: "Llave", secret: true },
    ],
  },
  {
    id: "fintoc",
    title: "Fintoc",
    detail: "Transferencia",
    icon: Landmark,
    fields: [{ name: "fintoc_secret_key", label: "Secret key", secret: true }],
  },
];

function message(err: unknown) {
  if (axios.isAxiosError(err)) {
    const text = err.response?.data?.error;
    if (typeof text === "string" && text.trim()) return text;
  }
  return "No se pudieron guardar las credenciales.";
}

function StatePill({ on, pending }: { on: boolean; pending?: boolean }) {
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-medium ${
        on && !pending ? "bg-brand-soft text-brand" : "bg-surface text-ink-muted"
      }`}
    >
      {pending ? "…" : on ? "Activo" : "Apagado"}
    </span>
  );
}

function MethodRow({
  icon: Icon,
  title,
  detail,
  active,
  pending,
  actionLabel,
  actionDisabled,
  onAction,
  children,
}: {
  icon: typeof KeyRound;
  title: string;
  detail: string;
  active: boolean;
  pending?: boolean;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
  children?: ReactNode;
}) {
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_7.25rem] items-center gap-x-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink-muted">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-ink">{title}</p>
            <StatePill on={active} pending={pending} />
          </div>
          <p className="mt-0.5 truncate text-xs text-ink-muted">{detail}</p>
        </div>
        <button type="button" disabled={actionDisabled} onClick={onAction} className={ROW_BUTTON}>
          {actionLabel}
        </button>
      </div>
      {children}
    </li>
  );
}

function EditorActions({
  busy,
  canRemove,
  confirming,
  onAskRemove,
  onRemove,
  onCancel,
}: {
  busy: boolean;
  canRemove: boolean;
  confirming: boolean;
  onAskRemove: () => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      {canRemove ? (
        <button
          type="button"
          disabled={busy}
          onClick={confirming ? onRemove : onAskRemove}
          className={`h-10 rounded-lg px-3 text-sm font-medium disabled:opacity-60 ${
            confirming ? "text-danger hover:bg-danger-soft" : "text-ink-muted hover:bg-surface hover:text-ink"
          }`}
        >
          {confirming ? "Confirmar" : "Quitar"}
        </button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="h-10 rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-60"
        >
          Cancelar
        </button>
        {confirming ? null : (
          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>
    </div>
  );
}

function CredentialEditor({
  fields,
  busy,
  canRemove,
  confirming,
  onAskRemove,
  onRemove,
  onCancel,
  onSave,
}: {
  fields: Field[];
  busy: boolean;
  canRemove: boolean;
  confirming: boolean;
  onAskRemove: () => void;
  onRemove: () => void;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <form
      className="mt-3 space-y-3 rounded-xl bg-surface px-4 py-4 sm:ml-12"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(values);
      }}
    >
      {fields.map((field) => (
        <label key={field.name} className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">{field.label}</span>
          <input
            className={INPUT}
            type={field.secret ? "password" : "text"}
            name={field.name}
            autoComplete={field.secret ? "new-password" : "off"}
            spellCheck={false}
            value={values[field.name] ?? ""}
            onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
          />
        </label>
      ))}
      <EditorActions
        busy={busy}
        canRemove={canRemove}
        confirming={confirming}
        onAskRemove={onAskRemove}
        onRemove={onRemove}
        onCancel={onCancel}
      />
    </form>
  );
}

export default function PaymentCredentialsSection({ bare = false }: { bare?: boolean }) {
  const toast = useToast();
  const [status, setStatus] = useState<PaymentCredentialStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchPaymentCredentials()
      .then((data) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar los medios de pago.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(id: keyof PaymentCredentialStatus, payload: PaymentCredentialUpdate) {
    setBusy(true);
    try {
      await savePaymentCredentials(payload);
      setStatus((current) => (current ? { ...current, [id]: true } : current));
      setEditing(null);
      toast.success("Credencial guardada.");
    } catch (err) {
      toast.error(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function clear(provider: (typeof PROVIDERS)[number]) {
    const payload = Object.fromEntries(provider.fields.map((field) => [field.name, ""])) as PaymentCredentialUpdate;
    setBusy(true);
    try {
      await savePaymentCredentials(payload);
      setStatus((current) => (current ? { ...current, [provider.id]: false } : current));
      setConfirming(null);
      setEditing(null);
      toast.success("Credencial quitada.");
    } catch (err) {
      toast.error(message(err));
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-surface-border">
            <ManualTransferMethod />
            {!error && !status ? <li className="py-4 text-sm text-ink-muted">Cargando medios de pago…</li> : null}
            {status
              ? PROVIDERS.map((provider) => {
                  const loaded = status[provider.id];
                  const open = editing === provider.id;
                  return (
                    <MethodRow
                      key={provider.id}
                      icon={provider.icon}
                      title={provider.title}
                      detail={provider.detail}
                      active={loaded}
                      actionLabel={open ? "Cerrar" : loaded ? "Editar" : "Cargar"}
                      actionDisabled={busy}
                      onAction={() => {
                        setConfirming(null);
                        setEditing((current) => (current === provider.id ? null : provider.id));
                      }}
                    >
                      {open ? (
                        <CredentialEditor
                          fields={provider.fields}
                          busy={busy}
                          canRemove={loaded}
                          confirming={confirming === provider.id}
                          onAskRemove={() => setConfirming(provider.id)}
                          onRemove={() => void clear(provider)}
                          onCancel={() => {
                            if (confirming === provider.id) {
                              setConfirming(null);
                              return;
                            }
                            setEditing(null);
                          }}
                          onSave={(values) => {
                            const payload = Object.fromEntries(
                              provider.fields.map((field) => [field.name, (values[field.name] ?? "").trim()]),
                            ) as PaymentCredentialUpdate;
                            if (provider.fields.some((field) => !payload[field.name])) {
                              toast.error("Completa todos los datos.");
                              return;
                            }
                            void save(provider.id, payload);
                          }}
                        />
                      ) : null}
                    </MethodRow>
                  );
                })
              : null}
        </ul>
    </>
  );

  if (bare) return body;

function ManualTransferMethod() {
  const toast = useToast();
  const { loading, transfer, saveTransferInstructions } = useMessagingForm();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const active = transfer.trim() !== "";

  async function persist(value: string) {
    setBusy(true);
    try {
      await saveTransferInstructions(value);
      setOpen(false);
      setConfirming(false);
      toast.success(value.trim() ? "Transferencia directa guardada." : "Transferencia directa quitada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la transferencia directa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MethodRow
      icon={Banknote}
      title="Transferencia directa"
      detail="La empresa marca el cobro a mano"
      active={active}
      pending={loading}
      actionLabel={open ? "Cerrar" : active ? "Editar" : "Cargar"}
      actionDisabled={busy || loading}
      onAction={() => {
        setConfirming(false);
        setDraft(transfer);
        setOpen((current) => !current);
      }}
    >
      {open ? (
        <form
          className="mt-3 space-y-3 rounded-xl bg-surface px-4 py-4 sm:ml-12"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.trim()) {
              toast.error("Escribe los datos de la cuenta.");
              return;
            }
            void persist(draft);
          }}
        >
          <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3">
            <p className="text-sm font-medium text-ink">Este pago no se confirma solo</p>
            <p className="mt-1 text-sm text-ink-muted">
              El cliente transfiere directo a la cuenta de la empresa. GeldFlus no recibe un aviso, así que el cobro queda pendiente hasta que alguien lo marque como cobrado.
            </p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Datos de la cuenta</span>
            <textarea
              className={`${INPUT} min-h-[6rem]`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={"Banco Estado · Cuenta corriente\nN° 123456789 · RUT 76.123.456-7\npagos@tuempresa.cl"}
            />
          </label>
          <EditorActions
            busy={busy}
            canRemove={active}
            confirming={confirming}
            onAskRemove={() => setConfirming(true)}
            onRemove={() => void persist("")}
            onCancel={() => {
              if (confirming) {
                setConfirming(false);
                return;
              }
              setOpen(false);
            }}
          />
        </form>
      ) : null}
    </MethodRow>
  );
}

  return (
    <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-soft">
      <header className="flex items-center gap-3 border-b border-surface-border px-4 py-4 sm:px-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <KeyRound className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-ink">Medios de pago</h2>
          <p className="text-sm leading-snug text-ink-muted">
            El cliente solo ve los que dejes cargados. La llave se cifra y no se vuelve a mostrar.
          </p>
        </div>
      </header>
      <div className="px-4 py-5 sm:px-6">{body}</div>
    </section>
  );
}
