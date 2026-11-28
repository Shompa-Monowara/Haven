import { env } from "../config/env";
import { AuditLogModel, type AuditLog } from "../models/audit-log.model";
import { AgentProfileModel } from "../models/agent-profile.model";
import { PropertyModel } from "../models/property.model";
import { UserModel } from "../models/user.model";
import { hashPassword } from "../services/auth.service";
import { logger } from "./logger";

const imageSet = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80",
];

function images(title: string, offset: number) {
  return [0, 1, 2].map((index) => ({
    url: imageSet[(offset + index) % imageSet.length]!,
    alt: `${title} — photo ${index + 1}`,
    isCover: index === 0,
    order: index,
  }));
}

async function ensureUser(input: {
  name: string;
  email: string;
  password: string;
  role: "buyer" | "agent";
  phone?: string;
}) {
  const existing = await UserModel.findOne({ email: input.email }).select("_id");

  if (existing) {
    const user = await UserModel.findById(existing._id);
    if (!user) throw new Error(`Seeded user ${input.email} disappeared`);
    return user;
  }

  return UserModel.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    status: "active",
  });
}

export async function seedDevContent(): Promise<void> {
  if (env.NODE_ENV !== "development" && process.env.ENABLE_DEMO_DATA !== "true") return;

  const buyer = await ensureUser({
    name: "Priya Shah",
    email: "buyer@haven.test",
    password: "HavenBuyer123",
    role: "buyer",
    phone: "+1 555 0142",
  });

  const agent = await ensureUser({
    name: "Maya Chen",
    email: "agent@haven.test",
    password: "HavenAgent123",
    role: "agent",
    phone: "+1 555 0137",
  });

  await AgentProfileModel.updateOne(
    { user: agent._id },
    {
      $set: {
        agency: "Harbor Realty",
        bio: "Twelve years helping buyers and renters find calm, well-built homes across Brooklyn and Austin.",
        licenseNumber: "NY-48213",
        verified: true,
        serviceAreas: ["Brooklyn", "Austin"],
        responseTimeMinutes: 45,
      },
      $setOnInsert: { user: agent._id },
    },
    { upsert: true },
  );

  const additionalAgents = [
    await ensureUser({
      name: "Daniel Ortiz",
      email: "daniel@haven.test",
      password: "HavenAgent123",
      role: "agent",
      phone: "+1 555 0110",
    }),
    await ensureUser({
      name: "Amara Okafor",
      email: "amara@haven.test",
      password: "HavenAgent123",
      role: "agent",
      phone: "+1 555 0121",
    }),
    await ensureUser({
      name: "Lucas Meyer",
      email: "lucas@haven.test",
      password: "HavenAgent123",
      role: "agent",
      phone: "+1 555 0163",
    }),
    await ensureUser({
      name: "Noah Feld",
      email: "noah@haven.test",
      password: "HavenAgent123",
      role: "agent",
      phone: "+1 555 0179",
    }),
  ];

  const agentProfiles = [
    {
      user: additionalAgents[0]!._id,
      agency: "Cedar & Co",
      bio: "Focused on family homes and quiet streets across Austin and Denver.",
      licenseNumber: "TX-70122",
      verified: true,
      serviceAreas: ["Austin", "Denver"],
      responseTimeMinutes: 60,
    },
    {
      user: additionalAgents[1]!._id,
      agency: "Skyline Partners",
      bio: "Rentals and first homes in Seattle and Chicago, with a focus on transit-friendly blocks.",
      licenseNumber: "WA-30991",
      verified: true,
      serviceAreas: ["Seattle", "Chicago"],
      responseTimeMinutes: 30,
    },
    {
      user: additionalAgents[2]!._id,
      agency: "Brick & Bay",
      bio: "Waterfront condos and villas across Miami and Brooklyn.",
      licenseNumber: "FL-55401",
      verified: false,
      serviceAreas: ["Miami", "Brooklyn"],
      responseTimeMinutes: 90,
    },
    {
      user: additionalAgents[3]!._id,
      agency: "Northgate Homes",
      bio: "Renovated walk-ups and lofts in Chicago and Brooklyn.",
      licenseNumber: "IL-11208",
      verified: true,
      serviceAreas: ["Chicago", "Brooklyn"],
      responseTimeMinutes: 40,
    },
  ];

  for (const profile of agentProfiles) {
    await AgentProfileModel.updateOne(
      { user: profile.user },
      {
        $set: {
          agency: profile.agency,
          bio: profile.bio,
          licenseNumber: profile.licenseNumber,
          verified: profile.verified,
          serviceAreas: profile.serviceAreas,
          responseTimeMinutes: profile.responseTimeMinutes,
        },
        $setOnInsert: { user: profile.user },
      },
      { upsert: true },
    );
  }

  // Idempotent portraits: refresh seeded avatars but never overwrite an avatar a
  // developer uploaded locally. Lucas intentionally has no photo so the initials
  // fallback stays visible.
  //
  // The four spotlight agents share one consistent studio set: head-and-shoulders
  // framing, face centered, looking at camera, plain light backgrounds, even
  // lighting. Portrait aspect is square and the Avatar crops from center 20%.
  const seededAvatars: Array<{ user: string; url: string }> = [
    {
      user: buyer._id.toString(),
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces&w=400&h=400&q=80",
    },
    {
      user: agent._id.toString(),
      url: "https://images.unsplash.com/photo-1758600587839-56ba05596c69?auto=format&fit=crop&crop=faces&w=400&h=400&q=80",
    },
    {
      user: additionalAgents[0]!._id.toString(),
      url: "https://images.unsplash.com/photo-1642257859842-c95f9fa8121d?auto=format&fit=crop&crop=faces&w=400&h=400&q=80",
    },
    {
      user: additionalAgents[1]!._id.toString(),
      url: "https://images.unsplash.com/photo-1765005204058-10418f5123c5?auto=format&fit=crop&crop=faces&w=400&h=400&q=80",
    },
    {
      user: additionalAgents[3]!._id.toString(),
      url: "https://images.unsplash.com/photo-1590086782792-42dd2350140d?auto=format&fit=crop&crop=faces&w=400&h=400&q=80",
    },
  ];

  for (const portrait of seededAvatars) {
    await UserModel.updateOne(
      {
        _id: portrait.user,
        $or: [
          { "avatar.url": { $exists: false } },
          { "avatar.url": null },
          { "avatar.url": /^https:\/\/images\.unsplash\.com\// },
        ],
      },
      { $set: { avatar: { url: portrait.url } } },
    );
  }

  const featureWindow = new Date(Date.now() + 30 * 86_400_000);
  const now = new Date();

  const base = {
    agent: agent._id,
    address: { country: "United States" },
  };

  const seededListings = [
    {
      ...base,
      title: "Sunlit brownstone with a private garden",
      slug: "sunlit-brownstone-with-a-private-garden-brooklyn",
      description:
        "A restored Brooklyn brownstone with original moldings, a chef's kitchen, and a deep garden that catches the afternoon sun. Two blocks from the park and a short walk to the express train.",
      listingType: "sale",
      propertyType: "house",
      price: 1_845_000,
      beds: 4,
      baths: 3,
      garages: 1,
      sizeSqft: 2860,
      lotSizeSqft: 3200,
      yearBuilt: 1908,
      address: {
        street: "148A Berkeley Place",
        city: "Brooklyn",
        state: "NY",
        zip: "11217",
        country: "United States",
        neighborhood: "Park Slope",
      },
      location: { type: "Point", coordinates: [-73.978, 40.6795] },
      amenities: ["Garden", "Fireplace", "Hardwood floors", "Dishwasher", "Laundry"],
      images: images("Sunlit brownstone", 0),
      status: "approved",
      featured: true,
      featuredUntil: featureWindow,
      publishedAt: new Date(now.getTime() - 2 * 86_400_000),
    },
    {
      ...base,
      title: "Corner loft with skyline windows",
      slug: "corner-loft-with-skyline-windows-brooklyn",
      description:
        "A corner loft in a converted warehouse with eleven-foot ceilings, exposed brick, and a wall of windows facing the Manhattan skyline. Flexible open plan with a dedicated sleeping alcove.",
      listingType: "rent",
      propertyType: "apartment",
      price: 4_600,
      rentPeriod: "monthly",
      beds: 2,
      baths: 2,
      garages: 0,
      sizeSqft: 1420,
      yearBuilt: 1922,
      address: {
        street: "55 Washington Street",
        city: "Brooklyn",
        state: "NY",
        zip: "11201",
        country: "United States",
        neighborhood: "DUMBO",
      },
      location: { type: "Point", coordinates: [-73.9904, 40.7033] },
      amenities: ["Elevator", "Doorman", "Gym", "Roof deck", "Furnished"],
      images: images("Corner loft", 2),
      status: "approved",
      featured: true,
      featuredUntil: featureWindow,
      publishedAt: new Date(now.getTime() - 5 * 86_400_000),
    },
    {
      ...base,
      title: "Mid-century ranch on a quiet cul-de-sac",
      slug: "mid-century-ranch-on-a-quiet-cul-de-sac-austin",
      description:
        "Carefully updated mid-century ranch with vaulted ceilings, a screened porch, and mature live oaks. The kitchen opens to a shaded patio with room for a long table.",
      listingType: "sale",
      propertyType: "house",
      price: 975_000,
      beds: 3,
      baths: 2,
      garages: 2,
      sizeSqft: 2140,
      lotSizeSqft: 8100,
      yearBuilt: 1964,
      address: {
        street: "4106 Balcones Drive",
        city: "Austin",
        state: "TX",
        zip: "78731",
        country: "United States",
        neighborhood: "Highland Park West",
      },
      location: { type: "Point", coordinates: [-97.7619, 30.3286] },
      amenities: ["Patio", "Carport", "Central air", "Dishwasher", "Garden"],
      images: images("Mid-century ranch", 4),
      status: "approved",
      featured: true,
      featuredUntil: featureWindow,
      publishedAt: new Date(now.getTime() - 8 * 86_400_000),
    },
    {
      ...base,
      title: "Top-floor condo with Puget Sound views",
      slug: "top-floor-condo-with-puget-sound-views-seattle",
      description:
        "A quiet top-floor home with water views, a wraparound balcony, and a renovated kitchen. The building includes secure parking, a shared roof terrace, and a gym.",
      listingType: "sale",
      propertyType: "condo",
      price: 1_120_000,
      beds: 2,
      baths: 2,
      garages: 1,
      sizeSqft: 1380,
      yearBuilt: 2007,
      address: {
        street: "2607 Western Avenue",
        city: "Seattle",
        state: "WA",
        zip: "98121",
        country: "United States",
        neighborhood: "Belltown",
      },
      location: { type: "Point", coordinates: [-122.3532, 47.6148] },
      amenities: ["Balcony", "Elevator", "Gym", "Parking", "Concierge"],
      images: images("Puget Sound condo", 1),
      status: "approved",
      featured: true,
      featuredUntil: featureWindow,
      publishedAt: new Date(now.getTime() - 11 * 86_400_000),
    },
    {
      ...base,
      title: "Light-filled studio near the river",
      slug: "light-filled-studio-near-the-river-denver",
      description:
        "An efficient studio with tall windows, built-in storage, and a small balcony. Steps from the river trail, coffee, and the light rail.",
      listingType: "rent",
      propertyType: "studio",
      price: 1_950,
      rentPeriod: "monthly",
      beds: 1,
      baths: 1,
      garages: 0,
      sizeSqft: 610,
      yearBuilt: 2016,
      address: {
        street: "1750 Little Raven Street",
        city: "Denver",
        state: "CO",
        zip: "80202",
        country: "United States",
        neighborhood: "Riverfront Park",
      },
      location: { type: "Point", coordinates: [-105.0054, 39.7543] },
      amenities: ["Balcony", "Elevator", "Gym", "Pet friendly", "Laundry"],
      images: images("Riverfront studio", 3),
      status: "approved",
      featured: false,
      publishedAt: new Date(now.getTime() - 14 * 86_400_000),
    },
    {
      ...base,
      title: "Garden villa with a shaded courtyard",
      slug: "garden-villa-with-a-shaded-courtyard-miami",
      description:
        "A single-story villa arranged around a private courtyard with a plunge pool. Impact windows, a summer kitchen, and a detached studio for guests or work.",
      listingType: "sale",
      propertyType: "villa",
      price: 2_350_000,
      beds: 4,
      baths: 4,
      garages: 2,
      sizeSqft: 3240,
      lotSizeSqft: 9600,
      yearBuilt: 1998,
      address: {
        street: "1120 Marabella Avenue",
        city: "Miami",
        state: "FL",
        zip: "33134",
        country: "United States",
        neighborhood: "Coral Gables",
      },
      location: { type: "Point", coordinates: [-80.2684, 25.7481] },
      amenities: ["Pool", "Courtyard", "Guest house", "Outdoor kitchen", "Gated"],
      images: images("Garden villa", 5),
      status: "approved",
      featured: false,
      publishedAt: new Date(now.getTime() - 19 * 86_400_000),
    },
    {
      ...base,
      title: "Renovated walk-up with a reading nook",
      slug: "renovated-walk-up-with-a-reading-nook-chicago",
      description:
        "A bright two-bedroom walk-up with a bay window, a small reading nook, and an updated galley kitchen. Laundry in the building and a shared back deck.",
      listingType: "rent",
      propertyType: "apartment",
      price: 2_850,
      rentPeriod: "monthly",
      beds: 2,
      baths: 1,
      garages: 0,
      sizeSqft: 980,
      yearBuilt: 1911,
      address: {
        street: "1528 West Roscoe Street",
        city: "Chicago",
        state: "IL",
        zip: "60657",
        country: "United States",
        neighborhood: "Lakeview",
      },
      location: { type: "Point", coordinates: [-87.6665, 41.9337] },
      amenities: ["Laundry", "Deck", "Hardwood floors", "Dishwasher"],
      images: images("Lakeview walk-up", 2),
      status: "pending",
      submittedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      ...base,
      title: "Rebuilt cottage with a wraparound porch",
      slug: "rebuilt-cottage-with-a-wraparound-porch-austin",
      description:
        "A rebuilt cottage with a wraparound porch, an open living room, and a small fenced yard. The listing needs updated exterior photos before it can be published.",
      listingType: "sale",
      propertyType: "house",
      price: 720_000,
      beds: 2,
      baths: 2,
      garages: 1,
      sizeSqft: 1240,
      lotSizeSqft: 5200,
      yearBuilt: 1948,
      address: {
        street: "2205 East 12th Street",
        city: "Austin",
        state: "TX",
        zip: "78702",
        country: "United States",
        neighborhood: "Holly",
      },
      location: { type: "Point", coordinates: [-97.7226, 30.2664] },
      amenities: ["Porch", "Fenced yard", "Central air"],
      images: images("Rebuilt cottage", 4),
      status: "changes_requested",
      rejectionReason: {
        category: "poor_photos",
        note: "Please add two daylight photos of the front elevation and one of the backyard.",
      },
      submittedAt: new Date(now.getTime() - 4 * 86_400_000),
      reviewedAt: new Date(now.getTime() - 3 * 86_400_000),
    },
    {
      ...base,
      title: "Pre-war two-bedroom off the High Line",
      slug: "pre-war-two-bedroom-off-the-high-line-new-york",
      description:
        "A pre-war two-bedroom in Chelsea with ten-foot ceilings, oak floors, and oversize windows facing west. The building has a part-time doorman, a bike room, and a shared roof deck, two blocks from the High Line.",
      listingType: "sale",
      propertyType: "apartment",
      price: 1_285_000,
      beds: 2,
      baths: 2,
      garages: 0,
      sizeSqft: 1040,
      yearBuilt: 1926,
      address: {
        street: "245 West 19th Street",
        city: "New York",
        state: "NY",
        zip: "10011",
        country: "United States",
        neighborhood: "Chelsea",
      },
      location: { type: "Point", coordinates: [-74.0007, 40.7424] },
      amenities: ["Elevator", "Doorman", "Hardwood floors", "Dishwasher", "Laundry"],
      images: images("Pre-war Chelsea apartment", 1),
      status: "approved",
      featured: false,
      publishedAt: new Date(now.getTime() - 6 * 86_400_000),
    },
    {
      ...base,
      title: "Bright studio steps from the park",
      slug: "bright-studio-steps-from-the-park-new-york",
      description:
        "A compact, light-filled studio in Hell's Kitchen with a renovated kitchen, a walk-in closet, and a small work nook. Steps from the park, the subway, and the theater district.",
      listingType: "rent",
      propertyType: "studio",
      price: 3_150,
      rentPeriod: "monthly",
      beds: 1,
      baths: 1,
      garages: 0,
      sizeSqft: 620,
      yearBuilt: 2015,
      address: {
        street: "445 West 54th Street",
        city: "New York",
        state: "NY",
        zip: "10019",
        country: "United States",
        neighborhood: "Hell's Kitchen",
      },
      location: { type: "Point", coordinates: [-73.9907, 40.7661] },
      amenities: ["Elevator", "Gym", "Doorman", "Laundry", "Pet friendly"],
      images: images("Hell's Kitchen studio", 3),
      status: "approved",
      featured: false,
      publishedAt: new Date(now.getTime() - 9 * 86_400_000),
    },
    {
      ...base,
      title: "Spanish-style bungalow with a citrus garden",
      slug: "spanish-style-bungalow-with-a-citrus-garden-los-angeles",
      description:
        "A 1920s Spanish-style bungalow in Los Feliz with arched doorways, hand-painted tile, and a private garden of citrus and olive trees. A detached studio opens to the patio and the hillside view.",
      listingType: "sale",
      propertyType: "house",
      price: 1_975_000,
      beds: 4,
      baths: 3,
      garages: 2,
      sizeSqft: 2380,
      lotSizeSqft: 6900,
      yearBuilt: 1928,
      address: {
        street: "3821 Franklin Avenue",
        city: "Los Angeles",
        state: "CA",
        zip: "90027",
        country: "United States",
        neighborhood: "Los Feliz",
      },
      location: { type: "Point", coordinates: [-118.2871, 34.1062] },
      amenities: ["Garden", "Fireplace", "Patio", "Central air", "Garage"],
      images: images("Los Feliz bungalow", 5),
      status: "approved",
      featured: false,
      publishedAt: new Date(now.getTime() - 13 * 86_400_000),
    },
    {
      ...base,
      title: "Venice cottage with a sunlit courtyard",
      slug: "venice-cottage-with-a-sunlit-courtyard-los-angeles",
      description:
        "A quiet two-bedroom cottage on a walk street in Venice, arranged around a sunlit courtyard. Updated kitchen, a small deck for morning coffee, and a short bike ride to the boardwalk.",
      listingType: "rent",
      propertyType: "house",
      price: 5_400,
      rentPeriod: "monthly",
      beds: 2,
      baths: 2,
      garages: 1,
      sizeSqft: 1150,
      lotSizeSqft: 4100,
      yearBuilt: 1946,
      address: {
        street: "742 Nowita Place",
        city: "Los Angeles",
        state: "CA",
        zip: "90291",
        country: "United States",
        neighborhood: "Venice",
      },
      location: { type: "Point", coordinates: [-118.4695, 33.995] },
      amenities: ["Courtyard", "Deck", "Dishwasher", "Laundry", "Pet friendly"],
      images: images("Venice cottage", 0),
      status: "approved",
      featured: false,
      publishedAt: new Date(now.getTime() - 17 * 86_400_000),
    },
  ];

  // Ownership map: spread the seeded listings across the four spotlight agents
  // so every profile that appears on the home page has approved homes.
  const listingOwners: Array<{ slug: string; agent: (typeof agent._id) }> = [
    { slug: "sunlit-brownstone-with-a-private-garden-brooklyn", agent: agent._id },
    { slug: "renovated-walk-up-with-a-reading-nook-chicago", agent: agent._id },
    { slug: "corner-loft-with-skyline-windows-brooklyn", agent: additionalAgents[0]!._id },
    { slug: "mid-century-ranch-on-a-quiet-cul-de-sac-austin", agent: additionalAgents[0]!._id },
    { slug: "top-floor-condo-with-puget-sound-views-seattle", agent: additionalAgents[1]!._id },
    { slug: "light-filled-studio-near-the-river-denver", agent: additionalAgents[1]!._id },
    { slug: "garden-villa-with-a-shaded-courtyard-miami", agent: additionalAgents[3]!._id },
    { slug: "rebuilt-cottage-with-a-wraparound-porch-austin", agent: additionalAgents[3]!._id },
    // New York and Los Angeles lanes, one per spotlight agent, so the hardcoded
    // city links resolve.
    { slug: "pre-war-two-bedroom-off-the-high-line-new-york", agent: additionalAgents[1]!._id },
    { slug: "bright-studio-steps-from-the-park-new-york", agent: additionalAgents[0]!._id },
    { slug: "spanish-style-bungalow-with-a-citrus-garden-los-angeles", agent: agent._id },
    { slug: "venice-cottage-with-a-sunlit-courtyard-los-angeles", agent: additionalAgents[3]!._id },
  ];

  // Idempotent seeding by slug: insert only listings whose slug is missing, so a
  // developer's edits to already-seeded listings are never overwritten.
  const existingSlugs = new Set(
    (await PropertyModel.distinct("slug", {
      slug: { $in: seededListings.map((listing) => listing.slug) },
    })) as string[],
  );
  const missingListings = seededListings.filter((listing) => !existingSlugs.has(listing.slug));

  if (missingListings.length > 0) {
    await PropertyModel.create(missingListings);
  }

  // Assign owners, touching only the rows inserted on this run so existing
  // documents (and their owners) stay untouched.
  const insertedSlugs = new Set(missingListings.map((listing) => listing.slug));
  for (const { slug, agent: owner } of listingOwners) {
    if (!insertedSlugs.has(slug)) continue;
    await PropertyModel.updateOne({ slug }, { $set: { agent: owner } });
  }

  // Seed a realistic moderation history so the admin audit page and its entity
  // filters have data. Only when the log is empty, so restarts do not duplicate it.
  const admin = await UserModel.findOne({ role: "admin" }).select("_id");
  const existingAuditCount = await AuditLogModel.countDocuments();

  if (admin && existingAuditCount === 0) {
    const auditSlugs = [
      "renovated-walk-up-with-a-reading-nook-chicago",
      "sunlit-brownstone-with-a-private-garden-brooklyn",
      "rebuilt-cottage-with-a-wraparound-porch-austin",
    ];
    const auditProperties = await PropertyModel.find({ slug: { $in: auditSlugs } }).select(
      "_id slug",
    );
    const propertyIdBySlug = new Map(
      auditProperties.map((property) => [property.slug, property._id]),
    );

    const submitted = propertyIdBySlug.get("renovated-walk-up-with-a-reading-nook-chicago");
    const approved = propertyIdBySlug.get("sunlit-brownstone-with-a-private-garden-brooklyn");
    const rejected = propertyIdBySlug.get("rebuilt-cottage-with-a-wraparound-porch-austin");
    const lucas = additionalAgents[2]!;
    const day = 86_400_000;
    const baseTime = Date.now();

    const auditEntries: Array<Partial<AuditLog>> = [];

    if (submitted) {
      auditEntries.push({
        actor: admin._id,
        action: "property.submitted",
        entity: "Property",
        entityId: submitted,
        before: { status: "draft" },
        after: { status: "pending" },
        ip: "127.0.0.1",
        createdAt: new Date(baseTime - 5 * day),
      });
    }

    if (approved) {
      auditEntries.push({
        actor: admin._id,
        action: "property.approved",
        entity: "Property",
        entityId: approved,
        before: { status: "pending" },
        after: { status: "approved" },
        ip: "127.0.0.1",
        createdAt: new Date(baseTime - 4 * day),
      });
    }

    if (rejected) {
      auditEntries.push({
        actor: admin._id,
        action: "property.rejected",
        entity: "Property",
        entityId: rejected,
        before: { status: "pending" },
        after: { status: "rejected" },
        reason: {
          category: "poor_photos",
          note: "Exterior photos were unclear. Please add daylight shots of the front and yard.",
        },
        ip: "127.0.0.1",
        createdAt: new Date(baseTime - 3 * day),
      });
    }

    auditEntries.push({
      actor: admin._id,
      action: "user.suspended",
      entity: "User",
      entityId: lucas._id,
      before: { status: "active" },
      after: { status: "suspended" },
      reason: { category: "moderation", note: "Listing policy review." },
      ip: "127.0.0.1",
      createdAt: new Date(baseTime - 2 * day),
    });

    auditEntries.push({
      actor: admin._id,
      action: "user.reactivated",
      entity: "User",
      entityId: lucas._id,
      before: { status: "suspended" },
      after: { status: "active" },
      ip: "127.0.0.1",
      createdAt: new Date(baseTime - 1.5 * day),
    });

    auditEntries.push({
      actor: admin._id,
      action: "agent.verified",
      entity: "AgentProfile",
      entityId: agent._id,
      before: { verified: false },
      after: { verified: true },
      ip: "127.0.0.1",
      createdAt: new Date(baseTime - day),
    });

    await AuditLogModel.create(auditEntries);
    logger.warn({ entries: auditEntries.length }, "Seeded development audit log entries");
  }

  logger.warn(
    {
      buyer: buyer.email,
      agents: ["agent@haven.test", ...additionalAgents.map((entry) => entry.email)],
      listings: seededListings.length,
    },
    "Seeded development accounts and listings",
  );
}