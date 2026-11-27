import useEmblaCarousel from "embla-carousel-react";
import {
  Armchair,
  ArrowUpRight,
  Briefcase,
  Building2,
  Castle,
  ChevronLeft,
  ChevronRight,
  Home,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PropertyType {
  name: string;
  href: string;
  image: string;
}

interface PropertyTypeCarouselProps {
  types: PropertyType[];
  counts: Map<string, number>;
}

const typeIcons: Record<string, LucideIcon> = {
  apartment: Building2,
  house: Home,
  villa: Castle,
  studio: Armchair,
  office: Briefcase,
  shop: Store,
};

function iconFor(name: string): LucideIcon {
  return typeIcons[name.toLowerCase()] ?? Building2;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function secondaryLabel(count: number | undefined) {
  if (typeof count !== "number") return "View listings";
  return `${count.toLocaleString("en-US")} ${count === 1 ? "home" : "homes"}`;
}

export function PropertyTypeCarousel({ types, counts }: PropertyTypeCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: "auto",
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
    <div
      role="region"
      aria-roledescription="carousel"
      aria-labelledby="property-types-heading"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-5">
          {types.map((type, index) => {
            const Icon = iconFor(type.name);
            const count = counts.get(type.name.toLowerCase());

            return (
              <div
                key={type.name}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${types.length}`}
                className="min-w-0 shrink-0 grow-0 basis-[85%] pl-5 sm:basis-1/2 lg:basis-1/4"
              >
                <Link
                  to={type.href}
                  className="group block overflow-hidden rounded-md border border-line bg-surface transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden">
                    <img
                      src={type.image}
                      alt={`${type.name} listings`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent"
                      aria-hidden="true"
                    />
                    <span className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-white backdrop-blur">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white">{type.name}</span>
                        <span className="mt-0.5 block text-xs text-white/75">
                          {secondaryLabel(count)}
                        </span>
                      </span>
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/70 backdrop-blur transition-all duration-200 group-hover:translate-x-0.5 group-hover:bg-white/25 group-hover:text-white group-focus-visible:translate-x-0.5 group-focus-visible:bg-white/25 group-focus-visible:text-white">
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous property types"
          onClick={scrollPrev}
          disabled={!canPrev}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>

        {snapCount > 1 ? (
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Choose property types page"
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
          aria-label="Next property types"
          onClick={scrollNext}
          disabled={!canNext}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}