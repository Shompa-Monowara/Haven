import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, api } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

interface ForgotResponse {
  message: string;
  resetToken?: string;
}

export function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<ForgotResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    try {
      const data = await api.post<ForgotResponse>("/auth/forgot-password", values, {
        skipAuth: true,
      });
      setSent(data);
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "Unable to send a reset link right now.",
      );
    }
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="If an account exists for that address, a reset link is on its way."
      >
        <div className="rounded-lg border border-line bg-canvas p-5">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
          <p className="mt-3 text-sm leading-relaxed text-body">{sent.message}</p>
          <p className="mt-2 text-xs text-muted">The link expires in 30 minutes.</p>
        </div>

        {sent.resetToken ? (
          <div className="mt-5 rounded-md border border-dashed border-line p-4 text-sm">
            <p className="font-medium text-heading">Development shortcut</p>
            <p className="mt-1 text-xs text-body">
              Email delivery is not configured in development, so use this link directly.
            </p>
            <Link
              to={`/reset-password?token=${encodeURIComponent(sent.resetToken)}`}
              className="mt-2 inline-flex items-center gap-1.5 font-medium text-brand-strong hover:underline"
            >
              Open reset link
            </Link>
          </div>
        ) : null}

        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/login">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email on your account and we will send a link to set a new password."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError ? (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-tint px-3.5 py-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-heading">
            Email address
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-10"
              aria-invalid={Boolean(errors.email) || undefined}
              {...register("email")}
            />
          </div>
          {errors.email ? <p className="mt-1.5 text-sm text-danger">{errors.email.message}</p> : null}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Sending link" : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-body">
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-brand-strong hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}