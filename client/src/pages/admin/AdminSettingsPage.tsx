import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Bell,
  BellRing,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  Mail,
  MessageCircle,
  RotateCcw,
  Server,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import {
  Controller,
  useForm,
  type Resolver,
  type UseFormSetError,
} from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/api";
import { useAdminSettings, useUpdateAdminSettings } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";
import type { PlatformSettings, PlatformSettingsPatch, SystemStatus } from "@/types/admin";

const settingsSchema = z.object({
  standardReviewBusinessDays: z
    .number()
    .int("Enter a whole number of business days")
    .min(1, "Use at least 1 business day")
    .max(10, "Use at most 10 business days"),
  listingDecisionEmails: z.boolean(),
  offlineMessageEmails: z.boolean(),
  savedSearchDigests: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const rejectionCategories = [
  "Incomplete information",
  "Poor photos",
  "Inaccurate pricing",
  "Duplicate listing",
  "Policy violation",
];

const readOnlyTargets = [
  { label: "Change request resubmission", value: "Same queue" },
  { label: "Bulk approval", value: "Pending only" },
];

interface PolicyLinkProps {
  to: string;
  icon: LucideIcon;
  name: string;
  description: string;
}

const policyLinks: PolicyLinkProps[] = [
  {
    to: "/privacy",
    icon: ShieldCheck,
    name: "Privacy",
    description: "How Haven handles personal data.",
  },
  {
    to: "/terms",
    icon: FileText,
    name: "Terms",
    description: "The rules for using Haven.",
  },
  {
    to: "/faq",
    icon: HelpCircle,
    name: "FAQ",
    description: "Answers for buyers, renters, and agents.",
  },
  {
    to: "/contact",
    icon: Mail,
    name: "Contact",
    description: "Reach the Haven team.",
  },
];

function toFormValues(settings: PlatformSettings): SettingsFormValues {
  return {
    standardReviewBusinessDays: settings.review.standardReviewBusinessDays,
    listingDecisionEmails: settings.notifications.listingDecisionEmails,
    offlineMessageEmails: settings.notifications.offlineMessageEmails,
    savedSearchDigests: settings.notifications.savedSearchDigests,
  };
}

function environmentLabel(environment: SystemStatus["environment"]) {
  if (environment === "production") return "Production";
  if (environment === "development") return "Development";
  return "Test";
}

function applyServerFieldErrors(
  error: ApiClientError,
  setError: UseFormSetError<SettingsFormValues>,
) {
  if (!Array.isArray(error.details)) return;

  for (const detail of error.details) {
    if (!detail || typeof detail !== "object") continue;
    const path = "path" in detail ? String((detail as { path: unknown }).path) : "";
    const message = "message" in detail ? String((detail as { message: unknown }).message) : "";
    if (!message) continue;

    if (path.includes("standardReviewBusinessDays")) {
      setError("standardReviewBusinessDays", { message });
    } else if (path.includes("listingDecisionEmails")) {
      setError("listingDecisionEmails", { message });
    } else if (path.includes("offlineMessageEmails")) {
      setError("offlineMessageEmails", { message });
    } else if (path.includes("savedSearchDigests")) {
      setError("savedSearchDigests", { message });
    }
  }
}

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

function SettingsCard({ icon: Icon, title, description, className, children }: SettingsCardProps) {
  return (
    <section className={cn("flex flex-col rounded-lg border border-line bg-surface p-5", className)}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-heading">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

interface SwitchRowProps {
  id: string;
  label: string;
  description: string;
  channel: string;
  icon: LucideIcon;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}

function SwitchRow({
  id,
  label,
  description,
  channel,
  icon: Icon,
  checked,
  onChange,
  disabled = false,
  error,
}: SwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral" className="normal-case tracking-normal">
              {channel}
            </Badge>
            <label htmlFor={id} className="text-sm font-medium text-heading">
              {label}
            </label>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-body">{description}</p>
          <p className="mt-1 text-xs text-danger" aria-live="polite">
            {error ?? ""}
          </p>
        </div>
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
          checked ? "bg-brand-strong" : "bg-line",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-surface shadow-xs transition-transform motion-reduce:transition-none",
            checked ? "translate-x-6" : "translate-x-1",
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="min-w-0 text-sm text-body">{label}</dt>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "success" | "warning" | "neutral"; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1 text-xs font-medium text-heading">
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-muted",
        )}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

function PolicyLink({ to, icon: Icon, name, description }: PolicyLinkProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-md border border-line bg-canvas/60 p-3 transition-colors hover:border-brand hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface text-brand-strong ring-1 ring-line">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-heading">{name}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-body">{description}</span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-brand-strong motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-3 w-48 max-w-full" />
              </div>
            </div>
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSettingsPage() {
  const settingsQuery = useAdminSettings();

  if (settingsQuery.isPending) return <SettingsSkeleton />;

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <p className="font-medium text-heading">Settings could not load</p>
        <p className="mt-1 text-sm text-body">Check the connection and try again.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => settingsQuery.refetch()}
          loading={settingsQuery.isFetching}
        >
          Try again
        </Button>
      </div>
    );
  }

  return <SettingsForm settings={settingsQuery.data.settings} status={settingsQuery.data.status} />;
}

function SettingsForm({ settings, status }: { settings: PlatformSettings; status: SystemStatus }) {
  const updateSettings = useUpdateAdminSettings();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsFormValues>,
    defaultValues: toFormValues(settings),
  });
  const isDirty = form.formState.isDirty;
  const isSaving = updateSettings.isPending;

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const onSubmit = form.handleSubmit(async (values) => {
    const patch: PlatformSettingsPatch = {
      review: { standardReviewBusinessDays: values.standardReviewBusinessDays },
      notifications: {
        listingDecisionEmails: values.listingDecisionEmails,
        offlineMessageEmails: values.offlineMessageEmails,
        savedSearchDigests: values.savedSearchDigests,
      },
    };

    try {
      const result = await updateSettings.mutateAsync(patch);
      form.reset(toFormValues(result.settings));
      toast.success("Settings saved");
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        applyServerFieldErrors(error, form.setError);
      } else {
        toast.error("Settings could not be saved. Please try again.");
      }
    }
  });

  return (
    <form id="settings-form" onSubmit={onSubmit} className={cn("space-y-6", isDirty && "pb-28")}>
      <div>
        <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">Settings</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-body">
          Manage review targets and notification behavior for the platform.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <SettingsCard
          icon={Timer}
          title="Review targets"
          description="Expected turnaround for moderation steps."
        >
          <div>
            <label htmlFor="standard-review-days" className="text-sm text-body">
              Standard review
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <Input
                id="standard-review-days"
                type="number"
                min={1}
                max={10}
                step={1}
                inputMode="numeric"
                disabled={isSaving}
                aria-invalid={Boolean(form.formState.errors.standardReviewBusinessDays)}
                aria-describedby="standard-review-days-hint standard-review-days-error"
                className="h-10 w-24"
                {...form.register("standardReviewBusinessDays", { valueAsNumber: true })}
              />
              <p id="standard-review-days-hint" className="text-xs text-muted">
                1–10 business days
              </p>
            </div>
            <p
              id="standard-review-days-error"
              className="mt-1 text-xs text-danger"
              aria-live="polite"
            >
              {form.formState.errors.standardReviewBusinessDays?.message ?? ""}
            </p>
          </div>

          <dl className="mt-4 divide-y divide-line">
            {readOnlyTargets.map((target) => (
              <div key={target.label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="min-w-0 text-sm text-body">{target.label}</dt>
                <dd className="shrink-0">
                  <Badge variant="neutral" className="normal-case tracking-normal">
                    {target.value}
                  </Badge>
                </dd>
              </div>
            ))}
          </dl>
        </SettingsCard>

        <SettingsCard
          icon={Bell}
          title="Notifications"
          description="Choose which automatic emails Haven sends."
        >
          <div className="divide-y divide-line">
            <Controller
              control={form.control}
              name="listingDecisionEmails"
              render={({ field }) => (
                <SwitchRow
                  id="setting-listing-decision-emails"
                  label="Listing decision emails"
                  description="Email the agent when a listing is approved, rejected, or needs changes."
                  channel="Email"
                  icon={Mail}
                  checked={field.value}
                  onChange={(checked) => field.onChange(checked)}
                  disabled={isSaving}
                  error={form.formState.errors.listingDecisionEmails?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="offlineMessageEmails"
              render={({ field }) => (
                <SwitchRow
                  id="setting-offline-message-emails"
                  label="Offline message emails"
                  description="Email the recipient when they are offline and a new chat message arrives."
                  channel="Real-time"
                  icon={MessageCircle}
                  checked={field.value}
                  onChange={(checked) => field.onChange(checked)}
                  disabled={isSaving}
                  error={form.formState.errors.offlineMessageEmails?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="savedSearchDigests"
              render={({ field }) => (
                <SwitchRow
                  id="setting-saved-search-digests"
                  label="Saved search digests"
                  description="Send daily and weekly digests when saved searches have new matches."
                  channel="Digest"
                  icon={BellRing}
                  checked={field.value}
                  onChange={(checked) => field.onChange(checked)}
                  disabled={isSaving}
                  error={form.formState.errors.savedSearchDigests?.message}
                />
              )}
            />
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-line bg-canvas px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-body">
              In-app notifications are always created. Password reset and contact emails are always
              sent, regardless of these settings.
            </p>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={ShieldCheck}
          title="Rejection categories"
          description="Reject and request-changes decisions require one of these categories."
        >
          <ul className="flex flex-wrap gap-2">
            {rejectionCategories.map((category) => (
              <li key={category}>
                <Badge variant="outline" className="normal-case tracking-normal">
                  {category}
                </Badge>
              </li>
            ))}
          </ul>
        </SettingsCard>

        <SettingsCard
          icon={Server}
          title="System status"
          description="Read-only environment and delivery checks."
        >
          <dl className="divide-y divide-line">
            <StatusRow label="Email delivery">
              <StatusPill tone={status.email.configured ? "success" : "warning"}>
                {status.email.configured ? "Connected" : "Not configured"}
              </StatusPill>
            </StatusRow>
            <StatusRow label="Image storage">
              <StatusPill
                tone={
                  status.storage.provider === "cloudinary"
                    ? "success"
                    : status.environment === "production"
                      ? "warning"
                      : "neutral"
                }
              >
                {status.storage.provider === "cloudinary"
                  ? "Cloudinary · Connected"
                  : status.environment === "production"
                    ? "Local disk · Not durable"
                    : "Local disk"}
              </StatusPill>
            </StatusRow>
            <StatusRow label="Environment">
              <StatusPill tone="neutral">{environmentLabel(status.environment)}</StatusPill>
            </StatusRow>
          </dl>

          {!status.email.configured ? (
            status.environment === "production" ? (
              <div
                role="status"
                className="mt-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-tint p-4"
              >
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-warning-text"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-warning-text">
                    Email delivery is not configured for production
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-warning-text/90">
                    Email currently uses the development console transport. Configure a provider
                    before launch.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-line bg-canvas p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-heading">
                    Email is using the development transport
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-body">
                    Emails are logged to the server console in this environment until an SMTP
                    provider is configured.
                  </p>
                </div>
              </div>
            )
          ) : null}

          {status.storage.provider === "local" && status.environment === "production" ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning-tint px-3 py-2.5">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-warning-text"
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-warning-text">
                Uploads are stored on local disk and will be lost when the service redeploys.
                Configure Cloudinary for durable media.
              </p>
            </div>
          ) : null}
        </SettingsCard>

        <SettingsCard
          icon={FileText}
          title="Public policy pages"
          description="Public pages linked from the site footer."
          className="lg:col-span-2"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {policyLinks.map((link) => (
              <PolicyLink
                key={link.to}
                to={link.to}
                icon={link.icon}
                name={link.name}
                description={link.description}
              />
            ))}
          </div>
        </SettingsCard>
      </div>

      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:left-[264px]">
          <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm text-body" role="status">
              You have unsaved changes
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Discard
              </Button>
              <Button type="submit" loading={isSaving}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}