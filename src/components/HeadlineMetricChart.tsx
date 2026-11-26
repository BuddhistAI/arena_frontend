import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LeaderboardRow, LeaderboardScorer } from "../types/challenge";
import { formatMetric } from "../utils/formatMetric";

interface HeadlineMetricChartProps {
  rows: LeaderboardRow[];
  scorer: LeaderboardScorer;
  className?: string;
}

const NAME_LENGTH = 15;

const shortName = (name: string) =>
  name.length > NAME_LENGTH ? `${name.substring(0, NAME_LENGTH)}...` : name;

interface TooltipProps {
  active?: boolean;
  payload?: { payload: LeaderboardRow }[];
  scorer: LeaderboardScorer;
}

const RowTooltip = ({ active, payload, scorer }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3">
      <p className="font-medium text-neutral-700 dark:text-neutral-100 text-sm mb-1">
        #{row.rank} {row.name}
      </p>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        {scorer.label}: {formatMetric(row.headline_metric, scorer.format)}
      </p>
    </div>
  );
};

// The page's rows in Rank order, one bar each, plotting the Headline Metric
// only, so the chart always agrees with the ranking.
const HeadlineMetricChart = ({ rows, scorer, className = "" }: HeadlineMetricChartProps) => (
  <div className={className}>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="name"
          tickFormatter={shortName}
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={10}
          interval={0}
        />
        <YAxis
          fontSize={10}
          tickFormatter={(value: number) => formatMetric(value, scorer.format)}
        />
        <Tooltip content={<RowTooltip scorer={scorer} />} />
        <Bar dataKey="headline_metric" name={scorer.label} fill="#525252" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default HeadlineMetricChart;
