import { ArrowRight, CheckCircle2, Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

function PageShell({
  eyebrow,
  title,
  lede,
  path,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Seo title={`${title} — Haven`} description={lede} path={path} />
      <div className="border-b border-line bg-surface">
        <div className="shell-container py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-strong">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-[32px] font-bold leading-tight text-heading sm:text-[42px]">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-body">{lede}</p>
        </div>
      </div>
      <div className="shell-container py-10 sm:py-14">
        <div className="max-w-3xl space-y-8 text-[15px] leading-7 text-body">{children}</div>
      </div>
    </>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-5 text-sm leading-relaxed text-body">
      {children}
    </div>
  );
}

export function AboutPage() {
  return (
    <PageShell
      eyebrow="About Haven"
      title="A calmer way to find a home"
      path="/about"
      lede="Haven is a listing-first portal built around verified homes, local agents, and a moderation review behind every published property."
    >
      <section>
        <h2 className="text-xl font-bold text-heading">Why we built it</h2>
        <p className="mt-2">
          Most property searches are noisy: duplicate listings, stale prices, and photos that do not
          match the home. Haven keeps the catalog small enough to trust. Every listing is submitted by
          an agent, reviewed by our team, and published with a clear status history.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-heading">How review works</h2>
        <ul className="mt-3 space-y-3">
          {[
            "Agents complete a five-step listing wizard with at least three photos and a map pin.",
            "A moderator checks the details, photos, and pricing before publishing.",
            "Listings with missing or misleading information receive a specific change request.",
            "Approved listings appear in search, the map, and the public sitemap immediately.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-heading">What we value</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Clarity over volume",
              body: "Fewer, better listings with real details beat an endless feed.",
            },
            {
              title: "Accountable agents",
              body: "Verified agencies, response times, and moderation history are visible.",
            },
            {
              title: "Accessible by default",
              body: "Keyboard paths, readable contrast, and reduced-motion support are part of the build.",
            },
            {
              title: "Local expertise",
              body: "Neighborhood context comes from agents who work the area every day.",
            },
          ].map((value) => (
            <div key={value.title} className="rounded-lg border border-line p-4">
              <h3 className="font-semibold text-heading">{value.title}</h3>
              <p className="mt-1 text-sm leading-relaxed">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/properties">
            Browse homes
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/contact">Contact the team</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Talk to a person"
      path="/contact"
      lede="Questions about your account, a listing review, or working with Haven? Pick the channel that fits."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:support@haven.example"
          className="rounded-lg border border-line p-5 transition-colors hover:border-brand"
        >
          <Mail className="h-5 w-5 text-brand-strong" aria-hidden="true" />
          <h2 className="mt-2 font-semibold text-heading">General support</h2>
          <p className="mt-1 text-sm">support@haven.example</p>
          <p className="mt-2 text-xs text-muted">Replies within one business day.</p>
        </a>
        <a
          href="mailto:agents@haven.example"
          className="rounded-lg border border-line p-5 transition-colors hover:border-brand"
        >
          <ShieldCheck className="h-5 w-5 text-brand-strong" aria-hidden="true" />
          <h2 className="mt-2 font-semibold text-heading">Agent support</h2>
          <p className="mt-1 text-sm">agents@haven.example</p>
          <p className="mt-2 text-xs text-muted">Verification, listings, and lead questions.</p>
        </a>
        <a
          href="tel:+18005550142"
          className="rounded-lg border border-line p-5 transition-colors hover:border-brand"
        >
          <Phone className="h-5 w-5 text-brand-strong" aria-hidden="true" />
          <h2 className="mt-2 font-semibold text-heading">Phone</h2>
          <p className="mt-1 text-sm">(800) 555-0142</p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Mon–Fri, 9am–6pm ET
          </p>
        </a>
        <div className="rounded-lg border border-line p-5">
          <MapPin className="h-5 w-5 text-brand-strong" aria-hidden="true" />
          <h2 className="mt-2 font-semibold text-heading">Office</h2>
          <p className="mt-1 text-sm">
            14 Harbor Street, Suite 300
            <br />
            Brooklyn, NY 11201
          </p>
        </div>
      </div>

      <Callout>
        For a specific home, use the inquiry form or “Message agent” button on the listing page. That
        keeps the conversation with the listing’s agent and preserves the property context.
      </Callout>
    </PageShell>
  );
}

const faqGroups: Array<{
  title: string;
  items: Array<{ question: string; answer: string }>;
}> = [
  {
    title: "Buying",
    items: [
      {
        question: "How do I arrange a viewing?",
        answer:
          "Open a listing and use the inquiry form or “Message agent” button. The agent confirms a time and keeps the property details in the thread.",
      },
      {
        question: "Why can’t I see a listing I saved?",
        answer:
          "A home may have been archived, or the agent account may be suspended. Archived homes stay available by direct link but leave search and sitemaps.",
      },
    ],
  },
  {
    title: "Renting",
    items: [
      {
        question: "How do I know a rental is still available?",
        answer:
          "Listings are reviewed before publishing and removed when they are no longer offered. If a home no longer appears in search, it is no longer available.",
      },
      {
        question: "How is rent shown?",
        answer:
          "Rental prices always include the period (monthly, weekly, or nightly) on cards, the detail page, and the map, so you can compare like for like.",
      },
    ],
  },
  {
    title: "Listing",
    items: [
      {
        question: "How long does listing review take?",
        answer:
          "Most listings are reviewed within one business day. Listings with missing photos, an incomplete address, or unclear pricing receive a specific change request.",
      },
      {
        question: "Can I edit a listing after it is published?",
        answer:
          "Cosmetic edits publish immediately. Material changes such as price, address, photos, or property type send the listing back for review.",
      },
      {
        question: "How do I report a listing?",
        answer:
          "Email support@haven.example with the listing link and the issue. Moderators can request changes, reject, or archive a listing and record the reason.",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        question: "Do I need an account to browse?",
        answer:
          "No. Search, filters, the map, the agent directory, and listing details are public. Saving homes, saved searches, inquiries, and chat require a free account.",
      },
      {
        question: "How do saved search alerts work?",
        answer:
          "Choose instant, daily, or weekly alerts. Haven checks new approved listings against your filters and sends a digest when new matches appear.",
      },
    ],
  },
];

export function FaqPage() {
  return (
    <PageShell
      eyebrow="Help center"
      title="Frequently asked questions"
      path="/faq"
      lede="Short answers for buyers, renters, and agents using Haven."
    >
      <div className="space-y-8">
        {faqGroups.map((group) => (
          <section key={group.title} aria-labelledby={`faq-${group.title}`}>
            <h2 id={`faq-${group.title}`} className="text-xl font-bold text-heading">
              {group.title}
            </h2>
            <div className="mt-3 divide-y divide-line rounded-lg border border-line">
              {group.items.map((item) => (
                <details key={item.question} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none font-medium text-heading marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {item.question}
                      <span
                        className="text-muted transition-transform group-open:rotate-45"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Callout>
        Still stuck? Email{" "}
        <a href="mailto:support@haven.example" className="font-medium text-brand-strong hover:underline">
          support@haven.example
        </a>{" "}
        with your account email and a link to the page.
      </Callout>
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy policy"
      path="/privacy"
      lede="What Haven stores, why we store it, and the controls available to you."
    >
      <section>
        <h2 className="text-xl font-bold text-heading">What we collect</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Account details: name, email, phone, role, and a hashed password.</li>
          <li>Listing content submitted by agents, including photos and address details.</li>
          <li>Activity needed to run the service: favorites, saved searches, inquiries, messages.</li>
          <li>Moderation records: review decisions, reasons, and the administrator who made them.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold text-heading">How we use it</h2>
        <p className="mt-2">
          We use your information to operate search and accounts, deliver inquiries and chat, send the
          alerts you request, and keep listings accurate. We do not sell personal data.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-heading">Retention and cookies</h2>
        <p className="mt-2">
          Session cookies keep you signed in and rotate on refresh. Saved searches, favorites, and
          conversations remain until you delete them or close your account. Audit entries are retained
          to document moderation decisions.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-heading">Your choices</h2>
        <p className="mt-2">
          You can edit your profile, change alert preferences, remove favorites, delete saved searches,
          and sign out of all sessions by changing your password. For access or deletion requests,
          email{" "}
          <a href="mailto:privacy@haven.example" className="font-medium text-brand-strong hover:underline">
            privacy@haven.example
          </a>
          .
        </p>
      </section>
      <p className="text-xs text-muted">Last updated: November 2026</p>
    </PageShell>
  );
}

export function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of use"
      path="/terms"
      lede="The rules for using Haven as a buyer, renter, agent, or administrator."
    >
      <section>
        <h2 className="text-xl font-bold text-heading">Using Haven</h2>
        <p className="mt-2">
          Browse listings for personal use. Do not scrape, republish, or misrepresent listing content.
          Accounts are personal and must use accurate contact details.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-heading">Listings and agents</h2>
        <p className="mt-2">
          Agents are responsible for the accuracy of their submissions and for responding to inquiries.
          Haven reviews listings but does not guarantee a property’s condition, availability, or price.
          Material changes may require re-review before publishing.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-heading">Inquiries and chat</h2>
        <p className="mt-2">
          Inquiries and chat are for genuine property questions. Do not send spam, harassment, or
          unlawful content. Accounts that abuse messaging or listings may be suspended, and published
          listings from suspended agents are hidden from public search.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-heading">Moderation</h2>
        <p className="mt-2">
          Moderators may approve, request changes, reject, or archive listings and record the reason.
          Agents can edit and resubmit listings that receive a change request.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-heading">Contact</h2>
        <p className="mt-2">
          Questions about these terms:{" "}
          <a href="mailto:legal@haven.example" className="font-medium text-brand-strong hover:underline">
            legal@haven.example
          </a>
          .
        </p>
      </section>
    </PageShell>
  );
}

export function ListPropertyPage() {
  const user = useAuthStore((state) => state.user);
  const isAgent = user?.role === "agent";

  return (
    <PageShell
      eyebrow="For agents"
      title="List a home people can trust"
      path="/list-property"
      lede="Haven gives verified agents a focused listing workflow: five steps, autosaved drafts, and a clear review before publishing."
    >
      <section>
        <h2 className="text-xl font-bold text-heading">What you get</h2>
        <ul className="mt-3 space-y-3">
          {[
            "A five-step wizard with per-step validation and 30-second autosave.",
            "Drag-and-drop photo uploads with cover selection and alt text.",
            "Map pin placement and computed price per square foot.",
            "A submission timeline with changes-requested feedback.",
            "Leads inbox, saved buyer inquiries, and one-to-one chat.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <Callout>
        Listings need at least three photos, a complete address, and a map pin before they can be
        submitted. An administrator reviews every submission before it appears publicly.
      </Callout>

      <div className="flex flex-wrap gap-2">
        {isAgent ? (
          <Button asChild>
            <Link to="/agent/listings/new">
              Create a listing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : user ? (
          <>
            <p className="w-full text-sm text-body">
              Agent accounts manage listings. You are signed in as a {user.role}.
            </p>
            <Button asChild>
              <Link to="/contact">Talk to the team</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild>
              <Link to="/register">Create an agent account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </>
        )}
      </div>
    </PageShell>
  );
}