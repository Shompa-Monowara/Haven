import { ArrowLeft, BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/ui/logo";
import { Seo } from "@/components/seo/Seo";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const trustPoints = [
  { icon: ShieldCheck, label: "Listings reviewed before they go live" },
  { icon: BadgeCheck, label: "Verified agents with clear response times" },
  { icon: Sparkles, label: "Favorites and saved searches that follow you" },
];

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[55fr_45fr]">
      <Seo title={`${title} — Haven`} description={subtitle} path="/login" noIndex />
      <div className="flex flex-col px-5 py-7 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="Haven home">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-body transition-colors hover:text-heading"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to site
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[30px] font-bold leading-tight text-heading sm:text-[34px]">{title}</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-body">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>

        <p className="text-xs text-muted">
          By continuing you agree to our{" "}
          <Link to="/terms" className="underline hover:text-heading">
            terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-heading">
            privacy policy
          </Link>
          .
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <img
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80"
          alt="Sunlit living room with large windows"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <blockquote className="max-w-md">
            <p className="font-display text-[26px] font-semibold leading-snug">
              &ldquo;We found our apartment in nine days, and the agent answered every message the
              same afternoon.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-white/70">Priya &amp; Sam, Brooklyn</footer>
          </blockquote>

          <ul className="mt-10 space-y-3 border-t border-white/15 pt-6">
            {trustPoints.map((point) => (
              <li key={point.label} className="flex items-center gap-3 text-sm text-white/75">
                <point.icon className="h-4 w-4 text-brand" aria-hidden="true" />
                {point.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}