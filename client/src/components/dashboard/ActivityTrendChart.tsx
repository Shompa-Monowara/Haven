import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminActivityPoint } from "@/types/admin";

interface ActivityTrendChartProps {
  activity: AdminActivityPoint[];
}

function formatDay(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ActivityTrendChart({ activity }: ActivityTrendChartProps) {
  const totalListings = activity.reduce((sum, point) => sum + point.listings, 0);
  const totalUsers = activity.reduce((sum, point) => sum + point.users, 0);
  const hasActivity = totalListings > 0 || totalUsers > 0;

  return (
    <section
      className="rounded-lg border border-line bg-surface p-6"
      aria-labelledby="activity-chart-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="activity-chart-heading" className="text-lg font-semibold text-heading">
            Activity, last 30 days
          </h3>
          <p className="mt-1 text-sm text-body">New listings and new users per day.</p>
        </div>
        <ul className="flex items-center gap-4 text-xs text-body">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-strong" aria-hidden="true" />
            Listings
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" />
            Users
          </li>
        </ul>
      </div>

      {!hasActivity ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-canvas px-6 py-10 text-center">
          <p className="font-medium text-heading">No new activity</p>
          <p className="mt-1 text-sm text-body">
            New listings and users will appear here as they arrive.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 h-64 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDay}
                  minTickGap={24}
                  tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  width={28}
                  tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => formatDay(String(value))}
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: "var(--color-border)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="listings"
                  name="New listings"
                  stroke="var(--color-brand-strong)"
                  fill="var(--color-brand-strong)"
                  fillOpacity={0.16}
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="New users"
                  stroke="var(--color-success)"
                  fill="var(--color-success)"
                  fillOpacity={0.16}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">
            New listings in the last 30 days: {totalListings}. New users: {totalUsers}.
          </p>
        </>
      )}
    </section>
  );
}