# Design Specification — Real Estate Listing Portal

**Working name:** Haven (placeholder; replace with final brand)
**Version:** 1.0
**Date:** November 20, 2026
**Reference:** [Houzez demo01](https://demo01.houzez.co/#)
**Stack:** React, Node.js + Express, MongoDB, Google Maps / Leaflet

---

## 1. Overview

### 1.1 Product summary

A real estate listing portal where agents publish properties and buyers or renters search, compare, save, and contact agents. Listings are reviewed by an administrator before they appear publicly.

### 1.2 Problem

Buyers and renters waste time across scattered, outdated property listings. Agents need a credible place to publish listings, and administrators need a lightweight moderation workflow.

### 1.3 Users and roles

| Role | Primary needs | Permissions |
| --- | --- | --- |
| Guest | Browse, search, view listings and agents, start an inquiry | Public pages only |
| Buyer / Renter | Search with filters and map, save favorites, save searches, contact agents, chat | Authenticated buyer features |
| Agent | Create and manage listings, respond to leads, track views and inquiries | Agent dashboard, own listings only |
| Admin | Review and approve listings, moderate users and agents, monitor activity | Full access, admin dashboard |

### 1.4 Goals

- Make finding a relevant property fast on both desktop and mobile.
- Make listing creation clear enough that an agent can publish without training.
- Make favorites, saved searches, and agent contact feel connected rather than separate tools.
- Give administrators a fast, auditable listing approval queue.
- Establish a trustworthy, editorial real estate aesthetic inspired by Houzez.

### 1.5 Success signals

- Search-to-property-detail click-through rate.
- Favorites and saved searches created per active user.
- Inquiry and chat conversion per property view.
- Median time from listing submission to admin decision.
- Mobile search completion rate.

### 1.6 Non-goals for v1

- Mortgage brokerage, payments, or transaction management.
- Multi-language and multi-currency support (design tokens should allow later extension).
- Public agent reviews and ratings unless moderation capacity exists.
- Native mobile apps; the product is a responsive web application.

---

## 2. Reference analysis: Houzez demo01

The reference is a premium WordPress real estate theme. It establishes a familiar, listing-first visual language. We adopt its strengths and correct its weak points rather than cloning it.

### 2.1 What we adopt

- Full-bleed hero image with an integrated property search panel.
- Listing cards with image, status badges, price, title, address, bed/bath/area meta, and agent row.
- Clear separation between residential and commercial property types.
- City discovery tiles and agent spotlight sections.
- Roboto for UI text and Roboto Slab for display headings.
- Bright azure accent against white surfaces, pale gray section backgrounds, and a dark navy footer.
- Generous vertical section rhythm and a professional, image-led feel.

### 2.2 What we improve

| Reference pattern | Our adaptation |
| --- | --- |
| Ten+ home page variants | One strong default home page; components remain reusable for future variants |
| Dense mega menu | Four primary nav items plus a compact "Explore" dropdown |
| White text on `#00AEFF` buttons (about 2.5:1 contrast) | Azure is used for accents and focus; primary buttons use a darker azure with white text |
| 14px body copy in places | 16px minimum body size for readability |
| Long single-page inquiry form | Short inquiry form with progressive detail and a clear success state |
| Listing grid without strong filter state | URL-synced filters, active filter chips, and result counts |
| No visible moderation workflow | Purpose-built admin approval queue with reasons and audit history |
| Map as a decorative section | Functional split list/map search with clustering and card-to-marker sync |

### 2.3 Reference tokens observed

- Azure accent: `#00AEFF`
- Border gray: `#DCE0E0`
- Body text gray: `#636363`
- Dark text: `#212529`
- Pale surface: `#F8F8F8`
- Fonts: Roboto, Roboto Slab

---

## 3. Design principles

1. **Listings first.** Photography, price, location, and key facts dominate every screen.
2. **Search is always one step away.** A search entry point appears in the header, home hero, and results toolbar.
3. **Clarity over decoration.** Use whitespace, typography, and a single accent color instead of gradients and ornament.
4. **Trust is visible.** Verified agents, approval status, accurate timestamps, and transparent pricing build confidence.
5. **Mobile is the primary search surface.** Filters, map, gallery, and contact must work with one hand.
6. **Accessible by default.** Contrast, focus, keyboard use, and reduced motion are requirements, not refinements.

---

## 4. Brand and visual language

### 4.1 Logo

- Wordmark "Haven" in Roboto Slab 700, with a simple roofline or doorway glyph.
- Primary lockup: ink wordmark on white; reverse lockup: white on ink.
- Minimum clear space: height of the glyph on all sides.
- Do not place the logo directly on busy photography without the header scrim.

### 4.2 Color palette

| Token | Hex | Use | Notes |
| --- | --- | --- | --- |
| `primary` | `#00AEFF` | Accent fills, focus rings, links on dark, active markers | Do not use white text on it; use ink text |
| `primary-strong` | `#0077B6` | Primary buttons, primary links on white | White text passes AA at 4.8:1 |
| `primary-soft` | `#E6F7FF` | Selected filters, soft highlights, info banners | |
| `ink` | `#0F1D26` | Footer, dark header variant, high-emphasis text | |
| `heading` | `#1F2A33` | Headings, property titles | |
| `body` | `#5B6770` | Body copy, secondary labels | |
| `muted` | `#8A97A1` | Timestamps, helper text, placeholders | Minimum 14px |
| `border` | `#DCE0E0` | Card borders, dividers, inputs | |
| `surface` | `#FFFFFF` | Cards, panels, header | |
| `surface-alt` | `#F6F8F9` | Section backgrounds, table stripes | |
| `success` | `#198754` | Approved, For Sale, positive stats | |
| `warning` | `#F5B301` | Featured, pending review | Use ink text |
| `danger` | `#DC3545` | Rejected, destructive actions, errors | |

Status color mapping:

- For Sale: success background tint with success text.
- For Rent: primary-soft background with primary-strong text.
- Featured: warning background with ink text.
- Pending review: warning tint with dark warning text.
- Approved: success tint with success text.
- Rejected: danger tint with danger text.
- Changes requested: amber tint with ink text.

### 4.3 Typography

- Display and section headings: **Roboto Slab**, fallback Georgia, serif.
- Body, UI labels, forms, tables: **Roboto**, fallback system sans-serif.
- Weights: 400 body, 500 labels and buttons, 600 card titles and subheads, 700 display and prices.
- Numerals: tabular numerals for prices, stats, and tables.

| Style | Font | Size / line height | Weight | Usage |
| --- | --- | --- | --- | --- |
| Display | Roboto Slab | 56 / 60, clamp 36–56 | 700 | Home hero |
| H1 | Roboto Slab | 40 / 48 | 700 | Page titles |
| H2 | Roboto Slab | 32 / 40 | 700 | Section headings |
| H3 | Roboto Slab | 24 / 32 | 600 | Sub-sections, property detail titles |
| H4 | Roboto | 20 / 28 | 600 | Card group titles, modal titles |
| Body large | Roboto | 18 / 30 | 400 | Hero subcopy, lead paragraphs |
| Body | Roboto | 16 / 26 | 400 | Default copy |
| Small | Roboto | 14 / 22 | 400/500 | Meta, helper text, table cells |
| Caption | Roboto | 12 / 16, +0.02em | 600 | Uppercase labels, badges |

Rules:

- Headline letter spacing: `-0.01em`.
- Avoid all-uppercase text longer than three words.
- Limit body line length to 70 characters.

### 4.4 Iconography

- Lucide or Feather icon set, 1.75px stroke, 20px default, 16px inline meta, 24px navigation.
- Icons always pair with text except universally understood controls: heart, share, search, close, chevron.
- Property meta order: bed, bath, garage, area, type.

### 4.5 Imagery

- Exterior hero images: bright, architectural, 16:9 or wider, with room for an overlay.
- Property cards: 4:3 crop, consistent warm-neutral grading.
- Interiors: natural light, uncluttered, no watermarks or agent branding.
- Agent portraits: square, neutral background, consistent crop.
- Use responsive `srcset`; never upscale below the source width.
- Demo content may use licensed Unsplash imagery. Do not reuse Houzez demo assets or branding.

### 4.6 Spacing, radius, elevation

- Base unit: 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
- Section padding: 96px desktop, 64px tablet, 48px mobile.
- Card padding: 20–24px. Page gutter: 24px desktop, 16px mobile.
- Radius: 4px small controls, 8px cards and inputs, 12px panels and modals, pill for chips and badges.
- Borders: 1px `border`; avoid shadows on flat list rows.
- Elevation:
  - `xs`: `0 1px 2px rgba(15,29,38,.06)`
  - `sm`: `0 2px 8px rgba(15,29,38,.08)`
  - `md`: `0 12px 32px rgba(15,29,38,.12)`
- Hover elevation is reserved for interactive cards and dropdowns.

### 4.7 Motion

- Fast: 150ms; base: 200ms; slow: 300ms; easing `cubic-bezier(.22,1,.36,1)`.
- Card hover: 2px lift, shadow from sm to md, image scale to 1.04.
- Respect `prefers-reduced-motion`; replace transforms with opacity changes.
- No autoplaying carousels; user-controlled only.
- Loading uses skeleton shimmer, not spinners, for content areas.

---

## 5. Layout system

### 5.1 Breakpoints

| Name | Min width | Grid | Behavior |
| --- | --- | --- | --- |
| Mobile | 0 | 4 col | Single-column cards, drawer nav, bottom sheets |
| Small tablet | 640 | 8 col | Two-column card grids begin |
| Tablet | 768 | 8 col | Two-column cards, visible filter bar |
| Desktop | 1024 | 12 col | Three-column cards, sticky sidebar |
| Wide | 1280 | 12 col | Max container, split map view |
| Ultra | 1536 | 12 col | Wider hero imagery only |

### 5.2 Container

- Standard: `max-width: 1240px`, 24px gutter.
- Wide (map and gallery): `max-width: 1440px`, 24px gutter.
- Content column for long text: `max-width: 760px`.

### 5.3 Page shell

- Utility top bar: 40px, ink background, phone, email, login/register, language placeholder.
- Main header: 80px, sticky, white on inner pages, transparent over the home hero, solid after 32px scroll.
- Content offset: account for header height in sticky elements.
- Footer: ink background, four columns, newsletter, legal row.

### 5.4 Header specification

Desktop:

- Left: logo.
- Center: Buy, Rent, Agents, Explore (dropdown: Cities, Property types, About, Contact, FAQ).
- Right: phone (icon only below 1280), Favorites with count, primary "List a property" button, avatar menu.
- Active nav item: 2px azure underline offset 8px below text.
- Transparent variant: white text and logo, subtle top-to-bottom ink gradient; switches to solid after scroll.

Mobile:

- Logo left, favorite and avatar icons right, hamburger far right.
- Drawer: full-height, white, grouped links, search field, login or account actions, phone.
- Focus trap in drawer; close on route change and Escape.

### 5.5 Footer specification

- Column 1: brand lockup, one-sentence description, social links.
- Column 2: Discover — cities.
- Column 3: Company — About, Agents, Contact, FAQ.
- Column 4: Newsletter — email field, consent note, submit.
- Bottom row: copyright, privacy, terms, equal housing note.
- Link hover: white; default: `rgba(255,255,255,.72)`.
- Newsletter success and error states inline.

---

## 6. Route map

| Route | Screen | Access |
| --- | --- | --- |
| `/` | Home | Public |
| `/properties` | Search results (grid/list) | Public |
| `/properties?view=map` | Split map search | Public |
| `/properties/:slug` | Property detail | Public; non-approved visible to owner/admin only |
| `/agents` | Agent directory | Public |
| `/agents/:id` | Agent profile | Public |
| `/login`, `/register`, `/forgot-password` | Authentication | Public |
| `/favorites` | Favorites and saved searches | Authenticated |
| `/saved-searches` | Saved searches | Authenticated |
| `/messages`, `/messages/:conversationId` | Chat center | Authenticated |
| `/account` | Buyer dashboard | Authenticated |
| `/agent` | Agent dashboard | Agent |
| `/agent/listings/new` | Listing wizard | Agent |
| `/agent/listings/:id/edit` | Edit listing | Agent, owner |
| `/agent/leads` | Inquiries and leads | Agent |
| `/admin`, `/admin/approvals` | Admin overview and approval queue | Admin |
| `/admin/listings`, `/admin/users` | Listing and user management | Admin |
| `/about`, `/contact`, `/faq` | Static pages | Public |
| `*` | 404 | Public |

---

## 7. Page specifications

### 7.1 Home

Purpose: establish trust, surface search, and route users into listings.

Sections, top to bottom:

1. **Hero** (640–720px desktop, 520px mobile)
   - Background photograph with ink gradient overlay, `rgba(15,29,38,.55)` to `rgba(15,29,38,.8)`.
   - Eyebrow: "Verified listings across 40+ cities".
   - Headline: "Find a home that fits your life."
   - Subcopy: "Search verified listings, compare neighborhoods, and connect directly with local agents."
   - Search panel: white, radius 12, `shadow-md`, overhanging the hero bottom by 40px on desktop.
   - Tabs: All, For Sale, For Rent.
   - Fields: Location combobox, Property type, Beds, Price range, Search button.
   - Secondary link: "More filters" opens the full filter panel.
   - Trust strip beneath: active listings, verified agents, average response time.
2. **Featured listings**
   - Section heading, short subcopy, "View all" link.
   - Four-card carousel on desktop with arrows and dot pagination; two-up tablet; one-up mobile.
   - Cards use the standard property card.
3. **Browse by property type**
   - Six tiles: Apartment, House, Villa, Studio, Office, Shop.
   - Each tile: image with ink gradient, type name, listing count, arrow on hover.
   - Two columns mobile, three tablet, six desktop.
4. **Explore cities**
   - Four large image tiles with city name and listing count.
   - Hover: image scale and reveal "Explore homes".
5. **Why choose us**
   - Three value props with icons: Verified listings, Local experts, Save and compare.
   - Alternating text/image layout optional; keep one consistent reading order.
6. **Agent spotlight**
   - Three agent cards with portrait, name, agency, verification badge, listing count, "View profile".
7. **Testimonials**
   - Three quote cards with 5-star row, quote, avatar, name, location.
   - No auto-rotation.
8. **Call to action band**
   - Ink or azure-soft background, "Have a property to list?" headline, primary "List a property", secondary "Talk to an agent".
9. **Footer**

Empty and error behavior:

- If featured data fails, show skeleton cards for 1.5s, then a retry block.
- Never leave a blank hero; use a static fallback image with a solid overlay.

### 7.2 Search results

Purpose: let users narrow a large inventory quickly and compare results.

Layout:

- Breadcrumb: Home / Properties / {City or "All homes"}.
- Page title and result count: "128 homes for sale in Brooklyn".
- Search summary bar: compact fields for location, type, price, and a "Filters" button; sticky below the header on desktop.
- Active filter chips beneath the bar, each removable; "Clear all" at the end.
- Toolbar: result count, sort select (Newest, Price low to high, Price high to low, Largest), layout toggle (Grid, List, Map).
- Left filter sidebar: 300px, sticky at 104px, scrolls independently.
- Results: 3-column grid at 1280+, 2-column at 768–1279, 1-column below 768.
- Pagination: numbered pages with previous/next; show 24 results per page.
- Footer.

Filter panel:

- Listing status: For Sale, For Rent.
- Property type: multi-select checkboxes.
- City / neighborhood: searchable checkbox list.
- Price: dual-handle range slider plus min and max inputs; rent uses monthly ranges.
- Bedrooms: Any, 1+, 2+, 3+, 4+, 5+ as segmented chips.
- Bathrooms: Any, 1+, 2+, 3+, 4+.
- Size: min and max square feet.
- Amenities: multi-select (parking, pool, gym, balcony, garden, elevator, furnished).
- Keyword field.
- Footer actions: "Reset" ghost, "Apply filters" primary. On desktop, changes apply on submit except removable chips; on mobile, apply on submit.

Interactions:

- All filters sync to the URL query string so results are shareable and back/forward works.
- Filter changes update the result count before the list finishes loading using a subtle inline loader.
- Active chips are removable; removing a chip updates results immediately.
- Mobile filters open in a bottom sheet at 90% height with a sticky apply bar showing the projected count.
- Grid/list preference is stored locally.
- Empty state: illustration, "No homes match these filters", reset button, and a suggestion to save the search for alerts.
- Loading: six skeleton cards plus a skeleton toolbar; preserve layout height.

List layout:

- Horizontal card: 280x210 image left, content center, price and actions right.
- Collapses to the standard vertical card below 768px.

### 7.3 Map search

Purpose: spatial discovery without losing the list.

Desktop split view:

- Left results rail: 44% width, independently scrollable; top toolbar and sort.
- Right map: 56% width, sticky, height `calc(100vh - 80px)` below the header; controls top-right (zoom, locate me, map/satellite where available).
- Results count and "Search this area" button float at the top of the map after the user pans.
- Marker and card hover/focus states sync in both directions.
- Clicking a marker opens a compact property popup with image, price, title, meta, and "View details".
- Clicking a marker also highlights the corresponding card and scrolls it into view.
- Cluster markers show count; clicking zooms to cluster bounds.
- Price pills use compact notation: `$876K`, `$4.5K/mo`; active marker switches to ink with white text.
- Default map style: light, low-contrast basemap (CARTO Positron or equivalent) with attribution.
- Fit bounds to results on initial load; do not reset the viewport on every filter change.
- Debounce map move events 400ms; only run a bounded search after "Search this area" to avoid jitter.

Mobile:

- Segmented control above the results: List | Map.
- Map uses full height minus header and toolbar.
- Tapping a marker opens a bottom preview card; close or swipe down to return.
- Filters remain a bottom sheet over either view.

Fallback:

- If map tiles fail, show a neutral grid surface with the message "Map unavailable" and keep the list fully usable.
- Always provide a visually hidden or off-screen list of results for screen readers.

### 7.4 Property detail

Purpose: answer every purchase or rental question and convert interest into contact.

Layout:

- Breadcrumb: Home / Properties / {City} / {Title}.
- Gallery: desktop mosaic with one large image and four thumbnails; "View all 24 photos" opens a full-screen lightbox. Mobile: swipeable carousel with counter.
- Header row: status and featured badges, title, address with pin icon, price, price per square foot for sales, rent period for rentals.
- Actions: favorite, share (copy link, email, social), print.
- Key facts bar: beds, baths, garages, area, property type, year built.
- Two-column content: 8-column main, 4-column sticky sidebar starting at 104px.
- Main sections: Overview, Property details grid, Amenities with icons, Floor plans, Location map, Mortgage estimate (optional), Similar properties.
- Sticky in-page tab bar on desktop after scrolling past the key facts: Overview, Gallery, Amenities, Location, Floor plans.
- Sidebar: agent card with avatar, name, verification, agency, rating, response time, phone reveal, "Message agent" primary, and inquiry form. On mobile, a sticky bottom bar shows price, favorite, and "Contact agent".
- Similar properties: three cards based on same city and type, within ±20% price.
- Footer.

Inquiry form fields:

- Full name, email, phone (optional), message, preferred tour date (optional), consent checkbox.
- Prefill the message: "I'm interested in {title}. Please send me more information."
- Validate on blur; disable submit while pending; success replaces the form with a confirmation and response-time estimate.
- If not authenticated, submitting prompts login or allows guest inquiry with email verification if the product supports it. Default v1: require an account to send an inquiry.

Status handling:

- Approved listings are public.
- Pending, rejected, or changes-requested listings are visible only to the owning agent and admins, with a status banner.
- Archived listings return a "This home is no longer available" state with similar properties.
- Invalid slug: 404.

Structured data:

- Emit `RealEstateListing` or `Product` JSON-LD with price, address, geo, images, and availability.

### 7.5 Favorites

Purpose: give buyers a shortlist they can return to.

- Page header: "Saved homes" with count; tabs: Favorites, Saved searches.
- Toolbar: sort (Recently saved, Price, Newest listing), grid/list toggle.
- Grid of property cards with an active heart; clicking removes the card with an undo toast.
- Optimistic removal; revert on API failure.
- Empty state: heart illustration, "No saved homes yet", supporting line, "Browse homes" primary.
- Guests are prompted to log in from a modal; after login they return to the intended page.
- Optional: store guest favorites locally and merge on login.
- Footer.

### 7.6 Saved searches

Purpose: turn a good search into a recurring alert.

- List of saved-search cards, each showing name, criteria chips, matches count, alert frequency, last run, and actions: Run search, Edit, Delete.
- Alert frequency: Off, Instant, Daily, Weekly; channel: Email and/or in-app.
- "Create saved search" is available from the search toolbar and saves the current URL criteria with an editable name.
- On save, toast: "Search saved. We'll email you when a new home matches."
- Edit opens a modal with name, frequency, and channels; criteria are shown read-only with a link to refine the search.
- Delete requires confirmation.
- Empty state explains the benefit and links back to search.
- Digest emails use the same card components and deep-link to the listing.

### 7.7 Agent directory and profile

Directory:

- Header, short introduction, search by name or agency, and a city filter.
- Grid of agent cards: portrait, name, verified badge, agency, city, active listings, response time, "View profile" and "Contact".
- Sort: Most listings, Recently active, A–Z.
- Empty state for no matches.

Profile:

- Cover banner, portrait, name, verified badge, agency, city, rating, response time, member since.
- Tabs or sections: About, Active listings, Reviews (if enabled), Contact.
- Active listings grid using standard cards.
- Inquiry form in a sticky sidebar on desktop; inline section on mobile.
- Contact actions: message (primary), call (reveals number), email.
- 404 for unknown agents.

### 7.8 Inquiry and chat

Inquiry modal:

- Opened from property cards, detail pages, and agent profiles.
- Context header shows the property thumbnail and title when applicable.
- Fields: name, email, phone, message, consent.
- Inline validation; success state with expected reply time; no full page reload.

Chat center:

- Desktop: two panes. Left conversation list 340px with search, unread badges, avatar, agent or buyer name, property context, last message, timestamp. Right thread with header (name, online dot, property chip, view listing), scrollable messages, and composer.
- Messages: incoming left on pale surface, outgoing right on primary-soft; timestamps; read ticks; attachment cards; system messages for status changes.
- Composer: text area with auto-grow, attachment button, send button; Enter sends, Shift+Enter adds a line.
- Typing indicator appears in the thread header.
- Empty conversation state: "Ask about this home, schedule a tour, or request more photos."
- Mobile: conversation list is the default view; opening a thread replaces it with a back button.
- Real-time via Socket.IO; fall back to polling or refresh on reconnect.
- Unread counts appear in the header and the account menu.
- Email notification is sent when the recipient is offline; respect notification preferences.

Agent lead inbox:

- Table or list of inquiries: buyer, property, date, status (New, Contacted, Qualified, Closed, Spam), last activity.
- Row opens the lead detail with the original inquiry, contact details, notes, and status control.
- Bulk status updates only for spam or closed, with confirmation.

### 7.9 Authentication

Routes: `/login`, `/register`, `/forgot-password`, `/reset-password`.

- Split layout: 55% form, 45% image with overlay quote and trust points; image hidden below 1024px.
- Login: email, password, show/hide, remember me, forgot password, inline errors, submit loading state.
- Register: full name, email, phone, password, confirm password, role choice (Buyer/Renter, Agent), consent.
- Agent registration adds agency name and optional license number; new agent accounts may require admin approval before listing.
- Password requirements displayed before submission; strength feedback.
- Social login (Google) is optional and must degrade gracefully.
- After login, redirect to the intended route; otherwise to the role dashboard.
- Terms and privacy links are visible but not pre-checked.

### 7.10 Buyer account

Layout: left sidebar (Overview, Favorites, Saved searches, Inquiries, Messages, Profile), main content, footer.

Overview cards:

- Saved homes count with the three most recent thumbnails.
- Active saved searches and new matches this week.
- Unread messages.
- Recent inquiries with status.

Profile:

- Name, email, phone, notification preferences, password change, delete account with confirmation.
- Avatar upload with square crop preview.

### 7.11 Agent dashboard

Layout: sidebar (Overview, My listings, Add listing, Leads, Messages, Analytics, Profile), main content.

Overview:

- KPI cards: active listings, total views (30 days), new leads, average response time.
- Chart: views and inquiries over 30 days, simple line or bar with accessible table fallback.
- Recent leads list and pending-listing status.

My listings:

- Table columns: cover thumbnail, title and address, status chip, price, views, leads, updated, actions.
- Filters: All, Draft, Pending, Approved, Changes requested, Rejected, Archived.
- Actions: Edit, Preview, Archive; delete only drafts, with confirmation.
- Empty state with "Create your first listing".
- Status chips are explained by a tooltip or legend.

Listing wizard (`/agent/listings/new`):

1. Basics: title, listing type, property type, description with character guidance.
2. Location: street, city, state, ZIP, country; map pin with drag to refine; neighborhood.
3. Details: beds, baths, garages, area, lot size, year built, amenities.
4. Photos: drag-and-drop uploader, reorder, choose cover, alt text, min 3 and max 20, JPG/PNG/WebP up to 10MB.
5. Pricing: price, rent period for rentals, optional fees, computed price per square foot.
6. Review and submit: summary of all steps, required-field checklist, save draft, submit for review.

Wizard behavior:

- Horizontal stepper with step numbers and labels; completed steps show a check.
- Per-step validation on Next; scroll to first error.
- Autosave draft every 30 seconds and on step change; show "Saved just now".
- Allow backward navigation without losing data.
- Submit opens a confirmation modal explaining review time; after submission, show a status timeline: Submitted, Under review, Decision.
- If changes are requested, show the admin note in a banner and prefill the wizard for editing.

Analytics:

- Views trend, inquiry trend, top-performing listings, favorites count.
- Date range: 7, 30, 90 days.
- No personal data beyond lead contact information the agent needs.

### 7.12 Admin console

Layout: sidebar (Overview, Approvals, Listings, Agents, Users, Inquiries, Settings), top bar with search and admin avatar.

Overview:

- KPI cards: pending approvals, live listings, new users (7 days), open inquiries.
- Approval queue preview, recent activity feed, and flagged content.
- Quick actions: Review next listing, View reported users.

Approval queue (`/admin/approvals`):

- Tabs: Pending (default), Changes requested, Approved, Rejected, All, each with a count.
- Table columns: property (thumbnail, title, city), agent, submitted time, price, status, actions.
- Filters: listing type, property type, city, date range, agent.
- Bulk selection for approving multiple clean listings; destructive bulk rejection is not allowed.
- Row opens a right-side review drawer at 720px:
  - Full gallery, title, price, address, details, description, amenities, agent and agency details.
  - Submission history and previous decisions.
  - Footer actions: "Request changes" (amber), "Reject" (danger), "Approve and publish" (primary).
- Approve: confirmation, then status change, audit entry, agent email and in-app notification.
- Reject: modal requires a reason category (incomplete information, poor photos, inaccurate pricing, duplicate, policy violation) plus an optional note; the note is sent to the agent.
- Request changes: same as reject but keeps the listing editable and resubmittable.
- Optimistic row removal from the pending tab after a decision; undo only before the request resolves.
- Empty queue: "You're all caught up" with the last decision time.

Listings management:

- Search all listings by title, agent, or city; filter by status; archive or restore; view public page.
- Destructive actions require confirmation and are recorded.

Users and agents:

- Tables with name, email, role, status (active, suspended), joined date, listing count.
- Suspend or reactivate with a reason; suspend hides listings from public search.
- Agent verification toggle with audit note.

Audit:

- Every status change records actor, timestamp, previous status, new status, and reason.
- Visible in the listing review drawer and an admin activity log.

### 7.13 Static pages

- About: mission, how verification works, team, CTA.
- Contact: inquiry form, office address with map, phone, email, hours, response-time note.
- FAQ: accordion grouped by Buying, Renting, Listing, Account.
- 404: friendly headline, search field, popular city links, "Back to home".
- 500 / error: retry action, support link, request ID for support.

---

## 8. Component library

### 8.1 Core components

| Component | Variants | Notes |
| --- | --- | --- |
| Button | Primary, Outline, Ghost, Danger, Link; sm/md/lg; loading, icon-only | 44px default height; 6px radius; 52px large for hero |
| Input | Text, email, phone, password, search, currency | 48px height; label above; helper and error below |
| Textarea | Default, counter | 120px min height; resizable vertically |
| Select / Combobox | Single, multi, async search | Native select on mobile where practical |
| Checkbox / Radio | Default, indeterminate | 20px control; 44px hit area |
| Switch | Default | Settings and alerts |
| Range slider | Single, dual | Show current values; keyboard operable |
| Chip | Filter, removable, static | 32px height; primary-soft when selected |
| Tabs | Underline, segmented, pill | Roving tabindex; arrow-key navigation |
| Badge | Status, count, featured | Pill; caption size; AA color pairs |
| Avatar | Circle, square, with status | Fallback initials |
| Tooltip | Top, bottom, left, right | Hover and focus; not for essential content |
| Modal | sm 400, md 560, lg 720 | Focus trap, Escape, scroll lock |
| Drawer | Right review, left mobile nav, bottom sheet | Sheet has drag handle and sticky actions |
| Toast | Success, error, info, undo | Top-right desktop, bottom-center mobile; 5s default |
| Accordion | Single, multiple | Used for FAQ and filters on mobile |
| Breadcrumb | With current page | Truncate middle items on mobile |
| Pagination | Numbered, prev/next | Hide page numbers below 480px |
| Skeleton | Card, line, map, table | Match final layout dimensions |
| Empty state | Default, compact | Illustration, title, explanation, one primary action |
| Stepper | Horizontal, vertical | Wizard and status timeline |
| Data table | Default, selectable, sticky header | Horizontal scroll on mobile |
| File uploader | Drag-and-drop, grid preview | Reorder, remove, set cover, progress |
| Stat card | Default, trend | Tabular numerals; accessible label for trend |

### 8.2 Property card

Grid card anatomy:

- Media: 4:3 image, 8px top radius.
- Badges: top-left stack of For Sale/For Rent and Featured.
- Favorite: 36px circular white button, top-right, 8px inset; heart fills danger or primary-strong when active.
- Body:
  - Price row: 20px/700 heading color, plus muted price per square foot or rent period.
  - Title: 18px/600, two-line clamp, whole card clickable.
  - Address: 14px muted with pin icon, one line with ellipsis.
  - Meta row: beds, baths, garages, area with 16px icons and 14px labels; separate with middot.
  - Divider.
  - Agent row: 24px avatar, name 13px/500, posted time 12px muted; optional verified icon.
- Hover: lift 2px, shadow md, image scale 1.04.
- Focus-visible: 2px azure ring with 2px offset; the link covers the card via a pseudo-element, while the heart and agent link remain separately focusable.
- Loading: skeleton with image block and three text lines.
- List variant: 280x210 image left at desktop; body right; price top-right; actions bottom-right; collapses at 768px.
- Compact map popup: 280px wide, 3:2 image, price, title, two meta items, link.

Rules:

- Price always visible without hover.
- Never truncate the price.
- Show "New" for listings under 7 days old instead of a posted date.
- Do not show agent phone numbers on cards.

### 8.3 Search bar

- Desktop: one row inside a white panel; 5 fields plus button.
- Fields: location combobox with city suggestions, property type select, beds select, price range select, search button.
- Rental tab swaps price options to monthly ranges and adds "Rent" to the button label.
- Mobile: stacked fields, 2-column rows for beds and price, full-width button; advanced filters link.
- Keyboard: Enter submits from any field; combobox supports arrow keys and Escape.

### 8.4 Map

- Provider abstraction: `leaflet` (default, OpenStreetMap or CARTO tiles) and optional `google` provider.
- Price-pill markers and count clusters.
- Active marker: ink fill, white text, scale 1.08, higher z-index.
- Popup card uses the compact property card.
- Controls: zoom, locate me, fullscreen; map attribution always visible.
- Respect saved viewport when returning from a property detail page.

### 8.5 Gallery and lightbox

- Mosaic desktop, swipe carousel mobile.
- Lightbox: full-screen ink background, image counter, previous/next, thumbnails, close, keyboard arrows, Escape to close, focus trap, download disabled.
- Alt text from listing photos; fall back to "Photo of {title}".
- Broken image fallback: pale surface with a home icon.

---

## 9. Forms and validation

- Labels are always visible above inputs; placeholders show examples, never replace labels.
- Required fields marked with an asterisk and `aria-required`.
- Validate on blur and on submit; clear errors on input.
- Error text: 12–14px danger, icon plus message, linked with `aria-describedby`.
- Helper text explains format before the user fails, for example "Use the format $450,000".
- Price inputs show a currency prefix and format on blur.
- Rent price shows `/mo` suffix and a period select (monthly, weekly, nightly).
- Phone inputs accept local formats and display a country hint.
- Submit buttons show a spinner and disable during requests; preserve form state on failure.
- Success uses a toast and, for inquiries, an inline confirmation state.
- Destructive actions use a confirmation modal with the object name and a danger button.
- Never clear a form after a server error.

---

## 10. States and feedback

| State | Treatment |
| --- | --- |
| Initial load | Skeletons matching the final layout; no layout shift |
| Refetching | Thin top progress bar and dimmed results at 60% opacity |
| Empty | Illustration, short explanation, one primary action |
| Error | Inline panel with retry; keep filters usable |
| Offline | Sticky banner: "You're offline. Some results may be out of date." |
| Permission denied | Explain the required role and offer login or return |
| Not found | 404 page with search and helpful links |
| Rate limited | Friendly message with retry time |
| Success | Toast, inline confirmation, or state transition with clear next step |

Toast copy should be specific: "Added to favorites", "Search saved", "Listing submitted for review".

---

## 11. Accessibility

Target: WCAG 2.1 AA.

- Contrast: body text at least 4.5:1; large text at least 3:1; never white on `#00AEFF`.
- Primary azure is used with ink text, or replaced by `primary-strong` for white text.
- Visible focus ring: 2px `primary` plus 2px offset; never remove outlines.
- Full keyboard path for navigation, filters, gallery, map results, chat, and admin tables.
- Map has a keyboard-accessible results list and an accessible alternative to marker-only discovery.
- Images have meaningful alt text; decorative images use empty alt.
- Form controls have programmatic labels and error associations.
- Modal and drawer focus traps restore focus to the trigger on close.
- Live regions announce result counts, filter changes, incoming chat messages, and toast content.
- Minimum target size 44x44px.
- Respect reduced motion; no flashing content; no autoplay audio.
- Tables use proper headers; status is conveyed by text, not color alone.
- Provide a skip link to main content.
- Test with screen readers (NVDA, VoiceOver), keyboard only, and 200% zoom.

---

## 12. Content and microcopy

Voice: confident, warm, specific, never salesy or vague.

- Sentence case for headings, buttons, and labels.
- Prices: `$876,000`; rent: `$4,500/mo`; area: `2,560 sq ft`.
- Dates: `Nov 18, 2026`; relative time for recent activity.
- Property types: Apartment, House, Villa, Studio, Condo, Office, Shop.
- Status labels: For Sale, For Rent, Featured, Pending review, Approved, Rejected, Changes requested.
- Use "home" in consumer copy and "listing" in agent and admin copy.

Examples:

- Hero: "Find a home that fits your life."
- Empty favorites: "No saved homes yet. Tap the heart on any listing to keep it here."
- Saved search: "Search saved. We'll email you when a new home matches."
- Inquiry success: "Message sent. Michelle usually replies within 2 hours."
- Rejection helper: "Tell the agent what needs fixing. They'll receive your note by email."
- Admin queue empty: "You're all caught up."
- Chat placeholder: "Ask about this home, schedule a tour, or request more photos."

Avoid: "Lorem ipsum" in production, "Click here", "Submit" as the only button label, and unexplained abbreviations.

---

## 13. Responsive behavior summary

| Area | Mobile (<768) | Tablet (768–1023) | Desktop (1024+) |
| --- | --- | --- | --- |
| Header | Logo, heart, avatar, hamburger drawer | Same | Full nav, actions, list button |
| Home hero | 520px, stacked search fields | Stacked two-column fields | 5-field search row |
| Property grid | 1 column | 2 columns | 3 columns |
| Filters | Bottom sheet | Collapsible panel | Sticky left sidebar |
| Map search | List/Map segmented toggle | Split with collapsible list | 44/56 split |
| Property gallery | Swipe carousel | Mosaic, smaller | Full mosaic |
| Property actions | Sticky bottom bar | Sidebar agent card | Sticky sidebar |
| Chat | Single pane with back | Two panes | Two panes |
| Wizard | Vertical steps, one per screen | Two-column fields | Sidebar summary plus form |
| Admin tables | Card list | Horizontal scroll | Full table plus review drawer |
| Footer | Accordion columns | Two columns | Four columns |

Touch:

- All tappable controls at least 44px.
- Swipe gestures never replace visible controls.
- Bottom sheets close with a visible close button and backdrop tap.
- Sticky bars account for safe-area insets.

---

## 14. Design tokens

```css
:root {
  --color-primary: #00aeff;
  --color-primary-strong: #0077b6;
  --color-primary-soft: #e6f7ff;
  --color-ink: #0f1d26;
  --color-heading: #1f2a33;
  --color-body: #5b6770;
  --color-muted: #8a97a1;
  --color-border: #dce0e0;
  --color-surface: #ffffff;
  --color-surface-alt: #f6f8f9;
  --color-success: #198754;
  --color-warning: #f5b301;
  --color-danger: #dc3545;

  --font-heading: "Roboto Slab", Georgia, "Times New Roman", serif;
  --font-body: "Roboto", system-ui, -apple-system, "Segoe UI", sans-serif;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;

  --shadow-xs: 0 1px 2px rgba(15, 29, 38, 0.06);
  --shadow-sm: 0 2px 8px rgba(15, 29, 38, 0.08);
  --shadow-md: 0 12px 32px rgba(15, 29, 38, 0.12);

  --container: 1240px;
  --container-wide: 1440px;
  --gutter: 24px;
  --header-height: 80px;
  --topbar-height: 40px;

  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Tailwind theme extension:

```js
theme: {
  extend: {
    colors: {
      brand: { DEFAULT: "#00AEFF", strong: "#0077B6", soft: "#E6F7FF" },
      ink: "#0F1D26",
      heading: "#1F2A33",
      body: "#5B6770",
      muted: "#8A97A1",
      line: "#DCE0E0",
      canvas: "#F6F8F9"
    },
    fontFamily: {
      sans: ["Roboto", "system-ui", "sans-serif"],
      display: ["Roboto Slab", "Georgia", "serif"]
    },
    borderRadius: { sm: "4px", md: "8px", lg: "12px" },
    maxWidth: { container: "1240px", wide: "1440px" },
    boxShadow: {
      xs: "0 1px 2px rgba(15,29,38,.06)",
      sm: "0 2px 8px rgba(15,29,38,.08)",
      md: "0 12px 32px rgba(15,29,38,.12)"
    }
  }
}
```

---

## 15. Data and API mapping

### 15.1 Core collections

| Collection | Key fields |
| --- | --- |
| User | name, email, phone, passwordHash, role (buyer, agent, admin), status, avatar, createdAt |
| AgentProfile | user, agency, bio, licenseNumber, verified, serviceAreas, responseTime, rating |
| Property | title, slug, description, listingType, propertyType, price, rentPeriod, pricePerSqft, beds, baths, garages, sizeSqft, lotSize, yearBuilt, address, location (GeoJSON Point), amenities, images, agent, status, featured, views, rejectionReason, reviewedBy, reviewedAt, createdAt |
| Favorite | user, property, createdAt; unique compound index |
| SavedSearch | user, name, criteria, alertFrequency, channels, lastRunAt, matchesCount |
| Inquiry | property, buyer, agent, name, email, phone, message, tourDate, status, createdAt |
| Conversation | participants, property, lastMessageAt |
| Message | conversation, sender, body, attachments, readBy, createdAt |
| Notification | user, type, payload, readAt |
| AuditLog | actor, action, entity, entityId, before, after, reason, createdAt |

Indexes:

- `Property`: `{ status: 1, listingType: 1, propertyType: 1, price: 1 }`, `{ "address.city": 1 }`, `{ location: "2dsphere" }`, text index on title, description, address.
- `Favorite`: unique `{ user: 1, property: 1 }`.
- `Message`: `{ conversation: 1, createdAt: 1 }`.

### 15.2 Listing status lifecycle

```
draft -> pending -> approved
                 -> changes_requested -> pending
                 -> rejected -> draft (optional resubmission)
approved -> archived
```

Rules:

- Only approved and non-archived listings appear in public search and detail pages.
- Agents can edit drafts and changes-requested listings freely; editing an approved listing returns it to pending if material fields change.
- Every transition writes an audit entry.
- Rejection requires a reason category.

### 15.3 API sketch

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/properties` | Search with filters, sort, pagination, bounds |
| GET | `/api/properties/:slug` | Property detail |
| GET | `/api/properties/mine` | Agent's listings |
| POST | `/api/properties` | Create draft |
| PATCH | `/api/properties/:id` | Update own draft or listing |
| POST | `/api/properties/:id/submit` | Submit for review |
| POST | `/api/properties/:id/archive` | Archive |
| GET | `/api/favorites` | Current user's favorites |
| POST | `/api/favorites/:propertyId` | Add favorite |
| DELETE | `/api/favorites/:propertyId` | Remove favorite |
| GET | `/api/saved-searches` | List saved searches |
| POST | `/api/saved-searches` | Create from criteria |
| PATCH | `/api/saved-searches/:id` | Rename or update alerts |
| DELETE | `/api/saved-searches/:id` | Delete |
| POST | `/api/inquiries` | Send inquiry |
| GET | `/api/inquiries` | Agent or admin inbox |
| PATCH | `/api/inquiries/:id` | Update lead status |
| GET | `/api/conversations` | Conversation list |
| GET | `/api/conversations/:id/messages` | Message history |
| POST | `/api/conversations/:id/messages` | Send message |
| GET | `/api/admin/listings` | Admin listing search |
| PATCH | `/api/admin/listings/:id/status` | Approve, reject, request changes |
| GET | `/api/admin/stats` | Admin KPIs |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh session |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user and role |
| POST | `/api/uploads/sign` | Signed upload or multipart upload |

Search query parameters:

```
q, listingType, propertyType, city, minPrice, maxPrice, beds, baths,
minSize, maxSize, amenities, featured, sort, page, limit,
bounds=swLng,swLat,neLng,neLat
```

`sort`: `newest`, `price_asc`, `price_desc`, `size_desc`.

Responses use a consistent envelope:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 24, "total": 128, "totalPages": 6 }
}
```

---

## 16. Implementation notes

### 16.1 Frontend structure

Suggested structure:

```
src/
  app/            router, providers, layout
  components/ui/  buttons, inputs, modal, toast, etc.
  features/
    properties/   cards, detail, gallery, wizard
    search/       filters, results, map
    favorites/    list, hooks
    saved-searches/
    agents/
    inquiries/
    chat/
    admin/
    auth/
  lib/            api client, query client, auth, format, map provider
  styles/         tokens.css, globals.css
