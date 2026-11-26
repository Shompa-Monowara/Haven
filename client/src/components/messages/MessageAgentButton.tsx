import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { ApiClientError, api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { ConversationDto } from "@/types/engagement";
import type { PropertyDetail } from "@/types/property";

export function messagesPathForRole(role: "buyer" | "agent" | "admin" | undefined, id?: string) {
  const base =
    role === "agent" ? "/agent/messages" : role === "buyer" ? "/account/messages" : "/messages";
  return id ? `${base}/${id}` : base;
}

interface MessageAgentButtonProps {
  property: PropertyDetail;
  className?: string;
  label?: string;
  variant?: "primary" | "outline";
}

export function MessageAgentButton({
  property,
  className,
  label = "Message agent",
  variant = "outline",
}: MessageAgentButtonProps) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  const start = useMutation({
    mutationFn: () =>
      api.post<ConversationDto>("/conversations", { propertyId: property.id }),
    onSuccess: (conversation) => {
      navigate(messagesPathForRole(user?.role, conversation.id));
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError ? error.message : "The conversation could not be started",
      );
    },
  });

  if (property.status !== "approved") return null;
  if (user?.id === property.agent?.id) return null;

  if (!user) {
    return (
      <Button asChild variant={variant} className={className}>
        <Link
          to={`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => start.mutate()}
      disabled={start.isPending}
    >
      {start.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}