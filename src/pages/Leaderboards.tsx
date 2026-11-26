import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Trash2,
  BarChart3,
  Table,
} from "lucide-react";
import {
  useChallenges,
  useLeaderboard,
  useDeleteSubmission,
} from "../hooks/useChallenges";
import { useCurrentUser } from "../hooks/useUsers";
import ShareButton from "../components/ShareButton";
import HeadlineMetricChart from "../components/HeadlineMetricChart";
import SubmissionTypeBadge from "../components/SubmissionTypeBadge";
import LeaderboardActionsMenu from "../components/LeaderboardActionsMenu";
import { useToast } from "../components/use-toast";
import ArenaRanking from "../components/ArenaRanking";
import { formatMetric } from "../utils/formatMetric";
import type { Challenge } from "../types/challenge";

// How many of a Challenge's top rows its overview card shows.
const PREVIEW_ROWS = 5;

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

interface ChallengeLeaderboardCardProps {
  challenge: Challenge;
  isAdmin: boolean;
  onShare: () => void;
}

// One Challenge's top rows, read from the same server ranking as its
// Leaderboard page (and sharing its first-page cache).
const ChallengeLeaderboardCard = ({
  challenge,
  isAdmin,
  onShare,
}: ChallengeLeaderboardCardProps) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const deleteSubmissionMutation = useDeleteSubmission();
  const { success } = useToast();
  const { data: leaderboard, isLoading, error } = useLeaderboard(challenge.id);

  const title = challenge.title || challenge.name || "Challenge";
  const scorer = leaderboard?.scorer;
  const rows = (leaderboard?.rows || []).slice(0, PREVIEW_ROWS);

  const handleDeleteSubmission = async (submissionId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this submission? This action cannot be undone."
      )
    ) {
      try {
        await deleteSubmissionMutation.mutateAsync({
          submissionId,
          challengeId: challenge.id,
        });
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

  return (
    <div className="bg-white relative dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden pb-12">
      {/* Compact Challenge Header */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <h2
            className="text-md font-semibold text-neutral-500 dark:text-neutral-100 truncate cursor-help"
            title={challenge.description || title}
          >
            {title}
          </h2>
          <div className="flex items-center space-x-2">
            {leaderboard && (
              <span className="text-xs dark:text-neutral-400">
                {leaderboard.counts.all}
              </span>
            )}

            {rows.length > 0 && (
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-600 rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1 rounded text-xs transition-colors duration-200 ${
                    viewMode === "table"
                      ? "bg-white dark:bg-neutral-700 dark:text-neutral-100 shadow-sm"
                      : "dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100"
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

            <LeaderboardActionsMenu
              challengeId={challenge.id}
              challengeTitle={title}
              onShare={onShare}
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

      {!isLoading && (error || !scorer) && (
        <p className="text-center py-8 text-xs text-red-600 dark:text-red-400">
          Failed to load leaderboard data.
        </p>
      )}

      {scorer && rows.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1">
            No submissions yet
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
            Be the first to submit!
          </p>
          <Link
            to={`/submit/${challenge.id}`}
            className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors duration-200"
          >
            Submit Results
          </Link>
        </div>
      )}

      {scorer && rows.length > 0 && viewMode === "table" && (
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium dark:text-neutral-400 uppercase tracking-wider">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium dark:text-neutral-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium dark:text-neutral-400 uppercase tracking-wider">
                  Submitter
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium dark:text-neutral-400 uppercase tracking-wider">
                  {scorer.label}
                </th>
                {isAdmin && (
                  <th className="px-3 py-2 text-left text-xs font-medium dark:text-neutral-400 uppercase tracking-wider">
                    {t("leaderboards.actions")}
                  </th>
                )}
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
                    <div className="flex items-center gap-2">
                      <SubmissionTypeBadge type={row.type} />
                      <span
                        className="text-xs font-medium text-neutral-700 dark:text-neutral-100 truncate max-w-32"
                        title={row.name}
                      >
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs text-neutral-600 dark:text-neutral-300 truncate max-w-24">
                      @{row.submitter}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-100">
                      {formatMetric(row.headline_metric, scorer.format)}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteSubmission(row.submission_id)}
                        disabled={deleteSubmissionMutation.isPending}
                        className="inline-flex items-center px-1 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete submission"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scorer && rows.length > 0 && viewMode === "chart" && (
        <HeadlineMetricChart rows={rows} scorer={scorer} className="p-4" />
      )}

      <Link
        to={`/leaderboard/${challenge.id}`}
        className="w-full flex items-center bottom-0 absolute justify-center bg-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 dark:bg-neutral-700 p-3 text-center text-neutral-500 dark:text-neutral-200"
      >
        View all
      </Link>
    </div>
  );
};

const Leaderboards = () => {
  const { t } = useTranslation();
  // State to track which share modal to show
  const [activeShareModal, setActiveShareModal] = useState<string | null>(null);
  // State to track whether to show Arena or Challenges leaderboard
  const [leaderboardType, setLeaderboardType] = useState<"arena" | "challenges">("arena");

  const {
    data: challengesResponse,
    isLoading,
    error,
  } = useChallenges();
  const challenges = challengesResponse?.data || [];
  const { data: currentUserData } = useCurrentUser();
  const isAdmin = currentUserData?.data?.role === "admin";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">
              Loading leaderboards...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
                Error Loading Leaderboards
              </h2>
              <p className="text-red-600 dark:text-red-400">
                Failed to load leaderboard data. Please try again later.
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-700 dark:text-neutral-100 mb-2">
                {t('leaderboards.title')}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                {t('leaderboards.subtitle')}
              </p>
            </div>
            
            {/* Leaderboard Type Selection */}
            <div className="flex items-center">
              <select
                value={leaderboardType}
                onChange={(e) => setLeaderboardType(e.target.value as "arena" | "challenges")}
                className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium text-neutral-900 dark:text-neutral-100  focus:border-transparent transition-colors duration-200"
              >
                <option value="arena">Arena</option>
                <option value="challenges">Challenges</option>
              </select>
            </div>
          </div>
        </div>
        {/* Arena or Challenges Leaderboards */}
        {leaderboardType === "arena" ? (
          <div className="w-full">
            <span className="font-semibold flex gap-2">
              <Trophy  />
              Model Arena Scores
            </span>
            <ArenaRanking />
          </div>
        ) : (
          /* Challenges Leaderboards - 2 column layout */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* User Vote Leaderboard - Second Item */}
          
        
          
          {challenges.map((challenge) => (
            <ChallengeLeaderboardCard
              key={challenge.id}
              challenge={challenge}
              isAdmin={isAdmin}
              onShare={() => setActiveShareModal(challenge.id)}
            />
          ))}
        </div>
        )}

        {leaderboardType === "challenges" && challenges.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-100 mb-2">
              No leaderboards available
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Check back later when challenges have submissions.
            </p>
          </div>
        )}
      </div>

      {/* Share Modals */}
      {activeShareModal && (
        <button 
          className="fixed inset-0 z-50 flex items-center justify-center  bg-opacity-50"
          onClick={() => setActiveShareModal(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setActiveShareModal(null);
            }
          }}
          aria-label="Close share modal"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto"
          >
            <ShareButton
              challengeId={activeShareModal}
              challengeTitle={
                challenges.find((c) => c.id === activeShareModal)?.title || "Challenge"
              }
              autoOpen={true}
              onClose={() => setActiveShareModal(null)}
            />
          </div>
        </button>
      )}
    </div>
  );
};

export default Leaderboards;
