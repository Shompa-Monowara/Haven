import { BadgeCheck, Clock, Mail, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { PropertyCard, PropertyCardSkeleton } from "@/components/property/PropertyCard";
import { Seo } from "@/components/seo/Seo";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAgent, usePublicAgents } from "@/lib/queries/agents";
import { ApiClientError } from "@/lib/api";

type AgentSort = "listings" | "recent" | "name";

const agentSortOptions: Array<{ value: AgentSort; label: string }> = [
  { value: "listings", label: "Most listings" },
  { value: "recent", label: "Recently active" },
  { value: "name", label: "A–Z" },
];

export function AgentsPage() {
  const { data, isPending, isError, refetch } = usePublicAgents();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");
  const [sort, setSort] = useState<AgentSort>("listings");

  const cities = useMemo(() => {
    const unique = new Set<string>();
    for (const agent of data ?? []) {
      for (const area of agent.serviceAreas) unique.add(area);
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const agents = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = (data ?? []).filter((agent) => {
      const matchesTerm =
        !term ||
        [agent.name, agent.agency, ...agent.serviceAreas].join(" ").toLowerCase().includes(term);
      const matchesCity =
        city === "all" ||
        agent.serviceAreas.some((area) => area.toLowerCase() === city.toLowerCase());
      return matchesTerm && matchesCity;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") {
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
      }
      return b.listingCount - a.listingCount;
    });
  }, [data, q, city, sort]);

  return (
    <>
      <Seo
        title="Find a local agent — Haven"
        description="Browse verified Haven agents by name, agency, or service area. See their active listings and typical response time."
        path="/agents"
      />
      <div className="border-b border-line bg-surface">
        <div className="shell-container py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-strong">
            Local expertise
          </p>
          <h1 className="mt-3 max-w-3xl text-[32px] font-bold leading-tight text-heading sm:text-[42px]">
            Find an agent who knows the block
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-body">
            Every Haven agent is reviewed before publishing. Compare agencies, service areas, response
            times, and the homes they represent.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search name, agency, or city"
                aria-label="Search agents"
                className="h-11 pl-9"
              />
            </div>

            <Select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              aria-label="Filter agents by city"
              className="h-11 w-auto min-w-[10rem]"
            >
              <option value="all">All cities</option>
              {cities.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>

            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as AgentSort)}
              aria-label="Sort agents"
              className="h-11 w-auto min-w-[10rem]"
            >
              {agentSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="shell-container py-10">
        {isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-line bg-surface p-8 text-center">
            <p className="font-medium text-heading">Agents could not load</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : agents.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <li key={agent.id}>
                <div className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <Avatar name={agent.name} src={agent.avatar ?? undefined} size="lg" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold text-heading">
                        <Link to={`/agents/${agent.id}`} className="truncate hover:underline">
                          {agent.name}
                        </Link>
                        {agent.verified ? (
                          <BadgeCheck className="h-4 w-4 shrink-0 text-brand-strong" aria-label="Verified agent" />
                        ) : null}
                      </p>
                      <p className="truncate text-sm text-body">{agent.agency}</p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-body">
                    {agent.bio ?? "A Haven agent ready to help with buying, renting, and local questions."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.serviceAreas.slice(0, 3).map((area) => (
                      <Badge key={area} variant="outline">
                        {area}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-auto pt-3">
                    <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-body">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Replies in ~{agent.responseTimeMinutes} min
                      </span>
                      <span className="tabular">{agent.listingCount} active</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/agents/${agent.id}`} aria-label={`View profile for ${agent.name}`}>
                          View profile
                        </Link>
                      </Button>
                      {agent.verified ? (
                        <Button asChild size="sm" className="flex-1">
                          <Link to={`/agents/${agent.id}/contact`} aria-label={`Contact ${agent.name}`}>
                            Contact
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
            <p className="font-medium text-heading">No agents match these filters</p>
            <p className="mt-1 text-sm text-body">Try a different name, agency, or city.</p>
            {q || city !== "all" ? (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQ("");
                  setCity("all");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

export function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error } = usePublicAgent(id);

  if (isPending) {
    return (
      <div className="shell-container space-y-6 py-10" aria-busy="true">
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="shell-container py-16 text-center">
        <h1 className="text-2xl font-bold text-heading">Agent not found</h1>
        <p className="mt-2 text-sm text-body">
          {error instanceof ApiClientError ? error.message : "This agent profile is unavailable."}
        </p>
        <Button asChild className="mt-4">
          <Link to="/agents">Browse all agents</Link>
        </Button>
      </div>
    );
  }

  const { agent, listings } = data;

  return (
    <>
      <Seo
        title={`${agent.name}${agent.agency ? ` — ${agent.agency}` : ""} | Haven`}
        description={
          agent.bio ??
          `${agent.name} is a Haven agent with ${agent.listingCount} active listings.`
        }
        path={`/agents/${agent.id}`}
        image={agent.avatar}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: agent.name,
          image: agent.avatar ?? undefined,
          worksFor: { "@type": "Organization", name: agent.agency },
          areaServed: agent.serviceAreas,
          url: `${window.location.origin}/agents/${agent.id}`,
        }}
      />
      <div className="border-b border-line bg-surface">
        <div className="shell-container py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-body">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link to="/agents" className="hover:text-heading hover:underline">
                  Agents
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-muted">
                {agent.name}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar name={agent.name} src={agent.avatar ?? undefined} size="lg" className="h-20 w-20 text-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[30px] font-bold leading-tight text-heading">{agent.name}</h1>
                {agent.verified ? (
                  <BadgeCheck className="h-5 w-5 text-brand-strong" aria-label="Verified agent" />
                ) : (
                  <Badge variant="outline">Unverified</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-body">{agent.agency}</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-body">
                {agent.bio ?? "This agent has not added a bio yet."}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-body">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Replies in ~{agent.responseTimeMinutes} min
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {agent.serviceAreas.length ? agent.serviceAreas.join(" · ") : "Service area on request"}
                </span>
                <span className="tabular">{agent.listingCount} active listings</span>
              </div>

              <div className="mt-5">
                {agent.verified ? (
                  <Button asChild>
                    <Link to={`/agents/${agent.id}/contact`}>
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Contact agent
                    </Link>
                  </Button>
                ) : (
                  <p className="text-sm text-muted">This agent is not accepting enquiries yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shell-container py-10">
        <h2 className="text-[22px] font-bold text-heading">Active listings</h2>
        {listings.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-body">No approved listings are public right now.</p>
        )}
      </div>
    </>
  );
}