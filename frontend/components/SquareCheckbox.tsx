import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

type SquareCheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label: string;
};

export function SquareCheckbox({
  checked,
  onToggle,
  disabled = false,
  label,
}: SquareCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`bird-checkbox ${checked ? "bird-checkbox--checked" : ""}`}
      aria-label={label}
      aria-pressed={checked}
    >
      {checked ? (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="bird-checkbox__mark">
          <path
            d="M3.5 8.5L6.5 11.5L12.5 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      ) : null}
    </button>
  );
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M8 3.5L8 5.5M8 10.5L8 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5.5 5.5L8 3L10.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 10.5L8 13L10.5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type DragReorderButtonProps = {
  label: string;
  listeners: SyntheticListenerMap | undefined;
};

export function DragReorderButton({ label, listeners }: DragReorderButtonProps) {
  return (
    <div
      className="flock-action-btn flock-drag-handle"
      aria-label={label}
      role="button"
      tabIndex={0}
      {...listeners}
    >
      <DragHandleIcon />
    </div>
  );
}
