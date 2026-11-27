import { Bell, Heart, House, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export function SavedSearchTeaser() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="section-pad bg-surface" aria-labelledby="saved-search-heading">
      <div className="shell-container">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-strong">
              For buyers &amp; renters
            </p>
            <h2
              id="saved-search-heading"
              className="mt-3 text-[28px] font-bold leading-tight text-heading sm:text-[36px]"
            >
              Save homes and searches
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-body">
              Build a shortlist you can return to, and let Haven watch for new homes that fit.
            </p>

            <ul className="mt-8 space-y-5">
              <li className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-danger-tint text-danger">
                  <Heart className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-heading">Favorites</h3>
                  <p className="mt-1 text-sm leading-relaxed text-body">
                    Tap the heart on any home to keep it. Your shortlist stays with your account on
                    every device.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-heading">Saved searches</h3>
                  <p className="mt-1 text-sm leading-relaxed text-body">
                    Save a search and get alerts when new homes match. Adjust the filters any time,
                    or turn alerts off.
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
              {user ? (
                <>
                  <Button asChild size="lg">
                    <Link to="/favorites">View favorites</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/saved-searches">View saved searches</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link to="/register">Create free account</Link>
                  </Button>
                  <p className="text-sm text-body">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-brand-strong hover:underline">
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="relative isolate lg:col-span-7">
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-br from-brand-soft via-transparent to-transparent" />
            <div
              aria-hidden="true"
              className="relative rounded-2xl border border-line bg-canvas p-6 sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-5">
                <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm sm:col-span-3">
                  <div className="relative h-40 bg-gradient-to-br from-brand-soft via-canvas to-brand/20">
                    <House className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-brand-strong/40" />
                    <span className="absolute left-3 top-3 rounded-pill bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-heading shadow-xs">
                      For sale
                    </span>
                    <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-sm">
                      <Heart className="h-4 w-4 fill-danger text-danger" />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-lg font-bold text-heading">$785,000</p>
                    <p className="mt-1 text-sm text-body">3 bd · 2 ba · 1,450 sqft</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <MapPin className="h-3.5 w-3.5" />
                      Park Slope, Brooklyn
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-5 sm:col-span-2">
                  <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-md bg-brand-soft text-brand-strong inline-flex items-center justify-center">
                        <Search className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-heading">Brooklyn homes</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-pill border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-body">
                        2+ beds
                      </span>
                      <span className="rounded-pill border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-body">
                        Under $800k
                      </span>
                      <span className="rounded-pill border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-body">
                        For sale
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                      <span className="flex items-center gap-1.5">
                        <Bell className="h-4 w-4 text-brand-strong" />
                        <span className="text-xs font-medium text-heading">Alerts on</span>
                      </span>
                      <span className="relative h-5 w-9 rounded-pill bg-brand">
                        <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-surface shadow-xs" />
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-xs font-semibold text-success">3 new matches</span>
                    </div>
                    <p className="mt-1 text-xs text-body">This week in Brooklyn</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}