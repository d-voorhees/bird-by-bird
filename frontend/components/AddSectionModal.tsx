"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/Providers";
import { notify } from "@/components/ToastHost";
import { friendlyErrorMessage } from "@/lib/errors";
import { SET_CUSTOM_SECTION_NAME_MUTATION } from "@/lib/graphql/operations";
import type { User } from "@/lib/types";

type AddSectionModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AddSectionModal({ open, onClose }: AddSectionModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const { refreshUser } = useAuth();

  const [setCustomSectionName, { loading }] = useMutation<{
    setCustomSectionName: Pick<User, "id" | "customSectionName">;
  }>(SET_CUSTOM_SECTION_NAME_MUTATION);

  const handleClose = useCallback(() => {
    setName("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      nameRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await setCustomSectionName({ variables: { name: trimmed } });
      await refreshUser();
      handleClose();
    } catch (error) {
      notify(friendlyErrorMessage(error, "Could not create section"));
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/20 p-4 sm:items-center"
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-paper p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-section-title"
      >
        <h2 id="add-section-title" className="sr-only">
          Add section
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name this section"
            maxLength={60}
            enterKeyHint="done"
            className="w-full border-b border-stone/30 bg-transparent py-2 text-lg text-ink outline-none placeholder:text-ink/35 focus:border-accent"
            aria-label="Section name"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-4 py-2 text-sm text-ink/60 transition hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
