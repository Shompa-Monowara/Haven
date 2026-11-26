import { ArrowRight, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";

import {
  PropertyCard,
  PropertyCardSkeleton,
} from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { useFeaturedProperties } from "@/lib/queries/properties";

export function FeaturedListings() {
  const { data, isPending, isError, refetch, isRefetching } = useFeaturedProperties();
  const properties = data?.data ?? [];

  return (
    <section className="section-pad" aria-labelledby="featured-heading">
      <div className="shell-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-strong">
              Handpicked this week
            </p>
            <h2 id="featured-heading" className="mt-2 text-[28px] font-bold leading-tight sm:text-[32px]">
              Featured homes
            </h2>
            <p className="mt-2 text-[15px] text-body">
              A short list of reviewed homes worth a closer look, chosen across cities and price points.
            </p>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
          >
            View all listings
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8">
          {isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading featured homes">
              {Array.from({ length: 4 }).map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-line bg-surface p-8 text-center">
              <p className="font-medium text-heading">Featured homes could not load</p>
              <p className="mt-1 text-sm text-body">
                Check your connection and try again. The rest of the page still works.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
                loading={isRefetching}
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
            </div>
          ) : properties.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-canvas p-8 text-center">
              <p className="font-medium text-heading">Fresh listings are on the way</p>
              <p className="mt-1 text-sm text-body">
                New homes appear here as soon as they pass review. Browse everything available now.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/properties">Browse all homes</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}