import { useEffect, useRef } from "react";

const LENGTH = 6;

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export default function CodeDigits({ value, onChange, disabled, autoFocus }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function slots() {
    return Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");
  }

  function commit(next: string[]) {
    onChange(
      next
        .map((digit) => (/\d/.test(digit) ? digit : ""))
        .join("")
        .slice(0, LENGTH),
    );
  }

  function focusAt(index: number) {
    const box = refs.current[Math.max(0, Math.min(index, LENGTH - 1))];
    box?.focus();
    box?.select();
  }

  function put(index: number, digit: string) {
    const next = slots();
    const at = Math.min(index, value.length);
    next[at] = digit;
    commit(next);
    focusAt(at < LENGTH - 1 ? at + 1 : at);
  }

  function fillFrom(index: number, raw: string) {
    const incoming = raw.replace(/\D/g, "").slice(0, LENGTH);
    if (!incoming) return;
    const next = slots();
    const start = incoming.length >= LENGTH ? 0 : Math.min(index, value.length);
    for (let i = 0; i < incoming.length && start + i < LENGTH; i++) next[start + i] = incoming[i];
    commit(next);
    focusAt(Math.min(start + incoming.length, LENGTH) - 1);
  }

  function clearAt(index: number) {
    const packed = value.split("");
    if (!packed[index]) {
      if (index === 0) return;
      packed.splice(index - 1, 1);
      onChange(packed.join(""));
      focusAt(index - 1);
      return;
    }
    packed.splice(index, 1);
    onChange(packed.join(""));
    focusAt(index);
  }

  function onBoxChange(index: number, rawValue: string) {
    const raw = rawValue.replace(/\D/g, "");
    if (rawValue !== "" && raw === "") return;
    if (raw.length > 1) {
      const current = value[index] ?? "";
      if (raw.length === 2 && current && raw.startsWith(current)) {
        put(index, raw.slice(-1));
        return;
      }
      fillFrom(index, raw);
      return;
    }
    if (raw.length === 1) {
      put(index, raw);
      return;
    }
    clearAt(index);
  }

  return (
    <div className="mt-1 grid grid-cols-6 gap-2" role="group" aria-label="Código de 6 dígitos">
      {slots().map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoCorrect="off"
          spellCheck={false}
          aria-label={`Dígito ${index + 1} de 6`}
          maxLength={LENGTH}
          className="h-12 w-full rounded-xl border border-surface-border text-center text-lg font-medium text-ink outline-none focus:border-brand disabled:opacity-60"
          onChange={(e) => onBoxChange(index, e.target.value)}
          onFocus={(e) => e.target.select()}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!/\d/.test(text)) return;
            e.preventDefault();
            fillFrom(index, text);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digit) {
              e.preventDefault();
              clearAt(index);
            } else if (e.key === "ArrowLeft" && index > 0) {
              e.preventDefault();
              focusAt(index - 1);
            } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
              e.preventDefault();
              focusAt(index + 1);
            }
          }}
        />
      ))}
    </div>
  );
}
