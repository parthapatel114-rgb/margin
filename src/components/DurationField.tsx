import { useId, useState } from "react";
import type { Mutate } from "../lib/types";
export function DurationField({
  label,
  value,
  setting,
  mutate,
  busy,
  onValueChange,
}: {
  label: string;
  value: number;
  setting: string;
  mutate: Mutate;
  busy: boolean;
  onValueChange?: (value: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  const id = useId();
  async function save() {
    const n = Number(draft);
    if (!Number.isInteger(n) || n < 1 || n > 240) {
      setError("Enter 1–240 minutes.");
      return;
    }
    setError("");
    if (n !== value) {
      const saved = await mutate({
        kind: "setting",
        key: setting,
        value: String(n),
      });
      if (!saved) return;
    }
    setEditing(false);
    onValueChange?.(null);
  }
  return (
    <label className="duration-field" htmlFor={id}>
      <span>{label}</span>
      <span className="duration-input">
        <input
          id={id}
          name={setting}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          type="number"
          inputMode="numeric"
          min={1}
          max={240}
          step={1}
          value={editing ? draft : String(value)}
          onFocus={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          disabled={busy}
          onChange={(e) => {
            setDraft(e.target.value);
            onValueChange?.(Number(e.target.value));
          }}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <span>min</span>
      </span>
      {error && (
        <span className="field-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
