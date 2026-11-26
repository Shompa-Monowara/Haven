import { ChevronDown, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SearchState } from "@/lib/search/search-state";

const saleRanges = [
  { label: "Any price", min: "", max: "" },
  { label: "Up to $250K", min: "", max: "250000" },
  { label: "$250K – $500K", min: "250000", max: "500000" },
  { label: "$500K – $750K", min: "500000", max: "750000" },
  { label: "$750K – $1M", min: "750000", max: "1000000" },
  { label: "$1M+", min: "1000000", max: "" },
];

const rentRanges = [
  { label: "Any rent", min: "", max: "" },
  { label: "Up to $1,500/mo", min: "", max: "1500" },
  { label: "$1,500 – $2,500/mo", min: "1500", max: "2500" },
  { label: "$2,500 – $4,000/mo", min: "2500", max: "4000" },
  { label: "$4,000+/mo", min: "4000", max: "" },
];

interface SearchSummaryBarProps {
  state: SearchState;
  onApply: (partial: Partial<SearchState>) => void;
  onOpenFilters: () => void;
  sticky: boolean;
}

export function SearchSummaryBar({ state, onApply, onOpenFilters, sticky }: SearchSummaryBarProps) {
  const [city, setCity] = useState(state.city);

  useEffect(() => {
    setCity(state.city);
  }, [state.city]);

  const ranges = state.listingType === "rent" ? rentRanges : saleRanges;
  const currentRange =
    ranges.find((range) => range.min === state.minPrice && range.max === state.maxPrice)?.label ??
    "Any price";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({ city: city.trim() });
  }

  return (
    <div className={sticky ? "sticky top-20 z-30 border-b border-line bg-surface/95 backdrop-blur" : "border-b border-line bg-surface"}>
      <div className="shell-container py-3">
        <form onSubmit={submit} role="search" aria-label="Search filters" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="City"
              aria-label="City"
              className="h-10 pl-9"
              autoComplete="off"
            />
          </div>

          <div className="relative sm:w-36">
            <select
              value={state.listingType}
              onChange={(event) =>
                onApply({
                  listingType: event.target.value as SearchState["listingType"],
                  minPrice: "",
                  maxPrice: "",
                })
              }
              aria-label="Listing type"
              className="h-10 w-full appearance-none rounded-md border border-line bg-surface pl-3 pr-9 text-sm text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">All types</option>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          </div>

          <div className="relative sm:w-44">
            <select
              value={currentRange}
              onChange={(event) => {
                const range = ranges.find((option) => option.label === event.target.value);
                onApply({ minPrice: range?.min ?? "", maxPrice: range?.max ?? "" });
              }}
              aria-label="Price range"
              className="h-10 w-full appearance-none rounded-md border border-line bg-surface pl-3 pr-9 text-sm text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {ranges.map((range) => (
                <option key={range.label} value={range.label}>
                  {range.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="h-10 flex-1 px-4 sm:flex-none">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 lg:hidden"
              onClick={onOpenFilters}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}