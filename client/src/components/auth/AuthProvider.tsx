import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { api, ensureSession } from "@/lib/api";
import { clearGuestFavoriteIds, readGuestFavoriteIds } from "@/lib/guest-favorites";
import { engagementKeys } from "@/lib/queries/engagement";
import { useAuthStore } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const restored = await ensureSession();

      if (active && !restored) {
        useAuthStore.getState().clear();
      }
    };

    void init();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    const guestIds = readGuestFavoriteIds();
    if (!guestIds.length) return;

    let active = true;

    void Promise.all(
      guestIds.map((propertyId) => api.post(`/favorites/${propertyId}`).catch(() => null)),
    ).then(() => {
      if (!active) return;
      clearGuestFavoriteIds();
      void queryClient.invalidateQueries({ queryKey: engagementKeys.favorites });
    });

    return () => {
      active = false;
    };
  }, [status, userId, queryClient]);

  return <>{children}</>;
}