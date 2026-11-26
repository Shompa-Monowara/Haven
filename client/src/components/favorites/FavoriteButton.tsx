import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiClientError, api } from "@/lib/api";
import { readGuestFavoriteIds, toggleGuestFavorite } from "@/lib/guest-favorites";
import { engagementKeys, useFavorites } from "@/lib/queries/engagement";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { PropertySummary } from "@/types/property";

interface FavoriteButtonProps {
  property: PropertySummary;
  variant?: "icon" | "button";
  className?: string;
}

interface HeartControlProps {
  isFavorite: boolean;
  label: string;
  variant: "icon" | "button";
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}

function HeartControl({
  isFavorite,
  label,
  variant,
  className,
  disabled,
  onClick,
}: HeartControlProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-pressed={isFavorite}
      aria-label={label}
      title={isFavorite ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        variant === "icon"
          ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-heading shadow-sm backdrop-blur transition-colors hover:bg-surface"
          : "inline-flex h-11 items-center gap-2 rounded-md border border-line px-3.5 text-sm font-medium text-heading transition-colors hover:border-brand hover:bg-canvas",
        isFavorite && "text-danger",
        className,
      )}
    >
      <Heart className={cn("h-[18px] w-[18px]", isFavorite && "fill-current")} aria-hidden="true" />
      {variant === "button" ? (isFavorite ? "Saved" : "Save") : null}
    </button>
  );
}

function GuestFavoriteButton({ property, variant = "icon", className }: FavoriteButtonProps) {
  const location = useLocation();
  const [guestIds, setGuestIds] = useState<string[]>(() => readGuestFavoriteIds());
  const [loginOpen, setLoginOpen] = useState(false);
  const isFavorite = guestIds.includes(property.id);
  const redirect = `${location.pathname}${location.search}`;

  function onClick() {
    const wasFavorite = guestIds.includes(property.id);
    const next = toggleGuestFavorite(property.id);
    setGuestIds(next);
    if (!wasFavorite) setLoginOpen(true);
  }

  return (
    <>
      <HeartControl
        isFavorite={isFavorite}
        label={
          isFavorite
            ? `Remove ${property.title} from favorites`
            : `Save ${property.title} to favorites`
        }
        variant={variant}
        className={className}
        onClick={onClick}
      />

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-heading">
              Saved on this device
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-body">
              This home is in your shortlist. Sign in and we will add it to your Haven account so it
              follows you to every device.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>Sign in and sync</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/register">Create account</Link>
            </Button>
            <Button type="button" variant="ghost" onClick={() => setLoginOpen(false)}>
              Continue browsing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MemberFavoriteButton({ property, variant = "icon", className }: FavoriteButtonProps) {
  const queryClient = useQueryClient();
  const { data: favorites, isPending } = useFavorites();
  const isFavorite = Boolean(favorites?.some((item) => item.id === property.id));

  const mutation = useMutation({
    mutationFn: ({ next }: { next: boolean }) =>
      next
        ? api.post<{ favorited: boolean; count: number }>(`/favorites/${property.id}`)
        : api.delete<{ favorited: boolean; count: number }>(`/favorites/${property.id}`),
    onMutate: async ({ next }) => {
      await queryClient.cancelQueries({ queryKey: engagementKeys.favorites });
      const previous = queryClient.getQueryData<PropertySummary[]>(engagementKeys.favorites);

      queryClient.setQueryData<PropertySummary[]>(engagementKeys.favorites, (current) => {
        const list = current ?? [];
        if (next) {
          return list.some((item) => item.id === property.id) ? list : [property, ...list];
        }
        return list.filter((item) => item.id !== property.id);
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(engagementKeys.favorites, context.previous);
      }
      toast.error(
        error instanceof ApiClientError ? error.message : "Your favorites could not be updated",
      );
    },
    onSuccess: (_data, variables) => {
      if (variables.next) {
        toast.success("Added to favorites");
        return;
      }

      const toastId = toast.info(
        <span className="flex items-center justify-between gap-4">
          <span>Removed from favorites</span>
          <button
            type="button"
            onClick={() => {
              mutation.mutate({ next: true });
              toast.dismiss(toastId);
            }}
            className="text-sm font-semibold text-brand-strong hover:underline"
          >
            Undo
          </button>
        </span>,
        { autoClose: 6000 },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: engagementKeys.favorites });
    },
  });

  return (
    <HeartControl
      isFavorite={isFavorite}
      label={
        isFavorite
          ? `Remove ${property.title} from favorites`
          : `Save ${property.title} to favorites`
      }
      variant={variant}
      className={className}
      disabled={isPending}
      onClick={() => mutation.mutate({ next: !isFavorite })}
    />
  );
}

export function FavoriteButton(props: FavoriteButtonProps) {
  const user = useAuthStore((state) => state.user);

  return user ? <MemberFavoriteButton {...props} /> : <GuestFavoriteButton {...props} />;
}