import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, CheckCircle2, Clock, MapPin, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

import { Seo } from "@/components/seo/Seo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError } from "@/lib/api";
import { useContactAgent, usePublicAgent } from "@/lib/queries/agents";
import { useAuthStore } from "@/stores/auth-store";
import { contactTopicLabels, contactTopics } from "@/types/agent";

const phoneAllowedChars = /^[+()\d\s.-]+$/;

function hasReasonablePhone(value: string) {
  if (!phoneAllowedChars.test(value)) return false;
  const digits = value.match(/\d/g)?.length ?? 0;
  return digits >= 7 && digits <= 20;
}

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(80, "Keep your name under 80 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Enter your email")
      .email("Enter a valid email address")
      .max(254),
    phone: z.string().trim().max(24).optional(),
    topic: z.enum(["buying", "renting", "selling", "valuation", "other"]),
    contactMethod: z.enum(["email", "phone"]),
    message: z
      .string()
      .trim()
      .min(20, "Add at least 20 characters")
      .max(2000, "Keep your message under 2,000 characters"),
    propertyId: z.string().optional(),
    consent: z.boolean().refine((value) => value === true, {
      message: "Accept the privacy policy to send your message",
    }),
    website: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.phone && !hasReasonablePhone(value.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Enter a valid phone number",
      });
    }

    if (value.contactMethod === "phone" && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Add a phone number for phone contact",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function fieldErrorId(field: keyof FormValues) {
  return `contact-${field}-error`;
}

