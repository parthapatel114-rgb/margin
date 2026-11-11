import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function InlineError({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <span className="field-error" role="alert" id={id}>
      <CircleAlert size={15} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

/** A small page-and-pencil drawing, rather than a decorative empty dashboard. */
export function EmptyLedger() {
  return (
    <svg
      className="empty-ledger"
      viewBox="0 0 88 64"
      fill="none"
      aria-hidden="true"
    >
      <path d="M20 8h38l10 10v38H20V8Z" stroke="currentColor" />
      <path d="M58 8v11h10M29 27h23M29 34h16M29 41h11" stroke="currentColor" />
      <path
        d="m50 43 17-17 5 5-17 17-7 2 2-7Z"
        fill="var(--surface)"
        stroke="var(--secondary)"
      />
      <path d="m64 29 5 5" stroke="var(--secondary)" />
    </svg>
  );
}
