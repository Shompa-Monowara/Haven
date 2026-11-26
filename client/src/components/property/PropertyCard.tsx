import { BadgeCheck, Bath, BedDouble, Car, Home, MapPin, Maximize } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatArea, formatPrice, formatRelativeDate, formatRent } from "@/lib/format";
import { imageSrcSet, resizedImage } from "@/lib/images";
import { coverImage, propertyTypeLabels, type PropertySummary } from "@/types/property";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: PropertySummary;
  className?: string;
  priority?: boolean;
}

function priceLabel(property: PropertySummary) {
  if (property.listingType === "rent") {
    return formatRent(property.price, property.rentPeriod ?? "monthly");
  }
  return formatPrice(property.price);
}

function isNew(property: PropertySummary) {
  return Date.now() - new Date(property.publishedAt ?? property.createdAt).getTime() < 7 * 86_400_000;
}

export function PropertyCard({ property, className, priority = false }: PropertyCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = coverImage(property.images);
  const addressLine = [property.address.neighborhood, property.address.city, property.address.state]
    .filter(Boolean)
    .join(", ");

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface transition duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <Link
        to={`/properties/${property.slug}`}
        className="absolute inset-0 z-10 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label={`${property.title}, ${priceLabel(property)}`}
      />

      <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
        {image && !imageFailed ? (
          <img
            src={resizedImage(image.url, 960)}
            srcSet={imageSrcSet(image.url)}
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            alt={image.alt || property.title}
            loading={priority ? "eager" : "lazy"}
            {...({ fetchpriority: priority ? "high" : "auto" } as Record<string, string>)}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-canvas text-muted">
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

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-xl font-bold leading-tight text-heading tabular">{priceLabel(property)}</p>
          {property.listingType === "sale" && property.pricePerSqft ? (
            <p className="text-xs text-muted tabular">${Math.round(property.pricePerSqft)}/sq ft</p>
          ) : null}
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug text-heading">
          {property.title}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-sm text-body">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate">{addressLine || "Location available on request"}</span>
        </p>

        <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-body" aria-label="Property details">
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
        </ul>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar
                name={property.agent?.name ?? "Haven"}
                src={property.agent?.avatar?.url}
                size="sm"
              />
              <span className="truncate text-[13px] font-medium text-body">
                {property.agent?.name ?? "Haven agent"}
              </span>
              {property.agent?.verified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-brand-strong" aria-label="Verified agent" />
              ) : null}
            </span>
            <span className="shrink-0 text-xs text-muted">
              {isNew(property) ? "New" : formatRelativeDate(property.publishedAt ?? property.createdAt)}
            </span>
          </div>
        </div>

        <span className="mt-2 text-[11px] uppercase tracking-[0.06em] text-muted">
          {propertyTypeLabels[property.propertyType]}
        </span>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2 border-t border-line pt-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
    </div>
  );
}