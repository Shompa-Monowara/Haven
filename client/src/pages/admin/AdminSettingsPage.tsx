import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BellRing,
  FileText,
  HelpCircle,
  Inbox,
  Mail,
  MessageCircle,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}

function SettingsCard({ icon: Icon, title, description, children }: SettingsCardProps) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-line bg-surface p-5">
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

interface PolicyLinkProps {
  to: string;
  icon: LucideIcon;
  name: string;
  description: string;
}

function PolicyLink({ to, icon: Icon, name, description }: PolicyLinkProps) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-md border border-line bg-canvas/60 p-3 transition-colors hover:border-brand hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface text-brand-strong ring-1 ring-line">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-heading">{name}</span>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-brand-strong motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-body">{description}</span>
      </span>
    </Link>
  );
}

const reviewTargets = [
  { label: "Standard review", value: "1 business day" },
  { label: "Change request resubmission", value: "Same queue" },
  { label: "Bulk approval", value: "Pending only" },
];

const rejectionCategories = [
  "Incomplete information",
  "Poor photos",
  "Inaccurate pricing",
  "Duplicate listing",
  "Policy violation",
];

interface NotificationRow {
  icon: LucideIcon;
  channel: string;
  text: string;
}

const notifications: NotificationRow[] = [
  {
    icon: Mail,
    channel: "Email",
    text: "Listing decisions email the agent and appear in their listing status.",
  },
  {
    icon: BellRing,
    channel: "Digest",
    text: "Saved search digests run hourly and respect each search frequency.",
  },
  {
    icon: MessageCircle,
    channel: "Real-time",
    text: "Chat messages notify online users in real time and fall back to email when offline.",
  },
  {
    icon: Inbox,
    channel: "In-app",
    text: "Inquiries appear in the agent’s leads inbox immediately.",
  },
];

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

export function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">Settings</h2>
          <Badge variant="outline">Read-only</Badge>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-body">
          Platform policy and notification behavior. These values are managed in server configuration
          and cannot be edited here.
        </p>
      </div>

      <div
        role="status"
        className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-tint p-4"
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
            Email currently uses the development console transport. Configure a provider before
            launch.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsCard
          icon={Timer}
          title="Review targets"
          description="Expected turnaround for moderation steps."
        >
          <dl className="divide-y divide-line">
            {reviewTargets.map((target) => (
              <div
                key={target.label}
                className="flex items-center justify-between gap-4 py-2.5"
              >
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
          icon={ShieldCheck}
          title="Rejection categories"
          description="Required reasons for reject or request-changes decisions."
        >
          <ul className="flex flex-wrap gap-2">
            {rejectionCategories.map((category) => (
              <li key={category}>
                <Badge variant="neutral" className="normal-case tracking-normal">
                  {category}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Reject and request-changes decisions require one of these categories.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={Bell}
          title="Notifications"
          description="How key updates reach people."
        >
          <ul className="divide-y divide-line">
            {notifications.map((row) => {
              const Icon = row.icon;
              return (
                <li
                  key={row.channel}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <Badge variant="neutral" className="normal-case tracking-normal">
                      {row.channel}
                    </Badge>
                    <p className="mt-1.5 text-sm leading-relaxed text-body">{row.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </SettingsCard>

        <SettingsCard
          icon={FileText}
          title="Public policy pages"
          description="Public pages linked from the site footer."
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
    </div>
  );
}