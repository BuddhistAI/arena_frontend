import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useChallengeSubmissions,
  useResyncSubmission,
} from "../hooks/useChallenges";
import { useToast } from "./use-toast";
import { SubmissionRepoLink, SyncStatusBadge } from "./SubmissionSummary";
import type { Challenge, UserSubmission } from "../types/challenge";

// Admin only: where each scored Submission stands in the Challenge Repo,
// with a Resync button on those whose sync failed.
const SubmissionSyncPanel = ({ challenge }: { challenge: Challenge }) => {
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const { data, isLoading } = useChallengeSubmissions(challenge.id);
  const resync = useResyncSubmission();

  const scored = (data?.data ?? []).filter((s) => s.status === "completed");

  const handleResync = (submission: UserSubmission) =>
    resync.mutate(submission, {
      onError: (error) =>
        showError(t("submission.resyncFailed"), error.message),
    });

  return (
    <section className="mt-8 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 p-4">
      <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-3">
        {t("submission.syncPanelTitle")}
      </h2>
      {isLoading ? null : scored.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t("submission.syncPanelEmpty")}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {scored.map((submission) => (
            <li
              key={submission.id}
              className="flex flex-wrap items-center gap-3 py-2 text-sm"
            >
              <span className="font-medium text-neutral-700 dark:text-neutral-100">
                {submission.name}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {submission.id.slice(0, 8)}
              </span>
              <SyncStatusBadge status={submission.sync_status} />
              <SubmissionRepoLink
                submission={submission}
                repoUrl={challenge.repo_url}
              />
              {submission.sync_status === "failed" && (
                <button
                  type="button"
                  onClick={() => handleResync(submission)}
                  disabled={resync.isPending}
                  className="ml-auto inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-neutral-500/20 text-neutral-700 dark:text-neutral-100 hover:bg-neutral-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {t("submission.resync")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SubmissionSyncPanel;
