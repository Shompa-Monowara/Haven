import { BadgeCheck, Bath, BedDouble, Car, Home, MapPin, Maximize } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "@/components/ui/avatar";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { Badge } from "@/components/ui/badge";
import { formatArea, formatPrice, formatRelativeDate, formatRent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { coverImage, propertyTypeLabels, type PropertySummary } from "@/types/property";

function priceLabel(property: PropertySummary) {
  return property.listingType === "rent"
    ? formatRent(property.price, property.rentPeriod ?? "monthly")
    : formatPrice(property.price);
}

export function PropertyListCard({ property }: { property: PropertySummary }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = coverImage(property.images);
  const address = [property.address.neighborhood, property.address.city, property.address.state]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row">
      <Link
        to={`/properties/${property.slug}`}
        className="absolute inset-0 z-10 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label={`${property.title}, ${priceLabel(property)}`}
      />
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-canvas sm:aspect-auto sm:h-[210px] sm:w-[280px]">
        {image && !imageFailed ? (
          <img
            src={image.url}
            alt={image.alt || property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
            <Home className="h-8 w-8" aria-hidden="true" />
            <span className="text-xs">Photo unavailable</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <Badge variant={property.listingType === "sale" ? "sale" : "rent"}>
            {property.listingType === "sale" ? "For sale" : "For rent"}
          </Badge>
          {property.featured ? <Badge variant="featured">Featured</Badge> : null}
        </div>
        <FavoriteButton property={property} className="absolute right-3 top-3 z-20" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight text-heading tabular">
              {priceLabel(property)}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-heading">
              {property.title}
            </h3>
          </div>
          {property.listingType === "sale" && property.pricePerSqft ? (
            <p className="shrink-0 text-xs text-muted tabular">
              ${Math.round(property.pricePerSqft)}/sq ft
            </p>
          ) : null}
        </div>

        <p className="flex items-center gap-1.5 text-sm text-body">
          <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate">{address || "Location available on request"}</span>
        </p>

        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-body" aria-label="Property details">
          {property.beds > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-muted" aria-hidden="true" />
              <span className="tabular">{property.beds}</span> bd
            </li>
          ) : null}
          {property.baths > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-muted" aria-hidden="true" />
              <span className="tabular">{property.baths}</span> ba
            </li>
          ) : null}
          {property.garages > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <Car className="h-4 w-4 text-muted" aria-hidden="true" />
              <span className="tabular">{property.garages}</span> car
            </li>
          ) : null}
          {property.sizeSqft > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <Maximize className="h-4 w-4 text-muted" aria-hidden="true" />
              {formatArea(property.sizeSqft)}
            </li>
          ) : null}
          <li className="text-xs text-muted">{propertyTypeLabels[property.propertyType]}</li>
        </ul>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={property.agent?.name ?? "Haven"} src={property.agent?.avatar?.url} size="sm" />
            <span className="truncate text-[13px] font-medium text-body">
              {property.agent?.name ?? "Haven agent"}
            </span>
            {property.agent?.verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-strong" aria-label="Verified agent" />
            ) : null}
          </span>
          <span className={cn("text-xs text-muted")}>
            {formatRelativeDate(property.publishedAt ?? property.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}