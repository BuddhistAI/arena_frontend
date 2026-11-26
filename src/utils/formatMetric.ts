export type MetricFormat = { style: "percent" | "decimal"; decimals: number };

export function formatMetric(value: number | null | undefined, format: MetricFormat): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return format.style === "percent"
    ? `${(value * 100).toFixed(format.decimals)}%`
    : value.toFixed(format.decimals);
}
