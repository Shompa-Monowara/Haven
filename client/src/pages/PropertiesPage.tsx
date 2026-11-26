import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
  Map as MapIcon,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { PropertyCard, PropertyCardSkeleton } from "@/components/property/PropertyCard";
import { PropertyListCard } from "@/components/property/PropertyListCard";
import { SearchFilters, type FilterDraft } from "@/components/search/SearchFilters";
import { SaveSearchDialog } from "@/components/search/SaveSearchDialog";
import { SearchSummaryBar } from "@/components/search/SearchSummaryBar";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCityCounts, usePropertySearch } from "@/lib/queries/properties";
import { useAuthStore } from "@/stores/auth-store";
import {
  activeChips,
  buildApiQuery,
  parseSearchState,
  setLayoutPreference,
  sortOptions,
  toSearchParams,
  type SearchState,
  type SearchView,
} from "@/lib/search/search-state";
import { cn } from "@/lib/utils";
import { propertyTypeLabels } from "@/types/property";

const PropertyMap = lazy(() => import("@/components/search/PropertyMap"));

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

function resultTitle(state: SearchState, total: number, loaded: boolean) {
  const type = state.listingType === "sale" ? "for sale" : state.listingType === "rent" ? "for rent" : "";
  const place = state.city ? ` in ${state.city}` : "";
  if (!loaded) return "Homes across our verified cities";
  const count = `${total.toLocaleString()} ${total === 1 ? "home" : "homes"}`;
  return `${count}${type ? ` ${type}` : ""}${place}`;
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = useMemo(() => {
    const result: number[] = [];
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    for (let value = start; value <= end; value += 1) result.push(value);
    return result;
  }, [page, totalPages]);

  return (
    <nav aria-label="Search results pages" className="mt-8 flex items-center justify-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="h-9"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Previous</span>
      </Button>
      {pages.map((value) => (
        <Button
          key={value}
          type="button"
          variant={value === page ? "primary" : "ghost"}
          size="sm"
          className="h-9 min-w-9 px-2 tabular"
          aria-current={value === page ? "page" : undefined}
          onClick={() => onChange(value)}
        >
          {value}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="h-9"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}

export function PropertiesPage() {
  const [params, setParams] = useSearchParams();
  const state = parseSearchState(params);
  const isMap = state.view === "map";
  const [layout, setLayout] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("haven:propertyLayout") === "list") {
      return "list";
    }
    return "grid";
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingBounds, setPendingBounds] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const cities = useCityCounts(isDesktop || mobileFiltersOpen);
  const results = usePropertySearch(state, isMap ? 60 : 24);
  const properties = results.data?.data ?? [];
  const total = results.data?.meta.total ?? 0;
  const totalPages = results.data?.meta.totalPages ?? 1;
  const querySignature = buildApiQuery(state, 24);
  const [visibleCount, setVisibleCount] = useState(() => (isDesktop ? 24 : 3));

  useEffect(() => {
    setVisibleCount(isDesktop ? 24 : 3);
  }, [querySignature, isDesktop]);

  const visibleProperties = properties.slice(0, visibleCount);

  function update(partial: Partial<SearchState>, resetPage = true) {
    const next: SearchState = {
      ...state,
      ...partial,
      page: resetPage ? 1 : (partial.page ?? state.page),
    };
    setParams(toSearchParams(next));
  }

  function resetFilters() {
    update({
      q: "",
      listingType: "",
      propertyTypes: [],
      city: "",
      neighborhood: "",
      minPrice: "",
      maxPrice: "",
      beds: "",
      baths: "",
      minSize: "",
      maxSize: "",
      amenities: [],
      bounds: "",
    });
    setPendingBounds(null);
  }

  function applyFilters(draft: FilterDraft) {
    update({ ...draft, bounds: state.bounds });
    setMobileFiltersOpen(false);
  }

  function changeView(view: SearchView) {
    if (view === "map") {
      update({ view: "map" });
      return;
    }
    setLayoutPreference(view);
    setLayout(view);
    update({ view });
  }

  function openSaveSearch() {
    if (!user) {
      navigate(
        `/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
      );
      return;
    }
    setSaveSearchOpen(true);
  }

  function activate(id: string | null) {
    setActiveId(id);
    if (id) {
      window.requestAnimationFrame(() => {
        document.getElementById(`result-card-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
  }

  const chips = activeChips(state);
  const typeDescription = state.listingType === "sale" ? "for sale" : state.listingType === "rent" ? "for rent" : "";
  const breadcrumbCity = state.city || "All homes";

  const chipsMarkup = chips.length ? (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => {
            update(chip.clear);
            if (chip.key === "bounds") setPendingBounds(null);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-brand-soft px-3 text-xs font-medium text-ink transition-colors hover:bg-[#d6f1ff]"
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={resetFilters}
        className="text-xs font-medium text-body underline decoration-line hover:text-heading"
      >
        Clear all
      </button>
    </div>
  ) : null;

  const loadingCards = (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading homes">
      {Array.from({ length: 6 }).map((_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  );

  const resultsMarkup = results.isPending ? (
    loadingCards
  ) : results.isError ? (
    <div className="rounded-lg border border-line bg-surface p-8 text-center">
      <p className="font-medium text-heading">Listings could not load</p>
      <p className="mt-1 text-sm text-body">Check the connection and try again.</p>
      <Button variant="outline" className="mt-4" onClick={() => results.refetch()}>
        Try again
      </Button>
    </div>
  ) : properties.length === 0 ? (
    <div className="rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-strong shadow-xs">
        <SearchX className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-lg font-semibold text-heading">No homes match these filters</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-body">
        Try widening the price range, removing a type, or searching a nearby city. Saved-search alerts
        are coming with the favorites phase.
      </p>
      <Button className="mt-4" variant="outline" onClick={resetFilters}>
        Reset filters
      </Button>
    </div>
  ) : layout === "list" && !isMap ? (
    <div className="space-y-4">
      {visibleProperties.map((property) => (
        <PropertyListCard key={property.id} property={property} />
      ))}
    </div>
  ) : (
    <div className="results-grid grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {visibleProperties.map((property, index) => (
        <PropertyCard key={property.id} property={property} priority={index < 2} />
      ))}
    </div>
  );

  const mapResultsMarkup = isMap ? (
    <div className="grid lg:grid-cols-[44%_56%]">
      <div className="min-w-0 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:border-r lg:border-line">
        <div className="px-4 py-4 sm:px-6 lg:pr-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-body">
                <span className="font-semibold text-heading tabular">{total.toLocaleString()}</span>{" "}
                {total === 1 ? "home" : "homes"}
                {typeDescription ? ` ${typeDescription}` : ""}
                {results.isFetching ? (
                  <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-muted" aria-label="Updating results" />
                ) : null}
              </p>
              {total > properties.length ? (
                <p className="mt-1 text-xs text-muted">
                  Showing {properties.length} of {total.toLocaleString()} homes on the map. Use
                  “Search this area” or filters to narrow results.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                value={state.sort}
                onChange={(event) => update({ sort: event.target.value as SearchState["sort"] })}
                aria-label="Sort results"
                className="h-9 rounded-md border border-line bg-surface px-2 text-xs text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
              {sortOptions
                .filter((option) => option.value !== "relevance" || state.q.trim().length > 0)
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs text-heading"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Filters
              </button>
              <button
                type="button"
                onClick={openSaveSearch}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs text-heading"
              >
                <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Save
              </button>
              <div className="flex rounded-md border border-line bg-surface" role="group" aria-label="Result layout">
                {[
                  { value: "grid" as const, label: "Grid", icon: LayoutGrid },
                  { value: "list" as const, label: "List", icon: List },
                  { value: "map" as const, label: "Map", icon: MapIcon },
                ].map((option) => {
                  const pressed = option.value === "map" ? isMap : !isMap && layout === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => changeView(option.value)}
                      aria-pressed={pressed}
                      aria-label={`${option.label} view`}
                      className={cn(
                        "inline-flex h-9 w-8 items-center justify-center transition-colors first:rounded-l-md last:rounded-r-md",
                        pressed ? "bg-ink text-white" : "text-body hover:bg-canvas hover:text-heading",
                      )}
                    >
                      <option.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {results.isPending ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40 w-full rounded-md" />)
            ) : properties.length ? (
              properties.map((property) => (
                <div
                  key={property.id}
                  id={`result-card-${property.id}`}
                  onMouseEnter={() => setActiveId(property.id)}
                  onFocus={() => setActiveId(property.id)}
                  className={cn(
                    "rounded-md transition-shadow",
                    activeId === property.id ? "ring-2 ring-brand ring-offset-2" : "",
                  )}
                >
                  <PropertyListCard property={property} />
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-line bg-canvas p-6 text-center text-sm text-body">
                No homes in this area. Try “Search this area” again or clear the map area chip.
              </div>
            )}
          </div>

          <Pagination
            page={state.page}
            totalPages={totalPages}
            onChange={(page) => update({ page }, false)}
          />

          <ul className="sr-only">
            {properties.map((property) => (
              <li key={property.id}>
                <Link to={`/properties/${property.slug}`}>
                  {property.title}, {property.address.city}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative sticky top-20 h-[60vh] lg:h-[calc(100vh-5rem)]">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-canvas text-sm text-body">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Loading map
            </div>
          }
        >
          <PropertyMap
            properties={properties}
            activeId={activeId}
            onActivate={activate}
            onMoveEnd={(bounds) => setPendingBounds(bounds)}
            shouldFit={!state.bounds}
            fitKey={buildApiQuery({ ...state, bounds: "" })}
          />
        </Suspense>

        {pendingBounds && pendingBounds !== state.bounds ? (
          <div className="absolute inset-x-0 top-3 z-[500] flex justify-center">
            <Button
              type="button"
              className="shadow-md"
              onClick={() => {
                update({ bounds: pendingBounds });
                setPendingBounds(null);
              }}
            >
              Search this area
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-canvas pb-16">
      <Seo
        title={
          state.city
            ? `Homes ${typeDescription || "for sale and rent"} in ${state.city} | Haven`
            : "Search homes for sale and rent | Haven"
        }
        description={
          state.city
            ? `Browse verified homes ${typeDescription || "for sale and rent"} in ${state.city}. Filter by price, bedrooms, amenities, and map area.`
            : "Search verified homes for sale and rent by city, price, property type, bedrooms, and amenities."
        }
        path="/properties"
      />
      <SearchSummaryBar
        state={state}
        onApply={(partial) => update(partial)}
        onOpenFilters={() => setMobileFiltersOpen(true)}
        sticky={!isMap}
      />

      {isMap ? (
        <div>
          {chipsMarkup ? (
            <div className="shell-container border-b border-line py-3">{chipsMarkup}</div>
          ) : null}
          {mapResultsMarkup}
        </div>
      ) : (
        <div className="shell-container">
          <nav aria-label="Breadcrumb" className="pt-5 text-sm text-body">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/" className="hover:text-heading hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/properties" className="hover:text-heading hover:underline">
                  Properties
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-muted">
                {breadcrumbCity}
              </li>
            </ol>
          </nav>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-bold leading-tight text-heading sm:text-[32px]">
                {resultTitle(state, total, Boolean(results.data))}
              </h1>
              {state.propertyTypes.length ? (
                <p className="mt-1 text-sm text-body">
                  {state.propertyTypes.map((type) => propertyTypeLabels[type]).join(", ")}
                </p>
              ) : null}
            </div>
            {results.isFetching && results.data ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Updating results
              </span>
            ) : null}
          </div>

          {chipsMarkup ? <div className="mt-4">{chipsMarkup}</div> : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            {isDesktop ? (
              <aside className="hidden lg:block">
                <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border border-line bg-surface p-4">
                  <SearchFilters
                    state={state}
                    cityOptions={cities.data ?? []}
                    onApply={applyFilters}
                    onReset={resetFilters}
                  />
                </div>
              </aside>
            ) : null}

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-body" aria-live="polite">
                  <span className="font-semibold text-heading tabular">{total.toLocaleString()}</span>{" "}
                  {total === 1 ? "home" : "homes"}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor="sort-results">
                    Sort results
                  </label>
                  <select
                    id="sort-results"
                    value={state.sort}
                    onChange={(event) => update({ sort: event.target.value as SearchState["sort"] })}
                    className="h-9 rounded-md border border-line bg-surface px-2.5 text-sm text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {sortOptions
                      .filter(
                        (option) => option.value !== "relevance" || state.q.trim().length > 0,
                      )
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm text-heading lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Filters
                  </button>

                  <button
                    type="button"
                    onClick={openSaveSearch}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm text-heading"
                  >
                    <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                    Save search
                  </button>

                  <div className="flex rounded-md border border-line" role="group" aria-label="Result layout">
                    {[
                      { value: "grid" as const, label: "Grid", icon: LayoutGrid },
                      { value: "list" as const, label: "List", icon: List },
                      { value: "map" as const, label: "Map", icon: MapIcon },
                    ].map((option) => {
                      const pressed = option.value === "map" ? isMap : !isMap && layout === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => changeView(option.value)}
                          aria-pressed={pressed}
                          aria-label={`${option.label} view`}
                          title={`${option.label} view`}
                          className={cn(
                            "inline-flex h-9 w-9 items-center justify-center transition-colors first:rounded-l-md last:rounded-r-md",
                            pressed ? "bg-ink text-white" : "text-body hover:bg-canvas hover:text-heading",
                          )}
                        >
                          <option.icon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <h2 className="sr-only">Search results</h2>
              {resultsMarkup}

              {!results.isPending && properties.length > visibleCount ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibleCount((count) => count + 6)}
                  >
                    Show more homes ({properties.length - visibleCount} remaining)
                  </Button>
                </div>
              ) : null}

              <Pagination page={state.page} totalPages={totalPages} onChange={(page) => update({ page }, false)} />
            </div>
          </div>
        </div>
      )}

      {saveSearchOpen ? (
        <SaveSearchDialog
          open={saveSearchOpen}
          onOpenChange={setSaveSearchOpen}
          state={state}
          matchCount={total}
        />
      ) : null}

      {mobileFiltersOpen ? (
        <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <DialogContent
          className="fixed inset-x-0 bottom-0 top-auto left-0 flex max-h-[90vh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-b-none rounded-t-lg border-x-0 border-b-0 p-4 pb-0 md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border md:pb-4"
          aria-describedby="mobile-filters-description"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-heading">Filter homes</DialogTitle>
            <DialogDescription id="mobile-filters-description" className="text-sm text-body">
              Apply filters to update the results.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SearchFilters
              state={state}
              cityOptions={cities.data ?? []}
              onApply={applyFilters}
              onReset={resetFilters}
              onClose={() => setMobileFiltersOpen(false)}
              stickyFooter
            />
          </div>
        </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}