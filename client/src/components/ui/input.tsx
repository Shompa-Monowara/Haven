import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-12 w-full rounded-md border border-line bg-surface px-3.5 text-[15px] text-heading placeholder:text-muted",
      "transition-colors duration-150 hover:border-[#c3c9c9]",
      "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
      "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };