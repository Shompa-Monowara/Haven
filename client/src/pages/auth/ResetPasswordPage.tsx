import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, api } from "@/lib/api";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Use 72 characters or fewer")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    try {
      await api.post("/auth/reset-password", { token, password: values.password }, { skipAuth: true });
      setDone(true);
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to reset your password. Request a new link.",
      );
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Reset link is invalid"
        subtitle="This link is missing its token. Request a fresh reset link to continue."
      >
        <Button asChild className="w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your other sessions have been signed out. Use your new password to sign in."
      >
        <div className="rounded-lg border border-line bg-canvas p-5">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
          <p className="mt-3 text-sm text-body">
            The reset link can no longer be used. If you did not make this change, contact support
            immediately.
          </p>
        </div>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use at least 8 characters, including one letter and one number."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError ? (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-tint px-3.5 py-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <div>
          <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium text-heading">
            New password
          </label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            aria-invalid={Boolean(errors.password) || undefined}
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1.5 text-sm text-danger">{errors.password.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-medium text-heading">
            Confirm new password
          </label>
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat new password"
            aria-invalid={Boolean(errors.confirmPassword) || undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="mt-1.5 text-sm text-danger">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Updating password" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}