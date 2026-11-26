import type { ReactNode } from "react";
import { Award, Crown, Medal } from "lucide-react";
import SubmissionTypeBadge from "./SubmissionTypeBadge";
import { formatMetric } from "../utils/formatMetric";
import type { LeaderboardRow, LeaderboardScorer } from "../types/challenge";

// "comfortable" for the Challenge's own Leaderboard page; "compact" for the
// overview cards and the embed.
type Density = "comfortable" | "compact";

const CELL: Record<Density, string> = {
  comfortable: "px-6 py-4 whitespace-nowrap",
  compact: "px-3 py-2 whitespace-nowrap",
};

const TEXT: Record<Density, string> = {
  comfortable: "text-sm",
  compact: "text-xs",
};

const RANK_ICONS = [
  <Crown key={1} className="w-5 h-5 text-yellow-500" />,
  <Medal key={2} className="w-5 h-5 text-neutral-400" />,
  <Award key={3} className="w-5 h-5 text-amber-600" />,
];

// A crown, a medal or an award for the top three Ranks.
const RankIcon = ({ rank }: { rank: number }) =>
  RANK_ICONS[rank - 1] ?? <span className="w-5 h-5" />;

interface LeaderboardRowCellsProps {
  row: LeaderboardRow;
  scorer: LeaderboardScorer;
  density: Density;
  // The name cell's content; the row's name by default.
  name?: ReactNode;
}

// The cells every Leaderboard table starts a row with: Rank, Submission
// Type, name, @submitter and the Headline Metric in the Scorer's format.
const LeaderboardRowCells = ({ row, scorer, density, name }: LeaderboardRowCellsProps) => {
  const cell = CELL[density];
  const text = TEXT[density];
  return (
    <>
      <td className={cell}>
        <div className="flex items-center">
          <RankIcon rank={row.rank} />
          <span className={`ml-2 ${text} font-medium text-neutral-700 dark:text-neutral-100`}>
            #{row.rank}
          </span>
        </div>
      </td>
      <td className={cell}>
        <SubmissionTypeBadge type={row.type} />
      </td>
      <td className={cell}>
        {name ?? (
          <div
            className={`${text} font-medium text-neutral-700 dark:text-neutral-100 max-w-xs truncate`}
            title={row.name}
          >
            {row.name}
          </div>
        )}
      </td>
      <td className={cell}>
        <div className={`${text} text-neutral-600 dark:text-neutral-300 truncate max-w-32`}>
          @{row.submitter}
        </div>
      </td>
      <td className={cell}>
        <div className={`${text} font-semibold text-neutral-700 dark:text-neutral-100`}>
          {formatMetric(row.headline_metric, scorer.display_format)}
        </div>
      </td>
    </>
  );
};

export default LeaderboardRowCells;
