import { Bell, FileText, ShieldCheck, Timer } from "lucide-react";
import { Link } from "react-router-dom";

export function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">Settings</h2>
        <p className="mt-1.5 text-sm text-body">
          Current platform policy and notification behavior. Changes are managed in configuration.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-brand-strong" aria-hidden="true" />
            <h3 className="font-semibold text-heading">Review targets</h3>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-line pb-2">
              <dt className="text-body">Standard review</dt>
              <dd className="font-medium text-heading">1 business day</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2">
              <dt className="text-body">Change request resubmission</dt>
              <dd className="font-medium text-heading">Same queue</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-body">Bulk approval</dt>
              <dd className="font-medium text-heading">Pending only</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-strong" aria-hidden="true" />
            <h3 className="font-semibold text-heading">Rejection categories</h3>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-body">
            <li>Incomplete information</li>
            <li>Poor photos</li>
            <li>Inaccurate pricing</li>
            <li>Duplicate listing</li>
            <li>Policy violation</li>
          </ul>
          <p className="mt-3 text-xs text-muted">
            Reject and request-changes decisions require one of these categories.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-strong" aria-hidden="true" />
            <h3 className="font-semibold text-heading">Notifications</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-body">
            <li>Listing decisions email the agent and appear in their listing status.</li>
            <li>Saved search digests run hourly and respect each search frequency.</li>
            <li>Chat messages notify online users in real time and fall back to email when offline.</li>
            <li>Inquiries appear in the agent’s leads inbox immediately.</li>
          </ul>
          <p className="mt-3 text-xs text-muted">
            Email currently uses the development console transport. Configure a provider before launch.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-strong" aria-hidden="true" />
            <h3 className="font-semibold text-heading">Public policy pages</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/privacy" className="rounded-pill border border-line px-3 py-1.5 text-sm text-heading hover:border-brand">
              Privacy
            </Link>
            <Link to="/terms" className="rounded-pill border border-line px-3 py-1.5 text-sm text-heading hover:border-brand">
              Terms
            </Link>
            <Link to="/faq" className="rounded-pill border border-line px-3 py-1.5 text-sm text-heading hover:border-brand">
              FAQ
            </Link>
            <Link to="/contact" className="rounded-pill border border-line px-3 py-1.5 text-sm text-heading hover:border-brand">
              Contact
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}