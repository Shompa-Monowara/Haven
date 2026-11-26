import { ArrowLeft, Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const popularCities = ["New York", "Brooklyn", "Los Angeles", "Miami"];

export function NotFoundPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <div className="section-pad">
      <div className="shell-container">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-display text-[64px] font-bold leading-none text-brand sm:text-[80px]">404</p>
          <h1 className="mt-3 text-[28px] font-bold leading-tight text-heading sm:text-[32px]">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            The link may be outdated, or the listing may have been removed. Try a search instead.
          </p>

          <form
            className="mx-auto mt-6 flex max-w-md gap-2"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = query.trim();
              navigate(trimmed ? `/properties?q=${encodeURIComponent(trimmed)}` : "/properties");
            }}
          >
            <label htmlFor="not-found-search" className="sr-only">
              Search homes
            </label>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                id="not-found-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="City, neighborhood, or ZIP"
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Popular cities</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {popularCities.map((city) => (
              <li key={city}>
                <Link
                  to={`/properties?city=${encodeURIComponent(city)}`}
                  className="inline-flex rounded-pill border border-line bg-surface px-3.5 py-1.5 text-sm text-body transition-colors hover:border-brand hover:text-brand-strong"
                >
                  {city}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8">
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