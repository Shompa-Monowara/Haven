import { BadgeCheck, Clock } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAgents } from "@/lib/queries/agents";

const MAX_AGENTS = 4;

export function AgentSpotlight() {
  const { data, isPending, isError, isRefetching, refetch } = usePublicAgents({
    verified: true,
    minListings: 1,
  });

  const agents = [...(data ?? [])]
    .sort((a, b) => b.listingCount - a.listingCount || a.name.localeCompare(b.name))
    .slice(0, MAX_AGENTS);

  return (
    <section className="section-pad bg-canvas" aria-labelledby="agent-spotlight-heading">
      <div className="shell-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2
              id="agent-spotlight-heading"
              className="text-[28px] font-bold leading-tight sm:text-[32px]"
            >
              Meet local agents
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-body">
              Verified professionals who answer questions, arrange viewings, and know their market.
            </p>
          </div>
          <Link
            to="/agents"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
          >
            View all agents
          </Link>
        </div>

        {isPending ? (
          <div
            className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            aria-busy="true"
            aria-label="Loading agents"
          >
            {Array.from({ length: MAX_AGENTS }).map((_, index) => (
              <div
                key={index}
                className="flex h-full flex-col rounded-lg border border-line bg-surface p-6"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-[72px] w-[72px] rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="mt-5 h-3 w-1/3" />
                <div className="mt-auto flex flex-col gap-2 pt-5">
                  <Skeleton className="h-11 w-full rounded-md" />
                  <Skeleton className="h-11 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="mt-8 rounded-lg border border-dashed border-line bg-surface p-8 text-center">
            <p className="font-medium text-heading">Agents could not load</p>
            <p className="mt-1 text-sm text-body">
              Check your connection and try again, or browse all agents.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                loading={isRefetching}
              >
                Try again
              </Button>
              <Button asChild variant="ghost">
                <Link to="/agents">View all agents</Link>
              </Button>
            </div>
          </div>
        ) : agents.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-line bg-surface p-8 text-center">
            <p className="font-medium text-heading">No agents to show yet</p>
            <p className="mt-1 text-sm text-body">
              Verified agents appear here once their profiles are published.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/agents">Browse agents</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {agents.map((agent) => (
              <li
                key={agent.id}
                className="flex h-full flex-col rounded-lg border border-line bg-surface p-6"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={agent.name} src={agent.avatar ?? undefined} size="xl" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-heading">
                      <span className="truncate">{agent.name}</span>
                      {agent.verified ? (
                        <>
                          <BadgeCheck
                            className="h-4 w-4 shrink-0 text-brand-strong"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Verified agent</span>
                        </>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-body">{agent.agency}</p>
                  </div>
                </div>

                <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-4 text-xs text-body">
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Active listings</dt>
                    <dd className="tabular">
                      {agent.listingCount} {agent.listingCount === 1 ? "listing" : "listings"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <dt className="sr-only">Typical reply time</dt>
                    <dd>Replies in ~{agent.responseTimeMinutes} min</dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-col gap-2 pt-5">
                  <Button asChild className="w-full whitespace-nowrap text-center">
                    <Link
                      to={`/agents/${agent.id}/contact`}
                      aria-label={`Contact ${agent.name} about a home`}
                    >
                      Contact agent
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full whitespace-nowrap text-center">
                    <Link to={`/agents/${agent.id}`} aria-label={`View profile for ${agent.name}`}>
                      View profile
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
