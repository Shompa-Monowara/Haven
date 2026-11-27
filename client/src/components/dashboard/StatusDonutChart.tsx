import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { PropertyStatus } from "@/types/property";

interface StatusDonutChartProps {
  statusCounts: Partial<Record<PropertyStatus, number>>;
}

const statusMeta: Array<{ status: PropertyStatus; label: string; color: string }> = [
  { status: "approved", label: "Approved", color: "var(--color-success)" },
  { status: "pending", label: "Pending review", color: "var(--color-warning)" },
  { status: "draft", label: "Draft", color: "var(--color-body)" },
  { status: "changes_requested", label: "Changes requested", color: "var(--color-info)" },
  { status: "rejected", label: "Rejected", color: "var(--color-danger)" },
  { status: "archived", label: "Archived", color: "var(--color-muted)" },
];

export function StatusDonutChart({ statusCounts }: StatusDonutChartProps) {
  const data = statusMeta
    .map((entry) => ({
      name: entry.label,
      value: statusCounts[entry.status] ?? 0,
      color: entry.color,
    }))
    .filter((entry) => entry.value > 0);
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <section
      className="rounded-lg border border-line bg-surface p-6"
      aria-labelledby="status-chart-heading"
    >
      <h3 id="status-chart-heading" className="text-lg font-semibold text-heading">
        Listings by status
      </h3>
      <p className="mt-1 text-sm text-body">Current distribution across every listing.</p>

      {total === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-canvas px-6 py-10 text-center">
          <p className="font-medium text-heading">No listings yet</p>
          <p className="mt-1 text-sm text-body">
            Status counts will appear once listings are created.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative mx-auto h-52 w-52 shrink-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="60%"
                    outerRadius="88%"
                    paddingAngle={2}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "var(--color-border)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold text-heading tabular">{total}</span>
                <span className="text-xs text-muted">{total === 1 ? "listing" : "listings"}</span>
              </div>
            </div>

            <ul className="min-w-0 flex-1 space-y-2">
              {data.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-body">{entry.name}</span>
                  </span>
                  <span className="font-semibold text-heading tabular">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="sr-only">
            Listings by status: {data.map((entry) => `${entry.name} ${entry.value}`).join(", ")}.
          </p>
        </>
      )}
    </section>
  );
}