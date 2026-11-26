import {
  ArrowLeft,
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  Calendar,
  Car,
  Check,
  Home,
  MapPin,
  Maximize,
  Printer,
  Share2,
  TriangleAlert,
} from "lucide-react";
import { Suspense, lazy, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { InquiryForm } from "@/components/property/InquiryForm";
import { MessageAgentButton } from "@/components/messages/MessageAgentButton";
import { Seo, listingJsonLd } from "@/components/seo/Seo";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/PropertyCard";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/api";
import { formatArea, formatPrice, formatRelativeDate, formatRent } from "@/lib/format";
import { useProperty, useSimilarProperties } from "@/lib/queries/properties";
import { useAuthStore } from "@/stores/auth-store";
import {
  cityCoordinates,
  propertyTypeLabels,
  rejectionCategoryLabels,
  rentPeriodLabels,
  statusLabels,
  statusTones,
  type PropertyDetail,
} from "@/types/property";

const LocationMap = lazy(() =>
  import("@/components/property/LocationMap").then((module) => ({
    default: module.LocationMap,
  })),
);

const BASE_TITLE = "Haven — Find a home that fits your life";

function priceLabel(property: PropertyDetail) {
  return property.listingType === "rent"
    ? formatRent(property.price, property.rentPeriod ?? "monthly")
    : formatPrice(property.price);
}

function addressLine(property: PropertyDetail) {
  return [
    property.address.street,
    property.address.city,
    property.address.state,
    property.address.zip,
  ]
    .filter(Boolean)
    .join(", ");
}

function StatusBanner({ property }: { property: PropertyDetail }) {
  if (property.status === "approved") return null;

  if (property.status === "archived") {
    return (
      <div className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-body" role="status">
        <span className="font-semibold text-heading">This home is no longer available.</span> It has
        been archived, but the details stay here for reference. Browse similar homes below.
      </div>
    );
  }

  const tone =
    property.status === "rejected" || property.status === "changes_requested"
      ? "border-warning/40 bg-warning-tint text-warning-text"
      : "border-brand/30 bg-brand-soft text-ink";

  const message =
    property.status === "draft"
      ? "This listing is a draft. Only you can see it until it is submitted and approved."
      : property.status === "pending"
        ? `This listing is under review${property.submittedAt ? ` (submitted ${formatRelativeDate(property.submittedAt)})` : ""}. Only you and admins can preview it until it is approved.`
        : property.status === "changes_requested"
          ? "An admin asked for changes before this listing can be published."
          : "This listing was rejected. Update it and resubmit when you are ready.";

  return (
    <div className={`rounded-lg border px-4 py-3.5 text-sm ${tone}`} role="status">
      <p className="flex items-center gap-2 font-semibold">
        {property.status === "pending" ? (
          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        {statusLabels[property.status]}
      </p>
      <p className="mt-1 leading-relaxed">{message}</p>
      {property.rejectionReason ? (
        <p className="mt-1.5 leading-relaxed">
          <span className="font-medium">
            {rejectionCategoryLabels[property.rejectionReason.category] ?? "Review note"}:
          </span>{" "}
          {property.rejectionReason.note ?? "No additional note was provided."}
        </p>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="shell-container space-y-6 py-8" aria-busy="true" aria-label="Loading property">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-[420px] w-full rounded-lg" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function PropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const user = useAuthStore((state) => state.user);
  const { data: property, isPending, error } = useProperty(slug);
  const { data: similar, isPending: similarPending } = useSimilarProperties(slug, Boolean(property));

  useEffect(() => {
    if (property) {
      document.title = `${property.title} · ${property.address.city ?? "Haven"} — Haven`;
    }
    return () => {
      document.title = BASE_TITLE;
    };
  }, [property]);

  if (isPending) return <DetailSkeleton />;

  const notFound = error instanceof ApiClientError && error.status === 404;

  if (notFound || !property) {
    return (
      <div className="section-pad">
        <div className="shell-container mx-auto max-w-xl text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-brand-strong">
            <Home className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[28px] font-bold leading-tight text-heading sm:text-[32px]">
            We could not find that home
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-body">
            The link may be out of date, or the listing is still in review and only visible to its
            agent.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/properties">Browse all homes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === property.agent?.id;
  const isArchived = property.status === "archived";
  const canInquire = property.status === "approved";
  const images = property.images;
  const mapCity = property.address.city?.trim().toLowerCase() ?? "";
  const fallbackCoordinates = cityCoordinates[mapCity];
  const mapCoordinates = property.location ?? fallbackCoordinates ?? null;
  const approximateLocation = !property.location && Boolean(fallbackCoordinates);
  const mapAddress = addressLine(property) || "Address available on request";
  const facts = [
    { icon: BedDouble, label: "Bedrooms", value: property.beds || "—" },
    { icon: Bath, label: "Bathrooms", value: property.baths || "—" },
    { icon: Car, label: "Garage", value: property.garages ? property.garages : "—" },
    { icon: Maximize, label: "Living area", value: property.sizeSqft ? formatArea(property.sizeSqft) : "—" },
    { icon: Building2, label: "Property type", value: propertyTypeLabels[property.propertyType] },
    { icon: Calendar, label: "Year built", value: property.yearBuilt ?? "—" },
  ];

  const detailRows = [
    { label: "Listing type", value: property.listingType === "sale" ? "For sale" : "For rent" },
    { label: "Property type", value: propertyTypeLabels[property.propertyType] },
    { label: "Bedrooms", value: property.beds },
    { label: "Bathrooms", value: property.baths },
    { label: "Garages", value: property.garages },
    { label: "Living area", value: property.sizeSqft ? formatArea(property.sizeSqft) : "—" },
    { label: "Lot size", value: property.lotSizeSqft ? formatArea(property.lotSizeSqft) : "—" },
    { label: "Year built", value: property.yearBuilt ?? "—" },
    {
      label: "Price per sq ft",
      value:
        property.listingType === "sale" && property.pricePerSqft
          ? `$${Math.round(property.pricePerSqft)}`
          : "—",
    },
    {
      label: "Rent period",
      value: property.rentPeriod ? rentPeriodLabels[property.rentPeriod] : "—",
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Listing link copied");
    } catch {
      toast.error("The link could not be copied");
    }
  }

  const sectionLinks = [
    { id: "overview", label: "Overview" },
    { id: "details", label: "Details" },
    { id: "amenities", label: "Amenities" },
    { id: "location", label: "Location" },
    { id: "similar", label: "Similar" },
  ];

  const canonicalPath = `/properties/${property.slug}`;
  const cover = images.find((image) => image.isCover) ?? images[0];
  const description =
    property.description.length > 155
      ? `${property.description.slice(0, 152).trim()}…`
      : property.description ||
        `${property.title} in ${property.address.city ?? "Haven"}. View photos, details, and contact the listing agent.`;

  return (
    <div className="pb-24 lg:pb-10">
      <Seo
        title={`${property.title} — ${property.address.city ?? "Haven"}`}
        description={description}
        path={canonicalPath}
        image={cover?.url}
        noIndex={property.status !== "approved"}
        type="listing"
        jsonLd={
          property.status === "approved"
            ? listingJsonLd({
                title: property.title,
                description: property.description,
                url: `${window.location.origin}${canonicalPath}`,
                images: images.map((image) => image.url),
                price: property.price,
                publishedAt: property.publishedAt,
                address: property.address,
                location: property.location,
                beds: property.beds,
                baths: property.baths,
                sizeSqft: property.sizeSqft,
              })
            : null
        }
      />
      <div className="shell-container py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-body">
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
            {property.address.city ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    to={`/properties?city=${encodeURIComponent(property.address.city)}`}
                    className="hover:text-heading hover:underline"
                  >
                    {property.address.city}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="truncate text-muted">
              {property.title}
            </li>
          </ol>
        </nav>

        <StatusBanner property={property} />

        <div className={property.status === "approved" ? "" : "mt-4"}>
          <PropertyGallery key={property.id} images={images} title={property.title} />
        </div>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={property.listingType === "sale" ? "sale" : "rent"}>
                {property.listingType === "sale" ? "For sale" : "For rent"}
              </Badge>
              {property.featured ? <Badge variant="featured">Featured</Badge> : null}
              {property.status !== "approved" ? (
                <Badge variant={statusTones[property.status]}>{statusLabels[property.status]}</Badge>
              ) : null}
              {isOwner ? <Badge variant="outline">Your listing</Badge> : null}
            </div>

            <h1 className="mt-3 text-[30px] font-bold leading-tight text-heading sm:text-[36px]">
              {property.title}
            </h1>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-body">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              {addressLine(property) || "Address available on request"}
            </p>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-display text-[32px] font-bold leading-none text-heading tabular">
                {priceLabel(property)}
              </p>
              {property.listingType === "sale" && property.pricePerSqft ? (
                <p className="text-sm text-body tabular">
                  ${Math.round(property.pricePerSqft)} per sq ft
                </p>
              ) : null}
              {property.listingType === "sale" ? (
                <p className="text-sm text-muted">
                  Listed {formatRelativeDate(property.publishedAt ?? property.createdAt)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <FavoriteButton property={property} variant="button" />
            <Button type="button" variant="outline" onClick={copyLink}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </Button>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em] text-muted">
                <fact.icon className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
                {fact.label}
              </dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-heading tabular">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="shell-container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="min-w-0">
            <nav
              aria-label="Property sections"
              className="sticky top-20 z-20 -mx-4 mb-6 hidden border-y border-line bg-surface/95 px-4 backdrop-blur lg:block"
            >
              <ul className="flex gap-6">
                {sectionLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      className="inline-flex h-12 items-center border-b-2 border-transparent text-sm font-medium text-body transition-colors hover:border-brand hover:text-heading"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <section id="overview" className="scroll-mt-24">
              <h2 className="text-[22px] font-bold text-heading">Overview</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-[28px] text-body">
                {property.description || "No description has been added for this home yet."}
              </p>
            </section>

            <section id="details" className="mt-10 scroll-mt-24">
              <h2 className="text-[22px] font-bold text-heading">Property details</h2>
              <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-sm">
                    <dt className="text-body">{row.label}</dt>
                    <dd className="font-medium text-heading tabular">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="amenities" className="mt-10 scroll-mt-24">
              <h2 className="text-[22px] font-bold text-heading">Amenities</h2>
              {property.amenities.length ? (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {property.amenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-2 text-sm text-body">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                      {amenity}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-body">No amenities have been listed for this home.</p>
              )}
            </section>

            <section id="location" className="mt-10 scroll-mt-24">
              <h2 className="text-[22px] font-bold text-heading">Location</h2>
              <p className="mt-2 text-sm text-body">{mapAddress}</p>
              <div className="mt-4 overflow-hidden rounded-lg border border-line">
                {mapCoordinates ? (
                  <Suspense
                    fallback={
                      <div
                        className="h-64 w-full animate-pulse bg-line/40"
                        aria-label="Loading map"
                      />
                    }
                  >
                    <LocationMap
                      lat={mapCoordinates.lat}
                      lng={mapCoordinates.lng}
                      title={property.title}
                      address={mapAddress}
                      approximate={approximateLocation}
                    />
                  </Suspense>
                ) : (
                  <div className="relative flex h-56 items-center justify-center bg-canvas">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-strong text-white shadow-md">
                      <MapPin className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-sm bg-surface/90 px-2 py-1 text-[11px] text-muted">
                      Exact location not provided
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 text-sm">
                  <p className="text-body">
                    {property.address.neighborhood ? `${property.address.neighborhood}, ` : ""}
                    {property.address.city}
                    {property.address.state ? `, ${property.address.state}` : ""}
                    {mapCoordinates ? (
                      <span className="ml-2 text-xs text-muted tabular">
                        {mapCoordinates.lat.toFixed(4)}, {mapCoordinates.lng.toFixed(4)}
                        {approximateLocation ? " · approximate" : ""}
                      </span>
                    ) : null}
                  </p>
                  {mapCoordinates ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${mapCoordinates.lat}&mlon=${mapCoordinates.lng}#map=16/${mapCoordinates.lat}/${mapCoordinates.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-strong hover:underline"
                    >
                      Open in maps
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {property.agent ? (
              <div className="rounded-lg border border-line bg-surface p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Listed by
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={property.agent.name} src={property.agent.avatar?.url} size="lg" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-heading">
                      <span className="truncate">{property.agent.name}</span>
                      {property.agent.verified ? (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-brand-strong" aria-label="Verified agent" />
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-body">{property.agent.agency ?? "Independent agent"}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-body">Typical reply</dt>
                    <dd className="font-medium text-heading">{property.agent.responseTimeMinutes} min</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-body">Member since</dt>
                    <dd className="font-medium text-heading">
                      {property.agent.memberSince
                        ? new Date(property.agent.memberSince).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-body">Listing views</dt>
                    <dd className="font-medium text-heading tabular">{property.views}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <div id="inquire" className="scroll-mt-24 space-y-3">
              <MessageAgentButton property={property} variant="primary" className="w-full" />
              {isArchived ? (
                <div className="rounded-lg border border-line bg-canvas p-5 text-sm text-body">
                  This home is no longer accepting inquiries.
                </div>
              ) : (
                <InquiryForm key={property.id} property={property} />
              )}
            </div>
          </aside>
        </div>

        <section id="similar" className="mt-12 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-bold text-heading">Similar properties</h2>
              <p className="mt-1 text-sm text-body">Homes in the same area and price range.</p>
            </div>
            <Link to="/properties" className="text-sm font-medium text-brand-strong hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similarPending ? (
              Array.from({ length: 3 }).map((_, index) => <PropertyCardSkeleton key={index} />)
            ) : similar?.length ? (
              similar.map((item) => <PropertyCard key={item.id} property={item} />)
            ) : (
              <p className="text-sm text-body">No similar homes are listed right now.</p>
            )}
          </div>
        </section>
      </div>

      {canInquire ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-lg font-bold text-heading tabular">{priceLabel(property)}</p>
              <p className="text-xs text-muted">{propertyTypeLabels[property.propertyType]}</p>
            </div>
            <div className="flex items-center gap-2">
              <FavoriteButton
                property={property}
                className="h-10 w-10 border border-line bg-surface"
              />
              <Button asChild>
                <a href="#inquire">Contact agent</a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}