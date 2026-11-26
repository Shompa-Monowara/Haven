import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bathFilterOptions,
  bedFilterOptions,
  filterAmenities,
  type SearchState,
} from "@/lib/search/search-state";
import { useNeighborhoodCounts, type CityCount } from "@/lib/queries/properties";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES, propertyTypeLabels, type PropertyType } from "@/types/property";

export type FilterDraft = Pick<
  SearchState,
  | "q"
  | "listingType"
  | "propertyTypes"
  | "city"
  | "neighborhood"
  | "minPrice"
  | "maxPrice"
  | "beds"
  | "baths"
  | "minSize"
  | "maxSize"
  | "amenities"
>;

export function draftFromState(state: SearchState): FilterDraft {
  return {
    q: state.q,
    listingType: state.listingType,
    propertyTypes: state.propertyTypes,
    city: state.city,
    neighborhood: state.neighborhood,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
    beds: state.beds,
    baths: state.baths,
    minSize: state.minSize,
    maxSize: state.maxSize,
    amenities: state.amenities,
  };
}

export const emptyDraft: FilterDraft = {
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
};

interface SearchFiltersProps {
  state: SearchState;
  cityOptions: CityCount[];
  onApply: (draft: FilterDraft) => void;
  onReset: () => void;
  onClose?: () => void;
  stickyFooter?: boolean;
}