export function ContactAgentPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePublicAgent(id);
  const contact = useContactAgent(id);
  const user = useAuthStore((state) => state.user);

  const [sentMinutes, setSentMinutes] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    mode: "onTouched",
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      topic: "buying",
      contactMethod: "email",
      message: "",
      propertyId: "",
      consent: false,
      website: "",
    },
  });

  // Prefill from the signed-in account once the session resolves, without
  // clobbering anything the visitor has already typed.
  useEffect(() => {
    if (!user || form.formState.isDirty) return;
    if (!form.getValues("name")) form.setValue("name", user.name);
    if (!form.getValues("email")) form.setValue("email", user.email);
    if (!form.getValues("phone") && user.phone) form.setValue("phone", user.phone);
  }, [user, form]);

  const agent = query.data?.agent;
  const listings = query.data?.listings ?? [];
  const firstName = agent?.name.split(" ")[0] ?? "the agent";
  const responseTime = agent?.responseTimeMinutes ?? 120;
  const messageLength = form.watch("message").length;
  const contactMethod = form.watch("contactMethod");

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      const result = await contact.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        topic: values.topic,
        contactMethod: values.contactMethod,
        message: values.message,
        propertyId: values.propertyId || undefined,
        consent: values.consent,
        website: values.website || undefined,
      });
      setSentMinutes(result.responseTimeMinutes);
      toast.success("Message sent");
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 400 && Array.isArray(error.details)) {
          let mapped = false;
          for (const detail of error.details as Array<{ path?: string; message?: string }>) {
            if (detail.path && detail.message) {
              form.setError(detail.path as keyof FormValues, { message: detail.message });
              mapped = true;
            }
          }
          if (mapped) {
            setFormError("Please fix the highlighted fields and try again.");
            return;
          }
        }

        if (error.status === 429) {
          setFormError("Too many messages, try again in a few minutes.");
          return;
        }

        setFormError(error.message);
        return;
      }

      setFormError("Your message could not be sent. Check your connection and try again.");
    }
  });

  if (query.isPending) {
    return (
      <div className="shell-container py-10" aria-busy="true" aria-label="Loading contact form">
        <Skeleton className="h-5 w-64" />
        <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:order-2 lg:col-span-5">
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
          <div className="lg:order-1 lg:col-span-7">
            <Skeleton className="h-[420px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !agent || !agent.verified) {
    return (
      <div className="shell-container py-16 text-center">
        <Seo
          title="Agent not found — Haven"
          description="This agent profile is unavailable."
          path={`/agents/${id ?? ""}/contact`}
          noIndex
        />
        <h1 className="text-2xl font-bold text-heading">Agent not found</h1>
        <p className="mt-2 text-sm text-body">
          This agent is not available for enquiries. They may have been removed or are not verified yet.
        </p>
        <Button asChild className="mt-4">
          <Link to="/agents">Browse agents</Link>
        </Button>
      </div>
    );
  }

  function resetForm() {
    setSentMinutes(null);
    setFormError(null);
    form.reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      topic: "buying",
      contactMethod: "email",
      message: "",
      propertyId: "",
      consent: false,
      website: "",
    });
  }

  return (
    <>
      <Seo
        title={`Contact ${agent.name} — Haven`}
        description={`Send ${agent.name} a message about buying, renting, or local market advice. Typical reply time is about ${responseTime} minutes.`}
        path={`/agents/${agent.id}/contact`}
        noIndex
      />

      <div className="border-b border-line bg-canvas">
        <div className="shell-container py-6 sm:py-8">
          <nav aria-label="Breadcrumb" className="text-sm text-body">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/agents" className="hover:text-heading hover:underline">
                  Agents
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  to={`/agents/${agent.id}`}
                  className="hover:text-heading hover:underline"
                >
                  {agent.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-muted">
                Contact
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="shell-container py-10">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:order-2 lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-lg border border-line bg-surface p-6">
                <div className="flex items-start gap-4">
                  <Avatar
                    name={agent.name}
                    src={agent.avatar ?? undefined}
                    size="xl"
                    className="h-24 w-24 text-3xl"
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-lg font-semibold text-heading">
                      <span className="truncate">{agent.name}</span>
                      {agent.verified ? (
                        <BadgeCheck
                          className="h-5 w-5 shrink-0 text-brand-strong"
                          aria-label="Verified agent"
                        />
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-body">{agent.agency}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-body">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Replies in ~{responseTime} min
                    </p>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-body">Active listings</dt>
                    <dd className="font-medium text-heading tabular">{agent.listingCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-body">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      Service areas
                    </dt>
                    <dd className="max-w-[60%] text-right font-medium text-heading">
                      {agent.serviceAreas.length ? agent.serviceAreas.join(", ") : "On request"}
                    </dd>
                  </div>
                </dl>

                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to={`/agents/${agent.id}`}>View full profile</Link>
                </Button>

                <div className="mt-5 border-t border-line pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                    What happens next
                  </p>
                  <ol className="mt-3 space-y-3 text-sm leading-relaxed text-body">
                    <li className="flex gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-strong">
                        1
                      </span>
                      Your message goes straight to {firstName}.
                    </li>
                    <li className="flex gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-strong">
                        2
                      </span>
                      You will get a reply by email, usually within {responseTime} minutes.
                    </li>
                    <li className="flex gap-2.5">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-strong">
                        3
                      </span>
                      You can continue the conversation in your Haven messages.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:order-1 lg:col-span-7">
            {sentMinutes !== null ? (
              <div
                className="rounded-lg border border-success/30 bg-success-tint p-6 sm:p-8"
                role="status"
              >
                <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
                <h1 className="mt-3 text-[24px] font-bold text-heading sm:text-[28px]">
                  Message sent
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-body">
                  We have sent {firstName} your message. You will hear back by email, usually within{" "}
                  {sentMinutes} minutes.
                </p>
                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <Button asChild>
                    <Link to="/properties">Browse homes</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/agents/${agent.id}`}>View {firstName}&apos;s profile</Link>
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-4 text-sm font-medium text-brand-strong underline hover:text-brand"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
                <h1 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
                  Contact {firstName}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-body">
                  Ask about a home, arrange a viewing, or get local market advice. {firstName} usually
                  replies in about {responseTime} minutes.
                </p>

                <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                  {formError ? (
                    <p
                      role="alert"
                      className="rounded-md bg-danger-tint px-3.5 py-2.5 text-sm text-danger"
                    >
                      {formError}
                    </p>
                  ) : null}

                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-heading">
                      Full name <span aria-hidden="true" className="text-danger">*</span>
                    </label>
                    <Input
                      id="contact-name"
                      autoComplete="name"
                      aria-required="true"
                      aria-invalid={Boolean(form.formState.errors.name) || undefined}
                      aria-describedby={form.formState.errors.name ? fieldErrorId("name") : undefined}
                      {...form.register("name")}
                    />
                    {form.formState.errors.name ? (
                      <p id={fieldErrorId("name")} role="alert" className="mt-1.5 text-xs text-danger">
                        {form.formState.errors.name.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-heading">
                        Email <span aria-hidden="true" className="text-danger">*</span>
                      </label>
                      <Input
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        aria-required="true"
                        aria-invalid={Boolean(form.formState.errors.email) || undefined}
                        aria-describedby={form.formState.errors.email ? fieldErrorId("email") : undefined}
                        {...form.register("email")}
                      />
                      {form.formState.errors.email ? (
                        <p id={fieldErrorId("email")} role="alert" className="mt-1.5 text-xs text-danger">
                          {form.formState.errors.email.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-heading">
                        Phone{" "}
                        <span className="font-normal text-muted">
                          {contactMethod === "phone" ? "(required)" : "(optional)"}
                        </span>
                      </label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+1 555 0100"
                        aria-required={contactMethod === "phone" || undefined}
                        aria-invalid={Boolean(form.formState.errors.phone) || undefined}
                        aria-describedby={form.formState.errors.phone ? fieldErrorId("phone") : undefined}
                        {...form.register("phone")}
                      />
                      {form.formState.errors.phone ? (
                        <p id={fieldErrorId("phone")} role="alert" className="mt-1.5 text-xs text-danger">
                          {form.formState.errors.phone.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-topic" className="mb-1.5 block text-sm font-medium text-heading">
                      I am interested in <span aria-hidden="true" className="text-danger">*</span>
                    </label>
                    <Select
                      id="contact-topic"
                      aria-required="true"
                      aria-invalid={Boolean(form.formState.errors.topic) || undefined}
                      aria-describedby={form.formState.errors.topic ? fieldErrorId("topic") : undefined}
                      {...form.register("topic")}
                    >
                      {contactTopics.map((topic) => (
                        <option key={topic} value={topic}>
                          {contactTopicLabels[topic]}
                        </option>
                      ))}
                    </Select>
                    {form.formState.errors.topic ? (
                      <p id={fieldErrorId("topic")} role="alert" className="mt-1.5 text-xs text-danger">
                        {form.formState.errors.topic.message}
                      </p>
                    ) : null}
                  </div>

                  {listings.length ? (
                    <div>
                      <label htmlFor="contact-property" className="mb-1.5 block text-sm font-medium text-heading">
                        Related listing <span className="font-normal text-muted">(optional)</span>
                      </label>
                      <Select id="contact-property" {...form.register("propertyId")}>
                        <option value="">No specific listing</option>
                        {listings.map((listing) => (
                          <option key={listing.id} value={listing.id}>
                            {listing.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : null}

                  <fieldset>
                    <legend className="mb-1.5 block text-sm font-medium text-heading">
                      Preferred contact method <span aria-hidden="true" className="text-danger">*</span>
                    </legend>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-heading">
                        <input
                          type="radio"
                          value="email"
                          className="h-4 w-4 accent-brand-strong"
                          {...form.register("contactMethod")}
                        />
                        Email
                      </label>
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-heading">
                        <input
                          type="radio"
                          value="phone"
                          className="h-4 w-4 accent-brand-strong"
                          {...form.register("contactMethod")}
                        />
                        Phone
                      </label>
                    </div>
                  </fieldset>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="contact-message" className="block text-sm font-medium text-heading">
                        Message <span aria-hidden="true" className="text-danger">*</span>
                      </label>
                      <span
                        id="contact-message-count"
                        className={messageLength > 2000 ? "text-xs text-danger" : "text-xs text-muted tabular"}
                      >
                        {messageLength}/2000
                      </span>
                    </div>
                    <Textarea
                      id="contact-message"
                      rows={5}
                      aria-required="true"
                      aria-invalid={Boolean(form.formState.errors.message) || undefined}
                      aria-describedby={
                        form.formState.errors.message
                          ? `contact-message-count ${fieldErrorId("message")}`
                          : "contact-message-count"
                      }
                      {...form.register("message")}
                    />
                    {form.formState.errors.message ? (
                      <p id={fieldErrorId("message")} role="alert" className="mt-1.5 text-xs text-danger">
                        {form.formState.errors.message.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="flex items-start gap-2.5 text-xs leading-relaxed text-body">
                      <Checkbox
                        className="mt-0.5"
                        aria-invalid={Boolean(form.formState.errors.consent) || undefined}
                        aria-describedby={
                          form.formState.errors.consent ? fieldErrorId("consent") : undefined
                        }
                        {...form.register("consent")}
                      />
                      <span>
                        I agree to be contacted by this agent about my enquiry and accept the{" "}
                        <Link to="/privacy" className="font-medium text-brand-strong hover:underline">
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </label>
                    {form.formState.errors.consent ? (
                      <p id={fieldErrorId("consent")} role="alert" className="mt-1.5 text-xs text-danger">
                        {form.formState.errors.consent.message}
                      </p>
                    ) : null}
                  </div>

                  {/* Honeypot: hidden from people and assistive tech; bots trip it. */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      {...form.register("website")}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    loading={form.formState.isSubmitting}
                    disabled={form.formState.isSubmitting}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Send message
                  </Button>

                  <p className="text-xs leading-relaxed text-muted">
                    We only use your details to connect you with this agent. See our{" "}
                    <Link to="/privacy" className="font-medium text-brand-strong hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
