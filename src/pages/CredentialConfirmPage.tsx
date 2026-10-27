import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { confirmCredentialChange, fetchCredentialConfirmation, type PaymentCredentialPreview } from "../api";
import AuthShell from "../components/AuthShell";
import LoadingIndicator from "../components/LoadingIndicator";

function message(err: unknown) {
  if (axios.isAxiosError(err)) {
    const text = err.response?.data?.error;
    if (typeof text === "string" && text.trim()) return text;
  }
  return "No se pudo confirmar el cambio.";
}

function doneText(view: PaymentCredentialPreview) {
  if (view.action === "remove") return `Las credenciales de ${view.provider_label} quedaron quitadas.`;
  if (view.action === "create") return `Las credenciales de ${view.provider_label} quedaron cargadas.`;
  return `Las credenciales de ${view.provider_label} quedaron reemplazadas.`;
}

export default function CredentialConfirmPage() {
  const { token = "" } = useParams();
  const [view, setView] = useState<PaymentCredentialPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<PaymentCredentialPreview | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchCredentialConfirmation(token)
      .then((data) => {
        if (active) setView(data);
      })
      .catch((err: unknown) => {
        if (active) setError(message(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const result = await confirmCredentialChange(token);
      setDone(result.provider_label ? result : view);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  const finished = done ?? null;

  return (
    <AuthShell
      title={finished ? "Cambio confirmado" : "Confirmar credencial"}
      lede={
        finished
          ? `${doneText(finished)} El enlace de pago ya usa este cambio.`
          : view
            ? `Vas a ${view.action_verb} las credenciales de ${view.provider_label}${view.company ? ` en ${view.company}` : ""}. Hasta que confirmes, el enlace de pago sigue igual.`
            : undefined
      }
    >
      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <LoadingIndicator message="Cargando…" />
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : finished ? null : (
        <button
          type="button"
          disabled={busy || !view}
          onClick={() => void confirm()}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? "Confirmando…" : "Confirmar"}
        </button>
      )}
    </AuthShell>
  );
}
