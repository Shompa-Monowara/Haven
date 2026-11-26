import * as React from "react";

import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-16 w-16 text-lg",
  xl: "h-[72px] w-[72px] text-xl",
};

/** Soft, AA-contrast tints from existing tokens for the initials fallback. */
const tints = [
  "bg-brand-soft text-brand-strong",
  "bg-success-tint text-success",
  "bg-warning-tint text-warning-text",
  "bg-danger-tint text-danger",
  "bg-canvas text-heading",
  "bg-brand-soft text-ink",
  "bg-success-tint text-ink",
  "bg-warning-tint text-ink",
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function tintFor(name: string) {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return tints[hash % tints.length]!;
}

function Avatar({ src, name, size = "md", className, ...props }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium ring-1 ring-line",
        sizeClasses[size],
        showImage ? "bg-canvas" : tintFor(name),
        className,
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover object-[center_20%]"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

export { Avatar };