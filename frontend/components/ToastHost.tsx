"use client";

import { useCallback, useEffect, useState } from "react";

type ToastMessage = {
  id: number;
  text: string;
  tone: "error" | "info";
};

let pushToast: ((text: string, tone?: "error" | "info") => void) | null = null;

export function notify(text: string, tone: "error" | "info" = "error") {
  pushToast?.(text, tone);
}

export function ToastHost() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, tone: "error" | "info" = "error") => {
    const id = Date.now();
    setMessages((current) => [...current, { id, text, tone }]);
    window.setTimeout(() => {
      setMessages((current) => current.filter((message) => message.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    pushToast = addToast;
    return () => {
      pushToast = null;
    };
  }, [addToast]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex w-[min(90vw,24rem)] -translate-x-1/2 flex-col gap-2"
      aria-live="polite"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`rounded-md px-4 py-3 text-sm shadow-lg ${
            message.tone === "error"
              ? "bg-red-900 text-red-50"
              : "bg-ink text-paper"
          }`}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
}
