import { useQuery } from "@tanstack/react-query";
import { MapPinned } from "lucide-react";
import { Suspense, lazy, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { DeferredSection } from "@/components/ui/deferred-section";
import { api } from "@/lib/api";
import type { PropertySummary } from "@/types/property";

const PropertyMap = lazy(() => import("@/components/search/PropertyMap"));

const mapSkeleton = (
  <div
    className="h-[360px] w-full animate-pulse rounded-lg border border-line bg-line/40 md:h-[420px]"
    aria-hidden="true"
  />
);

const criteria = [
  "City and neighborhood",
  "Price range",
  "Property type",
  "Living area and lot size",
];

export function MapPreview() {
  const [tileFailed, setTileFailed] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const listings = useQuery({
    queryKey: ["properties", "map-preview"],
    queryFn: () => api.get<PropertySummary[]>("/properties?limit=12&sort=newest"),
    staleTime: 60_000,
  });

  // Stable reference: the cluster layer adds markers in chunks and restarts when
  // the array identity changes, so memoize the filtered list.
  const properties = useMemo(
    () => (listings.data ?? []).filter((property) => property.location),
    [listings.data],
  );

  return (
    <section className="section-pad bg-surface" aria-labelledby="map-preview-heading">
      <div className="shell-container grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-strong">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Map search
          </p>
          <h2
            id="map-preview-heading"
            className="mt-3 text-[28px] font-bold leading-tight sm:text-[32px]"
          >
            Search homes on the map
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-body">
            Narrow results by the details that matter, then see matching homes where they actually
            are. Every marker opens the full listing.
          </p>

          <ul className="mt-5 space-y-2">
            {criteria.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-body">
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link to="/properties?view=map">Open map search</Link>
            </Button>
            <Link
              to="/properties"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
            >
              Browse the list instead
            </Link>
          </div>
        </div>

        <div className="relative">
          {listings.isPending ? (
            <div aria-busy="true" aria-label="Loading map preview">
              {mapSkeleton}
            </div>
          ) : listings.isError ? (
            <div className="flex h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 text-center md:h-[420px]">
              <p className="font-medium text-heading">Map preview unavailable</p>
              <p className="mt-1 text-sm text-body">
                The map could not load. You can still browse every home in the list.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => listings.refetch()}>
                  Try again
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/properties">View list</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative h-[360px] overflow-hidden rounded-lg border border-line md:h-[420px]">
              <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-md border border-line bg-surface/95 px-2.5 py-1 text-xs font-medium text-heading shadow-sm">
                {properties.length} {properties.length === 1 ? "home" : "homes"} on the map
              </div>
              <DeferredSection fallback={mapSkeleton}>
                <div className="h-[360px] md:h-[420px]">
                  <Suspense fallback={mapSkeleton}>
                    <PropertyMap
                      key={mapKey}
                      properties={properties}
                      activeId={null}
                      onActivate={() => undefined}
                      onMoveEnd={() => undefined}
                      shouldFit
                      fitKey="map-preview"
                      onTileFailure={() => setTileFailed(true)}
                      emptyView={{ lat: 40.7128, lng: -74.006, zoom: 10 }}
                      scrollWheelZoom={false}
                    />
                  </Suspense>
                </div>
              </DeferredSection>

              {tileFailed ? (
                <div className="absolute inset-0 z-[800] flex flex-col items-center justify-center rounded-lg bg-surface/95 px-6 text-center">
                  <p className="font-medium text-heading">Map unavailable</p>
                  <p className="mt-1 text-sm text-body">
                    Tiles could not load. You can retry or browse the list view.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTileFailed(false);
                        setMapKey((key) => key + 1);
                      }}
                    >
                      Try again
                    </Button>
                    <Button asChild variant="ghost">
                      <Link to="/properties">View list</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}