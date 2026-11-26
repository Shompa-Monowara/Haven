import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const site = (process.env.VITE_SITE_URL || "https://haven.example.com").replace(/\/$/, "");
const template = await readFile(path.join(dist, "index.html"), "utf8");

const routes = [
  {
    path: "/",
    title: "Haven - Find a home that fits your life",
    description:
      "Search verified homes for sale and rent, compare neighborhoods, and connect directly with local agents.",
  },
  {
    path: "/properties",
    title: "Search homes for sale and rent | Haven",
    description:
      "Search verified homes for sale and rent by city, price, property type, bedrooms, and amenities.",
  },
  {
    path: "/agents",
    title: "Find a local agent - Haven",
    description:
      "Browse verified Haven agents by name, agency, or service area. See their active listings and typical response time.",
  },
  {
    path: "/about",
    title: "About Haven - A calmer way to find a home",
    description:
      "Haven is a listing-first portal built around verified homes, local agents, and moderation review.",
  },
  {
    path: "/contact",
    title: "Contact Haven",
    description: "Questions about your account, a listing review, or working with Haven? Pick a channel.",
  },
  {
    path: "/faq",
    title: "Frequently asked questions - Haven",
    description: "Short answers for buyers, renters, and agents using Haven.",
  },
  {
    path: "/privacy",
    title: "Privacy policy - Haven",
    description: "What Haven stores, why we store it, and the controls available to you.",
  },
  {
    path: "/terms",
    title: "Terms of use - Haven",
    description: "The rules for using Haven as a buyer, renter, agent, or administrator.",
  },
  {
    path: "/list-property",
    title: "List a property - Haven",
    description:
      "Verified agents get a focused listing workflow with autosaved drafts and a clear review before publishing.",
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function page(templateHtml, route, staticBody) {
  const url = `${site}${route.path}`;
  let html = templateHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(route.description)}" />`,
    );

  if (staticBody) {
    html = html.replace('<div id="root"></div>', `<div id="root">${staticBody}</div>`);
  }

  const tags = [
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="${route.noIndex ? "noindex, nofollow" : "index, follow"}" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Haven" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    route.prefetch
      ? `<link rel="prefetch" as="fetch" href="${route.prefetch}" crossorigin="anonymous" />`
      : "",
    route.inlineScript ? `<script>${route.inlineScript}</script>` : "",
    route.preloadImage
      ? `<link rel="preload" as="image" href="${route.preloadImage.href}"${route.preloadImage.srcset ? ` imagesrcset="${route.preloadImage.srcset}" imagesizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"` : ""} fetchpriority="high" />`
      : "",
  ].filter(Boolean);

  html = html.replace("</head>", `${tags.join("\n    ")}\n  </head>`);
  return html;
}

const homeStatic = `<section class="relative -mt-20 flex min-h-[600px] items-end overflow-hidden bg-ink lg:min-h-[680px]"><img src="/hero-home-1280.webp" srcset="/hero-home-768.webp 768w, /hero-home-1280.webp 1280w" sizes="100vw" alt="" width="1280" height="853" fetchpriority="high" decoding="async" class="absolute inset-0 h-full w-full object-cover" /><div class="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/60 to-ink/85"></div><div class="shell-container relative z-10 pb-32 pt-32 md:pb-36 md:pt-36"><div class="max-w-3xl text-white"><p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/75"><span class="inline-block h-1.5 w-1.5 rounded-full bg-brand"></span>Verified listings across 40+ cities</p><h1 class="mt-5 font-display text-[36px] font-bold leading-[1.05] tracking-[-0.01em] text-white sm:text-[44px] lg:text-[56px]">Find a home that fits your life.</h1><p class="mt-5 max-w-xl text-[17px] leading-[30px] text-white/80 sm:text-lg">Search verified listings, compare neighborhoods, and connect directly with local agents who know the market.</p></div></div></section>`;

let searchResults = null;

try {
  const response = await fetch(
    "http://localhost:4000/api/properties?sort=newest&page=1&limit=24",
    { signal: AbortSignal.timeout(5000) },
  );
  if (response.ok) searchResults = await response.json();
} catch {
  console.log("Search API unavailable during prerender; shipping shell without result cards");
}

function unsplashSrcSet(url) {
  if (!url?.includes("images.unsplash.com")) return { src: url, srcset: "" };
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("q", "65");
    parsed.searchParams.set("auto", "format");
    const widths = [480, 720, 960];
    const srcset = widths
      .map((width) => {
        const variant = new URL(parsed);
        variant.searchParams.set("w", String(width));
        return `${variant.toString()} ${width}w`;
      })
      .join(", ");
    parsed.searchParams.set("w", "960");
    return { src: parsed.toString(), srcset };
  } catch {
    return { src: url, srcset: "" };
  }
}

