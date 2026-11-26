import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";

import { engagementKeys } from "@/lib/queries/engagement";
import { notificationKeys } from "@/lib/queries/notifications";
import { useAuthStore } from "@/stores/auth-store";

interface RealtimeContextValue {
  socket: Socket | null;
  onlineUsers: Set<string>;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  socket: null,
  onlineUsers: new Set(),
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!accessToken) {
      setSocket(null);
      setOnlineUsers(new Set());
      return;
    }

    let cancelled = false;
    let nextSocket: Socket | null = null;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: engagementKeys.conversations, exact: true });
      void queryClient.invalidateQueries({ queryKey: engagementKeys.unread });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    void import("socket.io-client").then(({ io }) => {
      if (cancelled) return;

      nextSocket = io({
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      nextSocket.on("message:new", invalidate);
      nextSocket.on("conversation:updated", invalidate);
      nextSocket.on("conversation:read", invalidate);

      nextSocket.on("presence", (payload: { userId: string; online: boolean }) => {
        setOnlineUsers((current) => {
          const next = new Set(current);
          if (payload.online) next.add(payload.userId);
          else next.delete(payload.userId);
          return next;
        });
      });

      nextSocket.on("connect", invalidate);

      setSocket(nextSocket);
    });

    return () => {
      cancelled = true;
      nextSocket?.disconnect();
      setSocket(null);
    };
  }, [accessToken, queryClient]);

  return (
    <RealtimeContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </RealtimeContext.Provider>
  );
}