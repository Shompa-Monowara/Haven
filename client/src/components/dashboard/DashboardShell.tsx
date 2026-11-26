import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  PlusCircle,
  Search,
  Settings,
  ScrollText,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { Avatar } from "@/components/ui/avatar";
import { Seo } from "@/components/seo/Seo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/auth-actions";
import { useUnreadMessageCount } from "@/lib/queries/engagement";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { roleLabels, type Role } from "@/types/auth";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  buyer: [
    { label: "Overview", href: "/account", icon: LayoutDashboard },
    { label: "Favorites", href: "/account/favorites", icon: Heart },
    { label: "Saved searches", href: "/account/saved-searches", icon: Search },
    { label: "Inquiries", href: "/account/inquiries", icon: MessagesSquare },
    { label: "Messages", href: "/account/messages", icon: MessageCircle },
    { label: "Profile", href: "/account/profile", icon: UserCircle },
  ],
  agent: [
    { label: "Overview", href: "/agent", icon: LayoutDashboard },
    { label: "My listings", href: "/agent/listings", icon: Building2 },
    { label: "Add listing", href: "/agent/listings/new", icon: PlusCircle },
    { label: "Leads", href: "/agent/leads", icon: Users },
    { label: "Messages", href: "/agent/messages", icon: MessageCircle },
    { label: "Analytics", href: "/agent/analytics", icon: BarChart3 },
    { label: "Profile", href: "/agent/profile", icon: UserCircle },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
    { label: "Listings", href: "/admin/listings", icon: Building2 },
    { label: "Agents", href: "/admin/agents", icon: BadgeCheck },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Inquiries", href: "/admin/inquiries", icon: MessagesSquare },
    { label: "Audit log", href: "/admin/audit", icon: ScrollText },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
};

function NavList({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const { data: unread } = useUnreadMessageCount();
  const unreadCount = unread?.count ?? 0;

  return (
    <ul className="space-y-1">
      {NAV[role].map((item) => (
        <li key={item.href}>
          <NavLink
            to={item.href}
            end={item.href === `/${role === "buyer" ? "account" : role}`}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-soft text-ink"
                  : "text-body hover:bg-canvas hover:text-heading",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {item.label}
            {item.href.endsWith("/messages") && unreadCount > 0 ? (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand-strong px-1.5 text-[10px] font-bold text-white tabular">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function UserCard({ compact = false }: { compact?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate("/", { replace: true });
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar name={user.name} src={user.avatar?.url} size={compact ? "md" : "md"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-heading">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-heading"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function DashboardShell({ role }: { role: Role }) {
  const user = useAuthStore((state) => state.user);
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV[role];
  const exact = items.find((item) => item.href === pathname);
  const prefix = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname.startsWith(`${item.href}/`));
  const title = exact?.label ?? prefix?.label ?? roleLabels[role];

  return (
    <div className="flex min-h-screen bg-canvas">
      <Seo
        title={`${title} — ${roleLabels[role]} | Haven`}
        description={`Haven ${roleLabels[role].toLowerCase()} dashboard.`}
        path={pathname}
        noIndex
      />
      <a href="#dashboard-main" className="skip-link">
        Skip to content
      </a>
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-20 items-center border-b border-line px-5">
          <Link to="/" aria-label="Haven home">
            <Logo />
          </Link>
        </div>

        <div className="px-5 py-4">
          <span className="inline-flex items-center rounded-pill bg-canvas px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-body">
            {roleLabels[role]} workspace
          </span>
        </div>

        <nav className="flex-1 px-3" aria-label={`${roleLabels[role]} dashboard`}>
          <NavList role={role} />
        </nav>

        <div className="space-y-3 border-t border-line p-4">
          <UserCard />
          <Link
            to="/"
            className="block rounded-md px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-canvas hover:text-heading"
          >
            Back to Haven
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open dashboard menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {roleLabels[role]} dashboard
            </p>
            <h1 className="truncate text-lg font-semibold leading-tight text-heading">{title}</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/properties">Browse homes</Link>
            </Button>
            <NotificationBell />
            {user ? <Avatar name={user.name} src={user.avatar?.url} size="md" /> : null}
          </div>
        </header>

        <main id="dashboard-main" tabIndex={-1} className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1320px]">
            <Outlet />
          </div>
        </main>
      </div>

      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-ink/50 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[84%] max-w-xs animate-slide-in-right flex-col bg-surface p-5 shadow-md focus:outline-none lg:hidden">
            <div className="flex items-center justify-between">
              <Dialog.Title asChild>
                <Link to="/" onClick={() => setMenuOpen(false)} aria-label="Haven home">
                  <Logo />
                </Link>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close dashboard menu">
                  <X className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>

            <nav className="mt-6 flex-1" aria-label={`${roleLabels[role]} dashboard`}>
              <NavList role={role} onNavigate={() => setMenuOpen(false)} />
            </nav>

            <div className="border-t border-line pt-4">
              <UserCard />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}