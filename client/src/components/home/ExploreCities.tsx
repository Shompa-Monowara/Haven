import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { useCityCounts } from "@/lib/queries/properties";

interface ExploreCity {
  name: string;
  image: string;
}

/** Fallback counts keep the section useful if the locations API is unavailable. */
const cities: ExploreCity[] = [
  {
    name: "New York",
    image:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Brooklyn",
    image:
      "https://images.unsplash.com/photo-1518235506717-e1ed3306a89b?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Los Angeles",
    image:
      "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Miami",
    image:
      "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=800&q=80",
  },
];

export function ExploreCities() {
  const { data, isPending } = useCityCounts();
  const apiCounts = new Map(
    (data ?? []).map((entry) => [entry.city.trim().toLowerCase(), entry.count]),
  );

  return (
    <section className="section-pad bg-canvas" aria-labelledby="explore-cities-heading">
      <div className="shell-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2
              id="explore-cities-heading"
              className="text-[28px] font-bold leading-tight sm:text-[32px]"
            >
              Explore cities
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-body">
              Start with a place, then compare neighborhoods, prices, and the size you need.
            </p>
          </div>
          <Link
            to="/properties"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
          >
            Search all cities
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {isPending ? (
          <div
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-busy="true"
            aria-label="Loading cities"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/3] w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {cities.map((city) => {
              const count = apiCounts.get(city.name.toLowerCase());

              return (
                <li key={city.name}>
                  <Link
                    to={`/properties?city=${encodeURIComponent(city.name)}`}
                    aria-label={`Explore homes in ${city.name}`}
                    className="group relative block overflow-hidden rounded-lg border border-line bg-surface transition-shadow duration-200 hover:shadow-md"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden">
                      <img
                        src={city.image}
                        alt={`${city.name} homes`}
                        width={800}
                        height={600}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                      <span className="absolute inset-x-0 bottom-0 p-4">
                        <span className="block font-display text-lg font-bold text-white">
                          {city.name}
                        </span>
                        {typeof count === "number" ? (
                          <span className="mt-0.5 block text-xs text-white/75">
                            {count.toLocaleString("en-US")} {count === 1 ? "home" : "homes"}
                          </span>
                        ) : null}
                        <span className="mt-2 hidden items-center gap-1.5 text-xs font-medium text-white sm:inline-flex">
                          <span className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            Explore homes
                          </span>
                          <ArrowRight
                            className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                            aria-hidden="true"
                          />
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}