```

Recommended libraries:

- React 18 + TypeScript + Vite.
- React Router for routing.
- TanStack Query for server state; Zustand or Context for auth and UI state.
- Tailwind CSS with the tokens above; shadcn/ui-style primitives are acceptable if re-themed to these tokens.
- React Hook Form + Zod for forms and shared validation.
- Leaflet + React Leaflet + marker clustering (default); Google Maps behind a provider interface if Places autocomplete or Street View is required.
- Embla Carousel or Swiper for galleries and featured carousels.
- Socket.IO client for chat.
- Sonner or an equivalent accessible toast library.
- Lucide React for icons.
- `yet-another-react-lightbox` or a custom accessible lightbox.

### 16.2 State rules

- URL query parameters are the source of truth for search filters, sort, layout, and pagination.
- TanStack Query keys include all search parameters and bounds.
- Favorites update optimistically with rollback on failure.
- Auth state comes from `/api/auth/me`; do not trust role claims stored only in local storage.
- Persist only harmless preferences locally: grid/list layout, recently viewed, reduced motion override if offered.

### 16.3 Map implementation

- Use Leaflet by default: no API key, predictable cost, sufficient for listing maps.
- Basemap: CARTO Positron or OpenStreetMap with required attribution.
- Use `divIcon` price pills and cluster icons rather than default markers.
- Server-side geospatial query with `$geoWithin` for viewport bounds and `$near` for "near me" if added.
- Cap map results at a reasonable number (for example 500) and cluster aggressively.
- Debounce `moveend`; trigger bounds queries only via "Search this area".
- Geocode addresses at listing creation, store a GeoJSON point, and allow manual pin adjustment.
- If Google Maps is selected, isolate it behind the same map component contract so the UI does not change.

### 16.4 Images and uploads

- Upload to Cloudinary, S3, or an equivalent object store; never store binaries in MongoDB.
- Generate three derivatives: thumb 400px, card 800px, hero 1600px; serve WebP/AVIF with fallbacks.
- Enforce max 20 photos, min 3 for submission, 10MB per file.
- Strip EXIF GPS except the explicit listing location.
- Use `loading="lazy"` and explicit width/height to prevent layout shift; eager-load only the hero and gallery cover.
- Provide alt text input per photo, defaulting to the listing title.

### 16.5 Authentication and security

- JWT access token in memory plus refresh token in an HttpOnly, Secure, SameSite cookie.
- Password hashing with bcrypt or argon2; rate-limit login and inquiry endpoints.
- Role and ownership checks on every agent and admin endpoint.
- Validate and sanitize all input server-side; sanitize rich description HTML.
- Helmet, CORS allowlist, request size limits, and upload MIME validation.
- Admin actions require an audit entry; never expose buyer contact data publicly.
- Use least-privilege database users and encrypted secrets.

### 16.6 Notifications

- In-app notifications for listing decisions, new inquiries, new messages, and saved-search matches.
- Email via Nodemailer, Resend, or SES with templates matching the visual system.
- Saved-search alerts: instant, daily, or weekly; batch matches and deep-link to results.
- Respect unsubscribe and notification preferences; include a one-click unsubscribe in marketing email.

### 16.7 SEO and performance

- Since the stack is a React SPA, inject page-specific meta tags or prerender public property and search pages for indexing.
- Use clean slugs: `/properties/design-apartment-brooklyn`.
- Add canonical URLs, Open Graph images, and `RealEstateListing` JSON-LD.
- Generate a sitemap for approved listings and agents.
- Set budgets: LCP under 2.5s on mobile 4G, CLS under 0.1, INP under 200ms.
- Code-split the map, lightbox, chat, and admin console.
- Virtualize long admin tables and limit public pagination.
- Use skeleton loading and prefetch the next page on hover.

### 16.8 Testing

- Unit and component tests: Vitest + React Testing Library.
- API tests: Supertest with an in-memory MongoDB.
- End-to-end: Playwright for search, favorite, inquiry, listing submission, and admin approval.
- Accessibility: axe checks in component tests plus manual keyboard and screen-reader passes.
- Visual regression for property cards, search results, and the approval drawer.

---

## 17. Requirement traceability

| Requirement | Screens | Components | APIs |
| --- | --- | --- | --- |
| Property listings with image gallery and details | Home, search results, property detail | Property card, gallery, lightbox, key facts, agent card | `GET /api/properties`, `GET /api/properties/:slug` |
| Search by city, price, type, and size with map view | Search results, map search | Search bar, filter panel, chips, map, markers, clusters | `GET /api/properties` with filters and bounds |
| Favorites | Favorites, header, cards | Heart button, favorite grid, empty state | `GET/POST/DELETE /api/favorites` |
| Saved searches | Saved searches, search toolbar | Saved-search card, alert settings, chips | `GET/POST/PATCH/DELETE /api/saved-searches` |
| Agent inquiry form and chat/contact | Property detail, agent profile, messages, agent leads | Inquiry modal, chat panes, message composer, lead table | `POST /api/inquiries`, conversations and messages, Socket.IO |
| Admin approval of listings | Admin approvals, listing review drawer | Status chips, review drawer, reason modal, audit log | `GET /api/admin/listings`, `PATCH /api/admin/listings/:id/status` |
| Agent listing creation | Agent wizard | Stepper, uploader, map pin, review step | `POST/PATCH /api/properties`, submit endpoint |
| Trust and verification | Cards, detail, agent pages | Verified badge, response time, status labels | Agent profile data |

---

## 18. Design QA checklist

- [ ] Every route is usable from 360px to 1440px without horizontal scrolling.
- [ ] Header and footer match the shell specification, including transparent-to-solid behavior.
- [ ] Primary buttons pass AA contrast; azure is not used behind white body text.
- [ ] All interactive elements have hover, focus-visible, active, disabled, and loading states.
- [ ] Search filters sync to the URL; back and forward restore the previous state.
- [ ] Empty, loading, error, offline, and permission states exist for every data view.
- [ ] Property cards show price, status, location, and key facts without interaction.
- [ ] Gallery supports keyboard, swipe, and lightbox with focus restoration.
- [ ] Map markers, clusters, popups, and card highlighting stay in sync.
- [ ] Favorites update optimistically and roll back on failure.
- [ ] Saved searches can be created, edited, and deleted, with alert preferences.
- [ ] Inquiry and chat forms validate inline and confirm success clearly.
- [ ] Admin decisions update public availability, write an audit entry, and notify the agent.
- [ ] Listing wizard validates per step, autosaves, and preserves data on error.
- [ ] Images are responsive, lazy-loaded outside the fold, and have alt text.
- [ ] Keyboard-only and screen-reader paths pass for search, filters, gallery, chat, and approvals.
- [ ] Reduced-motion preference removes non-essential animation.
- [ ] No placeholder copy remains in production-facing screens.
- [ ] Lighthouse targets: performance 85+, accessibility 95+, best practices 95+, SEO 90+.

---

## 19. Assumptions and open questions

- Final product name, logo, and brand assets are pending; "Haven" is a working placeholder.
- Currency and locale default to USD and US English; tokens should support later localization.
- Leaflet is the default map provider; Google Maps is optional and gated by API budget and Places requirements.
- Chat is in scope for v1 as agent-to-buyer messaging; group chat and file sharing beyond images/PDFs are out of scope.
- Agent accounts may require admin verification before their first listing; confirm this policy.
- Email delivery provider is undecided; templates and triggers are defined above.
- Whether guest inquiries are allowed is undecided; v1 assumes account-required inquiries to reduce spam.