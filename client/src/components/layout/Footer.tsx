import { Clock, Heart, Mail, MapPin, Phone } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubscribed(true);
    setEmail("");
  }

  return (
    <footer className="bg-ink text-white">
      <div className="shell-container grid gap-x-10 gap-y-12 pt-14 pb-12 md:grid-cols-2 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-4">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Haven home">
            <svg viewBox="0 0 32 32" className="h-8 w-8 text-brand" fill="none" aria-hidden="true">
              <path
                d="M5 14.5 16 5l11 9.5V27a1 1 0 0 1-1 1h-6.5v-7.5h-7V28H6a1 1 0 0 1-1-1V14.5Z"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display text-2xl font-bold tracking-tight">Haven</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Verified listings, local experts, and a simpler way to find a home that fits your life.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href="https://instagram.com"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="IG - Haven on Instagram"
              rel="noreferrer noopener"
              target="_blank"
            >
              <span className="text-sm font-semibold" aria-hidden="true">
                IG
              </span>
            </a>
            <a
              href="https://linkedin.com"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="in - Haven on LinkedIn"
              rel="noreferrer noopener"
              target="_blank"
            >
              <span className="text-sm font-semibold" aria-hidden="true">
                in
              </span>
            </a>
            <a
              href="https://x.com"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="X - Haven on X"
              rel="noreferrer noopener"
              target="_blank"
            >
              <span className="text-sm font-semibold" aria-hidden="true">
                X
              </span>
            </a>
          </div>
        </div>

        <nav aria-labelledby="footer-discover" className="lg:col-span-2">
          <h2 id="footer-discover" className="flex h-8 items-center text-xs font-semibold uppercase tracking-[0.08em] text-white/50">
            Discover
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              ["New York", "/properties?city=New%20York"],
              ["Brooklyn", "/properties?city=Brooklyn"],
              ["Los Angeles", "/properties?city=Los%20Angeles"],
              ["Miami", "/properties?city=Miami"],
              ["All cities", "/properties"],
            ].map(([label, href]) => (
              <li key={label}>
                <Link to={href} className="text-white/75 transition-colors hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-company" className="lg:col-span-2">
          <h2 id="footer-company" className="flex h-8 items-center text-xs font-semibold uppercase tracking-[0.08em] text-white/50">
            Company
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              ["About Haven", "/about"],
              ["Agents", "/agents"],
              ["Contact", "/contact"],
              ["FAQ", "/faq"],
              ["List a property", "/list-property"],
            ].map(([label, href]) => (
              <li key={label}>
                <Link to={href} className="text-white/75 transition-colors hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-4">
          <h2 className="flex h-8 items-center text-xs font-semibold uppercase tracking-[0.08em] text-white/50">Stay in the loop</h2>
          <p className="mt-4 text-sm text-white/70">
            New listings and neighborhood guides, once a week.
          </p>
          <form className="mt-4" onSubmit={handleSubscribe}>
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  aria-hidden="true"
                />
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setSubscribed(false);
                  }}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-md border border-white/15 bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
              <button
                type="submit"
                className="h-11 shrink-0 rounded-md bg-brand px-4 text-sm font-semibold text-ink transition-colors hover:bg-[#33bfff]"
              >
                Subscribe
              </button>
            </div>
            <p className="mt-3 text-xs text-white/50">
              {subscribed
                ? "You are on the list. Watch your inbox for the first digest."
                : "By subscribing you agree to our privacy policy. Unsubscribe anytime."}
            </p>
          </form>

          <div className="mt-8 space-y-2.5 text-sm text-white/70">
            <a href="tel:+18005550142" className="flex items-center gap-2.5 hover:text-white">
              <Phone className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
              (800) 555-0142
            </a>
            <a href="mailto:hello@haven.example" className="flex items-center gap-2.5 hover:text-white">
              <Mail className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
              hello@haven.example
            </a>
            <p className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
              14 Harbor Street, Brooklyn, NY
            </p>
            <p className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
              Mon–Fri, 9am–6pm ET
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="shell-container flex flex-col gap-3 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Haven. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-white">
              Terms
            </Link>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
              Equal housing opportunity
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}