import type { PropertyListQuery } from "../validation/property.schemas";

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds the Mongo filter for public (approved, non-hidden) property searches.
 *
 * When `textSearch` is enabled and a keyword is present, Mongo's text index is
 * used instead of a regex match (callers must also sort by `textScore`).
 */
export function buildPublicPropertyFilter(
  query: PropertyListQuery,
  options: { textSearch?: boolean } = {},
) {
  const filter: Record<string, unknown> = {
    status: "approved",
    hiddenBySuspension: { $ne: true },
  };

  if (query.listingType) filter.listingType = query.listingType;
  if (query.propertyType?.length) filter.propertyType = { $in: query.propertyType };
  if (query.city) filter["address.city"] = new RegExp(`^${escapeRegex(query.city)}$`, "i");
  if (query.neighborhood) {
    filter["address.neighborhood"] = new RegExp(`^${escapeRegex(query.neighborhood)}$`, "i");
  }
  if (query.featured !== undefined) {
    filter.featured = query.featured;
    if (query.featured) {
      filter.$or = [{ featuredUntil: null }, { featuredUntil: { $gt: new Date() } }];
    }
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {
      ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
    };
  }
  if (query.beds !== undefined) filter.beds = { $gte: query.beds };
  if (query.baths !== undefined) filter.baths = { $gte: query.baths };
  if (query.minSize !== undefined || query.maxSize !== undefined) {
    filter.sizeSqft = {
      ...(query.minSize !== undefined ? { $gte: query.minSize } : {}),
      ...(query.maxSize !== undefined ? { $lte: query.maxSize } : {}),
    };
  }
  if (query.amenities?.length) {
    filter.amenities = {
      $all: query.amenities.map((amenity) => new RegExp(`^${escapeRegex(amenity)}$`, "i")),
    };
  }
  if (query.bounds) {
    const [swLng, swLat, neLng, neLat] = query.bounds;
    filter.location = {
      $geoWithin: {
        $box: [
          [swLng, swLat],
          [neLng, neLat],
        ],
      },
    };
  }
  if (query.q) {
    if (options.textSearch) {
      filter.$text = { $search: query.q };
    } else {
      const term = new RegExp(escapeRegex(query.q), "i");
      filter.$and = [
        ...((filter.$and as unknown[]) ?? []),
        {
          $or: [
            { title: term },
            { "address.city": term },
            { "address.neighborhood": term },
            { "address.zip": term },
            { "address.street": term },
          ],
        },
      ];
    }
  }

  return filter;
}