function money(value) {
  return `$${Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function priceLabel(property) {
  if (property.listingType === "rent") {
    const suffix =
      property.rentPeriod === "weekly" ? "/wk" : property.rentPeriod === "nightly" ? "/night" : "/mo";
    return `${money(property.price)}${suffix}`;
  }
  return money(property.price);
}

function staticPropertyCard(property, index) {
  const image = property.images?.find((item) => item.isCover) ?? property.images?.[0];
  const media = unsplashSrcSet(image?.url);
  const city = [property.address?.city, property.address?.state].filter(Boolean).join(", ");
  const priority = index < 2;

  return `<article class="group relative flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface"><div class="relative aspect-[4/3] overflow-hidden bg-canvas">${
    image
      ? `<img src="${escapeHtml(media.src)}"${media.srcset ? ` srcset="${escapeHtml(media.srcset)}"` : ""} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" alt="${escapeHtml(image.alt || property.title)}" loading="${priority ? "eager" : "lazy"}"${priority ? ' fetchpriority="high"' : ""} class="h-full w-full object-cover" />`
      : ""
  }<div class="absolute left-3 top-3 flex flex-col gap-1.5"><span class="inline-flex rounded-pill px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.02em] ${property.listingType === "rent" ? "bg-brand-soft text-brand-strong" : "bg-success-tint text-success"}">${property.listingType === "rent" ? "For rent" : "For sale"}</span></div></div><div class="flex flex-1 flex-col p-4"><p class="text-xl font-bold leading-tight text-heading">${priceLabel(property)}</p><h3 class="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug text-heading">${escapeHtml(property.title)}</h3><p class="mt-1 text-sm text-body">${escapeHtml(city || "Location available on request")}</p><p class="mt-3 text-sm text-body">${property.beds ? `${property.beds} bd` : ""}${property.baths ? ` · ${property.baths} ba` : ""}${property.sizeSqft ? ` · ${Number(property.sizeSqft).toLocaleString("en-US")} sq ft` : ""}</p></div></article>`;
}

const propertiesStatic = `<div class="shell-container pt-5"><nav aria-label="Breadcrumb" class="text-sm text-body">Home / Properties</nav><h1 class="mt-3 text-[26px] font-bold leading-tight text-heading sm:text-[32px]">Search verified homes</h1><p class="mt-2 max-w-2xl text-[15px] leading-7 text-body">Filter by city, price, property type, bedrooms, and amenities. Results load as you refine the search.</p></div>${
  searchResults?.data?.length
    ? `<div class="shell-container mt-6"><div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">${searchResults.data
        .slice(0, 3)
        .map(staticPropertyCard)
        .join("")}</div></div>`
    : ""
}`;

const staticBodies = {
  "/": homeStatic,
  "/properties": propertiesStatic,
  "/agents": `<div class="shell-container py-12"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-brand-strong">Local expertise</p><h1 class="mt-3 max-w-3xl text-[32px] font-bold leading-tight text-heading sm:text-[42px]">Find an agent who knows the block</h1><p class="mt-4 max-w-2xl text-[15px] leading-7 text-body">Every Haven agent is reviewed before publishing. Compare agencies, service areas, response times, and the homes they represent.</p></div>`,
};

const propertiesRoute = routes.find((route) => route.path === "/properties");
if (propertiesRoute && searchResults) {
  propertiesRoute.inlineScript = `window.__HAVEN_SEARCH__=${JSON.stringify(searchResults).replaceAll("<", "\\u003c")};`;

  const first = searchResults.data?.[0];
  const firstImage =
    first?.images?.find?.((image) => image.isCover) ?? first?.images?.[0] ?? null;
  if (firstImage?.url) {
    const media = unsplashSrcSet(firstImage.url);
    propertiesRoute.preloadImage = {
      href: escapeHtml(media.src),
      srcset: escapeHtml(media.srcset),
    };
  }
}

for (const route of routes) {
  const html = await page(template, route, staticBodies[route.path] ?? null);
  if (route.path === "/") {
    await writeFile(path.join(dist, "index.html"), html);
    continue;
  }

  const directory = path.join(dist, route.path.replace(/^\//, ""));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html);
}

await writeFile(
  path.join(dist, "404.html"),
  await page(template, {
    path: "/404",
    title: "Page not found - Haven",
    description: "The page you requested could not be found. Search Haven for homes instead.",
    noIndex: true,
  }),
);

const sitemapEntries = routes
  .map(
    (route) =>
      `  <url><loc>${site}${route.path}</loc><changefreq>${route.path === "/" || route.path === "/properties" ? "daily" : "monthly"}</changefreq></url>`,
  )
  .join("\n");

await writeFile(
  path.join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
);

await writeFile(
  path.join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /account$\nDisallow: /account/\nDisallow: /agent$\nDisallow: /agent/\nDisallow: /admin$\nDisallow: /admin/\nDisallow: /messages$\nDisallow: /messages/\n\nSitemap: ${site}/sitemap.xml\n`,
);

console.log(`Prerendered ${routes.length} public routes, 404, sitemap, and robots for ${site}`);