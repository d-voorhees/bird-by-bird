"use client";

import { useMutation } from "@apollo/client/react";
import { useState } from "react";

import { useAuth } from "@/components/Providers";
import { notify } from "@/components/ToastHost";
import { RESEND_VERIFICATION_EMAIL_MUTATION } from "@/lib/graphql/operations";

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [resend, { loading }] = useMutation(RESEND_VERIFICATION_EMAIL_MUTATION);

  if (!user || user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    try {
      await resend();
      setSent(true);
      notify("Verification email sent. Check your inbox.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not resend email");
    }
  };

  return (
    <div className="border-b border-stone/20 bg-surface/80 px-6 py-3 text-center text-sm text-ink/70">
      {sent ? (
        <span>Verification email sent to {user.email}.</span>
      ) : (
        <>
          <span>Please verify your email address. </span>
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={loading}
            className="text-ink underline-offset-2 hover:underline disabled:opacity-50"
          >
            {loading ? "Sending…" : "Resend verification email"}
          </button>
        </>
      )}
    </div>
  );
}
