import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full resize-y rounded-md border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-heading placeholder:text-muted",
        "transition-colors duration-150 hover:border-[#c3c9c9]",
        "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
        "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
