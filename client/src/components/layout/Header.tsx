import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Heart, LogOut, Menu, MessageCircle, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { messagesPathForRole } from "@/components/messages/MessageAgentButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/auth-actions";
import { useGuestFavoriteCount } from "@/lib/guest-favorites";
import { useFavorites, useUnreadMessageCount } from "@/lib/queries/engagement";
import { useAuthStore } from "@/stores/auth-store";
import { roleHome } from "@/types/auth";

const exploreGroups = [
  {
    label: "Cities",
    items: [
      { label: "New York", href: "/properties?city=New%20York" },
      { label: "Brooklyn", href: "/properties?city=Brooklyn" },
      { label: "Los Angeles", href: "/properties?city=Los%20Angeles" },
      { label: "Miami", href: "/properties?city=Miami" },
    ],
  },
  {
    label: "Property types",
    items: [
      { label: "Apartments", href: "/properties?propertyType=apartment" },
      { label: "Houses", href: "/properties?propertyType=house" },
      { label: "Villas", href: "/properties?propertyType=villa" },
      { label: "Offices", href: "/properties?propertyType=office" },
    ],
  },
  {
    label: "Haven",
    items: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

const menuItemClass =
  "block cursor-pointer rounded-[4px] px-2.5 py-2 text-sm text-body outline-none transition-colors hover:bg-canvas hover:text-heading data-[highlighted]:bg-canvas data-[highlighted]:text-heading";

export function Header() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const listPropertyHref =
    user?.role === "agent" ? "/agent/listings/new" : user?.role === "admin" ? "/admin/listings" : "/list-property";
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: favorites } = useFavorites();
  const guestFavoriteCount = useGuestFavoriteCount();
  const { data: unread } = useUnreadMessageCount();

  const isHome = pathname === "/";
  const transparent = isHome && !scrolled;
  const favoritesCount = user ? (favorites?.length ?? 0) : guestFavoriteCount;
  const unreadCount = unread?.count ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, search]);

  const params = new URLSearchParams(search);
  const listingType = params.get("listingType");

  const isActive = (href: string) => {
    if (href === "/properties?listingType=sale") {
      return pathname.startsWith("/properties") && listingType === "sale";
    }
    if (href === "/properties?listingType=rent") {
      return pathname.startsWith("/properties") && listingType === "rent";
    }
    if (href === "/agents") {
      return pathname.startsWith("/agents");
    }
    return false;
  };

  const navLinkClass = (active: boolean) =>
    [
      "relative inline-flex h-full items-center border-b-2 pt-0.5 text-[15px] font-medium transition-colors",
      active ? "border-brand" : "border-transparent",
      transparent ? "text-white/85 hover:text-white" : "text-heading hover:text-brand-strong",
    ].join(" ");

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  }

  const favoritesHref = user?.role === "buyer" ? "/account/favorites" : "/favorites";
  const profileHref = user?.role === "agent" ? "/agent/profile" : "/account/profile";

  return (
    <>
      <header
        className={[
          "sticky top-0 z-40 flex h-20 w-full border-b transition-[background-color,border-color,box-shadow] duration-200",
          transparent
            ? "border-transparent bg-origin-border bg-gradient-to-b from-ink/60 to-transparent text-white"
            : "border-line bg-surface/95 text-heading shadow-xs backdrop-blur supports-[backdrop-filter]:bg-surface/90",
        ].join(" ")}
      >
        <div className="shell-container flex items-center justify-between gap-2 sm:gap-6">
          <Link to="/" aria-label="Haven home" className="shrink-0">
            <Logo variant={transparent ? "reverse" : "default"} />
          </Link>

          <nav className="hidden h-full items-center gap-7 lg:flex" aria-label="Primary">
            <Link to="/properties?listingType=sale" className={navLinkClass(isActive("/properties?listingType=sale"))}>
              Buy
            </Link>
            <Link to="/properties?listingType=rent" className={navLinkClass(isActive("/properties?listingType=rent"))}>
              Rent
            </Link>
            <Link to="/agents" className={navLinkClass(isActive("/agents"))}>
              Agents
            </Link>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                className={[
                  "inline-flex h-full items-center gap-1.5 border-b-2 text-[15px] font-medium outline-none transition-colors",
                  "border-transparent",
                  transparent ? "text-white/85 hover:text-white" : "text-heading hover:text-brand-strong",
                ].join(" ")}
              >
                Explore
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={8}
                  className="z-50 w-60 animate-fade-in rounded-lg border border-line bg-surface p-2 shadow-md"
                >
                  {exploreGroups.map((group, index) => (
                    <div key={group.label}>
                      {index > 0 ? <DropdownMenu.Separator className="my-1.5 h-px bg-line" /> : null}
                      <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        {group.label}
                      </DropdownMenu.Label>
                      {group.items.map((item) => (
                        <DropdownMenu.Item key={item.label} asChild>
                          <Link to={item.href} className={menuItemClass}>
                            {item.label}
                          </Link>
                        </DropdownMenu.Item>
                      ))}
                    </div>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-2">
            <a
              href="tel:+18005550142"
              className={[
                "mr-2 hidden items-center gap-2 text-sm font-medium xl:inline-flex",
                transparent ? "text-white/85 hover:text-white" : "text-body hover:text-heading",
              ].join(" ")}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              (800) 555-0142
            </a>

            <Link
              to={favoritesHref}
              className={[
                "relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                transparent ? "text-white hover:bg-white/10" : "text-heading hover:bg-canvas",
              ].join(" ")}
              aria-label={favoritesCount > 0 ? `Favorites, ${favoritesCount} saved` : "Favorites"}
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {favoritesCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-brand px-1 text-[10px] font-bold text-ink tabular">
                  {favoritesCount}
                </span>
              ) : null}
            </Link>

            {user ? <NotificationBell onDark={transparent} /> : null}

            {user ? (
              <Link
                to={messagesPathForRole(user.role)}
                className={[
                  "relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                  transparent ? "text-white hover:bg-white/10" : "text-heading hover:bg-canvas",
                ].join(" ")}
                aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"}
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 text-[10px] font-bold text-white tabular">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link to={listPropertyHref}>List a property</Link>
            </Button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                className={[
                  "inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full outline-none transition-colors",
                  transparent ? "text-white hover:bg-white/10" : "text-heading hover:bg-canvas",
                ].join(" ")}
                aria-label={user ? "Account menu" : "Sign in menu"}
              >
                {user ? (
                  <Avatar name={user.name} src={user.avatar?.url} size="md" className="ring-0" />
                ) : (
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                )}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-60 animate-fade-in rounded-lg border border-line bg-surface p-2 shadow-md"
                >
                  {user ? (
                    <>
                      <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
                        <p className="truncate text-sm font-medium text-heading">{user.name}</p>
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <DropdownMenu.Item asChild>
                          <Link to={roleHome(user.role)} className={menuItemClass}>
                            Dashboard
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link to={favoritesHref} className={menuItemClass}>
                            Favorites
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link to={messagesPathForRole(user.role)} className={menuItemClass}>
                            Messages
                          </Link>
                        </DropdownMenu.Item>
                        {user.role !== "admin" ? (
                          <DropdownMenu.Item asChild>
                            <Link to={profileHref} className={menuItemClass}>
                              Profile
                            </Link>
                          </DropdownMenu.Item>
                        ) : null}
                        <DropdownMenu.Separator className="my-1.5 h-px bg-line" />
                        <DropdownMenu.Item
                          onSelect={() => {
                            void handleSignOut();
                          }}
                          className={menuItemClass}
                        >
                          <span className="inline-flex items-center gap-2">
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            Sign out
                          </span>
                        </DropdownMenu.Item>
                      </div>
                    </>
                  ) : (
                    <>
                      <DropdownMenu.Item asChild>
                        <Link to="/login" className={menuItemClass}>
                          Sign in
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link to="/register" className={menuItemClass}>
                          Create account
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="my-1.5 h-px bg-line" />
                      <DropdownMenu.Item asChild>
                        <Link to={listPropertyHref} className={menuItemClass}>
                          List a property
                        </Link>
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <Button
              variant="ghost"
              size="icon"
              className={[
                "lg:hidden",
                transparent ? "text-white hover:bg-white/10 hover:text-white" : "text-heading",
              ].join(" ")}
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}