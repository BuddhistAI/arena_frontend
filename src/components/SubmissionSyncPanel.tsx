import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useChallengeSubmissions,
  useResyncSubmission,
} from "../hooks/useChallenges";
import { useToast } from "./use-toast";
import { cn, submissionActionClass } from "../lib/utils";
import DeleteSubmissionButton from "./DeleteSubmissionButton";
import {
  SubmissionRepoLink,
  SubmissionStatusBadge,
  SyncStatusBadge,
} from "./SubmissionSummary";
import type { Challenge, UserSubmission } from "../types/challenge";

// Admin only: every Submission to the Challenge, with a Delete button, and
// where each scored one stands in the Challenge Repo, with a Resync button on
// those whose sync failed.
const SubmissionSyncPanel = ({ challenge }: { challenge: Challenge }) => {
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const { data, isLoading } = useChallengeSubmissions(challenge.id);
  const resync = useResyncSubmission();

  const submissions = data?.data ?? [];

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
      {isLoading ? null : submissions.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t("submission.syncPanelEmpty")}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {submissions.map((submission) => (
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
              <SubmissionStatusBadge status={submission.status} />
              {submission.status === "completed" && (
                <>
                  <SyncStatusBadge status={submission.sync_status} />
                  <SubmissionRepoLink
                    submission={submission}
                    repoUrl={challenge.repo_url}
                  />
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                {submission.status === "completed" &&
                  submission.sync_status === "failed" && (
                    <button
                      type="button"
                      onClick={() => handleResync(submission)}
                      disabled={resync.isPending}
                      className={cn(
                        submissionActionClass,
                        "bg-neutral-500/20 text-neutral-700 dark:text-neutral-100 hover:bg-neutral-500/30"
                      )}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {t("submission.resync")}
                    </button>
                  )}
                <DeleteSubmissionButton submission={submission} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SubmissionSyncPanel;
