import { useParams, Link } from "react-router-dom";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Medal,
  Trophy,
  Edit,
  Eye,
  Trash2,
  BarChart3,
  Table,
} from "lucide-react";
import {
  useLeaderboard,
  useChallenge,
  useDeleteSubmission,
} from "../hooks/useChallenges";
import { useCurrentUser } from "../hooks/useUsers";
import ShareButton from "../components/ShareButton";
import HeadlineMetricChart from "../components/HeadlineMetricChart";
import SubmissionTypeBadge from "../components/SubmissionTypeBadge";
import DownloadButton from "../components/DownloadButton";
import LeaderboardFilters from "../components/LeaderboardFilters";
import { useToast } from "../components/use-toast";
import SubmissionSyncPanel from "../components/SubmissionSyncPanel";
import { formatMetric } from "../utils/formatMetric";
import { submissionDetailPath } from "../utils/submissionPath";
import type { LeaderboardFilter } from "../types/challenge";

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Medal className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-neutral-400" />;
    case 3:
      return <Medal className="w-6 h-6 text-amber-600" />;
    default:
      return (
        <span className="w-6 h-6 flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-semibold">
          {rank}
        </span>
      );
  }
};

const Leaderboard = () => {
  const { t } = useTranslation();
  const { challengeId } = useParams<{ challengeId: string }>();
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<LeaderboardFilter>({});
  const changeFilter = useCallback((next: LeaderboardFilter) => {
    setFilter(next);
    setPage(1);
  }, []);
  const { data: currentUserData } = useCurrentUser();
  const deleteSubmissionMutation = useDeleteSubmission();
  const { success } = useToast();

  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    error: leaderboardError,
  } = useLeaderboard(challengeId || "", page, filter);

  const {
    data: challengeResponse,
    isLoading: challengeLoading,
    error: challengeError,
  } = useChallenge(challengeId || "");

  const challenge = challengeResponse?.data;
  const rows = leaderboard?.rows || [];
  const scorer = leaderboard?.scorer;
  const counts = leaderboard?.counts;
  // `total` counts the rows the filter and search show on every page.
  const hasNextPage = !!leaderboard && page * leaderboard.limit < leaderboard.total;
  const user = currentUserData?.data;
  const isAdmin = user?.role === "admin";

  const handleDeleteSubmission = async (submissionId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this submission? This action cannot be undone."
      )
    ) {
      try {
        await deleteSubmissionMutation.mutateAsync({
          submissionId,
          challengeId: challengeId || "",
        });
        // Show success toast
        success(
          "Submission deleted successfully! ✅",
          "The submission has been removed from the leaderboard.",
          4000
        );
      } catch (error) {
        console.error("Failed to delete submission:", error);
        alert("Failed to delete submission. Please try again.");
      }
    }
  };

  if (challengeLoading || leaderboardLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">
              Loading leaderboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (challengeError || leaderboardError || !challenge || !scorer) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <Link
              to="/leaderboards"
              className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leaderboards
            </Link>
          </div>
          <div className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
                Error Loading Leaderboard
              </h2>
              <p className="text-red-600 dark:text-red-400">
                {!challenge
                  ? "Challenge not found."
                  : "Failed to load leaderboard data. Please try again later."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

 
  return (
    <div className="py-0">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/leaderboards"
            className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboards
          </Link>
        </div>

        {/* Challenge Info Header */}
        <div className="bg-gradient-to-r  rounded-lg shadow-lg p-6 mb-8">
          <div className="text-neutral-700 dark:text-neutral-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-neutral-700 dark:text-neutral-100 text-3xl font-bold mb-2">
                  {challenge.title || challenge.name}
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">{challenge.description}</p>
              </div>
              {/* View Toggle, Admin Controls & Share Button */}
              <div className="flex flex-wrap items-center space-x-6 text-sm">
                <div className="flex flex-col items-start">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">Last updated</span>
                  <span className="text-lg mt-2 font-medium text-neutral-700 dark:text-neutral-100">
                    {new Date(challenge.updated_at).toLocaleDateString()}
                  </span>
                </div>
            </div>
              
            </div>
            <div className="flex items-center justify-between space-x-2">
                {/* View Toggle Buttons */}
                {rows.length > 0 && (
                  <div className="flex items-center bg-neutral-500/20 dark:bg-neutral-900 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`px-3 py-1 rounded text-sm transition-colors duration-200  ${
                        viewMode === "table"
                          ? "bg-neutral-500/30 text-neutral-700 dark:text-neutral-100 shadow-sm"
                          : "text-neutral-500/70 hover:text-neutral-700 dark:hover:text-neutral-100"
                      }`}
                      title="Table view"
                    >
                      <Table className="w-4 h-4 mr-1 inline-block" />
                    </button>
                    <button
                      onClick={() => setViewMode("chart")}
                      className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
                        viewMode === "chart"
                          ? "bg-neutral-500/30 text-neutral-700 dark:text-neutral-100 shadow-sm"
                          : "text-neutral-500/70 hover:text-neutral-700 dark:hover:text-neutral-100"
                      }`}
                      title="Chart view"
                    >
                      <BarChart3 className="w-4 h-4 mr-1 inline-block" />
                    </button>
                  </div>
                )}
                
              
                <div className="flex gap-2"> 
                  <ShareButton
                  challengeId={challengeId || ""}
                  challengeTitle={
                    challenge.title || challenge.name || "Leaderboard"
                  }
              
                />
                    {isAdmin && (
                    <Link
                      to={`/admin/edit-challenge/${challengeId}`}
                      className="inline-flex items-center px-4 py-2 bg-neutral-500/20 text-neutral-700 dark:text-neutral-100 rounded-lg hover:bg-neutral-500/30 transition-colors duration-200"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                    </Link>
                  )}
                  </div>
              </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden">
          
          {counts && counts.all > 0 && (
            <LeaderboardFilters counts={counts} filter={filter} onChange={changeFilter} />
          )}

          {counts && counts.all > 0 && rows.length === 0 && page === 1 && (
            <p className="text-center py-12 text-neutral-600 dark:text-neutral-400">
              No submissions match.
            </p>
          )}

          {counts?.all === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-100 mb-2">
                No submissions yet
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Be the first to submit your results to this challenge!
              </p>
              <Link
                to={`/submit/${challengeId}`}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
              >
                Submit Results
              </Link>
            </div>
          )}

          {rows.length > 0 && viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Submitter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      {scorer.label}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Preferred Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      {t('leaderboards.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-neutral-50 dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                  {rows.map((row) => (
                    <tr
                      key={row.submission_id}
                      className="hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankIcon(row.rank)}
                          <span className="ml-2 text-sm font-medium text-neutral-600 dark:text-neutral-100">
                            #{row.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SubmissionTypeBadge type={row.type} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-neutral-600 dark:text-neutral-100 max-w-xs truncate">
                          {row.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-600 dark:text-neutral-100">
                          @{row.submitter}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-100">
                          {formatMetric(row.headline_metric, scorer.display_format)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-600 dark:text-neutral-100">
                          {row.preferred_model ?? ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-600 dark:text-neutral-100">
                          {new Date(row.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            to={submissionDetailPath(challengeId || "", row.submission_id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-500/10 hover:bg-neutral-500/20 rounded"
                            title="View Detail"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Detail
                          </Link>
                          {row.download_url && (
                            <DownloadButton path={row.download_url} />
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteSubmission(row.submission_id)}
                              disabled={deleteSubmissionMutation.isPending}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete submission"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              {deleteSubmissionMutation.isPending
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && viewMode === "chart" && (
            <HeadlineMetricChart rows={rows} scorer={scorer} className="py-6" />
          )}

          {(page > 1 || hasNextPage) && (
            <div className="flex items-center justify-center gap-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex items-center px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!hasNextPage}
                className="flex items-center px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>

        {isAdmin && <SubmissionSyncPanel challenge={challenge} />}
      </div>
    </div>
  );
};

export default Leaderboard;
