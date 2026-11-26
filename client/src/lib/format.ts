const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatPrice(value: number): string {
  return currency.format(value);
}

export function formatPriceCompact(value: number): string {
  return compactCurrency.format(value);
}

export function formatRent(value: number, period: "monthly" | "weekly" | "nightly" = "monthly"): string {
  const suffix = period === "monthly" ? "/mo" : period === "weekly" ? "/wk" : "/night";
  return `${formatPrice(value)}${suffix}`;
}

export function formatArea(sqft: number): string {
  return `${new Intl.NumberFormat("en-US").format(sqft)} sq ft`;
}

export function formatRelativeDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const day = 86_400_000;

  if (diffMs < 3_600_000) return "Just now";
  if (diffMs < day) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}