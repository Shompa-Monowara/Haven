import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "success" | "warning" | "neutral";
}

const tones = {
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning-text",
  neutral: "bg-canvas text-body",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-body">{label}</p>
          <p className="mt-2 font-display text-[28px] font-bold leading-none text-heading tabular">
            {value}
          </p>
        </div>
        <span
          className={cn("inline-flex h-10 w-10 items-center justify-center rounded-md", tones[tone])}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      {hint ? <p className="mt-3 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}