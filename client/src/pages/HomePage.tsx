import { ArrowRight, ArrowUpRight, Heart, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { SearchPanel } from "@/components/home/SearchPanel";
import { ExploreCities } from "@/components/home/ExploreCities";
import { MapPreview } from "@/components/home/MapPreview";
import { HowItWorks } from "@/components/home/HowItWorks";
import { SavedSearchTeaser } from "@/components/home/SavedSearchTeaser";
import { AgentSpotlight } from "@/components/home/AgentSpotlight";
import { Testimonials } from "@/components/home/Testimonials";
import { Seo } from "@/components/seo/Seo";
import { api } from "@/lib/api";
import { usePublicAgents } from "@/lib/queries/agents";
import type { PropertySummary } from "@/types/property";
import { Button } from "@/components/ui/button";
import { DeferredSection } from "@/components/ui/deferred-section";

const FeaturedListings = lazy(() =>
  import("@/components/home/FeaturedListings").then((module) => ({
    default: module.FeaturedListings,
  })),
);

const propertyTypes = [
  {
    name: "Apartment",
    href: "/properties?propertyType=apartment",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "House",
    href: "/properties?propertyType=house",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Villa",
    href: "/properties?propertyType=villa",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Studio",
    href: "/properties?propertyType=studio",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Office",
    href: "/properties?propertyType=office",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Shop",
    href: "/properties?propertyType=shop",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
  },
];



const values = [
  {
    icon: ShieldCheck,
    title: "Verified listings",
    body: "Every listing is reviewed before it goes live, so photos, pricing, and details match the home.",
  },
  {
    icon: MapPin,
    title: "Local experts",
    body: "Work with agents who know the block, the commute, and the schools, not a call center.",
  },
  {
    icon: Heart,
    title: "Save and compare",
    body: "Shortlist homes, save searches, and pick up exactly where you left off on any device.",
  },
  {
    icon: MessageCircle,
    title: "Direct messaging",
    body: "Ask questions, share photos, and schedule viewings in one thread.",
  },
];

export function HomePage() {
  const heroRef = useRef<HTMLElement | null>(null);

  const listingsQuery = useQuery({
    queryKey: ["home", "stats", "listings"],
    queryFn: () => api.getPage<PropertySummary[]>("/properties?limit=1"),
    staleTime: 60_000,
  });
  const agentsQuery = usePublicAgents();

  const totalListings = listingsQuery.data?.meta.total;
  const verifiedAgents = agentsQuery.data?.filter((agent) => agent.verified).length;
  const averageResponse = agentsQuery.data?.length
    ? Math.round(
        agentsQuery.data.reduce((total, agent) => total + agent.responseTimeMinutes, 0) /
          agentsQuery.data.length,
      )
    : undefined;

  const stats = [
    {
      value: typeof totalListings === "number" ? totalListings.toLocaleString("en-US") : "—",
      label: "Active listings",
    },
    {
      value: typeof verifiedAgents === "number" ? verifiedAgents.toLocaleString("en-US") : "—",
      label: "Verified agents",
    },
    {
      value:
        typeof averageResponse === "number"
          ? averageResponse >= 120
            ? `${Math.round(averageResponse / 60)} hrs`
            : `${averageResponse} min`
          : "—",
      label: "Average response time",
    },
  ];

  // Pause the looping hero animations when the hero scrolls out of view.
  useEffect(() => {
    const element = heroRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          element.classList.toggle("hero-paused", !entry.isIntersecting);
        }
      },
      { threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const featuredFallback = (
    <section className="section-pad" aria-busy="true" aria-label="Loading featured homes">
      <div className="shell-container">
        <div className="h-8 w-56 animate-pulse rounded-md bg-line" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-md bg-line/60" />
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <>
      <Seo
        title="Haven — Find a home that fits your life"
        description="Search verified homes for sale and rent, compare neighborhoods, and connect directly with local agents."
        path="/"
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Haven",
          url: window.location.origin,
          potentialAction: {
            "@type": "SearchAction",
            target: `${window.location.origin}/properties?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <section
        ref={heroRef}
        className="relative -mt-20 flex min-h-[600px] items-end overflow-hidden bg-ink lg:min-h-[680px]"
      >
        <img
          src="/hero-home-1280.webp"
          srcSet="/hero-home-768.webp 768w, /hero-home-1280.webp 1280w"
          sizes="100vw"
          alt="Modern home with warm interior lighting at dusk"
          width={1280}
          height={853}
          {...({ fetchpriority: "high" } as Record<string, string>)}
          decoding="async"
          className="hero-kenburns absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/60 to-ink/85" />
        <div aria-hidden="true" className="hero-light pointer-events-none absolute inset-0" />

        <div className="shell-container relative z-10 pb-32 pt-32 md:pb-36 md:pt-36">
          <div className="max-w-3xl text-white">
            <p className="hero-reveal inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              Verified listings across 40+ cities
            </p>
            <h1 className="hero-reveal hero-reveal-1 mt-5 font-display text-[36px] font-bold leading-[1.05] tracking-[-0.01em] text-white sm:text-[44px] lg:text-[56px]">
              Find a home that fits your life.
            </h1>
            <p className="hero-reveal hero-reveal-2 mt-5 max-w-xl text-[17px] leading-[30px] text-white/80 sm:text-lg">
              Search verified listings, compare neighborhoods, and connect directly with local
              agents who know the market.
            </p>
          </div>
        </div>
      </section>

      <div className="hero-rise shell-container relative z-20 -mt-14 md:-mt-16">
        <SearchPanel />

        <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg bg-surface/0 py-2 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-baseline gap-2.5 rounded-lg border border-transparent px-1 py-2 sm:justify-center"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd className="flex items-baseline gap-2.5">
                <span className="font-display text-xl font-bold text-heading tabular">{stat.value}</span>
                <span className="text-sm text-body">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <DeferredSection fallback={featuredFallback}>
        <Suspense fallback={featuredFallback}>
          <FeaturedListings />
        </Suspense>
      </DeferredSection>

      <section className="pb-12 md:pb-16 lg:pb-24" aria-labelledby="property-types-heading">
        <div className="shell-container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 id="property-types-heading" className="text-[28px] font-bold leading-tight sm:text-[32px]">
                Browse by property type
              </h2>
              <p className="mt-2 text-[15px] text-body">
                Start with the shape of the space you need, then narrow by neighborhood and price.
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

          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {propertyTypes.map((type) => (
              <li key={type.name}>
                <Link
                  to={type.href}
                  className="group block overflow-hidden rounded-md border border-line bg-surface transition-shadow duration-200 hover:shadow-md"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden">
                    <img
                      src={type.image}
                      alt={`${type.name} listings`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                      <span>
                        <span className="block text-sm font-semibold text-white">{type.name}</span>
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 -translate-y-0.5 text-white/0 transition-all duration-200 group-hover:text-white"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ExploreCities />
      <MapPreview />
      <HowItWorks />
      <SavedSearchTeaser />
      <AgentSpotlight />
      <Testimonials />

      <section className="bg-canvas section-pad" aria-labelledby="why-heading">
        <div className="shell-container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="why-heading" className="text-[28px] font-bold leading-tight sm:text-[32px]">
              A calmer way to house hunt
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-body">
              Fewer dead ends, clearer information, and people who answer when you reach out.
            </p>
          </div>

          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <li key={value.title} className="rounded-lg border border-line bg-surface p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
                  <value.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-sans text-lg font-semibold text-heading">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{value.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ink py-16 md:py-20" aria-labelledby="cta-heading">
        <div className="shell-container flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 id="cta-heading" className="font-display text-[28px] font-bold leading-tight text-white sm:text-[32px]">
              Have a property to list?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
              Publish a listing in minutes, reach verified buyers, and manage every inquiry in one
              place. Every submission is reviewed before it goes live.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/list-property">List a property</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/contact">Talk to an agent</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}