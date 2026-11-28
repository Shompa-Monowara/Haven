# Haven — Real Estate Listing Portal

Online property listings are often scattered across different sites and go out of date fast. Haven puts verified listings in one place. Agents publish properties with photos and details. An admin reviews every listing before it goes live. Buyers and renters search with filters and a map, save what they like, and contact the agent directly.

**Live demo:** https://haven-six-woad.vercel.app
**API:** https://haven-vbn2.onrender.com/api/health
**Repository:** https://github.com/Shompa-Monowara/Haven

---

## Features

**For buyers and renters**
- Browse sale and rental listings with an image gallery, full details and a location map
- Filter by city, price range, property type, size, bedrooms and keyword
- Switch between list view and an interactive map with clustered price markers
- Save favorites (guest favorites carry over after sign-in)
- Save a search and get daily or weekly email alerts for new matches
- Send an inquiry to the listing agent, or start a real-time chat

**For agents**
- Multi-step listing wizard with image upload, cover selection and map pin placement
- Submit listings for review, then edit, archive or restore them
- Leads inbox for inquiries, plus listing analytics (views, saves, inquiries)

**For admins**
- Approval queue: approve, reject or request changes with a reason
- Bulk approval, listing moderation and user management
- Audit log of every moderation decision
- Platform settings

**General**
- Role-based dashboards for buyer, agent and admin
- In-app notifications and live online status in chat
- Pre-rendered public pages, sitemap and SEO metadata
- Responsive layout for mobile and desktop

---

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI |
| State & data | TanStack Query, Zustand, React Hook Form, Zod |
| Maps | Leaflet, Leaflet.markercluster |
| Charts | Recharts |
| Notifications | react-toastify |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB with Mongoose (geospatial + text indexes) |
| Real-time | Socket.IO |
| Auth | JWT access token + rotating refresh token (HttpOnly cookie), bcrypt |
| Media | Cloudinary (local disk fallback), Sharp |
| Email | Brevo API / Nodemailer |
| Testing | Vitest, Supertest, mongodb-memory-server |
| Deployment | Vercel (client), Render (API), MongoDB Atlas |

---

## Project Structure

```
haven-real-estate/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── components/  # UI, layout, search, property, dashboard
│   │   ├── pages/       # Route pages (public, buyer, agent, admin)
│   │   ├── lib/         # API client, queries, helpers
│   │   └── stores/      # Zustand stores
│   └── scripts/         # Pre-render step for public pages
├── server/              # Express API
│   └── src/
│       ├── routes/      # REST endpoints
│       ├── services/    # Business logic
│       ├── models/      # Mongoose schemas
│       ├── middleware/  # Auth, rate limiting, errors
│       ├── validation/  # Zod request schemas
│       └── __tests__/   # API tests
└── package.json         # npm workspaces root
```

---

## Getting Started

### Prerequisites
- Node.js 20 or later
- MongoDB (local or Atlas)

### Installation

```bash
git clone https://github.com/Shompa-Monowara/Haven
cd haven-real-estate
npm install
```

### Environment variables

Copy the example files and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Main server variables:

| Variable | Description |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Random strings, 32+ characters |
| `CORS_ORIGIN` | Allowed client origin(s), comma-separated |
| `TRUST_PROXY` | Number of proxy hops in front of the API |
| `CLOUDINARY_*` | Optional. Without these, images are stored locally |
| `BREVO_API_KEY` or `SMTP_*` | Optional. Without these, emails are logged to the console |
| `ENABLE_DEMO_DATA` | Set to `true` to seed demo accounts outside development |

Main client variables:

| Variable | Description |
| --- | --- |
| `VITE_SITE_URL` | Public site URL, used for SEO tags and the sitemap |
| `VITE_SOCKET_URL` | API origin for real-time chat (leave empty locally) |
| `VITE_SHOW_DEMO_LOGIN` | Set to `true` to show demo accounts on the login page |

### Run locally

```bash
npm run dev
```

The client runs on `http://localhost:5173` and the API on `http://localhost:4000`. In development the server seeds demo accounts and sample listings on its own.

### Other scripts

```bash
npm run build        # Build client and server
npm run typecheck    # Type-check both workspaces
npm test             # Run API tests
npm run seed:admin -w server   # Create or update an admin account
```

---

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@haven.test | HavenAdmin123 |
| Agent | agent@haven.test | HavenAgent123 |
| Buyer | buyer@haven.test | HavenBuyer123 |

---

## Listing Workflow

```
Draft → Pending review → Approved (public)
                       ↘ Changes requested / Rejected → Agent edits → Pending review
```

When an agent makes a major edit to an approved listing, it goes back to review. Only approved listings appear in public search.

---

## Deployment

- **Client:** Vercel. `client/vercel.json` rewrites `/api` and `/uploads` to the Render API, so auth cookies stay first-party.
- **Server:** Render web service with `npm run build -w server` and `npm start -w server`.
- **Database:** MongoDB Atlas.
- **Media:** Cloudinary, because Render's disk is cleared on every redeploy.

---

## Future Improvements

- Google Maps as an optional map provider
- Component and end-to-end tests (React Testing Library, Playwright)
- Mortgage calculator and price history
- Agent reviews and ratings
- Multi-language support