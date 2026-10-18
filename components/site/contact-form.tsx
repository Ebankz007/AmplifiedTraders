"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { postJson, type ApiResult } from "@/lib/http";
import { TextField, TextArea, FormError, FormNotice } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address")),
  phone: z.string().trim().max(32).or(z.literal("")).optional(),
  subject: z.string().trim().max(160).or(z.literal("")).optional(),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(4000),
});

type FormState = z.infer<typeof schema>;

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const [values, setValues] = React.useState<FormState>(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Invalid input";
      setError(first);
      return;
    }

    setBusy(true);
    const res: ApiResult<{ ok: true; id: string }> = await postJson(
      "/api/contact",
      parsed.data,
    );
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    toast.success("Message sent");
    setNotice("Thanks — we'll get back to you shortly.");
    setValues(initial);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <FormNotice message={notice} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="name"
          value={values.name}
          onChange={onChange}
          required
        />
        <TextField
          label="Email address"
          name="email"
          type="email"
          value={values.email}
          onChange={onChange}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Phone (optional)"
          name="phone"
          value={values.phone}
          onChange={onChange}
        />
        <TextField
          label="Subject (optional)"
          name="subject"
          value={values.subject}
          onChange={onChange}
        />
      </div>

      <TextArea
        label="Message"
        name="message"
        rows={6}
        value={values.message}
        onChange={onChange}
        required
      />

      <Button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
