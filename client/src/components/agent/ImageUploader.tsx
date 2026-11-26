import { ArrowDown, ArrowUp, ImagePlus, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { ApiClientError, api } from "@/lib/api";
import type { PropertyImage } from "@/types/property";

interface ImageUploaderProps {
  images: PropertyImage[];
  onChange: (images: PropertyImage[]) => void;
  titleHint: string;
  disabled?: boolean;
  propertyId?: string;
}

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;

function reindex(images: PropertyImage[]): PropertyImage[] {
  const coverIndex = Math.max(0, images.findIndex((image) => image.isCover));
  return images.map((image, index) => ({
    ...image,
    isCover: index === coverIndex,
    order: index,
  }));
}

export function ImageUploader({
  images,
  onChange,
  titleHint,
  disabled = false,
  propertyId,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    const selected = Array.from(files);
    const remaining = MAX_FILES - images.length;

    if (remaining <= 0) {
      toast.error("A listing can have at most 20 photos");
      return;
    }

    const accepted = selected.slice(0, remaining).filter((file) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`${file.name} is not a JPG, PNG, or WebP image`);
        return false;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 10MB`);
        return false;
      }
      return true;
    });

    if (!accepted.length) return;

    const formData = new FormData();
    if (propertyId) formData.append("propertyId", propertyId);
    accepted.forEach((file) => formData.append("images", file));

    setUploading(true);

    try {
      const result = await api.upload<{ images: Array<{ url: string; publicId: string }> }>(
        "/uploads/sign",
        formData,
      );

      const next = [
        ...images,
        ...result.images.map((image, index) => ({
          url: image.url,
          publicId: image.publicId,
          alt: images.length === 0 && index === 0 ? titleHint : "",
          isCover: images.length === 0 && index === 0,
          order: images.length + index,
        })),
      ].slice(0, MAX_FILES);

      onChange(reindex(next));
      toast.success(result.images.length === 1 ? "Photo uploaded" : `${result.images.length} photos uploaded`);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "The photos could not be uploaded",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    onChange(reindex(next));
  }

  function remove(index: number) {
    onChange(reindex(images.filter((_, position) => position !== index)));
  }

  function makeCover(index: number) {
    onChange(
      reindex(
        images.map((image, position) => ({
          ...image,
          isCover: position === index,
        })),
      ),
    );
  }

  function updateAlt(index: number, alt: string) {
    onChange(
      images.map((image, position) =>
        position === index ? { ...image, alt } : image,
      ) as PropertyImage[],
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled && event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-brand bg-brand-soft/40" : "border-line bg-canvas"
        }`}
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-strong shadow-xs">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <p className="mt-3 text-sm font-medium text-heading">
          {uploading ? "Uploading photos…" : "Drag photos here or choose files"}
        </p>
        <p className="mt-1 text-xs text-body">
          JPG, PNG, or WebP · up to 10MB each · {images.length}/{MAX_FILES} added
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Choose photos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) void uploadFiles(event.target.files);
          }}
        />
      </div>

      {images.length < 3 ? (
        <p className="rounded-md bg-warning-tint px-3 py-2 text-xs text-warning-text">
          Add at least {3 - images.length} more {3 - images.length === 1 ? "photo" : "photos"} before
          submitting for review. Drafts can be saved with fewer.
        </p>
      ) : null}

      {images.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <li key={`${image.url}-${index}`} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="relative aspect-[16/10] bg-canvas">
                <img src={image.url} alt={image.alt || `Listing photo ${index + 1}`} className="h-full w-full object-cover" />
                {image.isCover ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-pill bg-ink/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-white">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    Cover
                  </span>
                ) : null}
              </div>
              <div className="space-y-2 p-3">
                <label className="block text-[11px] font-medium text-body">
                  Alt text
                  <input
                    type="text"
                    value={image.alt}
                    placeholder={index === 0 ? titleHint : "Describe this photo"}
                    onChange={(event) => updateAlt(index, event.target.value)}
                    className="mt-1 h-9 w-full rounded-sm border border-line bg-surface px-2 text-xs text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move photo up">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={index === images.length - 1} onClick={() => move(index, 1)} aria-label="Move photo down">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={image.isCover} onClick={() => makeCover(index)}>
                    <Star className="h-4 w-4" aria-hidden="true" />
                    Cover
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-danger hover:bg-danger-tint hover:text-danger"
                    onClick={() => remove(index)}
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}