export function SearchFilters({
  state,
  cityOptions,
  onApply,
  onReset,
  onClose,
  stickyFooter = false,
}: SearchFiltersProps) {
  const [draft, setDraft] = useState<FilterDraft>(() => draftFromState(state));
  const [citySearch, setCitySearch] = useState("");
  const neighborhoods = useNeighborhoodCounts(draft.city);

  const signature = [
    state.listingType,
    state.propertyTypes.join(","),
state.city,
    state.neighborhood,
    state.minPrice,
    state.maxPrice,
    state.beds,
    state.baths,
    state.minSize,
    state.maxSize,
    state.amenities.join(","),
    state.q,
  ].join("|");

  useEffect(() => {
    setDraft(draftFromState(state));
  }, [signature]);

  const scaleMax = draft.listingType === "rent" ? 10_000 : 3_000_000;
  const minSlider = Math.max(0, Math.min(Number(draft.minPrice) || 0, scaleMax));
  const maxSlider = Math.min(scaleMax, Math.max(Number(draft.maxPrice) || scaleMax, minSlider));

  const visibleCities = useMemo(() => {
    const term = citySearch.trim().toLowerCase();
    return cityOptions
      .filter((option) => !term || option.city.toLowerCase().includes(term))
      .slice(0, 40);
  }, [cityOptions, citySearch]);

  function patch(partial: Partial<FilterDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function toggleType(type: PropertyType) {
    patch({
      propertyTypes: draft.propertyTypes.includes(type)
        ? draft.propertyTypes.filter((value) => value !== type)
        : [...draft.propertyTypes, type],
    });
  }

  function toggleAmenity(amenity: string) {
    patch({
      amenities: draft.amenities.includes(amenity)
        ? draft.amenities.filter((value) => value !== amenity)
        : [...draft.amenities, amenity],
    });
  }

  function apply() {
    onApply(draft);
    onClose?.();
  }

  function reset() {
    setDraft(emptyDraft);
    setCitySearch("");
    onReset();
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-heading">
          <SlidersHorizontal className="h-4 w-4 text-brand-strong" aria-hidden="true" />
          Filters
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 text-xs font-medium text-body hover:text-heading"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="max-h-[calc(90vh-160px)] space-y-6 overflow-y-auto py-4 lg:max-h-none lg:overflow-visible">
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Listing status
          </legend>
          <div className="grid grid-cols-3 gap-1.5" role="group">
            {[
              { value: "" as const, label: "All" },
              { value: "sale" as const, label: "For sale" },
              { value: "rent" as const, label: "For rent" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => patch({ listingType: option.value })}
                aria-pressed={draft.listingType === option.value}
                className={cn(
                  "h-9 rounded-md border text-xs font-medium transition-colors",
                  draft.listingType === option.value
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-line text-body hover:border-brand",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Property type
          </legend>
          <div className="space-y-1.5">
            {PROPERTY_TYPES.map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-2.5 text-sm text-body">
                <input
                  type="checkbox"
                  checked={draft.propertyTypes.includes(type)}
                  onChange={() => toggleType(type)}
                  className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                />
                {propertyTypeLabels[type]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            City
          </legend>
          <Input
            type="search"
            placeholder="Search cities"
            value={citySearch}
            onChange={(event) => setCitySearch(event.target.value)}
            className="h-9 text-sm"
            aria-label="Search cities"
          />
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
            {visibleCities.length ? (
              visibleCities.map((option) => (
                <label key={option.city} className="flex cursor-pointer items-center justify-between gap-2 text-sm text-body">
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={draft.city.toLowerCase() === option.city.toLowerCase()}
                      onChange={() =>
                        patch({
                          city: draft.city.toLowerCase() === option.city.toLowerCase() ? "" : option.city,
                          neighborhood: "",
                        })
                      }
                      className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                    />
                    {option.city}
                  </span>
                  <span className="text-xs text-muted tabular">{option.count}</span>
                </label>
              ))
            ) : (
              <p className="text-xs text-muted">No cities match that search.</p>
            )}
          </div>
        </fieldset>

        {draft.city ? (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
              Neighborhood
            </legend>
            {neighborhoods.isPending ? (
              <p className="text-xs text-muted">Loading neighborhoods…</p>
            ) : neighborhoods.data?.length ? (
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                {neighborhoods.data.map((option) => (
                  <label
                    key={option.neighborhood}
                    className="flex cursor-pointer items-center justify-between gap-2 text-sm text-body"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={draft.neighborhood === option.neighborhood}
                        onChange={() =>
                          patch({
                            neighborhood:
                              draft.neighborhood === option.neighborhood
                                ? ""
                                : option.neighborhood,
                          })
                        }
                        className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                      />
                      {option.neighborhood}
                    </span>
                    <span className="text-xs text-muted tabular">{option.count}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No neighborhoods listed for this city yet.</p>
            )}
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Price
          </legend>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Min"
              value={draft.minPrice}
              onChange={(event) => {
                const value = event.target.value;
                const nextMin = Number(value);
                patch({
                  minPrice: value,
                  maxPrice:
                    value && draft.maxPrice && nextMin > Number(draft.maxPrice) ? value : draft.maxPrice,
                });
              }}
              className="h-9 text-sm"
              aria-label="Minimum price"
            />
            <span className="text-xs text-muted">to</span>
            <Input
              type="number"
              min={0}
              placeholder="Max"
              value={draft.maxPrice}
              onChange={(event) => patch({ maxPrice: event.target.value })}
              className="h-9 text-sm"
              aria-label="Maximum price"
            />
          </div>
          <div className="mt-4 space-y-2 px-1">
            <input
              type="range"
              className="haven-range"
              min={0}
              max={scaleMax}
              step={draft.listingType === "rent" ? 100 : 25_000}
              value={minSlider}
              onChange={(event) => {
                const value = Number(event.target.value);
                patch({
                  minPrice: value ? String(value) : "",
                  maxPrice: maxSlider < value ? String(value) : draft.maxPrice,
                });
              }}
              aria-label="Minimum price slider"
            />
            <input
              type="range"
              className="haven-range"
              min={0}
              max={scaleMax}
              step={draft.listingType === "rent" ? 100 : 25_000}
              value={maxSlider}
              onChange={(event) => {
                const value = Number(event.target.value);
                patch({
                  maxPrice: value >= scaleMax ? "" : String(value),
                  minPrice: minSlider > value ? String(value) : draft.minPrice,
                });
              }}
              aria-label="Maximum price slider"
            />
            <p className="text-[11px] text-muted">
              {draft.listingType === "rent" ? "Monthly rent" : "Sale price"} · drag either handle
            </p>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Bedrooms
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {bedFilterOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => patch({ beds: option.value })}
                aria-pressed={draft.beds === option.value}
                className={cn(
                  "h-8 min-w-[42px] rounded-pill border px-2.5 text-xs font-medium transition-colors",
                  draft.beds === option.value
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-line text-body hover:border-brand",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Bathrooms
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {bathFilterOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => patch({ baths: option.value })}
                aria-pressed={draft.baths === option.value}
                className={cn(
                  "h-8 min-w-[42px] rounded-pill border px-2.5 text-xs font-medium transition-colors",
                  draft.baths === option.value
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-line text-body hover:border-brand",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Size (sq ft)
          </legend>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Min"
              value={draft.minSize}
              onChange={(event) => patch({ minSize: event.target.value })}
              className="h-9 text-sm"
              aria-label="Minimum size"
            />
            <span className="text-xs text-muted">to</span>
            <Input
              type="number"
              min={0}
              placeholder="Max"
              value={draft.maxSize}
              onChange={(event) => patch({ maxSize: event.target.value })}
              className="h-9 text-sm"
              aria-label="Maximum size"
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Amenities
          </legend>
          <div className="grid grid-cols-2 gap-1.5">
            {filterAmenities.map((amenity) => (
              <label key={amenity} className="flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={draft.amenities.includes(amenity.toLowerCase())}
                  onChange={() => toggleAmenity(amenity.toLowerCase())}
                  className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                />
                {amenity}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="filter-keyword" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Keyword
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              id="filter-keyword"
              value={draft.q}
              onChange={(event) => patch({ q: event.target.value })}
              placeholder="Garden, loft, view…"
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div className={cn("border-t border-line pt-3", stickyFooter && "sticky bottom-0 bg-surface pb-2")}>
        <Button type="button" className="w-full" onClick={apply}>
          Apply filters
        </Button>
      </div>
    </div>
  );
}