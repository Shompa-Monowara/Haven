import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { roleHome, type SessionPayload } from "@/types/auth";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;

const LAST_EMAIL_KEY = "haven:lastEmail";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(LAST_EMAIL_KEY)));

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: localStorage.getItem(LAST_EMAIL_KEY) ?? "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    try {
      const data = await api.post<SessionPayload>("/auth/login", values, { skipAuth: true });
      useAuthStore.getState().setSession(data.user, data.agentProfile, data.accessToken ?? null);

      if (remember) {
        localStorage.setItem(LAST_EMAIL_KEY, values.email);
      } else {
        localStorage.removeItem(LAST_EMAIL_KEY);
      }

      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);

      const redirect = params.get("redirect");
      const safeRedirect =
        redirect?.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("\\")
          ? redirect
          : null;
      navigate(safeRedirect ?? roleHome(data.user.role), { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "Unable to sign in. Please try again.",
      );
    }
  }

  function fillDemoAccount(email: string, password: string) {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your saved homes, inquiries, and listings."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-tint px-3.5 py-3 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {formError}
          </div>
        ) : null}

        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-heading">
            Email address
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="login-email-error" className="mt-1.5 text-sm text-danger">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-medium text-heading">
              Password
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-brand-strong hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="pr-12"
              aria-invalid={Boolean(errors.password) || undefined}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted transition-colors hover:text-heading"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p id="login-password-error" className="mt-1.5 text-sm text-danger">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <label className="flex items-center gap-2.5 text-sm text-body">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
          />
          Remember my email on this device
        </label>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          {isSubmitting ? "Signing in" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-body">
          New to Haven?{" "}
          <Link to="/register" className="font-medium text-brand-strong hover:underline">
            Create an account
          </Link>
        </p>

        {import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_LOGIN === "true" ? (
          <div className="rounded-md border border-dashed border-line bg-canvas p-3.5 text-xs text-body">
            <p className="font-medium text-heading">Demo accounts</p>
            <ul className="mt-2 space-y-1.5">
              {[
                { label: "Admin", email: "admin@haven.test", password: "HavenAdmin123" },
                { label: "Agent", email: "agent@haven.test", password: "HavenAgent123" },
                { label: "Buyer", email: "buyer@haven.test", password: "HavenBuyer123" },
              ].map((account) => (
                <li key={account.email} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium text-heading">{account.label}:</span>{" "}
                    <span className="tabular">{account.email}</span> /{" "}
                    <span className="tabular">{account.password}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount(account.email, account.password)}
                    className="inline-flex items-center gap-1.5 font-medium text-brand-strong hover:underline"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : null}
                    Fill
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </AuthLayout>
  );
}