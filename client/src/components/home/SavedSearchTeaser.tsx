import { Heart, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export function SavedSearchTeaser() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="section-pad bg-surface" aria-labelledby="saved-search-heading">
      <div className="shell-container">
        <div className="max-w-2xl">
          <h2
            id="saved-search-heading"
            className="text-[28px] font-bold leading-tight sm:text-[32px]"
          >
            Save homes and searches
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            Build a shortlist you can return to, and let Haven watch for new homes that fit.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="flex h-full flex-col rounded-lg border border-line bg-canvas p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-danger">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-heading">Favorites</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Tap the heart on any home to keep it. Your shortlist stays with your account on every
              device.
            </p>
            {user ? (
              <div className="mt-auto pt-5">
                <Button asChild variant="outline" className="w-fit">
                  <Link to="/favorites">View favorites</Link>
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex h-full flex-col rounded-lg border border-line bg-canvas p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
              <Search className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-heading">Saved searches</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Save a search and get alerts when new homes match. Adjust the filters any time, or turn
              alerts off.
            </p>
            {user ? (
              <div className="mt-auto pt-5">
                <Button asChild variant="outline" className="w-fit">
                  <Link to="/saved-searches">View saved searches</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {user ? null : (
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/register">Create free account</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}