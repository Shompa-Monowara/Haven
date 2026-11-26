import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageAgentButton } from "@/components/messages/MessageAgentButton";
import { ApiClientError, api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { PropertyDetail } from "@/types/property";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
  phone: z.string().trim().max(24).optional(),
  message: z.string().trim().min(10, "Add a short message").max(2000, "Keep it under 2,000 characters"),
  tourDate: z.string().optional(),
  consent: z.boolean().refine((value) => value === true, {
    message: "Accept the terms to send an inquiry",
  }),
});

type FormValues = z.infer<typeof schema>;

export function InquiryForm({ property }: { property: PropertyDetail }) {
  const user = useAuthStore((state) => state.user);
  const [sent, setSent] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isOwner = user?.id === property.agent?.id;
  const signInHref = `/login?redirect=${encodeURIComponent(`/properties/${property.slug}`)}`;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      message: `I'm interested in ${property.title}. Please send me more information.`,
      tourDate: "",
      consent: false,
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    try {
      const result = await api.post<{ responseTimeMinutes: number }>("/inquiries", {
        propertyId: property.id,
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        message: values.message,
        tourDate: values.tourDate || undefined,
        consent: values.consent,
      });
      setSent(result.responseTimeMinutes);
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "Your inquiry could not be sent. Try again.",
      );
    }
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-line bg-surface p-5 text-center">
        <p className="font-medium text-heading">Contact the agent</p>
        <p className="mt-1 text-sm leading-relaxed text-body">
          Sign in to message the agent, ask questions, or schedule a tour.
        </p>
        <Button asChild className="mt-4 w-full">
          <Link to={signInHref}>Sign in to inquire</Link>
        </Button>
        <p className="mt-2 text-xs text-muted">
          New to Haven?{" "}
          <Link to="/register" className="font-medium text-brand-strong hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="rounded-lg border border-line bg-canvas p-5">
        <p className="font-medium text-heading">This is your listing</p>
        <p className="mt-1 text-sm text-body">Buyer inquiries will appear in your leads inbox.</p>
      </div>
    );
  }

  if (sent !== null) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-tint p-5" role="status">
        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
        <p className="mt-2 font-medium text-heading">Your message is on its way</p>
        <p className="mt-1 text-sm leading-relaxed text-body">
          {property.agent?.name ?? "The agent"} usually replies within {sent} minutes. We sent a copy
          to {user.email}.
        </p>
        <div className="mt-3">
          <MessageAgentButton property={property} variant="primary" label="Continue in chat" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-lg border border-line bg-surface p-5">
      <p className="font-medium text-heading">Ask about this home</p>
      <p className="mt-1 text-sm text-body">
        Share what you need and {property.agent?.name ?? "the agent"} will reply directly.
      </p>

      {formError ? (
        <p role="alert" className="mt-3 rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="mt-4 space-y-3.5">
        <div>
          <label htmlFor="inquiry-name" className="mb-1 block text-sm font-medium text-heading">
            Full name
          </label>
          <Input
            id="inquiry-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name) || undefined}
            {...register("name")}
          />
          {errors.name ? <p className="mt-1 text-xs text-danger">{errors.name.message}</p> : null}
        </div>

        <div>
          <label htmlFor="inquiry-email" className="mb-1 block text-sm font-medium text-heading">
            Email
          </label>
          <Input
            id="inquiry-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email) || undefined}
            {...register("email")}
          />
          {errors.email ? <p className="mt-1 text-xs text-danger">{errors.email.message}</p> : null}
        </div>

        <div>
          <label htmlFor="inquiry-phone" className="mb-1 block text-sm font-medium text-heading">
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <Input id="inquiry-phone" type="tel" autoComplete="tel" {...register("phone")} />
        </div>

        <div>
          <label htmlFor="inquiry-tour" className="mb-1 block text-sm font-medium text-heading">
            Preferred tour date <span className="font-normal text-muted">(optional)</span>
          </label>
          <Input id="inquiry-tour" type="date" min={new Date().toISOString().slice(0, 10)} {...register("tourDate")} />
        </div>

        <div>
          <label htmlFor="inquiry-message" className="mb-1 block text-sm font-medium text-heading">
            Message
          </label>
          <textarea
            id="inquiry-message"
            rows={4}
            className="w-full resize-y rounded-md border border-line bg-surface px-3.5 py-2.5 text-[15px] text-heading placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            aria-invalid={Boolean(errors.message) || undefined}
            {...register("message")}
          />
          {errors.message ? <p className="mt-1 text-xs text-danger">{errors.message.message}</p> : null}
        </div>

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-body">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
            {...register("consent")}
          />
          <span>
            I agree to be contacted about this property and accept the{" "}
            <Link to="/terms" className="font-medium text-brand-strong hover:underline">
              terms of use
            </Link>
            .
          </span>
        </label>
        {errors.consent ? <p className="text-xs text-danger">{errors.consent.message}</p> : null}
      </div>

      <Button type="submit" className="mt-4 w-full" loading={isSubmitting}>
        <Send className="h-4 w-4" aria-hidden="true" />
        Send inquiry
      </Button>
    </form>
  );
}