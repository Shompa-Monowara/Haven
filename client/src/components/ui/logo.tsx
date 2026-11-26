import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "default" | "reverse";
  className?: string;
  compact?: boolean;
}

export function Logo({ variant = "default", className, compact = false }: LogoProps) {
  const textColor = variant === "reverse" ? "text-white" : "text-heading";
  const glyphColor = variant === "reverse" ? "text-white" : "text-brand-strong";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        role="img"
        aria-label="Haven"
        className={cn("h-8 w-8", glyphColor)}
        fill="none"
      >
        <path
          d="M5 14.5 16 5l11 9.5V27a1 1 0 0 1-1 1h-6.5v-7.5h-7V28H6a1 1 0 0 1-1-1V14.5Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
      {compact ? null : (
        <span className={cn("font-display text-[22px] font-bold leading-none tracking-tight", textColor)}>
          Haven
        </span>
      )}
    </span>
  );
}