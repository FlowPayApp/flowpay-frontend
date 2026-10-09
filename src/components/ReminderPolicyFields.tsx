import { Check } from "lucide-react";
import type { ReminderPolicy } from "../api";
import { OVERDUE_UNLIMITED } from "../lib/reminderPolicy";
import AppSelect from "./AppSelect";

const DAY_CHOICES = [7, 5, 3, 2, 1, 0];
const EVERY_CHOICES = [1, 2, 3, 5, 7, 14];
const MAX_CHOICES = [0, 1, 2, 3, 5, 10, OVERDUE_UNLIMITED];

function withCurrent(choices: number[], current: number[]) {
  return [...new Set([...choices, ...current])];
}

function chipLabel(d: number) {
  if (d === 0) return "El día que vence";
  return d === 1 ? "1 día antes" : `${d} días antes`;
}

function maxLabel(n: number) {
  if (n === 0) return "No avisar";
  if (n === OVERDUE_UNLIMITED) return "Hasta que pague";
  return n === 1 ? "1 vez" : `${n} veces`;
}

export default function ReminderPolicyFields({
  value,
  onChange,
  disabled = false,
}: {
  value: ReminderPolicy;
  onChange: (next: ReminderPolicy) => void;
  disabled?: boolean;
}) {
  const days = withCurrent(DAY_CHOICES, value.days_before).sort((a, b) => b - a);
  const toggleDay = (d: number) =>
    onChange({
      ...value,
      days_before: value.days_before.includes(d) ? value.days_before.filter((x) => x !== d) : [...value.days_before, d],
    });
  const everyChoices = withCurrent(EVERY_CHOICES, [value.overdue_every]).sort((a, b) => a - b);
  const maxChoices = withCurrent(MAX_CHOICES, [value.overdue_max]);

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-ink">Antes del vencimiento</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {days.map((d) => {
            const on = value.days_before.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                disabled={disabled}
                onClick={() => toggleDay(d)}
                className={`flex h-11 items-center gap-2.5 rounded-xl border px-3 text-left text-sm font-medium transition-colors disabled:opacity-60 ${
                  on ? "border-brand bg-brand-soft text-brand" : "border-surface-border bg-surface-card text-ink hover:bg-surface"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
                    on ? "border-brand bg-brand text-white" : "border-ink-muted/40 bg-surface-card"
                  }`}
                  aria-hidden
                >
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="truncate">{chipLabel(d)}</span>
              </button>
            );
          })}
        </div>
        {value.days_before.length === 0 ? (
          <p className="mt-1 text-xs text-ink-muted">No se avisa antes de que venza.</p>
        ) : null}
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Con el cobro vencido</legend>
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-ink-muted">
            Cuántos avisos
            <AppSelect
              value={String(value.overdue_max)}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, overdue_max: Number(v) })}
              options={maxChoices.map((n) => ({ value: String(n), label: maxLabel(n) }))}
            />
          </label>
          <label className="block text-xs text-ink-muted">
            Cada cuánto
            <AppSelect
              value={String(value.overdue_every)}
              disabled={disabled || value.overdue_max === 0}
              onChange={(v) => onChange({ ...value, overdue_every: Number(v) })}
              options={everyChoices.map((n) => ({ value: String(n), label: n === 1 ? "Todos los días" : `Cada ${n} días` }))}
            />
          </label>
        </div>
      </fieldset>
    </div>
  );
}
