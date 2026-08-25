"use client";

import { useEffect, useRef, useState } from "react";

import {
  downloadActiveCsv,
  downloadActiveMarkdown,
} from "@/lib/activeExport";
import type { Task } from "@/lib/types";

import {
  historyActionTriggerClass,
  historyDownloadDropdownClass,
  historyDropdownItemClass,
} from "./historyActionsStyles";

type ActiveDownloadMenuProps = {
  awaitingTasks: Task[];
  flyingLaterTasks: Task[];
};

export function ActiveDownloadMenu({ awaitingTasks, flyingLaterTasks }: ActiveDownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const handleDownload = (format: "md" | "csv") => {
    if (format === "md") {
      downloadActiveMarkdown(awaitingTasks, flyingLaterTasks);
    } else {
      downloadActiveCsv(awaitingTasks, flyingLaterTasks);
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={historyActionTriggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Download
      </button>
      {open ? (
        <div role="menu" className={historyDownloadDropdownClass}>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleDownload("md")}
            className={`${historyDropdownItemClass} px-2`}
          >
            md
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleDownload("csv")}
            className={`${historyDropdownItemClass} px-2`}
          >
            csv
          </button>
        </div>
      ) : null}
    </div>
  );
}
