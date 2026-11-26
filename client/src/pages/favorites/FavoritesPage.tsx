import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  ExternalLink,
  Heart,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { PropertyCard, PropertyCardSkeleton } from "@/components/property/PropertyCard";
import { PropertyListCard } from "@/components/property/PropertyListCard";
import { Seo } from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ApiClientError, api } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { engagementKeys, useFavorites, useSavedSearches } from "@/lib/queries/engagement";
import { activeChips, parseSearchState, setLayoutPreference } from "@/lib/search/search-state";
import { usePageParam } from "@/lib/use-page-param";
import { cn } from "@/lib/utils";
import {
  frequencyLabels,
  type AlertFrequency,
  type SavedSearchDto,
} from "@/types/engagement";

type Tab = "favorites" | "searches";
type SortOption = "recent" | "price_asc" | "price_desc" | "newest";

const sortLabels: Record<SortOption, string> = {
  recent: "Recently saved",
  price_asc: "Price low to high",
  price_desc: "Price high to low",
  newest: "Newest listing",
};

const FAVORITES_PAGE_SIZE = 9;
const SEARCHES_PAGE_SIZE = 10;

export function FavoritesPage({ initialTab = "favorites" }: { initialTab?: Tab }) {
  const queryClient = useQueryClient();
  const [page, setPage] = usePageParam();
  const favorites = useFavorites();
  const searches = useSavedSearches();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sort, setSort] = useState<SortOption>("recent");
  const [layout, setLayout] = useState<"grid" | "list">(() =>
    typeof window !== "undefined" && window.localStorage.getItem("haven:favoriteLayout") === "list"
      ? "list"
      : "grid",
  );
  const [editing, setEditing] = useState<SavedSearchDto | null>(null);
  const [deleting, setDeleting] = useState<SavedSearchDto | null>(null);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<AlertFrequency>("daily");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setFrequency(editing.frequency);
    setEmailAlerts(editing.emailAlerts);
    setInAppAlerts(editing.inAppAlerts);
  }, [editing]);

  const sortedFavorites = useMemo(() => {
    const list = [...(favorites.data ?? [])];
    if (sort === "price_asc") return list.sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return list.sort((a, b) => b.price - a.price);
    if (sort === "newest") {
      return list.sort(
        (a, b) =>
          new Date(b.publishedAt ?? b.createdAt).getTime() -
          new Date(a.publishedAt ?? a.createdAt).getTime(),
      );
    }
    return list;
  }, [favorites.data, sort]);

  const favoritesTotal = sortedFavorites.length;
  const favoritesTotalPages = Math.max(1, Math.ceil(favoritesTotal / FAVORITES_PAGE_SIZE));
  const favoritesPage = Math.min(Math.max(1, page), favoritesTotalPages);
  const favoritesStart = (favoritesPage - 1) * FAVORITES_PAGE_SIZE;
  const favoriteItems = sortedFavorites.slice(favoritesStart, favoritesStart + FAVORITES_PAGE_SIZE);

  const searchesList = searches.data ?? [];
  const searchesTotal = searchesList.length;
  const searchesTotalPages = Math.max(1, Math.ceil(searchesTotal / SEARCHES_PAGE_SIZE));
  const searchesPage = Math.min(Math.max(1, page), searchesTotalPages);
  const searchesStart = (searchesPage - 1) * SEARCHES_PAGE_SIZE;
  const searchItems = searchesList.slice(searchesStart, searchesStart + SEARCHES_PAGE_SIZE);

  const favoritesListRef = useRef<HTMLDivElement | null>(null);
  const searchesListRef = useRef<HTMLUListElement | null>(null);
  const activeTotalPages = tab === "favorites" ? favoritesTotalPages : searchesTotalPages;

  useEffect(() => {
    if (page > activeTotalPages) setPage(activeTotalPages, { replace: true });
  }, [page, activeTotalPages, setPage]);

  function resetPage() {
    if (page !== 1) setPage(1);
  }

  function scrollToList(next: number, target: { current: HTMLElement | null }) {
    setPage(next);
    const element = target.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function goToFavoritesPage(next: number) {
    scrollToList(next, favoritesListRef);
  }

  function goToSearchesPage(next: number) {
    scrollToList(next, searchesListRef);
  }

  const updateSearch = useMutation({
    mutationFn: (input: {
      id: string;
      name: string;
      frequency: AlertFrequency;
      emailAlerts: boolean;
      inAppAlerts: boolean;
    }) => api.patch<SavedSearchDto>(`/saved-searches/${input.id}`, input),
    onSuccess: () => {
      toast.success("Saved search updated");
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: engagementKeys.savedSearches });
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : "The search could not be updated");
    },
  });

  const deleteSearch = useMutation({
    mutationFn: (id: string) => api.delete(`/saved-searches/${id}`),
    onSuccess: () => {
      toast.success("Saved search deleted");
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: engagementKeys.savedSearches });
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : "The search could not be deleted");
    },
  });

  function changeLayout(next: "grid" | "list") {
    setLayout(next);
    setLayoutPreference(next);
    window.localStorage.setItem("haven:favoriteLayout", next);
  }

  return (
    <div className="space-y-6">
      <Seo title="Saved homes — Haven" description="Your saved homes and searches." noIndex />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
            Saved homes
          </h2>
          <p className="mt-1.5 text-sm text-body">
            {favorites.data?.length ?? 0} saved {favorites.data?.length === 1 ? "home" : "homes"} ·{" "}
            {searches.data?.length ?? 0} saved {searches.data?.length === 1 ? "search" : "searches"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/properties">
            <Search className="h-4 w-4" aria-hidden="true" />
            Browse homes
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Saved home views">
        {(
          [
            { value: "favorites" as const, label: "Favorites", count: favorites.data?.length ?? 0 },
            { value: "searches" as const, label: "Saved searches", count: searches.data?.length ?? 0 },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            onClick={() => {
              setTab(option.value);
              resetPage();
            }}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-pill border px-4 text-sm font-medium transition-colors",
              tab === option.value
                ? "border-brand bg-brand-soft text-ink"
                : "border-line bg-surface text-body hover:border-brand hover:text-heading",
            )}
          >
            {option.label}
            <span className="rounded-pill bg-surface/70 px-1.5 text-xs text-muted tabular">
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "favorites" ? (
        <section aria-label="Favorite homes" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-body">
              Sort
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as SortOption);
                  resetPage();
                }}
                className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                {Object.entries(sortLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex rounded-md border border-line" role="group" aria-label="Favorite layout">
              <button
                type="button"
                onClick={() => changeLayout("grid")}
                aria-pressed={layout === "grid"}
                aria-label="Grid view"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-l-md transition-colors",
                  layout === "grid" ? "bg-ink text-white" : "text-body hover:bg-canvas",
                )}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => changeLayout("list")}
                aria-pressed={layout === "list"}
                aria-label="List view"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-r-md transition-colors",
                  layout === "list" ? "bg-ink text-white" : "text-body hover:bg-canvas",
                )}
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {favorites.isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : sortedFavorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-danger shadow-xs">
                <Heart className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-lg font-semibold text-heading">No saved homes yet</h3>
              <p className="mt-1 max-w-sm text-sm text-body">
                Tap the heart on any listing to keep it here for easy comparison.
              </p>
              <Button asChild className="mt-4">
                <Link to="/properties">Browse homes</Link>
              </Button>
            </div>
          ) : layout === "list" ? (
            <div ref={favoritesListRef} className="space-y-4">
              {favoriteItems.map((property) => (
                <PropertyListCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div ref={favoritesListRef} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {favoriteItems.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}

          <Pagination
            page={favoritesPage}
            totalPages={favoritesTotalPages}
            total={favoritesTotal}
            limit={FAVORITES_PAGE_SIZE}
            label="Favorite homes pages"
            onPageChange={goToFavoritesPage}
          />
        </section>
      ) : (
        <section aria-label="Saved searches" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-body">
              Saved searches watch new listings for you and can send a digest by email.
            </p>
            <Button asChild>
              <Link to="/properties">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create saved search
              </Link>
            </Button>
          </div>

          {searches.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-lg bg-line/40" />
              ))}
            </div>
          ) : searchesTotal ? (
            <ul ref={searchesListRef} className="space-y-4">
              {searchItems.map((search) => {
                const chips = activeChips(parseSearchState(new URLSearchParams(search.criteria)));
                const alertsOn = search.frequency !== "off";

                return (
                  <li key={search.id} className="rounded-lg border border-line bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-heading">{search.name}</h3>
                          <Badge variant={alertsOn ? "approved" : "outline"}>
                            {alertsOn ? (
                              <span className="inline-flex items-center gap-1">
                                <Bell className="h-3 w-3" aria-hidden="true" />
                                {frequencyLabels[search.frequency]}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <BellOff className="h-3 w-3" aria-hidden="true" />
                                Alerts off
                              </span>
                            )}
                          </Badge>
                          {search.newMatches > 0 ? (
                            <Badge variant="pending">{search.newMatches} new</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-body">
                          {search.matchCount} {search.matchCount === 1 ? "home matches" : "homes match"} ·
                          last run {search.lastRunAt ? formatRelativeDate(search.lastRunAt) : "never"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/properties?${search.criteria}`}>
                            Run search
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(search)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger-tint hover:text-danger"
                          onClick={() => setDeleting(search)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                      {chips.length ? (
                        chips.slice(0, 8).map((chip) => (
                          <span
                            key={chip.key}
                            className="inline-flex h-7 items-center rounded-pill bg-canvas px-2.5 text-xs text-body"
                          >
                            {chip.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted">All homes</span>
                      )}
                      {chips.length > 8 ? (
                        <span className="text-xs text-muted">+{chips.length - 8} more</span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas px-6 py-16 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-strong shadow-xs">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-lg font-semibold text-heading">No saved searches yet</h3>
              <p className="mt-1 max-w-sm text-sm text-body">
                Run a search, then use “Save search” to get notified when new homes match.
              </p>
              <Button asChild className="mt-4">
                <Link to="/properties">Start searching</Link>
              </Button>
            </div>
          )}

          <Pagination
            page={searchesPage}
            totalPages={searchesTotalPages}
            total={searchesTotal}
            limit={SEARCHES_PAGE_SIZE}
            label="Saved search pages"
            onPageChange={goToSearchesPage}
          />
        </section>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-heading">Edit saved search</DialogTitle>
            <DialogDescription className="text-sm text-body">
              Change the name or alert preferences. The criteria stay the same.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!editing) return;
              if (!name.trim()) {
                toast.error("Give this search a name");
                return;
              }
              updateSearch.mutate({
                id: editing.id,
                name: name.trim(),
                frequency,
                emailAlerts,
                inAppAlerts,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="saved-search-name" className="mb-1.5 block text-sm font-medium text-heading">
                Name
              </label>
              <Input
                id="saved-search-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
              />
            </div>

            <div>
              <label htmlFor="saved-search-frequency" className="mb-1.5 block text-sm font-medium text-heading">
                Alert frequency
              </label>
              <select
                id="saved-search-frequency"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as AlertFrequency)}
                className="h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                {Object.entries(frequencyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {frequency === "instant" ? (
                <p className="mt-1 text-xs text-muted">
                  Instant alerts notify you as soon as a matching home is approved.
                </p>
              ) : null}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-heading">Channels</legend>
              <label className="flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(event) => setEmailAlerts(event.target.checked)}
                  className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                />
                Email digest
              </label>
              <label className="flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={inAppAlerts}
                  onChange={(event) => setInAppAlerts(event.target.checked)}
                  className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                />
                In-app alerts
              </label>
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateSearch.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this saved search?"
        description={
          deleting
            ? `“${deleting.name}” will stop watching for new matches. You can always create it again.`
            : ""
        }
        confirmLabel="Delete search"
        tone="danger"
        loading={deleteSearch.isPending}
        onConfirm={() => deleting && deleteSearch.mutate(deleting.id)}
      />
    </div>
  );
}