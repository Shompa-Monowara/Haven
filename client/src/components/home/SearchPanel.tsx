import { ChevronDown, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchTab = "all" | "sale" | "rent";

const propertyTypes = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "studio", label: "Studio" },
  { value: "condo", label: "Condo" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
];

const bedOptions = ["Any", "1+", "2+", "3+", "4+", "5+"];

const salePriceRanges = [
  { label: "Any price", min: "", max: "" },
  { label: "Up to $250K", min: "", max: "250000" },
  { label: "$250K – $500K", min: "250000", max: "500000" },
  { label: "$500K – $750K", min: "500000", max: "750000" },
  { label: "$750K – $1M", min: "750000", max: "1000000" },
  { label: "$1M+", min: "1000000", max: "" },
];

const rentPriceRanges = [
  { label: "Any rent", min: "", max: "" },
  { label: "Up to $1,500/mo", min: "", max: "1500" },
  { label: "$1,500 – $2,500/mo", min: "1500", max: "2500" },
  { label: "$2,500 – $4,000/mo", min: "2500", max: "4000" },
  { label: "$4,000+/mo", min: "4000", max: "" },
];

function SelectField({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none rounded-md border border-line bg-surface pl-3.5 pr-10 text-[15px] text-heading transition-colors hover:border-[#c3c9c9] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function SearchPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SearchTab>("all");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [beds, setBeds] = useState("Any");
  const [price, setPrice] = useState("Any price");

  const isRent = tab === "rent";
  const priceRanges = isRent ? rentPriceRanges : salePriceRanges;

  function handleTab(next: SearchTab) {
    setTab(next);
    setPrice("Any price");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();

    if (tab !== "all") params.set("listingType", tab);
    if (location.trim()) params.set("city", location.trim());
    if (propertyType) params.set("propertyType", propertyType);
    if (beds !== "Any") params.set("beds", beds.replace("+", ""));

    const range = priceRanges.find((option) => option.label === price);
    if (range?.min) params.set("minPrice", range.min);
    if (range?.max) params.set("maxPrice", range.max);

    const query = params.toString();
    navigate(query ? `/properties?${query}` : "/properties");
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-md sm:p-6">
      <div
        className="flex items-center gap-6 border-b border-line"
        role="group"
        aria-label="Listing type"
      >
        {[
          { value: "all" as const, label: "All" },
          { value: "sale" as const, label: "For Sale" },
          { value: "rent" as const, label: "For Rent" },
        ].map((option) => {
          const active = tab === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => handleTab(option.value)}
              className={[
                "-mb-px border-b-2 pb-3 pt-1 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-heading"
                  : "border-transparent text-body hover:text-heading",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <form className="mt-5" onSubmit={handleSubmit} role="search" aria-label="Property search">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_0.7fr_1.1fr_auto]">
          <div>
            <label htmlFor="hero-location" className="sr-only">
              Location
            </label>
            <div className="relative">
              <MapPin
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                id="hero-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City, neighborhood, or ZIP"
                className="pl-10"
                autoComplete="off"
              />
            </div>
          </div>

          <SelectField label="Property type" value={propertyType} onChange={setPropertyType}>
            <option value="">Any type</option>
            {propertyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </SelectField>

          <SelectField label="Bedrooms" value={beds} onChange={setBeds}>
            {bedOptions.map((option) => (
              <option key={option} value={option}>
                {option === "Any" ? "Any beds" : `${option} beds`}
              </option>
            ))}
          </SelectField>

          <SelectField label="Price range" value={price} onChange={setPrice}>
            {priceRanges.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </SelectField>

          <Button type="submit" size="lg" className="w-full lg:w-auto">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            More filters
          </Link>
          <p className="text-xs text-muted">
            Verified listings only. Save a search to get alerts on new matches.
          </p>
        </div>
      </form>
    </div>
  );
}