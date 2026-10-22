import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { emailDeliveryAvailable } from "@/lib/notifications/email";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  // The capability is a property of the deployment, so it is resolved on the
  // server and rendered as a fact - never guessed at in the browser, and
  // never answered per-account by the API.
  const emailDelivery = emailDeliveryAvailable() ? "available" : "unavailable";

  return (
    <Suspense fallback={<div className="card h-72 animate-pulse" />}>
      <ForgotPasswordForm emailDelivery={emailDelivery} />
    </Suspense>
  );
}
