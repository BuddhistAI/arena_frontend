import { useParams } from "react-router-dom";
import { useState } from "react";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  BarChart3,
  Table,
} from "lucide-react";
import { useChallenge, useLeaderboard } from "../hooks/useChallenges";
import HeadlineMetricChart from "../components/HeadlineMetricChart";
import SubmissionTypeBadge from "../components/SubmissionTypeBadge";
import { formatMetric } from "../utils/formatMetric";
import { submissionDetailPath } from "../utils/submissionPath";

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-neutral-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />;
    default:
      return (
        <span className="w-5 h-5 flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-semibold text-sm">
          {rank}
        </span>
      );
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "completed":
      return "bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400";
    default:
      return "bg-neutral-100 text-neutral-600 dark:bg-neutral-900/20 dark:text-neutral-400";
  }
};

// The read-only Leaderboard a Challenge Creator embeds on another site. It
// reads the same server ranking as the Leaderboard page, so the two never
// disagree; each row opens its Submission's detail page on the main site.
const LeaderboardEmbed = () => {
  const { challengeId = "" } = useParams<{ challengeId: string }>();
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  const {
    data: challengeResponse,
    isLoading: challengeLoading,
    error: challengeError,
  } = useChallenge(challengeId);
  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    error: leaderboardError,
  } = useLeaderboard(challengeId);

  const challenge = challengeResponse?.data;
  const scorer = leaderboard?.scorer;
  const rows = leaderboard?.rows || [];

  if (challengeLoading || leaderboardLoading) {
    return (
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400 text-sm">
            Loading leaderboard...
          </p>
        </div>
      </div>
    );
  }

  if (challengeError || leaderboardError || !challenge || !leaderboard || !scorer) {
    return (
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
        <div className="text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
              Error Loading Leaderboard
            </h2>
            <p className="text-red-600 dark:text-red-400 text-sm">
              {!challenge
                ? "Challenge not found."
                : "Failed to load leaderboard data."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const title = challenge.title || challenge.name;

  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {/* Compact Challenge Header */}
          <div className="bg-neutral-50 dark:bg-neutral-700 px-4 py-2 border-b border-neutral-200 dark:border-neutral-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2
                  className="text-sm font-semibold text-neutral-700 dark:text-neutral-100 truncate cursor-help"
                  title={challenge.description || title}
                >
                  {title}
                </h2>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(
                    challenge.status || "unknown"
                  )}`}
                >
                  {challenge.status || "unknown"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {leaderboard.counts.all}
                </span>

                {rows.length > 0 && (
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-600 rounded-md p-0.5">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1 rounded text-xs transition-colors duration-200 ${
                        viewMode === "table"
                          ? "bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-100 shadow-sm"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100"
                      }`}
                      title="Table view"
                    >
                      <Table className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setViewMode("chart")}
                      className={`p-1 rounded text-xs transition-colors duration-200 ${
                        viewMode === "chart"
                          ? "bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-100 shadow-sm"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100"
                      }`}
                      title="Chart view"
                    >
                      <BarChart3 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {rows.length === 0 && (
            <div className="text-center py-8">
              <Trophy className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1">
                No submissions yet
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                Be the first to submit!
              </p>
            </div>
          )}

          {rows.length > 0 && viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-neutral-50 dark:bg-neutral-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Submitter
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      {scorer.label}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((row) => (
                    <tr
                      key={row.submission_id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-150"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankIcon(row.rank)}
                          <span className="ml-1 text-xs font-medium text-neutral-700 dark:text-neutral-100">
                            {row.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <SubmissionTypeBadge type={row.type} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {/* The embed lives in an iframe on another site, so
                            the detail page opens in a new tab on ours. */}
                        <a
                          href={submissionDetailPath(challengeId, row.submission_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs font-medium text-neutral-700 dark:text-neutral-100 hover:underline truncate max-w-40"
                          title={row.name}
                        >
                          {row.name}
                        </a>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs text-neutral-600 dark:text-neutral-300 truncate max-w-32">
                          @{row.submitter}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-100">
                          {formatMetric(row.headline_metric, scorer.display_format)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && viewMode === "chart" && (
            <HeadlineMetricChart rows={rows} scorer={scorer} className="p-4" />
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardEmbed;
