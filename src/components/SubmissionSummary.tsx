import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScorers } from "../hooks/useChallenges";
import { formatMetric } from "../utils/formatMetric";
import type {
  SubmissionStatus,
  SyncStatus,
  UserSubmission,
} from "../types/challenge";

const BADGE_STYLES: Record<SubmissionStatus, string> = {
  completed:
    "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400",
  processing:
    "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400",
  pending: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400",
  failed: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400",
};

const BADGE_ICONS: Record<SubmissionStatus, typeof Clock> = {
  completed: CheckCircle,
  processing: Clock,
  pending: Clock,
  failed: XCircle,
};

export const SubmissionStatusBadge = ({ status }: { status: SubmissionStatus }) => {
  const { t } = useTranslation();
  const Icon = BADGE_ICONS[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_STYLES[status]}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {t(`submission.status.${status}`)}
    </span>
  );
};

const SYNC_BADGE_STYLES: Record<SyncStatus, string> = {
  synced: BADGE_STYLES.completed,
  pending: BADGE_STYLES.pending,
  failed: BADGE_STYLES.failed,
};

export const SyncStatusBadge = ({ status }: { status: SyncStatus }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SYNC_BADGE_STYLES[status]}`}
    >
      {t(`submission.sync.${status}`)}
    </span>
  );
};

// GitHub resolves HEAD to the repo's default branch.
const repoFolderUrl = (repoUrl: string, repoPath: string) =>
  `${repoUrl}/tree/HEAD/${repoPath}`;

// A link to the Submission's folder in the Challenge Repo, once it is synced.
export const SubmissionRepoLink = ({
  submission,
  repoUrl,
}: {
  submission: UserSubmission;
  repoUrl?: string;
}) => {
  const { t } = useTranslation();
  if (!repoUrl || submission.sync_status !== "synced" || !submission.repo_path) {
    return null;
  }
  return (
    <a
      href={repoFolderUrl(repoUrl, submission.repo_path)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
    >
      <ExternalLink className="w-4 h-4 mr-1" />
      {t("submission.repoFolder")}
    </a>
  );
};

// A Submission's result: the Headline Metric, in its Scorer's display
// format, and the Scorer's Public Summary once completed; the error once
// failed; nothing while it is being scored.
export const SubmissionScore = ({
  submission,
  scorerName,
}: {
  submission: UserSubmission;
  scorerName?: string;
}) => {
  const { t } = useTranslation();
  const { data: scorers = [] } = useScorers();
  const scorer = scorers.find((s) => s.name === scorerName);

  if (submission.status === "failed") {
    return (
      <div className="flex items-start text-sm text-red-700 dark:text-red-400">
        <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5 shrink-0" />
        <p>
          <span className="font-medium">{t("submission.scoringFailed")}:</span>{" "}
          {submission.status_message}
        </p>
      </div>
    );
  }
  if (submission.status !== "completed" || submission.headline_metric == null) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
      <p>
        <span className="text-neutral-500 dark:text-neutral-400">
          {scorer?.label ?? t("submission.headlineMetric")}:
        </span>{" "}
        <span className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          {scorer ? formatMetric(submission.headline_metric, scorer.display_format) : "—"}
        </span>
      </p>
      {(submission.public_summary ?? []).map((entry) => (
        <p key={entry.key} className="text-neutral-600 dark:text-neutral-300">
          <span className="text-neutral-500 dark:text-neutral-400">{entry.label}:</span>{" "}
          {formatMetric(entry.value, entry.format)}
        </p>
      ))}
    </div>
  );
};
