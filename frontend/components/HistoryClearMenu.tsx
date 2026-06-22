"use client";

import { useMutation } from "@apollo/client/react";
import { useEffect, useRef, useState } from "react";

import { notify } from "@/components/ToastHost";
import {
  CLEAR_HISTORY_MUTATION,
  FLOCK_QUERY,
  HISTORY_QUERY,
} from "@/lib/graphql/operations";

import {
  historyActionTriggerClass,
  historyDropdownClass,
  historyDropdownItemClass,
} from "./historyActionsStyles";

const PAGE_SIZE = 50;

export function HistoryClearMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const [clearHistory, { loading }] = useMutation(CLEAR_HISTORY_MUTATION, {
    refetchQueries: [
      { query: HISTORY_QUERY, variables: { limit: PAGE_SIZE, offset: 0 } },
      { query: FLOCK_QUERY },
    ],
  });

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleClear = async () => {
    try {
      await clearHistory();
      setOpen(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not clear history");
    }
  };

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={historyActionTriggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={loading}
      >
        Clear
      </button>
      {open ? (
        <div role="menu" className={historyDropdownClass}>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleClear()}
            disabled={loading}
            className={historyDropdownItemClass}
          >
            {loading ? "Clearing…" : "are you sure?"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
