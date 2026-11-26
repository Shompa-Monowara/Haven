import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ApiClientError, api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { roleHome, type SessionPayload } from "@/types/auth";

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
    email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
    phone: z.string().trim().max(24, "Phone number is too long").optional(),
    role: z.enum(["buyer", "agent"]),
    agency: z.string().trim().max(120, "Agency name is too long").optional(),
    licenseNumber: z.string().trim().max(60, "License number is too long").optional(),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Use 72 characters or fewer")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    consent: z.boolean().refine((value) => value, "Accept the terms to create an account"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .superRefine((values, ctx) => {
    if (values.role === "agent" && (!values.agency || values.agency.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agency"],
        message: "Enter your agency name",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "buyer",
      agency: "",
      licenseNumber: "",
      password: "",
      confirmPassword: "",
      consent: false,
    },
  });

  const role = watch("role");

  async function onSubmit(values: FormValues) {
    setFormError(null);

    try {
      const data = await api.post<SessionPayload>(
        "/auth/register",
        {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          password: values.password,
          role: values.role,
          agency: values.role === "agent" ? values.agency : undefined,
          licenseNumber: values.role === "agent" ? values.licenseNumber || undefined : undefined,
          consent: values.consent,
        },
        { skipAuth: true },
      );

      useAuthStore.getState().setSession(data.user, data.agentProfile, data.accessToken ?? null);
      toast.success("Account created. Welcome to Haven.");
      navigate(roleHome(data.user.role), { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to create your account. Please try again.",
      );
    }
  }

  const errorText = (message?: string) =>
    message ? <p className="mt-1.5 text-sm text-danger">{message}</p> : null;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Save homes, contact agents, and get alerts when the right place hits the market."
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

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-heading">I am joining as</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "buyer" as const,
                title: "Buyer or renter",
                description: "Search, save, and contact agents",
                icon: UserRound,
              },
              {
                value: "agent" as const,
                title: "Agent",
                description: "List properties and manage leads",
                icon: Building2,
              },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-lg border bg-surface p-3.5 transition-colors focus-within:ring-2 focus-within:ring-brand/40",
                  role === option.value
                    ? "border-brand-strong bg-brand-soft/50"
                    : "border-line hover:border-brand/60",
                )}
              >
                <input type="radio" value={option.value} className="sr-only" {...register("role")} />
                <option.icon
                  className={cn(
                    "h-5 w-5",
                    role === option.value ? "text-brand-strong" : "text-muted",
                  )}
                  aria-hidden="true"
                />
                <span className="mt-2 block text-sm font-semibold text-heading">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-body">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
          {errorText(errors.role?.message)}
        </fieldset>

        <div>
          <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium text-heading">
            Full name
          </label>
          <Input
            id="register-name"
            autoComplete="name"
            placeholder="Avery Brooks"
            aria-invalid={Boolean(errors.name) || undefined}
            {...register("name")}
          />
          {errorText(errors.name?.message)}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-heading">
              Email address
            </label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email) || undefined}
              {...register("email")}
            />
            {errorText(errors.email?.message)}
          </div>
          <div>
            <label htmlFor="register-phone" className="mb-1.5 block text-sm font-medium text-heading">
              Phone <span className="font-normal text-muted">(optional)</span>
            </label>
            <Input
              id="register-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 555 0100"
              aria-invalid={Boolean(errors.phone) || undefined}
              {...register("phone")}
            />
            {errorText(errors.phone?.message)}
          </div>
        </div>

        {role === "agent" ? (
          <div className="grid gap-4 rounded-md border border-line bg-canvas p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="register-agency" className="mb-1.5 block text-sm font-medium text-heading">
                Agency name
              </label>
              <Input
                id="register-agency"
                placeholder="Harbor Realty"
                aria-invalid={Boolean(errors.agency) || undefined}
                {...register("agency")}
              />
              {errorText(errors.agency?.message)}
            </div>
            <div>
              <label htmlFor="register-license" className="mb-1.5 block text-sm font-medium text-heading">
                License <span className="font-normal text-muted">(optional)</span>
              </label>
              <Input
                id="register-license"
                placeholder="NY-12345"
                aria-invalid={Boolean(errors.licenseNumber) || undefined}
                {...register("licenseNumber")}
              />
              {errorText(errors.licenseNumber?.message)}
            </div>
            <p className="text-xs leading-relaxed text-body sm:col-span-2">
              Agent accounts start unverified. You can draft listings right away; verification is
              reviewed by an administrator and adds a verified badge to your profile.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="register-password"
              className="mb-1.5 block text-sm font-medium text-heading"
            >
              Password
            </label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              aria-invalid={Boolean(errors.password) || undefined}
              {...register("password")}
            />
            {errorText(errors.password?.message)}
          </div>
          <div>
            <label
              htmlFor="register-confirm"
              className="mb-1.5 block text-sm font-medium text-heading"
            >
              Confirm password
            </label>
            <Input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              aria-invalid={Boolean(errors.confirmPassword) || undefined}
              {...register("confirmPassword")}
            />
            {errorText(errors.confirmPassword?.message)}
          </div>
        </div>
        <p className="-mt-1 text-xs text-body">
          Use at least 8 characters, including one letter and one number.
        </p>

        <div>
          <label className="flex items-start gap-2.5 text-sm text-body">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
              aria-invalid={Boolean(errors.consent) || undefined}
              {...register("consent")}
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="font-medium text-brand-strong hover:underline">
                terms of use
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-medium text-brand-strong hover:underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {errorText(errors.consent?.message)}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          {isSubmitting ? "Creating account" : "Create account"}
        </Button>

        <p className="text-center text-sm text-body">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-strong hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}