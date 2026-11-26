import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { roleHome, roleLabels, type Role } from "@/types/auth";

export function DashboardNotFound({ role }: { role: Role }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-brand-strong">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-2xl font-bold text-heading">This page doesn&apos;t exist</h2>
      <p className="mt-2 text-sm leading-relaxed text-body">
        The {roleLabels[role].toLowerCase()} page or link you followed is not available. Head back to
        your dashboard or browse homes.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to={roleHome(role)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/properties">Browse homes</Link>
        </Button>
      </div>
    </div>
  );
}