import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export async function signOut(): Promise<void> {
  try {
    await api.post<void>("/auth/logout", undefined, { skipAuth: true });
  } finally {
    useAuthStore.getState().clear();
  }
}