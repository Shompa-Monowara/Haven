import { ChevronLeft, ChevronRight, Home, Images, X } from "lucide-react";
import { useRef, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PropertyImage } from "@/types/property";

interface PropertyGalleryProps {
  images: PropertyImage[];
  title: string;
}

function GalleryImage({
  image,
  title,
  className,
  eager = false,
}: {
  image: PropertyImage | undefined;
  title: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!image || !image.url || failed) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 bg-canvas text-muted", className)}>
        <Home className="h-8 w-8" aria-hidden="true" />
        <span className="text-xs">Photo unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={image.url}
      alt={image.alt || `Photo of ${title}`}
      loading={eager ? "eager" : "lazy"}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(1);
  const trackRef = useRef<HTMLDivElement>(null);
  const ordered = images.length
    ? images
    : [{ url: "", alt: "", isCover: true, order: 0 }];

  function openAt(position: number) {
    setIndex(position);
    setOpen(true);
  }

  function step(delta: number) {
    setIndex((current) => (current + delta + ordered.length) % ordered.length);
  }

  function handleMobileScroll() {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.round(track.scrollLeft / track.clientWidth) + 1;
    setMobileIndex(Math.min(ordered.length, Math.max(1, next)));
  }

  return (
    <section aria-label="Property photos">
      <div className="hidden gap-2 md:grid md:h-[460px] md:grid-cols-4 md:grid-rows-2">
        <button
          type="button"
          onClick={() => openAt(0)}
          className="group relative col-span-2 row-span-2 overflow-hidden rounded-lg bg-canvas text-left"
          aria-label={`View all ${ordered.length} photos`}
        >
          <GalleryImage image={ordered[0]} title={title} eager className="transition-transform duration-300 group-hover:scale-[1.02]" />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-pill bg-ink/80 px-3 py-2 text-xs font-medium text-white">
            <Images className="h-4 w-4" aria-hidden="true" />
            View all {ordered.length} photos
          </span>
        </button>

        {ordered.slice(1, 5).map((image, position) => (
          <button
            key={`${image.url}-${position}`}
            type="button"
            onClick={() => openAt(position + 1)}
            className="group relative overflow-hidden rounded-lg bg-canvas text-left"
            aria-label={`Open photo ${position + 2}`}
          >
            <GalleryImage image={image} title={title} className="transition-transform duration-300 group-hover:scale-[1.04]" />
            {position === 3 && ordered.length > 5 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-ink/60 text-sm font-semibold text-white">
                +{ordered.length - 5} more
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="md:hidden">
        <div
          ref={trackRef}
          onScroll={handleMobileScroll}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-lg"
        >
          {ordered.map((image, position) => (
            <button
              key={`${image.url}-mobile-${position}`}
              type="button"
              onClick={() => openAt(position)}
              className="relative aspect-[4/3] w-full min-w-full shrink-0 snap-center overflow-hidden bg-canvas"
              aria-label={`Open photo ${position + 1}`}
            >
              <GalleryImage image={image} title={title} eager={position === 0} />
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-body">
          <span className="tabular">
            Photo {mobileIndex} of {ordered.length}
          </span>
          <button
            type="button"
            onClick={() => openAt(mobileIndex - 1)}
            className="font-medium text-brand-strong hover:underline"
          >
            View full size
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          className="fixed inset-0 left-0 top-0 h-full w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-ink p-0 text-white"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") step(-1);
            if (event.key === "ArrowRight") step(1);
          }}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{`Photos of ${title}`}</DialogTitle>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p className="text-sm text-white/70 tabular">
                {index + 1} / {ordered.length}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close gallery"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center px-2 pb-2 sm:px-10">
              <button
                type="button"
                onClick={() => step(-1)}
                className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-white/15 sm:left-4"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <GalleryImage
                image={ordered[index]}
                title={title}
                eager
                className="max-h-full max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => step(1)}
                className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-white/15 sm:right-4"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto px-4 pb-4 sm:justify-center sm:px-6">
              {ordered.map((image, position) => (
                <button
                  key={`thumb-${image.url}-${position}`}
                  type="button"
                  onClick={() => setIndex(position)}
                  className={cn(
                    "h-16 w-24 shrink-0 overflow-hidden rounded-sm border-2 transition-opacity",
                    position === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100",
                  )}
                  aria-label={`Show photo ${position + 1}`}
                  aria-current={position === index}
                >
                  <GalleryImage image={image} title={title} />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}