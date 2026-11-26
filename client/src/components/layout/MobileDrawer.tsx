import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, LogOut, Mail, Phone, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/auth-actions";
import { useAuthStore } from "@/stores/auth-store";
import { roleHome, roleLabels } from "@/types/auth";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const primaryLinks = [
  { label: "Buy a home", href: "/properties?listingType=sale" },
  { label: "Rent a home", href: "/properties?listingType=rent" },
  { label: "Find an agent", href: "/agents" },
];

const exploreLinks = [
  { label: "Cities", href: "/properties" },
  { label: "Property types", href: "/properties" },
  { label: "About Haven", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

export function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    onOpenChange(false);
    navigate(trimmed ? `/properties?q=${encodeURIComponent(trimmed)}` : "/properties");
  }

  const close = () => onOpenChange(false);

  async function handleSignOut() {
    close();
    await signOut();
    toast.success("Signed out");
    navigate("/");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-ink/50 lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm animate-slide-in-right flex-col overflow-y-auto bg-surface p-6 shadow-md focus:outline-none lg:hidden">
          <div className="flex items-center justify-between">
            <Dialog.Title asChild>
              <Link to="/" onClick={close} aria-label="Haven home">
                <Logo />
              </Link>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <form className="mt-6" onSubmit={handleSearch} role="search">
            <label htmlFor="drawer-search" className="sr-only">
              Search homes
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                id="drawer-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="City, neighborhood, or ZIP"
                className="pl-10"
              />
            </div>
          </form>

          <nav className="mt-8" aria-label="Primary">
            <ul className="space-y-1">
              {primaryLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    onClick={close}
                    className="flex items-center justify-between rounded-md px-3 py-3 text-[15px] font-medium text-heading transition-colors hover:bg-canvas"
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 border-t border-line pt-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Explore</p>
            <ul className="mt-2 space-y-1">
              {exploreLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    onClick={close}
                    className="block rounded-md px-3 py-2.5 text-[15px] text-body transition-colors hover:bg-canvas hover:text-heading"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto space-y-3 border-t border-line pt-6">
            {user ? (
              <>
                <div className="flex items-center gap-3 rounded-md bg-canvas p-3">
                  <Avatar name={user.name} src={user.avatar?.url} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-heading">{user.name}</p>
                    <p className="truncate text-xs text-muted">
                      {roleLabels[user.role]} · {user.email}
                    </p>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link to={roleHome(user.role)} onClick={close}>
                    Go to dashboard
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full">
                  <Link to="/register" onClick={close}>
                    Create account
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login" onClick={close}>
                    Sign in
                  </Link>
                </Button>
              </>
            )}

            <div className="flex flex-col gap-2 pt-2 text-sm text-body">
              <a href="tel:+18005550142" className="inline-flex items-center gap-2 hover:text-heading">
                <Phone className="h-4 w-4" aria-hidden="true" />
                (800) 555-0142
              </a>
              <a href="mailto:hello@haven.example" className="inline-flex items-center gap-2 hover:text-heading">
                <Mail className="h-4 w-4" aria-hidden="true" />
                hello@haven.example
              </a>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}