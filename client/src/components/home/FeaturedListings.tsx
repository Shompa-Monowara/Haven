import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";

import {
  PropertyCard,
  PropertyCardSkeleton,
} from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { useFeaturedProperties } from "@/lib/queries/properties";
import { cn } from "@/lib/utils";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function FeaturedListings() {
  const { data, isPending, isError, refetch, isRefetching } = useFeaturedProperties();
  const properties = data?.data ?? [];

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop: false,
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;

    const sync = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setSnapCount(emblaApi.scrollSnapList().length);
    };

    sync();
    emblaApi.on("select", sync).on("reInit", sync);
    return () => {
      emblaApi.off("select", sync).off("reInit", sync);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev(prefersReducedMotion());
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext(prefersReducedMotion());
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index, prefersReducedMotion());
    },
    [emblaApi],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

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
            <div
              role="region"
              aria-roledescription="carousel"
              aria-labelledby="featured-heading"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex -ml-5">
                  {properties.map((property, index) => (
                    <div
                      key={property.id}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${index + 1} of ${properties.length}`}
                      className="min-w-0 shrink-0 grow-0 basis-full pl-5 sm:basis-1/2 lg:basis-1/4"
                    >
                      <PropertyCard property={property} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Previous featured homes"
                  onClick={scrollPrev}
                  disabled={!canPrev}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </Button>

                {snapCount > 1 ? (
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label="Choose featured homes page"
                  >
                    {Array.from({ length: snapCount }).map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Go to slide ${index + 1}`}
                        aria-current={index === selectedIndex ? "true" : undefined}
                        onClick={() => scrollTo(index)}
                        className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full transition-colors",
                            index === selectedIndex ? "bg-brand-strong" : "bg-line",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Next featured homes"
                  onClick={scrollNext}
                  disabled={!canNext}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
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