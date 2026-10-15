import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Admin sign in" };

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return (
    <Suspense fallback={<div className="card h-80 animate-pulse" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
