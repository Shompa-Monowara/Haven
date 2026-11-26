import { useEffect } from "react";

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article" | "listing";
  jsonLd?: Record<string, unknown> | null;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

function siteOrigin() {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  return (configured || window.location.origin).replace(/\/$/, "");
}

export function Seo({
  title,
  description,
  path = "/",
  image,
  noIndex = false,
  type = "website",
  jsonLd = null,
}: SeoProps) {
  useEffect(() => {
    const origin = siteOrigin();
    const url = `${origin}${path}`;
    const imageUrl = image
      ? image.startsWith("http")
        ? image
        : `${origin}${image}`
      : `${origin}/favicon.svg`;

    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noIndex ? "noindex, nofollow" : "index, follow",
    });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: type === "listing" ? "website" : type,
    });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Haven" });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
    upsertLink("canonical", url);

    const existing = document.getElementById("haven-jsonld");
    existing?.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "haven-jsonld";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, path, image, noIndex, type, jsonLd]);

  return null;
}

export function listingJsonLd(input: {
  title: string;
  description: string;
  url: string;
  images: string[];
  price: number;
  publishedAt: string | null;
  address: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string;
  };
  location: { lat: number; lng: number } | null;
  beds: number;
  baths: number;
  sizeSqft: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: input.title,
    description: input.description,
    url: input.url,
    image: input.images.slice(0, 6),
    datePosted: input.publishedAt ?? undefined,
    numberOfRooms: input.beds || undefined,
    floorSize: input.sizeSqft
      ? { "@type": "QuantitativeValue", value: input.sizeSqft, unitCode: "FTK" }
      : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: input.address.street ?? undefined,
      addressLocality: input.address.city ?? undefined,
      addressRegion: input.address.state ?? undefined,
      postalCode: input.address.zip ?? undefined,
      addressCountry: input.address.country,
    },
    geo: input.location
      ? {
          "@type": "GeoCoordinates",
          latitude: input.location.lat,
          longitude: input.location.lng,
        }
      : undefined,
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
}