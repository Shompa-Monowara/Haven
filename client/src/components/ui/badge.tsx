import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.02em]",
  {
    variants: {
      variant: {
        neutral: "bg-canvas text-body",
        sale: "bg-success-tint text-success",
        rent: "bg-brand-soft text-brand-strong",
        featured: "bg-warning text-ink",
        pending: "bg-warning-tint text-warning-text",
        approved: "bg-success-tint text-success",
        rejected: "bg-danger-tint text-danger",
        changes: "bg-warning-tint text-ink",
        info: "bg-brand-soft text-info",
        outline: "border border-line bg-surface text-body",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };