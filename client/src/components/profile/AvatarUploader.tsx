import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "react-toastify";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ApiClientError, api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/auth";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUploader() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragging, setDragging] = useState(false);

  function refreshQueries() {
    void queryClient.invalidateQueries({ queryKey: ["agents"] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }

  function validate(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image");
      return false;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That photo is larger than 5 MB");
      return false;
    }
    return true;
  }

  async function upload(file: File) {
    if (!validate(file)) return;

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    try {
      const data = await api.upload<{ user: AuthUser }>("/uploads/avatar", formData);
      updateUser(data.user);
      refreshQueries();
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "The photo could not be uploaded",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      const data = await api.delete<{ user: AuthUser }>("/uploads/avatar");
      updateUser(data.user);
      refreshQueries();
      toast.success("Profile photo removed");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "The photo could not be removed",
      );
    } finally {
      setRemoving(false);
    }
  }

  if (!user) return null;

  const hasPhoto = Boolean(user.avatar?.url);

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void upload(file);
        }}
        className={cn(
          "flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-dashed transition-colors",
          dragging ? "border-brand bg-brand-soft" : "border-transparent",
        )}
      >
        <Avatar name={user.name} src={user.avatar?.url} className="h-24 w-24 text-2xl" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || removing}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : hasPhoto ? (
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {uploading ? "Uploading…" : hasPhoto ? "Change photo" : "Upload photo"}
          </Button>

          {hasPhoto ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger-tint hover:text-danger"
              onClick={() => void remove()}
              disabled={uploading || removing}
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Remove
            </Button>
          ) : null}
        </div>

        <p className="mt-2 text-xs leading-relaxed text-body">
          JPG, PNG or WebP, up to 5 MB. A square photo works best.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
}