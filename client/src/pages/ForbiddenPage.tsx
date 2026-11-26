import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { roleHome } from "@/types/auth";

export function ForbiddenPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="section-pad">
      <div className="shell-container">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-warning-tint text-warning-text">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            403 · Permission denied
          </p>
          <h1 className="mt-2 text-[28px] font-bold leading-tight text-heading sm:text-[32px]">
            This area is for a different role
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            You are signed in as {user?.name ?? "a user"}, but this page requires different
            permissions. Use the link below to return to your own dashboard.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {user ? (
              <Button asChild>
                <Link to={roleHome(user.role)}>Go to my dashboard</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}